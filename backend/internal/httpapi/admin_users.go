package httpapi

import (
	"encoding/json"
	"net/http"

	"maqzone/backend/internal/auth"
	sqlc "maqzone/backend/internal/db/sqlc"
)

func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	limit := parseLimit(r, 50)

	var users []interface{}
	var err error

	if status != "" {
		rawUsers, e := s.queries.ListUsersByStatus(r.Context(), status, int64(limit))
		err = e
		for _, u := range rawUsers {
			users = append(users, userResponse(u))
		}
	} else {
		rawUsers, e := s.queries.ListUsers(r.Context(), int64(limit))
		err = e
		for _, u := range rawUsers {
			users = append(users, userResponse(u))
		}
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	if users == nil {
		users = []interface{}{}
	}
	respondJSON(w, http.StatusOK, users)
}

func (s *Server) handleGetUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	user, err := s.queries.GetUserByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	respondJSON(w, http.StatusOK, userResponse(user))
}

type approveRequest struct {
	GuaranteeTier string `json:"guarantee_tier"`
}

func (s *Server) handleApproveUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req approveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.GuaranteeTier != "50k" && req.GuaranteeTier != "100k" {
		respondError(w, http.StatusBadRequest, "guarantee_tier must be 50k or 100k")
		return
	}
	user, err := s.queries.ApproveUser(r.Context(), req.GuaranteeTier, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to approve user")
		return
	}
	respondJSON(w, http.StatusOK, userResponse(user))
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

func (s *Server) handleRejectUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req rejectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Reason == "" {
		respondError(w, http.StatusBadRequest, "reason is required")
		return
	}
	user, err := s.queries.RejectUser(r.Context(), req.Reason, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to reject user")
		return
	}
	respondJSON(w, http.StatusOK, userResponse(user))
}

type adminPasswordRequest struct {
	Password string `json:"password"`
}

func (s *Server) handleSetUserPassword(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req adminPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
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

	user, err := s.queries.UpdateUserPassword(r.Context(), sqlc.UpdateUserPasswordParams{
		PasswordHash:       hash,
		MustChangePassword: 1,
		ID:                 id,
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update password")
		return
	}
	respondJSON(w, http.StatusOK, userResponse(user))
}

type adminRoleRequest struct {
	IsAdmin bool `json:"is_admin"`
}

func (s *Server) handleSetUserAdmin(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req adminRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}
	value := int64(0)
	if req.IsAdmin {
		value = 1
	}
	user, err := s.queries.UpdateUserAdmin(r.Context(), sqlc.UpdateUserAdminParams{
		IsAdmin: value,
		ID:      id,
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update admin role")
		return
	}
	respondJSON(w, http.StatusOK, userResponse(user))
}
