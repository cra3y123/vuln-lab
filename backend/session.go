package main

import (
	"net/http"

	"github.com/gorilla/sessions"
)

var Store *sessions.CookieStore

// InitSessionStore sets up the cookie-based session store.
func InitSessionStore() {
	// NOTE: change the key for your own app – keep it secret.
	Store = sessions.NewCookieStore([]byte("vuln-lab-very-secret-key"))

	Store.Options = &sessions.Options{
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		// Secure: true, // enable if you use HTTPS
	}
}
