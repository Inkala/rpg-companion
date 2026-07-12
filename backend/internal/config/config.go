package config

import (
	"errors"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port           string
	AppEnv         string
	DatabaseURL    string
	AllowedOrigins []string
	CookieSecure   bool
}

func FromEnv() (Config, error) {
	appEnv := strings.TrimSpace(os.Getenv("APP_ENV"))
	if !isSupportedAppEnvironment(appEnv) {
		return Config{}, errors.New("APP_ENV is invalid")
	}

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if !isValidDatabaseURL(databaseURL) {
		return Config{}, errors.New("DATABASE_URL is invalid")
	}

	allowedOrigins, err := parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS"), appEnv)
	if err != nil {
		return Config{}, err
	}

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}
	parsedPort, err := strconv.Atoi(port)
	if err != nil || parsedPort < 1 || parsedPort > 65535 {
		return Config{}, errors.New("PORT is invalid")
	}

	return Config{
		Port:           port,
		AppEnv:         appEnv,
		DatabaseURL:    databaseURL,
		AllowedOrigins: allowedOrigins,
		CookieSecure:   appEnv == "production",
	}, nil
}

func isSupportedAppEnvironment(appEnv string) bool {
	switch appEnv {
	case "local", "test", "production":
		return true
	default:
		return false
	}
}

func isValidDatabaseURL(value string) bool {
	if value == "" {
		return false
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return false
	}
	if parsed.Scheme != "postgres" && parsed.Scheme != "postgresql" {
		return false
	}
	return parsed.Hostname() != ""
}

func parseAllowedOrigins(value string, appEnv string) ([]string, error) {
	items := strings.Split(value, ",")
	origins := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))

	for _, item := range items {
		origin := strings.TrimSpace(item)
		if origin == "" {
			continue
		}

		parsed, canonical, err := parseOrigin(origin)
		if err != nil {
			return nil, errors.New("ALLOWED_ORIGINS is invalid")
		}
		if appEnv == "production" && !isValidProductionOrigin(parsed) {
			return nil, errors.New("ALLOWED_ORIGINS is invalid")
		}
		if _, duplicate := seen[canonical]; duplicate {
			return nil, errors.New("ALLOWED_ORIGINS contains duplicates")
		}

		seen[canonical] = struct{}{}
		origins = append(origins, canonical)
	}

	if len(origins) == 0 {
		return nil, errors.New("ALLOWED_ORIGINS is required")
	}

	return origins, nil
}

func parseOrigin(value string) (*url.URL, string, error) {
	if strings.EqualFold(value, "null") || strings.Contains(value, "*") {
		return nil, "", errors.New("origin is invalid")
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return nil, "", errors.New("origin is invalid")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, "", errors.New("origin is invalid")
	}
	if parsed.Hostname() == "" || parsed.User != nil {
		return nil, "", errors.New("origin is invalid")
	}
	if parsed.Path != "" || parsed.RawPath != "" || parsed.RawQuery != "" || parsed.ForceQuery || parsed.Fragment != "" || parsed.RawFragment != "" {
		return nil, "", errors.New("origin is invalid")
	}
	if port := parsed.Port(); port != "" {
		parsedPort, err := strconv.Atoi(port)
		if err != nil || parsedPort < 1 || parsedPort > 65535 {
			return nil, "", errors.New("origin is invalid")
		}
	}

	return parsed, canonicalOrigin(parsed), nil
}

func canonicalOrigin(parsed *url.URL) string {
	scheme := strings.ToLower(parsed.Scheme)
	hostname := strings.ToLower(parsed.Hostname())
	port := parsed.Port()
	if (scheme == "http" && port == "80") || (scheme == "https" && port == "443") {
		port = ""
	}

	host := hostname
	if port != "" {
		host = net.JoinHostPort(hostname, port)
	} else if strings.Contains(hostname, ":") {
		host = "[" + hostname + "]"
	}

	return scheme + "://" + host
}

func isValidProductionOrigin(origin *url.URL) bool {
	if origin.Scheme != "https" {
		return false
	}

	hostname := strings.TrimSuffix(strings.ToLower(origin.Hostname()), ".")
	if hostname == "localhost" || strings.HasSuffix(hostname, ".localhost") {
		return false
	}
	if ip := net.ParseIP(hostname); ip != nil && ip.IsLoopback() {
		return false
	}

	return true
}
