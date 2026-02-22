package httpapi

import (
	"encoding/json"
	"sync"

	"github.com/rs/zerolog"
)

type WSMessage struct {
	Type      string `json:"type"`
	AuctionID int64  `json:"auction_id"`
	Amount    int64  `json:"amount,omitempty"`
	Timestamp string `json:"timestamp,omitempty"`
	BidCount  int    `json:"bid_count,omitempty"`
	Status    string `json:"status,omitempty"`
	EndTime   string `json:"end_time,omitempty"`
	UserID    int64  `json:"user_id,omitempty"`
}

type Hub struct {
	mu     sync.RWMutex
	rooms  map[int64]map[*WSClient]bool
	logger zerolog.Logger
}

func NewHub(logger zerolog.Logger) *Hub {
	return &Hub{
		rooms:  make(map[int64]map[*WSClient]bool),
		logger: logger,
	}
}

func (h *Hub) Subscribe(auctionID int64, client *WSClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[auctionID] == nil {
		h.rooms[auctionID] = make(map[*WSClient]bool)
	}
	h.rooms[auctionID][client] = true
}

func (h *Hub) Unsubscribe(auctionID int64, client *WSClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[auctionID]; ok {
		delete(room, client)
		if len(room) == 0 {
			delete(h.rooms, auctionID)
		}
	}
}

// BroadcastStatus satisfies the scheduler.Broadcaster interface.
func (h *Hub) BroadcastStatus(auctionID int64, status string) {
	h.Broadcast(auctionID, WSMessage{
		Type:      "status",
		AuctionID: auctionID,
		Status:    status,
	})
}

func (h *Hub) Broadcast(auctionID int64, msg WSMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		h.logger.Error().Err(err).Msg("ws: failed to marshal message")
		return
	}

	h.mu.RLock()
	room := h.rooms[auctionID]
	h.mu.RUnlock()

	for client := range room {
		select {
		case client.send <- data:
		default:
			// Client buffer full, skip
		}
	}
}
