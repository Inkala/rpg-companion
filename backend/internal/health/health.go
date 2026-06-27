package health

import (
	"encoding/json"
	"net/http"
)

type response struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(response{
			Status:  "ok",
			Service: "hunin-backend",
		})
	})
}
