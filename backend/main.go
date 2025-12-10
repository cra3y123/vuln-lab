package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// DB + sessions
	InitDB()
	defer CloseDB()

	InitSessionStore()

	r := gin.Default()

	// CORS for React (5173)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Auth routes (login + /me)
	RegisterAuthRoutes(r)

	// Vulnerability routes
	RegisterSQLiRoutes(r)
	RegisterXSSRoutes(r)
	RegisterIDORRoutes(r)
	RegisterMassRoutes(r)
	RegisterSSRFRoutes(r)
	RegisterCSRFRoutes(r)

	log.Println("Backend running on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
