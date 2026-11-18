/* ההדגמה של UOS ב-uos.co.il/demo.
   המסכים כאן הם בדיוק המסכים של UOS שרצים אצל לקוח (web/static במאגר uos). אצל לקוח הם מדברים עם
   השירות שרץ על המחשב של העסק, דרך remote.js. כאן הקובץ הזה בא במקום remote.js: הוא מחזיק בדפדפן
   מצב לדוגמה ועונה למסך באותן תשובות שהשירות עונה. שום דבר לא יוצא מהדפדפן ושום דבר לא נשמר. */
(() => {
'use strict';

/* ---------- זמן ---------- */
const pad = (n) => (n < 10 ? '0' : '') + n;
const minNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
/* when לפני כמה דקות: "היום 14:05", או "אתמול 23:50" כשזה עבר את חצות */
function ago(min) {
  const t = new Date(Date.now() - min * 60000), hm = pad(t.getHours()) + ':' + pad(t.getMinutes());
  return (t.toDateString() === new Date().toDateString() ? 'היום ' : 'אתמול ') + hm;
}
const at = (min) => ago(min).split(' ')[1];
const mAgo = (min) => Math.max(0, minNow() - min);
const todayText = () => new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

/* ---------- המצב לדוגמה ---------- */
const LEVELS = {
  1: ['קורא ומציע', 'לא נוגע בכלום, רק מראה לכם מה הוא היה עושה.'],
  2: ['מכין ואתם מאשרים', 'מכין את כל העבודה, ואתם מאשרים כל פעולה לפני שהיא יוצאת.'],
  3: ['פעולות קטנות לבד', 'מבצע לבד דברים קטנים שהגדרתם, ומדווח לכם אחר כך.'],
  4: ['עצמאי בתחום', 'עצמאי בתחום מוגדר, עם מתג כיבוי ובדיקה יומית.']
};
/* התוויות של העבודה, כמו שהשירות שולח אותן לכל עובד אפשרי */
const WORK = {
  meni: { f: 0, units: [['משימה אחת', 'משימות', 18], ['בדיקה אחת', 'בדיקות', 9]], jobs: [['מחלק משימה לצוות', 'חילק משימה לצוות', 0], ['בודק תוצר של הצוות', 'בדק תוצר של הצוות', 1]] },
  gabi: { f: 1, units: [['בדיקה אחת', 'בדיקות חשבוניות', 9], ['תזכורת אחת', 'תזכורות', 6]], jobs: [['בודקת חשבוניות פתוחות', 'בדקה חשבוניות פתוחות', 0], ['מכינה תזכורת על חשבונית', 'הכינה תזכורת על חשבונית', 1]] },
  lidor: { f: 0, units: [['פנייה אחת', 'פניות', 21], ['סינון אחד', 'סינונים', 6]], jobs: [['עונה לפנייה חדשה', 'ענה לפנייה חדשה', 0], ['מסנן פניות שנכנסו', 'סינן פניות שנכנסו', 1]] },
  oz: { f: 0, units: [['סידור יומן אחד', 'סידורי יומן', 4], ['סיכום פגישה אחד', 'סיכומי פגישה', 5], ['טיוטה אחת', 'טיוטות', 14]], jobs: [['מסדר את היומן של מחר', 'סידר את היומן של מחר', 0], ['מכין סיכום לפגישה', 'הכין סיכום לפגישה', 1], ['מכין טיוטה למייל', 'הכין טיוטה למייל', 2]] },
  pesi: { f: 1, units: [['פוסט אחד', 'פוסטים', 7], ['תוכנית שבוע אחת', 'תוכניות שבוע', 1], ['בדיקת תגובות אחת', 'בדיקות תגובות', 5]], jobs: [['מכינה פוסט לשבוע הבא', 'הכינה פוסט לשבוע הבא', 0], ['מתכננת את הפוסטים של השבוע', 'תכננה את הפוסטים של השבוע', 1], ['בודקת תגובות בעמוד', 'בדקה תגובות בעמוד', 2]] }
};
const MEM_WILL = 'אם תאשרו, מני יזכור את זה בכל שיחה מעכשיו. אפשר למחוק את זה בכל רגע, בכרטיס של מני.';

const TEAM = [
  { id: 'leads', title: 'עוזר לפניות', does: 'עונה לפניות מהאתר ומהוואטסאפ, שואל את שאלות ההיכרות וקובע פגישה ביומן.',
    conns: [
      { name: 'Gmail', state: 'todo', need: 'הרשאה לקרוא את התיבה של העסק ולהכין טיוטות' },
      { name: 'יומן Google', state: 'todo', need: 'הרשאה לראות זמנים פנויים ולקבוע פגישה' },
      { name: 'WhatsApp Business', state: 'wait', need: 'מחכה לאישור של מטא לחיבור החשבון' }] },
  { id: 'billing', title: 'עוזר לגבייה', does: 'עוקב אחרי חשבוניות פתוחות ומכין תזכורת עדינה ללקוח שעוד לא שילם.',
    conns: [
      { name: 'מערכת החשבוניות', state: 'todo', need: 'מפתח גישה לקריאה בלבד' },
      { name: 'Gmail', state: 'todo', need: 'אותה הרשאה של עוזר הפניות' }] },
  { id: 'social', title: 'עוזר לסושיאל', does: 'מכין טיוטות לפוסטים של השבוע, לפי התוכנית של יום ראשון.',
    conns: [
      { name: 'עמוד הפייסבוק', state: 'wait', need: 'מחכה לאישור של מטא' },
      { name: 'אינסטגרם', state: 'wait', need: 'מחכה לאישור של מטא' },
      { name: 'Canva', state: 'none', need: 'הטיוטות נשמרות כקבצים בתיקייה, ומשם מעלים' }] }
];

function seed() {
  const m = minNow();
  const learnItems = [
    { t: 'me', text: 'אני רוצה ללמד אותך על העסק. תשאל אותי שאלה אחת בכל פעם, ומה שכדאי לזכור תציע לי לאישור.', at: '19:20', st: 'ok' },
    { t: 'w', text: 'בשמחה. נתחיל מהבסיס: מה העסק עושה, ולמי?', at: '19:20' },
    { t: 'me', text: 'סטודיו קטן לעיצוב גרפי ומיתוג. רוב הלקוחות הם עסקים קטנים ועמותות באזור המרכז.', at: '19:22', st: 'ok' },
    { t: 'w', text: 'הבנתי. הצעתי לזכור את זה, כדי שאדע את זה בכל שיחה.\n\nעכשיו לשירותים. ראיתי בתיקיית העסק את "מחירון 2026". המחירים שם עדיין בתוקף?', at: '19:22' },
    { t: 'note', text: 'לזכור: סטודיו קטן לעיצוב גרפי ומיתוג: אושר' },
    { t: 'me', text: 'כן, חוץ מהריטיינר של הסושיאל, שעלה ל-1,900 בחודש.', at: '19:24', st: 'ok' },
    { t: 'w', text: 'עדכנתי את המחיר בהצעה לזכור. עוד שאלה על הלקוחות: איך עובדים מול לקוח חדש, מהפנייה ועד שמתחילים?', at: '19:24' },
    { t: 'note', text: 'לזכור: מחירים: לוגו ומיתוג מ-3,500 ש"ח: אושר' },
    { t: 'me', text: 'הוא מקבל שאלון היכרות, נפגשים, שולחים הצעת מחיר, ומתחילים אחרי מקדמה של 40%.', at: '19:27', st: 'ok' },
    { t: 'w', text: 'ברור. סיימנו את כל הנושאים, חוץ מהצוות שדילגת עליו כי כרגע אתה עובד לבד.\n\nלפי מה שסיפרת, רוב הזמן הולך על מענה לפניות ועל מעקב אחרי תשלומים. לכן אני מציע שלושה עובדים: עוזר לפניות, עוזר לגבייה ועוזר לסושיאל. ההצעה המלאה, עם החיבורים שכל אחד צריך, מחכה לאישור שלך.', at: '19:33' },
    { t: 'note', text: 'הצעת צוות: 3 עובדים: אושר' }
  ];
  const openItems = [
    { t: 'me', text: 'מה נשאר פתוח השבוע?', at: at(52), st: 'ok' },
    { t: 'w', text: 'לפי הקבצים בתיקיית העסק, שלושה דברים:\n\nהצעת המחיר למאפייה נשלחה ביום ראשון, ועוד אין תשובה. אפשר להכין להם תזכורת קצרה.\n\nהמיתוג לעמותה מחכה לסבב התיקונים השני, עד יום חמישי.\n\nותוכנית הפוסטים של השבוע הבא, שבדרך כלל מכינים ביום ראשון.', at: at(51) },
    { t: 'me', text: 'תכין לי טיוטה לתזכורת למאפייה', at: at(12), st: 'ok' },
    { t: 'w', text: 'הכנתי טיוטה קצרה, בטון שביקשת לזכור: חם, קצר ובלי סימני קריאה. היא מחכה לאישור שלך בתור, ואחרי האישור היא נשמרת בתיקייה שלי. שום דבר לא נשלח למאפייה.', at: at(11) }
  ];
  const mailItems = [
    { t: 'me', text: 'איך לנסח מייל ללקוח שמבקש עוד סבב תיקונים מעבר למה שסגרנו?', at: '17:05', st: 'ok' },
    { t: 'w', text: 'הצעה:\n\n"שמחים שאתם מעורבים בתהליך. ההצעה שסגרנו כוללת שני סבבי תיקונים, וסבב נוסף מתומחר ב-450 ש"ח. אם זה מתאים, נתחיל כבר מחר."\n\nזה בגוף שני רבים, כמו שביקשת לפנות ללקוחות.', at: '17:06' }
  ];
  const ST = {
    owner: { name: 'דני', mail: 'danny@example.co.il', computer: 'OFFICE-MAC', os: 'macOS' },
    computer: { name: 'OFFICE-MAC', os: 'macOS', reporting: true, since: 'אתמול ב-19:12', status: 'connected' },
    halted: false, zero: false,
    clock: { start: 420, end: 1140, m },
    levels: LEVELS, work: WORK,
    chips: ['מה נשאר פתוח להיום?', 'מה אתה יודע על העסק?'],
    workers: [{
      id: 'meni', name: 'מני', title: 'מנהל הצוות', scope: 'מקבל מכם משימות, מחלק לצוות ובודק כל תוצר',
      level: 2, enabled: true, hb: 'לפני דקה', run: 'בלי לוח זמנים, רץ כשמבקשים', next: 'כשתכתבו לו',
      /* כמו בשירות: אצל מני הימים סופרים שיחות שהתעדכנו באותו יום, ואין לו ריצות ופיד כמו לעובדים */
      days: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1], blockedDay: -1, lessons: [0, 0],
      log: [['אתמול 19:12', 'הצטרף לצוות', 'ok']],
      st: 'idle', start: 0, endAt: 0, jobI: 0, runs: [], dayN: [0, 0], weekN: [0, 0], lastEnd: null
    }],
    approvals: [
      { id: 'a7', w: 'meni', kind: 'doc', when: ago(11), name: 'תזכורת-למאפייה.md', live: true, risk: 'normal',
        tag: 'קובץ', tone: 'blue', title: 'קובץ חדש: תזכורת-למאפייה.md',
        body: 'היי, רק מוודאים שהצעת המחיר הגיעה אליכם. אם יש שאלות או משהו שתרצו לשנות, נשמח לדבר השבוע.',
        will: 'אם תאשרו, הקובץ יישמר בתיקייה של מני במחשב שלכם.' },
      { id: 'a6', w: 'meni', kind: 'doc', when: ago(50), name: 'זיכרון.md', live: true, risk: 'normal',
        tag: 'זיכרון', tone: 'green', title: 'לזכור: פגישות היכרות רק בימים ראשון ושלישי',
        body: 'פגישות היכרות עם לקוחות חדשים נקבעות רק בימים ראשון ושלישי, בין 10:00 ל-14:00.', will: MEM_WILL }
    ],
    done: [
      { id: 'a1', w: 'meni', kind: 'doc', live: true, tag: 'זיכרון', tone: 'green', title: 'לזכור: סטודיו קטן לעיצוב גרפי ומיתוג', decision: 'approve', result: 'אושר', decidedAt: 'אתמול 19:23' },
      { id: 'a2', w: 'meni', kind: 'doc', live: true, tag: 'זיכרון', tone: 'green', title: 'לזכור: מחירים: לוגו ומיתוג מ-3,500 ש"ח', decision: 'approve', result: 'אושר', decidedAt: 'אתמול 19:25' },
      { id: 'a3', w: 'meni', kind: 'doc', live: true, tag: 'זיכרון', tone: 'green', title: 'לזכור: כל פרויקט מתחיל במקדמה של 40%', decision: 'approve', result: 'אושר', decidedAt: 'אתמול 19:28' },
      { id: 'a4', w: 'meni', kind: 'doc', live: true, tag: 'זיכרון', tone: 'green', title: 'לזכור: איך פונים ללקוחות', decision: 'approve', result: 'אושר', decidedAt: 'אתמול 19:30' },
      { id: 'a5', w: 'meni', kind: 'doc', live: true, tag: 'הצעת צוות', tone: 'accent', title: 'הצעת צוות: 3 עובדים', decision: 'approve', result: 'אושר', decidedAt: 'אתמול 19:34' }
    ],
    threads: {},
    feed: [],
    today: todayText(),
    demo: false, live: true,
    report: { state: 'ok', lastOK: Math.floor(Date.now() / 1000) - 25, computer: 'OFFICE-MAC' },
    convs: [
      { id: 'c3', title: 'מה נשאר פתוח השבוע?', when: ago(11), tokens: 6400, limit: 80000, busy: false, open: true, suggest: false, unread: 0 },
      { id: 'c2', title: 'מייל על סבב תיקונים נוסף', when: 'אתמול 17:06', tokens: 3100, limit: 80000, busy: false, open: false, suggest: false, unread: 0 },
      { id: 'c1', title: 'הקליטה של מני', when: 'אתמול 19:33', tokens: 21400, limit: 80000, busy: false, open: false, suggest: false, unread: 0, learn: true }
    ],
    memory: [
      { id: 'm1', text: 'סטודיו קטן לעיצוב גרפי ומיתוג. רוב הלקוחות הם עסקים קטנים ועמותות באזור המרכז.', when: 'אתמול 19:23' },
      { id: 'm2', text: 'מחירים: לוגו ומיתוג מ-3,500 ש"ח, דף נחיתה מ-2,800 ש"ח, ריטיינר סושיאל 1,900 ש"ח בחודש. הכול לפני מע"מ.', when: 'אתמול 19:25' },
      { id: 'm3', text: 'לקוח חדש מקבל שאלון היכרות, אחר כך פגישה והצעת מחיר. מתחילים אחרי מקדמה של 40%.', when: 'אתמול 19:28' },
      { id: 'm4', text: 'הקבצים הפתוחים נמסרים ללקוח רק אחרי התשלום האחרון.', when: 'אתמול 19:28' },
      { id: 'm5', text: 'פונים ללקוחות בגוף שני רבים, בטון חם וקצר, בלי סימני קריאה.', when: 'אתמול 19:30' },
      { id: 'm6', text: 'כל יום ראשון מכינים את תוכנית הפוסטים של השבוע ללקוחות הריטיינר.', when: 'אתמול 19:31' },
      { id: 'm7', text: 'הכי הרבה זמן הולך על מענה לפניות ועל מעקב אחרי תשלומים.', when: 'אתמול 19:32' }
    ],
    learn: {
      topics: [
        { id: 'business', title: 'העסק', state: 'done' },
        { id: 'services', title: 'שירותים ומחירים', state: 'done' },
        { id: 'clients', title: 'הלקוחות', state: 'done' },
        { id: 'team', title: 'הצוות', state: 'skip' },
        { id: 'voice', title: 'איך כותבים בשם העסק', state: 'done' },
        { id: 'repeat', title: 'מה חוזר כל שבוע', state: 'done' },
        { id: 'time', title: 'על מה הולך הזמן', state: 'done' },
        { id: 'idea', title: 'רעיון לעובד נוסף', state: 'done' },
        { id: 'systems', title: 'המערכות', state: 'done' }
      ],
      files: [
        { name: 'מחירון 2026.pdf', when: 'אתמול 19:16' },
        { name: 'רשימת שירותים.docx', when: 'אתמול 19:16' },
        { name: 'שאלון היכרות ללקוח חדש.docx', when: 'אתמול 19:17' },
        { name: 'לקוחות פעילים.xlsx', when: ago(95) }
      ],
      folder: '/Users/dani/Documents/העסק',
      conv: 'c1',
      team: TEAM
    },
    lead: { name: 'מני' }
  };
  ST.threads = {
    c1: { unread: 0, items: learnItems },
    c2: { unread: 0, items: mailItems },
    c3: { unread: 0, items: openItems }
  };
  ST.threads.meni = ST.threads.c3;
  return ST;
}
const ST = seed();
let seq = 8;
const meni = () => ST.workers[0];
const conv = (id) => ST.convs.filter((c) => c.id === id)[0];

/* ---------- אירועים: מה שהשירות שולח ב-/api/events ---------- */
const streams = new Set();
class DemoEvents extends EventTarget {
  constructor() { super(); this.readyState = 1; streams.add(this); setTimeout(() => this.dispatchEvent(new Event('open')), 0); }
  close() { this.readyState = 2; streams.delete(this); }
}
function emit(type, obj) {
  const data = JSON.stringify(obj);
  streams.forEach((es) => es.dispatchEvent(new MessageEvent(type, { data })));
}
function changed() { ST.clock.m = minNow(); ST.report.lastOK = Math.floor(Date.now() / 1000) - 5; emit('state', ST); }
setInterval(() => { ST.clock.m = minNow(); emit('tick', { m: ST.clock.m }); }, 20000);

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- מני עונה ---------- */
const DEMO_NOTE = 'זו הדגמה, ולכן התשובות כאן כתובות מראש. אצלכם מני רץ על המחשב של העסק, עונה מתוך מה שלימדתם אותו ומהקבצים בתיקיית העסק, וכל דבר שיוצא החוצה מחכה קודם לאישור שלכם בתור.';
function replyTo(text) {
  const t = text.replace(/\s+/g, ' ');
  if (/פתוח|להיום|היום|משימ/.test(t)) return 'להיום יש שני דברים:\n\nהטיוטה לתזכורת למאפייה מחכה לאישור שלך בתור.\n\nוהצעתי לזכור שפגישות היכרות נקבעות רק בימים ראשון ושלישי. גם זה מחכה לך בתור.';
  if (/יודע|העסק|למדת/.test(t)) return 'מה שאישרת לזכור: סטודיו קטן לעיצוב גרפי ומיתוג, רוב הלקוחות עסקים קטנים ועמותות במרכז. המחירים מהמחירון של 2026, עם ריטיינר סושיאל ב-1,900 בחודש. מתחילים אחרי מקדמה של 40%, ופונים ללקוחות בגוף שני רבים, חם וקצר.\n\nאת כל הרשימה אפשר לראות ולמחוק בכרטיס שלי.';
  if (/מחיר|עולה|הצעה|הצעת/.test(t)) return 'לפי המחירון: לוגו ומיתוג מ-3,500 ש"ח, דף נחיתה מ-2,800 ש"ח, וריטיינר סושיאל 1,900 ש"ח בחודש, הכול לפני מע"מ.\n\nאם תרצה, אכין טיוטה להצעת מחיר. היא תחכה לאישור שלך בתור לפני שהיא נשמרת.';
  if (/פנ(יה|יות)|ליד|לקוח חדש/.test(t)) return 'לקוח חדש מקבל קודם את שאלון ההיכרות, ואחר כך קובעים פגישה ביום ראשון או שלישי. כשיהיה עוזר לפניות, הוא יעשה את זה לבד, וכל תשובה ללקוח תחכה לאישור שלך.';
  if (/שלום|היי|הי |בוקר|ערב/.test(t + ' ')) return 'היי דני. ' + DEMO_NOTE;
  return DEMO_NOTE;
}
function talk(tid, text) {
  let c = conv(tid);
  if (!c) {
    /* בלי שיחה פתוחה ההודעה פותחת שיחה חדשה, כמו בשירות */
    c = newConv();
    tid = c.id;
  }
  const th = ST.threads[tid];
  if (!th.items.length) c.title = text.length > 48 ? text.slice(0, 46) + '...' : text;
  th.items.push({ t: 'me', text, at: at(0), st: 'ok' });
  c.when = ago(0); c.busy = true; c.tokens += 40 + text.length * 2;
  ST.convs = [c].concat(ST.convs.filter((x) => x !== c));
  ST.threads.meni = th;
  changed();
  setTimeout(() => {
    const body = replyTo(text);
    th.items.push({ t: 'w', text: body, at: at(0) });
    c.busy = false; c.tokens += 300 + body.length * 2;
    meni().days[13] = ST.convs.filter((x) => x.when.indexOf('היום') === 0).length;
    changed();
  }, 1500 + Math.min(1500, text.length * 15));
}
function newConv() {
  const id = 'c' + (++seq);
  const c = { id, title: 'שיחה חדשה', when: ago(0), tokens: 0, limit: 80000, busy: false, open: true, suggest: false, unread: 0 };
  ST.convs.forEach((x) => { x.open = false; });
  ST.convs.unshift(c);
  ST.threads[id] = { unread: 0, items: [] };
  return c;
}

/* ---------- הבקשות של המסך ---------- */
const json = (status, body) => new Response(JSON.stringify(body === undefined ? { ok: status < 300 } : body), { status, headers: { 'Content-Type': 'application/json' } });
function handle(method, path, body) {
  const p = path.split('?')[0];
  let r;
  if (method === 'GET') {
    if (p === '/api/state') return json(200, ST);
    if (p === '/api/mode') return json(200, { lead: ST.lead, remote: false });
    if (p === '/api/login') return json(200, { sessions: [] });
    return json(404, { ok: false });
  }
  if ((r = p.match(/^\/api\/threads\/([^/]+)\/read$/))) {
    const c = conv(r[1]); if (c) c.unread = 0;
    if (ST.threads[r[1]]) ST.threads[r[1]].unread = 0;
    changed(); return json(200);
  }
  if ((r = p.match(/^\/api\/threads\/([^/]+)\/messages$/))) {
    const text = String(body.text || '').trim();
    if (!text) return json(400, { ok: false });
    if (ST.halted || !meni().enabled) return json(409, { ok: false });
    talk(r[1], text); return json(200);
  }
  if ((r = p.match(/^\/api\/approvals\/([^/]+)$/))) {
    const a = ST.approvals.filter((x) => x.id === r[1])[0];
    const result = { approve: 'אושר', reject: 'נדחה', fix: 'הוחזר לתיקון' }[body.decision];
    if (!a) return json(409, { ok: false });
    if (!result) return json(400, { ok: false });
    ST.approvals = ST.approvals.filter((x) => x !== a);
    ST.done.push(Object.assign({}, a, { decision: body.decision, result, decidedAt: ago(0) }));
    if (body.decision === 'approve' && a.tag === 'זיכרון') a.body.split('\n').forEach((line) => ST.memory.push({ id: 'm' + (++seq), text: line, when: ago(0) }));
    const tid = ST.convs.filter((c) => !c.learn)[0] ? ST.convs.filter((c) => !c.learn)[0].id : 'c1';
    if (body.decision === 'fix' && body.text) ST.threads[tid].items.push({ t: 'me', text: String(body.text), at: at(0), st: 'ok' });
    ST.threads[tid].items.push({ t: 'note', text: a.title + ': ' + result });
    changed();
    if (body.decision === 'fix') setTimeout(() => {
      ST.threads[tid].items.push({ t: 'w', text: 'קיבלתי. בהדגמה אני לא באמת מתקן, אבל אצלכם התיקון היה חוזר לתור לאישור שלכם.', at: at(0) });
      changed();
    }, 1600);
    return json(200);
  }
  if ((r = p.match(/^\/api\/workers\/([^/]+)$/))) {
    const w = ST.workers.filter((x) => x.id === r[1])[0];
    if (!w) return json(404, { ok: false });
    if (body.level >= 1 && body.level <= 4) w.level = body.level;
    if (typeof body.enabled === 'boolean') w.enabled = body.enabled;
    changed(); return json(200);
  }
  if ((r = p.match(/^\/api\/workers\/([^/]+)\/run$/))) return json(409, { ok: false });
  if ((r = p.match(/^\/api\/memory\/(.+)$/))) {
    const id = decodeURIComponent(r[1]);
    ST.memory = ST.memory.filter((x) => x.id !== id);
    changed(); return json(200);
  }
  if (p === '/api/halt') { ST.halted = !!body.halted; changed(); return json(200); }
  if (p === '/api/learn/start') return json(200, { id: ST.learn.conv });
  if (p === '/api/learn/folder') { toast('בהדגמה אין תיקייה לפתוח. אצלכם הכפתור פותח את תיקיית העסק במחשב.'); return json(200); }
  if (p === '/api/convs') { const c = newConv(); changed(); return json(200, { id: c.id }); }
  if ((r = p.match(/^\/api\/convs\/([^/]+)\/keep$/))) { const c = conv(r[1]); if (c) c.suggest = false; changed(); return json(200); }
  if (/^\/api\/devices\//.test(p)) return json(200);
  return json(404, { ok: false });
}
function call(path, opts) {
  const o = opts || {};
  const method = (o.method || 'GET').toUpperCase();
  let body = {};
  try { body = method === 'GET' ? {} : JSON.parse(o.body || '{}'); } catch (e) { return Promise.resolve(json(400, { ok: false })); }
  return new Promise((res) => setTimeout(() => res(handle(method, path, body)), 60));
}

/* הבדיקה של כניסות פתוחות במסך עוברת ב-fetch ישיר, ולכן גם הוא עובר כאן */
const realFetch = window.fetch.bind(window);
window.fetch = (input, opts) => {
  const url = typeof input === 'string' ? input : input.url;
  return url.indexOf('/api/') === 0 ? call(url, opts) : realFetch(input, opts);
};

const nope = () => Promise.resolve(null);
window.UOSNet = Object.freeze({
  init: () => Promise.resolve(), call, events: () => Promise.resolve(new DemoEvents()),
  pair: nope, approveProof: () => Promise.resolve({}), forget: nope, login: nope, logout: nope, endSession: nope,
  siteStart: nope, siteFinish: nope,
  linkStart: nope, linkState: nope, linkFinish: nope, linkList: () => Promise.resolve({ links: [] }), linkApprove: nope, linkReject: nope,
  get remote() { return false; }, get paired() { return false; }, get limited() { return false; },
  get loginOn() { return false; }, get siteOn() { return false; }, get backTo() { return 'login.html'; }
});

/* שורת ההדגמה בראש הדף, כדי שאף אחד לא יחשוב שזה מחשב אמיתי */
document.addEventListener('DOMContentLoaded', () => {
  const box = document.createElement('div');
  box.className = 'uos-banner';
  box.dataset.kind = 'demo';
  const txt = document.createElement('span');
  txt.textContent = 'הדגמה של UOS. הנתונים לדוגמה, ושום דבר לא מחובר.';
  const a = document.createElement('a');
  a.className = 'btn';
  a.href = '/';
  a.textContent = 'ל-UOS';
  box.append(txt, a);
  document.body.prepend(box);
});
})();
