package main

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestOnlineGateDefaultsOffAndDoesNotForwardCredentials(t *testing.T) {
	gate := newOnlineGate()
	calls := 0
	gate.client = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.Header.Get("Authorization") != "" || r.Header.Get("Cookie") != "" {
			t.Error("credentials leaked")
		}
		return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(`{"ok":true}`))}, nil
	})}
	handler := gate.middleware(http.NotFoundHandler())
	request := httptest.NewRequest("GET", "/desktop/remote?url=https%3A%2F%2Fexample.org%2Fmodel", nil)
	request.Header.Set("Authorization", "secret")
	request.Header.Set("Cookie", "private=value")
	blocked := httptest.NewRecorder()
	handler.ServeHTTP(blocked, request)
	if blocked.Code != 403 || calls != 0 {
		t.Fatal("online request escaped the default-off gate")
	}
	gate.set(true)
	allowed := httptest.NewRecorder()
	handler.ServeHTTP(allowed, request)
	if allowed.Code != 200 || calls != 1 {
		t.Fatal("explicitly enabled request failed")
	}
	gate.set(false)
	blocked = httptest.NewRecorder()
	handler.ServeHTTP(blocked, request)
	if blocked.Code != 403 || calls != 1 {
		t.Fatal("disabled request reached the network")
	}
}
func TestRevokingOnlinePermissionCancelsInFlightRequest(t *testing.T) {
	gate := newOnlineGate()
	started := make(chan struct{})
	gate.client = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		close(started)
		<-r.Context().Done()
		return nil, r.Context().Err()
	})}
	gate.set(true)
	done := make(chan struct{})
	go func() {
		gate.middleware(http.NotFoundHandler()).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/desktop/remote?url=https%3A%2F%2Fexample.org%2Fmodel", nil))
		close(done)
	}()
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("request did not start")
	}
	gate.set(false)
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("revoked download continued")
	}
}
func TestRemoteRequestsRejectUnsafeSchemesPortsAndPrivateAddresses(t *testing.T) {
	gate := newOnlineGate()
	gate.set(true)
	for _, target := range []string{"http%3A%2F%2Fexample.org", "file%3A%2F%2F%2Fetc%2Fpasswd", "https%3A%2F%2Fuser%3Asecret%40example.org", "https%3A%2F%2Fexample.org%3A8000"} {
		w := httptest.NewRecorder()
		gate.middleware(http.NotFoundHandler()).ServeHTTP(w, httptest.NewRequest("GET", "/desktop/remote?url="+target, nil))
		if w.Code != 400 {
			t.Fatal("unsafe URL was accepted")
		}
	}
	for _, address := range []string{"127.0.0.1:443", "[::1]:443", "169.254.169.254:443", "192.168.1.1:443", "100.100.100.200:443", "198.18.0.1:443", "0.2.2.2:443", "[2001:db8::1]:443"} {
		if c, err := publicDial(context.Background(), "tcp", address); err == nil {
			c.Close()
			t.Fatal("private destination was accepted")
		}
	}
}
