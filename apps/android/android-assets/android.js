/* Android-only month sheet, holiday marks and calendar gestures. */
'use strict';
(() => {
  const syncTheme=()=>{document.title=document.body.classList.contains('dark')?'岁时万年历 · 深色':'岁时万年历';};
  syncTheme();
  new MutationObserver(syncTheme).observe(document.body,{attributes:true,attributeFilter:['class']});
  const scheduleYears=new Map();
  function hasSchedule(year){
    if(window.SuishiHolidayData?.snapshot(year).days)return true;
    if(!scheduleYears.has(year))scheduleYears.set(year,HolidayUtil.getHolidays(year).length>=20);
    return scheduleYears.get(year);
  }
  const getHoliday=date=>{
    const year=Number(date.slice(0,4)),remote=window.SuishiHolidayData?.snapshot(year).days;
    if(remote){const day=remote[date];return day?{isWork:()=>!day.isOffDay,getName:()=>day.name}:null;}
    return hasSchedule(year)?HolidayUtil.getHoliday(date):null;
  };
  for(const select of [$('#year-select'),$('#month-select')]){
    select.hidden=true;select.setAttribute('aria-hidden','true');select.tabIndex=-1;
  }
  $('.month-picker').insertAdjacentHTML('afterbegin',`<button id="year-picker-trigger" class="ym-trigger" aria-haspopup="dialog" aria-controls="month-picker-dialog">${viewYear}年 ${icon('chevron-right')}</button><button id="month-picker-trigger" class="ym-trigger" aria-haspopup="dialog" aria-controls="month-picker-dialog">${viewMonth}月 ${icon('chevron-right')}</button>`);
  document.body.insertAdjacentHTML('beforeend',`<dialog id="month-picker-dialog" class="month-sheet" aria-labelledby="month-picker-heading"><span class="sheet-handle" aria-hidden="true"></span><div class="sheet-header"><div><span class="sheet-eyebrow">岁时 · 日历</span><h2 id="month-picker-heading">选择年月</h2></div><button class="sheet-close icon-button" data-close="month-picker-dialog" aria-label="关闭年月选择">${icon('close')}</button></div><div class="sheet-year-bar"><button id="picker-prev-year" class="picker-step" aria-label="上一年">${icon('chevron-left')}</button><button id="picker-year-mode" class="picker-year-label"></button><button id="picker-next-year" class="picker-step" aria-label="下一年">${icon('chevron-right')}</button></div><div id="picker-year-grid" class="picker-grid" role="group" aria-label="选择年份" hidden></div><div id="picker-month-grid" class="picker-grid" role="group" aria-label="选择月份"></div><div class="sheet-bottom"><button id="picker-this-month" class="picker-current">回到本月</button><span>1901—2100 年</span></div><button id="picker-confirm" class="primary-button picker-confirm"></button></dialog>`);
  const dialog=$('#month-picker-dialog');
  let draftYear=viewYear,draftMonth=viewMonth,pickerMode='months',yearPage=1901,returnFocus;
  const monthNames=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  function renderPicker(){
    const years=pickerMode==='years';
    $('#picker-year-grid').hidden=!years;$('#picker-month-grid').hidden=years;
    $('#picker-year-mode').innerHTML=years?`${yearPage}—${Math.min(2100,yearPage+11)}年`:`${draftYear}<span>年</span>${icon('chevron-right')}`;
    $('#picker-year-mode').setAttribute('aria-label',years?'返回月份选择':'切换到年份选择');
    $('#picker-prev-year').setAttribute('aria-label',years?'上一组年份':'上一年');
    $('#picker-next-year').setAttribute('aria-label',years?'下一组年份':'下一年');
    $('#picker-prev-year').disabled=years?yearPage<=1901:draftYear<=1901;
    $('#picker-next-year').disabled=years?yearPage+11>=2100:draftYear>=2100;
    const [nowYear,nowMonth]=dateParts(today);
    $('#picker-month-grid').innerHTML=monthNames.map((name,i)=>`<button class="picker-tile ${draftMonth===i+1?'chosen':''}" data-pick-month="${i+1}" aria-pressed="${draftMonth===i+1}"><span>${name}</span>${draftYear===nowYear&&i+1===nowMonth?'<small class="picker-now">本月</small>':''}</button>`).join('');
    $('#picker-year-grid').innerHTML=Array.from({length:12},(_,i)=>yearPage+i).filter(y=>y<=2100).map(y=>`<button class="picker-tile ${draftYear===y?'chosen':''}" data-pick-year="${y}" aria-pressed="${draftYear===y}"><span>${y}</span>${y===nowYear?'<small class="picker-now">今年</small>':''}</button>`).join('');
    $('#picker-confirm').innerHTML=`查看 ${draftYear}年${draftMonth}月 ${icon('arrow-right')}`;
  }
  function openPicker(mode,trigger){
    draftYear=viewYear;draftMonth=viewMonth;pickerMode=mode;
    yearPage=1901+Math.floor((draftYear-1901)/12)*12;returnFocus=trigger;
    renderPicker();dialog.showModal();document.body.classList.add('month-sheet-open');
  }
  $('#year-picker-trigger').addEventListener('click',e=>openPicker('years',e.currentTarget));
  $('#month-picker-trigger').addEventListener('click',e=>openPicker('months',e.currentTarget));
  $('#picker-year-mode').addEventListener('click',()=>{
    pickerMode=pickerMode==='years'?'months':'years';yearPage=1901+Math.floor((draftYear-1901)/12)*12;renderPicker();
  });
  function stepYear(direction){
    if(pickerMode==='years')yearPage=Math.max(1901,Math.min(2093,yearPage+direction*12));
    else draftYear=Math.max(1901,Math.min(2100,draftYear+direction));
    renderPicker();
  }
  $('#picker-prev-year').addEventListener('click',()=>stepYear(-1));
  $('#picker-next-year').addEventListener('click',()=>stepYear(1));
  dialog.addEventListener('click',event=>{
    const month=event.target.closest('[data-pick-month]'),year=event.target.closest('[data-pick-year]');
    if(month){draftMonth=Number(month.dataset.pickMonth);renderPicker();}
    if(year){draftYear=Number(year.dataset.pickYear);pickerMode='months';renderPicker();}
    if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientY<box.top||event.clientX<box.left||event.clientX>box.right)dialog.close();}
  });
  $('#picker-this-month').addEventListener('click',()=>{[draftYear,draftMonth]=dateParts(today);pickerMode='months';renderPicker();});
  $('#picker-confirm').addEventListener('click',()=>{
    const day=Math.min(dateParts(selected)[2],new Date(Date.UTC(draftYear,draftMonth,0)).getUTCDate());
    selectDate(key(draftYear,draftMonth,day),true);dialog.close();
  });
  dialog.addEventListener('close',()=>{if(dialog.open)return;document.body.classList.remove('month-sheet-open');returnFocus?.focus({preventScroll:true});});

  const baseRenderCalendar=renderCalendar;
  renderCalendar=function(){
    baseRenderCalendar();
    window.SuishiHolidayData?.ensure(viewYear);
    $('#year-picker-trigger').innerHTML=`${viewYear}年 ${icon('chevron-right')}`;
    $('#month-picker-trigger').innerHTML=`${viewMonth}月 ${icon('chevron-right')}`;
    for(const cell of $$('#calendar-grid [data-date]')){
      const holiday=getHoliday(cell.dataset.date);if(!holiday)continue;
      const work=holiday.isWork(),name=holiday.getName().replace('元旦节','元旦');
      const info=`${name} · ${work?'调休上班':'放假休息'}`;
      cell.classList.add(work?'is-workday':'is-day-off');
      cell.insertAdjacentHTML('afterbegin',`<span class="holiday-badge ${work?'badge-work':'badge-rest'}" aria-hidden="true">${work?'班':'休'}</span>`);
      cell.setAttribute('aria-label',cell.getAttribute('aria-label')+'，'+info);cell.title=info;
    }
    const holiday=getHoliday(selected);
    if(holiday){const work=holiday.isWork();$('.date-facts').insertAdjacentHTML('afterend',`<div class="holiday-detail ${work?'detail-work':'detail-rest'}"><span>${work?'班':'休'}</span><p>${escapeHTML(holiday.getName().replace('元旦节','元旦'))} · ${work?'调休上班':'放假休息'}</p></div>`);}
    $('.calendar-footer>div').innerHTML='<span class="inline-holiday badge-rest">休</span> 放假 <span class="inline-holiday badge-work">班</span> 调休 <span class="legend note-legend"></span> 记事';
    let coverage=$('#holiday-coverage');
    if(!coverage){$('.calendar-footer').insertAdjacentHTML('afterend','<div id="holiday-coverage" class="holiday-coverage"></div>');coverage=$('#holiday-coverage');}
    const scheduleStatus=window.SuishiHolidayData?.status(viewYear)||'左右滑动切换月份';
    coverage.innerHTML=`<span>${icon('info')} ${escapeHTML(scheduleStatus)}</span><button type="button" data-holiday-refresh aria-label="更新${viewYear}年放假安排">更新 ${icon('chevron-right')}</button>`;
  };
  renderCalendar();

  const grid=$('#calendar-grid');
  grid.setAttribute('aria-description','可左右滑动切换月份，上下滑动浏览页面');
  let gesture=null,suppressClickUntil=0;
  function resetGesture(){gesture=null;grid.style.transform='';grid.style.opacity='';}
  grid.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dy:0,horizontal:false};
  });
  grid.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    gesture.dx=event.clientX-gesture.x;gesture.dy=event.clientY-gesture.y;
    const x=Math.abs(gesture.dx),y=Math.abs(gesture.dy);
    if(!gesture.horizontal&&y>12&&y>x){resetGesture();return;}
    if(!gesture.horizontal&&x>12&&x>y*1.4){gesture.horizontal=true;try{grid.setPointerCapture(event.pointerId);}catch{}}
    if(gesture.horizontal){
      if(event.cancelable)event.preventDefault();
      grid.style.transform=`translateX(${Math.tanh(gesture.dx/130)*36}px)`;
      grid.style.opacity=String(1-Math.min(x/1500,.15));
    }
  },{passive:false});
  grid.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const {dx,dy,horizontal}=gesture;resetGesture();
    if(!horizontal)return;suppressClickUntil=performance.now()+350;
    if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.4)return;
    const direction=dx<0?1:-1;
    if((viewYear===1901&&viewMonth===1&&direction<0)||(viewYear===2100&&viewMonth===12&&direction>0)){
      toast(direction<0?'已到最早可查询的月份':'已到最晚可查询的月份');return;
    }
    changeMonth(direction);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)grid.animate([{transform:`translateX(${direction*15}px)`,opacity:.6},{transform:'translateX(0)',opacity:1}],{duration:170,easing:'ease-out'});
  });
  grid.addEventListener('pointercancel',resetGesture);
  grid.addEventListener('lostpointercapture',event=>{if(event.target===grid)resetGesture();});
  grid.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
})();
