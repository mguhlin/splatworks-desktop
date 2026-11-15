// Package transfer stages explicit user saves without accepting arbitrary paths
// from web content. Tokens refer only to destinations chosen in a native dialog.
package transfer

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
)

const ChunkSize = 1024 * 1024

type pending struct {
	target string
	temp   string
	folder bool
	file   *os.File
}

type Store struct {
	mu    sync.Mutex
	items map[string]*pending
}

func New() *Store { return &Store{items: make(map[string]*pending)} }

func (s *Store) Active() int { s.mu.Lock(); defer s.mu.Unlock(); return len(s.items) }

func token() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func SafeName(name string) string {
	name = filepath.Base(strings.ReplaceAll(name, "\\", "/"))
	name = strings.Map(func(r rune) rune {
		if r < 32 || strings.ContainsRune(`<>:"/\|?*`, r) {
			return '_'
		}
		return r
	}, name)
	name = strings.Trim(name, ". ")
	if name == "" {
		return "document"
	}
	if len(name) > 200 {
		ext := filepath.Ext(name)
		if len(ext) > 20 {
			ext = ""
		}
		return "document" + ext
	}
	if !SafeRelative(name) {
		return "document"
	}
	return name
}

func SafeRelative(name string) bool {
	if name == "" || len(name) > 4096 || strings.ContainsAny(name, "\\\x00:") || strings.HasPrefix(name, "/") || path.Clean(name) != name {
		return false
	}
	for _, part := range strings.Split(name, "/") {
		if part == "" || part == "." || part == ".." || len(part) > 255 || strings.HasSuffix(part, ".") || strings.HasSuffix(part, " ") {
			return false
		}
		for _, r := range part {
			if r < 32 || strings.ContainsRune(`<>"|?*`, r) {
				return false
			}
		}
		base := strings.ToUpper(strings.SplitN(part, ".", 2)[0])
		if base == "CON" || base == "PRN" || base == "AUX" || base == "NUL" || (len(base) == 4 && (strings.HasPrefix(base, "COM") || strings.HasPrefix(base, "LPT")) && base[3] >= '0' && base[3] <= '9') {
			return false
		}
	}
	return true
}

func (s *Store) BeginFile(target string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.items) >= 8 {
		return "", errors.New("too many unfinished saves")
	}
	id, err := token()
	if err != nil {
		return "", err
	}
	file, err := os.CreateTemp(filepath.Dir(target), ".splatworks-save-*")
	if err != nil {
		return "", errors.New("could not create the selected output; check permissions and free space")
	}
	s.items[id] = &pending{target: target, temp: file.Name(), file: file}
	return id, nil
}

// BeginFolder stages a new directory in the user-selected parent. Commit never
// overlays an existing directory; restored files cannot overwrite existing data.
func (s *Store) BeginFolder(parent string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.items) >= 8 {
		return "", errors.New("too many unfinished saves")
	}
	id, err := token()
	if err != nil {
		return "", err
	}
	temp, err := os.MkdirTemp(parent, ".splatworks-restore-*")
	if err != nil {
		return "", errors.New("could not create the restoration directory")
	}
	s.items[id] = &pending{target: parent, temp: temp, folder: true}
	return id, nil
}

func (s *Store) Append(id, name, encoded string, first bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.items[id]
	if !ok {
		return errors.New("save session expired")
	}
	if len(encoded) > base64.StdEncoding.EncodedLen(ChunkSize) {
		return errors.New("save chunk is too large")
	}
	data, err := base64.StdEncoding.Strict().DecodeString(encoded)
	if err != nil {
		return errors.New("invalid save data")
	}
	if !p.folder {
		if p.file == nil {
			return errors.New("save has already been finalized")
		}
		if name != "" {
			return errors.New("unexpected file path")
		}
		_, err = p.file.Write(data)
		return err
	}
	if !SafeRelative(name) {
		return errors.New("unsafe or unsupported restoration path")
	}
	// os.Root keeps restoration inside the private staging tree even if a local
	// process introduces a symlink while files are being restored.
	root, err := os.OpenRoot(p.temp)
	if err != nil {
		return err
	}
	defer root.Close()
	dest := filepath.FromSlash(name)
	if err = root.MkdirAll(filepath.Dir(dest), 0700); err != nil {
		return err
	}
	flags := os.O_WRONLY | os.O_APPEND
	if first {
		flags = os.O_WRONLY | os.O_CREATE | os.O_EXCL
	}
	f, err := root.OpenFile(dest, flags, 0600)
	if err != nil {
		return errors.New("could not restore file; duplicate or conflicting paths are not allowed")
	}
	_, writeErr := f.Write(data)
	syncErr := f.Sync()
	closeErr := f.Close()
	if writeErr != nil {
		return writeErr
	}
	if syncErr != nil {
		return syncErr
	}
	return closeErr
}

func (s *Store) Commit(id string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.items[id]
	if !ok {
		return "", errors.New("save session expired")
	}
	if p.folder {
		// Reserve the destination atomically. Moving files from the private stage
		// into our own empty directory cannot replace somebody else's files.
		dest, err := os.MkdirTemp(p.target, "CipherSplat-restored-*")
		if err != nil {
			return "", err
		}
		entries, err := os.ReadDir(p.temp)
		if err != nil {
			os.Remove(dest)
			return "", err
		}
		for _, entry := range entries {
			if err = os.Rename(filepath.Join(p.temp, entry.Name()), filepath.Join(dest, entry.Name())); err != nil {
				os.RemoveAll(dest)
				return "", err
			}
		}
		os.Remove(p.temp)
		delete(s.items, id)
		return filepath.Base(dest), nil
	}
	if p.file == nil {
		return "", errors.New("save has already been finalized")
	}
	if err := p.file.Sync(); err != nil {
		return "", err
	}
	if err := p.file.Close(); err != nil {
		return "", err
	}
	p.file = nil
	if err := replace(p.temp, p.target); err != nil {
		return "", fmt.Errorf("could not complete save: %w", err)
	}
	delete(s.items, id)
	return filepath.Base(p.target), nil
}

func (s *Store) Abort(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p, ok := s.items[id]; ok {
		if p.file != nil {
			p.file.Close()
		}
		os.RemoveAll(p.temp)
		delete(s.items, id)
	}
}

func (s *Store) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, p := range s.items {
		if p.file != nil {
			p.file.Close()
		}
		os.RemoveAll(p.temp)
		delete(s.items, id)
	}
}
