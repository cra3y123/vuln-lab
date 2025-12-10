package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

type IDORRequest struct {
	TargetUserID int  `json:"targetUserId"`
	Secure       bool `json:"secure"`
}

type ProfileResponse struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	Bio    string `json:"bio"`
}

// RegisterIDORRoutes wires /api/idor.
func RegisterIDORRoutes(r *gin.Engine) {
	g := r.Group("/api/idor")
	g.Use(AuthRequired()) // session auth: user id taken from session token

	g.POST("/profile", handleIDORProfile)
}

func handleIDORProfile(c *gin.Context) {
	var req IDORRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// ---- current logged-in user from session token ----
	currentUserID, ok := getCurrentUserIDFromContext(c) // helper in auth.go
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no user in context"})
		return
	}

	if req.TargetUserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid targetUserId"})
		return
	}

	ctx := context.Background()
	var targetID int

	if !req.Secure {
		// 🔴 INSECURE: trust client-supplied targetUserId (IDOR!)
		// Session token is ignored for authorization.
		targetID = req.TargetUserID
	} else {
		// ✅ SECURE: enforce authorization using session token.
		// The client is NOT allowed to see another user's profile.
		if req.TargetUserID != currentUserID {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "secure mode: you may only access your own profile",
			})
			return
		}
		targetID = currentUserID
	}

	var resp ProfileResponse
	err := DB.QueryRow(ctx,
		"SELECT user_id, email, bio FROM user_profiles WHERE user_id=$1",
		targetID,
	).Scan(&resp.UserID, &resp.Email, &resp.Bio)
	if err != nil {
		// Don't leak SQL errors – just generic failure.
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile":         resp,
		"requestedUserId": req.TargetUserID,
		"effectiveUserId": targetID,
		"secure":          req.Secure,
	})
}
