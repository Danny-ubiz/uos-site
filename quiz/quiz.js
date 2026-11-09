var CONFIG = { LEAD_ENDPOINT: '' };   /* ריק = תצוגה מקדימה, שום דבר לא נשלח */

var $ = function(s,r){return (r||document).querySelector(s)};
var app = $('#app');
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function by(arr,id){return arr.filter(function(x){return x.id===id})[0]}

var st = {step:1, type:null, size:null, needs:[], feel:null, tools:[], freed:null, name:'', biz:''};
var TOTAL = 6;

function ctx(){
  var t = by(TYPES, st.type) || TYPES[TYPES.length-1];
  var o = {};
  for (var k in t) o[k] = t[k];
  o.biz = st.biz || 'העסק שלכם';
  o.bn = st.biz || '[שם העסק]';
  return o;
}
function fill(s){
  var c = ctx();
  return String(s).replace(/\{(\w+)\}/g, function(m,k){ return c[k] != null ? c[k] : m });
}
/* הצרכים שמוצגים תלויים בסוג העסק, וגם התווית יכולה להשתנות לפי הסוג */
function typeNeeds(){
  var t = by(TYPES, st.type) || TYPES[TYPES.length-1];
  return (t.needs || NEEDS.map(function(x){return x.id})).map(function(id){return by(NEEDS,id)}).filter(Boolean);
}
function needLabel(x){ return fill((x.lab && x.lab[st.type]) || x.label) }

function progress(n){
  var h = '<div class="prog" role="progressbar" aria-valuemin="1" aria-valuemax="'+TOTAL+'" aria-valuenow="'+n+'">';
  for (var i=1;i<=TOTAL;i++) h += '<i class="'+(i<n?'on':(i===n?'cur':''))+'"></i>';
  return h + '<span>שאלה '+n+' מתוך '+TOTAL+'</span></div>';
}
function backBtn(){ return st.step>1 ? '<button class="btn ghost" data-act="back">חזרה</button>' : '' }

function render(){
  var s = st.step;
  if (s===0) return intro();
  if (s>=1 && s<=6) return question(s);
  if (s===7) return nameStep();
  if (s===8) return loading();
  if (s===9) return result();
}
function post(m){try{parent.postMessage(m,location.origin)}catch(e){}}
function go(n){ st.step = n; render(); post({type:'qz-top'}); var h = $('h1,h2'); if (h){h.setAttribute('tabindex','-1'); h.focus({preventScroll:true})} }

/* ===== מסכים ===== */
function intro(){
  app.innerHTML =
    '<div class="intro rise"><div><span class="kick"><i class="tg"></i>שש שאלות קצרות</span>'+
    '<h1>איך ייראה הבוקר שלכם<br><em>עם עוזרים?</em></h1>'+
    '<p class="lead">ספרו לנו על העסק ועל מה שלוקח לכם זמן, ותראו איזה עוזר יכול לקחת את זה, ואיך זה ייראה אצלכם.</p>'+
    '<div class="facts"><span><b>שישה עוזרים</b>לכל אחד תחום משלו</span><span><b>אתם מאשרים</b>כל דבר לפני שהוא יוצא</span></div>'+
    '<div class="bar"><button class="btn" data-act="start">מתחילים</button></div></div>'+
    '<div class="art"><img src="img/team6.webp" alt="הצוות: שישה עוזרים"></div></div>';
}

function opts(list, cur, multi){
  return '<div class="opts">'+list.map(function(o){
    var on = multi ? cur.indexOf(o.id)>-1 : cur===o.id;
    return '<button class="opt" data-id="'+o.id+'" aria-pressed="'+on+'"><i class="tg"></i><span>'+esc(o.label)+'</span></button>';
  }).join('')+'</div>';
}

function head(t,l){ return '<div class="head"><h2>'+t+'</h2><p class="lead">'+l+'</p></div>' }
function question(n, again){
  var h = progress(n), body = '';
  if (n===1){
    h += head('איזה עסק יש לכם?','בחרו את מה שהכי קרוב. לא חייב להיות מדויק.') + opts(TYPES, st.type);
  } else if (n===2){
    h += head('כמה אנשים עובדים בעסק?','כולל אתם.') + opts(SIZES, st.size);
  } else if (n===3){
    var full = st.needs.length>=2;
    h += head('מה לוקח לכם הכי הרבה זמן?','בחרו עד שני דברים. אם זה לא ברשימה, בחרו "משהו אחר".');
    h += '<div class="opts">';
    typeNeeds().forEach(function(x){
      var on = st.needs.indexOf(x.id)>-1;
      h += '<button class="opt" data-id="'+x.id+'" aria-pressed="'+on+'"'+(full&&!on?' disabled':'')+'><i class="tg"></i><span>'+esc(needLabel(x))+'</span></button>';
    });
    h += '</div>';
    body = '<div class="bar">'+backBtn()+'<button class="btn" data-act="next" '+(st.needs.length?'':'disabled')+'>המשך</button><span class="cnt">נבחרו '+st.needs.length+' מתוך 2</span></div>';
  } else if (n===4){
    h += head('איך זה מרגיש היום?','בחרו את מה שהכי קרוב.') + opts(FEELS, st.feel);
  } else if (n===5){
    var fullT = st.tools.length>=3;
    h += head('איפה אתם מנהלים את העסק היום?','בחרו עד שלושה.')+'<div class="opts">'+TOOLS.map(function(o){
      var on = st.tools.indexOf(o.id)>-1;
      return '<button class="opt" data-id="'+o.id+'" aria-pressed="'+on+'"'+(fullT&&!on?' disabled':'')+'><i class="tg"></i><span>'+esc(o.label)+'</span></button>';
    }).join('')+'</div>';
    body = '<div class="bar">'+backBtn()+'<button class="btn" data-act="next" '+(st.tools.length?'':'disabled')+'>המשך</button><span class="cnt">נבחרו '+st.tools.length+' מתוך 3</span></div>';
  } else if (n===6){
    h += head('ואם יתפנה לכם זמן, על מה תרצו לשים אותו?','זו השאלה האחרונה.') + opts(FREED, st.freed);
  }
  if (!body && n!==1) body = '<div class="bar">'+backBtn()+'</div>';
  var num = n<10?'0'+n:n;
  app.innerHTML = '<div class="q'+(again?'':' rise')+'"><div class="bignum" aria-hidden="true">'+num+'</div>'+h+body+'</div>';
}

function nameStep(){
  app.innerHTML = '<div class="q rise"><div class="bignum" aria-hidden="true">07</div>'+
    head('איך לקרוא לכם?','לא חובה. נכניס את השמות לתוצאה, כדי שתראו איך זה ייראה אצלכם.')+
    '<div class="two"><label class="field"><span>השם שלכם</span><input id="fName" value="'+esc(st.name)+'" autocomplete="given-name"></label>'+
    '<label class="field"><span>שם העסק</span><input id="fBiz" value="'+esc(st.biz)+'" autocomplete="organization"></label></div>'+
    '<div class="bar">'+backBtn()+'<button class="btn" data-act="make">הראו לי את התוצאה</button></div></div>';
}

function chosenNeeds(){
  var n = st.needs.map(function(id){return by(NEEDS,id)});
  n.sort(function(a,b){return (a.fit==='exact'?0:1)-(b.fit==='exact'?0:1)});
  return n;
}

function loading(){
  var needs = chosenNeeds();
  var seen = {}, crew = [];
  needs.forEach(function(n){ if(!seen[n.a]){seen[n.a]=1; crew.push(n.a)} });
  app.innerHTML = '<div class="load rise"><div class="sw" aria-hidden="true"></div><h2>הצוות שלכם מתארגן</h2><div class="crew">'+
    crew.map(function(k){return '<figure><img src="img/'+k+'-face.webp" alt=""><figcaption>'+WHO[k].n+'</figcaption></figure>'}).join('')+
    '</div><div class="step-line" id="stepLine"></div></div>';
  var lines = ['מני עובר על התשובות שלכם','ומתאים את העוזרים לעסק','עוד רגע זה מוכן'];
  var figs = app.querySelectorAll('figure'), li = $('#stepLine');
  if (reduce){ go(9); return; }
  figs.forEach(function(f,i){ setTimeout(function(){f.classList.add('in')}, 250+i*420) });
  lines.forEach(function(t,i){ setTimeout(function(){li.textContent = t}, 200+i*900) });
  setTimeout(function(){ if(st.step===8) go(9) }, 3000);
}

/* ===== תוצאה ===== */
function demoHtml(n){
  if (!n.lines) return '';
  var h = '<div class="demo"><div class="lbl">דוגמה להמחשה</div>';
  n.lines.forEach(function(l){
    var k = l[0];
    if (k==='h') h += '<div class="dh">'+esc(fill(l[1]))+'</div>';
    else if (k==='li') h += '<div class="dli">'+esc(fill(l[1]))+'</div>';
    else if (k==='in'||k==='out') h += '<div class="bub '+k+'">'+esc(fill(l[1]))+(l[2]?'<small>'+l[2]+'</small>':'')+'</div>';
    else if (k==='row') h += '<div class="drow"><b>'+esc(fill(l[1]))+'</b><span>'+esc(fill(l[2]))+'</span></div>';
  });
  return h + '</div>';
}

function cardHtml(n, i){
  var w = WHO[n.a], ex = n.fit==='exact';
  var left = '<div class="who"><div class="av"><img src="img/'+n.a+'-face.webp" alt=""></div><div><b>'+w.n+'</b><small>'+w.role+'</small></div></div>'+
    '<h3>'+esc(fill(n.title))+'</h3><ul class="does">'+n.does.map(function(d){return '<li>'+esc(fill(d))+'</li>'}).join('')+'</ul>';
  var right;
  if (ex){
    right = demoHtml(n);
  } else {
    right = n.fit==='custom'
      ? '<div class="near"><p><b>בצוות שלנו</b> '+w.n+' '+esc(fill(n.ours))+'.</p><p><b>אצלכם:</b> '+esc(fill(n.yours))+'.</p></div>'
      : '<div class="near"><p><b>בצוות שלנו</b> '+w.n+' '+esc(fill(n.ours))+'.</p><p><b>אצלכם נוכל להוסיף:</b> '+esc(fill(n.yours))+'.</p></div>';
  }
  return '<article class="card"><div>'+left+'</div><div>'+right+'</div></article>';
}

function listHe(a){ if(a.length<2) return a.join(''); return a.slice(0,-1).join(', ')+' ו'+a[a.length-1] }


function labs(arr,list,key){return arr.map(function(id){var o=by(list,id);return o?(o[key||'label']||''):''})}
function summaryObj(){
  var t=by(TYPES,st.type),s=by(SIZES,st.size),f=by(FEELS,st.feel),r=by(FREED,st.freed);
  return {type:t&&t.label,size:s&&s.label,needs:st.needs.map(function(id){return needLabel(by(NEEDS,id))}),feel:f&&f.label,tools:labs(st.tools,TOOLS),freed:r&&r.label,name:st.name,biz:st.biz};
}
function summaryText(){
  var o=summaryObj();
  return 'סוג עסק: '+o.type+'. גודל: '+o.size+'. מה מעיק: '+o.needs.join(', ')+'. איך זה מרגיש: '+o.feel+'. איפה הדברים קורים: '+o.tools.join(', ')+'. מה עושים עם הזמן שמתפנה: '+o.freed+'.';
}
function result(){
  var needs = chosenNeeds(), sz = by(SIZES,st.size), fl = by(FEELS,st.feel), fr = by(FREED,st.freed);
  var title = (st.name?esc(st.name)+', ':'')+'כך ייראה הבוקר'+(st.biz?' ב'+esc(st.biz):' שלכם');
  var tools = st.tools.filter(function(id){return id!=='head'}).map(function(id){return by(TOOLS,id).t});
  var head = st.tools.indexOf('head')>-1;
  var toolsLine = (tools.length?'אצלכם הדברים קורים '+listHe(tools)+', ומשם נתחיל. בשיחה נבדוק מה אפשר לחבר לעוזרים.':'')+(head?(tools.length?' ואת':'את')+' מה שיושב לכם בראש ובפתקים נרכז קודם ברשימה אחת.':'');
  var exact = needs.filter(function(n){return n.fit==='exact'});
  var names = []; exact.forEach(function(n){ var nm=WHO[n.a].n; if(names.indexOf(nm)<0) names.push(nm) });
  var ctaTitle = names.length ? 'רוצים שנכין לכם את '+listHe(names)+'?' : 'בואו נבנה את זה יחד';

  app.innerHTML =
    '<section class="res rise"><div class="tophead"><span class="tag">הבוקר שלכם</span><span class="clock">08:00</span></div><h1>'+title+'</h1>'+
    '<p class="sub">'+esc(sz.line)+' '+esc(fl.line)+'</p>'+
    needs.map(cardHtml).join('')+
    '<p class="line">'+esc(toolsLine)+'</p>'+
    '<p class="line">אתם מאשרים כל דבר לפני שהוא יוצא. '+esc(fr.line)+'</p>'+
    '<p class="note">זו דוגמה להמחשה לפי התשובות שלכם. בפועל נבנה את העוזרים על העסק שלכם, והם יתחילו לעבוד רק אחרי שתאשרו.</p>'+
    '<div class="sv" id="qzx"><button class="btn" data-act="contact">תכינו לי את זה</button><button class="btn ghost" data-act="print">שמירה או הדפסה</button><button class="btn ghost" data-act="restart">להתחיל מחדש</button></div></section>';
  post({type:'qz-done',quiz:summaryObj(),summary:summaryText()});

}

/* ===== אירועים ===== */
app.addEventListener('click', function(e){
  var b = e.target.closest('button'); if(!b) return;
  var act = b.getAttribute('data-act'), id = b.getAttribute('data-id'), s = st.step;
  if (act==='start') return go(1);
  if (act==='back') return go(s-1);
  if (act==='next') return go(s+1);
  if (act==='restart'){ st = {step:1,type:null,size:null,needs:[],feel:null,tools:[],freed:null,name:'',biz:''}; return go(1); }
  if (act==='make'){ st.name = $('#fName').value.trim().slice(0,40); st.biz = $('#fBiz').value.trim().slice(0,60); return go(8); }
  if (act==='approve'){
    var i = b.getAttribute('data-i'), d = $('#done'+i);
    b.classList.add('hide'); b.nextElementSibling.classList.add('hide');
    d.classList.remove('hide'); d.textContent = 'אושר. העוזר הכין, ואתם החלטתם.'; return;
  }
  if (act==='tweak'){ var t = b.closest('.ap').previousElementSibling; t.contentEditable = 'true'; t.focus(); b.textContent = 'אפשר לערוך את הטקסט'; b.disabled = true; return; }
  if (act==='contact'){ post({type:'qz-contact'}); return; }
  if (act==='print'){ window.print(); return; }
  if (act==='form'){ $('#lead').classList.remove('hide'); b.classList.add('hide'); var f = $('#lead input[name=email]'); f.focus(); return; }
  if (!id) return;
  if (s===1){ st.type = id; var ok = typeNeeds().map(function(x){return x.id}); st.needs = st.needs.filter(function(n){return ok.indexOf(n)>-1}); return setTimeout(function(){go(2)}, 160); }
  if (s===2){ st.size = id; return setTimeout(function(){go(3)}, 160); }
  if (s===4){ st.feel = id; return setTimeout(function(){go(5)}, 160); }
  if (s===6){ st.freed = id; return setTimeout(function(){go(7)}, 160); }
  if (s===3 || s===5){
    var arr = s===3 ? st.needs : st.tools, max = s===3 ? 2 : 3, ix = arr.indexOf(id);
    if (ix>-1) arr.splice(ix,1); else if (arr.length<max) arr.push(id);
    var y = window.scrollY; question(s,true); window.scrollTo(0,y); return;
  }
});

app.addEventListener('submit', function(e){
  e.preventDefault();
  var f = e.target, m = $('#formMsg'), email = f.email.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ m.textContent = 'נראה שכתובת המייל לא תקינה, אפשר לבדוק שוב?'; return; }
  var payload = {
    name:f.name.value.trim(), email:email, phone:f.phone.value.trim(), note:f.note.value.trim(),
    quiz:{type:st.type,size:st.size,needs:st.needs,feel:st.feel,tools:st.tools,freed:st.freed,biz:st.biz}
  };
  if (!CONFIG.LEAD_ENDPOINT){ m.textContent = 'תצוגה מקדימה: הטופס עדיין לא מחובר ולא נשלח דבר.'; return; }
  fetch(CONFIG.LEAD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(r){ if(!r.ok) throw 0; f.innerHTML = '<div class="thanks">קיבלנו. נחזור אליכם.</div>'; })
    .catch(function(){ m.textContent = 'משהו השתבש בשליחה. אפשר לנסות שוב?'; });
});

render();

function reportH(){post({type:'qz-h',h:Math.ceil(app.getBoundingClientRect().height),res:st.step>=8})}
if(window.ResizeObserver){new ResizeObserver(reportH).observe(app)}
window.addEventListener('load',reportH);reportH();
