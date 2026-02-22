package httpapi_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/rs/zerolog"

	"maqzone/backend/internal/config"
	"maqzone/backend/internal/db"
	sqlc "maqzone/backend/internal/db/sqlc"
	"maqzone/backend/internal/httpapi"
)

const testToken = "test-admin-token"

func setupTestServer(t *testing.T) (*httptest.Server, *sql.DB) {
	t.Helper()

	tmpFile, err := os.CreateTemp("", "maqzone-test-*.db")
	if err != nil {
		t.Fatal(err)
	}
	tmpFile.Close()
	t.Cleanup(func() { os.Remove(tmpFile.Name()) })

	database, err := db.Open(context.Background(), tmpFile.Name())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })

	if err := db.Migrate(context.Background(), database); err != nil {
		t.Fatal(err)
	}

	cfg := config.Config{
		Port:               "0",
		SQLitePath:         tmpFile.Name(),
		CorsAllowAll:       true,
		LogLevel:           "disabled",
		AdminToken:         testToken,
	}

	queries := sqlc.New(database)
	logger := zerolog.Nop()
	srv := httpapi.New(cfg, queries, logger)
	ts := httptest.NewServer(srv.Routes())
	t.Cleanup(ts.Close)

	return ts, database
}

func TestHealthEndpoint(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/health")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	if body["status"] != "ok" {
		t.Fatalf("expected status ok, got %v", body["status"])
	}
	if body["time"] == nil {
		t.Fatal("expected time field")
	}
}

func TestListAuctions(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/auctions")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var auctions []map[string]any
	json.NewDecoder(resp.Body).Decode(&auctions)
	if len(auctions) < 1 {
		t.Fatal("expected at least 1 auction from seed data")
	}
	if auctions[0]["title"] == nil {
		t.Fatal("expected title field")
	}
}

func TestListAuctionsWithLimit(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/auctions?limit=1")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var auctions []map[string]any
	json.NewDecoder(resp.Body).Decode(&auctions)
	if len(auctions) != 1 {
		t.Fatalf("expected 1 auction, got %d", len(auctions))
	}
}

func TestGetAuction(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/auctions/1")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var auction map[string]any
	json.NewDecoder(resp.Body).Decode(&auction)
	if auction["id"] != float64(1) {
		t.Fatalf("expected id 1, got %v", auction["id"])
	}
}

func TestGetAuctionNotFound(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/auctions/9999")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestGetAuctionInvalidID(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/auctions/abc")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestListListings(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/listings")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var listings []map[string]any
	json.NewDecoder(resp.Body).Decode(&listings)
	if len(listings) < 1 {
		t.Fatal("expected at least 1 listing from seed data")
	}
}

func TestGetListing(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/listings/1")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestGetListingNotFound(t *testing.T) {
	ts, _ := setupTestServer(t)

	resp, err := http.Get(ts.URL + "/api/listings/9999")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

// --- Admin auth tests ---

func TestAdminRequiresToken(t *testing.T) {
	ts, _ := setupTestServer(t)

	body := `{"title":"Test","description":"Desc","location":"MX","end_time":"2026-12-31T23:59:59Z"}`
	resp, err := http.Post(ts.URL+"/api/admin/auctions", "application/json", bytes.NewBufferString(body))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", resp.StatusCode)
	}
}

func TestAdminInvalidToken(t *testing.T) {
	ts, _ := setupTestServer(t)

	body := `{"title":"Test","description":"Desc","location":"MX","end_time":"2026-12-31T23:59:59Z"}`
	req, _ := http.NewRequest("POST", ts.URL+"/api/admin/auctions", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "wrong-token")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 with wrong token, got %d", resp.StatusCode)
	}
}

// --- Admin CRUD auctions ---

func adminRequest(t *testing.T, method, url string, body any) *http.Response {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	req, err := http.NewRequest(method, url, &buf)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", testToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func TestCreateAuction(t *testing.T) {
	ts, _ := setupTestServer(t)

	auction := map[string]any{
		"title":         "Test Auction",
		"description":   "Integration test auction",
		"location":      "Test City, MX",
		"current_bid":   10000,
		"reserve_price": 20000,
		"end_time":      "2026-12-31T23:59:59Z",
		"image_url":     "https://example.com/img.jpg",
	}

	resp := adminRequest(t, "POST", ts.URL+"/api/admin/auctions", auction)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}

	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	if created["title"] != "Test Auction" {
		t.Fatalf("expected title 'Test Auction', got %v", created["title"])
	}
	if created["status"] != "active" {
		t.Fatalf("expected default status 'active', got %v", created["status"])
	}
}

func TestCreateAuctionMissingFields(t *testing.T) {
	ts, _ := setupTestServer(t)

	auction := map[string]any{
		"title": "Incomplete",
	}

	resp := adminRequest(t, "POST", ts.URL+"/api/admin/auctions", auction)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing fields, got %d", resp.StatusCode)
	}
}

func TestUpdateAuction(t *testing.T) {
	ts, _ := setupTestServer(t)

	update := map[string]any{
		"title":         "Updated Excavadora",
		"description":   "Updated description",
		"location":      "Updated City, MX",
		"current_bid":   65000,
		"reserve_price": 80000,
		"status":        "active",
		"end_time":      "2026-12-31T23:59:59Z",
		"image_url":     "https://example.com/updated.jpg",
	}

	resp := adminRequest(t, "PUT", ts.URL+"/api/admin/auctions/1", update)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var updated map[string]any
	json.NewDecoder(resp.Body).Decode(&updated)
	if updated["title"] != "Updated Excavadora" {
		t.Fatalf("expected updated title, got %v", updated["title"])
	}
}

func TestDeleteAuction(t *testing.T) {
	ts, _ := setupTestServer(t)

	// Create one first
	auction := map[string]any{
		"title":       "To Delete",
		"description": "Will be deleted",
		"location":    "MX",
		"end_time":    "2026-12-31T23:59:59Z",
	}
	createResp := adminRequest(t, "POST", ts.URL+"/api/admin/auctions", auction)
	var created map[string]any
	json.NewDecoder(createResp.Body).Decode(&created)
	createResp.Body.Close()

	id := int(created["id"].(float64))

	resp := adminRequest(t, "DELETE", ts.URL+"/api/admin/auctions/"+itoa(id), nil)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	// Verify deleted
	getResp, err := http.Get(ts.URL + "/api/auctions/" + itoa(id))
	if err != nil {
		t.Fatalf("get after delete: %v", err)
	}
	defer getResp.Body.Close()
	if getResp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", getResp.StatusCode)
	}
}

// --- Admin CRUD listings ---

func TestCreateListing(t *testing.T) {
	ts, _ := setupTestServer(t)

	listing := map[string]any{
		"title":       "Test Listing",
		"description": "Integration test listing",
		"location":    "Test City, MX",
		"price":       50000,
		"sale_type":   "direct",
		"year":        2023,
		"image_url":   "https://example.com/img.jpg",
	}

	resp := adminRequest(t, "POST", ts.URL+"/api/admin/listings", listing)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}

	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	if created["title"] != "Test Listing" {
		t.Fatalf("expected title 'Test Listing', got %v", created["title"])
	}
}

func TestCreateListingMissingFields(t *testing.T) {
	ts, _ := setupTestServer(t)

	listing := map[string]any{
		"title": "Incomplete",
	}

	resp := adminRequest(t, "POST", ts.URL+"/api/admin/listings", listing)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing fields, got %d", resp.StatusCode)
	}
}

func TestUpdateListing(t *testing.T) {
	ts, _ := setupTestServer(t)

	update := map[string]any{
		"title":       "Updated Bulldozer",
		"description": "Updated description",
		"location":    "Updated City, MX",
		"price":       120000,
		"sale_type":   "direct",
		"year":        2021,
		"status":      "active",
		"image_url":   "https://example.com/updated.jpg",
	}

	resp := adminRequest(t, "PUT", ts.URL+"/api/admin/listings/1", update)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var updated map[string]any
	json.NewDecoder(resp.Body).Decode(&updated)
	if updated["title"] != "Updated Bulldozer" {
		t.Fatalf("expected updated title, got %v", updated["title"])
	}
}

func TestDeleteListing(t *testing.T) {
	ts, _ := setupTestServer(t)

	listing := map[string]any{
		"title":       "To Delete",
		"description": "Will be deleted",
		"location":    "MX",
		"price":       1000,
		"sale_type":   "direct",
		"year":        2020,
	}
	createResp := adminRequest(t, "POST", ts.URL+"/api/admin/listings", listing)
	var created map[string]any
	json.NewDecoder(createResp.Body).Decode(&created)
	createResp.Body.Close()

	id := int(created["id"].(float64))

	resp := adminRequest(t, "DELETE", ts.URL+"/api/admin/listings/"+itoa(id), nil)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func itoa(n int) string {
	return fmt.Sprintf("%d", n)
}
