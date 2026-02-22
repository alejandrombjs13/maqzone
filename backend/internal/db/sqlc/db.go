package db

import (
  "context"
  "database/sql"
)

type DBTX interface {
  ExecContext(context.Context, string, ...any) (sql.Result, error)
  PrepareContext(context.Context, string) (*sql.Stmt, error)
  QueryContext(context.Context, string, ...any) (*sql.Rows, error)
  QueryRowContext(context.Context, string, ...any) *sql.Row
}

type Queries struct {
  db DBTX
}

func New(db DBTX) *Queries {
  return &Queries{db: db}
}

type Querier interface {
  ListActiveAuctions(ctx context.Context, limit int64) ([]Auction, error)
  GetAuction(ctx context.Context, id int64) (Auction, error)
  CreateAuction(ctx context.Context, arg CreateAuctionParams) (Auction, error)
  UpdateAuction(ctx context.Context, arg UpdateAuctionParams) (Auction, error)
  DeleteAuction(ctx context.Context, id int64) error

  ListListings(ctx context.Context, limit int64) ([]Listing, error)
  GetListing(ctx context.Context, id int64) (Listing, error)
  CreateListing(ctx context.Context, arg CreateListingParams) (Listing, error)
  UpdateListing(ctx context.Context, arg UpdateListingParams) (Listing, error)
  DeleteListing(ctx context.Context, id int64) error

  CreateUser(ctx context.Context, arg CreateUserParams) (User, error)
  GetUserByEmail(ctx context.Context, email string) (User, error)
  GetUserByID(ctx context.Context, id int64) (User, error)
  ListUsers(ctx context.Context, limit int64) ([]User, error)
  ListUsersByStatus(ctx context.Context, status string, limit int64) ([]User, error)
  ApproveUser(ctx context.Context, guaranteeTier string, id int64) (User, error)
  RejectUser(ctx context.Context, reason string, id int64) (User, error)
  UpdateUserPassword(ctx context.Context, arg UpdateUserPasswordParams) (User, error)
  UpdateUserAdmin(ctx context.Context, arg UpdateUserAdminParams) (User, error)
  DecrementOpportunities(ctx context.Context, id int64) error

  PlaceBid(ctx context.Context, arg PlaceBidParams) (Bid, error)
  ListBidsForAuction(ctx context.Context, auctionID int64, limit int64) ([]Bid, error)
  GetHighestBid(ctx context.Context, auctionID int64) (Bid, error)
  UpdateAuctionBid(ctx context.Context, currentBid int64, highestBidderID int64, id int64) error

  ActivateScheduledAuctions(ctx context.Context) error
  CloseExpiredAuctions(ctx context.Context) error
  ListAllAuctions(ctx context.Context, limit int64) ([]Auction, error)
}
