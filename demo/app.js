'use strict';
/* ממשק הניהול של UOS, גרסה 9, כקבצים סטטיים שמוגשים מהשירות המקומי uosd.
   כל המצב החי מגיע מהשירות: GET /api/state בטעינה וזרם אירועים (state, tick, activity) אחר כך,
   וכל פעולה חוזרת אליו ב-POST. מצב שהוא רק של המסך (מסך פתוח, טיוטות, חלונות) נשאר כאן.
   מדיניות התוכן אוסרת קוד ועיצוב בתוך הדף, ו-Trusted Types מחייב שכל HTML ייכנס דרך put(). */
(function () {

/* ---------- HTML בטוח ----------
   html`...` מבריחה כל ערך משובץ, חוץ מתוצאה של html עצמה. הרשימה SAFE היא ההוכחה היחידה שמשהו בטוח,
   והמדיניות uos נוצרת פעם אחת בתוך הסגירה ואינה נחשפת. */
const policy = window.trustedTypes ? window.trustedTypes.createPolicy('uos', { createHTML: (s) => s }) : null;
const SAFE = new WeakSet();
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const TIDY = new WeakMap();
/* מי שכותב תבנית על כמה שורות לא מוסיף רווחים בין תגים */
function tidy(strings) {
  let t = TIDY.get(strings);
  if (!t) { t = strings.map((x) => x.replace(/>\s*\n\s*</g, '><')); TIDY.set(strings, t); }
  return t;
}
function part(v) {
  if (v == null) return '';
  if (typeof v === 'object' && SAFE.has(v)) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  return String(v).replace(/[&<>"']/g, (c) => ESC[c]);
}
function html(strings, ...vals) {
  const t = tidy(strings);
  let s = t[0];
  for (let i = 0; i < vals.length; i++) s += part(vals[i]) + t[i + 1];
  const o = Object.freeze({ s });
  SAFE.add(o);
  return o;
}
/* ערכים שמשתנים בזמן (מיקום ורוחב של פס) נכתבים כ-data-css ומוחלים כאן דרך אובייקט הסגנון, שהמדיניות מתירה */
function paint(root) {
  root.querySelectorAll('[data-css]').forEach((e) => {
    e.dataset.css.split(';').forEach((d) => {
      const i = d.indexOf(':');
      if (i > 0) e.style.setProperty(d.slice(0, i), d.slice(i + 1));
    });
  });
}
/* הדרך היחידה להכניס HTML לדף */
function put(el, safe) {
  if (!el) return;
  if (!safe || typeof safe !== 'object' || !SAFE.has(safe)) throw new Error('put: רק תוצאה של html');
  el.innerHTML = policy ? policy.createHTML(safe.s) : safe.s;
  paint(el);
}
const NONE = html``;
const $ = (id) => document.getElementById(id);

/* ---------- אייקונים ---------- */
const L = {
  users: html`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  checks: html`<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>`,
  plug: html`<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>`,
  book: html`<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>`,
  sliders: html`<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>`,
  bell: html`<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`,
  mail: html`<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>`,
  lock: html`<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  down: html`<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>`,
  left: html`<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>`,
  right: html`<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>`,
  upleft: html`<path d="M7 17V7h10"/><path d="M17 17 7 7"/>`,
  copy: html`<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`,
  check: html`<path d="M20 6 9 17l-5-5"/>`,
  laptop: html`<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>`,
  shield: html`<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
  stop: html`<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86"/><rect x="9" y="9" width="6" height="6" rx="1"/>`,
  activity: html`<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>`,
  clock: html`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  alert: html`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  send: html`<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>`,
  plus: html`<path d="M5 12h14"/><path d="M12 5v14"/>`,
  file: html`<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`,
  power: html`<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>`,
  /* יציאה: log-out של Lucide, משוקף לכיוון מימין לשמאל (הדלת מימין והחץ יוצא שמאלה) */
  logout: html`<path d="M15 21h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4"/><path d="m8 17-5-5 5-5"/><path d="M3 12h12"/>`,
  people: html`<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  x: html`<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  chat: html`<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>`,
  clip: html`<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>`,
  inbox: html`<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`
};
const I = (n) => html`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${L[n]}</svg>`;
/* אייקונים מלאים לפי הספר, לניווט, לאריחים ולמצבים ריקים. הקטנים שבתוך כפתורים נשארים בקו.
   מה שהיה מאפיין סגנון בתוך ה-SVG הוא מחלקה: h חור בצבע הרקע, hs קו בצבע הרקע, k5 ו-k4 קו עבה בצבע האייקון, kl קשת המנעול */
const F = {
  activity: html`<path class="k5" d="M28 5 12 26h11l-3 17 16-22H25l3-16Z"/>`,
  alert: html`<path class="k5" d="M28 5 12 26h11l-3 17 16-22H25l3-16Z"/>`,
  chat: html`<path d="M8 22c0-8 6-14 16-14s16 6 16 14-6 14-16 14h-3l-8 6 1-8c-4-2-6-6-6-12Z"/><circle class="h" cx="17" cy="22" r="2.5"/><circle class="h" cx="24" cy="22" r="2.5"/><circle class="h" cx="31" cy="22" r="2.5"/>`,
  users: html`<circle cx="24" cy="16" r="9"/><path d="M7 43c0-10 7-15 17-15s17 5 17 15c0 2-1 3-3 3H10c-2 0-3-1-3-3Z"/>`,
  people: html`<circle cx="33" cy="15" r="7"/><path d="M33 26c7 0 12 4 12 11 0 1.5-1 2.5-2.5 2.5H34c0-5-2-9.5-5.5-12.8 1.4-.5 3-.7 4.5-.7Z"/><circle cx="18" cy="17" r="8"/><path d="M3 41c0-8.5 6-13 15-13s15 4.5 15 13c0 1.7-1 2.7-2.7 2.7H5.7C4 43.7 3 42.7 3 41Z"/>`,
  checks: html`<circle cx="24" cy="24" r="19"/><path class="hs" d="M15 25l7 7 12-14"/>`,
  check: html`<circle cx="24" cy="24" r="19"/><path class="hs" d="M15 25l7 7 12-14"/>`,
  inbox: html`<rect x="6" y="9" width="36" height="33" rx="11"/><rect class="h" x="12" y="22" width="24" height="14" rx="6"/><rect x="14" y="4" width="5" height="10" rx="2.5"/><rect x="29" y="4" width="5" height="10" rx="2.5"/>`,
  plug: html`<rect x="15" y="4" width="5" height="12" rx="2.5"/><rect x="28" y="4" width="5" height="12" rx="2.5"/><rect x="9" y="13" width="30" height="20" rx="10"/><circle class="h" cx="24" cy="23" r="3.5"/><rect x="21.5" y="30" width="5" height="14" rx="2.5"/>`,
  book: html`<rect x="8" y="5" width="32" height="38" rx="10"/><rect class="h" x="15" y="14" width="18" height="5" rx="2.5"/><rect class="h" x="15" y="23" width="12" height="5" rx="2.5"/>`,
  sliders: html`<rect x="5" y="7" width="38" height="15" rx="7.5"/><circle class="h" cx="14" cy="14.5" r="4.5"/><rect x="5" y="26" width="38" height="15" rx="7.5"/><circle class="h" cx="34" cy="33.5" r="4.5"/>`,
  bell: html`<path d="M24 5c-7.5 0-13 5.5-13 13v7l-3.5 6c-1 2 0 3.5 2.3 3.5h28.4c2.3 0 3.3-1.5 2.3-3.5L37 25v-7c0-7.5-5.5-13-13-13Z"/><rect x="18" y="37" width="12" height="7" rx="3.5"/>`,
  laptop: html`<rect x="8" y="7" width="32" height="24" rx="8"/><rect class="h" x="13" y="12" width="22" height="14" rx="4"/><rect x="3" y="34" width="42" height="7" rx="3.5"/>`,
  lock: html`<path class="kl" d="M16 22v-5a8 8 0 0 1 16 0v5"/><rect x="8" y="21" width="32" height="22" rx="9"/><circle class="h" cx="24" cy="31" r="3.5"/><path class="hs" d="M24 33v4"/>`,
  clock: html`<circle cx="24" cy="24" r="19"/><path class="hs" d="M24 14v11l7 5"/>`,
  shield: html`<path class="k4" d="M24 5c6 4 11 5 16 5v13c0 10-7 17-16 21C15 40 8 33 8 23V10c5 0 10-1 16-5Z"/><path class="hs" d="M17 24l5 5 9-10"/>`,
  mail: html`<rect x="5" y="10" width="38" height="28" rx="11"/><path class="hs" d="M13 19l11 8 11-8"/>`
};
const FI = (n) => F[n] ? html`<svg class="fi-i" viewBox="0 0 48 48" aria-hidden="true">${F[n]}</svg>` : I(n);
const GOOGLE = html`<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>`;
const LG_PILL = html`<rect class="lg-pill" x="0" y="0" width="146" height="100" rx="50"/><circle class="lg-knob" cx="50" cy="50" r="35.5"/>`;
const LOGO = html`<svg class="lg" viewBox="-3 -5 329.2 110" role="img" aria-label="UOS"><path d="M27.50 0.56V58.25Q27.50 66.29 31.24 70.66Q34.97 75.03 42.59 75.03Q50.21 75.03 54.09 70.59Q57.96 66.14 57.96 58.25V0.56H85.61V58.25Q85.61 71.93 79.83 81.59Q74.04 91.25 64.10 96.12Q54.16 100.98 42.03 100.98Q29.90 100.98 20.38 96.12Q10.86 91.25 5.43 81.66Q0.0 72.07 0.0 58.25V0.56Z" fill="currentColor"/><g transform="translate(92.6 0)">${LG_PILL}</g><path d="M245.61 69.11H275.09Q275.51 74.33 278.19 76.72Q280.87 79.12 285.10 79.12Q288.91 79.12 291.38 77.22Q293.85 75.31 293.85 71.93Q293.85 67.55 289.76 65.16Q285.66 62.76 276.50 59.80Q266.77 56.55 260.77 53.52Q254.78 50.49 250.33 44.64Q245.89 38.78 245.89 29.33Q245.89 19.74 250.69 12.90Q255.48 6.06 263.94 2.53Q272.41 -0.98 283.13 -0.98Q300.47 -0.98 310.84 7.12Q321.21 15.23 321.91 29.90H291.87Q291.73 25.38 289.12 23.13Q286.51 20.87 282.42 20.87Q279.32 20.87 277.34 22.70Q275.37 24.54 275.37 27.92Q275.37 30.74 277.55 32.79Q279.74 34.83 282.99 36.31Q286.23 37.79 292.58 40.05Q302.03 43.30 308.16 46.47Q314.30 49.64 318.74 55.35Q323.18 61.07 323.18 69.81Q323.18 78.70 318.74 85.75Q314.30 92.80 305.90 96.89Q297.51 100.98 286.09 100.98Q268.74 100.98 257.60 92.73Q246.45 84.48 245.61 69.11Z" fill="currentColor"/></svg>`;
const MARK = html`<svg class="mark" viewBox="-2 -2 150 104" aria-hidden="true">${LG_PILL}</svg>`;
const logo = () => html`<span class="logo">${LOGO}</span>`;
const FACE = {};
['meni', 'gabi', 'pesi', 'oz', 'lidor'].forEach((id) => { FACE[id] = 'img/face-' + id + '.webp'; });
/* מנהל הצוות: השם והלשון שבעל העסק בחר בהתקנה (state.lead). בלי השדה, כמו בהדגמה, זה מני.
   המזהה הפנימי נשאר meni. לשם אחר אין דמות מצוירת, ולכן מוצגת צללית (img/face-lead.svg) */
const LN = () => (RAW && RAW.lead && RAW.lead.name) || 'מני';
const lg = (male, female) => (RAW && RAW.lead && RAW.lead.female ? female : male);

/* ---------- המצב ---------- */
/* RAW הוא מה שהשירות שלח, M הוא מה שהמסכים קוראים ממנו, ו-S הוא מה שקיים רק במסך */
let RAW = null;
let M = null;
let LV = {};
let WORK = {};
let CHIPS = [];
const DAY = { start: 420, end: 1140, m: 702 };
const S = {
  route: 'login', more: false, typing: null, drafts: {}, welcome: false, stepsHidden: false,
  dRange: 'day', justConnected: false, pendingLevel: null, fixing: null, apSel: null, discon: false, enter: true,
  spoke: false, sync: {}, lastNote: null, hold: 0,
  /* השיחה שנבחרה מהרשימה (בלי בחירה מוצגת הראשונה), ובנייד: האם נפתחה השיחה עצמה או שרואים את הרשימה */
  conv: null, csOpen: true,
  /* קוד החיבור והשעון שלו הם הדגמה של המסך עד שיהיה חיבור אמיתי בשירות */
  code: '7KQ4-M2XP', secs: 582
};
/* השירות האמיתי, לעומת מצבי הדמה של אב הטיפוס */
const real = () => !!(RAW && RAW.live);
const worker = (id) => M.workers.filter((w) => w.id === id)[0];
const rep = () => M.reporting;
/* בהתקנה אצל לקוח מני מגיע לבד, ועובד נוסף רק בבחירה. מסכים שמדברים על "הצוות" ועל "כל אחד" מתאימים את עצמם */
const solo = () => M.workers.length === 1 && !!worker('meni');
const since = () => M.since || 'אתמול ב-19:12';
/* הדיווח אלינו, רק בשירות האמיתי: off, wait, ok או fail. בגרסת הדמה null.
   הזמן של הדיווח האחרון נשאר ב-RAW ולא ב-M, כדי שהמסך לא יצויר מחדש בכל דקה בגללו */
const RS = () => (real() && M.report) || null;
const repFail = () => !!(RS() && RS().state === 'fail');
function hm(ts) {
  const d = new Date(ts * 1000), p = (n) => (n < 10 ? '0' : '') + n, t = p(d.getHours()) + ':' + p(d.getMinutes());
  return d.toDateString() === new Date().toDateString() ? t : p(d.getDate()) + '/' + p(d.getMonth() + 1) + ', ' + t;
}
function repWhy(r) {
  if (r.code === 403) return 'השרת שלנו עוד לא מכיר את המחשב הזה';
  if (!r.code) return 'השרת שלנו לא עונה';
  return 'השרת שלנו דחה את הדיווח (קוד ' + r.code + ')';
}
function repLast() {
  const t = RAW && RAW.report && RAW.report.lastOK;
  return t ? hm(t) : 'עוד לא עבר דיווח';
}
function repTile(r) {
  const a = ['go', 'connect'];
  if (r.state === 'ok') return tile('green', 'laptop', 'הדיווח אלינו', 'עובר', 'המחשב מדווח כל דקה', a);
  if (r.state === 'fail') return tile('red', 'laptop', 'הדיווח אלינו', 'לא עובר', repWhy(r), a);
  if (r.state === 'off') return tile('gray', 'laptop', 'הדיווח אלינו', 'כבוי', 'המחשב הזה לא מדווח לנו', a);
  return tile('accent', 'laptop', 'הדיווח אלינו', 'בבדיקה', 'הדיווח הראשון בדרך', a);
}
function repState(r) {
  if (r.state === 'ok') return html`<span class="rs"><span class="dot"></span>עובר</span>`;
  if (r.state === 'fail') return html`<span class="rs"><span class="dot bad"></span>לא עובר: ${repWhy(r)}</span>`;
  if (r.state === 'off') return html`<span class="rs"><span class="dot off"></span>כבוי במחשב הזה</span>`;
  return html`<span class="rs"><span class="dot wait"></span>בבדיקה</span>`;
}

/* מהמצב של השירות למודל של המסכים. מחשב שלא מחובר, או מצב בלי עובדים, לא מראה כלום מהעסק */
function build(st) {
  const c = st.computer, live = c.status === 'connected' && !st.zero;
  const workers = live ? st.workers : [];
  const known = (id) => workers.some((w) => w.id === id);
  const threads = live ? Object.assign({}, st.threads) : {};
  if (!threads.meni) threads.meni = { unread: 0, items: [] };
  return {
    name: st.owner.name, mail: st.owner.mail, computer: c.name, os: c.os, status: c.status, reporting: !!c.reporting, since: c.since,
    halted: !!st.halted, zero: !!st.zero, workers,
    approvals: live ? st.approvals.filter((a) => known(a.w)) : [],
    /* בשירות ההחלטות לפי הסדר שהתקבלו, ובמסך החדש ביותר למעלה */
    done: live ? st.done.slice().reverse().filter((d) => known(d.w)).map((d) => {
      const tone = { approve: 'green', reject: 'gray', fix: 'accent' }[d.decision] || 'gray';
      return { id: d.id, title: d.title, result: d.result, tone };
    }) : [],
    threads, feed: live ? st.feed : [],
    convs: live && st.live ? (st.convs || []) : [],
    memory: live && st.live ? (st.memory || []) : [],
    /* הקליטה של מני: נושאים, קבצים ותיקיית העסק. השירות עוד לא שולח את זה, והמסך מסתדר בלי. ראו viewLearn */
    learn: live && st.live ? (st.learn || null) : null,
    report: st.report ? { state: st.report.state, code: st.report.code || 0, since: st.report.since || 0, computer: st.report.computer || '' } : null
  };
}

/* ---------- שיחה עם השירות ---------- */
const ERR_MSG = 'השירות לא ענה. אפשר לנסות שוב.';
const okS = (s) => s >= 200 && s < 300;
/* כל בקשה עוברת דרך UOSNet (remote.js): במחשב עצמו כמו שהיא, ומבחוץ חתומה במפתח המכשיר */
const net = window.UOSNet;
function post(path, body) {
  return net.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.status, () => 0);
}
/* כמו post, וגם מחזיר את גוף התשובה כשהיא הצליחה */
function postJ(path, body) {
  return net.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(
    (r) => (okS(r.status) ? r.json().catch(() => ({})) : Promise.resolve({})).then((j) => ({ s: r.status, j })),
    () => ({ s: 0, j: {} }));
}
function act(path, body) {
  return post(path, body).then((s) => { if (!okS(s)) toast(ERR_MSG); return okS(s); });
}
function demo(body) {
  return post('/api/demo', body).then((s) => {
    if (s === 404 || s === 405) toast('מצבי הדמה פועלים רק כשהשירות רץ במצב הדגמה.');
    else if (!okS(s)) toast(ERR_MSG);
    return okS(s);
  });
}

/* ---------- זמן ושפה ---------- */
function hhmm(m) { m = Math.floor(m); const h = Math.floor(m / 60), n = m % 60; return (h < 10 ? '0' : '') + h + ':' + (n < 10 ? '0' : '') + n; }
function mins(n) { n = Math.max(0, Math.floor(n)); return n < 1 ? 'פחות מדקה' : n === 1 ? 'דקה' : n === 2 ? 'שתי דקות' : n + ' דקות'; }
function pct(m) { return ((Math.min(m, DAY.end) - DAY.start) / (DAY.end - DAY.start) * 100).toFixed(2); }
function names(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ו' + a[a.length - 1]; }
function plural(n, one, many) { return n === 1 ? one : n + ' ' + many; }
function dHours(n) { n = Math.floor(n); const m = n % 60; return Math.floor(n / 60) + ':' + (m < 10 ? '0' : '') + m; }
function newCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = new Uint32Array(8);
  crypto.getRandomValues(r);
  let s = '';
  for (let i = 0; i < 8; i++) { s += abc[r[i] % abc.length]; if (i === 3) s += '-'; }
  return s;
}

const face = (w, cls) => html`<img class="face ${cls || ''}${(M.halted || !w.enabled) && cls !== 'keep' ? ' off-face' : ''}" src="${FACE[w.id]}" alt="">`;
const syncText = (w) => { const v = S.sync[w.id]; return v === 'sending' ? 'נשלח למחשב' : v === 'ok' ? 'נקלט במחשב' : v === 'wait' ? 'מחכה למחשב' : ''; };

/* ---------- סרגל אב הטיפוס ---------- */
function protoBar() {
  /* בשירות האמיתי אין סרגל הדגמה, והקונטיינר נשאר ריק */
  if (real()) return NONE;
  const cur = S.route.indexOf('worker-') === 0 ? 'worker' : S.route === 'dash-one' ? 'dash' : S.route;
  const chips = [['login', 'כניסה'], ['connect', 'חיבור'], ['dash', 'דשבורד'], ['team', 'הצוות'], ['chat', LN()], ['worker', 'כרטיס עובד'], ['approvals', 'תור אישורים']];
  const mode = (key, now, opts) => html`<div class="mode" role="group">${opts.map((o) =>
    html`<button data-act="seg" data-k="${key}" data-v="${o[0]}" aria-pressed="${String(now) === String(o[0])}">${o[1]}</button>`)}</div>`;
  return html`<b>אב טיפוס</b><span class="proto-note">הנתונים לדוגמה, ושום דבר לא מחובר</span>
    <nav class="chips" aria-label="מסכים">${chips.map((c) =>
      html`<button class="chip" data-act="jump" data-to="${c[0]}" aria-current="${cur === c[0]}">${c[1]}</button>`)}</nav>
    <div class="proto-more"><button class="proto-btn" data-act="more" aria-expanded="${S.more}">מצבים</button>${S.more ? html`<div class="pop"><div><span class="lbl">המחשב</span>${mode('reporting', M.reporting, [['true', 'מדווח'], ['false', 'לא מדווח']])}</div><div><span class="lbl">עובדים אחרי החיבור</span>${mode('zero', M.zero, [['false', 'חמישה'], ['true', 'אף אחד']])}</div></div>` : NONE}</div>`;
}

/* ---------- מעטפת ---------- */
const nv = (to, label, icon, count, cur) =>
  html`<li><button class="nv" data-act="go" data-to="${to}"${cur ? html` aria-current="page"` : NONE}>${FI(icon)}<span>${label}</span>${count ? html`<span class="nv-count num">${count}</span>` : NONE}</button></li>`;
function shell(content, fill) {
  const p = M, r = S.route;
  const onTeam = r === 'team' || r.indexOf('worker-') === 0;
  /* בשיחה עצמה אין מה למנות, כי הקריאה נרשמת עם הציור */
  /* בשירות האמיתי השיחות ברשימה, ו-threads.meni הוא העתק של האחרונה, ולכן סופרים מהרשימה */
  const unread = r === 'chat' ? 0 : real() ? p.convs.reduce((n, c) => n + (c.unread || 0), 0) : Object.keys(p.threads).reduce((n, k) => n + (p.threads[k].unread || 0), 0);
  const navs = html`<div class="navs"><div class="all"><section><small>העבודה שלי</small><ul>${nv('dash', 'דשבורד', 'activity', 0, r === 'dash' || r === 'dash-one')}${nv('chat', 'שיחה עם ' + LN(), 'chat', unread, r === 'chat')}${nv('team', 'הצוות', 'users', 0, onTeam)}${nv('approvals', 'תור האישורים', 'checks', p.approvals.length, r === 'approvals')}${worker('meni') ? nv('learn', 'הקליטה של ' + LN(), 'book', 0, r === 'learn') : NONE}</ul></section>
    <section><small>המערכת</small><ul>${nv('connect', 'חיבור המחשב', 'plug', 0, r === 'connect')}</ul></section></div></div>`;
  const pc = p.status !== 'connected' ? html`<span class="pcchip"><span class="dot wait"></span>המחשב עוד לא מחובר</span>`
    : rep() && !repFail() ? html`<span class="pcchip"><span class="dot live"></span><bdi>${p.computer}</bdi></span>`
    : html`<span class="pcchip"><span class="dot bad"></span><bdi>${p.computer}</bdi> לא מדווח</span>`;
  return html`<div class="shell"><aside class="sidenav"><div class="brand">${logo()}</div>${navs}
    ${real() ? NONE : html`<div class="nav-foot"><button class="nv" data-act="toast" data-msg="באב הטיפוס זה לא נפתח">${FI('book')}<span>מדריך שימוש</span></button><button class="nv" data-act="toast" data-msg="באב הטיפוס זה לא נפתח">${FI('sliders')}<span>הגדרות</span></button></div>`}</aside>
    <div><header class="topbar"><div class="acct"><span class="top-logo">${logo()}</span><span class="acct-name">${p.name}</span>${pc}</div>
    <div class="top-act"><span class="secure" role="img" aria-label="מאובטח">${I('lock')}<span class="secure-lab" aria-hidden="true">מאובטח</span></span><button class="iconbtn" data-act="go" data-to="approvals" aria-label="התראות">${FI('bell')}${p.approvals.length ? html`<span class="dotn num">${p.approvals.length}</span>` : NONE}</button><button class="btn line out-txt" data-act="logout">יציאה</button><button class="iconbtn out-ic" data-act="logout" aria-label="יציאה">${I('logout')}</button></div></header>
    <main${fill ? html` class="fill"` : NONE}>${content}</main></div></div>`;
}
const pageClass = () => 'page' + (S.enter ? ' enter' : '');

/* ---------- כניסה ----------
   הפאנל במסך הכניסה חי: המתג בלוגו מדליק ומכבה את כולם, לכל עובד מתג משלו, וההודעות מתעדכנות בלי לצייר את המסך מחדש */
const LU_CAST = ['gabi', 'pesi', 'meni', 'oz', 'lidor'];
const LU_NAME = { gabi: 'גבי', pesi: 'פסי', meni: 'מני', oz: 'עוז', lidor: 'לידור' };
const LU_FEED = [
  ['meni', 'קיבלתי מכם משימה וחילקתי אותה לצוות'],
  ['pesi', 'הפוסט לשבוע הבא מוכן', 1],
  ['oz', 'הכנתי תשובה למייל של הלקוח', 1],
  ['lidor', 'נכנסו שבע פניות, ושתיים מחכות שתחליטו אם לחזור אליהן'],
  ['gabi', 'הכנתי תזכורת על חשבונית שלא שולמה', 1],
  ['meni', 'כל הצוות סיים את המשימות של הבוקר'],
  ['oz', 'סידרתי לכם את היומן של מחר'],
  ['pesi', 'תכננתי את הפוסטים של השבוע הבא'],
  ['gabi', 'בדקתי מי שילם החודש ומי עוד לא'],
  ['lidor', 'הכנתי מענה לפנייה חדשה מהאתר', 1]
];
const LU = { i: 0, off: {}, force: null, run: 0, busy: false, next: 0, who: null, fly: null, card: null };
const LU_STILL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function luTalk(k) {
  [].forEach.call(document.querySelectorAll('.lu'), (e) => { e.classList.toggle('talk', e.dataset.w === k); });
  const l = document.querySelector('.lineup'); if (l) l.classList.toggle('speaking', !!k);
}
const luCardHtml = (item) => html`<img src="${FACE[item[0]]}" alt=""><span class="lu-tx"><b>${LU_NAME[item[0]]}</b>${item[1]}${item[2] ? html`<span class="lu-ap">מחכה לאישור שלכם</span>` : NONE}</span>`;
/* השורות זזות בהחלקה כשמשהו נוסף לשיחה או יורד ממנה */
function luFlip(box, change) {
  const old = [].slice.call(box.children), tops = old.map((e) => e.getBoundingClientRect().top);
  change();
  old.forEach((e, i) => {
    if (!e.parentNode) return;
    const d = tops[i] - e.getBoundingClientRect().top;
    if (!d) return;
    e.style.transition = 'none'; e.style.transform = 'translateY(' + d + 'px)'; e.getBoundingClientRect();
    e.style.transition = ''; e.style.transform = '';
  });
}
function luMarkOld(box) { [].forEach.call(box.children, (c, i) => { c.classList.toggle('old', i < box.children.length - 1); }); }
function luAdd(box, item, cls, hidden) {
  [].forEach.call(box.querySelectorAll('.lu-card:not([data-w])'), (e) => { e.remove(); });
  const el = document.createElement('div');
  el.className = 'lu-card' + cls; el.dataset.w = item[0];
  put(el, luCardHtml(item));
  if (hidden) el.style.visibility = 'hidden';
  luFlip(box, () => {
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    luMarkOld(box);
  });
  return el;
}
/* עוצר בועה באמצע הדרך, כשהעובד כובה או כשהמסך התחלף, ומחזיר את המקום ששמרנו לה */
function luStop() {
  LU.run++; LU.busy = false; LU.who = null;
  if (LU.fly) LU.fly.remove();
  const c = LU.card, box = c && c.parentNode;
  if (box) luFlip(box, () => { c.remove(); luMarkOld(box); });
  LU.fly = LU.card = null;
  luTalk(null);
}
/* הבועה יוצאת מהפה של העובד עם שלוש נקודות, נפתחת למשפט מעל הראש שלו, ורק אז עוברת למקום שנפתח לה בשיחה */
function luSay(box, item) {
  const side = document.querySelector('.login-side'), lu = document.querySelector('.lu[data-w="' + item[0] + '"]');
  if (!side || !lu) return;
  const run = ++LU.run, card = luAdd(box, item, '', true);
  LU.busy = true; LU.who = item[0]; LU.card = card;
  const sr = side.getBoundingClientRect(), cr = card.getBoundingClientRect(), nr = lu.querySelector('.lu-c').getBoundingClientRect(), fr = lu.querySelector('img').getBoundingClientRect();
  const cx = fr.left + fr.width / 2 - sr.left, top = nr.top - sr.top - 13, w = cr.width - 44, pad = 12, dotsW = 62, dotsH = 38;
  const fit = (bw) => Math.max(pad, Math.min(sr.width - bw - pad, cx - bw / 2));
  const tail = (x, bw) => Math.max(18, Math.min(bw - 18, cx - x)) + 'px';
  const x0 = fit(dotsW), x1 = fit(w);
  const fly = document.createElement('div');
  fly.className = 'lu-fly'; fly.setAttribute('aria-hidden', 'true');
  fly.style.width = dotsW + 'px'; fly.style.height = dotsH + 'px';
  fly.style.setProperty('--tail', tail(x0, dotsW));
  fly.style.setProperty('--tw', card.querySelector('.lu-tx').getBoundingClientRect().width + 'px');
  fly.style.transform = 'translate(' + x0 + 'px,' + (fr.top - sr.top + fr.height * 0.46 - dotsH) + 'px) scale(.22)';
  put(fly, html`<div class="lu-card lu-bub">${luCardHtml(item)}<span class="lu-dots"><i></i><i></i><i></i></span></div><i class="lu-tail"></i>`);
  side.appendChild(fly); LU.fly = fly;
  fly.getBoundingClientRect();
  luTalk(item[0]);
  fly.classList.add('on');
  fly.style.transform = 'translate(' + x0 + 'px,' + (top - dotsH) + 'px) scale(1)';
  const step = (ms, fn) => { setTimeout(() => { if (run === LU.run) fn(); }, ms); };
  step(880, () => {
    fly.classList.add('open');
    fly.style.width = w + 'px'; fly.style.height = cr.height + 'px';
    fly.style.setProperty('--tail', tail(x1, w));
    fly.style.transform = 'translate(' + x1 + 'px,' + (top - cr.height) + 'px) scale(1)';
  });
  step(2250, () => {
    const s2 = side.getBoundingClientRect(), c2 = card.getBoundingClientRect();
    fly.classList.add('land');
    fly.style.width = c2.width + 'px'; fly.style.height = c2.height + 'px';
    fly.style.transform = 'translate(' + (c2.left - s2.left) + 'px,' + (c2.top - s2.top) + 'px) scale(1)';
    luTalk(null);
  });
  step(2850, () => {
    card.style.visibility = ''; card.classList.add('fresh');
    fly.remove();
    LU.fly = LU.card = null; LU.busy = false; LU.who = null; LU.next = Date.now() + 620;
  });
}
function luPush(instant) {
  const box = $('lu-feed');
  if (!box) return;
  const on = LU_CAST.filter((k) => !LU.off[k]);
  if (!on.length) { luStop(); put(box, html`<div class="lu-card in"><span>הצוות כבוי. מדליקים בלחיצה על המתג.</span></div>`); return; }
  if (LU.busy && !instant) return;
  let item, tries = 0;
  if (LU.force) { item = LU_FEED.filter((f) => f[0] === LU.force)[0]; LU.force = null; }
  while (!item && tries++ < LU_FEED.length) { const f = LU_FEED[LU.i++ % LU_FEED.length]; if (!LU.off[f[0]]) item = f; }
  if (instant) { luAdd(box, item, ''); return; }
  if (LU_STILL) { luAdd(box, item, ' in'); luTalk(item[0]); return; }
  luSay(box, item);
}
function luSync() {
  const allOn = LU_CAST.every((k) => !LU.off[k]), anyOn = LU_CAST.some((k) => !LU.off[k]);
  [].forEach.call(document.querySelectorAll('.lu'), (e) => { const off = !!LU.off[e.dataset.w]; e.classList.toggle('off', off); e.querySelector('.sw').setAttribute('aria-checked', String(!off)); });
  const lg = $('lu-logo');
  if (lg) { lg.setAttribute('aria-pressed', String(anyOn)); lg.classList.toggle('idle', allOn); }
}
function viewLogin() {
  const line = LU_CAST.map((k) => {
    const off = !!LU.off[k];
    return html`<div class="lu${off ? ' off' : ''}" data-w="${k}"><span class="lu-c"><span>${LU_NAME[k]}</span><button class="sw" type="button" role="switch" aria-checked="${!off}" aria-label="מתג של ${LU_NAME[k]}" data-act="lu-sw" data-id="${k}"></button></span><img src="${FACE[k]}" alt=""></div>`;
  });
  const allOn = LU_CAST.every((k) => !LU.off[k]), anyOn = LU_CAST.some((k) => !LU.off[k]);
  return html`<div class="login"><section class="login-side"><span class="white-logo"><button class="lg-btn${allOn ? ' idle' : ''}" id="lu-logo" type="button" data-act="lu-all" aria-pressed="${anyOn}" aria-label="הדלקה וכיבוי של כל הצוות">${LOGO}</button><i></i><span class="t">it's all about U</span></span>
    <h2>מערכת הניהול של<br>העובדים הדיגיטליים שלכם</h2><p>הצוות הכי מדליק בעסק שלכם</p>
    <div class="lu-feed" id="lu-feed" aria-hidden="true"></div><div class="lineup">${line}</div></section>
    <section class="login-form"><form class="inner" data-form="login"><div><span class="secure" role="img" aria-label="מאובטח">${I('lock')}<span class="secure-lab" aria-hidden="true">מאובטח</span></span><h1>כניסה ל-UOS</h1><p class="lead">הכניסה היא בהזמנה, אז נכנסים עם האימייל שאליו היא הגיעה.</p></div>
    <button class="btn line full" type="button" data-act="toast" data-msg="באב הטיפוס זה לא נפתח">${GOOGLE}המשך עם Google</button><div class="or">או</div>
    <div class="field"><label for="in-mail">אימייל</label><div class="inwrap">${I('mail')}<input class="ltr" id="in-mail" type="email" value="${M.mail}" autocomplete="email"></div></div>
    <div class="field"><label for="in-pass"><span>סיסמה</span><button class="tlink fs84" type="button" data-act="toast" data-msg="באב הטיפוס לא נשלח כלום">שכחתי סיסמה</button></label><div class="inwrap">${I('lock')}<input class="ltr" id="in-pass" type="password" value="prototype" autocomplete="current-password"></div></div>
    <button class="btn pri full" type="submit">כניסה${I('left')}</button>
    <p class="fine">אין קשר בין הסיסמה כאן לבין החשבון שלכם בקלוד, והאתר אף פעם לא יבקש מכם את פרטי הכניסה אליו.</p></form></section></div>`;
}

/* ---------- חיבור ---------- */
function flowAside() {
  const box = (icon, head, items) => html`<div class="flowbox"><div class="flowh"><span class="fi">${FI(icon)}</span>${head}</div><ul class="flow">${items.map((t) => html`<li>${I('check')}${t}</li>`)}</ul></div>`;
  return html`<aside class="card card-b">${box('activity', 'מה מגיע אלינו', ['שמות העובדים והתפקידים שלהם', 'מי דלוק, מי כבוי ובאיזו דרגה', 'מה כל עובד עושה עכשיו: שם העבודה, כמה זמן וכמה עבודות נעשו'])}${box('lock', 'מה עובר דרכנו בלי שנוכל לקרוא', ['ההודעות שלכם ל' + LN() + ' והתשובות ' + lg('שלו', 'שלה'), 'מה העובדים מבקשים לאשר, ומה החלטתם'])}${box('laptop', 'מה נשאר במחשב שלכם', ['הקבצים והידע של העובדים', 'החיבורים למייל ולמערכות שלכם', 'המנוי והחשבון שלכם בקלוד'])}
    <p class="fine start14">העובדים רצים רק כשהמחשב דלוק ומחובר לרשת, ולכן הוא צריך להישאר דלוק. הודעה שתכתבו כשהוא לא זמין תחכה עד שיחזור.</p></aside>`;
}
function stage(ok, p) {
  return html`<div class="stage${ok ? ' ok' : ''}"><div class="node"><span class="node-ic">${FI('laptop')}</span><b>המחשב שלכם</b><small>${ok ? html`<bdi>${p.computer}</bdi>` : 'כאן נמצאים העובדים'}</small></div>
    <div class="wire">${ok ? html`<span class="chk">${I('check')}</span>` : NONE}</div>
    <div class="node"><span class="node-ic">${MARK}</span><b>UOS</b><small>מכאן מנהלים</small></div></div>`;
}
const COUNT_WORDS = ['', 'עובד אחד', 'שני עובדים', 'שלושה עובדים', 'ארבעה עובדים', 'חמישה עובדים'];
function viewConnect() {
  const p = M;
  if (p.status === 'connected') return viewConnected(p);
  const m = Math.floor(S.secs / 60), s = S.secs % 60, timer = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  const lead = 'העובדים רצים על המחשב שלכם ועל המנוי שלכם בקלוד. אחרי החיבור מדברים איתם כאן, מדליקים ומכבים אותם ומאשרים את מה שהכינו, גם מהטלפון.';
  return html`<div class="${pageClass()}"><div><h1>חיבור המחשב</h1><p class="lead">${lead}</p></div>
    <div class="conn"><section class="card">${stage(false, p)}
    <div class="waitline"><span class="dot wait"></span><span>מחכים למחשב</span><button class="btn sim sm" data-act="simconnect">הדמיה: המחשב התחבר</button></div>
    <div class="steps">
    <div class="step"><span class="n">1</span><div class="body"><h3>מתקינים את UOS על המחשב שתמיד דלוק</h3><p>העובדים רצים עליו גם כשאתם לא לידו, ולכן הוא צריך להישאר דלוק ומחובר לרשת.</p><button class="btn line sm mt8" data-act="toast" data-msg="באב הטיפוס לא מורידים כלום">${I('down')}הורדה</button></div></div>
    <div class="step"><span class="n">2</span><div class="body"><h3>מדביקים בהתקנה את הקוד הזה</h3>
      <div class="cmd"><span class="code" id="cmd">${S.code}</span><button class="btn pri sm" data-act="copy">${I('copy')}<span id="copylbl">העתקה</span></button></div>
      <div class="meta"><span class="tm">${I('clock')}הקוד תקף עוד <bdi class="num" id="timer">${timer}</bdi></span><button class="tlink" data-act="newcode">קוד חדש</button></div></div></div>
    <div class="step"><span class="n">3</span><div class="body"><h3>נכנסים פעם אחת לחשבון שלכם בקלוד</h3><p>ההתקנה פותחת את חלון הכניסה של Anthropic. הפרטים לא עוברים דרכנו, והמנוי נשאר שלכם.</p></div></div>
    <div class="step"><span class="n">4</span><div class="body"><h3>חוזרים לכאן</h3><p>המסך הזה יתעדכן לבד ברגע שהמחשב יתחבר.</p></div></div>
    </div></section>${flowAside()}</div></div>`;
}
function viewConnected(p) {
  const n = p.workers.length;
  if (S.justConnected) {
    const faces = p.workers.map((w, i) => html`<div data-css="animation-delay:${0.1 + i * 0.09}s"><img class="face" src="${FACE[w.id]}" alt="">${w.name}<small>${w.title}</small></div>`);
    return html`<div class="${pageClass()}"><div><h1>המחשב התחבר</h1><p class="lead"><bdi>${p.computer}</bdi>, ${p.os}. ${n ? 'מצאנו בו ' + COUNT_WORDS[n] + '.' : 'עוד אין בו עובדים, ואפשר לבנות את הראשון עכשיו.'}</p></div>
      <section class="card">${stage(true, p)}${n ? html`<div class="okfaces">${faces}</div>` : NONE}
      <div class="okcta"><button class="btn pri" data-act="after-connect">${n ? 'לצוות' : 'לבניית העובד הראשון'}${I('left')}</button></div></section></div>`;
  }
  const r = RS();
  /* בשירות האמיתי: מה באמת קורה עם הדיווח אלינו, ומזהה המחשב שרושמים אצלנו */
  const rows = r ? html`<dt>הדיווח אלינו</dt><dd>${repState(r)}</dd><dt>דיווח אחרון שעבר</dt><dd id="r-last">${repLast()}</dd>${r.computer ? html`<dt>מזהה המחשב</dt><dd><bdi class="mono">${r.computer}</bdi></dd>` : NONE}`
    : html`<dt>מחובר מאז</dt><dd>היום ב-10:12</dd><dt>דיווח אחרון</dt><dd>${rep() ? 'לפני דקה' : since()}</dd>`;
  return html`<div class="${pageClass()}"><div><h1>חיבור המחשב</h1><p class="lead">המחשב הזה מחובר ל-UOS: הוא מעדכן את האתר במה שהעובדים עושים, וכשאתם מכבים עובד או משנים לו דרגה, זה עובר אליו.</p></div>
    <div class="conn"><section class="card">${stage(r ? r.state !== 'fail' : rep(), p)}<div class="card-b"><dl class="kv"><dt>מחשב</dt><dd><bdi>${p.computer}</bdi>, ${p.os}</dd>
    ${real() && !RAW.version ? NONE : html`<dt>גרסת UOS במחשב</dt><dd class="num">${RAW.version || '0.1.0'}</dd>`}${rows}</dl>
    ${real() ? NONE : html`<div class="mt14">${S.discon ? html`<div class="confirm"><b>לנתק את <bdi>${p.computer}</bdi>?</b><span>העובדים ימשיכו לרוץ במחשב לפי המצב האחרון, אבל לא תראו אותם כאן ולא תוכלו לדבר איתם או לכבות אותם מכאן.</span><div class="row"><button class="btn redline sm" data-act="discon-yes">לנתק</button><button class="btn line sm" data-act="discon-no">ביטול</button></div></div>`
      : html`<button class="btn line" data-act="discon">ניתוק המחשב</button>`}</div>`}</div></section>${flowAside()}</div></div>`;
}

/* ---------- הצוות ---------- */
function quickBox() {
  if (!worker('meni')) return NONE;
  return html`<form class="quick" data-form="quick"><img class="face s" src="${FACE.meni}" alt=""><input id="quick-in" data-fk="quick" aria-label="${'הודעה ל' + LN()}" placeholder="${'כתבו ל' + LN() + ' מה צריך...'}"><button class="btn pri sm" type="submit">${I('send')}שליחה</button></form>`;
}
function firstSteps(p) {
  if (S.stepsHidden || !worker('meni')) return NONE;
  const steps = [
    ['לחבר את המחשב', true],
    ['ללמד את ' + LN() + ' על העסק', learned(p), html`<button class="btn line sm" data-act="go" data-to="learn">לקליטה של ${LN()}${I('left')}</button>`],
    ['לאשר או לתקן את הדבר הראשון ש' + (solo() ? LN() + lg(' הכין', ' הכינה') : 'הצוות הכין'), p.done.length > 0, html`<button class="btn line sm" data-act="go" data-to="approvals">לתור האישורים${I('left')}</button>`]
  ];
  const next = steps.filter((x) => !x[1])[0];
  if (!next) return NONE;
  const rows = steps.map((x, i) => html`<div class="fs-i${x[1] ? ' done' : x === next ? ' next' : ''}"><span class="fs-c num">${x[1] ? I('check') : i + 1}</span><b>${x[0]}</b>${x === next ? x[2] : NONE}</div>`);
  return html`<section class="card"><div class="card-h"><div><h2>הצעדים הראשונים</h2><small>כשתסיימו אותם, הפאנל הזה ייעלם לבד</small></div><button class="tlink" data-act="steps-hide">הסתרה</button></div><div>${rows}</div></section>`;
}
function tile(tone, icon, lab, val, sub, a) {
  const inner = html`<span class="ic">${FI(icon)}</span><div><div class="lab">${lab}</div><div class="val num">${val}</div><div class="sub">${sub}</div></div>`;
  if (!a) return html`<div class="tile t-${tone}">${inner}</div>`;
  return html`<button class="tile t-${tone}" data-act="${a[0]}"${a[1] ? html` data-to="${a[1]}"` : NONE}${a[2] ? html` data-id="${a[2]}"` : NONE}>${inner}</button>`;
}
function teamFeed() {
  return html`${M.feed.slice(0, 4).map((f) => {
    const w = worker(f.w);
    return w ? html`<div class="lrow">${face(w, 'keep s')}<span class="tx"><b class="nb">${w.name} ${f.text}</b></span><time>${f.at}</time></div>` : NONE;
  })}`;
}
function viewTeam() {
  const p = M;
  const hd = html`<div class="head"><div><small>${RAW.today}</small><h1>שלום, ${p.name}</h1></div></div>`;
  if (p.status !== 'connected') {
    return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('plug')}</span><b>המחשב עוד לא מחובר</b><p>אחרי החיבור העובדים יופיעו כאן.</p><button class="btn pri mt6" data-act="go" data-to="connect">לחיבור המחשב${I('left')}</button></div></section></div>`;
  }
  if (!p.workers.length) {
    return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('users')}</span><b>עוד אין עובדים</b><p>${LN()} ${lg('ישאל', 'תשאל')} אתכם עד שמונה שאלות על העבודה שלכם ${lg('ויבנה', 'ותבנה')} את העובד הראשון, וכשהוא מוכן הוא יופיע כאן לבד.</p><button class="btn pri mt6" data-act="toast" data-msg="באב הטיפוס זה לא נפתח">להתחיל עם ${LN()}${I('left')}</button></div></section></div>`;
  }
  const onN = p.workers.filter((w) => w.enabled).length, offW = p.workers.filter((w) => !w.enabled);
  const lateW = p.workers.filter((w) => w.late && w.enabled && !p.halted && rep());
  const oldest = p.approvals.length ? p.approvals[p.approvals.length - 1].when : '';
  const tiles = html`<div class="tiles">${[
    tile('accent', 'users', 'עובדים דלוקים', p.halted ? html`0 <small>מתוך ${p.workers.length}</small>` : html`${onN} <small>מתוך ${p.workers.length}</small>`, p.halted ? 'הצוות עצר' : (offW.length ? offW.map((w) => w.name).join(', ') + ' כבוי' : 'כולם פועלים')),
    tile('accent', 'checks', 'מחכה לאישור שלכם', p.approvals.length, p.approvals.length ? 'הישן ביותר מ' + oldest : 'אין מה לאשר', ['go', 'approvals']),
    tile(lateW.length ? 'red' : 'green', lateW.length ? 'alert' : 'clock', 'לא רצו בזמן', lateW.length, lateW.length ? lateW[0].name + ', הריצה של ' + lateW[0].late : 'כולם בזמן', lateW.length ? ['open', '', lateW[0].id] : null),
    RS() ? repTile(RS()) : tile(rep() ? 'green' : 'red', 'laptop', 'המחשב', rep() ? 'מחובר' : 'לא מדווח', rep() ? 'דיווח אחרון לפני דקה' : 'מאז ' + since(), ['go', 'connect'])
  ]}</div>`;
  const alerts = [];
  if (p.halted) alerts.push(html`<div class="alert solid">${I('stop')}<b>כל הצוות עצר</b><span>אף עובד לא יפעל עד שתפעילו את הצוות מחדש.</span></div>`);
  if (!rep()) alerts.push(html`<div class="alert red">${I('alert')}<b>המחשב לא מדווח מאז ${since()}</b><span>הוא כבוי או מנותק מהרשת. העובדים לא פועלים עד שהוא יחזור, ומה שתשנו כאן ייכנס לתוקף אז.</span></div>`);
  /* בשירות האמיתי המסך הזה מגיע מהמחשב עצמו, ולכן הוא דלוק. מה שיכול להיתקע הוא רק הדיווח אלינו */
  if (repFail()) alerts.push(html`<div class="alert red">${I('alert')}<b>הדיווח אלינו לא עובר מאז ${hm(RS().since)}</b><span>${repWhy(RS())}${RS().code === 403 ? ', והמזהה שלו מופיע בחיבור המחשב' : ''}. העובדים ממשיכים לעבוד כרגיל, והמחשב ינסה שוב כל דקה.</span></div>`);

  const rows = p.workers.map((w) => {
    const off = p.halted || !w.enabled, late = w.late && !off && rep(), sy = syncText(w);
    const hb = p.halted ? ['off', 'עצר עם כל הצוות'] : !w.enabled ? ['off', 'כבוי'] : !rep() ? ['off', 'לא דיווח מאז ' + since()] : late ? ['bad', 'הריצה של ' + w.late + ' לא התחילה'] : ['ok', html`<span class="hb-lab">פעילות אחרונה </span>${w.hb}`];
    const dotc = hb[0] === 'ok' ? 'dot live' : hb[0] === 'bad' ? 'dot bad' : 'dot off';
    const nAp = p.approvals.filter((a) => a.w === w.id).length;
    const side = w.id === 'meni'
      ? html`<button class="iconbtn chatb" data-act="chat-open" aria-label="${'שיחה עם ' + LN()}" title="${'שיחה עם ' + LN()}">${I('chat')}</button>`
      : html`<button class="iconbtn chatb" data-act="ap-worker" data-id="${w.id}" aria-label="האישורים של ${w.name}" title="האישורים של ${w.name}">${I('inbox')}${nAp ? html`<span class="dotn tq num">${nAp}</span>` : NONE}</button>`;
    const row = html`<div class="bw${off ? ' off' : ''}${late ? ' late' : ''}"><button class="bw-who" data-act="open" data-id="${w.id}" data-fk="o${w.id}">${face(w)}<span class="mw0"><b>${w.name}</b><small>${w.title}</small></span></button>
      <div class="hb ${hb[0] === 'ok' ? '' : hb[0]}"><span class="${dotc}"></span><span>${hb[1]}${sy ? html`<span class="sync">${sy}</span>` : NONE}</span></div>
      <div class="lvcell"><div class="lvs" role="group" aria-label="דרגה של ${w.name}">${[1, 2, 3, 4].map((n) => html`<button data-act="level" data-id="${w.id}" data-n="${n}" data-fk="l${w.id}${n}" aria-pressed="${w.level === n}" title="${LV[n][0]}">${n}</button>`)}</div><small>${LV[w.level][0]}</small></div>
      <button class="sw" role="switch" aria-checked="${w.enabled}" aria-label="מתג של ${w.name}" data-act="toggle" data-id="${w.id}" data-fk="t${w.id}"${p.halted ? html` disabled` : NONE}></button>${side}</div>`;
    const confirm = S.pendingLevel && S.pendingLevel.w === w.id
      ? html`<div class="rowconfirm" aria-live="polite"><span><b>להעלות את ${w.name} לדרגה ${S.pendingLevel.n}?</b> ${LV[S.pendingLevel.n][1]}</span><button class="btn pri sm" data-act="level-yes" data-fk="ly">להעלות</button><button class="btn line sm" data-act="level-no">ביטול</button></div>` : NONE;
    return html`${row}${confirm}`;
  });
  const board = html`<section class="card"><div class="card-h"><div><h2>הצוות</h2><small>לחצו על עובד כדי לפתוח את הכרטיס שלו</small></div>${p.halted ? html`<span class="pill red">הצוות עצר</span>` : html`<span class="pill ${lateW.length ? 'accent' : 'green'}">${onN === p.workers.length ? 'כולם דלוקים' : onN + ' דלוקים'}</span>`}</div>
    <div class="board-th"><span>עובד</span><span>פעילות אחרונה</span><span>דרגה</span><span>מתג</span><span></span></div>${rows}
    <div class="board-foot"><span class="guard">${I('shield')}שליחה ללקוח, תשלום, מחיקה ופרסום מחכים לאישור שלכם בכל דרגה.</span>
    <button class="btn ${p.halted ? 'redfill' : 'redline'} sm" data-act="halt" aria-pressed="${p.halted}" data-fk="kill">${I(p.halted ? 'power' : 'stop')}${p.halted ? 'הצוות עצר. להפעלה מחדש' : 'עצירה מיידית של כל הצוות'}</button></div></section>`;

  const ap = p.approvals.slice(0, 3).map((a) => {
    const w = worker(a.w);
    return html`<button class="lrow" data-act="ap-open" data-id="${a.id}">${face(w, 'keep')}<span class="tx"><b>${a.title}</b><small>${w.name}, ${a.when}</small></span><span class="pill ${a.tone}">${a.tag}</span></button>`;
  });
  const two = html`<div class="two"><section class="card"><div class="card-h"><div><h2>מחכה לאישור שלכם</h2><small>לחצו על פריט כדי לראות אותו ולהחליט</small></div><button class="link" data-act="go" data-to="approvals">לכל התור${I('upleft')}</button></div>${ap.length ? ap : html`<div class="empty"><span class="eic">${FI('checks')}</span><b>אין מה לאשר</b><p>${solo() ? 'כש' + LN() + lg(' יכין', ' תכין') + ' משהו שצריך אישור, הוא יופיע כאן.' : 'כשעובד יכין משהו שצריך אישור, הוא יופיע כאן.'}</p></div>`}</section>
    <section class="card"><div class="card-h"><div><h2>מה קרה היום</h2><small>${solo() ? 'מה ' + LN() + lg(' עשה', ' עשתה') + ' ומתי, בלי התוכן עצמו' : 'מי עשה מה ומתי, בלי התוכן עצמו'}</small></div><button class="link" data-act="go" data-to="dash">לדשבורד${I('upleft')}</button></div><div id="t-feed">${teamFeed()}</div></section></div>`;
  if (solo()) return html`<div class="${pageClass()}">${hd}${alerts.length ? html`<div class="stk8">${alerts}</div>` : NONE}${quickBox()}${firstSteps(p)}${soloCard(p)}${two}</div>`;
  return html`<div class="${pageClass()}">${hd}${alerts.length ? html`<div class="stk8">${alerts}</div>` : NONE}${quickBox()}${firstSteps(p)}${tiles}${board}${two}</div>`;
}

/* ---------- מני לבד ----------
   הכרטיס של מני בראש מסך הצוות: אותה כותרת כמו בכרטיס העובד, ומתחתיה שלושה דברים שבעל העסק בודק:
   מה מחכה לו, מה מני כבר יודע על העסק, והאם המחשב מדווח. העצירה המיידית נשארת גם כאן */
function learned(p) {
  const t = (p.learn && p.learn.topics) || [];
  return p.memory.length > 0 || (t.length > 0 && t.every((x) => x.state !== 'todo'));
}
function soloCard(p) {
  const w = worker('meni'), off = p.halted || !w.enabled, sy = syncText(w);
  const sub = sy || (off ? lg('לא יפעל עד שתדליקו אותו', 'לא תפעל עד שתדליקו אותה') : lg('עונה כשתכתבו לו', 'עונה כשתכתבו לה'));
  const hbPill = !rep() ? html`<span class="pill gray">לא דיווח מאז ${since()}</span>` : off ? html`<span class="pill gray">כבוי</span>` : html`<span class="pill green"><span class="dot"></span>פעילות אחרונה ${w.hb}</span>`;
  const r = RS();
  const repVal = r ? { ok: 'עובר', fail: 'לא עובר', off: 'כבוי', wait: 'בבדיקה' }[r.state] || 'בבדיקה' : rep() ? 'מחובר' : 'לא מדווח';
  const repSub = r ? (r.state === 'fail' ? repWhy(r) : r.state === 'off' ? 'המחשב הזה לא מדווח לנו' : r.state === 'ok' ? 'המחשב מדווח כל דקה' : 'הדיווח הראשון בדרך') : '';
  const nMem = p.memory.length;
  const stat = (to, val, lab, sub2, tone) => html`<button class="sstat${tone ? ' ' + tone : ''}" data-act="go" data-to="${to}"><b class="num">${val}</b><span><span class="sl">${lab}</span>${sub2 ? html`<small>${sub2}</small>` : NONE}</span>${I('left')}</button>`;
  const confirm = S.pendingLevel && S.pendingLevel.w === w.id
    ? html`<div class="rowconfirm flush" aria-live="polite"><span><b>להעלות את ${LN()} לדרגה ${S.pendingLevel.n}?</b> ${LV[S.pendingLevel.n][1]}</span><button class="btn pri sm" data-act="level-yes" data-fk="ly">להעלות</button><button class="btn line sm" data-act="level-no">ביטול</button></div>` : NONE;
  return html`<section class="card ovh solo"><header class="wh${off ? ' isoff' : ''}"><img class="port" src="${FACE.meni}" alt=""><div class="txt"><small class="solo-k">הצוות שלכם</small><h2 class="solo-n">${LN()}</h2><div class="tt">${w.title}</div><p class="muted">${w.scope}</p><div class="pills"><span class="pill accent">דרגה ${w.level}: ${LV[w.level][0]}</span>${hbPill}</div>
    <div class="wh-cta"><button class="btn line sm" data-act="chat-open">${I('chat')}שיחה עם ${LN()}</button><button class="btn line sm" data-act="open" data-id="meni">לכרטיס של ${LN()}</button></div></div>
    <div class="swbox"><button class="sw" role="switch" aria-checked="${w.enabled}" aria-label="${'מתג של ' + LN()}" data-act="toggle" data-id="meni" data-fk="ts"${p.halted ? html` disabled` : NONE}></button><div><b>${p.halted ? 'עצר עם הצוות' : w.enabled ? 'דלוק' : 'כבוי'}</b><small>${sub}</small></div></div></header>${confirm}
    <div class="solo-stats">${stat('approvals', p.approvals.length, 'מחכה לאישור שלכם', p.approvals.length ? 'הישן ביותר מ' + p.approvals[p.approvals.length - 1].when : 'אין מה לאשר', p.approvals.length ? 'hot' : '')}${stat('learn', nMem, 'דברים ש' + LN() + lg(' יודע', ' יודעת') + ' על העסק', nMem ? 'אישרתם לזכור' : lg('עוד לא לימדתם אותו', 'עוד לא לימדתם אותה'), '')}${stat('connect', repVal, 'הדיווח אלינו', repSub, r && r.state === 'fail' ? 'bad' : '')}</div>
    <div class="board-foot"><span class="guard">${I('shield')}שליחה ללקוח, תשלום, מחיקה ופרסום מחכים לאישור שלכם בכל דרגה.</span>
    <button class="btn ${p.halted ? 'redfill' : 'redline'} sm" data-act="halt" aria-pressed="${p.halted}" data-fk="kill">${I(p.halted ? 'power' : 'stop')}${p.halted ? LN() + lg(' עצר', ' עצרה') + '. להפעלה מחדש' : 'עצירה מיידית של ' + LN()}</button></div></section>`;
}

/* ---------- כרטיס עובד ---------- */
function chart(w) {
  const W = 560, H = 110, n = w.days.length, max = Math.max.apply(null, w.days.concat(1));
  const pad = 9, pts = w.days.map((d, i) => [W - pad - i * ((W - pad * 2) / (n - 1)), H - 10 - d / max * (H - 28)]);
  let path = 'M' + pts[0][0] + ' ' + pts[0][1];
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2;
    path += ' C' + mx + ' ' + a[1] + ' ' + mx + ' ' + b[1] + ' ' + b[0] + ' ' + b[1];
  }
  const last = pts[n - 1], blocked = w.blockedDay >= 0 ? pts[w.blockedDay] : null;
  const grid = [0.33, 0.66, 1].map((f) => { const y = H - 10 - f * (H - 28); return html`<line class="ch-g" x1="0" x2="${W}" y1="${y}" y2="${y}"/>`; });
  return html`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="הפעלות ב-14 הימים האחרונים">${grid}<path class="ch-a" d="${path} L${pad} ${H} L${W - pad} ${H} Z"/><path class="ch-l" d="${path}" fill="none" stroke-width="2.5" stroke-linecap="round"/>${blocked ? html`<circle class="ch-b" cx="${blocked[0]}" cy="${blocked[1]}" r="5" stroke="#fff" stroke-width="2"/>` : NONE}<circle class="ch-n" cx="${last[0]}" cy="${last[1]}" r="5.5" stroke="#fff" stroke-width="2.5"/></svg>
    <div class="chartf"><span>לפני שבועיים</span><span>היום</span></div>`;
}
function workerDone(p, w) {
  const W = WORK[w.id], total = w.days.slice(7).reduce((a, b) => a + b, 0);
  const now = dState(p, w) === 'work' ? 'עכשיו: ' + jobOf(w)[0] + ', ' + mins(DAY.m - w.start) : dSub(p, w);
  const runs = w.runs.slice(-5).reverse().map((r) => html`<li><span class="d ok"></span><span>${W.jobs[r[2]][1]}</span><time>${hhmm(r[0])}</time></li>`);
  return html`<section class="card"><div class="card-h"><div><h2>מה נעשה היום והשבוע</h2><small>${now}</small></div></div><div class="card-b stk10"><div class="mstats"><div class="mstat"><b class="num">${w.days[13]}</b><small>עבודות היום</small></div><div class="mstat"><b class="num">${total}</b><small>עבודות השבוע</small></div></div>
    <small class="muted">השבוע: ${dTally(w, w.weekN.map((n, i) => n + w.dayN[i])) || 'עוד אין'}</small></div>${runs.length ? html`<ul class="tl">${runs}</ul>` : NONE}</section>`;
}
/* הזיכרון הקבוע של מני: מה שאישרתם בתור. מכאן אפשר רק למחוק, והוספה עוברת דרך התור */
function memoryCard(p) {
  const m = p.memory, ask = S.forget ? m.find((x) => x.id === S.forget) : null;
  const rows = m.length
    ? html`<ul class="memlist">${m.map((x) => html`<li><span>${x.text}</span><time>${x.when}</time><button class="btn line sm" data-act="mem-forget" data-id="${x.id}" aria-label="${'למחוק מהזיכרון: ' + x.text}">למחוק</button></li>`)}</ul>`
    : html`<p class="muted">עוד אין כלום בזיכרון.</p>`;
  const conf = ask ? html`<div class="rowconfirm flush" aria-live="polite"><span><b>למחוק מהזיכרון?</b> ${ask.text}</span><button class="btn pri sm" data-act="mem-yes">למחוק</button><button class="btn line sm" data-act="mem-no">ביטול</button></div>` : NONE;
  return html`<section class="card"><div class="card-h"><div><h2>מה ${LN()} ${lg('זוכר', 'זוכרת')}</h2><small>דברים שאישרתם לזכור. ${LN()} ${lg('יודע', 'יודעת')} אותם בכל שיחה חדשה</small></div><button class="link" data-act="go" data-to="learn">${lg('ללמד אותו עוד', 'ללמד אותה עוד')}${I('upleft')}</button></div><div class="card-b">${rows}</div>${conf}</section>`;
}

function viewWorker(id) {
  const p = M, w = worker(id);
  if (!w) return viewTeam();
  const off = p.halted || !w.enabled, sy = syncText(w);
  const late = w.late && !off && rep();
  const sub = sy || (off ? fm(w, 'לא יפעל עד שתדליקו אותו', 'לא תפעל עד שתדליקו אותה') : 'בפעם הבאה: ' + w.next);
  const hbPill = !rep() ? html`<span class="pill gray">לא דיווח מאז ${since()}</span>` : late ? html`<span class="pill red"><span class="dot bad"></span>הריצה של ${w.late} לא התחילה</span>` : off ? html`<span class="pill gray">כבוי</span>` : html`<span class="pill green"><span class="dot"></span>פעילות אחרונה ${w.hb}</span>`;
  const rungs = [1, 2, 3, 4].map((n) => html`<button class="rung${n < w.level ? ' past' : ''}" data-act="level" data-id="${w.id}" data-n="${n}" data-fk="c${n}" aria-pressed="${w.level === n}"><span class="n num">${n}</span><b>${LV[n][0]}</b><small>${LV[n][1]}</small></button>`);
  const pending = S.pendingLevel && S.pendingLevel.w === w.id ? html`<div class="rowconfirm flush" aria-live="polite"><span><b>להעלות את ${w.name} לדרגה ${S.pendingLevel.n}?</b> שליחה ללקוח, תשלום, מחיקה ופרסום ימשיכו לחכות לאישור שלכם.</span><button class="btn pri sm" data-act="level-yes" data-fk="ly">להעלות</button><button class="btn line sm" data-act="level-no">ביטול</button></div>` : NONE;
  const hbTxt = !rep() ? ['לא דיווח מאז ' + since(), 'bad'] : late ? ['הריצה של ' + w.late + ' לא התחילה', 'bad'] : ['פעילות אחרונה ' + w.hb, ''];
  const note = 'את הדרגה מעלים רק אתם, אחרי שראיתם שהעובד כבר כמעט לא צריך תיקונים.';
  const cta = w.id === 'meni'
    ? html`<button class="btn pri sm" data-act="chat-open">${I('chat')}שיחה עם ${LN()}</button>`
    : html`<button class="btn pri sm" data-act="ap-worker" data-id="${w.id}">${I('inbox')}האישורים של ${w.name}</button>`;
  /* ריצה ידנית קיימת רק בשירות האמיתי ורק אצל גבי. כבויה בזמן ריצה, ואצל עובד כבוי או כשהצוות עצר */
  const running = w.st === 'work';
  const runBtn = real() && w.id === 'gabi'
    ? html`<button class="btn line sm" data-act="run" data-id="${w.id}"${running || off ? html` disabled` : NONE}>${running ? 'גבי באמצע ריצה' : 'להריץ עכשיו'}</button>` : NONE;
  return html`<div class="${pageClass()}"><button class="back" data-act="go" data-to="team">${I('right')}לכל הצוות</button>
    <section class="card ovh"><header class="wh${off ? ' isoff' : ''}"><img class="port" src="${FACE[w.id]}" alt=""><div class="txt"><h1>${w.name}</h1><div class="tt">${w.title}</div><p class="muted">${w.scope}</p><div class="pills"><span class="pill accent">דרגה ${w.level}</span>${hbPill}</div><div class="wh-cta">${cta}${runBtn}</div></div>
    <div class="swbox"><button class="sw" role="switch" aria-checked="${w.enabled}" aria-label="מתג של ${w.name}" data-act="toggle" data-id="${w.id}" data-fk="tb"${p.halted ? html` disabled` : NONE}></button><div><b>${p.halted ? 'עצר עם הצוות' : w.enabled ? 'דלוק' : 'כבוי'}</b><small>${sub}</small></div></div></header></section>
    <section class="card"><div class="card-h"><div><h2>דרגה</h2><small>${note}</small></div></div><div class="ladder">${rungs}</div>${pending}</section>
    <div class="wgrid"><div class="stk20"><section class="card"><div class="card-h"><div><h2>פעילות</h2><small>לוח זמנים: ${w.run}</small></div></div><div class="card-b"><div class="hbbig ${hbTxt[1]}">${hbTxt[0]}</div>${chart(w)}</div></section>
    ${real() && w.id === 'meni' ? memoryCard(p) : NONE}<section class="card"><div class="card-h"><div><h2>יומן הלמידה</h2><small>התיקונים עצמם נשארים במחשב שלכם, וכאן רואים רק כמה יש</small></div></div><div class="card-b stk10"><div class="mstats"><div class="mstat"><b class="num">${w.lessons[0]}</b><small>תיקונים נרשמו</small></div><div class="mstat"><b class="num">${w.lessons[1]}</b><small>הפכו לכלל קבוע</small></div></div><small class="muted">תיקון שחוזר שלוש פעמים הופך לכלל קבוע.</small></div></section></div>
    <div class="stk20">${workerDone(p, w)}<section class="card"><div class="card-h"><div><h2>מה קרה לאחרונה</h2></div></div><ul class="tl">${w.log.map((l) => html`<li><span class="d ${l[2]}"></span><span>${l[1]}</span><time>${l[0]}</time></li>`)}</ul></section></div></div></div>`;
}

/* ---------- הקליטה של מני ----------
   בעל העסק מלמד את מני על העסק כמו עובד חדש (דני, 16/11/2026): שיחת היכרות שבה מני שואל, וקבצים בתיקיית העסק.
   מה שמני לומד נשמר רק באישור בתור, ולכן "מה מני כבר יודע" הוא הזיכרון הקבוע.
   מה שהשירות עוד לא שולח פשוט לא מוצג: M.learn = { conv, topics: [{id, title, state}], files: [{name, when}], folder }.
   השאלות עצמן אצל השירות ועוברות אישור של דני, והמסך לא מכיל אף אחת. התיאום: projects/ai-os-product/DESIGN-SYNC-2026-11-16.md */
const LEARN_KEY = 'uos-learn-conv';
/* ההודעה הפותחת, כשהשירות עוד לא פותח שיחת קליטה בעצמו. היא נכנסת לשדה הכתיבה ולא נשלחת לבד */
const learnOpen = () => lg('אני רוצה ללמד אותך על העסק. תשאל אותי שאלה אחת בכל פעם, ומה שכדאי לזכור תציע לי לאישור.', 'אני רוצה ללמד אותך על העסק. תשאלי אותי שאלה אחת בכל פעם, ומה שכדאי לזכור תציעי לי לאישור.');
function learnConv() {
  const L = M.learn;
  if (L && L.conv) return convOf(L.conv);
  let id = null;
  try { id = localStorage.getItem(LEARN_KEY); } catch (e) { /* בלי אחסון בדפדפן אין המשך, ושיחת הקליטה תיפתח מחדש */ }
  return id ? convOf(id) : null;
}
function viewLearn() {
  const p = M, L = p.learn, w = worker('meni');
  const hd = html`<div class="head"><div><small>כמו בקליטה של עובד חדש</small><h1>הקליטה של ${LN()}</h1><p class="lead">${LN()} ${lg('לומד', 'לומדת')} את העסק משיחה איתכם ומהקבצים שתתנו ${lg('לו', 'לה')}. כל דבר ש${lg('הוא רוצה', 'היא רוצה')} לזכור מחכה קודם לאישור שלכם.</p></div></div>`;
  if (p.status !== 'connected') return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('plug')}</span><b>המחשב עוד לא מחובר</b><p>${LN()} ${lg('עובד', 'עובדת')} על המחשב שלכם, ולכן הקליטה מתחילה אחרי החיבור.</p><button class="btn pri mt6" data-act="go" data-to="connect">לחיבור המחשב${I('left')}</button></div></section></div>`;
  if (!w) return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('users')}</span><b>${LN()} עוד לא בצוות</b><p>אחרי ההתקנה ${LN()} ${lg('יופיע', 'תופיע')} כאן, ואפשר יהיה ללמד ${lg('אותו', 'אותה')} על העסק.</p></div></section></div>`;
  const conv = learnConv(), topics = (L && L.topics) || [];
  const nDone = topics.filter((t) => t.state !== 'todo').length;
  const off = p.halted || !w.enabled;
  const prog = topics.length ? html`<div class="ln-prog"><div class="ln-ph"><b>${nDone === topics.length ? LN() + lg(' עבר', ' עברה') + ' על כל הנושאים' : 'הנושאים ש' + LN() + lg(' שואל', ' שואלת') + ' עליהם'}</b><span class="num">${nDone} מתוך ${topics.length}</span></div>
    <span class="ln-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${topics.length}" aria-valuenow="${nDone}"><i data-css="width:${Math.round(nDone / topics.length * 100)}%"></i></span>
    <ol class="ln-topics">${topics.map((t, i) => html`<li class="ln-t is-${t.state}"><span class="ln-c num">${t.state === 'done' ? I('check') : i + 1}</span><span class="mw0">${t.title}</span>${t.state === 'skip' ? html`<span class="pill gray">דילגתם</span>` : NONE}</li>`)}</ol></div>` : NONE;
  const cta = off
    ? html`<div class="ln-cta"><span class="muted">${p.halted ? 'כל הצוות עצר, ולכן אי אפשר להתחיל עכשיו.' : LN() + lg(' כבוי. אחרי שתדליקו אותו', ' כבויה. אחרי שתדליקו אותה') + ' אפשר להתחיל.'}</span></div>`
    : html`<div class="ln-cta"><button class="btn pri" data-act="learn-start">${I('chat')}${conv ? 'להמשיך את השיחה עם ' + LN() : 'להתחיל את השיחה עם ' + LN()}</button>${conv ? html`<span class="muted">${conv.when}</span>` : NONE}</div>`;
  const talk = html`<section class="card ovh ln-talk"><header class="ln-head"><img class="port" src="${FACE.meni}" alt=""><div class="ln-bub"><p>היי ${p.name.split(' ')[0]}, אני ${LN()}. כדי לעבוד טוב אני ${lg('צריך', 'צריכה')} להכיר את העסק, בדיוק ${lg('כמו עובד חדש', 'כמו עובדת חדשה')}.</p><p>אשאל אותך שאלה אחת בכל פעם. אם אין לך תשובה עכשיו, אפשר לדלג ולחזור אליה אחר כך.</p></div></header>
    <div class="card-b stk20">${prog}${cta}</div></section>`;
  const files = L && L.files && L.files.length
    ? html`<ul class="ln-files">${L.files.map((f) => html`<li>${I('file')}<bdi class="mw0">${f.name}</bdi>${f.when ? html`<time>${f.when}</time>` : NONE}</li>`)}</ul>`
    : html`<p class="muted">${L ? 'עוד אין קבצים בתיקיית העסק.' : 'קבצים שתשימו בתיקיית העסק במחשב הזה יגיעו ל' + LN() + '.'}</p>`;
  /* נתיב מלא ארוך מדי לכרטיס: מוצג שם התיקייה, והנתיב המלא בריחוף */
  const fname = L && L.folder ? L.folder.replace(/[\/]+$/, '').split(/[\/]/).pop() || L.folder : '';
  const folder = L && L.folder ? html`<div class="ln-folder"><span title="${L.folder}">${I('laptop')}<span class="mw0">תיקיית העסק: <bdi>${fname}</bdi></span></span>${net.remote ? NONE : html`<button class="btn line sm" data-act="learn-folder">לפתוח את התיקייה</button>`}</div>` : NONE;
  const mats = html`<section class="card"><div class="card-h"><div><h2>קבצים על העסק</h2><small>מחירון, רשימת שירותים, תקנון, נוסחים של מיילים שחוזרים על עצמם</small></div></div>
    <div class="card-b stk10">${files}${folder}<small class="muted">${LN()} ${lg('מקבל', 'מקבלת')} עותק של הקבצים, והמקור נשאר אצלכם בלי שינוי. ${L ? 'קובץ שתוסיפו לתיקייה יגיע ' + lg('אליו', 'אליה') + ' תוך דקה.' : 'קובץ חדש מגיע ' + lg('אליו', 'אליה') + ' בהפעלה הבאה של UOS.'}</small></div></section>`;
  const memAsk = p.approvals.filter((a) => a.w === 'meni' && a.tag === 'זיכרון').length;
  const mem = p.memory.length
    ? html`<ul class="memlist ln-mem">${p.memory.map((x) => html`<li><span>${x.text}</span><time>${x.when}</time></li>`)}</ul>`
    : html`<div class="empty ln-none"><span class="eic">${FI('book')}</span><b>עוד אין כלום</b><p>מה ש${LN()} ${lg('ילמד', 'תלמד')} בשיחה יחכה קודם לאישור שלכם, ורק אחרי האישור הוא נשמר.</p></div>`;
  const known = html`<section class="card"><div class="card-h"><div><h2>מה ${LN()} כבר ${lg('יודע', 'יודעת')}</h2><small>${p.memory.length ? plural(p.memory.length, 'דבר אחד שאישרתם לזכור', 'דברים שאישרתם לזכור') : 'דברים שאישרתם לזכור'}</small></div><button class="link" data-act="open" data-id="meni">לכרטיס של ${LN()}${I('upleft')}</button></div>
    ${memAsk ? html`<div class="ln-wait"><span>${plural(memAsk, 'הצעה אחת לזכור מחכה', 'הצעות לזכור מחכות')} לאישור שלכם</span><button class="tlink" data-act="go" data-to="approvals">לתור האישורים</button></div>` : NONE}<div class="card-b">${mem}</div></section>`;
  const safe = html`<section class="card ln-safe"><span class="fi">${FI('lock')}</span><div><b>איפה נשמר מה ש${LN()} ${lg('לומד', 'לומדת')}</b><p>השיחה, הקבצים ומה ש${LN()} ${lg('זוכר', 'זוכרת')} נשמרים במחשב הזה. מה שאישרתם לזכור תוכלו למחוק מהכרטיס של ${LN()} בכל רגע.</p></div></section>`;
  /* הצוות שמנהל הצוות מציע אחרי השאלות, ולכל עובד החיבורים שהוא צריך (דני, 16/11/2026: "נבנה רשימת חיבורים
     שצריך לעשות לכל סוכן", ועל מה שמחכה לאישור של ספק: "לפחות נכין את הקרקע"). החוזה המוצע לשירות:
     learn.team = [{id, title, does, conns: [{name, state: done|todo|wait|none, need}]}]. בלי השדה מוצג מצב ריק */
  const CONN = { done: ['green', 'מחובר'], todo: ['accent', 'צריך ממך'], wait: ['gray', 'מחכה לאישור'], none: ['gray', 'בלי חיבור ישיר'] };
  const conn = (c, i) => {
    const st = CONN[c.state] ? c.state : 'todo';
    return html`<li class="ln-k is-${st}"><span class="ln-c num">${st === 'done' ? I('check') : i + 1}</span><span class="mw0"><b>${c.name}</b>${c.need ? html`<small>${c.need}</small>` : NONE}</span><span class="pill ${CONN[st][0]}">${CONN[st][1]}</span></li>`;
  };
  const wcard = (t) => {
    const cs = t.conns || [], n = cs.filter((c) => c.state === 'done').length;
    return html`<div class="ln-w"><div class="ln-ph"><b>${t.title}</b>${cs.length ? html`<span class="num">${n} מתוך ${cs.length} מחוברים</span>` : NONE}</div>${t.does ? html`<p class="muted">${t.does}</p>` : NONE}${cs.length ? html`<ol class="ln-conns">${cs.map(conn)}</ol>` : NONE}</div>`;
  };
  const tm = L && L.team && L.team.length ? L.team : null;
  const team = L ? html`<section class="card"><div class="card-h"><div><h2>הצוות ש${LN()} ${lg('מציע', 'מציעה')}</h2><small>לכל עובד: מה הוא יעשה, ואילו חיבורים צריך כדי שיתחיל</small></div></div>
    <div class="card-b stk20">${tm ? tm.map(wcard) : html`<div class="empty ln-none"><span class="eic">${FI('users')}</span><b>עוד אין הצעה</b><p>אחרי השאלות ${LN()} ${lg('יציע', 'תציע')} כאן עובדים נוספים לעסק, ולכל אחד את החיבורים שהוא צריך.</p></div>`}</div></section>` : NONE;
  return html`<div class="${pageClass()}">${hd}<div class="ln-grid"><div class="stk20">${talk}${team}${mats}</div><div class="stk20">${known}${safe}</div></div></div>`;
}

/* ---------- דשבורד חי: מה כל עובד עושה עכשיו, ומה נעשה היום ובשבוע ----------
   הציור הראשון בונה את המסך, ואחריו אירועי השירות מעדכנים רק את מה שהשתנה */
const dashOn = () => S.route === 'dash' || S.route === 'dash-one';
function patch(el, safe) {
  if (el && el._h !== safe.s) { put(el, safe); el._h = safe.s; return true; }
  return false;
}
const fm = (w, male, female) => (w.id === 'meni' ? lg(0, 1) : WORK[w.id].f) ? female : male;
const jobOf = (w) => WORK[w.id].jobs[w.jobI];
const dOrder = (p) => LU_CAST.map((k) => p.workers.filter((w) => w.id === k)[0]).filter(Boolean);
const dState = (p, w) => !rep() ? 'quiet' : p.halted ? 'halt' : !w.enabled ? 'off' : w.st === 'work' ? 'work' : w.late ? 'late' : 'idle';
const dCount = (p) => p.workers.reduce((n, w) => n + w.days[13], 0);
const dMinutes = (p) => p.workers.reduce((n, w) => n + w.runs.reduce((m, r) => m + r[1], 0) + (w.st === 'work' && rep() ? DAY.m - w.start : 0), 0);
function dSub(p, w) {
  const s = dState(p, w);
  return s === 'quiet' ? 'לא ידוע' : s === 'halt' ? fm(w, 'עצר עם הצוות', 'עצרה עם הצוות') : s === 'off' ? fm(w, 'כבוי', 'כבויה') : s === 'work' ? 'באמצע עבודה' : s === 'late' ? fm(w, 'לא התחיל בזמן', 'לא התחילה בזמן')
    : w.lastEnd === null ? 'מחכה לעבודה הבאה' : fm(w, 'סיים', 'סיימה') + ' לפני ' + mins(DAY.m - w.lastEnd);
}
function dBubble(p, w, pop) {
  const s = dState(p, w);
  if (s === 'work') return html`<div class="dbub${pop ? ' pop' : ''}"><span class="lu-dots"><i></i><i></i><i></i></span><span class="dbub-tx">${jobOf(w)[0]}<span class="dt" data-tm>${mins(DAY.m - w.start)}</span></span></div>`;
  if (s === 'late') return html`<div class="dbub late">הריצה של ${w.late} לא התחילה</div>`;
  return NONE;
}
function dSum(p) {
  if (!rep()) return 'המחשב אמור להיות דלוק כל הזמן, והוא לא מדווח מאז ' + since() + '. עד שהוא יחזור אי אפשר לדעת מה הצוות עושה.';
  if (p.halted) return 'כל הצוות עצר, ואף עובד לא יפעל עד שתפעילו אותו מחדש.';
  const by = (s) => dOrder(p).filter((w) => dState(p, w) === s);
  const nm = (w) => w.name, work = by('work'), late = by('late'), off = by('off'), out = [];
  out.push(work.length ? names(work.map(nm)) + ' באמצע עבודה.' : solo() ? 'כרגע ' + LN() + ' לא באמצע עבודה.' : 'כרגע אף אחד לא באמצע עבודה.');
  late.forEach((w) => { out.push(w.name + fm(w, ' לא התחיל', ' לא התחילה') + ' את הריצה של ' + w.late + '.'); });
  if (off.length) out.push(names(off.map(nm)) + (off.length > 1 ? ' כבויים.' : fm(off[0], ' כבוי.', ' כבויה.')));
  return out.join(' ');
}
const dLive = (ok) => html`<span class="dlive${ok ? '' : ' bad'}"><span class="dot ${ok ? 'live' : ''}"></span>${ok ? 'מתעדכן חי' : 'לא מדווח'}</span>`;
const dStat = (n, lab) => html`<div class="dstat"><b class="num">${n}</b><small>${lab}</small></div>`;
const dStats = (p) => html`${dStat(dCount(p), 'עבודות היום')}${dStat(dHours(dMinutes(p)), 'שעות עבודה היום')}<button class="dstat" data-act="go" data-to="approvals"><b class="num">${p.approvals.length}</b><small>מחכה לאישור</small></button>`;
function dColumn(p, w) {
  const n = p.approvals.filter((a) => a.w === w.id).length;
  return html`<div class="dw is-${dState(p, w)}" data-w="${w.id}"><div class="dw-bub">${dBubble(p, w)}</div>
    <button class="dw-who" data-act="open" data-id="${w.id}"><span class="dw-name"><span class="dot live"></span>${w.name}</span><span class="dw-sub">${dSub(p, w)}</span></button>
    <button class="dw-pic" data-act="open" data-id="${w.id}" tabindex="-1" aria-hidden="true"><img src="${FACE[w.id]}" alt=""></button>${n ? html`<button class="dw-ap num" data-act="ap-worker" data-id="${w.id}" aria-label="${plural(n, 'אישור אחד מחכה', 'אישורים מחכים')} אצל ${w.name}" data-tip="מחכה לאישור שלכם">${n}</button>` : NONE}</div>`;
}
const dTally = (w, arr) => WORK[w.id].units.map((u, i) => arr[i] ? plural(arr[i], u[0], u[1]) : '').filter(Boolean).join(', ');
function dLane(p, w) {
  const W = WORK[w.id], span = DAY.end - DAY.start, off = !w.enabled, s = dState(p, w), out = [];
  w.runs.forEach((r) => {
    out.push(html`<i class="tl-b" data-css="inset-inline-start:${pct(r[0])}%;width:${(r[1] / span * 100).toFixed(2)}%" data-tip="${W.jobs[r[2]][1]}, ${hhmm(r[0])} עד ${hhmm(r[0] + r[1])}"></i>`);
  });
  if (w.st === 'work') out.push(html`<i class="tl-b run" data-run="${w.id}" data-css="inset-inline-start:${pct(w.start)}%;width:${((DAY.m - w.start) / span * 100).toFixed(2)}%" data-tip="${jobOf(w)[0]}, מ-${hhmm(w.start)}"></i>`);
  if (w.late && !off) {
    const t = w.late.split(':');
    out.push(html`<i class="tl-miss" data-css="inset-inline-start:${pct(+t[0] * 60 + +t[1])}%" data-tip="הריצה של ${w.late} לא התחילה"></i>`);
  }
  if (!w.runs.length && w.st !== 'work') out.push(html`<span class="tl-note">${s === 'quiet' ? 'אין דיווח מהיום' : off ? fm(w, 'כבוי', 'כבויה') : s === 'late' ? fm(w, 'עוד לא עבד היום', 'עוד לא עבדה היום') : 'עוד אין עבודות היום'}</span>`);
  return html`${out}`;
}
const dLaneSum = (w) => { const n = w.days[13]; return n ? html`<b class="num">${plural(n, 'עבודה אחת', 'עבודות')}</b><small>${dTally(w, w.dayN)}</small>` : html`<small>אין עבודות היום</small>`; };
function dDay(p) {
  const hours = [7, 9, 11, 13, 15, 17, 19].map((h, i, a) =>
    html`<span class="num${i === 0 ? ' first' : i === a.length - 1 ? ' last' : ''}${i % 2 ? ' opt' : ''}${Math.abs(+pct(h * 60) - +pct(DAY.m)) < 7 ? ' hid' : ''}" data-h="${pct(h * 60)}" data-css="inset-inline-start:${pct(h * 60)}%">${h < 10 ? '0' : ''}${h}:00</span>`);
  return html`<div class="tl-row ax"><span></span><div class="tl-hours">${hours}<span class="tl-now num" id="d-nowlab">${hhmm(DAY.m)}</span></div><span></span></div>${dOrder(p).map((w) =>
    html`<div class="tl-row"><button class="tl-who" data-act="open" data-id="${w.id}"><img class="face s" src="${FACE[w.id]}" alt=""><b>${w.name}</b></button><div class="tl-lane${w.enabled ? '' : ' off'}" id="tl-${w.id}">${dLane(p, w)}</div><div class="tl-sum" id="tls-${w.id}">${dLaneSum(w)}</div></div>`)}`;
}
const WK_DAYS = [['ב׳', 'יום שני'], ['ג׳', 'יום שלישי'], ['ד׳', 'יום רביעי'], ['ה׳', 'יום חמישי'], ['ו׳', 'יום שישי'], ['ש׳', 'שבת'], ['היום', 'היום']];
function dWeek(p) {
  const team = dOrder(p);
  let max = 1;
  team.forEach((w) => { w.days.slice(7).forEach((d) => { if (d > max) max = d; }); });
  const lv = (n) => { const r = n / max; return !n ? 0 : r < 0.3 ? 1 : r < 0.55 ? 2 : r < 0.85 ? 3 : 4; };
  const head = html`<div class="wk-row hd"><span></span>${WK_DAYS.map((d, i) => html`<span class="wk-d${i === 6 ? ' today' : ''}">${d[0]}</span>`)}<span class="wk-sum"></span></div>`;
  return html`${head}${team.map((w) => {
    const total = w.days.slice(7).reduce((a, b) => a + b, 0);
    const cells = w.days.slice(7).map((n, i) => html`<span class="wk-c l${lv(n)}${i === 6 ? ' today' : ''}" data-tip="${w.name}, ${WK_DAYS[i][1]}: ${n ? plural(n, 'עבודה אחת', 'עבודות') : 'בלי עבודות'}">${n || ''}</span>`);
    return html`<div class="wk-row"><button class="tl-who wk-who" data-act="open" data-id="${w.id}"><img class="face s" src="${FACE[w.id]}" alt=""><b>${w.name}</b></button>${cells}
      <div class="wk-sum"><b class="num">${plural(total, 'עבודה אחת', 'עבודות')}</b><small>${dTally(w, w.weekN.map((n, i) => n + w.dayN[i]))}</small></div></div>`;
  })}`;
}
const dBody = (p) => S.dRange === 'week' ? html`<div class="wk">${dWeek(p)}</div>` : html`<div class="tlx${rep() ? '' : ' noline'}" data-css="--now:${pct(DAY.m)}%">${dDay(p)}</div>`;
const dFoot = () => S.dRange === 'week'
  ? html`<div class="d-foot"><span>שבעת הימים האחרונים. ככל שהריבוע כהה יותר, נעשו באותו יום יותר עבודות.</span></div>`
  : html`<div class="d-foot"><span><i class="lg-work"></i>עבודה</span><span><i class="lg-miss"></i>ריצה שלא התחילה</span><span><i class="lg-off"></i>כבוי</span>${real() ? NONE : html`<span class="sp">באב הטיפוס הזמן רץ מהר פי 20</span>`}</div>`;
const FEED_NONE = html`<div class="frow-none">עוד אין פעילות היום.</div>`;
const dFeedRow = (f) => html`<div class="frow"><img class="face s" src="${FACE[f.w]}" alt=""><span class="tx"><b>${LU_NAME[f.w]}</b> ${f.text}</span><time>${f.at}</time></div>`;
function viewDash() {
  const p = M;
  const title = solo() ? 'מה ' + LN() + ' עושה עכשיו' : 'מה כל אחד עושה עכשיו';
  const hd = html`<div class="head"><div><h1>${title}</h1></div></div>`;
  if (p.status !== 'connected') return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('plug')}</span><b>המחשב עוד לא מחובר</b><p>אחרי החיבור תראו כאן מה כל עובד עושה.</p><button class="btn pri mt6" data-act="go" data-to="connect">לחיבור המחשב${I('left')}</button></div></section></div>`;
  if (!p.workers.length) return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('users')}</span><b>עוד אין עובדים</b><p>כש${LN()} ${lg('יבנה', 'תבנה')} את העובד הראשון, תראו כאן מה הוא עושה.</p></div></section></div>`;
  const week = S.dRange === 'week';
  const side = html`<div class="dh-side"><span id="d-live">${dLive(rep())}</span><div class="dstats" id="d-stats">${dStats(p)}</div></div>`;
  const seg = html`<div class="dseg" role="group" aria-label="טווח"><button data-act="d-range" data-v="day" aria-pressed="${!week}">היום</button><button data-act="d-range" data-v="week" aria-pressed="${week}">השבוע</button></div>`;
  return html`<div class="${pageClass()}"><section class="dhero${solo() ? ' solo' : ''}" id="d-hero"><div class="dh-top"><div><span class="dh-date">${RAW.today}, <bdi class="num" id="d-clock">${hhmm(DAY.m)}</bdi></span><h1>${title}</h1><p class="dh-sum" id="d-sum">${dSum(p)}</p></div>${side}</div>
    <div class="dline" id="d-line">${dOrder(p).map((w) => dColumn(p, w))}</div></section>
    <div class="dgrid"><section class="card"><div class="card-h"><div><h2>${week ? 'מה נעשה השבוע' : 'מה נעשה היום'}</h2><small>${week ? (solo() ? 'כמה עבודות ' + LN() + lg(' עשה', ' עשתה') + ' בכל יום' : 'כמה עבודות עשה כל עובד בכל יום') : 'כל פס הוא עבודה אחת. עוברים עליו או לוחצים כדי לראות מה נעשה בו'}</small></div>${seg}</div><div id="d-body">${dBody(p)}</div>${dFoot()}</section>
    <section class="card"><div class="card-h"><div><h2>מה קרה לאחרונה</h2><small>${solo() ? 'מה ' + LN() + lg(' עשה', ' עשתה') + ' ומתי, בלי התוכן עצמו' : 'מי עשה מה ומתי, בלי התוכן עצמו'}</small></div></div><div id="d-feed">${p.feed.length ? p.feed.map((f) => dFeedRow(f)) : FEED_NONE}</div></section></div></div>`;
}

/* עדכונים במקום, בלי לצייר את המסך מחדש */
const laneKey = (p, w) => [dState(p, w), w.enabled, w.runs.length, w.st, w.start, w.jobI, w.late].join();
const bubKey = (p, w) => [dState(p, w), w.jobI, w.start, w.late].join();
function dPaintWorker(p, w, pop) {
  const el = document.querySelector('.dw[data-w="' + w.id + '"]');
  if (el) {
    el.className = 'dw is-' + dState(p, w);
    const bub = el.querySelector('.dw-bub'), k = bubKey(p, w);
    if (pop || bub._k !== k) { put(bub, dBubble(p, w, pop)); bub._k = k; }
    el.querySelector('.dw-sub').textContent = dSub(p, w);
  }
  const lane = $('tl-' + w.id), lsum = $('tls-' + w.id);
  if (lane && lane._k !== laneKey(p, w)) { put(lane, dLane(p, w)); lane._k = laneKey(p, w); }
  if (lsum) patch(lsum, dLaneSum(w));
}
/* מצב הציור הראשון של הדשבורד: מה כבר מצויר, כדי לדעת מה לעדכן ומה לצייר מחדש */
let FEED_SHOWN = [];
let DSTRUCT = '';
const feedKey = (f) => f.w + '|' + f.at + '|' + f.text;
function dashStruct() {
  return JSON.stringify([M.status, M.reporting, M.halted, M.zero, S.dRange, M.workers.map((w) => [w.id, w.enabled, w.late || '']), M.approvals.map((a) => a.w)]);
}
function dashMark() {
  DSTRUCT = dashStruct();
  FEED_SHOWN = M.feed.map(feedKey);
  M.workers.forEach((w) => {
    const el = document.querySelector('.dw[data-w="' + w.id + '"]');
    if (el) el.querySelector('.dw-bub')._k = bubKey(M, w);
    const lane = $('tl-' + w.id);
    if (lane) lane._k = laneKey(M, w);
  });
}
/* הבועה של העובד עוברת למקום שנפתח לה ברשימה, כמו במסך הכניסה */
function dFeedAdd(f, ghost, from) {
  const list = $('d-feed');
  if (!list) return;
  const none = list.querySelector('.frow-none'); if (none) none.remove();
  const box = document.createElement('div'); put(box, dFeedRow(f));
  const el = box.firstChild, flying = ghost && !LU_STILL && from.bottom > 0 && from.top < window.innerHeight;
  if (flying) el.style.visibility = 'hidden';
  luFlip(list, () => { list.insertBefore(el, list.firstChild); while (list.children.length > 8) list.removeChild(list.lastChild); });
  FEED_SHOWN.unshift(feedKey(f)); FEED_SHOWN.length = Math.min(FEED_SHOWN.length, 8);
  const to = el.getBoundingClientRect(), done = () => { el.style.visibility = ''; el.classList.add('fresh'); };
  if (!flying || to.top > window.innerHeight - 20 || to.bottom < 0) { done(); return; }
  ghost.className = 'dbub d-fly'; ghost.setAttribute('aria-hidden', 'true');
  ghost.style.width = from.width + 'px'; ghost.style.height = from.height + 'px'; ghost.style.transform = 'translate(' + from.left + 'px,' + from.top + 'px)';
  document.body.appendChild(ghost); ghost.getBoundingClientRect();
  ghost.classList.add('land');
  ghost.style.width = to.width + 'px'; ghost.style.height = to.height + 'px'; ghost.style.transform = 'translate(' + to.left + 'px,' + to.top + 'px)';
  setTimeout(() => { ghost.remove(); done(); }, 640);
}
function dBump() { const b = document.querySelector('#d-stats .dstat b'); if (b) { b.classList.remove('bump'); b.getBoundingClientRect(); b.classList.add('bump'); } }
/* האירוע activity מגיע רגע לפני המצב שמסביר אותו, ולכן שומרים אותו ומפעילים כשהמצב מגיע.
   את הבועה שעומדת לטוס לרשימה צריך לצלם עכשיו, לפני שהמצב החדש מחליף אותה */
let PENDING = [];
function onActivity(a) {
  if (!M || !dashOn() || document.hidden) return;
  const q = { w: a.w, kind: a.kind, row: a.row };
  if (a.kind === 'end') {
    const old = document.querySelector('.dw[data-w="' + a.w + '"] .dbub');
    q.from = old && old.getBoundingClientRect(); q.ghost = old && old.cloneNode(true);
  }
  PENDING.push(q);
}
function dashRefresh() {
  const q = PENDING; PENDING = [];
  if (dashStruct() !== DSTRUCT) { render(); return; }
  const p = M;
  p.workers.forEach((w) => {
    const ev = q.filter((x) => x.w === w.id && x.kind === 'start')[0];
    dPaintWorker(p, w, !!ev);
  });
  const sum = $('d-sum'); if (sum) sum.textContent = dSum(p);
  const clock = $('d-clock'); if (clock) clock.textContent = hhmm(DAY.m);
  patch($('d-stats'), dStats(p));
  if (S.dRange === 'week') patch($('d-body'), dBody(p));
  const list = $('d-feed');
  if (list) {
    let bumped = false;
    q.forEach((ev) => {
      if (ev.row && FEED_SHOWN.indexOf(feedKey(ev.row)) < 0) { dFeedAdd(ev.row, ev.ghost, ev.from); bumped = true; }
    });
    if (M.feed.map(feedKey).join('~') !== FEED_SHOWN.join('~')) {
      put(list, p.feed.length ? html`${p.feed.map((f) => dFeedRow(f))}` : FEED_NONE);
      FEED_SHOWN = M.feed.map(feedKey);
    }
    if (bumped) dBump();
  }
}
function dHoursNear() {
  const now = +pct(DAY.m);
  [].forEach.call(document.querySelectorAll('.tl-hours span[data-h]'), (e) => { e.classList.toggle('hid', Math.abs(+e.dataset.h - now) < 7); });
}
function dTick() {
  if (!dashOn()) return;
  const clock = $('d-clock'); if (clock) clock.textContent = hhmm(DAY.m);
  const p = M;
  if (p.status !== 'connected' || !rep()) return;
  const tlx = document.querySelector('.tlx'), lab = $('d-nowlab');
  if (tlx) tlx.style.setProperty('--now', pct(DAY.m) + '%');
  if (lab) lab.textContent = hhmm(DAY.m);
  dHoursNear();
  p.workers.forEach((w) => {
    const el = document.querySelector('.dw[data-w="' + w.id + '"]');
    if (!el) return;
    el.querySelector('.dw-sub').textContent = dSub(p, w);
    const t = el.querySelector('[data-tm]'); if (t && w.st === 'work') t.textContent = mins(DAY.m - w.start);
    const run = document.querySelector('[data-run="' + w.id + '"]'); if (run && w.st === 'work') run.style.width = ((DAY.m - w.start) / (DAY.end - DAY.start) * 100).toFixed(2) + '%';
  });
  patch($('d-stats'), dStats(p));
}
/* תווית למעבר עכבר, ובנייד בלחיצה */
function dTipFor(e) {
  const tip = $('d-tip'), t = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  if (!tip) return;
  if (!t) { tip.hidden = true; return; }
  tip.textContent = t.dataset.tip; tip.hidden = false;
  const r = t.getBoundingClientRect(), half = tip.offsetWidth / 2;
  tip.style.left = Math.max(half + 8, Math.min(window.innerWidth - half - 8, r.left + r.width / 2)) + 'px';
  tip.style.top = r.top + 'px';
}

/* ---------- תור האישורים ---------- */
function preview(a) {
  if (a.kind === 'post') return html`<div class="preview"><div class="pv-h"><span class="pva">ע</span><div><b>עמותת הדוגמה</b><small>פוסט לעמוד, ביום ראשון הבא ב-10:00</small></div></div><div class="pv-b">${a.body}</div></div>`;
  if (a.kind === 'mail') return html`<div class="preview"><dl class="mailh"><dt>אל</dt><dd>${a.to}</dd><dt>נושא</dt><dd>${a.subject}</dd></dl><div class="pv-b">${a.body}</div></div>`;
  /* קובץ שעובד מבקש לשמור: השם למעלה והתוכן כמו שנכתב, עם הפסקאות והירידות שורה */
  if (a.kind === 'doc') return html`<div class="preview"><dl class="mailh"><dt>קובץ</dt><dd><bdi>${a.name}</bdi></dd></dl><div class="pv-b txt">${paras(a.body)}</div></div>`;
  return html`<div class="preview"><ul class="filel">${a.list.map((f) => html`<li>${I('file')}${f}</li>`)}</ul></div>`;
}
function viewApprovals() {
  const p = M;
  const head = html`<div><h1>תור האישורים</h1><p class="lead">${solo() ? 'כל מה ש' + LN() + lg(' הכין או ביקש', ' הכינה או ביקשה') + ' לזכור מחכה כאן עד שתחליטו.' : 'כל מה שהעובדים הכינו מחכה כאן עד שתחליטו, מסודר לפי עובד.'}</p></div>`;
  if (p.status !== 'connected') return html`<div class="${pageClass()}">${head}<section class="card"><div class="empty"><span class="eic">${FI('plug')}</span><b>המחשב עוד לא מחובר</b><p>אחרי החיבור, מה שהעובדים יכינו יחכה כאן.</p><button class="btn pri mt6" data-act="go" data-to="connect">לחיבור המחשב${I('left')}</button></div></section></div>`;
  const byW = p.workers.map((w) => ({ w, items: p.approvals.filter((a) => a.w === w.id) })).filter((g) => g.items.length);
  const sel = p.approvals.filter((a) => a.id === S.apSel)[0] || (byW[0] ? byW[0].items[0] : null);
  const list = byW.map((g) => html`<div class="ig-h">${face(g.w, 'keep s')}<div><b>${g.w.name}</b><small>${g.w.title}</small></div><span class="ig-n num">${g.items.length}</span></div>${g.items.map((a) =>
    html`<button class="iitem nf" data-act="ap-sel" data-id="${a.id}" aria-current="${!!sel && sel.id === a.id}"><span class="mw0"><b>${a.title}</b><small>${a.when}</small><span class="pill ${a.tone}">${a.tag}</span></span></button>`)}`);
  const done = p.done.length ? html`<div class="idone"><h3>טופלו עכשיו</h3><ul>${p.done.map((d) => html`<li><span>${d.title}</span><span class="pill ${d.tone}">${d.result}</span></li>`)}</ul></div>` : NONE;
  let detail;
  if (sel) {
    const w = worker(sel.w);
    const action = S.fixing === sel.id
      ? html`<form class="field maxw600" data-form="fix" data-id="${sel.id}"><label for="fix-in">מה לתקן?</label><textarea id="fix-in" rows="2" placeholder="למשל: בלי אימוג'י בכותרת"></textarea><small class="muted">התיקון נרשם גם ביומן הלמידה של ${w.name}. תיקון שחוזר שלוש פעמים הופך לכלל קבוע.</small><div class="apact"><button class="btn pri" type="submit">שליחה לתיקון</button><button class="btn line" type="button" data-act="fix-no">ביטול</button></div></form>`
      : html`<div class="apact"><button class="btn pri" data-act="approve" data-id="${sel.id}">${I('check')}לאשר</button><button class="btn line" data-act="fix" data-id="${sel.id}">לתקן</button><button class="btn ghost-red" data-act="reject" data-id="${sel.id}">לדחות</button></div>`;
    detail = html`<div class="idetail"><div class="dhead">${face(w, 'keep l')}<div><h2>${sel.title}</h2><small>${w.name}, ${w.title} · ${sel.when}</small></div><span class="pill ${sel.tone}">${sel.tag}</span></div>${preview(sel)}<div class="will">${I('alert')}<span>${sel.will}</span></div>${action}</div>`;
  } else {
    detail = html`<div class="idetail pc"><div class="empty"><span class="eic">${FI('check')}</span><b>התור ריק</b><p>כשעובד יכין משהו שצריך אישור, הוא יחכה כאן.</p></div></div>`;
  }
  const last = S.lastNote ? html`<div class="alert note">${I('check')}<span>${S.lastNote}</span></div>` : NONE;
  /* תור ריק בלי החלטות מהשעה האחרונה: כרטיס אחד, ולא רשימה ריקה לצד הודעה */
  if (!sel && !p.done.length) return html`<div class="${pageClass()}">${head}${last}<section class="card"><div class="empty"><span class="eic">${FI('check')}</span><b>התור ריק</b><p>${solo() ? 'כש' + LN() + lg(' יכין משהו שצריך אישור, או יציע', ' תכין משהו שצריך אישור, או תציע') + ' משהו לזכור על העסק, זה יחכה כאן.' : 'כשעובד יכין משהו שצריך אישור, הוא יחכה כאן.'}</p></div></section></div>`;
  return html`<div class="${pageClass()}">${head}${last}<section class="card inbox"><div class="ilist">${list}${done}</div>${detail}</section></div>`;
}
const EXPIRED = 'הבקשה כבר לא בתוקף, ושום דבר לא רץ.';
const PAIRED_ONLY = 'את הבקשה הזו מאשרים רק מהטלפון המצומד. מכאן אפשר לדחות אותה או להחזיר לתיקון.';
const afterApprove = (a) => a.kind === 'doc'
  ? (a.w === 'gabi' ? 'אושר. התזכורת נשמרה בתיבת היוצא, ובשלב הזה שום דבר לא נשלח ללקוח.' : a.tag === 'זיכרון' ? 'אושר. ' + LN() + lg(' יזכור', ' תזכור') + ' את זה בכל שיחה מעכשיו.' : 'אושר. הקובץ נשמר בתיקייה של ' + LN() + '.')
  : rep() ? 'אושר ונשלח ל' + worker(a.w).name + '. ' + LN() + lg(' יעדכן', ' תעדכן') + ' אתכם בשיחה כשזה יבוצע.' : 'אושר. זה יבוצע כשהמחשב יחזור לדווח.';

/* ---------- שיחות ---------- */
const paras = (t) => html`${String(t).split(/\n\s*\n/).map((x) => html`<p>${x}</p>`)}`;
function csDot(w) {
  const off = M.halted || !w.enabled;
  return off || !rep() ? 'dot off' : w.late ? 'dot bad' : 'dot live';
}
function csTeamRow(w) {
  const p = M, n = p.approvals.filter((a) => a.w === w.id).length, off = p.halted || !w.enabled;
  return html`<button class="cs-item" data-act="open" data-id="${w.id}"><span class="cs-av">${face(w)}<span class="${csDot(w)}"></span></span><span class="mw0"><b>${w.name}</b><small>${w.title}${off ? ', כבוי' : ''}</small></span><span class="cs-meta">${n ? html`<span class="cs-un num" title="מחכה לאישור">${n}</span>` : NONE}</span></button>`;
}
const QUEUE_WORDS = ['', 'דבר אחד מחכה', 'שני דברים מחכים', 'שלושה דברים מחכים'];
const csPic = () => html`<img class="face s" src="${FACE.meni}" alt="">`;
/* השיחות של מני בשירות האמיתי: רשימה בצד, ובחירה אחת פתוחה. בלי בחירה מוצגת הראשונה ברשימה */
const convList = () => (M && M.convs) || [];
const convOf = (id) => convList().filter((c) => c.id === id)[0] || null;
const curConv = () => convOf(S.conv) || convList()[0] || null;
/* לאן נשלחת הודעה: לשיחה שנבחרה, ואם אין עדיין שיחה, ל-meni והשירות פותח אחת */
const chatTid = () => { const c = real() ? curConv() : null; return c ? c.id : 'meni'; };
const fillPct = (c) => (c && c.tokens > 0 && c.limit > 0) ? Math.min(100, Math.round(c.tokens / c.limit * 100)) : null;
function csMsg(it, c) {
  if (it.t === 'suggest') {
    if (!c) return NONE;
    if (c.next) return html`<div class="m-queue"><span>השיחה ממשיכה בשיחה חדשה</span><button class="btn line sm" data-act="conv-sel" data-id="${c.next}">לשיחה החדשה</button></div>`;
    return html`<div class="m-queue"><span>השיחה הזו התארכה. אפשר להמשיך בשיחה חדשה, ו${LN()} ${lg('ייקח איתו', 'תיקח איתה')} סיכום של מה שחשוב.</span><button class="btn line sm" data-act="conv-new" data-from="${c.id}"${c.busy || M.halted || !(worker('meni') || {}).enabled ? html` disabled` : NONE}>שיחה חדשה עם סיכום</button></div>`;
  }
  if (it.t === 'day') return html`<div class="m-day">${it.text}</div>`;
  if (it.t === 'note') return html`<div class="m-note">${it.text}</div>`;
  if (it.t === 'queue') {
    const n = M.approvals.length;
    return n ? html`<div class="m-queue"><span>${QUEUE_WORDS[n] || 'כמה דברים מחכים'} לאישור שלכם</span><button class="btn line sm" data-act="go" data-to="approvals">לתור האישורים${I('left')}</button></div>` : NONE;
  }
  if (it.t === 'me') {
    const wait = it.st === 'wait';
    return html`<div class="m-row me"><div><div class="m me">${paras(it.text)}</div><div class="m-t ${wait ? 'wait' : 'ok'}">${I(wait ? 'clock' : 'check')}${it.at}${wait ? ', מחכה למחשב' : ''}</div></div></div>`;
  }
  return html`<div class="m-row w"><div><div class="m w">${paras(it.text)}</div><div class="m-t">${it.at}</div></div>${csPic()}</div>`;
}
function convRow(c, sel) {
  return html`<button class="cs-item cs-conv${c.unread ? ' un' : ''}" data-act="conv-sel" data-id="${c.id}" aria-current="${c.id === sel}"><span class="mw0"><b>${c.title}</b><small>${c.when}</small></span><span class="cs-meta">${c.busy ? html`<span class="dot live" role="img" aria-label="מקליד"></span>` : NONE}${c.unread ? html`<span class="cs-un num">${c.unread}</span>` : NONE}</span></button>`;
}
function fillMeter(c) {
  const n = fillPct(c);
  if (n === null) return NONE;
  return html`<div class="cs-fill"><span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><i data-css="width:${n}%"></i></span><small>השיחה מלאה ב-${n}%</small></div>`;
}
function viewThread() {
  const live = real(), c = live ? curConv() : null;
  const p = M, id = live ? (c ? c.id : 'meni') : 'meni', th = (live ? (c && p.threads[c.id]) : p.threads.meni) || { unread: 0, items: [] }, w = worker('meni');
  const state = w.title + ', ' + (p.halted ? 'עצר עם כל הצוות' : !w.enabled ? 'כבוי' : !rep() ? 'לא דיווח מאז ' + since() : 'פעילות אחרונה ' + w.hb);
  /* בשירות האמיתי מני מקליד כל עוד השירות אומר שהשיחה עסוקה, ולא לפי טיימר */
  const typing = live ? !!(c && c.busy) : (!!S.typing && S.typing.tid === id);
  const back = live ? html`<button class="iconbtn cs-back" data-act="cs-list" aria-label="חזרה לשיחות">${I('right')}</button>` : NONE;
  const head = html`<header class="cs-h">${back}<span class="cs-av">${face(w)}<span class="${csDot(w)}"></span></span><div><b>${LN()}</b><small>${state}</small>${live ? fillMeter(c) : NONE}</div><button class="btn line sm" data-act="open" data-id="meni">לכרטיס</button></header>`;
  const bn = rep() ? NONE : html`<div class="cs-bn"><div class="alert red">${I('alert')}<b>המחשב לא מדווח מאז ${since()}</b><span>אפשר לכתוב, וההודעה תגיע כשהמחשב יחזור.</span></div></div>`;
  const items = th.items.map((it) => csMsg(it, c));
  let body = html`${items}`;
  if (!th.items.length && !typing) {
    const fresh = live && !learned(p) && !(learnConv() && c && learnConv().id === c.id);
    body = html`<div class="cs-start"><p class="cs-empty">${solo() ? 'עוד לא כתבתם כאן. כתבו ל' + LN() + ' מה צריך, וכל מה שיוצא החוצה יחכה קודם לאישור שלכם.' : 'עוד לא כתבתם כאן. כתבו ל' + LN() + ' מה צריך, ' + lg('והוא יחלק', 'והיא תחלק') + ' את זה לצוות.'}</p>${fresh ? html`<div class="m-queue cs-learn"><span>כדאי להתחיל בקליטה: ${LN()} ${lg('ישאל', 'תשאל')} אתכם על העסק, ${lg('כמו עובד חדש', 'כמו עובדת חדשה')} ביום הראשון.</span><button class="btn line sm" data-act="go" data-to="learn">לקליטה של ${LN()}${I('left')}</button></div>` : NONE}</div>`;
  }
  if (typing) body = html`${body}<div class="m-row w"><div class="m w"><span class="td" aria-label="מקליד"><i></i><i></i><i></i></span></div>${csPic()}</div>`;
  /* חזרה לשיחה ארוכה אחרי הפסקה: ההודעה לא נשלחה עדיין, ובעל העסק בוחר איפה להמשיך */
  if (c && c.hold) {
    const off = M.halted || !(worker('meni') || {}).enabled ? html` disabled` : NONE;
    body = html`${body}<div class="m-row me"><div><div class="m me">${paras(c.hold)}</div><div class="m-t wait">${I('clock')}מחכה שתבחרו איפה להמשיך</div></div></div>
      <div class="m-queue"><span>השיחה הזו ארוכה, ועבר זמן מאז ש${LN()} ${lg('עבד', 'עבדה')} עליה. אם תמשיכו כאן, ההודעה תנצל הרבה מהמנוי שלכם בקלוד. בשיחה חדשה ${LN()} ${lg('ייקח איתו', 'תיקח איתה')} סיכום של מה שחשוב, וההודעה שלכם תעבור לשם.</span><button class="btn line sm" data-act="conv-new" data-from="${c.id}"${off}>שיחה חדשה עם סיכום</button><button class="btn line sm" data-act="conv-keep" data-id="${c.id}"${off}>להמשיך כאן</button></div>`;
  }
  /* שיחה שממשיכה שיחה קודמת אומרת את זה בראשה, עם דרך חזרה אליה */
  if (c && c.from) body = html`<div class="m-note">ממשיכה את השיחה הקודמת${convOf(c.from) ? html` <button class="tlink" data-act="conv-sel" data-id="${c.from}">לשיחה הקודמת</button>` : NONE}</div>${body}`;
  let foot;
  if (p.halted || !w.enabled) {
    foot = html`<div class="cs-block"><span>${p.halted ? 'כל הצוות עצר, ולכן ' + LN() + lg(' לא יקבל הודעות עד שתפעילו אותו', ' לא תקבל הודעות עד שתפעילו אותה') + ' מחדש.' : LN() + lg(' כבוי, ולכן הודעות לא יגיעו אליו.', ' כבויה, ולכן הודעות לא יגיעו אליה.')}</span>${p.halted ? html`<button class="btn line sm" data-act="halt">להפעלה מחדש</button>` : html`<button class="btn pri sm" data-act="toggle" data-id="meni">הדלקה</button>`}</div>`;
  } else {
    foot = html`<div class="cs-chips">${CHIPS.map((c) => html`<button class="cs-chip" data-act="chat-chip" data-text="${c}">${c}</button>`)}</div>
      <form class="cs-form${live ? ' noclip' : ''}" data-form="chat">${live ? NONE : html`<button class="iconbtn" type="button" data-act="toast" data-msg="באב הטיפוס לא עולה קובץ" aria-label="צירוף קובץ">${I('clip')}</button>`}
      <textarea id="chat-in" data-t="${id}" data-fk="chatin" rows="1" aria-label="${'הודעה ל' + LN()}" placeholder="${'כתבו ל' + LN() + ' מה צריך...'}"></textarea>
      <button class="btn pri" type="submit">${I('send')}שליחה</button></form>`;
  }
  return html`<section class="cs-th">${head}${bn}<div class="cs-msgs" id="chatbox">${body}</div><div class="cs-foot">${foot}</div></section>`;
}
const chatFull = () => M.status === 'connected' && !!worker('meni');
function viewChat() {
  const p = M;
  const hd = html`<div><h1>שיחה עם ${LN()}</h1></div>`;
  if (p.status !== 'connected') return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('plug')}</span><b>המחשב עוד לא מחובר</b><p>העובדים רצים על המחשב שלכם, ולכן אחרי החיבור תוכלו לכתוב ל${LN()} כאן.</p><button class="btn pri mt6" data-act="go" data-to="connect">לחיבור המחשב${I('left')}</button></div></section></div>`;
  if (!worker('meni')) return html`<div class="${pageClass()}">${hd}<section class="card"><div class="empty"><span class="eic">${FI('chat')}</span><b>עוד אין צוות</b><p>אחרי שנקים לכם את הצוות, כותבים כאן ל${LN()} ${lg('והוא מחלק', 'והיא מחלקת')} את העבודה.</p></div></section></div>`;
  const team = p.workers.filter((w) => w.id !== 'meni').map(csTeamRow);
  if (real()) {
    const cs = convList(), cur = curConv(), sel = cur ? cur.id : '';
    return html`<div class="cs${S.csOpen ? ' open' : ''}"><aside class="cs-list multi"><div class="cs-lh row"><h1>שיחות</h1><button class="btn line sm" data-act="conv-new">${I('plus')}שיחה חדשה</button></div>
      <div class="cs-convs">${cs.length ? cs.map((c) => convRow(c, sel)) : html`<p class="cs-none">עוד אין שיחות.</p>`}</div>
      ${team.length ? html`<div class="cs-team"><div class="cs-sec">הצוות</div>${team}</div>` : NONE}</aside>${viewThread()}</div>`;
  }
  return html`<div class="cs open"><aside class="cs-list"><div class="cs-lh"><h1>הצוות של ${LN()}</h1><p>כותבים ל${LN()}, ${lg('והוא מחלק', 'והיא מחלקת')} למי שצריך. המספר ליד עובד הוא מה שמחכה לאישור שלכם.</p></div>${team}</aside>${viewThread()}</div>`;
}
function modalWelcome() {
  const p = M;
  return html`<div class="scrim"><div class="modal welcome" role="dialog" aria-modal="true" aria-labelledby="w-t"><h2 id="w-t" class="welcome-top">ברוכים הבאים ל-UOS</h2><div class="says"><img src="${FACE.meni}" alt=""><div class="bub"><span class="td" aria-hidden="true"><i></i><i></i><i></i></span><div class="tx"><p>היי ${p.name}, אני ${LN()}, ${lg('מנהל', 'מנהלת')} הצוות שלכם. איזה כיף שהתחברתם.</p><p>מעכשיו אפשר פשוט לכתוב לי כאן מה צריך, ואני אחלק את העבודה לעובדים ואבדוק כל דבר לפני שהוא מגיע אליכם. כל מה שיוצא החוצה יחכה קודם לאישור שלכם, אז אין מה לדאוג.</p></div></div></div>
    <div class="row wrow"><button class="btn pri" data-act="welcome-yes" data-fk="wy">בואו נדבר</button><button class="btn line" data-act="welcome-no">אסתכל קודם לבד</button></div></div></div>`;
}

/* ---------- ציור ---------- */
let LAST_SIG = '';
let READING = false;
/* הערכים שרצים כל שנייה (עבודה שמתקדמת, ספירת היום) לא מצדיקים ציור מחדש של מסך שלא מציג אותם */
const VOLATILE = ['st', 'start', 'endAt', 'jobI', 'runs', 'dayN', 'weekN', 'lastEnd', 'days'];
function strip(w) { const o = {}; Object.keys(w).forEach((k) => { if (VOLATILE.indexOf(k) < 0) o[k] = w[k]; }); return o; }
function sigOf() {
  const r = S.route, extra = [];
  /* כרטיס עובד מציג גם את מה שרץ, וכל מסך אחר רק את הפרופיל */
  if (r.indexOf('worker-') === 0) extra.push(worker(r.slice(7)) || null, S.sync);
  return JSON.stringify(Object.assign({}, M, { workers: M.workers.map(strip), feed: [] })) + JSON.stringify(extra) + JSON.stringify(S.typing && S.typing.tid) + JSON.stringify([S.conv, S.csOpen]);
}
function render() {
  if (!M) return;
  const keep = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk : null;
  const ci = $('chat-in'); if (ci) S.drafts[ci.dataset.t] = ci.value;
  const fx = $('fix-in'); if (fx) S.drafts.fix = fx.value;
  const qi = $('quick-in'); if (qi) S.drafts.quick = qi.value;
  const r = S.route;
  let view;
  if (r === 'login') view = viewLogin();
  else if (r === 'connect') view = shell(viewConnect());
  else if (r === 'approvals') view = shell(viewApprovals());
  else if (r === 'dash' || r === 'dash-one') view = shell(viewDash());
  else if (r === 'chat') view = shell(viewChat(), chatFull());
  else if (r.indexOf('worker-') === 0) view = shell(viewWorker(r.slice(7)));
  else if (r === 'learn') view = shell(viewLearn());
  else view = shell(viewTeam());
  /* בשירות האמיתי אין סרגל הדגמה, והמחלקה הזו מורידה את הגובה שלו */
  document.documentElement.classList.toggle('live', real());
  put($('proto'), protoBar());
  put($('app'), view);
  put($('layer'), S.welcome ? modalWelcome() : NONE);
  S.enter = false;
  luStop();
  if (r === 'login') { luPush(true); luPush(true); LU.next = Date.now() + 900; }
  if (keep) { const el = document.querySelector('[data-fk="' + keep + '"]'); if (el) el.focus(); }
  const ci2 = $('chat-in'); if (ci2) ci2.value = S.drafts[ci2.dataset.t] || '';
  const fx2 = $('fix-in'); if (fx2) fx2.value = S.drafts.fix || '';
  const qi2 = $('quick-in'); if (qi2) qi2.value = S.drafts.quick || '';
  const box = $('chatbox'); if (box) box.scrollTop = box.scrollHeight;
  LAST_SIG = sigOf();
  if (dashOn()) dashMark();
  if (r === 'chat') markRead();
}
/* שיחה שנפתחה נחשבת נקראת. השירות סופר, והמסך רק מודיע */
function markRead() {
  if (READING || !RAW || !RAW.threads || !RAW.threads.meni) return;
  let tid = 'meni', n = RAW.threads.meni.unread;
  if (real()) {
    /* נקראת רק השיחה הפתוחה, ובנייד רק כשרואים אותה ולא את הרשימה */
    const c = curConv();
    if (!c || !(S.csOpen || window.innerWidth > 900)) return;
    tid = c.id; n = c.unread;
  }
  if (!n) return;
  READING = true;
  post('/api/threads/' + tid + '/read', {}).then(() => { READING = false; });
}
function renderProto() { if (M) put($('proto'), protoBar()); }
function go(route) {
  S.route = route; S.more = false; S.pendingLevel = null; S.forget = null; S.fixing = null; S.discon = false; S.enter = true; S.lastNote = null;
  if (route !== 'connect') S.justConnected = false;
  if (route === 'chat') S.csOpen = true;
  try { history.replaceState(null, '', '#' + route); } catch (e) { /* המסגרת עלולה לחסום, וזה לא משנה כאן */ }
  render();
  window.scrollTo(0, 0);
}
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}
function copy(text) {
  const done = () => { toast('הועתק'); const l = $('copylbl'); if (l) { l.textContent = 'הועתק'; setTimeout(() => { const m = $('copylbl'); if (m) m.textContent = 'העתקה'; }, 1800); } };
  try { navigator.clipboard.writeText(text).then(done, done); } catch (e) { done(); }
}
/* "נשלח למחשב" ואחריו "נקלט" או "מחכה": מה שרואים אחרי שינוי של עובד, עד שהוא עובר למחשב */
function syncFlow(id) {
  S.sync[id] = 'sending'; render();
  setTimeout(() => {
    S.sync[id] = rep() ? 'ok' : 'wait'; render();
    if (rep()) setTimeout(() => { S.sync[id] = null; render(); }, 2200);
  }, 900);
}

/* ---------- הודעות ---------- */
let TYPING_N = 0;
function startTyping(tid, n) {
  const token = ++TYPING_N;
  S.typing = { tid, n, token };
  /* אם התשובה לא מגיעה, האינדיקציה לא נתקעת לנצח */
  setTimeout(() => { if (S.typing && S.typing.token === token) { S.typing = null; if (M && S.route === 'chat') render(); } }, 9000);
}
function sendChat(tid, text) {
  const items = M.threads[tid] ? M.threads[tid].items : [];
  S.spoke = true;
  /* התשובה מגיעה כ-1.2 שניות אחרי ההודעה, ועד אז רואים שמני מקליד. כשהמחשב לא מדווח ההודעה מחכה, ואין תשובה */
  if (rep() && !real()) startTyping(tid, items.length);
  act('/api/threads/' + tid + '/messages', { text }).then((ok) => {
    if (!ok) { S.typing = null; render(); }
  });
}

/* ---------- פעולות ---------- */
function decide(id, decision, after, text) {
  const a = M.approvals.filter((x) => x.id === id)[0];
  if (!a) return;
  /* מבחוץ, אישור צריך גם את מפתח הגישה (ביומטריה) וגם את מפתח המכשיר, על התוכן המדויק */
  /* מכניסה בסיסמה מאשרים רק בקשה רגילה. המחשב בודק את זה בעצמו, וכאן רק מסבירים מראש */
  if (net.limited && decision === 'approve' && a.risk !== 'normal') { toast(PAIRED_ONLY); return; }
  const proof = net.remote && decision === 'approve' ? net.approveProof(id) : Promise.resolve({});
  proof.then((pr) => {
    if (!pr) { toast('האישור לא נחתם, ולכן לא נשלח.'); return; }
    S.lastNote = after(a); S.fixing = null; S.apSel = null;
    return post('/api/approvals/' + id, Object.assign(text ? { decision, text } : { decision }, pr)).then((s) => {
      if (!okS(s)) { S.lastNote = null; S.apSel = id; toast(s === 409 ? EXPIRED : ERR_MSG); }
      render();
    });
  });
}
function setLevel(id, n) {
  act('/api/workers/' + id, { level: n }).then((ok) => { if (ok) syncFlow(id); });
}
const ACT = {
  go: (d) => { go(d.to); },
  jump: (d) => {
    const to = d.to;
    if (to === 'login') { go('login'); return; }
    if (to === 'connect') { demo({ status: 'none' }).then(() => { go('connect'); }); return; }
    const need = M.status !== 'connected' ? demo({ status: 'connected' }) : Promise.resolve(true);
    need.then(() => {
      if (to === 'worker') {
        const ready = !M.workers.length ? demo({ zero: false, status: 'connected' }) : Promise.resolve(true);
        ready.then(() => { go('worker-pesi'); });
        return;
      }
      go(to);
    });
  },
  more: () => { S.more = !S.more; renderProto(); },
  seg: (d) => {
    const on = d.v === 'true';
    if (d.k === 'zero') {
      if (S.route.indexOf('worker-') === 0 && on) S.route = 'team';
      demo({ zero: on });
    } else {
      demo({ reporting: on });
    }
  },
  logout: () => { go('login'); },
  toast: (d) => { toast(d.msg); },
  copy: () => { copy($('cmd').textContent); },
  'copy-text': (d) => { copy(d.text); },
  newcode: () => { S.code = newCode(); S.secs = 600; render(); toast('נוצר קוד חדש, והקוד הקודם בוטל'); },
  simconnect: () => {
    demo({ status: 'connected' }).then((ok) => {
      if (!ok) return;
      S.spoke = false; S.justConnected = true; S.enter = true; render(); window.scrollTo(0, 0);
    });
  },
  discon: () => { S.discon = true; render(); },
  'discon-no': () => { S.discon = false; render(); },
  'discon-yes': () => { S.code = newCode(); S.secs = 600; S.discon = false; demo({ status: 'none' }).then(() => { render(); }); },
  open: (d) => { go('worker-' + d.id); },
  toggle: (d, el) => {
    const w = worker(d.id);
    if (!w || M.halted) return;
    const on = !w.enabled;
    /* המתג זז מיד, והציור מחדש מחכה רגע כדי שהתנועה תיראה */
    el.setAttribute('aria-checked', String(on));
    S.hold = Date.now() + 240;
    act('/api/workers/' + d.id, { enabled: on }).then((ok) => {
      if (!ok) { S.hold = 0; render(); return; }
      setTimeout(() => { syncFlow(d.id); }, Math.max(0, S.hold - Date.now()));
    });
  },
  level: (d) => {
    const w = worker(d.id), n = +d.n;
    S.pendingLevel = null;
    if (n === w.level) { render(); return; }
    if (n > w.level) { S.pendingLevel = { w: w.id, n }; render(); return; }
    setLevel(w.id, n);
  },
  'level-yes': () => { const pl = S.pendingLevel; S.pendingLevel = null; setLevel(pl.w, pl.n); },
  'level-no': () => { S.pendingLevel = null; render(); },
  'mem-forget': (d) => { S.forget = d.id; render(); },
  'mem-no': () => { S.forget = null; render(); },
  'mem-yes': () => { const id = S.forget; S.forget = null; render(); act('/api/memory/' + encodeURIComponent(id), { forget: true }); },
  halt: () => { act('/api/halt', { halted: !M.halted }); },
  'd-range': (d) => { S.dRange = d.v; render(); },
  'ap-open': (d) => { S.apSel = d.id; go('approvals'); },
  'ap-sel': (d) => { S.apSel = d.id; S.fixing = null; S.lastNote = null; render(); },
  approve: (d) => { decide(d.id, 'approve', afterApprove); },
  reject: (d) => { decide(d.id, 'reject', () => 'נדחה. שום דבר לא יצא.'); },
  fix: (d) => { S.fixing = d.id; render(); const i = $('fix-in'); if (i) i.focus(); },
  'fix-no': () => { S.fixing = null; render(); },
  'after-connect': () => { if (M.workers.length) S.welcome = true; go('team'); },
  'welcome-yes': () => { S.welcome = false; ACT['chat-open']({ id: 'meni' }); },
  'welcome-no': () => { S.welcome = false; render(); },
  'steps-hide': () => { S.stepsHidden = true; render(); },
  /* שיחת הקליטה: ממשיכים אותה אם כבר נפתחה. אחרת השירות פותח אותה (כשיש לו /api/learn/start),
     ואם עוד אין, נפתחת שיחה רגילה וההודעה הפותחת מחכה בשדה הכתיבה עד שבעל העסק שולח */
  'learn-start': () => {
    const c = learnConv();
    if (c) { S.conv = c.id; S.csOpen = true; go('chat'); return; }
    const path = M.learn ? '/api/learn/start' : '/api/convs';
    postJ(path, {}).then((r) => {
      if (!okS(r.s) || !r.j || !r.j.id) { toast(r.s === 409 ? LN() + ' באמצע כתיבה. אפשר לנסות שוב בעוד רגע.' : ERR_MSG); return; }
      if (!M.learn) { try { localStorage.setItem(LEARN_KEY, r.j.id); } catch (e) { /* בלי אחסון השיחה עדיין נפתחת */ } S.drafts[r.j.id] = learnOpen(); }
      S.conv = r.j.id; S.csOpen = true; go('chat');
    });
  },
  'learn-folder': () => { post('/api/learn/folder', {}).then((s) => { if (!okS(s)) toast(ERR_MSG); }); },
  'chat-open': () => {
    S.csOpen = true;
    if (S.route !== 'chat') go('chat'); else render();
    const i = $('chat-in'); if (i && window.innerWidth > 860) i.focus();
  },
  'chat-chip': (d) => { sendChat(chatTid(), d.text); },
  'conv-sel': (d) => { S.conv = d.id; S.csOpen = true; render(); },
  'cs-list': () => { S.csOpen = false; render(); },
  'conv-new': (d) => {
    postJ('/api/convs', d.from ? { from: d.from } : {}).then((r) => {
      if (!okS(r.s)) { toast(r.s === 409 ? LN() + ' באמצע כתיבה. אפשר לנסות שוב בעוד רגע.' : ERR_MSG); return; }
      if (r.j && r.j.id) { S.conv = r.j.id; S.csOpen = true; }
      /* אם השיחה החדשה עוד לא הגיעה ברשימה, המסך מתחלף אליה כשהמצב מגיע, ולא מראים עד אז שיחה אחרת */
      if (!r.j || !r.j.id || convOf(r.j.id)) render();
    });
  },
  'conv-keep': (d) => {
    post('/api/convs/' + d.id + '/keep', {}).then((s) => {
      if (!okS(s)) toast(s === 409 ? 'ההודעה כבר נשלחה.' : ERR_MSG);
    });
  },
  run: (d) => {
    post('/api/workers/' + d.id + '/run', {}).then((s) => {
      if (okS(s)) toast('גבי התחילה לעבוד. מה שהיא תכין יחכה בתור.');
      else toast(s === 409 ? 'גבי כבר באמצע ריצה.' : ERR_MSG);
    });
  },
  'ap-worker': (d) => { const a = M.approvals.filter((x) => x.w === d.id)[0]; S.apSel = a ? a.id : null; go('approvals'); },
  'lu-all': (d, el) => { const on = el.getAttribute('aria-pressed') !== 'true'; LU_CAST.forEach((k) => { LU.off[k] = !on; }); if (on) LU.force = 'meni'; luSync(); luPush(); },
  'lu-sw': (d) => { LU.off[d.id] = !LU.off[d.id]; if (!LU.off[d.id]) { LU.force = d.id; LU.next = 0; } else if (LU.who === d.id) { luStop(); LU.next = Date.now() + 500; } luSync(); if (!LU.off[d.id] || !LU_CAST.some((k) => !LU.off[k])) luPush(); }
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) { if (S.more && !e.target.closest('.proto-more')) { S.more = false; renderProto(); } return; }
  if (el.classList.contains('scrim') && e.target !== el) return;
  const fn = ACT[el.dataset.act];
  if (fn) fn(el.dataset, el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (S.more || S.welcome)) { S.more = false; S.welcome = false; render(); }
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chat-in') { e.preventDefault(); e.target.form.requestSubmit(); }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, kind = f.dataset.form;
  if (kind === 'login') {
    /* בשלב הזה אין כניסה אמיתית, כי השירות נפתח רק מהמחשב עצמו, והכפתור פשוט נכנס */
    go('team');
  } else if (kind === 'fix') {
    const text = $('fix-in').value.trim(), a = M.approvals.filter((x) => x.id === f.dataset.id)[0];
    if (!a) return;
    S.drafts.fix = '';
    /* ההערה נשמרת בשירות בשיחה עם העובד, יחד עם ההחלטה */
    decide(a.id, 'fix', () => 'הוחזר לתיקון. הגרסה החדשה תחכה כאן.', text);
  } else if (kind === 'chat') {
    const input = $('chat-in'), text = input.value.trim(), tid = input.dataset.t || 'meni';
    if (!text) return;
    input.value = ''; S.drafts[tid] = '';
    sendChat(tid, text);
  } else if (kind === 'quick') {
    const qt = $('quick-in').value.trim();
    if (!qt) return;
    S.drafts.quick = '';
    go('chat'); sendChat(chatTid(), qt);
  }
});
document.addEventListener('mouseover', dTipFor);
document.addEventListener('click', dTipFor);
window.addEventListener('scroll', () => { const t = $('d-tip'); if (t) t.hidden = true; }, true);
if (!LU_STILL) setInterval(() => { if (S.route === 'login' && !document.hidden && !LU.busy && Date.now() >= LU.next) luPush(); }, 200);
/* שעון הקוד רץ רק על הטקסט, בלי לצייר מחדש את המסך */
setInterval(() => {
  if (S.secs > 0) S.secs--;
  const t = $('timer');
  if (t && S.route === 'connect') { let s = S.secs; const m = Math.floor(s / 60); s = s % 60; t.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
}, 1000);

/* ---------- מה שמגיע מהשירות ---------- */
let HOLD_T = 0;
function refresh() {
  if (!M || S.route === 'login') { PENDING = []; return; }
  const wait = S.hold - Date.now();
  if (wait > 0) {
    if (!HOLD_T) HOLD_T = setTimeout(() => { HOLD_T = 0; refresh(); }, wait);
    return;
  }
  if (dashOn()) { dashRefresh(); return; }
  PENDING = [];
  if (sigOf() !== LAST_SIG) render();
  else if (S.route === 'team') patch($('t-feed'), teamFeed());
  const rl = $('r-last');
  if (rl) rl.textContent = repLast();
}
function onState(st) {
  const prev = M;
  RAW = st;
  FACE.meni = LN() === 'מני' ? 'img/face-meni.webp' : 'img/face-lead.svg';
  LU_NAME.meni = LN();
  LV = st.levels; WORK = st.work; CHIPS = st.chips;
  DAY.start = st.clock.start; DAY.end = st.clock.end; DAY.m = st.clock.m;
  M = build(st);
  /* הודעה שחיכתה למחשב נקלטה: התשובה בדרך */
  const waited = (x) => x.threads.meni.items.some((i) => i.st === 'wait');
  if (!real() && prev && waited(prev) && !waited(M) && M.reporting) startTyping('meni', M.threads.meni.items.length);
  if (S.typing && !real()) {
    const it = (M.threads[S.typing.tid] || { items: [] }).items, last = it[it.length - 1];
    if (it.length > S.typing.n && last && (last.t === 'w' || last.t === 'note')) S.typing = null;
  }
  if (S.route === 'chat') markRead();
  refresh();
}
function onTick(t) {
  DAY.m = t.m;
  if (M) dTick();
}
let LOST = false;
function listen() {
  net.events('/api/events').then(listenOn, () => setTimeout(listen, 3000));
}
function listenOn(es) {
  es.addEventListener('state', (e) => { onState(JSON.parse(e.data)); });
  es.addEventListener('tick', (e) => { onTick(JSON.parse(e.data)); });
  es.addEventListener('activity', (e) => { onActivity(JSON.parse(e.data)); });
  es.addEventListener('open', () => { LOST = false; });
  es.addEventListener('error', () => {
    if (!LOST) { LOST = true; toast('החיבור לשירות נפסק. מנסים להתחבר שוב.'); }
    /* מבחוץ כל חיבור נחתם מחדש, כי חיבור חוזר עם אותה כתובת הוא שידור חוזר ונדחה */
    if (net.remote || es.readyState === 2) { es.close(); setTimeout(listen, 3000); }
  });
}
/* banner היא שורה קבועה בראש הדף, מחוץ לממשק עצמו. מבחוץ, בכניסה בסיסמה: מה מותר מכאן, ויציאה.
   במחשב עצמו: כל כניסה פתוחה ממחשב שלא צומד, עם ניתוק. כותבת רק textContent */
function banner() {
  const box = document.createElement('div');
  box.className = 'uos-banner';
  box.setAttribute('role', 'status');
  box.dataset.kind = net.limited ? 'limited' : 'local';
  const txt = document.createElement('span');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  box.append(txt, btn);
  if (net.limited) {
    const back = net.backTo;
    txt.textContent = 'כניסה מוגבלת ממחשב שלא צומד: אפשר לראות, לדבר עם ' + LN() + ' ולאשר בקשות רגילות. ';
    btn.textContent = 'יציאה';
    btn.addEventListener('click', () => { net.logout().then(() => location.replace(back + '#out')); });
    document.body.prepend(box);
    return;
  }
  /* בטלפון המצומד: בקשה של מחשב חדש שמחכה לאישור */
  if (net.remote) { linkBanner(); return; }
  let open = [];
  btn.textContent = 'לנתק';
  const check = () => {
    fetch('/api/login').then((r) => (r.ok ? r.json() : null)).then((j) => {
      open = j && j.sessions ? j.sessions.filter((x) => !x.ended) : [];
      if (!open.length) { box.remove(); return; }
      const x = open[0];
      const at = new Date(x.created * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      txt.textContent = 'יש כניסה פתוחה ממחשב שלא צומד' + (x.label ? ' (' + x.label + ')' : '') + ', מ-' + at +
        (open.length > 1 ? ', ועוד ' + (open.length - 1) : '') + '. ';
      if (!box.isConnected) document.body.prepend(box);
    }, () => {});
  };
  btn.addEventListener('click', () => { Promise.all(open.map((x) => post('/api/devices/' + x.id + '/revoke', {}))).then(check); });
  check();
  setInterval(check, 15000);
}

/* linkBanner היא השורה בטלפון המצומד כשמחשב חדש מבקש להתחבר (דני, 10/11: "כמו שאפל מאשרים גישה
   למכשירים חדשים"). אישור דורש ביומטריה, ואחריו מופיע כאן הקוד שמקלידים במחשב החדש. השורה כותבת
   רק textContent, בלי HTML. העיצוב שלה שייך לשיחת העיצוב */
function linkBanner() {
  const box = document.createElement('div');
  box.className = 'uos-banner';
  box.setAttribute('role', 'status');
  box.dataset.kind = 'link';
  const txt = document.createElement('span');
  const ok = document.createElement('button');
  const no = document.createElement('button');
  ok.type = no.type = 'button';
  ok.className = no.className = 'btn';
  ok.textContent = 'לאשר';
  no.textContent = 'לדחות';
  box.append(txt, ok, no);
  let cur = null;  /* הבקשה שמוצגת כרגע */
  let code = null; /* הקוד שלה, אחרי אישור */
  const hide = () => { box.remove(); cur = null; code = null; };
  const check = () => {
    net.linkList().then((j) => {
      const links = j.links || [];
      /* כל עוד הקוד מוצג לא מחליפים אותו, אבל רק כל עוד הבקשה שלו באמת פתוחה. כשהמחשב החדש
         התחבר, או שהזמן עבר, השורה נעלמת לבד ובקשה הבאה מקבלת את מקומה */
      if (code) {
        if (cur && links.some((l) => l.id === cur.id)) return;
        hide();
      }
      const l = links[0];
      if (!l) { hide(); return; }
      cur = l;
      if (l.code) { show(l.code); return; }
      const at = new Date(l.created * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      txt.textContent = 'מחשב חדש מבקש להתחבר' + (l.label ? ' (' + l.label + ')' : '') + ', מ-' + at + '. ';
      ok.hidden = no.hidden = false;
      if (!box.isConnected) document.body.prepend(box);
    }, () => {});
  };
  /* כשהקוד מוצג אין כאן כפתורים: הפעולה עברה למחשב החדש, ודחייה אחרי אישור כבר לא עוזרת */
  const show = (c) => {
    code = c;
    txt.textContent = 'הקוד למחשב החדש: ' + c + '. מקלידים אותו שם בתוך שתי דקות.';
    ok.hidden = no.hidden = true;
    if (!box.isConnected) document.body.prepend(box);
  };
  ok.addEventListener('click', () => {
    if (!cur) return;
    const id = cur.id;
    txt.textContent = 'מאשרים...';
    ok.hidden = no.hidden = true;
    net.linkApprove(id).then((c) => {
      if (c) { show(c); return; }
      toast('האישור לא הושלם. אפשר לנסות שוב.');
      check();
    }, () => { toast('האישור לא הושלם. אפשר לנסות שוב.'); check(); });
  });
  no.addEventListener('click', () => {
    if (cur && !code) net.linkReject(cur.id).then(check, check);
  });
  check();
  setInterval(check, 3000);
}

function start(st) {
  banner();
  onState(st);
  const h0 = (location.hash || '').replace('#', '');
  /* כתובות של מסך האנשים ושל תצוגת המנהל מגרסה 8 נפתחות על הצוות ועל הדשבורד */
  const h = h0 === 'people' ? 'team' : h0 === 'dash-all' ? 'dash' : h0;
  if (h && h !== 'login') S.route = h;
  /* בשירות האמיתי מסך הכניסה של אב הטיפוס לא עושה כלום, כי השירות נפתח רק מהמחשב עצמו. נכנסים ישר לצוות */
  else if (real() && S.route === 'login') S.route = 'team';
  render();
  listen();
}
function down() {
  put($('app'), html`<div class="down">השירות לא עונה. בודקים שוב בעוד רגע.</div>`);
  setTimeout(boot, 3000);
}
function boot() {
  net.init().then(() => {
    /* מבחוץ, דפדפן שלא צומד הולך לכניסה דרך החשבון באתר כשהמחשב שייך לחשבון, אחר כך לסיסמה וקוד,
       ואחרת לדף החיבור באישור מהטלפון. מכל דף אפשר להגיע לאחרים, וגם לצימוד */
    if (net.remote && !net.paired) { location.replace(net.siteOn ? 'site.html' : net.loginOn ? 'login.html' : 'link.html'); return; }
    net.call('/api/state').then((r) => {
      if (net.remote && r.status === 403 && net.limited) {
        const back = net.backTo;
        net.endSession().then(() => location.replace(back + '#ended'));
        return;
      }
      if (net.remote && r.status === 403) { location.replace('pair.html#rejected'); return; }
      if (!r.ok) throw new Error('state');
      return r.json().then(start);
    }).catch(down);
  });
}
boot();
})();
