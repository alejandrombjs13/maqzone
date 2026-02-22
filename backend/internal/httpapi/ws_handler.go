package httpapi

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS handled at nginx/middleware level
	},
}

func (s *Server) handleWSAuction(w http.ResponseWriter, r *http.Request) {
	if s.hub == nil {
		respondError(w, http.StatusServiceUnavailable, "websocket hub not initialized")
		return
	}

	auctionID, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid auction id")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Error().Err(err).Msg("ws: upgrade failed")
		return
	}

	client := NewWSClient(conn, s.hub, auctionID, s.logger)
	s.hub.Subscribe(auctionID, client)

	go client.WritePump()
	go client.ReadPump()
}
