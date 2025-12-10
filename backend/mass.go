package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

type MassUpdateRequest struct {
	Plan    string `json:"plan"`
	IsAdmin bool   `json:"is_admin"`
	Secure  bool   `json:"secure"`
}

// RegisterMassRoutes wires /api/mass.
func RegisterMassRoutes(r *gin.Engine) {
	g := r.Group("/api/mass")
	g.Use(AuthRequired())

	g.POST("/update", handleMassUpdate)
	g.GET("/me", handleMassMe)
}

func handleMassUpdate(c *gin.Context) {
	var req MassUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	userIDVal, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no user in context"})
		return
	}
	userID := userIDVal.(int)

	ctx := context.Background()

	if !req.Secure {
		// 🔴 INSECURE: trust client is_admin field
		_, err := DB.Exec(ctx,
			"UPDATE accounts SET plan=$1, is_admin=$2 WHERE user_id=$3",
			req.Plan, req.IsAdmin, userID,
		)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"error": err.Error()})
			return
		}
	} else {
		// ✅ SECURE: ignore client is_admin, only allow plan changes
		_, err := DB.Exec(ctx,
			"UPDATE accounts SET plan=$1 WHERE user_id=$2",
			req.Plan, userID,
		)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"error": err.Error()})
			return
		}
	}

	handleMassMe(c)
}

func handleMassMe(c *gin.Context) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no user in context"})
		return
	}
	userID := userIDVal.(int)

	ctx := context.Background()
	var plan string
	var isAdmin bool
	err := DB.QueryRow(ctx,
		"SELECT plan, is_admin FROM accounts WHERE user_id=$1",
		userID,
	).Scan(&plan, &isAdmin)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plan":     plan,
		"is_admin": isAdmin,
	})
}
