// Reference: 国办发明电〔2025〕7号, published 2025-11-04.
// https://www.beijing.gov.cn/zhengce/zhengcefagui/202511/t20251104_4258873.html
const assert = require('node:assert/strict');
const {HolidayUtil} = require('./app/src/main/assets/calendar/vendor/lunar.js');
const holidays = [
  ['2026-01-01','2026-01-03'],['2026-02-15','2026-02-23'],
  ['2026-04-04','2026-04-06'],['2026-05-01','2026-05-05'],
  ['2026-06-19','2026-06-21'],['2026-09-25','2026-09-27'],
  ['2026-10-01','2026-10-07']
];
const workdays=['2026-01-04','2026-02-14','2026-02-28','2026-05-09','2026-09-20','2026-10-10'];
const expected=new Map(workdays.map(date=>[date,true]));
for(const [start,end] of holidays) {
  for(let day=new Date(start+'T00:00:00Z');day.toISOString().slice(0,10)<=end;day.setUTCDate(day.getUTCDate()+1))
    expected.set(day.toISOString().slice(0,10),false);
}
const actual=HolidayUtil.getHolidays(2026);
assert.equal(actual.length,expected.size);
for(const record of actual)assert.equal(record.isWork(),expected.get(record.getDay()),record.getDay());
for(let year=2002;year<=2026;year++)assert.ok(HolidayUtil.getHolidays(year).length>=20,year);
assert.equal(HolidayUtil.getHolidays(2027).length,0);
console.log('PASS: all 39 holiday/workday records for 2026 match the official notice.');
const api=require('./app/src/androidTest/assets/holiday-2026.json');
assert.equal(api.code,0);assert.equal(Object.keys(api.holiday).length,expected.size);
for(const entry of Object.values(api.holiday))assert.equal(!entry.holiday,expected.get(entry.date),entry.date);
console.log('PASS: all 39 records fetched from the public API match the same official notice.');
