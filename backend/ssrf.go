package main

import (
	"io"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
)

type SSRFRequest struct {
	URL    string `json:"url"`
	Secure bool   `json:"secure"`
}

// RegisterSSRFRoutes wires /api/ssrf.
func RegisterSSRFRoutes(r *gin.Engine) {
	g := r.Group("/api/ssrf")
	g.Use(AuthRequired())

	g.POST("/fetch", handleSSRF)
}

func handleSSRF(c *gin.Context) {
	var req SSRFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	parsed, err := url.Parse(req.URL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		c.JSON(http.StatusOK, gin.H{"error": "invalid URL"})
		return
	}

	if req.Secure {
		// ✅ SECURE: basic SSRF protections
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			c.JSON(http.StatusOK, gin.H{"error": "only http/https allowed"})
			return
		}

		host := parsed.Hostname()
		ip := net.ParseIP(host)
		if ip != nil {
			// block localhost, private IP ranges
			if ip.IsLoopback() || ip.IsPrivate() {
				c.JSON(http.StatusOK, gin.H{"error": "internal addresses blocked"})
				return
			}
		}
		if host == "localhost" {
			c.JSON(http.StatusOK, gin.H{"error": "localhost blocked"})
			return
		}
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(req.URL)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
	bodyStr := string(bodyBytes)

	c.JSON(http.StatusOK, gin.H{
		"requested_url": req.URL,
		"secure":        req.Secure,
		"status":        resp.StatusCode,
		"body_preview":  bodyStr,
		"content_type":  resp.Header.Get("Content-Type"),
	})
}
