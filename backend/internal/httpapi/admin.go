package httpapi

import (
  "crypto/subtle"
  "encoding/json"
  "net/http"
  "strings"

  "maqzone/backend/internal/auth"
  sqlc "maqzone/backend/internal/db/sqlc"
)

func (s *Server) adminAuth(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    token := r.Header.Get("X-Admin-Token")
    if token != "" && s.cfg.AdminToken != "" && subtleCompare(token, s.cfg.AdminToken) {
      next.ServeHTTP(w, r)
      return
    }

    header := r.Header.Get("Authorization")
    if strings.HasPrefix(header, "Bearer ") {
      tokenStr := strings.TrimPrefix(header, "Bearer ")
      claims, err := auth.ValidateToken(s.cfg.JWTSecret, tokenStr)
      if err != nil {
        respondError(w, http.StatusUnauthorized, "invalid or expired token")
        return
      }
      user, err := s.queries.GetUserByID(r.Context(), claims.UserID)
      if err != nil {
        respondError(w, http.StatusUnauthorized, "invalid admin user")
        return
      }
      if user.IsAdmin == 1 {
        next.ServeHTTP(w, r)
        return
      }
      respondError(w, http.StatusForbidden, "admin access required")
      return
    }

    if s.cfg.AdminToken == "" {
      respondError(w, http.StatusForbidden, "admin token not configured")
      return
    }
    respondError(w, http.StatusUnauthorized, "invalid admin token")
  })
}

func subtleCompare(a, b string) bool {
  if len(a) != len(b) {
    return false
  }
  return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

type updateAuctionRequest struct {
  Title                   string `json:"title"`
  Description             string `json:"description"`
  Location                string `json:"location"`
  CurrentBid              int64  `json:"current_bid"`
  ReservePrice            int64  `json:"reserve_price"`
  Status                  string `json:"status"`
  EndTime                 string `json:"end_time"`
  ImageURL                string `json:"image_url"`
  StartTime               string `json:"start_time"`
  SaleMode                string `json:"sale_mode"`
  FixedPrice              int64  `json:"fixed_price"`
  MinBidIncrement         int64  `json:"min_bid_increment"`
  BuyerPremiumPct         int64  `json:"buyer_premium_pct"`
  AutoExtendMinutes       int64  `json:"auto_extend_minutes"`
  AutoExtendWindowMinutes int64  `json:"auto_extend_window_minutes"`
  PriceVisible            int64  `json:"price_visible"`
}

func (s *Server) handleUpdateAuction(w http.ResponseWriter, r *http.Request) {
  id, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid id")
    return
  }
  var req updateAuctionRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    respondError(w, http.StatusBadRequest, "invalid json")
    return
  }
  // Default sale_mode to pass CHECK constraint
  if req.SaleMode == "" {
    req.SaleMode = "auction"
  }
  if req.MinBidIncrement == 0 {
    req.MinBidIncrement = 1000
  }
  if req.BuyerPremiumPct == 0 {
    req.BuyerPremiumPct = 14
  }
  if req.AutoExtendMinutes == 0 {
    req.AutoExtendMinutes = 2
  }
  if req.AutoExtendWindowMinutes == 0 {
    req.AutoExtendWindowMinutes = 2
  }
  item, err := s.queries.UpdateAuction(r.Context(), sqlc.UpdateAuctionParams{
    ID:                      id,
    Title:                   req.Title,
    Description:             req.Description,
    Location:                req.Location,
    CurrentBid:              req.CurrentBid,
    ReservePrice:            req.ReservePrice,
    Status:                  req.Status,
    EndTime:                 req.EndTime,
    ImageURL:                req.ImageURL,
    StartTime:               req.StartTime,
    SaleMode:                req.SaleMode,
    FixedPrice:              req.FixedPrice,
    MinBidIncrement:         req.MinBidIncrement,
    BuyerPremiumPct:         req.BuyerPremiumPct,
    AutoExtendMinutes:       req.AutoExtendMinutes,
    AutoExtendWindowMinutes: req.AutoExtendWindowMinutes,
    PriceVisible:            req.PriceVisible,
  })
  if err != nil {
    s.logger.Error().Err(err).Msg("failed to update auction")
    respondError(w, http.StatusInternalServerError, "failed to update auction")
    return
  }
  respondJSON(w, http.StatusOK, item)
}

func (s *Server) handleDeleteAuction(w http.ResponseWriter, r *http.Request) {
  id, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid id")
    return
  }
  if err := s.queries.DeleteAuction(r.Context(), id); err != nil {
    respondError(w, http.StatusInternalServerError, "failed to delete auction")
    return
  }
  respondJSON(w, http.StatusOK, map[string]any{"deleted": id})
}

type updateListingRequest struct {
  Title       string `json:"title"`
  Description string `json:"description"`
  Location    string `json:"location"`
  Price       int64  `json:"price"`
  SaleType    string `json:"sale_type"`
  Year        int64  `json:"year"`
  Status      string `json:"status"`
  ImageURL    string `json:"image_url"`
}

func (s *Server) handleUpdateListing(w http.ResponseWriter, r *http.Request) {
  id, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid id")
    return
  }
  var req updateListingRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    respondError(w, http.StatusBadRequest, "invalid json")
    return
  }
  item, err := s.queries.UpdateListing(r.Context(), sqlc.UpdateListingParams{
    ID:          id,
    Title:       req.Title,
    Description: req.Description,
    Location:    req.Location,
    Price:       req.Price,
    SaleType:    req.SaleType,
    Year:        req.Year,
    Status:      req.Status,
    ImageURL:    req.ImageURL,
  })
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to update listing")
    return
  }
  respondJSON(w, http.StatusOK, item)
}

func (s *Server) handleDeleteListing(w http.ResponseWriter, r *http.Request) {
  id, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid id")
    return
  }
  if err := s.queries.DeleteListing(r.Context(), id); err != nil {
    respondError(w, http.StatusInternalServerError, "failed to delete listing")
    return
  }
  respondJSON(w, http.StatusOK, map[string]any{"deleted": id})
}

// Admin list-all endpoints (shows all statuses, not just active)

func (s *Server) handleAdminListAuctions(w http.ResponseWriter, r *http.Request) {
  limit := parseLimit(r, 100)
  items, err := s.queries.ListAllAuctions(r.Context(), int64(limit))
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to list auctions")
    return
  }
  respondJSON(w, http.StatusOK, items)
}

func (s *Server) handleAdminListListings(w http.ResponseWriter, r *http.Request) {
  limit := parseLimit(r, 100)
  items, err := s.queries.ListListings(r.Context(), int64(limit))
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to list listings")
    return
  }
  respondJSON(w, http.StatusOK, items)
}

// Enrollment management

func (s *Server) handleRequestEnrollment(w http.ResponseWriter, r *http.Request) {
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
  enrollment, err := s.queries.RequestEnrollment(r.Context(), auctionID, claims.UserID)
  if err != nil {
    if strings.Contains(err.Error(), "UNIQUE") {
      respondError(w, http.StatusConflict, "already enrolled")
      return
    }
    respondError(w, http.StatusInternalServerError, "failed to request enrollment")
    return
  }
  respondJSON(w, http.StatusCreated, enrollment)
}

func (s *Server) handleGetMyEnrollment(w http.ResponseWriter, r *http.Request) {
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
  enrollment, err := s.queries.GetEnrollment(r.Context(), auctionID, claims.UserID)
  if err != nil {
    respondError(w, http.StatusNotFound, "not enrolled")
    return
  }
  respondJSON(w, http.StatusOK, enrollment)
}

func (s *Server) handleListEnrollments(w http.ResponseWriter, r *http.Request) {
  auctionID, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid auction id")
    return
  }
  items, err := s.queries.ListEnrollmentsForAuction(r.Context(), auctionID)
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to list enrollments")
    return
  }
  respondJSON(w, http.StatusOK, items)
}

func (s *Server) handleApproveEnrollment(w http.ResponseWriter, r *http.Request) {
  auctionID, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid auction id")
    return
  }
  userID, err := parseID(r, "userId")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid user id")
    return
  }
  enrollment, err := s.queries.ApproveEnrollment(r.Context(), auctionID, userID)
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to approve enrollment")
    return
  }
  respondJSON(w, http.StatusOK, enrollment)
}

func (s *Server) handleRejectEnrollment(w http.ResponseWriter, r *http.Request) {
  auctionID, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid auction id")
    return
  }
  userID, err := parseID(r, "userId")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid user id")
    return
  }
  enrollment, err := s.queries.RejectEnrollment(r.Context(), auctionID, userID)
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to reject enrollment")
    return
  }
  respondJSON(w, http.StatusOK, enrollment)
}

// User opportunity management

func (s *Server) handleSetUserOpportunities(w http.ResponseWriter, r *http.Request) {
  id, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid user id")
    return
  }
  var req struct {
    Opportunities int64 `json:"opportunities"`
  }
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    respondError(w, http.StatusBadRequest, "invalid json")
    return
  }
  user, err := s.queries.SetUserOpportunities(r.Context(), sqlc.SetUserOpportunitiesParams{
    ID:                     id,
    RemainingOpportunities: req.Opportunities,
  })
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to set opportunities")
    return
  }
  respondJSON(w, http.StatusOK, user)
}
