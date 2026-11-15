package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestBundledOriginPolicy(t *testing.T) {
	response := httptest.NewRecorder()
	security(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("local tool")) })).ServeHTTP(response, httptest.NewRequest("GET", "/", nil))
	policy := response.Header().Get("Content-Security-Policy")
	for _, rule := range []string{"connect-src 'self'", "object-src 'none'", "base-uri 'none'", "script-src 'self' 'wasm-unsafe-eval'"} {
		if !strings.Contains(policy, rule) {
			t.Errorf("missing %s", rule)
		}
	}
	if strings.Contains(policy, "'unsafe-eval'") {
		t.Fatal("JavaScript evaluation enabled")
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("document responses may be cached")
	}
	if !strings.Contains(response.Header().Get("Permissions-Policy"), "microphone=()") {
		t.Fatal("unneeded microphone permission allowed")
	}
}
