package db

import (
  "context"
  "database/sql"
  "fmt"
  "os"
  "path/filepath"
  "time"

  _ "github.com/mattn/go-sqlite3"
)

func Open(ctx context.Context, path string) (*sql.DB, error) {
  dir := filepath.Dir(path)
  if err := os.MkdirAll(dir, 0o755); err != nil {
    return nil, fmt.Errorf("create db dir: %w", err)
  }

  db, err := sql.Open("sqlite3", path)
  if err != nil {
    return nil, fmt.Errorf("open sqlite: %w", err)
  }

  db.SetMaxOpenConns(1)
  db.SetMaxIdleConns(1)
  db.SetConnMaxLifetime(30 * time.Minute)

  pragmas := []string{
    "PRAGMA journal_mode=WAL;",
    "PRAGMA foreign_keys=ON;",
    "PRAGMA busy_timeout=5000;",
    "PRAGMA synchronous=NORMAL;",
  }
  for _, stmt := range pragmas {
    if _, err := db.ExecContext(ctx, stmt); err != nil {
      _ = db.Close()
      return nil, fmt.Errorf("apply pragma: %w", err)
    }
  }

  if err := db.PingContext(ctx); err != nil {
    _ = db.Close()
    return nil, fmt.Errorf("ping db: %w", err)
  }

  return db, nil
}
