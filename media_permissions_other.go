//go:build !linux || !webkit2_41

package main

// Windows and macOS use their platform webview and operating-system prompts.
func initializeNativeMedia(bool) {}

func configureSyntheticMediaPermission(bool) {}
