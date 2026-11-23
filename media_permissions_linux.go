//go:build linux && webkit2_41

package main

/*
#cgo pkg-config: gtk+-3.0 webkit2gtk-4.1
#include <gtk/gtk.h>
#include <webkit2/webkit2.h>
#include <string.h>

typedef struct { gboolean smoke; guint approved; } SplatMediaConsent;
static gint splat_mock_allowed = 1;
static void splat_set_mock_allowed(int allowed) { g_atomic_int_set(&splat_mock_allowed, allowed); }
static gboolean splat_media_origin(WebKitWebView *view) {
    const char *uri = webkit_web_view_get_uri(view);
    return uri && g_str_has_prefix(uri, "wails://wails/");
}
static gboolean splat_media_permission(WebKitWebView *view, WebKitPermissionRequest *request, gpointer data) {
    SplatMediaConsent *consent = data;
    if (!splat_media_origin(view)) { webkit_permission_request_deny(request); return TRUE; }
    if (WEBKIT_IS_DEVICE_INFO_PERMISSION_REQUEST(request)) {
        if (consent->approved) webkit_permission_request_allow(request);
        else webkit_permission_request_deny(request);
        return TRUE;
    }
    if (!WEBKIT_IS_USER_MEDIA_PERMISSION_REQUEST(request)) return FALSE;
    gboolean camera = FALSE, microphone = FALSE;
    g_object_get(request, "is-for-video-device", &camera, "is-for-audio-device", &microphone, NULL);
    if (!camera && !microphone) { webkit_permission_request_deny(request); return TRUE; }
    guint requested = (camera ? 1 : 0) | (microphone ? 2 : 0);
    // Only the explicit command-line smoke session uses WebKit's synthetic devices.
    // Production requests always receive a native, deny-by-default consent dialog.
    gboolean allowed = consent->smoke && g_atomic_int_get(&splat_mock_allowed);
    if (!consent->smoke) {
        g_object_ref(view); g_object_ref(request);
        GtkWidget *parent = gtk_widget_get_toplevel(GTK_WIDGET(view));
        const char *devices = camera && microphone ? "camera and microphone" : camera ? "camera" : "microphone";
        GtkWidget *dialog = gtk_message_dialog_new(GTK_IS_WINDOW(parent) ? GTK_WINDOW(parent) : NULL,
            GTK_DIALOG_MODAL | GTK_DIALOG_DESTROY_WITH_PARENT, GTK_MESSAGE_QUESTION, GTK_BUTTONS_NONE,
            "Allow access to your %s?", devices);
        gtk_window_set_title(GTK_WINDOW(dialog), "Recording permission");
        gtk_message_dialog_format_secondary_text(GTK_MESSAGE_DIALOG(dialog),
            "The recording tool will use these devices on this computer. Choose Don't allow to keep them off.");
        gtk_dialog_add_buttons(GTK_DIALOG(dialog), "Don't allow", GTK_RESPONSE_CANCEL, "Allow", GTK_RESPONSE_ACCEPT, NULL);
        g_object_ref_sink(dialog);
        gtk_dialog_set_default_response(GTK_DIALOG(dialog), GTK_RESPONSE_CANCEL);
        gint response = gtk_dialog_run(GTK_DIALOG(dialog));
        allowed = response == GTK_RESPONSE_ACCEPT && !gtk_widget_in_destruction(GTK_WIDGET(view)) && splat_media_origin(view);
        gtk_widget_destroy(dialog);
        g_object_unref(dialog);
        if (allowed) { consent->approved |= requested; webkit_permission_request_allow(request); }
        else webkit_permission_request_deny(request);
        g_object_unref(request); g_object_unref(view);
        return TRUE;
    }
    if (allowed) { consent->approved |= requested; webkit_permission_request_allow(request); }
    else webkit_permission_request_deny(request);
    return TRUE;
}
static void splat_attach_media(GtkWidget *widget, gpointer data) {
    if (WEBKIT_IS_WEB_VIEW(widget) && !g_object_get_data(G_OBJECT(widget), "splat-media-consent")) {
        SplatMediaConsent *consent = g_new0(SplatMediaConsent, 1);
        consent->smoke = GPOINTER_TO_INT(data);
        g_object_set_data_full(G_OBJECT(widget), "splat-media-consent", consent, g_free);
        WebKitSettings *settings = webkit_web_view_get_settings(WEBKIT_WEB_VIEW(widget));
        webkit_settings_set_enable_media_stream(settings, TRUE);
        if (consent->smoke) webkit_settings_set_enable_mock_capture_devices(settings, TRUE);
        g_signal_connect(widget, "permission-request", G_CALLBACK(splat_media_permission), consent);
    }
    if (GTK_IS_CONTAINER(widget)) gtk_container_foreach(GTK_CONTAINER(widget), splat_attach_media, data);
}
static gboolean splat_install_media(gpointer data) {
    GList *windows = gtk_window_list_toplevels();
    for (GList *item = windows; item; item = item->next) splat_attach_media(GTK_WIDGET(item->data), data);
    g_list_free(windows);
    return G_SOURCE_REMOVE;
}
static void splat_setup_media(int smoke) {
    // OnStartup runs on a Go goroutine; GTK/WebKit are touched only on their main loop.
    g_idle_add(splat_install_media, GINT_TO_POINTER(smoke));
}
*/
import "C"

func initializeNativeMedia(smoke bool) {
	value := 0
	if smoke {
		value = 1
	}
	C.splat_setup_media(C.int(value))
}

func configureSyntheticMediaPermission(allowed bool) {
	value := 0
	if allowed {
		value = 1
	}
	C.splat_set_mock_allowed(C.int(value))
}
