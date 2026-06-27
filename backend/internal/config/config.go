package config

import "os"

type Config struct {
	Port   string
	AppEnv string
}

func FromEnv() Config {
	return Config{
		Port:   getEnv("PORT", "8080"),
		AppEnv: getEnv("APP_ENV", "local"),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
