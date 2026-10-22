package cn.suishi.calendar;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.SystemClock;
import android.webkit.WebView;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.view.MotionEvent;
import android.view.InputDevice;
import android.view.View;
import java.io.File;
import java.io.FileOutputStream;
import org.json.JSONArray;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Device integration checks for the bundled offline WebView, run without libraries. */
public final class CalendarSmokeTest extends Instrumentation {
    private MainActivity activity;
    private int passed;
    private String stage = "full";
    private static final int TOTAL = 37;

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        if (arguments != null) stage = arguments.getString("stage", "full");
        start();
    }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            if (stage.equals("network")) getTargetContext().getSharedPreferences("holiday_cache",Activity.MODE_PRIVATE).edit().putLong("attempt_2026",0).commit();
            Intent launch = new Intent(Intent.ACTION_MAIN).setClassName(getTargetContext(), MainActivity.class.getName())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            activity = (MainActivity) startActivitySync(launch);
            await("document.querySelectorAll('.day-cell[data-date]').length===42");
            if (!stage.equals("write-persistence")) await("window.SuishiCloseTopDialog!==undefined");
            if (stage.equals("network-diagnostic")) {
                StringBuilder diagnostic=new StringBuilder(evaluate("SuishiHolidays.readYear(2026)"));
                for(String host:new String[]{"timor.tech","timor.cn"}) {
                    javax.net.ssl.HttpsURLConnection connection=null;
                    try {
                        connection=(javax.net.ssl.HttpsURLConnection)new java.net.URL("https://"+host+"/api/holiday/year/2026/").openConnection();
                        connection.setConnectTimeout(5000);connection.setReadTimeout(5000);
                        connection.setRequestProperty("User-Agent","SuishiCalendar/1.2.0 Android");
                        diagnostic.append("\n").append(host).append(" HTTP ").append(connection.getResponseCode()).append(" ").append(connection.getContentType());
                    }catch(Exception error){diagnostic.append("\n").append(host).append(" ").append(error.toString());}
                    finally {if(connection!=null)connection.disconnect();}
                }
                result.putString("stream",diagnostic.toString()+"\n");finish(Activity.RESULT_OK,result);return;
            }
            if (stage.equals("repository")) {
                result.putString("stream",HolidayRepositoryChecks.run(getTargetContext(),getContext()));
                finish(Activity.RESULT_OK,result);return;
            }
            if (stage.equals("cached-offline")) {
                check("saved_api_survives_offline_restart", "var saved=JSON.parse(SuishiHolidays.readYear(2026));Object.keys(saved.days||{}).length===39&&saved.updatedAt>0");
                check("cached_api_overrides_bundled_labels", "selectDate('2026-10-10',true);document.querySelector('.holiday-detail').textContent.includes('后补班')");
                result.putString("stream","OK: downloaded schedule read after offline process restart\n");finish(Activity.RESULT_OK,result);return;
            }
            if (stage.equals("keyboard")) {
                evaluate("selectDate('2026-10-19',true);openNote();window.__heightBeforeIme=innerHeight;true");
                tapElement("#note-title");
                await("innerHeight<window.__heightBeforeIme-100");
                check("note_keyboard_focus", "document.activeElement.id==='note-title'");
                evaluate("document.querySelector('#note-title').value='keyboard-integration';document.querySelector('#note-form button[type=submit]').scrollIntoView({block:'center'});true");
                waitForWebPaint();
                check("save_button_reachable_with_keyboard", "var rect=document.querySelector('#note-form button[type=submit]').getBoundingClientRect();rect.top>=0&&rect.bottom<=innerHeight+1");
                tapElement("#note-form button[type=submit]");
                await("!document.querySelector('#note-dialog').open");
                check("note_saved_with_keyboard", "notes.some(n=>n.title==='keyboard-integration')");
                evaluate("saveNotes(notes.filter(n=>n.title!=='keyboard-integration'));true");
                result.putString("stream","OK: keyboard, form scrolling and real touch save\n");finish(Activity.RESULT_OK,result);return;
            }
            if (stage.equals("network")) {
                evaluate("selectDate('2026-10-10',true);true");
                long end=SystemClock.elapsedRealtime()+50000;
                while(SystemClock.elapsedRealtime()<end&&!"true".equals(evaluate("JSON.parse(SuishiHolidays.readYear(2026)).state==='ready'")))SystemClock.sleep(200);
                check("live_api_cached", "var live=JSON.parse(SuishiHolidays.readYear(2026));live.state==='ready'&&Object.keys(live.days||{}).length===39");
                check("live_api_calendar_marks", "document.querySelector('#holiday-coverage').textContent.includes('已更新')&&document.querySelector('[data-date=\"2026-10-10\"] .holiday-badge').textContent==='班'");
                result.putString("stream","OK: live HTTPS API and rendered cache\n");finish(Activity.RESULT_OK,result);return;
            }
            if (stage.startsWith("preview-")) {
                await("document.querySelector('#month-picker-trigger')!==null");
                String[] previews = stage.equals("preview-all") ? new String[]{"main","date","lunar","note","delete","help","license","dark-date"}
                        : new String[]{stage.substring("preview-".length())};
                for (String preview : previews) {
                    evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(document.body.classList.contains('dark'))document.querySelector('#theme-btn').click();selectDate('2026-10-19',true);document.querySelector('#solar-date').value='2026-10-19';window.scrollTo(0,0);true");
                    if (preview.equals("picker")) evaluate("document.querySelector('#month-picker-trigger').click();true");
                    if (preview.equals("year")) evaluate("document.querySelector('#year-picker-trigger').click();true");
                    if (preview.equals("dark")) evaluate("document.querySelector('#theme-btn').click();true");
                    if (preview.equals("date")||preview.equals("dark-date")) evaluate((preview.equals("dark-date")?"document.querySelector('#theme-btn').click();":"")+"setView('convert');document.querySelector('#solar-date-trigger').click();true");
                    if (preview.equals("lunar")) evaluate("setView('convert');document.querySelector('[data-mode=lunar]').click();document.querySelector('#lunar-year').value='2025';document.querySelector('#lunar-year').dispatchEvent(new Event('change'));document.querySelector('#lunar-month-trigger').click();true");
                    if (preview.equals("note")) evaluate("openNote();true");
                    if (preview.equals("delete")) evaluate("requestDeleteNote({id:'preview-only',title:'记得回家吃饭',date:'2026-10-19'});true");
                    if (preview.equals("help")||preview.equals("license")) evaluate("document.querySelector('#help-btn').click();"+(preview.equals("license")?"document.querySelector('#license-trigger').click();":"")+"true");
                    waitForIdleSync(); SystemClock.sleep(500);
                    waitForWebPaint();
                    Bundle visual = new Bundle();
                    visual.putString("stream",preview+": "+evaluate("JSON.stringify({body:document.body.className,ink:getComputedStyle(document.body).color,button:getComputedStyle(document.querySelector('[data-date=\\\"2026-10-20\\\"]')).color,rest:getComputedStyle(document.querySelector('[data-date=\\\"2026-10-01\\\"]')).backgroundColor,sheet:getComputedStyle(document.querySelector('#month-picker-dialog')).backgroundColor,opacity:getComputedStyle(document.querySelector('#month-picker-dialog')).opacity})")+"\n");
                    sendStatus(2,visual);
                    Bundle bounds=new Bundle();bounds.putString("stream",preview+" modal bounds: "+evaluate("JSON.stringify({height:innerHeight,visual:visualViewport.height,dialogs:Array.from(document.querySelectorAll('dialog[open]')).map(d=>({id:d.id,top:d.getBoundingClientRect().top,bottom:d.getBoundingClientRect().bottom,scroll:d.scrollTop,client:d.clientHeight,total:d.scrollHeight,color:getComputedStyle(d).backgroundColor}))})")+"\n");sendStatus(2,bounds);
                    File image = new File(getTargetContext().getExternalFilesDir(null), "preview-"+preview+".png");
                    Bitmap screenshot = getUiAutomation().takeScreenshot();
                    try (FileOutputStream output = new FileOutputStream(image)) { screenshot.compress(Bitmap.CompressFormat.PNG,100,output); }
                    screenshot.recycle();
                }
                result.putString("stream", "Preview screenshots saved to app external files\n");
                finish(Activity.RESULT_OK,result); return;
            }
            if ("write-persistence".equals(stage)) {
                check("write_before_cold_start", "selectDate('2026-10-19',true);document.querySelector('#add-day-note').click();document.querySelector('#note-title').value='suishi-cold-start-check';document.querySelector('#note-form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('#day-detail').textContent.includes('suishi-cold-start-check')");
                runOnMainSync(() -> activity.finish());
                waitForIdleSync();
                result.putString("stream", "OK: persistence record saved before process stop\n");
                finish(Activity.RESULT_OK, result); return;
            }
            if ("read-persistence".equals(stage)) {
                check("note_survives_process_restart", "setView('notes');document.querySelector('#notes-list').textContent.includes('suishi-cold-start-check')");
                evaluate("saveNotes(notes.filter(n=>n.title!=='suishi-cold-start-check'));setView('calendar');true");
                result.putString("stream", "OK: note retained after process restart and test data cleaned\n");
                finish(Activity.RESULT_OK, result); return;
            }
            check("offline_launch", "document.querySelectorAll('.day-cell[data-date]').length===42");
            if (getTargetContext().checkSelfPermission("android.permission.INTERNET") != PackageManager.PERMISSION_GRANTED)
                throw new AssertionError("Missing INTERNET permission");
            check("bundled_date_data", "selectDate('2026-10-19');document.querySelector('.detail-lunar').textContent==='九月初十'");
            check("month_navigation", "document.querySelector('#next-month').click();document.querySelector('.day-top-date').textContent.includes('2026年11月')");
            check("solar_to_lunar", "setView('convert');document.querySelector('#solar-date').value='2026-02-17';document.querySelector('#convert-form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('#convert-result').textContent.includes('正月初一')");
            check("leap_month_conversion", "document.querySelector('[data-mode=lunar]').click();document.querySelector('#lunar-year').value='2025';document.querySelector('#lunar-year').dispatchEvent(new Event('change'));document.querySelector('#lunar-month').value='-6';document.querySelector('#lunar-month').dispatchEvent(new Event('change'));document.querySelector('#lunar-day').value='1';document.querySelector('#convert-form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('#convert-result').textContent.includes('2025-07-25')");
            check("note_write", "selectDate('2026-10-19',true);document.querySelector('#add-day-note').click();document.querySelector('#note-title').value='suishi-android-integration-test';document.querySelector('#note-body').value='offline persistence';document.querySelector('#note-form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('#day-detail').textContent.includes('suishi-android-integration-test')");
            evaluate("document.documentElement.dataset.reloadSentinel='old-document';true");
            runOnMainSync(() -> activity.getCalendarWebView().reload());
            await("document.documentElement.dataset.reloadSentinel!=='old-document'&&document.querySelectorAll('.day-cell[data-date]').length===42");
            check("note_survives_reload", "setView('notes');document.querySelector('#notes-list').textContent.includes('suishi-android-integration-test')");
            evaluate("if(document.body.classList.contains('dark'))document.querySelector('#theme-btn').click();true");
            check("theme_and_layout", "document.querySelector('#theme-btn').click();document.body.classList.contains('dark')&&document.documentElement.scrollWidth<=document.documentElement.clientWidth");
            evaluate("document.querySelector('#theme-btn').click();saveNotes(notes.filter(n=>n.title!=='suishi-android-integration-test'));setView('calendar');document.querySelector('#jump-btn').click();true");
            runOnMainSync(() -> activity.onBackPressed());
            await("!document.querySelector('dialog[open]')");
            check("android_back_closes_dialog", "!document.querySelector('dialog[open]')");
            check("custom_month_sheet", "selectDate('2026-10-19',true);document.querySelector('#month-picker-trigger').click();var open=document.querySelector('#month-picker-dialog').open;document.querySelector('[data-pick-month=\"1\"]').click();document.querySelector('#picker-confirm').click();open&&document.querySelector('#month-select').value==='1'&&!document.querySelector('#month-picker-dialog').open");
            check("custom_year_grid", "selectDate('2026-10-19',true);document.querySelector('#year-picker-trigger').click();document.querySelector('[data-pick-year=\"2027\"]').click();document.querySelector('[data-pick-month=\"2\"]').click();document.querySelector('#picker-confirm').click();document.querySelector('#year-select').value==='2027'&&document.querySelector('#month-select').value==='2'");
            check("national_holiday_marks", "selectDate('2026-10-01',true);Array.from({length:7},(_,i)=>document.querySelector('[data-date=\"2026-10-0'+(i+1)+'\"] .holiday-badge')?.textContent).every(x=>x==='休')");
            check("adjusted_workday_mark", "selectDate('2026-10-10',true);document.querySelector('[data-date=\"2026-10-10\"]').classList.contains('is-workday')&&document.querySelector('[data-date=\"2026-10-10\"] .holiday-badge').textContent==='班'&&document.querySelector('.holiday-detail').textContent.includes('调休上班')");
            check("spring_festival_nine_days", "selectDate('2026-02-17',true);Array.from({length:9},(_,i)=>document.querySelector('[data-date=\"2026-02-'+(15+i)+'\"] .holiday-badge')?.textContent).every(x=>x==='休')&&document.querySelector('[data-date=\"2026-02-14\"] .holiday-badge').textContent==='班'&&document.querySelector('[data-date=\"2026-02-28\"] .holiday-badge').textContent==='班'");
            check("unknown_year_not_invented", "selectDate('2027-01-01',true);!document.querySelector('[data-date^=\"2027-\"] .holiday-badge')");
            evaluate("selectDate('2026-10-19',true);true");
            swipe(-1,false);
            check("swipe_left_next_month", "document.querySelector('#year-select').value==='2026'&&document.querySelector('#month-select').value==='11'&&document.querySelector('.day-cell.selected').dataset.date==='2026-11-19'");
            swipe(1,false);
            check("swipe_right_previous_month", "document.querySelector('#month-select').value==='10'&&document.querySelector('.day-cell.selected').dataset.date==='2026-10-19'");
            swipe(-1,true);
            check("vertical_scroll_not_a_month_swipe", "document.querySelector('#month-select').value==='10'");
            evaluate("selectDate('2026-12-19',true);true");
            swipe(-1,false);
            check("swipe_across_year", "document.querySelector('#year-select').value==='2027'&&document.querySelector('#month-select').value==='1'");
            evaluate("selectDate('1901-01-01',true);true");
            swipe(1,false);
            check("swipe_lower_boundary", "document.querySelector('#year-select').value==='1901'&&document.querySelector('#month-select').value==='1'");
            evaluate("selectDate('2100-12-19',true);true");
            swipe(-1,false);
            check("swipe_upper_boundary", "document.querySelector('#year-select').value==='2100'&&document.querySelector('#month-select').value==='12'");
            evaluate("selectDate('2026-10-19',true);window.scrollTo(0,0);true");
            await("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--android-bottom-inset'))>0");
            check("bottom_navigation_safe_area", "Math.abs(document.querySelector('.sidebar').getBoundingClientRect().bottom-innerHeight)<2&&parseFloat(getComputedStyle(document.querySelector('.sidebar')).paddingBottom)>0");
            runOnMainSync(()->{
                if (((View)activity.getCalendarWebView().getParent()).getPaddingBottom()!=0) throw new AssertionError("Native bottom gap remains");
                if (activity.getWindow().getNavigationBarColor()!=Color.TRANSPARENT) throw new AssertionError("Navigation bar is opaque");
            });
            check("dark_immersive_navigation", "document.querySelector('#theme-btn').click();document.body.classList.contains('dark')&&Math.abs(document.querySelector('.sidebar').getBoundingClientRect().bottom-innerHeight)<2");
            evaluate("document.querySelector('#theme-btn').click();document.querySelector('#month-picker-trigger').click();true");
            runOnMainSync(()->activity.onBackPressed());
            await("!document.querySelector('#month-picker-dialog').open&&!document.body.classList.contains('month-sheet-open')");
            check("android_back_closes_month_sheet", "!document.querySelector('#month-picker-dialog').open");
            check("all_native_lists_replaced", "Array.from(document.querySelectorAll('select')).every(e=>e.hidden)&&!document.querySelector('input[type=date]')");
            check("festival_year_grid", "setView('festivals');document.querySelector('#festival-year-trigger').click();var styled=getComputedStyle(document.querySelector('#option-grid')).display==='grid';document.querySelector('#option-next').click();document.querySelector('[data-option-index=\"132\"]').click();document.querySelector('#option-confirm').click();styled&&document.querySelector('#festival-year').value==='2033'&&document.querySelector('#festival-year-trigger').textContent.includes('2033')");
            check("custom_lunar_leap_selection", "setView('convert');document.querySelector('[data-mode=lunar]').click();document.querySelector('#lunar-year-trigger').click();document.querySelector('[data-option-index=\"125\"]').click();document.querySelector('#option-confirm').click();document.querySelector('#lunar-month-trigger').click();var leap=Array.from(document.querySelectorAll('#option-grid button')).find(e=>e.textContent.includes('闰六'));leap.click();document.querySelector('#option-confirm').click();document.querySelector('#lunar-day-trigger').click();document.querySelector('[data-option-index=\"0\"]').click();document.querySelector('#option-confirm').click();document.querySelector('#convert-form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('#convert-result').textContent.includes('2025-07-25')");
            check("custom_date_picker_jump", "selectDate('2026-10-19',true);document.querySelector('#jump-btn').click();document.querySelector('#jump-date-trigger').click();document.querySelector('[data-choose-date=\"2026-10-20\"]').click();document.querySelector('#day-picker-confirm').click();document.querySelector('#date-form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('.day-cell.selected').dataset.date==='2026-10-20'");
            check("date_picker_cancel_preserves_value", "setView('convert');document.querySelector('#solar-date').value='2024-02-29';document.querySelector('#solar-date-trigger').click();document.querySelector('#day-next-month').click();document.querySelector('[data-close=day-picker-dialog]').click();document.querySelector('#solar-date').value==='2024-02-29'");
            check("date_picker_leap_day_clamp", "document.querySelector('#solar-date-trigger').click();document.querySelector('#day-year-mode').click();document.querySelector('[data-option-index=\"124\"]').click();document.querySelector('#option-confirm').click();document.querySelector('#day-picker-confirm').click();document.querySelector('#solar-date').value==='2025-02-28'");
            evaluate("selectDate('2026-10-19',true);openNote();document.querySelector('#note-date-trigger').click();document.querySelector('#day-year-mode').click();true");
            runOnMainSync(()->activity.onBackPressed());
            await("!document.querySelector('#option-dialog').open");
            check("back_closes_top_nested_sheet", "document.querySelector('#note-dialog').open&&document.querySelector('#day-picker-dialog').open&&document.body.classList.contains('has-sheet')");
            runOnMainSync(()->activity.onBackPressed());
            await("!document.querySelector('#day-picker-dialog').open");
            check("back_returns_to_note_sheet", "document.querySelector('#note-dialog').open&&document.body.classList.contains('has-sheet')");
            evaluate("document.querySelector('#note-dialog').close();saveNotes([...notes,{id:'delete-integration',date:'2026-10-19',title:'Test delete confirmation',body:''}]);setView('notes');true");
            check("delete_cancel_preserves_note", "document.querySelector('[data-delete-note=\"delete-integration\"]').click();var custom=document.querySelector('#delete-dialog').open;document.querySelector('[data-close=delete-dialog]:not(.sheet-close)').click();custom&&notes.some(n=>n.id==='delete-integration')");
            check("delete_confirmation_removes_note", "document.querySelector('[data-delete-note=\"delete-integration\"]').click();document.querySelector('#delete-confirm').click();!notes.some(n=>n.id==='delete-integration')&&!document.querySelector('#delete-dialog').open");
            check("help_cards_and_sync", "document.querySelector('#help-btn').click();document.querySelectorAll('#help-dialog .guide-grid article').length===3&&document.querySelector('#holiday-sync-status').textContent.includes('2026')&&document.querySelector('#holiday-sync-button')!==null");
            evaluate("document.querySelector('#license-trigger').click();true");
            await("document.querySelector('#license-content').textContent.includes('MIT')");
            check("styled_license_sheet", "document.querySelector('#license-dialog').open&&getComputedStyle(document.querySelector('#license-content')).whiteSpace==='pre-wrap'");
            evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(!document.body.classList.contains('dark'))document.querySelector('#theme-btn').click();openNote();true");
            check("dark_sheet_layout", "getComputedStyle(document.querySelector('#note-dialog')).backgroundColor==='rgb(43, 48, 39)'&&document.querySelector('#note-dialog').scrollWidth<=document.querySelector('#note-dialog').clientWidth+1");
            evaluate("document.querySelector('#note-dialog').close();document.querySelector('#theme-btn').click();setView('calendar');true");
            result.putString("stream", "\nOK (" + passed + " checks); offline calendar with cached HTTPS holiday updates.\n");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            result.putString("stream", "\nFAIL after " + passed + " checks: " + error + "\n");
            finish(Activity.RESULT_CANCELED, result);
        }
    }
    private void check(String name, String script) throws Exception {
        Bundle status = new Bundle();
        status.putString("class", getClass().getName()); status.putString("test", name);
        status.putInt("numtests", stage.equals("full")?TOTAL:1); status.putInt("current", passed+1);
        sendStatus(1, status);
        String actual = evaluate(script);
        if (!"true".equals(actual)) throw new AssertionError(name + " failed, returned: " + actual
                + "; selected=" + evaluate("document.querySelector('.day-cell.selected')?.dataset.date")
                + "; touch=" + evaluate("JSON.stringify(window.__swipeTrace||[])"));
        passed++;
        status.putString("stream", "PASS " + name + "\n"); sendStatus(0, status);
    }
    private void swipe(int direction, boolean vertical) throws Exception {
        evaluate("window.scrollTo(0,0);true");
        evaluate("window.__swipeTrace=[];if(!window.__hasSwipeTrace){window.__hasSwipeTrace=true;['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'].forEach(t=>document.querySelector('#calendar-grid').addEventListener(t,e=>window.__swipeTrace.push([t,e.target.className,e.clientX,e.clientY,e.button,e.isPrimary]),true));}true");
        SystemClock.sleep(150);
        JSONArray bounds = new JSONArray(evaluate("(function(){var r=document.querySelector('#calendar-grid').getBoundingClientRect();return [innerWidth,r.left,r.top,r.width,r.height]})()"));
        int[] origin = new int[2];
        runOnMainSync(()->activity.getCalendarWebView().getLocationOnScreen(origin));
        float scale = activity.getCalendarWebView().getWidth()/(float)bounds.getDouble(0);
        float startX = origin[0]+(float)(bounds.getDouble(1)+bounds.getDouble(3)*(direction<0?.78:.22))*scale;
        float endX = origin[0]+(float)(bounds.getDouble(1)+bounds.getDouble(3)*(direction<0?.22:.78))*scale;
        float startY = origin[1]+(float)(bounds.getDouble(2)+80)*scale;
        float endY = startY;
        if (vertical) {startX=origin[0]+(float)(bounds.getDouble(1)+bounds.getDouble(3)*.5)*scale;endX=startX;startY+=110*scale;endY=startY-100*scale;}
        long down = SystemClock.uptimeMillis();
        pointer(down,MotionEvent.ACTION_DOWN,startX,startY);
        for(int i=1;i<=12;i++){
            SystemClock.sleep(20);
            pointer(down,MotionEvent.ACTION_MOVE,startX+(endX-startX)*i/12,startY+(endY-startY)*i/12);
        }
        pointer(down,MotionEvent.ACTION_UP,endX,endY);
        waitForIdleSync();SystemClock.sleep(200);
    }
    private void pointer(long down,int action,float x,float y){
        MotionEvent event=MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,x,y,0);
        event.setSource(InputDevice.SOURCE_TOUCHSCREEN);sendPointerSync(event);event.recycle();
    }
    private void tapElement(String selector) throws Exception {
        JSONArray rect=new JSONArray(evaluate("(function(){var r=document.querySelector("+org.json.JSONObject.quote(selector)+").getBoundingClientRect();return [innerWidth,r.left+r.width/2,r.top+r.height/2]})()"));
        int[] origin=new int[2];runOnMainSync(()->activity.getCalendarWebView().getLocationOnScreen(origin));
        float scale=activity.getCalendarWebView().getWidth()/(float)rect.getDouble(0);
        float x=origin[0]+(float)rect.getDouble(1)*scale,y=origin[1]+(float)rect.getDouble(2)*scale;
        long down=SystemClock.uptimeMillis();pointer(down,MotionEvent.ACTION_DOWN,x,y);SystemClock.sleep(60);pointer(down,MotionEvent.ACTION_UP,x,y);
        waitForIdleSync();
    }
    private void waitForWebPaint() throws Exception {
        CountDownLatch painted=new CountDownLatch(1);
        runOnMainSync(()->activity.getCalendarWebView().postVisualStateCallback(SystemClock.uptimeMillis(),
                new WebView.VisualStateCallback(){
                    @Override public void onComplete(long requestId){
                        WebView view=activity.getCalendarWebView();
                        view.invalidate();view.postOnAnimation(()->view.postOnAnimation(painted::countDown));
                    }
                }));
        if(!painted.await(15,TimeUnit.SECONDS))throw new AssertionError("WebView paint timed out");
        waitForIdleSync();SystemClock.sleep(200);
    }
    private void await(String condition) throws Exception {
        long deadline = SystemClock.elapsedRealtime()+25000;
        while (SystemClock.elapsedRealtime()<deadline) {
            if ("true".equals(evaluate(condition))) return;
            SystemClock.sleep(100);
        }
        throw new AssertionError("Timed out waiting for: " + condition);
    }
    private String evaluate(String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        runOnMainSync(() -> activity.getCalendarWebView().evaluateJavascript(script, value -> {result.set(value);latch.countDown();}));
        if (!latch.await(10,TimeUnit.SECONDS)) throw new AssertionError("WebView callback timed out");
        return result.get();
    }
}
