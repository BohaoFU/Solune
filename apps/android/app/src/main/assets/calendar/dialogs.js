'use strict';
(() => {
  const handle='<span class="sheet-handle" aria-hidden="true"></span>';
  function heading(id,title,kicker,seal){return `${handle}<header class="sheet-header"><div><span class="sheet-eyebrow">${kicker}</span><h2 id="${id}-heading">${title}</h2></div><button type="button" class="sheet-close icon-button" data-close="${id}" aria-label="关闭">${icon('close')}</button></header><span class="sheet-watermark" aria-hidden="true">${seal}</span>`;}
  function createSheet(id,title,kicker,seal,body){
    document.body.insertAdjacentHTML('beforeend',`<dialog id="${id}" class="app-sheet" aria-labelledby="${id}-heading">${heading(id,title,kicker,seal)}${body}</dialog>`);return $('#'+id);
  }
  for(const [id,kicker,seal] of [['date-dialog','寻一日 · 看农历','日'],['note-dialog','留一笔 · 记心间','记']]){
    const sheet=$('#'+id);sheet.classList.add('app-sheet');sheet.insertAdjacentHTML('afterbegin',handle);
    const title=$('.dialog-title',sheet),h2=$('h2',title);h2.id=h2.id||id+'-heading';
    sheet.setAttribute('aria-labelledby',h2.id);title.classList.add('sheet-header');
    h2.outerHTML=`<div><span class="sheet-eyebrow">${kicker}</span>${h2.outerHTML}</div>`;
    $('.icon-button',title).classList.add('sheet-close');sheet.insertAdjacentHTML('beforeend',`<span class="sheet-watermark" aria-hidden="true">${seal}</span>`);
  }
  $('#date-dialog p').classList.add('sheet-intro');
  $('#note-form').insertAdjacentHTML('beforeend','<div class="private-hint">'+icon('lock')+' 记事只保存在这台设备</div>');
  const noteTitle=$('#note-title');noteTitle.autocomplete='off';
  const body=$('#note-body');body.insertAdjacentHTML('afterend','<span id="note-counter" class="field-counter">0 / 500</span>');
  body.addEventListener('input',()=>$('#note-counter').textContent=`${body.value.length} / 500`);

  // Every native select gets a compact trigger and a paged grid, including leap months.
  const optionSheet=createSheet('option-dialog','选择','岁时 · 日期选择','历',`<div class="option-pager"><button id="option-prev" class="picker-step" aria-label="上一组">${icon('chevron-left')}</button><strong id="option-page-label"></strong><button id="option-next" class="picker-step" aria-label="下一组">${icon('chevron-right')}</button></div><div id="option-grid" class="option-grid" role="group"></div><div class="selection-summary" id="option-summary"></div><button id="option-confirm" type="button" class="primary-button">确定选择 ${icon('check')}</button>`);
  let choice=null,choicePage=0;
  function renderOptions(){
    const paged=choice.options.length>36,size=paged?12:choice.options.length;
    const shown=choice.options.slice(choicePage*size,(choicePage+1)*size);
    $('#option-dialog-heading').textContent=choice.title;
    $('#option-page-label').textContent=paged?`${shown[0].label} — ${shown.at(-1).label}`:'选择适合的日期';
    $('#option-prev').hidden=$('#option-next').hidden=!paged;
    $('#option-prev').disabled=choicePage===0;$('#option-next').disabled=(choicePage+1)*size>=choice.options.length;
    const grid=$('#option-grid');grid.classList.toggle('is-days',choice.kind==='day');
    grid.setAttribute('aria-label',choice.title);
    grid.innerHTML=shown.map((o,i)=>`<button type="button" class="picker-tile ${o.value===choice.value?'chosen':''}" data-option-index="${choicePage*size+i}" aria-pressed="${o.value===choice.value}">${escapeHTML(o.label)}${o.value===choice.value?'<small class="picker-now">已选择</small>':''}</button>`).join('');
    $('#option-summary').textContent=`已选 · ${choice.options.find(o=>o.value===choice.value)?.label||''}`;
  }
  function choose(config){choice=config;choice.value=String(choice.value);const index=choice.options.findIndex(o=>o.value===choice.value);choicePage=choice.options.length>36?Math.max(0,Math.floor(index/12)):0;renderOptions();optionSheet.showModal();}
  $('#option-prev').addEventListener('click',()=>{choicePage--;renderOptions();});
  $('#option-next').addEventListener('click',()=>{choicePage++;renderOptions();});
  $('#option-grid').addEventListener('click',event=>{const tile=event.target.closest('[data-option-index]');if(tile){choice.value=choice.options[Number(tile.dataset.optionIndex)].value;renderOptions();}});
  $('#option-confirm').addEventListener('click',()=>{const {onSelect,value}=choice;optionSheet.close();onSelect(value);syncFields();});
  const selectIds=['festival-year','lunar-year','lunar-month','lunar-day'];
  for(const id of selectIds){
    const select=$('#'+id);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
    select.insertAdjacentHTML('afterend',`<button id="${id}-trigger" type="button" class="field-select" aria-haspopup="dialog" aria-controls="option-dialog"><span></span>${icon('chevron-right')}</button>`);
    $('#'+id+'-trigger').addEventListener('click',()=>choose({title:select.getAttribute('aria-label')||'选择日期',kind:id==='lunar-day'?'day':'',value:select.value,options:[...select.options].map(o=>({value:o.value,label:o.textContent})),onSelect:value=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}}));
    select.addEventListener('change',syncFields);
    new MutationObserver(syncFields).observe(select,{childList:true,subtree:true});
  }

  const dateSheet=createSheet('day-picker-dialog','选择公历日期','日有来处 · 月有圆缺','日',`<div class="date-preview"><span id="day-picked-solar"></span><strong id="day-picked-lunar"></strong></div><div class="date-month-bar"><button id="day-prev-month" class="picker-step" aria-label="上个月">${icon('chevron-left')}</button><div><button id="day-year-mode" type="button"></button><button id="day-month-mode" type="button"></button></div><button id="day-next-month" class="picker-step" aria-label="下个月">${icon('chevron-right')}</button></div><div class="date-weekdays" aria-hidden="true">${['一','二','三','四','五','六','日'].map(x=>'<span>'+x+'</span>').join('')}</div><div id="day-picker-grid" class="date-picker-grid" role="group" aria-label="选择日期"></div><div class="sheet-bottom"><button id="day-picker-today" class="picker-current">回到今天</button><span>1901—2100 年</span></div><button id="day-picker-confirm" type="button" class="primary-button">确定日期 ${icon('check')}</button>`);
  let dateTarget=null,draftDate=today;
  function renderDate(){
    const [y,m,d]=dateParts(draftDate),data=getData(draftDate);$('#day-year-mode').textContent=y+'年';$('#day-month-mode').textContent=m+'月';
    $('#day-picked-solar').textContent=`${y}年${m}月${d}日 · 星期${data.solar.getWeekInChinese()}`;$('#day-picked-lunar').textContent='农历'+data.lunarText;
    const offset=(utcDate(key(y,m,1)).getUTCDay()+6)%7,count=new Date(Date.UTC(y,m,0)).getUTCDate();
    $('#day-picker-grid').innerHTML=Array.from({length:offset},()=>'<span></span>').join('')+Array.from({length:count},(_,i)=>{
      const value=key(y,m,i+1),entry=getData(value);return `<button type="button" class="date-tile ${value===draftDate?'chosen':''} ${value===today?'is-today':''}" data-choose-date="${value}" aria-label="${m}月${i+1}日，农历${escapeHTML(entry.lunarText)}" aria-pressed="${value===draftDate}"><strong>${i+1}</strong><small>${entry.term||entry.festivals[0]||entry.lunar.getDayInChinese()}</small></button>`;
    }).join('');
    $('#day-prev-month').disabled=y===1901&&m===1;$('#day-next-month').disabled=y===2100&&m===12;
  }
  function changeDateMonth(y,m){const day=Math.min(dateParts(draftDate)[2],new Date(Date.UTC(y,m,0)).getUTCDate());draftDate=key(y,m,day);renderDate();}
  for(const id of ['jump-date','note-date','solar-date']){
    const input=$('#'+id);input.type='hidden';
    input.insertAdjacentHTML('afterend',`<button id="${id}-trigger" type="button" class="date-field" aria-haspopup="dialog" aria-controls="day-picker-dialog">${icon('calendar')}<span><strong></strong><small></small></span>${icon('chevron-right')}</button>`);
    $('#'+id+'-trigger').addEventListener('click',()=>{dateTarget=input;draftDate=isValidDate(input.value)?input.value:today;renderDate();dateSheet.showModal();});
    input.addEventListener('change',syncFields);
  }
  for(const [id,delta] of [['day-prev-month',-1],['day-next-month',1]])$('#'+id).addEventListener('click',()=>{const [y,m]=dateParts(draftDate),date=new Date(Date.UTC(y,m-1+delta,1));changeDateMonth(date.getUTCFullYear(),date.getUTCMonth()+1);});
  $('#day-year-mode').addEventListener('click',()=>choose({title:'选择公历年份',value:String(dateParts(draftDate)[0]),options:Array.from({length:200},(_,i)=>({value:String(1901+i),label:`${1901+i}年`})),onSelect:value=>changeDateMonth(Number(value),dateParts(draftDate)[1])}));
  $('#day-month-mode').addEventListener('click',()=>choose({title:'选择公历月份',value:String(dateParts(draftDate)[1]),options:Array.from({length:12},(_,i)=>({value:String(i+1),label:`${i+1}月`})),onSelect:value=>changeDateMonth(dateParts(draftDate)[0],Number(value))}));
  $('#day-picker-grid').addEventListener('click',event=>{const tile=event.target.closest('[data-choose-date]');if(tile){draftDate=tile.dataset.chooseDate;renderDate();}});
  $('#day-picker-today').addEventListener('click',()=>{draftDate=today;renderDate();});
  $('#day-picker-confirm').addEventListener('click',()=>{dateTarget.value=draftDate;dateTarget.dispatchEvent(new Event('change',{bubbles:true}));dateSheet.close();syncFields();});
  function syncFields(){
    for(const id of selectIds){const select=$('#'+id),span=$('#'+id+'-trigger span');if(span)span.textContent=select.selectedOptions[0]?.textContent||'请选择';}
    for(const id of ['jump-date','note-date','solar-date']){const trigger=$('#'+id+'-trigger'),value=$('#'+id).value;if(!trigger)continue;if(isValidDate(value)){const [y,m,d]=dateParts(value);$('strong',trigger).textContent=`${y}年${m}月${d}日`;$('small',trigger).textContent='农历'+getData(value).lunarText;}else{$('strong',trigger).textContent='选择日期';$('small',trigger).textContent='查看对应农历';}}
    $('#note-counter').textContent=`${body.value.length} / 500`;
  }
  const baseOpenNote=openNote;openNote=function(id){baseOpenNote(id);syncFields();};
  const baseSetView=setView;setView=function(view){baseSetView(view);syncFields();};

  const deleteSheet=createSheet('delete-dialog','删除这条记事？','留存有时 · 整理有序','记',`<div class="delete-note-preview"><span id="delete-note-date"></span><h3 id="delete-note-title"></h3><p>删除后无法恢复，请确认是否继续。</p></div><div class="sheet-actions"><button type="button" class="secondary-button" data-close="delete-dialog">再想想</button><button type="button" id="delete-confirm" class="primary-button">确认删除</button></div>`);
  let deleteId=null;
  window.requestDeleteNote=note=>{deleteId=note.id;$('#delete-note-title').textContent=note.title;$('#delete-note-date').textContent=note.date;deleteSheet.showModal();};
  $('#delete-confirm').addEventListener('click',()=>{if(deleteId&&saveNotes(notes.filter(n=>n.id!==deleteId))){deleteSheet.close();renderNotes();toast('记事已删除');}});

  const help=$('#help-dialog');help.classList.add('app-sheet');help.innerHTML=heading('help-dialog','和岁时，慢慢过日子','岁时 · 使用指南','时')+`<div class="help-hero"><span>岁时万年历</span><strong>日子有序，心有所记。</strong><small>安卓版 1.2.0 · 公历 1901—2100 年</small></div><div class="guide-grid"><article>${icon('calendar')}<h3>看农历</h3><p>点选日期查看农历、节日与节气。左右滑动翻月，轻点年月快速跳转。</p></article><article>${icon('swap')}<h3>换日期</h3><p>公历、农历双向转换。闰月单独列出，按实际农历月份选择。</p></article><article>${icon('notebook')}<h3>记日常</h3><p>生日、纪念日和小事留在这里。记事保存在本机，卸载或清除数据后会丢失。</p></article></div><section class="holiday-sync-card"><div class="sync-heading">${icon('calendar')}<h3>放假与补班</h3><span class="sync-tag">自动更新</span></div><p><b class="inline-holiday badge-rest">休</b> 放假休息 <b class="inline-holiday badge-work">班</b> 调休上班</p><strong id="holiday-sync-status"></strong><small id="holiday-sync-time"></small><button id="holiday-sync-button" type="button" class="secondary-button" data-holiday-refresh>更新安排</button></section><div class="help-footnote">日期以中国标准时间为准。节日按历法计算，放假安排以官方通知为准；联网获取第三方整理数据，未公布的年份不推算调休。</div><div class="help-links"><a href="https://timor.tech/api/holiday/" target="_blank" rel="noopener noreferrer">假日数据 ${icon('external')}</a><a href="https://github.com/6tail/lunar-javascript" target="_blank" rel="noopener noreferrer">历法来源 ${icon('external')}</a><button id="license-trigger" type="button">开源许可 ${icon('external')}</button></div>`;
  const licenseSheet=createSheet('license-dialog','开源许可','岁时 · 致谢','历','<div class="license-intro">历法数据 · lunar-javascript 1.7.7</div><pre id="license-content">正在读取…</pre><button type="button" class="primary-button" data-close="license-dialog">我知道了</button>');
  $('#license-trigger').addEventListener('click',()=>{licenseSheet.showModal();fetch('./vendor/LICENSE-lunar.txt').then(r=>r.text()).then(t=>$('#license-content').textContent=t).catch(()=>$('#license-content').textContent='许可文件暂时无法读取，请查看源码中的 MIT 许可。');});

  // Scroll the content inside an opaque surface. Scrolling the top-layer dialog itself
  // can leave stale background tiles in Android WebView when the panel is tall.
  for(const sheet of $$('dialog.app-sheet')){
    const content=document.createElement('div');content.className='sheet-scroll';
    content.append(...sheet.childNodes);sheet.append(content);
  }

  // Track the modal stack for back navigation, nested date panels and scroll locking.
  const stack=[];window.SuishiCloseTopDialog=()=>{stack.filter(d=>d.open).at(-1)?.close();};
  const originalShow=HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal=function(){
    const index=stack.indexOf(this);if(index>=0)stack.splice(index,1);stack.push(this);
    originalShow.call(this);document.body.classList.add('has-sheet');
    if(this.id==='help-dialog')SuishiHolidayData.updateHelp();syncFields();
  };
  for(const sheet of $$('dialog')){
    sheet.addEventListener('close',()=>{if(sheet.open)return;const index=stack.indexOf(sheet);if(index>=0)stack.splice(index,1);document.body.classList.toggle('has-sheet',stack.some(d=>d.open));});
    sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const r=sheet.getBoundingClientRect();if(event.clientY<r.top||event.clientY>r.bottom||event.clientX<r.left||event.clientX>r.right)sheet.close();});
  }
  syncFields();
})();
