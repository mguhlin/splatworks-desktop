FROM golang:1.27-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libgtk-3-dev libwebkit2gtk-4.1-dev build-essential pkg-config xvfb xauth dbus-x11 imagemagick ca-certificates curl python3 && rm -rf /var/lib/apt/lists/*
RUN go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.1
ENV WEBKIT_DISABLE_DMABUF_RENDERER=1
WORKDIR /workspace
