package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRegisterRejectsOversizedRequestBody(t *testing.T) {
	handler := NewHandler(&Repository{}, PasswordConfig{}, SessionConfig{})
	request := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(`{
		"username":"valid-user",
		"email":"valid@example.com",
		"password":"`+strings.Repeat("a", 8192)+`"
	}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	handler.Register(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusRequestEntityTooLarge, recorder.Code, recorder.Body.String())
	}
}

func TestSignInRejectsOversizedRequestBody(t *testing.T) {
	handler := NewHandler(&Repository{}, PasswordConfig{}, SessionConfig{})
	request := httptest.NewRequest(http.MethodPost, "/auth/sessions", strings.NewReader(`{
		"usernameOrEmail":"",
		"password":"`+strings.Repeat("a", 8192)+`"
	}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	handler.SignIn(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusRequestEntityTooLarge, recorder.Code, recorder.Body.String())
	}
}
