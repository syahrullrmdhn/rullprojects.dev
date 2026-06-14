package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

// --- Auth Handlers ---

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user User
	var passwordHash string
	err := db.QueryRow(
		"SELECT id, username, password_hash, is_admin, created_at FROM users WHERE username = $1",
		req.Username,
	).Scan(&user.ID, &user.Username, &passwordHash, &user.IsAdmin, &user.CreatedAt)
	if err != nil {
		jsonError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		jsonError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := generateToken(user)
	if err != nil {
		jsonError(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Password == "" {
		jsonError(w, "Username and password required", http.StatusBadRequest)
		return
	}

	// Check if first user (auto-admin)
	var count int
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	isAdmin := count == 0

	// If not first user, require admin auth
	if !isAdmin {
		claims := getClaimsFromContext(r.Context())
		if claims == nil || !claims.IsAdmin {
			jsonError(w, "Admin access required", http.StatusForbidden)
			return
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	var user User
	err = db.QueryRow(
		"INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin, created_at",
		req.Username, string(hash), isAdmin,
	).Scan(&user.ID, &user.Username, &user.IsAdmin, &user.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			jsonError(w, "Username already exists", http.StatusConflict)
			return
		}
		jsonError(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	token, err := generateToken(user)
	if err != nil {
		jsonError(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// --- Models Handler ---

func handleListModels(w http.ResponseWriter, r *http.Request) {
	httpReq, err := http.NewRequest("GET", litellmURL+"/v1/models", nil)
	if err != nil {
		jsonError(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	if litellmKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+litellmKey)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		jsonError(w, "Failed to reach LiteLLM", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data []struct {
			ID      string `json:"id"`
			Object  string `json:"object"`
			OwnedBy string `json:"owned_by"`
		} `json:"data"`
	}
	json.Unmarshal(body, &result)

	type ModelInfo struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Provider string `json:"provider"`
	}

	models := []ModelInfo{}
	for _, m := range result.Data {
		provider := m.OwnedBy
		if provider == "" || provider == "openai" {
			parts := strings.SplitN(m.ID, "/", 2)
			if len(parts) == 2 {
				provider = parts[0]
			} else {
				provider = "default"
			}
		}
		models = append(models, ModelInfo{
			ID:       m.ID,
			Name:     m.ID,
			Provider: provider,
		})
	}

	jsonResp(w, map[string]interface{}{"models": models})
}

// --- API Keys Handlers ---

func handleListKeys(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	rows, err := db.Query(
		"SELECT id, user_id, key_name, key_prefix, rpm, tpm, budget_limit, budget_used, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC",
		claims.UserID,
	)
	if err != nil {
		jsonError(w, "Failed to query keys", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	keys := []map[string]interface{}{}
	for rows.Next() {
		var k APIKey
		var budgetLimit, budgetUsed float64
		rows.Scan(&k.ID, &k.UserID, &k.KeyName, &k.KeyPrefix, &k.RPM, &k.TPM, &budgetLimit, &budgetUsed, &k.CreatedAt)
		keys = append(keys, map[string]interface{}{
			"id":           k.ID,
			"key_name":     k.KeyName,
			"key_prefix":   k.KeyPrefix,
			"rpm":          k.RPM,
			"tpm":          k.TPM,
			"budget_limit": budgetLimit,
			"budget_used":  budgetUsed,
			"created_at":   k.CreatedAt,
		})
	}

	jsonResp(w, map[string]interface{}{"keys": keys})
}

func handleCreateKey(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	var req struct {
		KeyName     string  `json:"key_name"`
		Alias       string  `json:"alias"`
		RPM         int     `json:"rpm"`
		TPM         int     `json:"tpm"`
		BudgetLimit float64 `json:"budget_limit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	// Support both key_name and alias
	keyName := req.KeyName
	if keyName == "" {
		keyName = req.Alias
	}
	if keyName == "" {
		keyName = "default-key"
	}
	if req.RPM == 0 {
		req.RPM = 60
	}
	if req.TPM == 0 {
		req.TPM = 100000
	}

	// Create key in LiteLLM with budget
	litellmBody := map[string]interface{}{
		"key_alias":             fmt.Sprintf("%s-%s", claims.Username, keyName),
		"max_parallel_requests": req.RPM,
		"tpm_limit":            req.TPM,
		"rpm_limit":            req.RPM,
	}
	if req.BudgetLimit > 0 {
		litellmBody["max_budget"] = req.BudgetLimit
		litellmBody["budget_duration"] = "30d"
	}

	litellmReqBody, _ := json.Marshal(litellmBody)

	httpReq, err := http.NewRequest("POST", litellmURL+"/key/generate", strings.NewReader(string(litellmReqBody)))
	if err != nil {
		jsonError(w, "Failed to create LiteLLM request", http.StatusInternalServerError)
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if litellmKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+litellmKey)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		jsonError(w, "Failed to reach LiteLLM", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var litellmResp struct {
		Key   string `json:"key"`
		KeyID string `json:"key_name"`
	}
	json.Unmarshal(respBody, &litellmResp)

	generatedKey := litellmResp.Key
	if generatedKey == "" {
		b := make([]byte, 32)
		rand.Read(b)
		generatedKey = "sk-" + hex.EncodeToString(b)
	}

	keyPrefix := generatedKey[:10] + "..."
	keyHash := fmt.Sprintf("%x", []byte(generatedKey))

	var keyID int
	err = db.QueryRow(
		"INSERT INTO api_keys (user_id, key_name, key_hash, key_prefix, litellm_key_id, rpm, tpm, budget_limit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
		claims.UserID, keyName, keyHash, keyPrefix, litellmResp.KeyID, req.RPM, req.TPM, req.BudgetLimit,
	).Scan(&keyID)
	if err != nil {
		jsonError(w, "Failed to store key", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]interface{}{
		"id":           keyID,
		"key":          generatedKey,
		"key_name":     keyName,
		"key_prefix":   keyPrefix,
		"rpm":          req.RPM,
		"tpm":          req.TPM,
		"budget_limit": req.BudgetLimit,
	})
}

func handleDeleteKey(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		jsonError(w, "Invalid key ID", http.StatusBadRequest)
		return
	}

	// Get litellm_key_id before deleting
	var litellmKeyID string
	db.QueryRow("SELECT litellm_key_id FROM api_keys WHERE id = $1 AND user_id = $2", id, claims.UserID).Scan(&litellmKeyID)

	// Delete from LiteLLM if we have a key ID
	if litellmKeyID != "" {
		delBody, _ := json.Marshal(map[string]interface{}{"keys": []string{litellmKeyID}})
		httpReq, _ := http.NewRequest("POST", litellmURL+"/key/delete", strings.NewReader(string(delBody)))
		httpReq.Header.Set("Content-Type", "application/json")
		if litellmKey != "" {
			httpReq.Header.Set("Authorization", "Bearer "+litellmKey)
		}
		http.DefaultClient.Do(httpReq)
	}

	result, err := db.Exec("DELETE FROM api_keys WHERE id = $1 AND user_id = $2", id, claims.UserID)
	if err != nil {
		jsonError(w, "Failed to delete key", http.StatusInternalServerError)
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		jsonError(w, "Key not found", http.StatusNotFound)
		return
	}

	jsonResp(w, map[string]interface{}{"deleted": true})
}

func handleUpdateLimits(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		jsonError(w, "Invalid key ID", http.StatusBadRequest)
		return
	}

	var req struct {
		RPM         int     `json:"rpm"`
		TPM         int     `json:"tpm"`
		BudgetLimit float64 `json:"budget_limit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update in PostgreSQL
	result, err := db.Exec(
		"UPDATE api_keys SET rpm = $1, tpm = $2, budget_limit = $3 WHERE id = $4 AND user_id = $5",
		req.RPM, req.TPM, req.BudgetLimit, id, claims.UserID,
	)
	if err != nil {
		jsonError(w, "Failed to update limits", http.StatusInternalServerError)
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		jsonError(w, "Key not found", http.StatusNotFound)
		return
	}

	// Sync to LiteLLM
	var litellmKeyID string
	db.QueryRow("SELECT litellm_key_id FROM api_keys WHERE id = $1", id).Scan(&litellmKeyID)
	if litellmKeyID != "" {
		updateBody := map[string]interface{}{
			"key":       litellmKeyID,
			"rpm_limit": req.RPM,
			"tpm_limit": req.TPM,
		}
		if req.BudgetLimit > 0 {
			updateBody["max_budget"] = req.BudgetLimit
			updateBody["budget_duration"] = "30d"
		}
		bodyBytes, _ := json.Marshal(updateBody)
		httpReq, _ := http.NewRequest("POST", litellmURL+"/key/update", strings.NewReader(string(bodyBytes)))
		httpReq.Header.Set("Content-Type", "application/json")
		if litellmKey != "" {
			httpReq.Header.Set("Authorization", "Bearer "+litellmKey)
		}
		http.DefaultClient.Do(httpReq)
	}

	jsonResp(w, map[string]interface{}{"updated": true, "rpm": req.RPM, "tpm": req.TPM, "budget_limit": req.BudgetLimit})
}

// --- Usage Handler ---

func handleUsage(w http.ResponseWriter, r *http.Request) {
	// Query spend data directly from LiteLLM database (last 30 days)
	type DailyUsage struct {
		Date     string  `json:"date"`
		Spend    float64 `json:"spend"`
		Tokens   int     `json:"tokens"`
		Requests int     `json:"requests"`
	}

	rows, err := db.Query(`
		SELECT 
			DATE("startTime") as day,
			COALESCE(SUM(spend), 0) as total_spend,
			COALESCE(SUM(total_tokens), 0) as total_tokens,
			COUNT(*) as total_requests
		FROM "LiteLLM_SpendLogs"
		WHERE "startTime" >= NOW() - INTERVAL '30 days'
		GROUP BY DATE("startTime")
		ORDER BY day ASC
	`)
	if err != nil {
		// Fallback empty
		jsonResp(w, map[string]interface{}{"daily": []interface{}{}, "total_spend": 0, "total_tokens": 0, "total_requests": 0})
		return
	}
	defer rows.Close()

	daily := []DailyUsage{}
	var totalSpend float64
	var totalTokens int
	var totalRequests int

	for rows.Next() {
		var d DailyUsage
		var day time.Time
		rows.Scan(&day, &d.Spend, &d.Tokens, &d.Requests)
		d.Date = day.Format("2006-01-02")
		daily = append(daily, d)
		totalSpend += d.Spend
		totalTokens += d.Tokens
		totalRequests += d.Requests
	}

	jsonResp(w, map[string]interface{}{
		"daily":          daily,
		"total_spend":    totalSpend,
		"total_tokens":   totalTokens,
		"total_requests": totalRequests,
	})
}

// --- Stats Handler ---

func handleStats(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())

	var totalKeys int
	db.QueryRow("SELECT COUNT(*) FROM api_keys WHERE user_id = $1", claims.UserID).Scan(&totalKeys)

	var totalUsers int
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)

	// Try to get LiteLLM health status with short timeout
	var litellmStatus string
	client := &http.Client{Timeout: 3 * time.Second}
	httpReq, _ := http.NewRequest("GET", litellmURL+"/health/liveliness", nil)
	if litellmKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+litellmKey)
	}
	resp, err := client.Do(httpReq)
	if err != nil {
		litellmStatus = "unreachable"
	} else {
		resp.Body.Close()
		if resp.StatusCode == 200 {
			litellmStatus = "healthy"
		} else {
			litellmStatus = fmt.Sprintf("status_%d", resp.StatusCode)
		}
	}

	jsonResp(w, map[string]interface{}{
		"total_keys":     totalKeys,
		"total_users":    totalUsers,
		"litellm_status": litellmStatus,
		"is_admin":       claims.IsAdmin,
	})
}

// --- User Management Handlers ---

func handleMe(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	var user struct {
		ID        int       `json:"id"`
		Username  string    `json:"username"`
		IsAdmin   bool      `json:"is_admin"`
		Role      string    `json:"role"`
		CreatedAt time.Time `json:"created_at"`
	}
	err := db.QueryRow(
		"SELECT id, username, is_admin, COALESCE(role, 'user'), created_at FROM users WHERE id = $1",
		claims.UserID,
	).Scan(&user.ID, &user.Username, &user.IsAdmin, &user.Role, &user.CreatedAt)
	if err != nil {
		jsonError(w, "User not found", http.StatusNotFound)
		return
	}
	jsonResp(w, user)
}

func handleListUsers(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	if !claims.IsAdmin {
		jsonError(w, "Admin access required", http.StatusForbidden)
		return
	}

	rows, err := db.Query("SELECT id, username, is_admin, COALESCE(role, 'user'), created_at FROM users ORDER BY created_at ASC")
	if err != nil {
		jsonError(w, "Failed to query users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type UserInfo struct {
		ID        int       `json:"id"`
		Username  string    `json:"username"`
		IsAdmin   bool      `json:"is_admin"`
		Role      string    `json:"role"`
		CreatedAt time.Time `json:"created_at"`
	}

	users := []UserInfo{}
	for rows.Next() {
		var u UserInfo
		rows.Scan(&u.ID, &u.Username, &u.IsAdmin, &u.Role, &u.CreatedAt)
		users = append(users, u)
	}

	jsonResp(w, map[string]interface{}{"users": users})
}

func handleUpdateUserRole(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	if !claims.IsAdmin {
		jsonError(w, "Admin access required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		jsonError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Role    string `json:"role"`
		IsAdmin bool   `json:"is_admin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Prevent self-demotion
	if id == claims.UserID && !req.IsAdmin {
		jsonError(w, "Cannot remove your own admin access", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE users SET role = $1, is_admin = $2 WHERE id = $3", req.Role, req.IsAdmin, id)
	if err != nil {
		jsonError(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]interface{}{"updated": true})
}

func handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	claims := getClaimsFromContext(r.Context())
	if !claims.IsAdmin {
		jsonError(w, "Admin access required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		jsonError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Prevent self-delete
	if id == claims.UserID {
		jsonError(w, "Cannot delete yourself", http.StatusBadRequest)
		return
	}

	result, err := db.Exec("DELETE FROM users WHERE id = $1", id)
	if err != nil {
		jsonError(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		jsonError(w, "User not found", http.StatusNotFound)
		return
	}

	jsonResp(w, map[string]interface{}{"deleted": true})
}

// --- Provider Status Handler ---

func handleProviderStatus(w http.ResponseWriter, r *http.Request) {
	type ProviderStatus struct {
		Name        string `json:"name"`
		Status      string `json:"status"`
		Latency     int    `json:"latency_ms"`
		Models      int    `json:"models"`
		Description string `json:"description"`
		Priority    int    `json:"priority"`
		Endpoint    string `json:"endpoint"`
	}

	providers := []ProviderStatus{
		{Name: "claudefire", Description: "Anthropic Claude models (direct)", Priority: 1, Endpoint: "http://127.0.0.1:20129/v1"},
		{Name: "sumopod", Description: "Multi-provider gateway (GPT, Gemini, Claude, etc.)", Priority: 2, Endpoint: "https://ai.sumopod.com/v1"},
		{Name: "litellm", Description: "LiteLLM Router (local orchestrator)", Priority: 0, Endpoint: litellmURL},
	}

	client := &http.Client{Timeout: 5 * time.Second}

	for i, p := range providers {
		start := time.Now()
		var checkURL string
		if p.Name == "litellm" {
			checkURL = p.Endpoint + "/health/liveliness"
		} else {
			checkURL = p.Endpoint + "/models"
		}

		httpReq, _ := http.NewRequest("GET", checkURL, nil)
		if p.Name == "litellm" && litellmKey != "" {
			httpReq.Header.Set("Authorization", "Bearer "+litellmKey)
		}
		if p.Name == "claudefire" {
			httpReq.Header.Set("Authorization", "Bearer "+os.Getenv("CLAUDEFIRE_API_KEY"))
		}
		if p.Name == "sumopod" {
			httpReq.Header.Set("Authorization", "Bearer "+os.Getenv("SUMOPOD_API_KEY"))
		}

		resp, err := client.Do(httpReq)
		latency := int(time.Since(start).Milliseconds())
		providers[i].Latency = latency

		if err != nil {
			providers[i].Status = "offline"
			continue
		}
		resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 400 {
			providers[i].Status = "online"
		} else if resp.StatusCode == 401 || resp.StatusCode == 403 {
			providers[i].Status = "online"
		} else {
			providers[i].Status = "degraded"
		}
	}

	// Count models per provider
	for i, p := range providers {
		if p.Name == "litellm" {
			providers[i].Models = 50
			continue
		}
		switch p.Name {
		case "claudefire":
			providers[i].Models = 6
		case "sumopod":
			providers[i].Models = 42
		}
	}

	// Overall system status
	var uptimeStatus string
	allOnline := true
	for _, p := range providers {
		if p.Status == "offline" {
			allOnline = false
			break
		}
	}
	if allOnline {
		uptimeStatus = "operational"
	} else {
		uptimeStatus = "partial_outage"
	}

	jsonResp(w, map[string]interface{}{
		"providers":     providers,
		"system_status": uptimeStatus,
		"checked_at":    time.Now().Format(time.RFC3339),
	})
}
