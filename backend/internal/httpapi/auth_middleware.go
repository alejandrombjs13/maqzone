package httpapi

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"maqzone/backend/internal/auth"
)

type ctxKey string

const userClaimsKey ctxKey = "userClaims"

func GetClaims(ctx context.Context) *auth.Claims {
	if v, ok := ctx.Value(userClaimsKey).(*auth.Claims); ok {
		return v
	}
	return nil
}

// optionalUserAuth parses a Bearer token if present but does not reject the request if missing.
func (s *Server) optionalUserAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if strings.HasPrefix(header, "Bearer ") {
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			if claims, err := auth.ValidateToken(s.cfg.JWTSecret, tokenStr); err == nil {
				ctx := context.WithValue(r.Context(), userClaimsKey, claims)
				r = r.WithContext(ctx)
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) userAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			respondError(w, http.StatusUnauthorized, "missing authorization header")
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := auth.ValidateToken(s.cfg.JWTSecret, tokenStr)
		if err != nil {
			respondError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		ctx := context.WithValue(r.Context(), userClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) requireApproved(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
		if user.Status != "approved" {
			respondError(w, http.StatusForbidden, "account not approved")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Simple in-memory rate limiter
type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

func newRateLimiter() *rateLimiter {
	rl := &rateLimiter{attempts: make(map[string][]time.Time)}
	go rl.cleanup()
	return rl
}

// cleanup periodically removes stale entries to prevent unbounded memory growth.
func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-time.Minute)
		rl.mu.Lock()
		for ip, times := range rl.attempts {
			fresh := times[:0]
			for _, t := range times {
				if t.After(cutoff) {
					fresh = append(fresh, t)
				}
			}
			if len(fresh) == 0 {
				delete(rl.attempts, ip)
			} else {
				rl.attempts[ip] = fresh
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *rateLimiter) allow(key string, maxAttempts int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-window)

	// Prune old entries
	recent := make([]time.Time, 0)
	for _, t := range rl.attempts[key] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}

	if len(recent) >= maxAttempts {
		rl.attempts[key] = recent
		return false
	}

	rl.attempts[key] = append(recent, now)
	return true
}

func (s *Server) rateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if fwd := r.Header.Get("X-Real-IP"); fwd != "" {
			ip = fwd
		}
		if !s.limiter.allow(ip, 5, time.Minute) {
			respondError(w, http.StatusTooManyRequests, "too many requests, try again later")
			return
		}
		next.ServeHTTP(w, r)
	})
}
