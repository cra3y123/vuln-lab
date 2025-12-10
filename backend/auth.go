package main

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes exposes /api/auth login + /me + /logout.
func RegisterAuthRoutes(r *gin.Engine) {
	g := r.Group("/api/auth")

	g.POST("/login", handleLogin)
	g.POST("/logout", handleLogout)

	// /me MUST be protected by AuthRequired – it should be 401 before login.
	g.GET("/me", AuthRequired(), handleMe)
}

// -------- LOGIN --------

func handleLogin(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// Validate user from DB (users table: id, username, password)
	ctx := context.Background()
	var userID int
	err := DB.QueryRow(ctx,
		`SELECT id FROM users WHERE username = $1 AND password = $2`,
		body.Username, body.Password,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Create / update session
	session, _ := Store.Get(c.Request, "session")
	session.Values["user_id"] = userID
	if err := session.Save(c.Request, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "login ok",
		"user_id": userID,
	})
}

// -------- LOGOUT --------

func handleLogout(c *gin.Context) {
	session, _ := Store.Get(c.Request, "session")

	// Destroy the session by setting MaxAge < 0 and saving
	session.Options.MaxAge = -1
	if err := session.Save(c.Request, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clear session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

// -------- /me (who am I) --------

func handleMe(c *gin.Context) {
	userID, ok := getCurrentUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no user in context"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user_id": userID})
}

// -------- Auth middleware + helpers --------

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		session, err := Store.Get(c.Request, "session")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
			return
		}

		raw := session.Values["user_id"]
		if raw == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "no user in context"})
			return
		}

		userID, ok := convertToInt(raw)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		// store in context for later handlers (IDOR, CSRF, etc.)
		c.Set("userID", userID)
		c.Next()
	}
}

func getCurrentUserIDFromContext(c *gin.Context) (int, bool) {
	v, ok := c.Get("userID")
	if !ok {
		return 0, false
	}
	id, ok := convertToInt(v)
	if !ok {
		return 0, false
	}
	return id, true
}

// shared helper for turning session values into int.
func convertToInt(v interface{}) (int, bool) {
	switch t := v.(type) {
	case int:
		return t, true
	case int64:
		return int(t), true
	case float64:
		return int(t), true
	case string:
		if t == "" {
			return 0, false
		}
		i, err := strconv.Atoi(t)
		if err != nil {
			return 0, false
		}
		return i, true
	default:
		return 0, false
	}
}
