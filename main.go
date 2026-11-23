package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed frontend/index.html frontend/app.json frontend/tools.json frontend/LICENSE frontend/NOTICE.md frontend/source-manifest.json frontend/standalone-manifest.json all:frontend/assets all:frontend/desktop all:frontend/docs all:frontend/scripts all:frontend/vendor all:frontend/splatworks all:frontend/solutions/pdfsplat all:frontend/solutions/CipherSplat all:frontend/solutions/gifsplat all:frontend/solutions/qrsplat all:frontend/solutions/imagesplat all:frontend/solutions/fontsplat all:frontend/solutions/backdropsplat
var bundled embed.FS

var version = "1.0.0-rc.10"

func main() {
	serve := flag.Bool("serve", false, "serve the bundled tools in a browser on loopback (no native file APIs)")
	port := flag.Int("port", 0, "loopback port for --serve; 0 selects an available port")
	smoke := flag.String("smoke-test", "", "run the synthetic native smoke test and write results to this directory")
	flag.Parse()
	assets, err := fs.Sub(bundled, "frontend")
	if err != nil {
		log.Fatal(err)
	}
	info, err := loadDesktopInfo(assets)
	if err != nil {
		log.Fatal(err)
	}
	if *serve {
		listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *port))
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s %s\nhttp://%s\nPress Ctrl+C to close.\n", info.Name, version, listener.Addr())
		server := &http.Server{Handler: security(http.FileServer(http.FS(assets))), ReadHeaderTimeout: 10 * time.Second}
		log.Fatal(server.Serve(listener))
		return
	}
	app := NewApp(version)
	if *smoke != "" {
		app.smokeDir, err = filepath.Abs(*smoke)
		if err != nil {
			log.Fatal(err)
		}
		if err = os.MkdirAll(app.smokeDir, 0700); err != nil {
			log.Fatal(err)
		}
	}
	app.loadOnlinePreference(info.Slug)
	icon, _ := fs.ReadFile(assets, info.Icon)
	err = wails.Run(&options.App{
		Title: info.Name, Width: 1360, Height: 900, MinWidth: 800, MinHeight: 600,
		BackgroundColour: options.NewRGB(245, 247, 250),
		AssetServer:      &assetserver.Options{Assets: assets, Middleware: func(next http.Handler) http.Handler { return security(app.online.middleware(next)) }},
		OnStartup:        app.startup, OnShutdown: app.shutdown,
		OnBeforeClose: app.beforeClose,
		Bind:          []interface{}{app},
		Linux:         &linux.Options{Icon: icon, ProgramName: info.Slug, WebviewGpuPolicy: linux.WebviewGpuPolicyOnDemand},
		Mac:           &mac.Options{About: &mac.AboutInfo{Title: info.Name, Message: info.Description + "\nLocal tools by Miguel Guhlin\nAGPL-3.0-or-later", Icon: icon}},
	})
	if err != nil {
		log.Fatal(err)
	}
	if app.smokeFailed {
		os.Exit(1)
	}
}

func security(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// All processing assets are bundled. Explicit external links go through the
		// native shell; they never replace the privileged application document.
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self), geolocation=()")
		next.ServeHTTP(w, r)
	})
}
