package httpjson

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
)

var (
	ErrUnsupportedMediaType = errors.New("unsupported media type")
	ErrRequestBodyTooLarge  = errors.New("request body too large")
	ErrMalformedJSON        = errors.New("malformed JSON")
	ErrMultipleJSONValues   = errors.New("multiple JSON values")
)

func Decode(w http.ResponseWriter, r *http.Request, destination any, maxBytes int64) error {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		return ErrUnsupportedMediaType
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		if isRequestBodyTooLarge(err) {
			return ErrRequestBodyTooLarge
		}
		return ErrMalformedJSON
	}

	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		if isRequestBodyTooLarge(err) {
			return ErrRequestBodyTooLarge
		}
		return ErrMultipleJSONValues
	}

	return nil
}

func isRequestBodyTooLarge(err error) bool {
	var maxBytesError *http.MaxBytesError
	return errors.As(err, &maxBytesError)
}
