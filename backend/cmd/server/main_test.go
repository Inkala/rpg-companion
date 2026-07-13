package main

import (
	"net/http"
	"testing"
	"time"
)

func TestNewHTTPServerConfiguresBoundedSettings(t *testing.T) {
	httpServer := newHTTPServer(":8080", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))

	if httpServer.Addr != ":8080" {
		t.Errorf("expected address :8080, got %q", httpServer.Addr)
	}
	if httpServer.ReadHeaderTimeout != 5*time.Second {
		t.Errorf("expected ReadHeaderTimeout 5s, got %s", httpServer.ReadHeaderTimeout)
	}
	if httpServer.ReadTimeout != 15*time.Second {
		t.Errorf("expected ReadTimeout 15s, got %s", httpServer.ReadTimeout)
	}
	if httpServer.WriteTimeout != 30*time.Second {
		t.Errorf("expected WriteTimeout 30s, got %s", httpServer.WriteTimeout)
	}
	if httpServer.IdleTimeout != 60*time.Second {
		t.Errorf("expected IdleTimeout 60s, got %s", httpServer.IdleTimeout)
	}
	if httpServer.MaxHeaderBytes != 32*1024 {
		t.Errorf("expected MaxHeaderBytes 32768, got %d", httpServer.MaxHeaderBytes)
	}
	if httpServer.Handler == nil {
		t.Error("expected configured HTTP handler")
	}
}
