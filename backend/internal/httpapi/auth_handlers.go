package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"maqzone/backend/internal/auth"
	sqlc "maqzone/backend/internal/db/sqlc"
)

type registerRequest struct {
	Email               string `json:"email"`
	Password            string `json:"password"`
	BusinessName        string `json:"business_name"`
	LegalRepresentative string `json:"legal_representative"`
	RFC                 string `json:"rfc"`
	StreetAddress       string `json:"street_address"`
	Colony              string `json:"colony"`
	Municipality        string `json:"municipality"`
	PostalCode          string `json:"postal_code"`
	City                string `json:"city"`
	State               string `json:"state"`
	Phone               string `json:"phone"`
	Mobile              string `json:"mobile"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if len(req.Password) < 8 {
		respondError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to process password")
		return
	}

	user, err := s.queries.CreateUser(r.Context(), sqlc.CreateUserParams{
		Email:               req.Email,
		PasswordHash:        hash,
		BusinessName:        req.BusinessName,
		LegalRepresentative: req.LegalRepresentative,
		RFC:                 req.RFC,
		StreetAddress:       req.StreetAddress,
		Colony:              req.Colony,
		Municipality:        req.Municipality,
		PostalCode:          req.PostalCode,
		City:                req.City,
		State:               req.State,
		Phone:               req.Phone,
		Mobile:              req.Mobile,
	})
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			respondError(w, http.StatusConflict, "email already registered")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to create account")
		return
	}

	token, err := auth.GenerateToken(s.cfg.JWTSecret, user.ID, user.Email)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"token": token,
		"user":  userResponse(user),
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := s.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		respondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := auth.GenerateToken(s.cfg.JWTSecret, user.ID, user.Email)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  userResponse(user),
	})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	user, err := s.queries.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	respondJSON(w, http.StatusOK, userResponse(user))
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (s *Server) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	claims := GetClaims(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		respondError(w, http.StatusBadRequest, "current and new password are required")
		return
	}
	if len(req.NewPassword) < 8 {
		respondError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	user, err := s.queries.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if !auth.CheckPassword(user.PasswordHash, req.CurrentPassword) {
		respondError(w, http.StatusUnauthorized, "invalid current password")
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to process password")
		return
	}

	updated, err := s.queries.UpdateUserPassword(r.Context(), sqlc.UpdateUserPasswordParams{
		PasswordHash:       hash,
		MustChangePassword: 0,
		ID:                 claims.UserID,
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	respondJSON(w, http.StatusOK, userResponse(updated))
}

func (s *Server) handleDocuments(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]any{
		"documents": []map[string]string{
			{"name": "Hoja de Registro MAQZONE", "url": "/docs/hoja-de-registro-maqzone.html"},
			{"name": "Terminos y Condiciones de Venta", "url": "/docs/terminos-de-venta-maqzone.html"},
		},
	})
}

func userResponse(u sqlc.User) map[string]any {
	return map[string]any{
		"id":                   u.ID,
		"email":                u.Email,
		"business_name":        u.BusinessName,
		"legal_representative": u.LegalRepresentative,
		"rfc":                  u.RFC,
		"street_address":       u.StreetAddress,
		"colony":               u.Colony,
		"municipality":         u.Municipality,
		"postal_code":          u.PostalCode,
		"city":                 u.City,
		"state":                u.State,
		"phone":                u.Phone,
		"mobile":               u.Mobile,
		"status":               u.Status,
		"guarantee_tier":       u.GuaranteeTier,
		"remaining_opportunities": u.RemainingOpportunities,
		"rejection_reason":     u.RejectionReason,
		"must_change_password": u.MustChangePassword == 1,
		"is_admin":             u.IsAdmin == 1,
		"created_at":           u.CreatedAt,
	}
}
