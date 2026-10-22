/* 岁时 · 万年历 | Calendar dates are interpreted in Asia/Shanghai. */
'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const MIN = '1901-01-01', MAX = '2100-12-31';
const pad = n => String(n).padStart(2, '0');
const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const dateParts = value => value.split('-').map(Number);
const utcDate = value => { const [y,m,d] = dateParts(value); return new Date(Date.UTC(y,m-1,d)); };
const dateKey = date => key(date.getUTCFullYear(), date.getUTCMonth()+1, date.getUTCDate());
const dateDiff = (a,b) => Math.round((utcDate(a)-utcDate(b))/86400000);
const addDays = (date,n) => { const d=utcDate(date); d.setUTCDate(d.getUTCDate()+n); return dateKey(d); };
const escapeHTML = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isValidDate = value => { if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<MIN||value>MAX)return false; return dateKey(utcDate(value))===value; };
const chinaToday = () => { const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); return key(+p.find(v=>v.type==='year').value,+p.find(v=>v.type==='month').value,+p.find(v=>v.type==='day').value); };
const clampDate = value => value<MIN?MIN:value>MAX?MAX:value;
let today=clampDate(chinaToday()), selected=today, [viewYear,viewMonth]=dateParts(today), currentView='calendar', festivalFilter='all', conversionMode='solar';
let toastTimer, deferredInstall, currentConvertResult;
const dataCache=new Map(), eventCache=new Map();
let notes=[];
try { const saved=JSON.parse(localStorage.getItem('suishi-notes')||'[]'); if(Array.isArray(saved))notes=saved.filter(n=>n&&typeof n.id==='string'&&isValidDate(n.date)&&typeof n.title==='string'&&n.title.length<=50&&typeof n.body==='string'&&n.body.length<=500); } catch {}
try { if(localStorage.getItem('suishi-theme')==='dark')document.body.classList.add('dark'); }catch{}

const iconPaths={
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2m-8 3h2"/>',
  leaf:'<path d="M20 4c0 10-4 16-10 16a6 6 0 0 1-6-6c0-6 7-10 16-10Z"/><path d="m4 21 11-11M8 17v-6m3 3h6"/>',
  swap:'<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  notebook:'<path d="M7 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM5 17h15M3 7h4M3 11h4M10 7h6m-6 4h4"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  moon:'<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3M12 17h.01"/>',
  'chevron-left':'<path d="m14 6-6 6 6 6"/>','chevron-right':'<path d="m10 6 6 6-6 6"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.calendar}</svg>`;
const hydrateIcons = (root=document) => $$('[data-icon]',root).forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
const branch = `<svg class="branch" viewBox="0 0 160 190" fill="none" aria-hidden="true"><g stroke="#889274" stroke-width="1.1"><path d="M72 185C78 142 63 89 92 17M78 151c-19-12-26-27-34-46M77 124c16-10 29-25 35-43M78 98C63 90 52 76 48 60M84 63c14-8 28-20 32-33M78 150c20-4 34-13 46-26"/></g><g fill="#a5ac8d"><path d="M49 120C29 115 29 96 32 88c16 6 23 18 17 32Z"/><path d="M64 142C44 140 36 126 38 116c17 1 28 12 26 26Z"/><path d="M92 140c-3-18 5-30 19-35 1 19-4 30-19 35Z"/><path d="M102 111c-3-19 5-29 18-35 1 16-5 31-18 35Z"/><path d="M74 98C54 92 50 76 52 66c18 7 26 17 22 32Z"/><path d="M87 77c-4-20 3-35 17-44 2 20-3 34-17 44Z"/><path d="M104 55c-1-18 8-30 23-34-1 17-8 27-23 34Z"/><path d="M90 34c-8-15-4-25 7-33 4 15 4 24-7 33Z"/><path d="M115 132c0-18 12-30 26-29-4 18-12 27-26 29Z"/></g><g fill="#b98b65"><circle cx="43" cy="105" r="2"/><circle cx="112" cy="81" r="2.5"/><circle cx="85" cy="61" r="2"/></g></svg>`;
const poems={立春:['春风有信，花开有期。','万物随春醒，美好皆可期。'],雨水:['好雨知时节，当春乃发生。','春雨润无声，万物始萌动。'],惊蛰:['微雨众卉新，一雷惊蛰始。','春雷唤醒大地，也唤醒新的期待。'],春分:['春风如贵客，一到便繁华。','春色正中分，莫负好时光。'],清明:['梨花风起正清明。','草木吐新绿，人间寄深情。'],谷雨:['春山谷雨前，并手摘芳烟。','雨生百谷，春尽夏来。'],立夏:['绿树阴浓夏日长。','风暖昼长，万物向阳。'],小满:['小满未满，万物可期。','最好的圆满，是恰到好处。'],芒种:['时雨及芒种，四野皆插秧。','忙有所获，种有所得。'],夏至:['昼晷已云极，宵漏自此长。','夏日绵长，万物繁盛。'],小暑:['倏忽温风至，因循小暑来。','清风入怀，心有清凉。'],大暑:['大暑三秋近，林钟九夏移。','暑意正浓，且寻一份清闲。'],立秋:['云天收夏色，木叶动秋声。','风吹一片叶，万物已惊秋。'],处暑:['疾风驱急雨，残暑扫除空。','暑气渐止，秋意渐浓。'],白露:['露从今夜白，月是故乡明。','天凉好个秋，记得添衣。'],秋分:['金气秋分，风清露冷秋期半。','秋色平分，一半清欢一半安然。'],寒露:['空庭得秋长漫漫，寒露入暮愁衣单。','露寒而冷，心有温暖。'],霜降:['霜叶红于二月花。','秋深霜渐浓，岁暮心常暖。'],立冬:['细雨生寒未有霜，庭前木叶半青黄。','把温暖收藏，等一场冬日晴光。'],小雪:['花雪随风不厌看。','小雪至，冬意浓，愿日子温柔。'],大雪:['夜深知雪重，时闻折竹声。','瑞雪知时节，冬日有清欢。'],冬至:['天时人事日相催，冬至阳生春又来。','长夜终有尽，春意会重来。'],小寒:['小寒连大吕，欢鹊垒新巢。','岁寒有暖，静候春归。'],大寒:['大寒宜近火，无事莫开门。','冬将尽，春可期。']};

function getData(value){
  if(dataCache.has(value))return dataCache.get(value);
  const [y,m,d]=dateParts(value), solar=Solar.fromYmd(y,m,d), lunar=solar.getLunar();
  const traditional=lunar.getFestivals();
  const fixed=solar.getFestivals().filter(x=>['元旦节','元旦','妇女节','劳动节','青年节','儿童节','建党节','建军节','教师节','国庆节','母亲节','父亲节','圣诞节','情人节'].includes(x));
  const festivals=[...new Set([...traditional,...fixed])].map(n=>n==='元旦节'?'元旦':n);
  const result={solar,lunar,festivals,term:lunar.getJieQi(),lunarText:`${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`};
  dataCache.set(value,result);return result;
}
function getEvents(year){
  if(eventCache.has(year))return eventCache.get(year);
  const events=[];
  let value=key(year,1,1),end=key(year,12,31);
  while(value<=end){
    const data=getData(value);
    if(data.term)events.push({date:value,name:data.term,type:'term',lunar:data.lunarText});
    data.festivals.forEach(name=>events.push({date:value,name,type:'festival',lunar:data.lunarText}));
    value=addDays(value,1);
  }
  eventCache.set(year,events);return events;
}
function selectDate(value,showCalendar=false){
  if(!isValidDate(value)){toast('请选择 1901—2100 年之间的有效日期');return false;}
  selected=value;[viewYear,viewMonth]=dateParts(value);
  if(showCalendar)setView('calendar');else renderCalendar();
  return true;
}
function changeMonth(delta){
  const target=new Date(Date.UTC(viewYear,viewMonth-1+delta,1));
  const y=target.getUTCFullYear(),m=target.getUTCMonth()+1;
  if(y<1901||y>2100)return;
  const day=Math.min(dateParts(selected)[2],new Date(Date.UTC(y,m,0)).getUTCDate());
  selectDate(key(y,m,day));
}
function renderCalendar(){
  $('#year-select').value=viewYear;$('#month-select').value=viewMonth;
  const firstData=getData(selected);
  $('#lunar-year-label').textContent=`${firstData.lunar.getYearInGanZhi()} · ${firstData.lunar.getYearShengXiao()}年`;
  $('#prev-month').disabled=viewYear===1901&&viewMonth===1;$('#next-month').disabled=viewYear===2100&&viewMonth===12;
  const first=key(viewYear,viewMonth,1), offset=(utcDate(first).getUTCDay()+6)%7;
  let html='';
  for(let i=0;i<42;i++){
    const value=addDays(first,i-offset), [y,m,d]=dateParts(value);
    if(!isValidDate(value)){html+='<span class="day-cell" aria-hidden="true"></span>';continue;}
    const data=getData(value), active=value===selected, isToday=value===today;
    const label=data.term||data.festivals[0]||(data.lunar.getDay()===1?`${data.lunar.getMonthInChinese()}月`:data.lunar.getDayInChinese());
    const hasNote=notes.some(n=>n.date===value);
    const classes=['day-cell',i%7>4?'weekend':'',m!==viewMonth?'other-month':'',active?'selected':'',isToday?'today':'',data.term?'has-term':'',data.festivals.length?'has-festival':''].filter(Boolean).join(' ');
    html+=`<button class="${classes}" data-date="${value}" aria-pressed="${active}" aria-label="${y}年${m}月${d}日，农历${data.lunarText}${data.term?'，'+data.term:''}${data.festivals.length?'，'+data.festivals.join('、'):''}${hasNote?'，有记事':''}${isToday?'，今天':''}"${isToday?' aria-current="date"':''} tabindex="${active?0:-1}"><span class="solar-number">${d}</span><span class="lunar-label">${escapeHTML(label)}</span>${isToday?'<span class="today-mark">今</span>':''}${hasNote?'<span class="note-dot"></span>':''}</button>`;
  }
  $('#calendar-grid').innerHTML=html;
  renderDetail();renderUpcoming();
}
function renderDetail(){
  const [y,m,d]=dateParts(selected),{solar,lunar,festivals,term,lunarText}=getData(selected);
  const week='星期'+solar.getWeekInChinese();
  const next=lunar.getNextJieQi(),nextDate=next.getSolar().toYmd();
  const ownNotes=notes.filter(n=>n.date===selected);
  $('#day-detail').innerHTML=`<div class="day-top"><div class="day-top-date">${y}年${m}月 · ${week}${selected===today?'<span class="selected-today">今天</span>':''}</div><div class="detail-number">${pad(d)}</div><div class="detail-lunar">${lunarText}</div><div class="detail-ganzhi">${lunar.getYearInGanZhi()}年 · ${lunar.getMonthInGanZhi()}月 · ${lunar.getDayInGanZhi()}日</div></div><div class="day-bottom"><div class="date-facts"><div class="fact"><small>生 肖</small><strong>${lunar.getYearShengXiao()}年</strong></div><div class="fact"><small>星 座</small><strong>${solar.getXingZuo()}座</strong></div><div class="fact"><small>农历月份</small><strong>${lunar.getMonthInChinese()}月 · ${LunarMonth.fromYm(lunar.getYear(),lunar.getMonth()).getDayCount()===30?'大':'小'}</strong></div><div class="fact"><small>岁 序</small><strong>今年第 ${dateDiff(selected,key(y,1,1))+1} 天</strong></div></div><div class="detail-event">${icon(term?'leaf':'calendar')}<span>${term?`今日节气 · ${term}`:festivals.length?festivals.join(' · '):`${next.getName()} · ${dateDiff(nextDate,selected)}天后`}</span></div>${term&&festivals.length?`<div class="detail-note-list">${escapeHTML(festivals.join(' · '))}</div>`:''}${ownNotes.length?`<div class="detail-note-list">${ownNotes.map(n=>`<button data-edit-note="${escapeHTML(n.id)}">${icon('notebook')}${escapeHTML(n.title)}</button>`).join('')}</div>`:''}<div class="add-note-button"><button id="add-day-note">${icon('plus')} 为这一天添加记事</button></div></div>`;
  const season=lunar.getPrevJieQi().getName();
  const poem=poems[season]||poems['立秋'];
  $('#sidebar-season').innerHTML=`${branch}<div class="season-word">${season}</div><p>${escapeHTML(poem[1].replace('，','<br>')).replace('&lt;br&gt;','<br>')}</p>`;
  const termSolar=lunar.getPrevJieQi().getSolar();
  $('#season-card').innerHTML=`<div class="season-kicker">二十四节气 · 当下时序</div><h2>${season}</h2><p>${poem[0]}<br>${poem[1]}</p><div class="season-date">${termSolar.getMonth()}月${termSolar.getDay()}日起 · 岁时有序，顺时而安</div>${branch}`;
}
function renderUpcoming(){
  const year=dateParts(selected)[0];
  let events=getEvents(year).filter(e=>e.date>=selected);
  if(events.length<4&&year<2100)events=events.concat(getEvents(year+1));
  const dedup=[];for(const event of events){if(!dedup.some(e=>e.date===event.date)){dedup.push(event);if(dedup.length===4)break;}}
  $('#upcoming-list').innerHTML=dedup.length?dedup.map(e=>{const days=dateDiff(e.date,selected),[,m,d]=dateParts(e.date);return `<button class="upcoming-item" data-go-date="${e.date}" aria-label="查看${e.name}，${m}月${d}日"><span class="event-type ${e.type==='festival'?'is-festival':''}">${e.type==='term'?'节 气':'节 日'}</span><span class="upcoming-name">${e.name}</span><span class="upcoming-date">${pad(m)}月${pad(d)}日 · ${e.lunar}</span><span class="event-countdown">${days===0?'就 是 今 天':`还有 <strong>${days}</strong> 天`}</span></button>`;}).join(''):'<p class="muted">已到支持查询范围的年末。</p>';
}
const titles={calendar:['每一个日子，都值得珍惜。','循着农历与节气，感受日常里的时间之美。','万年历'],festivals:['四季有信，相逢有时。','记住传统节日，也记住每一次季节的来信。','节日与节气'],convert:['两种历法，同一个日子。','公历与农历之间，轻松找到你想要的那一天。','公农历转换'],notes:['平凡日子，也有小小惦念。','把重要的人与事，放进时间的口袋里。','我的记事']};
function setView(view){
  if(!titles[view])view='calendar';currentView=view;
  $$('.view').forEach(el=>el.hidden=el.id!==`view-${view}`);
  $$('.nav-item').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('#page-title').textContent=titles[view][0];$('#page-subtitle').textContent=titles[view][1];$('#breadcrumb-current').textContent=titles[view][2];
  if(view==='calendar')renderCalendar();if(view==='festivals')renderFestivals();if(view==='notes')renderNotes();
  try{history.replaceState(null,'',`#${view}`);}catch{}
}
function renderFestivals(){
  const year=+$('#festival-year').value;
  const events=getEvents(year).filter(e=>festivalFilter==='all'||e.type===festivalFilter);
  $('#festival-grid').innerHTML=events.map(e=>{const[,m,d]=dateParts(e.date);return `<button class="event-card" data-go-date="${e.date}"><span class="event-date-block">${m}月<strong>${d}</strong></span><span><span class="event-type ${e.type==='festival'?'is-festival':''}">${e.type==='term'?'二十四节气':'节日'}</span><h3>${e.name}</h3><small>农历${e.lunar} · 周${getData(e.date).solar.getWeekInChinese()}</small></span></button>`;}).join('');
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function saveNotes(next){try{localStorage.setItem('suishi-notes',JSON.stringify(next));notes=next;updateNoteCount();return true;}catch{toast('记事未保存：浏览器存储空间不足或被限制');return false;}}
function updateNoteCount(){const el=$('#note-count');el.textContent=notes.length;el.hidden=!notes.length;}
function openNote(id){
  const note=id?notes.find(n=>n.id===id):null;
  $('#note-id').value=note?.id||'';$('#note-date').value=note?.date||selected;$('#note-title').value=note?.title||'';$('#note-body').value=note?.body||'';$('#note-dialog-title').textContent=note?'编辑记事':'记下这一天';$('#note-dialog').showModal();
}
function renderNotes(){
  $('#notes-list').innerHTML=notes.length?[...notes].sort((a,b)=>a.date.localeCompare(b.date)).map(n=>{const [y,m,d]=dateParts(n.date);return `<article class="note-card"><div class="note-card-date">${icon('calendar')}${y}年${m}月${d}日 · 农历${getData(n.date).lunarText}</div><h3>${escapeHTML(n.title)}</h3>${n.body?`<p>${escapeHTML(n.body)}</p>`:''}<div class="note-actions"><button data-go-date="${n.date}">查看日期</button><button data-edit-note="${escapeHTML(n.id)}">编辑</button><button data-delete-note="${escapeHTML(n.id)}">删除</button></div></article>`;}).join(''):`<div class="empty-state">${icon('notebook')}<h2>日子还长，慢慢记录。</h2><p>为生日、纪念日或某一天的小事，留下一份惦念。</p><button class="primary-button" id="empty-new-note">${icon('plus')} 添加第一条记事</button></div>`;
}
function fillYears(el,min=1901,max=2100){el.innerHTML=Array.from({length:max-min+1},(_,i)=>`<option value="${min+i}">${min+i}年</option>`).join('');el.value=viewYear;}
function updateLunarMonths(){
  const year=+$('#lunar-year').value;
  $('#lunar-month').innerHTML=LunarYear.fromYear(year).getMonths().filter(m=>m.getYear()===year).map(m=>`<option value="${m.getMonth()}">${Lunar.fromYmd(year,m.getMonth(),1).getMonthInChinese()}月</option>`).join('');
  updateLunarDays();
}
function updateLunarDays(){
  const y=+$('#lunar-year').value,m=+$('#lunar-month').value;
  const old=+$('#lunar-day').value||1,days=LunarMonth.fromYm(y,m).getDayCount();
  $('#lunar-day').innerHTML=Array.from({length:days},(_,i)=>`<option value="${i+1}">${Lunar.fromYmd(y,m,i+1).getDayInChinese()}</option>`).join('');$('#lunar-day').value=Math.min(old,days);
}
function convert(){
  try{
    let value;
    if(conversionMode==='solar'){value=$('#solar-date').value;if(!isValidDate(value))throw Error('请选择 1901—2100 年之间的有效日期');}
    else{value=Lunar.fromYmd(+$('#lunar-year').value,+$('#lunar-month').value,+$('#lunar-day').value).getSolar().toYmd();if(!isValidDate(value))throw Error('对应公历超出范围，请选择公历 1901—2100 年内的日期');}
    const {solar,lunar,lunarText}=getData(value);currentConvertResult=value;
    $('#convert-result').innerHTML=`<div class="result-box"><small>${conversionMode==='solar'?'对应农历':'对应公历'}</small><h3>${conversionMode==='solar'?`${lunar.getYearInChinese()}年 ${lunarText}`:`${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`}</h3><p>${solar.toYmd()} · 星期${solar.getWeekInChinese()}<br>农历${lunarText} · ${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年</p><button id="see-converted-date">到月历中查看 ${icon('arrow-right')}</button></div>`;
  }catch(e){toast(e.message||'日期无效，请重新选择');}
}
function updateClock(){
  $('#clock').textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const newToday=clampDate(chinaToday());
  if(newToday!==today){const wasToday=selected===today;today=newToday;if(wasToday){selected=today;[viewYear,viewMonth]=dateParts(today);}if(currentView==='calendar')renderCalendar();}
  const [y,m,d]=dateParts(today);$('#header-today').textContent=`${y}年${m}月${d}日 · 星期${getData(today).solar.getWeekInChinese()}`;
}

fillYears($('#year-select'));fillYears($('#festival-year'));fillYears($('#lunar-year'),1900,2100);
$('#month-select').innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}">${pad(i+1)}月</option>`).join('');
$('#solar-date').value=today;$('#jump-date').value=today;
updateLunarMonths();
const startLunar=getData(today).lunar;$('#lunar-year').value=startLunar.getYear();updateLunarMonths();$('#lunar-month').value=startLunar.getMonth();updateLunarDays();$('#lunar-day').value=startLunar.getDay();
hydrateIcons();updateNoteCount();updateClock();setInterval(updateClock,30000);setView(location.hash.slice(1)||'calendar');convert();
$('#theme-btn').innerHTML=icon(document.body.classList.contains('dark')?'sun':'moon');
$('#theme-btn').setAttribute('aria-label',document.body.classList.contains('dark')?'切换浅色模式':'切换深色模式');

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.view)setView(button.dataset.view);
  if(button.dataset.close)$('#'+button.dataset.close).close();
  if(button.dataset.date)selectDate(button.dataset.date);
  if(button.dataset.goDate)selectDate(button.dataset.goDate,true);
  if(button.dataset.editNote)openNote(button.dataset.editNote);
  if(button.dataset.deleteNote){
    const note=notes.find(n=>n.id===button.dataset.deleteNote);
    if(note&&confirm(`删除“${note.title}”？`)&&saveNotes(notes.filter(n=>n.id!==note.id))){renderNotes();toast('记事已删除');}
  }
  if(button.dataset.filter){festivalFilter=button.dataset.filter;$$('[data-filter]').forEach(el=>el.classList.toggle('active',el===button));renderFestivals();}
  if(button.dataset.mode){conversionMode=button.dataset.mode;$$('[data-mode]').forEach(el=>el.classList.toggle('active',el===button));$('#solar-input').hidden=conversionMode!=='solar';$('#solar-date').required=conversionMode==='solar';$('#lunar-input').hidden=conversionMode!=='lunar';$('#convert-result').innerHTML='';}
  switch(button.id){
    case 'prev-month':changeMonth(-1);break;case 'next-month':changeMonth(1);break;case 'today-btn':selectDate(today);break;
    case 'jump-btn':$('#jump-date').value=selected;$('#date-dialog').showModal();break;
    case 'jump-convert':$('#date-dialog').close();setView('convert');break;
    case 'all-festivals':$('#festival-year').value=viewYear;setView('festivals');break;
    case 'help-btn':$('#help-dialog').showModal();break;
    case 'theme-btn':{const dark=document.body.classList.toggle('dark');button.innerHTML=icon(dark?'sun':'moon');button.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');try{localStorage.setItem('suishi-theme',dark?'dark':'light');}catch{}break;}
    case 'new-note':case 'empty-new-note':case 'add-day-note':openNote();break;
    case 'see-converted-date':if(currentConvertResult)selectDate(currentConvertResult,true);break;
    case 'install-btn':if(deferredInstall){deferredInstall.prompt();deferredInstall.userChoice.then(()=>{deferredInstall=null;});}else $('#install-dialog').showModal();break;
  }
});
$('#year-select').addEventListener('change',()=>selectDate(key(+$('#year-select').value,viewMonth,Math.min(dateParts(selected)[2],new Date(Date.UTC(+$('#year-select').value,viewMonth,0)).getUTCDate()))));
$('#month-select').addEventListener('change',()=>selectDate(key(viewYear,+$('#month-select').value,Math.min(dateParts(selected)[2],new Date(Date.UTC(viewYear,+$('#month-select').value,0)).getUTCDate()))));
$('#festival-year').addEventListener('change',renderFestivals);
$('#lunar-year').addEventListener('change',updateLunarMonths);$('#lunar-month').addEventListener('change',updateLunarDays);
$('#convert-form').addEventListener('submit',e=>{e.preventDefault();convert();});
$('#date-form').addEventListener('submit',e=>{e.preventDefault();if(selectDate($('#jump-date').value,true))$('#date-dialog').close();});
$('#note-form').addEventListener('submit',e=>{
  e.preventDefault();const title=$('#note-title').value.trim(),date=$('#note-date').value;
  if(!title){toast('请填写记事标题');return;}if(!isValidDate(date)){toast('请选择有效日期');return;}
  const id=$('#note-id').value||(crypto.randomUUID?crypto.randomUUID():`n-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const note={id,date,title,body:$('#note-body').value.trim()};
  const next=notes.some(n=>n.id===id)?notes.map(n=>n.id===id?note:n):[...notes,note];
  if(saveNotes(next)){$('#note-dialog').close();if(currentView==='notes')renderNotes();else if(currentView==='calendar')renderCalendar();toast('已记下这一天');}
});
$('#calendar-grid').addEventListener('keydown',e=>{
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
  if(offset){e.preventDefault();const next=addDays(selected,offset);if(isValidDate(next)){selectDate(next);$(`[data-date="${next}"]`).focus();}}
});
document.addEventListener('keydown',e=>{if(!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!$('dialog[open]')){if(e.key==='PageUp'){e.preventDefault();changeMonth(-1);}if(e.key==='PageDown'){e.preventDefault();changeMonth(1);}}});
window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
