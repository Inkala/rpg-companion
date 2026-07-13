package server

import (
	"net/http"
	"strings"
)

func withSecurityHeaders(next http.Handler, strictTransportSecurity bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := w.Header()
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("Referrer-Policy", "no-referrer")
		header.Set("X-Frame-Options", "DENY")
		header.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		header.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		if strictTransportSecurity {
			header.Set("Strict-Transport-Security", "max-age=31536000")
		}

		next.ServeHTTP(w, r)
	})
}

func withPrivateResponseNoStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isPrivateResponsePath(r.URL.Path) {
			w.Header().Set("Cache-Control", "no-store")
		}

		next.ServeHTTP(w, r)
	})
}

func isPrivateResponsePath(path string) bool {
	switch path {
	case "/auth/register", "/auth/sessions", "/auth/session", "/characters", "/parties":
		return true
	default:
		return strings.HasPrefix(path, "/characters/") ||
			strings.HasPrefix(path, "/parties/") ||
			strings.HasPrefix(path, "/party-invites/")
	}
}
