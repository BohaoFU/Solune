package cn.suishi.calendar;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.ConsoleMessage;
import android.webkit.JsResult;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/** Offline assets on one HTTPS origin. Only bundled content reaches the notes bridge. */
public class MainActivity extends Activity {
    static final String ORIGIN = "https://appassets.androidplatform.net";
    static final String HOME = ORIGIN + "/calendar/index.html";
    private WebView webView;
    private FrameLayout root;
    private boolean dark;
    private float bottomInsetDp;
    private HolidayRepository holidays;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        holidays = new HolidayRepository(this, year -> runOnUiThread(() -> {
            if (webView != null) webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('suishi-holidays',{detail:{year:"+year+"}}))", null);
        }));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
        if (Build.VERSION.SDK_INT >= 29) getWindow().setNavigationBarContrastEnforced(false);
        dark = getPreferences(MODE_PRIVATE).getBoolean("dark", false);
        root = new FrameLayout(this);
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                android.graphics.Insets navigation = insets.getInsets(WindowInsets.Type.navigationBars());
                boolean keyboardVisible = insets.isVisible(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, keyboardVisible ? keyboard.bottom : 0);
                bottomInsetDp = keyboardVisible ? 0 : navigation.bottom / getResources().getDisplayMetrics().density;
            } else {
                int bottom = insets.getSystemWindowInsetBottom();
                int stableBottom = insets.getStableInsetBottom();
                boolean keyboardVisible = bottom > stableBottom + (80 * getResources().getDisplayMetrics().density);
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), keyboardVisible ? bottom : 0);
                bottomInsetDp = keyboardVisible ? 0 : stableBottom / getResources().getDisplayMetrics().density;
            }
            updateContentInsets();
            return insets;
        });
        createWebView();
        applySystemTheme(dark);
        if (state == null || webView.restoreState(state) == null) webView.loadUrl(HOME);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void createWebView() {
        webView = new WebView(this);
        webView.setId(View.generateViewId());
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        webView.addJavascriptInterface(new NotesStorage(), "SuishiStorage");
        webView.addJavascriptInterface(new HolidayBridge(), "SuishiHolidays");
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return localResponse(request.getUrl());
            }
            @Override public void onPageFinished(WebView view, String url) { updateContentInsets(); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri) && !uri.getPath().endsWith(".txt")) return false;
                if (isLocal(uri) && uri.getPath().endsWith("LICENSE-lunar.txt")) {
                    runOnUiThread(() -> showLicense());
                } else if ("https".equals(uri.getScheme()) && ("github.com".equals(uri.getHost()) || "timor.tech".equals(uri.getHost()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException e) { Toast.makeText(MainActivity.this, "未找到可用的浏览器", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                root.removeView(view);
                view.destroy();
                createWebView();
                webView.loadUrl(HOME);
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("岁时万年历").setMessage(message)
                        .setPositiveButton("好的", (d,w)->result.confirm())
                        .setOnCancelListener(d->result.cancel()).show();
                return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("删除记事").setMessage(message)
                        .setPositiveButton("删除", (d,w)->result.confirm())
                        .setNegativeButton("取消", (d,w)->result.cancel())
                        .setOnCancelListener(d->result.cancel()).show();
                return true;
            }
            @Override public void onReceivedTitle(WebView view, String title) {
                // The page title provides only a theme hint, not a JavaScript bridge.
                boolean nextDark = "岁时万年历 · 深色".equals(title);
                if (dark != nextDark) {
                    dark = nextDark;
                    getPreferences(MODE_PRIVATE).edit().putBoolean("dark", dark).apply();
                    applySystemTheme(dark);
                }
            }
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (BuildConfig.DEBUG) android.util.Log.d("SuishiCalendar", message.message());
                return true;
            }
        });
    }

    private boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getPath() != null
                && uri.getPath().startsWith("/calendar/");
    }

    private WebResourceResponse localResponse(Uri uri) {
        if (!isLocal(uri)) return response(403, "Forbidden", "text/plain", "离线应用不加载网络资源");
        String path = uri.getPath().substring(1);
        if (path.contains("..") || path.indexOf('\\') >= 0) return response(403, "Forbidden", "text/plain", "不可访问此路径");
        try {
            String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript"
                    : path.endsWith(".css") ? "text/css" : path.endsWith(".svg") ? "image/svg+xml"
                    : path.endsWith(".png") ? "image/png" : path.endsWith(".webmanifest") ? "application/manifest+json" : "text/plain";
            return new WebResourceResponse(mime, "UTF-8", 200, "OK", Collections.singletonMap("Cache-Control", "no-store"), getAssets().open(path));
        } catch (IOException e) { return response(404, "Not Found", "text/plain", "未找到资源"); }
    }

    private WebResourceResponse response(int code, String reason, String mime, String text) {
        return new WebResourceResponse(mime, "UTF-8", code, reason, Collections.emptyMap(),
                new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
    }

    private void showLicense() {
        try (InputStream stream = getAssets().open("calendar/vendor/LICENSE-lunar.txt")) {
            java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096]; int length;
            while ((length = stream.read(buffer)) != -1) output.write(buffer, 0, length);
            new AlertDialog.Builder(this).setTitle("开源许可 · lunar-javascript")
                    .setMessage(output.toString("UTF-8")).setPositiveButton("关闭", null).show();
        } catch (IOException ignored) { }
    }

    @SuppressWarnings("deprecation")
    private void applySystemTheme(boolean useDark) {
        int background = Color.parseColor(useDark ? "#232720" : "#F7F7F2");
        root.setBackgroundColor(background);
        webView.setBackgroundColor(background);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                int lightBars = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                controller.setSystemBarsAppearance(useDark ? 0 : lightBars, lightBars);
            }
        } else {
            int layoutFlags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
            getWindow().getDecorView().setSystemUiVisibility(layoutFlags | (useDark ? 0 :
                    View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR));
        }
    }

    private void updateContentInsets() {
        if (webView != null) webView.evaluateJavascript(
                "document.documentElement.style.setProperty('--android-bottom-inset','" + bottomInsetDp + "px')", null);
    }

    private void handleBack() {
        webView.evaluateJavascript("(function(){var dialogs=document.querySelectorAll('dialog[open]');if(dialogs.length){if(window.SuishiCloseTopDialog)SuishiCloseTopDialog();else dialogs[dialogs.length-1].close();return 'handled';}if(location.hash!=='#calendar'){document.querySelector('[data-view=calendar]').click();return 'handled';}return 'exit';})()",
                result -> { if ("\"exit\"".equals(result)) finish(); });
    }
    private final class HolidayBridge {
        @JavascriptInterface public String readYear(int year) { return holidays.read(year); }
        @JavascriptInterface public boolean refresh(int year, boolean force) { return holidays.refresh(year, force); }
    }
    /** Synchronous disk commit ensures that a successful save survives process death. */
    private final class NotesStorage {
        @JavascriptInterface public String readNotes() {
            return getSharedPreferences("calendar_notes", MODE_PRIVATE).getString("notes", "[]");
        }
        @JavascriptInterface public boolean writeNotes(String json) {
            if (json == null || json.length() > 5 * 1024 * 1024) return false;
            try {
                org.json.JSONArray array = new org.json.JSONArray(json);
                if (array.length() > 10000) return false;
                for (int i = 0; i < array.length(); i++) {
                    org.json.JSONObject note = array.getJSONObject(i);
                    if (note.getString("id").length() > 128 || note.getString("title").length() > 50
                            || note.getString("body").length() > 500
                            || !note.getString("date").matches("\\d{4}-\\d{2}-\\d{2}")) return false;
                }
                return getSharedPreferences("calendar_notes", MODE_PRIVATE).edit().putString("notes", json).commit();
            } catch (org.json.JSONException exception) { return false; }
        }
    }
    @SuppressWarnings("deprecation") @Override public void onBackPressed() { handleBack(); }
    @Override protected void onSaveInstanceState(Bundle outState) { webView.saveState(outState); super.onSaveInstanceState(outState); }
    @Override protected void onPause() { webView.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if(webView!=null) webView.onResume(); }
    @Override protected void onDestroy() { if(holidays!=null)holidays.close();if(webView!=null){root.removeView(webView);webView.destroy();webView=null;}super.onDestroy(); }
    WebView getCalendarWebView() { return webView; }
}
