package config

import (
	"strings"
	"testing"
)

func TestFromEnvAcceptsValidLocalConfigurationAndDefaultsPort(t *testing.T) {
	setValidEnvironment(t, "local")
	t.Setenv("PORT", "")

	cfg, err := FromEnv()

	if err != nil {
		t.Fatalf("expected valid local configuration, got %v", err)
	}
	if cfg.Port != "8080" {
		t.Fatalf("expected default port 8080, got %q", cfg.Port)
	}
	if cfg.CookieSecure {
		t.Fatal("expected local cookie to remain non-Secure")
	}
}

func TestFromEnvDerivesSecureCookieFromProduction(t *testing.T) {
	setValidEnvironment(t, "production")
	t.Setenv("ALLOWED_ORIGINS", "https://hunin.example.com")

	cfg, err := FromEnv()

	if err != nil {
		t.Fatalf("expected valid production configuration, got %v", err)
	}
	if !cfg.CookieSecure {
		t.Fatal("expected production cookie to be Secure")
	}
}

func TestFromEnvRequiresSupportedAppEnvironment(t *testing.T) {
	tests := []struct {
		name   string
		appEnv string
	}{
		{name: "missing"},
		{name: "unsupported", appEnv: "staging"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnvironment(t, "local")
			t.Setenv("APP_ENV", tt.appEnv)

			if _, err := FromEnv(); err == nil {
				t.Fatal("expected APP_ENV validation error")
			}
		})
	}
}

func TestFromEnvRequiresPostgreSQLDatabaseURLWithHost(t *testing.T) {
	tests := []struct {
		name        string
		databaseURL string
	}{
		{name: "missing"},
		{name: "malformed", databaseURL: "://not-a-url"},
		{name: "unsupported scheme", databaseURL: "mysql://db.internal/hunin"},
		{name: "missing host", databaseURL: "postgres:///hunin"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnvironment(t, "local")
			t.Setenv("DATABASE_URL", tt.databaseURL)

			if _, err := FromEnv(); err == nil {
				t.Fatal("expected DATABASE_URL validation error")
			}
		})
	}
}

func TestFromEnvAcceptsPostgreSQLSchemes(t *testing.T) {
	for _, databaseURL := range []string{
		"postgres://db.internal/hunin",
		"postgresql://db.internal/hunin",
	} {
		t.Run(databaseURL[:strings.Index(databaseURL, ":")], func(t *testing.T) {
			setValidEnvironment(t, "local")
			t.Setenv("DATABASE_URL", databaseURL)

			if _, err := FromEnv(); err != nil {
				t.Fatalf("expected PostgreSQL URL to be accepted, got %v", err)
			}
		})
	}
}

func TestFromEnvRequiresAllowedOrigins(t *testing.T) {
	setValidEnvironment(t, "local")
	t.Setenv("ALLOWED_ORIGINS", " , ")

	if _, err := FromEnv(); err == nil {
		t.Fatal("expected ALLOWED_ORIGINS validation error")
	}
}

func TestFromEnvRejectsInvalidAllowedOrigins(t *testing.T) {
	tests := []struct {
		name   string
		origin string
	}{
		{name: "relative", origin: "/frontend"},
		{name: "credentials", origin: "https://user:password@example.com"},
		{name: "path", origin: "https://example.com/app"},
		{name: "trailing slash", origin: "https://example.com/"},
		{name: "query", origin: "https://example.com?mode=test"},
		{name: "fragment", origin: "https://example.com#section"},
		{name: "wildcard", origin: "https://*.example.com"},
		{name: "null", origin: "null"},
		{name: "unsupported scheme", origin: "ftp://example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnvironment(t, "local")
			t.Setenv("ALLOWED_ORIGINS", tt.origin)

			if _, err := FromEnv(); err == nil {
				t.Fatal("expected origin validation error")
			}
		})
	}
}

func TestFromEnvRejectsDuplicateAllowedOrigins(t *testing.T) {
	setValidEnvironment(t, "local")
	t.Setenv("ALLOWED_ORIGINS", "https://example.com, https://EXAMPLE.com")

	if _, err := FromEnv(); err == nil {
		t.Fatal("expected duplicate origin validation error")
	}
}

func TestFromEnvRejectsInsecureOrLocalProductionOrigins(t *testing.T) {
	tests := []struct {
		name   string
		origin string
	}{
		{name: "HTTP", origin: "http://hunin.example.com"},
		{name: "localhost", origin: "https://localhost:5173"},
		{name: "localhost subdomain", origin: "https://app.localhost"},
		{name: "IPv4 loopback", origin: "https://127.0.0.1"},
		{name: "IPv6 loopback", origin: "https://[::1]"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnvironment(t, "production")
			t.Setenv("ALLOWED_ORIGINS", tt.origin)

			if _, err := FromEnv(); err == nil {
				t.Fatal("expected production origin validation error")
			}
		})
	}
}

func TestFromEnvValidatesPortRange(t *testing.T) {
	for _, port := range []string{"0", "65536", "-1", "not-a-port"} {
		t.Run(port, func(t *testing.T) {
			setValidEnvironment(t, "local")
			t.Setenv("PORT", port)

			if _, err := FromEnv(); err == nil {
				t.Fatal("expected PORT validation error")
			}
		})
	}
}

func TestFromEnvAcceptsPortRangeBoundaries(t *testing.T) {
	for _, port := range []string{"1", "65535"} {
		t.Run(port, func(t *testing.T) {
			setValidEnvironment(t, "test")
			t.Setenv("PORT", port)

			cfg, err := FromEnv()
			if err != nil {
				t.Fatalf("expected valid port, got %v", err)
			}
			if cfg.Port != port {
				t.Fatalf("expected port %q, got %q", port, cfg.Port)
			}
		})
	}
}

func TestFromEnvErrorsDoNotExposeSensitiveValues(t *testing.T) {
	tests := []struct {
		name        string
		databaseURL string
		origin      string
	}{
		{
			name:        "invalid database URL",
			databaseURL: "postgres://sensitive-user:sensitive-marker@/hunin",
			origin:      "http://localhost:5173",
		},
		{
			name:        "invalid origin with valid database URL",
			databaseURL: "postgres://sensitive-user:sensitive-marker@db.internal/hunin",
			origin:      "not-an-origin",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnvironment(t, "local")
			t.Setenv("DATABASE_URL", tt.databaseURL)
			t.Setenv("ALLOWED_ORIGINS", tt.origin)

			_, err := FromEnv()
			if err == nil {
				t.Fatal("expected configuration error")
			}
			if strings.Contains(err.Error(), "sensitive-marker") || strings.Contains(err.Error(), tt.databaseURL) {
				t.Fatal("configuration error exposed a sensitive value")
			}
		})
	}
}

func setValidEnvironment(t *testing.T, appEnv string) {
	t.Helper()
	t.Setenv("APP_ENV", appEnv)
	t.Setenv("DATABASE_URL", "postgres://db.internal/hunin")
	t.Setenv("ALLOWED_ORIGINS", "http://localhost:5173")
	t.Setenv("PORT", "8080")
}
