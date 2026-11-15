package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/mguhlin/splatworks-desktop/internal/transfer"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx         context.Context
	version     string
	saves       *transfer.Store
	smokeDir    string
	smokeFailed bool
	smokeOnce   sync.Once
	closeMu     sync.Mutex
	ready       bool
	allowQuit   bool
}

func NewApp(v string) *App                 { return &App{version: v, saves: transfer.New()} }
func (a *App) startup(ctx context.Context) { a.ctx = ctx }
func (a *App) shutdown(context.Context)    { a.saves.Close() }
func (a *App) Version() string             { return a.version }
func (a *App) SmokeEnabled() bool          { return a.smokeDir != "" }

// Closing is mediated by the live workspace. No document contents or passwords
// are sent to Go to decide whether the user needs an unsaved-work warning.
func (a *App) Ready() { a.closeMu.Lock(); a.ready = true; a.closeMu.Unlock() }
func (a *App) beforeClose(ctx context.Context) bool {
	a.closeMu.Lock()
	allowed := a.allowQuit || !a.ready || a.smokeDir != ""
	a.closeMu.Unlock()
	if allowed {
		return false
	}
	runtime.EventsEmit(ctx, "desktop:close-requested")
	return true
}
func (a *App) QuitWhenSafe() error {
	if a.saves.Active() != 0 {
		return errors.New("wait for the current save to finish")
	}
	a.closeMu.Lock()
	a.allowQuit = true
	a.closeMu.Unlock()
	runtime.Quit(a.ctx)
	return nil
}

func (a *App) BeginSave(name string) (string, error) {
	name = transfer.SafeName(name)
	var dest string
	var err error
	if a.smokeDir != "" {
		dest = filepath.Join(a.smokeDir, name)
	} else {
		dest, err = runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{Title: "Save a local copy", DefaultFilename: name, CanCreateDirectories: true})
	}
	if err != nil {
		return "", errors.New("the save dialog could not be opened")
	}
	if dest == "" {
		return "", nil
	}
	return a.saves.BeginFile(dest)
}

func (a *App) BeginFolderRestore() (string, error) {
	var dest string
	var err error
	if a.smokeDir != "" {
		dest = a.smokeDir
	} else {
		dest, err = runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: "Choose where to create a new restored folder", CanCreateDirectories: true})
	}
	if err != nil {
		return "", errors.New("the folder dialog could not be opened")
	}
	if dest == "" {
		return "", nil
	}
	return a.saves.BeginFolder(dest)
}

func (a *App) AppendSave(id, name, data string, first bool) error {
	return a.saves.Append(id, name, data, first)
}
func (a *App) FinishSave(id string) (string, error) { return a.saves.Commit(id) }
func (a *App) CancelSave(id string)                 { a.saves.Abort(id) }
func (a *App) OpenExternal(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil {
		return errors.New("only HTTPS website links can open outside the app")
	}
	runtime.BrowserOpenURL(a.ctx, u.String())
	return nil
}
func (a *App) ToggleFullscreen() {
	if runtime.WindowIsFullscreen(a.ctx) {
		runtime.WindowUnfullscreen(a.ctx)
	} else {
		runtime.WindowFullscreen(a.ctx)
	}
}

// CompleteSmoke is enabled only by the explicit --smoke-test launch option. It
// exercises the same staging API with synthetic documents, without dialog input.
func (a *App) CompleteSmoke(report string) error {
	if a.smokeDir == "" {
		return errors.New("smoke test is disabled")
	}
	if len(report) > 100000 {
		return errors.New("invalid smoke report")
	}
	var result struct {
		Passed bool `json:"passed"`
	}
	if err := json.Unmarshal([]byte(report), &result); err != nil {
		return err
	}
	var outErr error
	a.smokeOnce.Do(func() {
		a.smokeFailed = !result.Passed
		outErr = os.WriteFile(filepath.Join(a.smokeDir, "native-smoke.json"), []byte(strings.TrimSpace(report)+"\n"), 0600)
		if outErr != nil {
			a.smokeFailed = true
		}
		runtime.Quit(a.ctx)
	})
	return outErr
}
