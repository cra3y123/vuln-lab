package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type SQLiRequest struct {
	Term   string `json:"term"`   // search term / payload
	Type   string `json:"type"`   // error, boolean, time, union, oob
	Secure bool   `json:"secure"` // true = safe code path, false = vulnerable
}

type SQLiResult struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
}

// RegisterSQLiRoutes wires the /api/sqli routes.
func RegisterSQLiRoutes(r *gin.Engine) {
	group := r.Group("/api/sqli")
	group.Use(AuthRequired()) // must be logged in
	group.POST("/search", handleSQLiSearch)
}

func handleSQLiSearch(c *gin.Context) {
	var req SQLiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	ctx := context.Background()
	results := []SQLiResult{}
	var query string
	var execErr error
	var errorText string

	start := time.Now()

	if !req.Secure {
		// =========================
		// 🔴 INSECURE / VULNERABLE
		// =========================
		// Direct string concatenation with user input.
		// Same base pattern for all SQLi "types".
		// For TIME-BASED we also simulate a delay in the insecure branch
		// to make the difference very obvious in the UI.
		if req.Type == "time" {
			time.Sleep(3 * time.Second)
		}

		query = fmt.Sprintf(
			"SELECT id, username FROM users WHERE username ILIKE '%%%s%%'",
			req.Term,
		)

		rows, qerr := DB.Query(ctx, query)
		if qerr != nil {
			// For the lab we return 200 and surface the error ONLY
			// for error-based SQLi. For boolean/time types the signal
			// is row count or elapsed time, not DB error.
			if req.Type == "error" {
				errorText = qerr.Error()
			}
			elapsed := time.Since(start).Milliseconds()
			c.JSON(http.StatusOK, gin.H{
				"secure":     false,
				"type":       req.Type,
				"query":      query,
				"error":      errorText,
				"row_count":  0,
				"elapsed_ms": elapsed,
				"results":    []SQLiResult{},
			})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var rrow SQLiResult
			if scanErr := rows.Scan(&rrow.ID, &rrow.Username); scanErr != nil {
				execErr = scanErr
				break
			}
			results = append(results, rrow)
		}
	} else {
		// =======================
		// ✅ SECURE / SAFE PATH
		// =======================
		// Parameterized query prevents injection.
		query = "SELECT id, username FROM users WHERE username ILIKE '%' || $1 || '%'"
		rows, qerr := DB.Query(ctx, query, req.Term)
		if qerr != nil {
			// Secure query shouldn't normally error, but if it does we still
			// just surface the error (useful for error-based mode).
			if req.Type == "error" {
				errorText = qerr.Error()
			}
			elapsed := time.Since(start).Milliseconds()
			c.JSON(http.StatusOK, gin.H{
				"secure":     true,
				"type":       req.Type,
				"query":      query,
				"error":      errorText,
				"row_count":  0,
				"elapsed_ms": elapsed,
				"results":    []SQLiResult{},
			})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var rrow SQLiResult
			if scanErr := rows.Scan(&rrow.ID, &rrow.Username); scanErr != nil {
				execErr = scanErr
				break
			}
			results = append(results, rrow)
		}
	}

	if execErr != nil {
		// Again: return 200, attach error text only for error-based mode
		if req.Type == "error" {
			errorText = execErr.Error()
		}
	}

	elapsed := time.Since(start).Milliseconds()

	c.JSON(http.StatusOK, gin.H{
		"secure":     req.Secure,
		"type":       req.Type,
		"query":      query,
		"error":      errorText,
		"row_count":  len(results),
		"elapsed_ms": elapsed,
		"results":    results,
	})
}
