package transfer

import (
	"bytes"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBinaryChunksAndEmptyFiles(t *testing.T) {
	dir := t.TempDir()
	s := New()
	defer s.Close()
	data := bytes.Repeat([]byte{0, 255, 7, 128, 32}, 500000)
	id, err := s.BeginFile(filepath.Join(dir, "Résumé 日本語.bin"))
	if err != nil {
		t.Fatal(err)
	}
	for at := 0; at < len(data); at += ChunkSize {
		end := at + ChunkSize
		if end > len(data) {
			end = len(data)
		}
		if err = s.Append(id, "", base64.StdEncoding.EncodeToString(data[at:end]), at == 0); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = s.Commit(id); err != nil {
		t.Fatal(err)
	}
	out, _ := os.ReadFile(filepath.Join(dir, "Résumé 日本語.bin"))
	if !bytes.Equal(out, data) {
		t.Fatal("binary data changed")
	}
	id, _ = s.BeginFile(filepath.Join(dir, "empty"))
	if _, err = s.Commit(id); err != nil {
		t.Fatal(err)
	}
	info, _ := os.Stat(filepath.Join(dir, "empty"))
	if info.Size() != 0 {
		t.Fatal("empty file changed")
	}
}

func TestFailedWriteDoesNotReplaceOriginal(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "keep.pdf")
	os.WriteFile(target, []byte("original"), 0600)
	s := New()
	defer s.Close()
	id, _ := s.BeginFile(target)
	s.items[id].file.Close()
	if err := s.Append(id, "", "YQ==", false); err == nil {
		t.Fatal("failed write reported success")
	}
	s.Abort(id)
	out, _ := os.ReadFile(target)
	if string(out) != "original" {
		t.Fatal("failed write changed original")
	}
	if s.Active() != 0 {
		t.Fatal("failed session left active")
	}
}

func TestSymlinkCannotEscapeRestorationRoot(t *testing.T) {
	s := New()
	defer s.Close()
	id, _ := s.BeginFolder(t.TempDir())
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(s.items[id].temp, "escape")); err != nil {
		t.Skip("symlinks unavailable on this runner")
	}
	if err := s.Append(id, "escape/secret.txt", "YQ==", true); err == nil {
		t.Fatal("write escaped private staging root")
	}
	if _, err := os.Stat(filepath.Join(outside, "secret.txt")); !os.IsNotExist(err) {
		t.Fatal("outside file was created")
	}
}

func TestSaveSessionLimitAndUnexpectedPaths(t *testing.T) {
	s := New()
	defer s.Close()
	dir := t.TempDir()
	for n := 0; n < 8; n++ {
		if _, err := s.BeginFile(filepath.Join(dir, "dest")); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.BeginFile(filepath.Join(dir, "ninth")); err == nil {
		t.Fatal("unbounded save sessions")
	}
	if _, err := s.Commit("unknown"); err == nil {
		t.Fatal("unknown session committed")
	}
	s.Close()
	if s.Active() != 0 {
		t.Fatal("shutdown sessions remain")
	}
	id, _ := s.BeginFile(filepath.Join(dir, "normal"))
	if err := s.Append(id, "unexpected", "YQ==", true); err == nil {
		t.Fatal("unexpected path accepted")
	}
	for _, name := range []string{"CON.txt", "NUL", strings.Repeat("x", 500), "../../"} {
		if !SafeRelative(SafeName(name)) {
			t.Fatalf("unsafe default name: %s", name)
		}
	}
}

func TestSaveIsStagedAndReplacesOnlyOnCommit(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "lesson.pdf")
	os.WriteFile(target, []byte("original"), 0600)
	s := New()
	defer s.Close()
	id, err := s.BeginFile(target)
	if err != nil {
		t.Fatal(err)
	}
	for _, part := range []string{"new ", "PDF"} {
		if err = s.Append(id, "", base64.StdEncoding.EncodeToString([]byte(part)), false); err != nil {
			t.Fatal(err)
		}
	}
	before, _ := os.ReadFile(target)
	if string(before) != "original" {
		t.Fatal("source changed before commit")
	}
	if _, err = s.Commit(id); err != nil {
		t.Fatal(err)
	}
	after, _ := os.ReadFile(target)
	if string(after) != "new PDF" {
		t.Fatalf("wrong output: %s", after)
	}
}

func TestCancelPreservesExistingFileAndRemovesTemporaryOutput(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "source.pdf")
	os.WriteFile(target, []byte("keep"), 0600)
	s := New()
	id, _ := s.BeginFile(target)
	s.Append(id, "", "YQ==", false)
	s.Abort(id)
	entries, _ := os.ReadDir(dir)
	if len(entries) != 1 {
		t.Fatal("temporary file remains")
	}
	b, _ := os.ReadFile(target)
	if string(b) != "keep" {
		t.Fatal("cancel overwrote source")
	}
	if err := s.Append(id, "", "YQ==", false); err == nil {
		t.Fatal("expired token accepted")
	}
}

func TestFolderRestorationPreservesTreeAndRejectsUnsafeNames(t *testing.T) {
	s := New()
	defer s.Close()
	dir := t.TempDir()
	id, err := s.BeginFolder(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"../escape", "/absolute", "C:/escape", "a\\b", "a/../../b", "a//b", "a/./b", "a\x00b", "AUX.txt", "nested/COM1", "trail.", "trail ", "control\n"} {
		if err = s.Append(id, name, "YQ==", true); err == nil {
			t.Errorf("accepted %q", name)
		}
	}
	if err = s.Append(id, "folder/empty.txt", "", true); err != nil {
		t.Fatal(err)
	}
	if err = s.Append(id, "folder/note.txt", "aGVsbG8=", true); err != nil {
		t.Fatal(err)
	}
	if err = s.Append(id, "folder/note.txt", "IQ==", false); err != nil {
		t.Fatal(err)
	}
	if err = s.Append(id, "folder/note.txt", "YQ==", true); err == nil {
		t.Fatal("duplicate file accepted")
	}
	name, err := s.Commit(id)
	if err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(filepath.Join(dir, name, "folder", "note.txt"))
	if err != nil || string(b) != "hello!" {
		t.Fatalf("bad restore: %q %v", b, err)
	}
	if _, err = os.Stat(filepath.Join(dir, name, "folder", "empty.txt")); err != nil {
		t.Fatal(err)
	}
}

func TestChunkBoundsAndShutdownCleanup(t *testing.T) {
	s := New()
	dir := t.TempDir()
	id, _ := s.BeginFile(filepath.Join(dir, "out"))
	if err := s.Append(id, "", strings.Repeat("A", base64.StdEncoding.EncodedLen(ChunkSize)+1), false); err == nil {
		t.Fatal("oversized chunk accepted")
	}
	if err := s.Append(id, "", "!!!!", false); err == nil {
		t.Fatal("invalid base64 accepted")
	}
	s.Close()
	entries, _ := os.ReadDir(dir)
	if len(entries) != 0 {
		t.Fatal("plaintext temporary output remains after shutdown")
	}
}

func TestDirectoryCapability(t *testing.T) {
	s := New()
	defer s.Close()
	parent := t.TempDir()
	id, err := s.BeginFolder(parent)
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"../outside", "/absolute", "a/../b", "CON", "a\\b"} {
		if s.Directory(id, name) == nil {
			t.Fatalf("accepted %q", name)
		}
	}
	if err = s.Directory(id, "nested/empty"); err != nil {
		t.Fatal(err)
	}
	name, err := s.Commit(id)
	if err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(filepath.Join(parent, name, "nested", "empty"))
	if err != nil || !info.IsDir() {
		t.Fatalf("empty directory lost: %v", err)
	}
	if s.Directory(id, "late") == nil {
		t.Fatal("accepted consumed token")
	}
	file, err := s.BeginFile(filepath.Join(parent, "file"))
	if err != nil {
		t.Fatal(err)
	}
	if s.Directory(file, "dir") == nil {
		t.Fatal("file token granted directory access")
	}
	s.Abort(file)
	if s.Directory(file, "dir") == nil {
		t.Fatal("accepted aborted token")
	}
}
