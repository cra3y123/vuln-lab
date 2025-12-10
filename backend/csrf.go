package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CSRFChangeEmailRequest struct {
	Email  string `json:"email"`
	Token  string `json:"token"`
	Secure bool   `json:"secure"`
}

// RegisterCSRFRoutes wires /api/csrf.
func RegisterCSRFRoutes(r *gin.Engine) {
	g := r.Group("/api/csrf")
	g.Use(AuthRequired())

	g.GET("/token", handleCSRFToken)
	g.GET("/profile", handleCSRFProfile)
	g.POST("/change-email", handleCSRFChangeEmail)
}

func handleCSRFToken(c *gin.Context) {
	// generate random token and store in session
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	token := hex.EncodeToString(b)

	// use the same session store as auth.go
	session, _ := Store.Get(c.Request, "session")
	session.Values["csrf_token"] = token
	_ = session.Save(c.Request, c.Writer)

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func handleCSRFProfile(c *gin.Context) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no user"})
		return
	}
	userID := userIDVal.(int)

	ctx := context.Background()
	var email string
	err := DB.QueryRow(ctx,
		"SELECT email FROM user_profiles WHERE user_id=$1",
		userID,
	).Scan(&email)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"email": email})
}

func handleCSRFChangeEmail(c *gin.Context) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no user"})
		return
	}
	userID := userIDVal.(int)

	var req CSRFChangeEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if req.Secure {
		// ✅ SECURE: verify CSRF token from session
		session, _ := Store.Get(c.Request, "session")
		stored, _ := session.Values["csrf_token"].(string)
		if stored == "" || stored != req.Token {
			c.JSON(http.StatusOK, gin.H{"error": "invalid CSRF token"})
			return
		}
	}

	ctx := context.Background()
	_, err := DB.Exec(ctx,
		"UPDATE user_profiles SET email=$1 WHERE user_id=$2",
		req.Email, userID,
	)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": err.Error()})
		return
	}

	handleCSRFProfile(c)
}
