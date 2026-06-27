package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandlerReturnsHealthStatus(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
	}

	var body response
	if err := json.NewDecoder(recorder.Body).Decode(&body); err != nil {
		t.Fatalf("decode response body: %v", err)
	}

	if body.Status != "ok" {
		t.Errorf("expected status ok, got %q", body.Status)
	}
	if body.Service != "hunin-backend" {
		t.Errorf("expected service hunin-backend, got %q", body.Service)
	}
}
