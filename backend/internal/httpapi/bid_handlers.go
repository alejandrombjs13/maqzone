package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	sqlc "maqzone/backend/internal/db/sqlc"
)

type placeBidRequest struct {
	Amount int64 `json:"amount"`
}

func (s *Server) handlePlaceBid(w http.ResponseWriter, r *http.Request) {
	auctionID, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid auction id")
		return
	}

	claims := GetClaims(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req placeBidRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Amount <= 0 {
		respondError(w, http.StatusBadRequest, "amount must be positive")
		return
	}

	auction, err := s.queries.GetAuction(r.Context(), auctionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "auction not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to load auction")
		return
	}

	if auction.Status != "active" {
		respondError(w, http.StatusBadRequest, "auction is not active")
		return
	}

	// Check enrollment
	_, enrollErr := s.queries.GetEnrollment(r.Context(), auctionID, claims.UserID)
	if enrollErr != nil {
		respondError(w, http.StatusForbidden, "not enrolled in this auction")
		return
	}

	// Use configurable min_bid_increment (default 1000)
	increment := auction.MinBidIncrement
	if increment <= 0 {
		increment = 1000
	}
	minBid := auction.CurrentBid + increment
	if req.Amount < minBid {
		respondError(w, http.StatusBadRequest, "bid must be at least "+formatMoney(minBid))
		return
	}

	// Check user has remaining opportunities
	user, err := s.queries.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if user.RemainingOpportunities <= 0 {
		respondError(w, http.StatusForbidden, "no remaining bid opportunities")
		return
	}

	// Track previous highest bidder for outbid notification
	previousBidderID := auction.HighestBidderID

	bid, err := s.queries.PlaceBid(r.Context(), sqlc.PlaceBidParams{
		AuctionID: auctionID,
		UserID:    claims.UserID,
		Amount:    req.Amount,
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to place bid")
		return
	}

	// Update auction current_bid
	if err := s.queries.UpdateAuctionBid(r.Context(), req.Amount, claims.UserID, auctionID); err != nil {
		s.logger.Error().Err(err).Msg("failed to update auction bid")
	}

	// Decrement remaining bid opportunities
	if err := s.queries.DecrementOpportunities(r.Context(), claims.UserID); err != nil {
		s.logger.Error().Err(err).Msg("failed to decrement opportunities")
	}

	// Auto-extend: if bid placed within window of end_time, extend by configured minutes
	newEndTime := auction.EndTime
	if auction.AutoExtendMinutes > 0 && auction.AutoExtendWindowMinutes > 0 && auction.EndTime != "" {
		endTime, parseErr := time.Parse(time.RFC3339, auction.EndTime)
		if parseErr == nil {
			windowDuration := time.Duration(auction.AutoExtendWindowMinutes) * time.Minute
			if time.Until(endTime) <= windowDuration {
				extended := time.Now().UTC().Add(time.Duration(auction.AutoExtendMinutes) * time.Minute)
				newEndTime = extended.Format(time.RFC3339)
				if err := s.queries.ExtendAuctionEndTime(r.Context(), newEndTime, auctionID); err != nil {
					s.logger.Error().Err(err).Msg("failed to extend auction end time")
				}
			}
		}
	}

	// Get bid count for broadcast
	bids, _ := s.queries.ListBidsForAuction(r.Context(), auctionID, 100)
	bidCount := len(bids)

	// Broadcast via WebSocket
	if s.hub != nil {
		s.hub.Broadcast(auctionID, WSMessage{
			Type:      "bid",
			AuctionID: auctionID,
			Amount:    req.Amount,
			Timestamp: bid.CreatedAt,
			BidCount:  bidCount,
			EndTime:   newEndTime,
		})

		// Notify previous highest bidder they've been outbid
		if previousBidderID > 0 && previousBidderID != claims.UserID {
			s.hub.Broadcast(auctionID, WSMessage{
				Type:      "outbid",
				AuctionID: auctionID,
				Amount:    req.Amount,
				UserID:    previousBidderID,
			})
		}
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"bid": map[string]any{
			"id":         bid.ID,
			"auction_id": bid.AuctionID,
			"amount":     bid.Amount,
			"created_at": bid.CreatedAt,
		},
		"end_time": newEndTime,
	})
}

func (s *Server) handleListBids(w http.ResponseWriter, r *http.Request) {
	auctionID, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid auction id")
		return
	}

	limit := parseLimit(r, 50)
	bids, err := s.queries.ListBidsForAuction(r.Context(), auctionID, int64(limit))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list bids")
		return
	}

	// Return anonymous bids (no user_id)
	result := make([]map[string]any, 0, len(bids))
	for _, b := range bids {
		result = append(result, map[string]any{
			"amount":     b.Amount,
			"created_at": b.CreatedAt,
		})
	}

	respondJSON(w, http.StatusOK, result)
}

func formatMoney(amount int64) string {
	return "$" + commaFormat(amount)
}

func commaFormat(n int64) string {
	if n < 0 {
		return "-" + commaFormat(-n)
	}
	s := ""
	for n >= 1000 {
		s = "," + padLeft(n%1000) + s
		n /= 1000
	}
	return itoa(n) + s
}

func padLeft(n int64) string {
	if n < 10 {
		return "00" + itoa(n)
	}
	if n < 100 {
		return "0" + itoa(n)
	}
	return itoa(n)
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
