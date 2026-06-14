package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/lib/pq"
)

// Config
var (
	db         *sql.DB
	jwtSecret  []byte
	litellmURL string
	litellmKey string
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Models
type User struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	IsAdmin   bool      `json:"is_admin"`
	CreatedAt time.Time `json:"created_at"`
}

type APIKey struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	KeyName    string    `json:"key_name"`
	KeyHash    string    `json:"key_hash"`
	KeyPrefix  string    `json:"key_prefix"`
	LitellmKey string    `json:"litellm_key,omitempty"`
	RPM        int       `json:"rpm"`
	TPM        int       `json:"tpm"`
	CreatedAt  time.Time `json:"created_at"`
}

func main() {
	// Config from env
	dbURL := getEnv("DATABASE_URL", "postgres://n8n@127.0.0.1:5432/litellm?sslmode=disable")
	jwtSecret = []byte(getEnv("JWT_SECRET", "router-panel-secret-2026"))
	litellmURL = getEnv("LITELLM_URL", "http://127.0.0.1:20128")
	litellmKey = os.Getenv("LITELLM_MASTER_KEY")
	port := getEnv("PORT", "20130")

	// Connect to database
	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatal("Database ping failed:", err)
	}

	// Auto-create tables
	initDB()

	// Router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Auth routes
	r.Post("/api/auth/login", handleLogin)
	r.Post("/api/auth/register", handleRegister)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Get("/api/models", handleListModels)
		r.Get("/api/keys", handleListKeys)
		r.Post("/api/keys", handleCreateKey)
		r.Delete("/api/keys/{id}", handleDeleteKey)
		r.Put("/api/keys/{id}/limits", handleUpdateLimits)
		r.Get("/api/stats", handleStats)
		r.Get("/api/usage", handleUsage)
		r.Get("/api/users", handleListUsers)
		r.Put("/api/users/{id}/role", handleUpdateUserRole)
		r.Delete("/api/users/{id}", handleDeleteUser)
		r.Get("/api/me", handleMe)
	})

	// Static files (served under /panel/ and / for console domain)
	frontendDist := filepath.Join("..", "frontend", "dist")
	r.Route("/panel", func(r chi.Router) {
		fileServer(r, frontendDist)
	})
	// Also serve at root for console.rullprojects.dev
	fileServer(r, frontendDist)

	log.Printf("Router Panel backend starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// --- Database Init ---

func initDB() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			is_admin BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS api_keys (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			key_name VARCHAR(255) NOT NULL,
			key_hash VARCHAR(255) NOT NULL,
			key_prefix VARCHAR(20) NOT NULL,
			litellm_key_id VARCHAR(255) DEFAULT '',
			rpm INTEGER DEFAULT 60,
			tpm INTEGER DEFAULT 100000,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
	}
	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Fatal("Failed to init DB:", err)
		}
	}
	log.Println("Database tables initialized")
}
