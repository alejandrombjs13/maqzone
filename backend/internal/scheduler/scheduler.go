package scheduler

import (
	"context"
	"time"

	"github.com/rs/zerolog"

	sqlc "maqzone/backend/internal/db/sqlc"
)

// Broadcaster is implemented by the WebSocket hub so the scheduler can
// notify connected clients when auction status changes.
type Broadcaster interface {
	BroadcastStatus(auctionID int64, status string)
}

type Scheduler struct {
	queries     *sqlc.Queries
	logger      zerolog.Logger
	stop        chan struct{}
	broadcaster Broadcaster
}

func New(queries *sqlc.Queries, logger zerolog.Logger) *Scheduler {
	return &Scheduler{
		queries: queries,
		logger:  logger,
		stop:    make(chan struct{}),
	}
}

func (s *Scheduler) SetBroadcaster(b Broadcaster) {
	s.broadcaster = b
}

func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Run immediately on start
	s.tick(ctx)

	for {
		select {
		case <-ticker.C:
			s.tick(ctx)
		case <-s.stop:
			return
		case <-ctx.Done():
			return
		}
	}
}

func (s *Scheduler) Stop() {
	close(s.stop)
}

func (s *Scheduler) tick(ctx context.Context) {
	if err := s.queries.ActivateScheduledAuctions(ctx); err != nil {
		s.logger.Error().Err(err).Msg("scheduler: failed to activate auctions")
	}
	if err := s.queries.CloseExpiredAuctions(ctx); err != nil {
		s.logger.Error().Err(err).Msg("scheduler: failed to close auctions")
	}
}
