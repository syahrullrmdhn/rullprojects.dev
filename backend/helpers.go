package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
)

// Claims for JWT tokens
type Claims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

type contextKey string

const claimsKey contextKey = "claims"

// --- Auth Middleware ---

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			jsonError(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader {
			jsonError(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			jsonError(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// --- JWT Helpers ---

func generateToken(user User) (string, error) {
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		IsAdmin:  user.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func getClaimsFromContext(ctx context.Context) *Claims {
	claims, ok := ctx.Value(claimsKey).(*Claims)
	if !ok {
		return nil
	}
	return claims
}

// --- JSON Helpers ---

func jsonResp(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// --- Static File Server ---

func fileServer(r chi.Router, path string) {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return
	}

	fs := http.StripPrefix("/", http.FileServer(http.Dir(path)))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the file directly
		filePath := filepath.Join(path, r.URL.Path)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			// SPA fallback: serve index.html
			http.ServeFile(w, r, filepath.Join(path, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})
}
