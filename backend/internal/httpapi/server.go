package httpapi

import (
  "context"
  "encoding/json"
  "errors"
  "database/sql"
  "net/http"
  "strconv"
  "time"

  "github.com/go-chi/chi/v5"
  "github.com/go-chi/chi/v5/middleware"
  "github.com/go-chi/cors"
  "github.com/rs/zerolog"

  "maqzone/backend/internal/config"
  sqlc "maqzone/backend/internal/db/sqlc"
)

type Server struct {
  cfg     config.Config
  queries *sqlc.Queries
  logger  zerolog.Logger
  limiter *rateLimiter
  hub     *Hub
}

func New(cfg config.Config, queries *sqlc.Queries, logger zerolog.Logger) *Server {
  return &Server{cfg: cfg, queries: queries, logger: logger, limiter: newRateLimiter()}
}

func (s *Server) SetHub(h *Hub) {
  s.hub = h
}

func (s *Server) Routes() http.Handler {
  r := chi.NewRouter()

  r.Use(middleware.RequestID)
  r.Use(middleware.RealIP)
  r.Use(s.loggingMiddleware)
  r.Use(middleware.Recoverer)
  r.Use(middleware.Timeout(30 * time.Second))

  corsOptions := cors.Options{
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "X-Admin-Token"},
    ExposedHeaders:   []string{"Link"},
    AllowCredentials: false,
    MaxAge:           300,
  }
  if s.cfg.CorsAllowAll || len(s.cfg.CorsAllowedOrigins) == 0 {
    corsOptions.AllowedOrigins = []string{"*"}
  } else {
    corsOptions.AllowedOrigins = s.cfg.CorsAllowedOrigins
  }
  r.Use(cors.Handler(corsOptions))

  r.Get("/api/health", s.handleHealth)

  r.Route("/api/auctions", func(r chi.Router) {
    r.Get("/", s.handleListAuctions)
    r.Get("/{id}", s.handleGetAuction)
  })

  r.Route("/api/listings", func(r chi.Router) {
    r.Get("/", s.handleListListings)
    r.Get("/{id}", s.handleGetListing)
  })

  // Auth routes (public, rate-limited)
  r.Route("/api/auth", func(r chi.Router) {
    r.Use(s.rateLimit)
    r.Post("/register", s.handleRegister)
    r.Post("/login", s.handleLogin)
    r.Group(func(r chi.Router) {
      r.Use(s.userAuth)
      r.Get("/me", s.handleMe)
      r.Put("/password", s.handleChangePassword)
      r.Get("/documents", s.handleDocuments)
    })
  })

  // Bid endpoints
  r.Route("/api/auctions/{id}/bids", func(r chi.Router) {
    r.Get("/", s.handleListBids)
    r.Group(func(r chi.Router) {
      r.Use(s.userAuth)
      r.Use(s.requireApproved)
      r.Post("/", s.handlePlaceBid)
    })
  })

  // WebSocket
  r.Get("/api/ws/auctions/{id}", s.handleWSAuction)

  // Enrollment request (authenticated user)
  r.Route("/api/auctions/{id}/enroll", func(r chi.Router) {
    r.Use(s.userAuth)
    r.Use(s.requireApproved)
    r.Post("/", s.handleRequestEnrollment)
    r.Get("/", s.handleGetMyEnrollment)
  })

  // Likes / favorites
  r.Route("/api/likes", func(r chi.Router) {
    // Optional auth: returns {liked: false} for unauthenticated users
    r.With(s.optionalUserAuth).Get("/check/{id}", s.handleIsLiked)
    // Authenticated operations
    r.Group(func(r chi.Router) {
      r.Use(s.userAuth)
      r.Get("/", s.handleGetUserLikes)
      r.Put("/mark-seen", s.handleMarkLikesSeen)
      r.Post("/{id}", s.handleLikeListing)
      r.Delete("/{id}", s.handleUnlikeListing)
    })
  })

  r.Route("/api/admin", func(r chi.Router) {
    r.Use(s.adminAuth)
    r.Route("/auctions", func(r chi.Router) {
      r.Get("/", s.handleAdminListAuctions)
      r.Post("/", s.handleCreateAuction)
      r.Put("/{id}", s.handleUpdateAuction)
      r.Delete("/{id}", s.handleDeleteAuction)
      r.Get("/{id}/enrollments", s.handleListEnrollments)
      r.Put("/{id}/enrollments/{userId}/approve", s.handleApproveEnrollment)
      r.Put("/{id}/enrollments/{userId}/reject", s.handleRejectEnrollment)
    })
    r.Route("/listings", func(r chi.Router) {
      r.Get("/", s.handleAdminListListings)
      r.Post("/", s.handleCreateListing)
      r.Put("/{id}", s.handleUpdateListing)
      r.Delete("/{id}", s.handleDeleteListing)
    })
    r.Route("/users", func(r chi.Router) {
      r.Get("/", s.handleListUsers)
      r.Get("/{id}", s.handleGetUser)
      r.Put("/{id}/approve", s.handleApproveUser)
      r.Put("/{id}/reject", s.handleRejectUser)
      r.Put("/{id}/password", s.handleSetUserPassword)
      r.Put("/{id}/admin", s.handleSetUserAdmin)
      r.Put("/{id}/opportunities", s.handleSetUserOpportunities)
    })
  })

  return r
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
  respondJSON(w, http.StatusOK, map[string]any{
    "status": "ok",
    "time":   time.Now().UTC().Format(time.RFC3339),
  })
}

func (s *Server) handleListAuctions(w http.ResponseWriter, r *http.Request) {
  limit := parseLimit(r, 20)
  items, err := s.queries.ListActiveAuctions(r.Context(), int64(limit))
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to list auctions")
    return
  }
  respondJSON(w, http.StatusOK, items)
}

func (s *Server) handleGetAuction(w http.ResponseWriter, r *http.Request) {
  id, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid id")
    return
  }
  item, err := s.queries.GetAuction(r.Context(), id)
  if err != nil {
    if errors.Is(err, sql.ErrNoRows) {
      respondError(w, http.StatusNotFound, "auction not found")
      return
    }
    if errors.Is(err, context.DeadlineExceeded) {
      respondError(w, http.StatusRequestTimeout, "request timeout")
      return
    }
    respondError(w, http.StatusInternalServerError, "failed to load auction")
    return
  }
  respondJSON(w, http.StatusOK, item)
}

type createAuctionRequest struct {
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
  PriceVisible            *int64 `json:"price_visible"`
}

func (s *Server) handleCreateAuction(w http.ResponseWriter, r *http.Request) {
  var req createAuctionRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    respondError(w, http.StatusBadRequest, "invalid json")
    return
  }
  if req.Title == "" || req.Description == "" || req.Location == "" || req.EndTime == "" {
    respondError(w, http.StatusBadRequest, "missing required fields")
    return
  }
  if req.Status == "" {
    req.Status = "active"
  }
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
  priceVisible := int64(0)
  if req.PriceVisible != nil {
    priceVisible = *req.PriceVisible
  }
  item, err := s.queries.CreateAuction(r.Context(), sqlc.CreateAuctionParams{
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
    PriceVisible:            priceVisible,
  })
  if err != nil {
    s.logger.Error().Err(err).Msg("failed to create auction")
    respondError(w, http.StatusInternalServerError, "failed to create auction")
    return
  }
  respondJSON(w, http.StatusCreated, item)
}

func (s *Server) handleListListings(w http.ResponseWriter, r *http.Request) {
  limit := parseLimit(r, 20)
  items, err := s.queries.ListListings(r.Context(), int64(limit))
  if err != nil {
    respondError(w, http.StatusInternalServerError, "failed to list listings")
    return
  }
  respondJSON(w, http.StatusOK, items)
}

func (s *Server) handleGetListing(w http.ResponseWriter, r *http.Request) {
  id, err := parseID(r, "id")
  if err != nil {
    respondError(w, http.StatusBadRequest, "invalid id")
    return
  }
  item, err := s.queries.GetListing(r.Context(), id)
  if err != nil {
    if errors.Is(err, sql.ErrNoRows) {
      respondError(w, http.StatusNotFound, "listing not found")
      return
    }
    respondError(w, http.StatusInternalServerError, "failed to load listing")
    return
  }
  respondJSON(w, http.StatusOK, item)
}

type createListingRequest struct {
  Title       string `json:"title"`
  Description string `json:"description"`
  Location    string `json:"location"`
  Price       int64  `json:"price"`
  SaleType    string `json:"sale_type"`
  Year        int64  `json:"year"`
  Status      string `json:"status"`
  ImageURL    string `json:"image_url"`
}

func (s *Server) handleCreateListing(w http.ResponseWriter, r *http.Request) {
  var req createListingRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    respondError(w, http.StatusBadRequest, "invalid json")
    return
  }
  if req.Title == "" || req.Description == "" || req.Location == "" || req.SaleType == "" || req.Year == 0 {
    respondError(w, http.StatusBadRequest, "missing required fields")
    return
  }
  if req.Status == "" {
    req.Status = "active"
  }
  item, err := s.queries.CreateListing(r.Context(), sqlc.CreateListingParams{
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
    respondError(w, http.StatusInternalServerError, "failed to create listing")
    return
  }
  respondJSON(w, http.StatusCreated, item)
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
    start := time.Now()
    next.ServeHTTP(ww, r)
    s.logger.Info().
      Str("method", r.Method).
      Str("path", r.URL.Path).
      Str("remote", r.RemoteAddr).
      Int("status", ww.Status()).
      Dur("duration", time.Since(start)).
      Msg("request")
  })
}

func parseLimit(r *http.Request, fallback int) int {
  v := r.URL.Query().Get("limit")
  if v == "" {
    return fallback
  }
  if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
    return n
  }
  return fallback
}

func parseID(r *http.Request, key string) (int64, error) {
  raw := chi.URLParam(r, key)
  return strconv.ParseInt(raw, 10, 64)
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(status)
  _ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
  respondJSON(w, status, map[string]any{
    "error": message,
  })
}
