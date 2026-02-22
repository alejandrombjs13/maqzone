package httpapi

import (
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

type WSClient struct {
	conn   *websocket.Conn
	send   chan []byte
	hub    *Hub
	roomID int64
	logger zerolog.Logger
}

func NewWSClient(conn *websocket.Conn, hub *Hub, roomID int64, logger zerolog.Logger) *WSClient {
	return &WSClient{
		conn:   conn,
		send:   make(chan []byte, 256),
		hub:    hub,
		roomID: roomID,
		logger: logger,
	}
}

func (c *WSClient) ReadPump() {
	defer func() {
		c.hub.Unsubscribe(c.roomID, c)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				c.logger.Debug().Err(err).Msg("ws: unexpected close")
			}
			break
		}
	}
}

func (c *WSClient) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
