package config

import (
  "os"
  "strings"
)

type Config struct {
  Port               string
  SQLitePath         string
  CorsAllowedOrigins []string
  CorsAllowAll       bool
  LogLevel           string
  AdminToken         string
  JWTSecret          string
}

func Load() Config {
  port := getEnv("PORT", "8080")
  sqlitePath := getEnv("SQLITE_PATH", "./data/maqzone.db")
  corsAllowAll := strings.ToLower(getEnv("CORS_ALLOW_ALL", "true")) == "true"
  origins := splitCSV(getEnv("CORS_ALLOWED_ORIGINS", ""))
  logLevel := getEnv("LOG_LEVEL", "info")
  adminToken := getEnv("ADMIN_TOKEN", "")
  jwtSecret := getEnv("JWT_SECRET", "maqzone-dev-secret-change-in-production")

  return Config{
    Port:               port,
    SQLitePath:         sqlitePath,
    CorsAllowedOrigins: origins,
    CorsAllowAll:       corsAllowAll,
    LogLevel:           logLevel,
    AdminToken:         adminToken,
    JWTSecret:          jwtSecret,
  }
}

func getEnv(key, fallback string) string {
  if v := os.Getenv(key); v != "" {
    return v
  }
  return fallback
}

func splitCSV(raw string) []string {
  if raw == "" {
    return nil
  }
  parts := strings.Split(raw, ",")
  out := make([]string, 0, len(parts))
  for _, p := range parts {
    p = strings.TrimSpace(p)
    if p != "" {
      out = append(out, p)
    }
  }
  return out
}
