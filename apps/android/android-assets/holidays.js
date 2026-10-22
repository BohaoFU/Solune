'use strict';
(() => {
  const requested=new Map(),cache=new Map();
  const snapshot=year=>{if(!cache.has(year)){try{cache.set(year,JSON.parse(SuishiHolidays.readYear(year)));}catch{cache.set(year,{year,state:'offline'});}}return cache.get(year);};
  const ensure=year=>{const now=Date.now();if(now-(requested.get(year)||0)<60000)return;requested.set(year,now);try{SuishiHolidays.refresh(year,false);}catch{}cache.delete(year);};
  function status(year){
    const data=snapshot(year),saved=Boolean(data.days),bundled=HolidayUtil.getHolidays(year).length>=20;
    if(data.state==='updating')return '正在更新放假安排…';
    if(data.state==='ready'&&saved)return '放假安排已更新';
    if(data.state==='offline')return saved?'暂未连上网络 · 使用已保存安排':bundled?'暂未连上网络 · 使用内置安排':'暂未连上网络 · 暂无放假安排';
    if(data.state==='unpublished')return saved||bundled?'暂未获取新安排 · 保留已有数据':`${year}年放假安排待公布或收录`;
    return saved?'使用已保存的放假安排':bundled?'已内置放假安排':`${year}年放假安排尚未收录`;
  }
  function updateHelp(){
    const text=$('#holiday-sync-status'),time=$('#holiday-sync-time'),button=$('#holiday-sync-button');if(!text)return;
    const data=snapshot(viewYear);text.textContent=`${viewYear}年 · ${status(viewYear)}`;
    time.textContent=data.updatedAt?`最近更新 ${new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(data.updatedAt)}`:'联网自动获取，断网仍可查看已有安排。';
    button.disabled=data.state==='updating';button.textContent=data.state==='updating'?'更新中…':'更新安排';
  }
  window.SuishiHolidayData={snapshot,ensure,status,updateHelp};
  window.addEventListener('suishi-holidays',event=>{
    cache.delete(event.detail.year);
    if(event.detail.year===viewYear&&currentView==='calendar')renderCalendar();
    updateHelp();
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-holiday-refresh]')){
      const year=viewYear;
      let started=false;try{started=SuishiHolidays.refresh(year,true);}catch{}
      cache.delete(year);
      if(currentView==='calendar')renderCalendar();updateHelp();
      if(!started)toast(snapshot(year).state==='updating'?'正在更新，请稍候':'刚刚已检查过，稍后再试');
    }
  });
})();
