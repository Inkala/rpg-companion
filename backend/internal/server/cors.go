package server

import (
	"net/http"
)

func withCORS(next http.Handler, allowedOrigins []string) http.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		originAllowed := false
		if origin != "" {
			if _, ok := allowed[origin]; ok {
				originAllowed = true
				writeCORSHeaders(w, origin)
			}
		}

		if r.Method == http.MethodOptions {
			if origin != "" && !originAllowed {
				http.Error(w, "origin is not allowed", http.StatusForbidden)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		if isUnsafeMethod(r.Method) && origin != "" && !originAllowed {
			http.Error(w, "origin is not allowed", http.StatusForbidden)
			return
		}

		if isUnsafeMethod(r.Method) && origin == "" && r.Header.Get("Cookie") != "" {
			http.Error(w, "origin is required for cookie-authenticated requests", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeCORSHeaders(w http.ResponseWriter, origin string) {
	header := w.Header()
	header.Add("Vary", "Origin")
	header.Set("Access-Control-Allow-Origin", origin)
	header.Set("Access-Control-Allow-Credentials", "true")
	header.Set("Access-Control-Allow-Headers", "Content-Type")
	header.Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
}

func isUnsafeMethod(method string) bool {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return false
	default:
		return true
	}
}
