package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"maqzone/backend/internal/config"
	"maqzone/backend/internal/db"
	sqlc "maqzone/backend/internal/db/sqlc"
	"maqzone/backend/internal/httpapi"
	"maqzone/backend/internal/scheduler"
)

func main() {
	cfg := config.Load()

	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout})

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	database, err := db.Open(ctx, cfg.SQLitePath)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to open database")
	}
	defer func() {
		_ = database.Close()
	}()

	if err := db.Migrate(ctx, database); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	queries := sqlc.New(database)

	// Initialize WebSocket hub
	hub := httpapi.NewHub(log.Logger)

	server := httpapi.New(cfg, queries, log.Logger)
	server.SetHub(hub)

	// Start auction scheduler with hub for WS broadcasts
	sched := scheduler.New(queries, log.Logger)
	sched.SetBroadcaster(hub)
	go sched.Start(ctx)

	httpServer := &http.Server{
		Addr:        ":" + cfg.Port,
		Handler:     server.Routes(),
		ReadTimeout: 10 * time.Second,
		// WriteTimeout must be 0 for WebSocket connections (handler manages its own deadlines).
		WriteTimeout: 0,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Msg("api server started")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server crashed")
		}
	}()

	<-ctx.Done()
	sched.Stop()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("graceful shutdown failed")
	}
	log.Info().Msg("server stopped")
}
