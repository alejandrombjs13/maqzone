package httpapi

import (
	"database/sql"
	"errors"
	"net/http"

	sqlc "maqzone/backend/internal/db/sqlc"
)

func (s *Server) handleLikeListing(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	listingID, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	_, err = s.queries.LikeListing(r.Context(), sqlc.LikeListingParams{
		UserID:    claims.UserID,
		ListingID: listingID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		respondError(w, http.StatusNotFound, "listing not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to like")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"liked": true})
}

func (s *Server) handleUnlikeListing(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	listingID, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := s.queries.UnlikeListing(r.Context(), sqlc.UnlikeListingParams{
		UserID:    claims.UserID,
		ListingID: listingID,
	}); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to unlike")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"liked": false})
}

func (s *Server) handleIsLiked(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		respondJSON(w, http.StatusOK, map[string]any{"liked": false})
		return
	}
	listingID, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	count, err := s.queries.IsLiked(r.Context(), sqlc.IsLikedParams{
		UserID:    claims.UserID,
		ListingID: listingID,
	})
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]any{"liked": false})
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"liked": count > 0})
}

func (s *Server) handleGetUserLikes(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	likes, err := s.queries.GetUserLikes(r.Context(), claims.UserID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get likes")
		return
	}
	if likes == nil {
		likes = []sqlc.UserLikeWithListing{}
	}
	respondJSON(w, http.StatusOK, likes)
}

func (s *Server) handleMarkLikesSeen(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	if err := s.queries.MarkLikesSeen(r.Context(), claims.UserID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to mark seen")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"ok": true})
}
