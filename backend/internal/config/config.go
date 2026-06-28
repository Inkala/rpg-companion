package config

import "os"

type Config struct {
	Port        string
	AppEnv      string
	DatabaseURL string
}

func FromEnv() Config {
	return Config{
		Port:        getEnv("PORT", "8080"),
		AppEnv:      getEnv("APP_ENV", "local"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
