package main

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// ----- Types -----

type XSSReflectedRequest struct {
	Input  string `json:"input"`
	Secure bool   `json:"secure"` // ignored, frontend handles secure/insecure display
}

type XSSCommentRequest struct {
	Content string `json:"content"`
	Secure  bool   `json:"secure"` // ignored
}

type XSSComment struct {
	ID      int    `json:"id"`
	Content string `json:"content"`
}

// ----- In-memory storage for Stored XSS -----

var (
	xssComments   []XSSComment
	xssCommentsMu sync.Mutex
	xssNextID     = 1
)

// ----- Route registration -----

func RegisterXSSRoutes(r *gin.Engine) {
	api := r.Group("/api/xss") // no auth wrapper to keep it simple

	// Reflected
	api.POST("/reflected", xssReflectedHandler)

	// Stored
	api.POST("/comment", xssAddCommentHandler)
	api.GET("/comments", xssListCommentsHandler)
}

// ----- Handlers -----

// POST /api/xss/reflected
// Request: { "input": "...", "secure": true/false }
// Response: { "echo": "<same input>" }
func xssReflectedHandler(c *gin.Context) {
	var req XSSReflectedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// 🔥 Intentionally vulnerable: we just echo back raw input.
	// Frontend decides whether to render it as HTML or text.
	c.JSON(http.StatusOK, gin.H{
		"echo": req.Input,
	})
}

// POST /api/xss/comment
// Request: { "content": "...", "secure": true/false }
// Response: { "id": <newId> }
func xssAddCommentHandler(c *gin.Context) {
	var req XSSCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content required"})
		return
	}

	xssCommentsMu.Lock()
	id := xssNextID
	xssNextID++
	xssComments = append(xssComments, XSSComment{
		ID:      id,
		Content: req.Content, // 🔥 not sanitized – stored XSS
	})
	xssCommentsMu.Unlock()

	c.JSON(http.StatusCreated, gin.H{
		"id": id,
	})
}

// GET /api/xss/comments
// Response: { "comments": [ { "id": 1, "content": "..." }, ... ] }
func xssListCommentsHandler(c *gin.Context) {
	xssCommentsMu.Lock()
	clone := make([]XSSComment, len(xssComments))
	copy(clone, xssComments)
	xssCommentsMu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"comments": clone,
	})
}
