package main

import (
	"encoding/json"
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
	if !strings.Contains(response.Header().Get("Permissions-Policy"), "camera=(self)") {
		t.Fatal("camera capability not limited to the application origin")
	}
}

func TestRegisteredWorkspacesAreBundled(t *testing.T) {
	data, err := bundled.ReadFile("frontend/tools.json")
	if err != nil {
		t.Fatal(err)
	}
	var tools []struct {
		Path string `json:"path"`
	}
	if err = json.Unmarshal(data, &tools); err != nil {
		t.Fatal(err)
	}
	for _, tool := range tools {
		file, err := bundled.Open("frontend" + tool.Path + "index.html")
		if err != nil {
			t.Errorf("registered workspace missing: %s: %v", tool.Path, err)
		} else {
			file.Close()
		}
	}
}

func TestSyntheticMediaPolicyCannotChangeInProduction(t *testing.T) {
	app := NewApp("test")
	if err := app.SetSmokeMediaAllowed(true); err == nil {
		t.Fatal("production renderer changed native media permission policy")
	}
}
