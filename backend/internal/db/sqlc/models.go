package db

type Auction struct {
	ID                      int64  `json:"id" db:"id"`
	Title                   string `json:"title" db:"title"`
	Description             string `json:"description" db:"description"`
	Location                string `json:"location" db:"location"`
	CurrentBid              int64  `json:"current_bid" db:"current_bid"`
	ReservePrice            int64  `json:"reserve_price" db:"reserve_price"`
	Status                  string `json:"status" db:"status"`
	EndTime                 string `json:"end_time" db:"end_time"`
	ImageURL                string `json:"image_url" db:"image_url"`
	CreatedAt               string `json:"created_at" db:"created_at"`
	StartTime               string `json:"start_time" db:"start_time"`
	SaleMode                string `json:"sale_mode" db:"sale_mode"`
	FixedPrice              int64  `json:"fixed_price" db:"fixed_price"`
	MinBidIncrement         int64  `json:"min_bid_increment" db:"min_bid_increment"`
	BuyerPremiumPct         int64  `json:"buyer_premium_pct" db:"buyer_premium_pct"`
	HighestBidderID         int64  `json:"highest_bidder_id" db:"highest_bidder_id"`
	AutoExtendMinutes       int64  `json:"auto_extend_minutes" db:"auto_extend_minutes"`
	AutoExtendWindowMinutes int64  `json:"auto_extend_window_minutes" db:"auto_extend_window_minutes"`
	PriceVisible            int64  `json:"price_visible" db:"price_visible"`
}

type Listing struct {
	ID          int64  `json:"id" db:"id"`
	Title       string `json:"title" db:"title"`
	Description string `json:"description" db:"description"`
	Location    string `json:"location" db:"location"`
	Price       int64  `json:"price" db:"price"`
	SaleType    string `json:"sale_type" db:"sale_type"`
	Year        int64  `json:"year" db:"year"`
	Status      string `json:"status" db:"status"`
	ImageURL    string `json:"image_url" db:"image_url"`
	CreatedAt   string `json:"created_at" db:"created_at"`
}

type CreateAuctionParams struct {
	Title                   string
	Description             string
	Location                string
	CurrentBid              int64
	ReservePrice            int64
	Status                  string
	EndTime                 string
	ImageURL                string
	StartTime               string
	SaleMode                string
	FixedPrice              int64
	MinBidIncrement         int64
	BuyerPremiumPct         int64
	AutoExtendMinutes       int64
	AutoExtendWindowMinutes int64
	PriceVisible            int64
}

type UpdateAuctionParams struct {
	ID                      int64
	Title                   string
	Description             string
	Location                string
	CurrentBid              int64
	ReservePrice            int64
	Status                  string
	EndTime                 string
	ImageURL                string
	StartTime               string
	SaleMode                string
	FixedPrice              int64
	MinBidIncrement         int64
	BuyerPremiumPct         int64
	AutoExtendMinutes       int64
	AutoExtendWindowMinutes int64
	PriceVisible            int64
}

type CreateListingParams struct {
	Title       string
	Description string
	Location    string
	Price       int64
	SaleType    string
	Year        int64
	Status      string
	ImageURL    string
}

type UpdateListingParams struct {
	ID          int64
	Title       string
	Description string
	Location    string
	Price       int64
	SaleType    string
	Year        int64
	Status      string
	ImageURL    string
}

type User struct {
	ID                     int64  `json:"id" db:"id"`
	Email                  string `json:"email" db:"email"`
	PasswordHash           string `json:"-" db:"password_hash"`
	BusinessName           string `json:"business_name" db:"business_name"`
	LegalRepresentative    string `json:"legal_representative" db:"legal_representative"`
	RFC                    string `json:"rfc" db:"rfc"`
	StreetAddress          string `json:"street_address" db:"street_address"`
	Colony                 string `json:"colony" db:"colony"`
	Municipality           string `json:"municipality" db:"municipality"`
	PostalCode             string `json:"postal_code" db:"postal_code"`
	City                   string `json:"city" db:"city"`
	State                  string `json:"state" db:"state"`
	Phone                  string `json:"phone" db:"phone"`
	Mobile                 string `json:"mobile" db:"mobile"`
	Status                 string `json:"status" db:"status"`
	GuaranteeTier          string `json:"guarantee_tier" db:"guarantee_tier"`
	RemainingOpportunities int64  `json:"remaining_opportunities" db:"remaining_opportunities"`
	RejectionReason        string `json:"rejection_reason" db:"rejection_reason"`
	MustChangePassword     int64  `json:"must_change_password" db:"must_change_password"`
	IsAdmin                int64  `json:"is_admin" db:"is_admin"`
	CreatedAt              string `json:"created_at" db:"created_at"`
}

type AuctionEnrollment struct {
	ID        int64  `json:"id" db:"id"`
	AuctionID int64  `json:"auction_id" db:"auction_id"`
	UserID    int64  `json:"user_id" db:"user_id"`
	Status    string `json:"status" db:"status"`
	CreatedAt string `json:"created_at" db:"created_at"`
}

type EnrollmentWithUser struct {
	ID            int64  `json:"id"`
	AuctionID     int64  `json:"auction_id"`
	UserID        int64  `json:"user_id"`
	Status        string `json:"status"`
	CreatedAt     string `json:"created_at"`
	Email         string `json:"email"`
	BusinessName  string `json:"business_name"`
	GuaranteeTier string `json:"guarantee_tier"`
}

type SetUserOpportunitiesParams struct {
	ID                     int64
	RemainingOpportunities int64
}
