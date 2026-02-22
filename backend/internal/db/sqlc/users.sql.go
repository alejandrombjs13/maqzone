package db

import "context"

const createUser = `
INSERT INTO users (email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;
`

type CreateUserParams struct {
	Email               string
	PasswordHash        string
	BusinessName        string
	LegalRepresentative string
	RFC                 string
	StreetAddress       string
	Colony              string
	Municipality        string
	PostalCode          string
	City                string
	State               string
	Phone               string
	Mobile              string
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (User, error) {
	row := q.db.QueryRowContext(ctx, createUser,
		arg.Email, arg.PasswordHash, arg.BusinessName, arg.LegalRepresentative,
		arg.RFC, arg.StreetAddress, arg.Colony, arg.Municipality,
		arg.PostalCode, arg.City, arg.State, arg.Phone, arg.Mobile,
	)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}

const getUserByEmail = `
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
WHERE email = ?;
`

func (q *Queries) GetUserByEmail(ctx context.Context, email string) (User, error) {
	row := q.db.QueryRowContext(ctx, getUserByEmail, email)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}

const getUserByID = `
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
WHERE id = ?;
`

func (q *Queries) GetUserByID(ctx context.Context, id int64) (User, error) {
	row := q.db.QueryRowContext(ctx, getUserByID, id)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}

const listUsers = `
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
ORDER BY created_at DESC
LIMIT ?;
`

func (q *Queries) ListUsers(ctx context.Context, limit int64) ([]User, error) {
	rows, err := q.db.QueryContext(ctx, listUsers, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []User
	for rows.Next() {
		var i User
		if err := rows.Scan(
			&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
			&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
			&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
			&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const listUsersByStatus = `
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
WHERE status = ?
ORDER BY created_at DESC
LIMIT ?;
`

func (q *Queries) ListUsersByStatus(ctx context.Context, status string, limit int64) ([]User, error) {
	rows, err := q.db.QueryContext(ctx, listUsersByStatus, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []User
	for rows.Next() {
		var i User
		if err := rows.Scan(
			&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
			&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
			&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
			&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const approveUser = `
UPDATE users
SET status = 'approved', guarantee_tier = ?, remaining_opportunities = 5
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;
`

func (q *Queries) ApproveUser(ctx context.Context, guaranteeTier string, id int64) (User, error) {
	row := q.db.QueryRowContext(ctx, approveUser, guaranteeTier, id)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}

const rejectUser = `
UPDATE users
SET status = 'rejected', rejection_reason = ?
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;
`

func (q *Queries) RejectUser(ctx context.Context, reason string, id int64) (User, error) {
	row := q.db.QueryRowContext(ctx, rejectUser, reason, id)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}

const updateUserPassword = `
UPDATE users
SET password_hash = ?, must_change_password = ?
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;
`

type UpdateUserPasswordParams struct {
	PasswordHash       string
	MustChangePassword int64
	ID                 int64
}

func (q *Queries) UpdateUserPassword(ctx context.Context, arg UpdateUserPasswordParams) (User, error) {
	row := q.db.QueryRowContext(ctx, updateUserPassword, arg.PasswordHash, arg.MustChangePassword, arg.ID)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}

const updateUserAdmin = `
UPDATE users
SET is_admin = ?
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;
`

type UpdateUserAdminParams struct {
	IsAdmin int64
	ID      int64
}

func (q *Queries) UpdateUserAdmin(ctx context.Context, arg UpdateUserAdminParams) (User, error) {
	row := q.db.QueryRowContext(ctx, updateUserAdmin, arg.IsAdmin, arg.ID)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}

const decrementOpportunities = `
UPDATE users
SET remaining_opportunities = remaining_opportunities - 1
WHERE id = ? AND remaining_opportunities > 0;
`

func (q *Queries) DecrementOpportunities(ctx context.Context, id int64) error {
	_, err := q.db.ExecContext(ctx, decrementOpportunities, id)
	return err
}

const setUserOpportunities = `
UPDATE users
SET remaining_opportunities = ?
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;
`

func (q *Queries) SetUserOpportunities(ctx context.Context, arg SetUserOpportunitiesParams) (User, error) {
	row := q.db.QueryRowContext(ctx, setUserOpportunities, arg.RemainingOpportunities, arg.ID)
	var i User
	err := row.Scan(
		&i.ID, &i.Email, &i.PasswordHash, &i.BusinessName, &i.LegalRepresentative,
		&i.RFC, &i.StreetAddress, &i.Colony, &i.Municipality,
		&i.PostalCode, &i.City, &i.State, &i.Phone, &i.Mobile,
		&i.Status, &i.GuaranteeTier, &i.RemainingOpportunities, &i.RejectionReason, &i.MustChangePassword, &i.IsAdmin, &i.CreatedAt,
	)
	return i, err
}
