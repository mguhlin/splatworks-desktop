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

func TestCoreBundleExcludesStandaloneMediaApps(t *testing.T) {
	data, err := bundled.ReadFile("frontend/app.json")
	if err != nil {
		t.Fatal(err)
	}
	var info DesktopInfo
	if err = json.Unmarshal(data, &info); err != nil {
		t.Fatal(err)
	}
	if info.ID != "desktop" {
		return
	}
	for _, path := range []string{
		"frontend/solutions/audiosplat/index.html",
		"frontend/solutions/videosplat/index.html",
	} {
		if file, err := bundled.Open(path); err == nil {
			file.Close()
			t.Errorf("core app unnecessarily embeds %s", path)
		}
	}
}
