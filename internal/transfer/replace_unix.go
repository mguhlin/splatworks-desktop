//go:build !windows

package transfer

import "os"

func replace(source, target string) error { return os.Rename(source, target) }
