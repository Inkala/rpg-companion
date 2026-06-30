package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	AppEnv         string
	DatabaseURL    string
	AllowedOrigins []string
	CookieSecure   bool
}

func FromEnv() Config {
	appEnv := getEnv("APP_ENV", "local")

	return Config{
		Port:           getEnv("PORT", "8080"),
		AppEnv:         appEnv,
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		AllowedOrigins: splitCSV(getEnv("ALLOWED_ORIGINS", "http://localhost:5173")),
		CookieSecure:   appEnv == "production",
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func splitCSV(value string) []string {
	var values []string
	for _, item := range strings.Split(value, ",") {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}
