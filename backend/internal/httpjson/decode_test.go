package httpjson

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type testPayload struct {
	Name string `json:"name"`
}

func TestDecodeRejectsMissingMalformedOrUnsupportedContentType(t *testing.T) {
	tests := []struct {
		name        string
		contentType string
	}{
		{name: "missing"},
		{name: "malformed", contentType: `application/json; charset="utf-8`},
		{name: "unsupported", contentType: "text/plain"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"Mara"}`))
			request.Header.Set("Content-Type", tt.contentType)

			err := Decode(httptest.NewRecorder(), request, &testPayload{}, 1024)

			if !errors.Is(err, ErrUnsupportedMediaType) {
				t.Fatalf("expected unsupported media type error, got %v", err)
			}
		})
	}
}

func TestDecodeAcceptsApplicationJSONWithCharset(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"Mara"}`))
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	var payload testPayload

	err := Decode(httptest.NewRecorder(), request, &payload, 1024)

	if err != nil {
		t.Fatalf("expected valid JSON to decode, got %v", err)
	}
	if payload.Name != "Mara" {
		t.Fatalf("expected decoded name Mara, got %q", payload.Name)
	}
}

func TestDecodeRejectsBodyOverLimit(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"/",
		strings.NewReader(`{"name":"`+strings.Repeat("a", 64)+`"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	err := Decode(httptest.NewRecorder(), request, &testPayload{}, 32)

	if !errors.Is(err, ErrRequestBodyTooLarge) {
		t.Fatalf("expected request body too large error, got %v", err)
	}
}

func TestDecodeAcceptsBodyExactlyAtLimit(t *testing.T) {
	const maxBytes = 64
	body := `{"name":"` + strings.Repeat("a", maxBytes-len(`{"name":""}`)) + `"}`
	if len(body) != maxBytes {
		t.Fatalf("expected test body to be exactly %d bytes, got %d", maxBytes, len(body))
	}

	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	var payload testPayload

	err := Decode(httptest.NewRecorder(), request, &payload, maxBytes)

	if err != nil {
		t.Fatalf("expected body exactly at the limit to decode, got %v", err)
	}
}

func TestDecodeRejectsMalformedJSON(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":`))
	request.Header.Set("Content-Type", "application/json")

	err := Decode(httptest.NewRecorder(), request, &testPayload{}, 1024)

	if !errors.Is(err, ErrMalformedJSON) {
		t.Fatalf("expected malformed JSON error, got %v", err)
	}
}

func TestDecodeRejectsUnknownFields(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"/",
		strings.NewReader(`{"name":"Mara","ownerSubjectId":"client-controlled"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	err := Decode(httptest.NewRecorder(), request, &testPayload{}, 1024)

	if !errors.Is(err, ErrMalformedJSON) {
		t.Fatalf("expected malformed JSON error, got %v", err)
	}
}

func TestDecodeRejectsTrailingJSONValue(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"/",
		strings.NewReader(`{"name":"Mara"} {"name":"Vale"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	err := Decode(httptest.NewRecorder(), request, &testPayload{}, 1024)

	if !errors.Is(err, ErrMultipleJSONValues) {
		t.Fatalf("expected multiple JSON values error, got %v", err)
	}
}
