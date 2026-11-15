package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
)

type DesktopInfo struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Slug        string   `json:"slug"`
	Binary      string   `json:"binary"`
	Icon        string   `json:"icon"`
	Description string   `json:"description"`
	Smoke       string   `json:"smoke"`
	Help        []string `json:"help"`
}

func loadDesktopInfo(assets fs.FS) (DesktopInfo, error) {
	var info DesktopInfo
	data, err := fs.ReadFile(assets, "app.json")
	if err != nil {
		return info, err
	}
	if err = json.Unmarshal(data, &info); err != nil {
		return info, err
	}
	if info.ID == "" || info.Name == "" || info.Slug == "" || !fs.ValidPath(info.Icon) {
		return info, fmt.Errorf("invalid bundled application identity")
	}
	return info, nil
}
