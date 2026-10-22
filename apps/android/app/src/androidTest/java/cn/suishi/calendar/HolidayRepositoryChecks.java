package cn.suishi.calendar;

import android.content.Context;
import android.content.SharedPreferences;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

final class HolidayRepositoryChecks {
    static String run(Context target, Context test) throws Exception {
        String fixture;
        try (java.io.InputStream input = test.getAssets().open("holiday-2026.json")) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096]; int count;
            while ((count=input.read(buffer))!=-1) out.write(buffer,0,count);
            fixture = new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
        JSONObject parsed = HolidayRepository.parse(2026,fixture);
        require(parsed.getJSONObject("days").length()==39,"Full year parsing");
        require(!parsed.getJSONObject("days").getJSONObject("2026-10-10").getBoolean("isOffDay"),"Adjusted workday parsing");
        require(HolidayRepository.parse(2027,"{\"code\":0,\"holiday\":{}}") == null,"Unpublished year");
        boolean rejected=false;
        try { HolidayRepository.parse(2027,fixture); } catch(Exception expected) { rejected=true; }
        require(rejected,"Wrong year rejected");
        rejected=false;
        try { HolidayRepository.parse(2026,fixture.replace("2026-01-01","2026-02-30")); } catch(Exception expected) { rejected=true; }
        require(rejected,"Invalid date rejected");
        SharedPreferences preferences=target.getSharedPreferences("holiday_repository_test",Context.MODE_PRIVATE);
        preferences.edit().clear().commit();
        CountDownLatch done=new CountDownLatch(1);
        HolidayRepository repository=new HolidayRepository(preferences,y->done.countDown(),y->fixture);
        require(repository.refresh(2026,false),"Initial request");
        require(done.await(10,TimeUnit.SECONDS),"Cache completion");
        JSONObject first=new JSONObject(repository.read(2026));
        require(first.getJSONObject("days").length()==39&&first.getLong("updatedAt")>0,"Disk cache populated");
        require(!repository.refresh(2026,false),"Repeated requests throttled");repository.close();
        preferences.edit().putLong("attempt_2026",0).commit();
        CountDownLatch failed=new CountDownLatch(1);
        HolidayRepository offline=new HolidayRepository(preferences,y->failed.countDown(),y->{throw new java.io.IOException("Simulated network outage");});
        offline.refresh(2026,true);require(failed.await(10,TimeUnit.SECONDS),"Failure completion");
        JSONObject retained=new JSONObject(offline.read(2026));
        require(retained.getJSONObject("days").length()==39&&retained.getLong("updatedAt")==first.getLong("updatedAt")&&retained.getString("state").equals("offline"),"Network error preserves cache");offline.close();
        preferences.edit().putLong("attempt_2026",0).commit();
        CountDownLatch empty=new CountDownLatch(1);
        HolidayRepository unpublished=new HolidayRepository(preferences,y->empty.countDown(),y->"{\"code\":0,\"holiday\":{}}");
        unpublished.refresh(2026,true);require(empty.await(10,TimeUnit.SECONDS),"Empty completion");
        require(new JSONObject(unpublished.read(2026)).getJSONObject("days").length()==39,"Empty response preserves cache");unpublished.close();
        HolidayRepository restored=new HolidayRepository(preferences,y->{},y->fixture);
        require(new JSONObject(restored.read(2026)).getLong("updatedAt")==first.getLong("updatedAt"),"Cache survives repository recreation");restored.close();
        preferences.edit().clear().commit();
        return "OK: parser, workday, unpublished year, invalid year/date, caching, throttling, offline/empty fallback and restart persistence\n";
    }
    private static void require(boolean condition,String message) { if(!condition)throw new AssertionError(message); }
}
