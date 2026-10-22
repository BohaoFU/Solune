package cn.suishi.calendar;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONException;
import org.json.JSONObject;

/** Fetches only public year schedules. Notes and other user content never leave the device. */
final class HolidayRepository {
    interface Listener { void changed(int year); }
    interface Fetcher { String fetch(int year) throws Exception; }
    private final SharedPreferences preferences;
    private final Listener listener;
    private final Fetcher fetcher;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Set<Integer> pending = new HashSet<>();
    private volatile boolean closed;

    HolidayRepository(Context context, Listener listener) {
        this(context.getSharedPreferences("holiday_cache", Context.MODE_PRIVATE), listener, HolidayRepository::download);
    }
    HolidayRepository(SharedPreferences preferences, Listener listener, Fetcher fetcher) {
        this.preferences = preferences; this.listener = listener; this.fetcher = fetcher;
    }
    synchronized String read(int year) {
        if (!validYear(year)) return "{}";
        JSONObject result;
        try { result = new JSONObject(preferences.getString("year_"+year, "{}")); }
        catch (JSONException ignored) { result = new JSONObject(); }
        try {
            result.put("year", year);
            result.put("state", pending.contains(year) ? "updating" : preferences.getString("state_"+year, "idle"));
        } catch (JSONException ignored) { }
        return result.toString();
    }
    synchronized boolean refresh(int year, boolean force) {
        if (closed || !validYear(year) || pending.contains(year)) return false;
        long age = System.currentTimeMillis() - preferences.getLong("attempt_"+year, 0);
        String state = preferences.getString("state_"+year, "idle");
        long interval = "ready".equals(state) ? 86400000L : "unpublished".equals(state) ? 21600000L : 1800000L;
        if (age >= 0 && age < (force ? 15000L : interval)) return false;
        pending.add(year);
        preferences.edit().putLong("attempt_"+year, System.currentTimeMillis()).apply();
        executor.execute(() -> {
            String outcome = "offline";
            try {
                JSONObject schedule = parse(year, fetcher.fetch(year));
                if (schedule == null) outcome = "unpublished";
                else {
                    schedule.put("updatedAt", System.currentTimeMillis());
                    if (!preferences.edit().putString("year_"+year, schedule.toString()).commit()) throw new IOException("Cache write failed");
                    outcome = "ready";
                }
            } catch (Exception ignored) { /* Preserve the last good cache on any failure. */ }
            synchronized (HolidayRepository.this) {
                if (closed) return;
                preferences.edit().putString("state_"+year, outcome).commit();
                pending.remove(year);
            }
            if (!closed) listener.changed(year);
        });
        return true;
    }
    static JSONObject parse(int year, String body) throws Exception {
        if (!validYear(year) || body == null || body.length() > 524288) throw new IOException("Invalid payload");
        JSONObject source = new JSONObject(body);
        if (source.getInt("code") != 0) throw new IOException("API error");
        JSONObject holiday = source.getJSONObject("holiday"), days = new JSONObject();
        if (holiday.length() > 366) throw new IOException("Too many dates");
        Iterator<String> keys = holiday.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            JSONObject entry = holiday.getJSONObject(key);
            String date = entry.getString("date"), name = entry.getString("name").trim();
            LocalDate parsed = LocalDate.parse(date);
            if (!date.equals(parsed.toString()) || parsed.getYear() != year || !key.equals(date.substring(5))
                    || name.isEmpty() || name.length() > 80 || !(entry.get("holiday") instanceof Boolean))
                throw new IOException("Invalid schedule entry");
            days.put(date, new JSONObject().put("name", name).put("isOffDay", entry.getBoolean("holiday")));
        }
        // An empty or partial future year must not erase a complete bundled/cached schedule.
        if (days.length() < 20) return null;
        return new JSONObject().put("year", year).put("days", days);
    }
    private static boolean validYear(int year) { return year >= 1901 && year <= 2100; }
    private static String download(int year) throws IOException {
        IOException failure = null;
        // Both are the provider's public domains; a CDN failure must not break offline use.
        for (String origin : new String[]{"https://timor.tech", "https://timor.cn"}) {
            try { return downloadUrl(origin+"/api/holiday/year/"+year+"/"); }
            catch (IOException error) { failure = error; }
        }
        throw failure;
    }
    private static String downloadUrl(String url) throws IOException {
        HttpsURLConnection connection = (HttpsURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(8000); connection.setReadTimeout(8000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "SuishiCalendar/1.2.0 Android");
        try {
            if (connection.getResponseCode() != 200) throw new IOException("HTTP error");
            String contentType = connection.getContentType();
            if (contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).contains("application/json"))
                throw new IOException("Expected JSON response");
            try (InputStream stream = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096]; int length;
                while ((length = stream.read(buffer)) != -1) {
                    if (output.size()+length > 524288) throw new IOException("Response too large");
                    output.write(buffer, 0, length);
                }
                return new String(output.toByteArray(), StandardCharsets.UTF_8);
            }
        } finally { connection.disconnect(); }
    }
    synchronized void close() {
        closed = true;
        // Leaving the app mid-request should allow a fresh attempt on the next launch.
        SharedPreferences.Editor edit = preferences.edit();
        for (int year : pending) edit.remove("attempt_"+year);
        edit.apply(); pending.clear(); executor.shutdownNow();
    }
}
