package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// External requests pass through this revocable gate; the webview CSP stays self-only.
// Only the online preference is persisted, never request bodies or service credentials.
type onlineGate struct {
	mu         sync.Mutex
	enabled    bool
	ctx        context.Context
	cancel     context.CancelFunc
	client     *http.Client
	preference string
}

func newOnlineGate() *onlineGate {
	ctx, cancel := context.WithCancel(context.Background())
	transport := &http.Transport{Proxy: nil, DialContext: publicDial, ForceAttemptHTTP2: true, TLSHandshakeTimeout: 15 * time.Second, ResponseHeaderTimeout: 60 * time.Second}
	return &onlineGate{ctx: ctx, cancel: cancel, client: &http.Client{Transport: transport, Timeout: 5 * time.Minute, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) > 8 {
			return errors.New("too many redirects")
		}
		return validateRemoteURL(req.URL)
	}}}
}

var nonPublicRanges = []netip.Prefix{netip.MustParsePrefix("0.0.0.0/8"), netip.MustParsePrefix("100.64.0.0/10"), netip.MustParsePrefix("192.0.0.0/24"), netip.MustParsePrefix("192.0.2.0/24"), netip.MustParsePrefix("198.18.0.0/15"), netip.MustParsePrefix("198.51.100.0/24"), netip.MustParsePrefix("203.0.113.0/24"), netip.MustParsePrefix("240.0.0.0/4"), netip.MustParsePrefix("2001:db8::/32")}

func publicAddress(ip net.IP) bool {
	if !ip.IsGlobalUnicast() || ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
		return false
	}
	addr, ok := netip.AddrFromSlice(ip)
	if !ok {
		return false
	}
	for _, prefix := range nonPublicRanges {
		if prefix.Contains(addr.Unmap()) {
			return false
		}
	}
	return true
}
func publicDial(ctx context.Context, network, address string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, err
	}
	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	for _, ip := range ips {
		if !publicAddress(ip.IP) {
			return nil, errors.New("private network destinations are not permitted")
		}
	}
	dial := net.Dialer{Timeout: 20 * time.Second}
	for _, ip := range ips {
		connection, err := dial.DialContext(ctx, network, net.JoinHostPort(ip.IP.String(), port))
		if err == nil {
			return connection, nil
		}
	}
	return nil, errors.New("connection could not be established")
}
func validateRemoteURL(u *url.URL) error {
	if u == nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || (u.Port() != "" && u.Port() != "443") {
		return errors.New("only HTTPS destinations on port 443 are supported")
	}
	return nil
}
func (g *onlineGate) allowed() bool { g.mu.Lock(); defer g.mu.Unlock(); return g.enabled }
func (g *onlineGate) set(enabled bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if !enabled {
		g.cancel()
		g.ctx, g.cancel = context.WithCancel(context.Background())
	}
	g.enabled = enabled
}
func (g *onlineGate) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/desktop/remote" {
			next.ServeHTTP(w, r)
			return
		}
		g.mu.Lock()
		enabled, permission := g.enabled, g.ctx
		g.mu.Unlock()
		if !enabled {
			http.Error(w, "Optional online connections are off.", http.StatusForbidden)
			return
		}
		if r.Method != "GET" && r.Method != "HEAD" && r.Method != "POST" {
			http.Error(w, "Unsupported request method.", 405)
			return
		}
		target, err := url.Parse(r.URL.Query().Get("url"))
		if err != nil || validateRemoteURL(target) != nil {
			http.Error(w, "Choose a supported HTTPS URL.", 400)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
		defer cancel()
		stop := context.AfterFunc(permission, cancel)
		defer stop()
		body, err := io.ReadAll(io.LimitReader(r.Body, 4*1024*1024+1))
		if err != nil || len(body) > 4*1024*1024 {
			http.Error(w, "Request is too large.", 413)
			return
		}
		request, err := http.NewRequestWithContext(ctx, r.Method, target.String(), bytes.NewReader(body))
		if err != nil {
			http.Error(w, "Request could not be prepared.", 400)
			return
		}
		for _, name := range []string{"Content-Type", "Accept", "Range"} {
			if value := r.Header.Get(name); value != "" {
				request.Header.Set(name, value)
			}
		}
		response, err := g.client.Do(request)
		if err != nil {
			http.Error(w, "The optional online request could not be completed.", 502)
			return
		}
		defer response.Body.Close()
		if response.ContentLength > 300*1024*1024 {
			http.Error(w, "Download exceeds the 300 MB limit.", 413)
			return
		}
		for _, name := range []string{"Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"} {
			if value := response.Header.Get(name); value != "" {
				w.Header().Set(name, value)
			}
		}
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(response.StatusCode)
		_, _ = io.Copy(w, io.LimitReader(response.Body, 300*1024*1024))
	})
}
func (a *App) OnlineEnabled() bool { return a.online.allowed() }
func (a *App) SetOnlineEnabled(enabled bool) error {
	if !enabled {
		a.online.set(false)
	}
	if a.online.preference != "" {
		data, _ := json.Marshal(struct {
			OptionalOnline bool `json:"optionalOnline"`
		}{enabled})
		if err := os.MkdirAll(filepath.Dir(a.online.preference), 0700); err != nil {
			return errors.New("online preference could not be saved")
		}
		if err := os.WriteFile(a.online.preference, data, 0600); err != nil {
			return errors.New("online preference could not be saved")
		}
	}
	a.online.set(enabled)
	return nil
}
func (a *App) loadOnlinePreference(slug string) {
	if a.smokeDir != "" {
		return
	}
	base, err := os.UserConfigDir()
	if err != nil {
		return
	}
	a.online.preference = filepath.Join(base, "SplatWorks", slug, "preferences.json")
	if data, err := os.ReadFile(a.online.preference); err == nil {
		var p struct {
			OptionalOnline bool `json:"optionalOnline"`
		}
		if json.Unmarshal(data, &p) == nil {
			a.online.set(p.OptionalOnline)
		}
	}
}
