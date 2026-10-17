// public/js/utils.js  — CueZone v2 shared utilities
'use strict';

// ── API helpers ──────────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers:{'Content-Type':'application/json'}, credentials:'same-origin' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 401) { window.location.href='/'; return null; }
  try { return await res.json(); } catch { return null; }
}
const GET  = url      => api('GET',    url);
const POST = (url, b) => api('POST',   url, b);
const PUT  = (url, b) => api('PUT',    url, b);
const DEL  = url      => api('DELETE', url);

// ── Toast ────────────────────────────────────────────────────────
function toast(msg, type='success') {
  let c = document.getElementById('toast-container');
  if (!c) { c=document.createElement('div'); c.id='toast-container'; document.body.appendChild(c); }
  const el = document.createElement('div');
  el.className = `toast-msg ${type}`;
  el.textContent = (type==='success'?'✅ ':type==='error'?'❌ ':'ℹ️ ') + msg;
  c.appendChild(el);
  setTimeout(()=>el.remove(), 3500);
}
function liveBoardTotalSaleCard(d, withClear) {
  const sale = `<div class="kpi-card kpi-card-sale">
    <div class="kpi-num text-green">${curSync(d.netProfit)}</div>
    <div class="kpi-label">Total Sale (After Expenses)</div>
  </div>`;
  if (!withClear) return sale;
  const canClear = Number(d?.cashSale || 0) + Number(d?.onlineSale || 0) + Number(d?.loanRecovered || 0) > 0;
  return sale + `<button type="button" class="kpi-card kpi-card-collect" ${canClear?'':'disabled'} onclick="clearLiveBoardShift()" ${canClear?'':'title="Nothing to collect"'}>
    <div class="kpi-num">Cash Collect</div>
    <div class="kpi-subtext">By Owner</div>
  </button>`;
}
async function clearLiveBoardShift() {
  if (!confirm('Collect Live Board sales (cash, online, total) to 0?\n\nUnpaid loans and pending game/café amounts stay. Nothing is deleted.')) return;
  const r = await POST('/api/reports/board-clear');
  if (r?.ok) {
    toast('Live Board sales collected');
    if (typeof loadBoardKPI === 'function') loadBoardKPI();
    if (typeof loadAdminBoard === 'function') loadAdminBoard();
    if (typeof loadBoard === 'function') loadBoard();
    if (typeof loadDashboard === 'function') loadDashboard();
  } else toast(r?.error || 'Could not clear', 'error');
}

function fillCheckoutAll(kind) {
  const amt = Number(document.getElementById('co-amount')?.value) || 0;
  const plusAmount = Number(document.getElementById('co-plus-amount')?.value) || 0;
  const plusUsed = Math.min(amt, plusAmount);
  const disc = Number(document.getElementById('co-discount')?.value) || 0;
  const topay = Math.max(0, amt - plusUsed - disc);
  document.getElementById('co-cash').value = kind === 'cash' ? topay : 0;
  document.getElementById('co-online').value = kind === 'online' ? topay : 0;
  document.getElementById('co-loan').value = kind === 'loan' ? topay : 0;
  if (typeof calcCheckout === 'function') calcCheckout();
}

function updateCheckoutStatus(cash, online, loan, remain) {
  const om = document.getElementById('co-online-method-wrap');
  if (om) om.style.display = online > 0 ? 'block' : 'none';
  const st = document.getElementById('co-status');
  if (!st) return;
  if (remain === 0) {
    const parts = [];
    const plusUsed = Number(document.getElementById('co-plus-amount')?.value) || 0;
    if (plusUsed) parts.push(`Plus Games ${typeof curSync === 'function' ? curSync(plusUsed) : plusUsed}`);
    if (cash) parts.push(`Cash ${typeof curSync === 'function' ? curSync(cash) : cash}`);
    if (online) parts.push(`Online ${typeof curSync === 'function' ? curSync(online) : online}`);
    if (loan) parts.push(`Loan ${typeof curSync === 'function' ? curSync(loan) : loan}`);
    st.textContent = parts.length ? 'Ready: ' + parts.join(' + ') : 'Nothing to collect';
    st.className = 'co-status ok';
  } else if (remain > 0) {
    st.textContent = `${typeof curSync === 'function' ? curSync(remain) : remain} still to assign (cash + online + loan)`;
    st.className = 'co-status bad';
  } else {
    st.textContent = `Too much by ${typeof curSync === 'function' ? curSync(-remain) : -remain} — reduce cash, online, or loan`;
    st.className = 'co-status bad';
  }
}

// ── Date / time helpers ──────────────────────────────────────────
// Local calendar date, NOT toISOString().slice(0,10) — that converts to UTC first, so for any club
// east of UTC (e.g. Pakistan, UTC+5) it silently returns "yesterday" for several hours after local
// midnight, mismatching the server's datetime('now','localtime') timestamps and the actual clock
// on screen (this is what caused an active game to show as running ~24h right after being started).
function todayStr()  { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }
function nowTime()   { const n=new Date(); return n.getHours().toString().padStart(2,'0')+':'+n.getMinutes().toString().padStart(2,'0'); }
function nowDateTime() {
  const n=new Date();
  const p=v=>String(v).padStart(2,'0');
  return `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}
// Wall-clock HH:MM from a stored created_at (local text or UTC ISO).
function orderClock(s) {
  if (!s) return '';
  if (/[TZ]/.test(s)) {
    const d=new Date(s);
    if (!isNaN(d)) return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  return (s.slice(11,16) || '').trim();
}
function fmtTime12(t) {
  if (!t) return '—';
  const [h,m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${(h%12)||12}:${String(m||0).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}
const TIME_12 = { hour: '2-digit', minute: '2-digit', hour12: true };
const TIME_12_SEC = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
function syncTimeHint(inputId, hintId) {
  const el = document.getElementById(inputId);
  const hint = hintId ? document.getElementById(hintId) : null;
  if (!el) return;
  if (hint) hint.textContent = el.value ? fmtTime12(el.value) : '';
}
function initTimeHints() {
  document.querySelectorAll('input[type="time"][data-time-hint]:not([data-hint-bound])').forEach(el => {
    el.dataset.hintBound = '1';
    const sync = () => syncTimeHint(el.id, el.dataset.timeHint);
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
    sync();
  });
}
function fmtDate(d)  {
  if (!d) return '—';
  const [y,m,dy]=d.split('-');
  return `${dy} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
}
// Same as fmtDate, but shows "Today" for the current date — used where "today" is more useful than
// the literal date (e.g. Player Bills).
function fmtDateOrToday(d) { return d===todayStr() ? '<span class="today-tag">Today</span>' : fmtDate(d); }
function fmtDateTime(s) {
  if (!s) return '—';
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    const [datePart, timePart] = s.split(' ');
    return `${fmtDate(datePart)} ${fmtTime12(timePart.slice(0, 5))}`;
  }
  const d=new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-PK',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('en-PK',TIME_12);
}
function calcDuration(start,end) {
  if (!start||!end) return null;
  const [sh,sm]=start.split(':').map(Number), [eh,em]=end.split(':').map(Number);
  let m=(eh*60+em)-(sh*60+sm);
  if (m < 0 && m >= -2) return 0;
  if(m<0)m+=1440;
  return m;
}
function fmtDuration(mins) {
  if (mins===null||mins===undefined) return '—';
  const h=Math.floor(mins/60),m=mins%60;
  return h>0?`${h}h ${m}m`:`${m}m`;
}
function runningMins(startTime, startDate) {
  if (!startTime) return 0;
  const now = new Date();
  const timeOnly = startTime.slice(0, 5);
  const dateOnly = (startDate || todayStr()).slice(0, 10);
  const base = new Date(`${dateOnly}T${timeOnly}:00`);
  let diff = Math.floor((now - base) / 60000);
  if (diff < 0 && diff >= -5) return 0;
  if (diff >= 1435 && diff <= 1445) diff -= 1440;
  if (diff < 0) diff += 1440;
  return Math.max(0, diff);
}
function addDays(dateStr,n) {
  const d=new Date(dateStr); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
}

// ── Currency ─────────────────────────────────────────────────────
let _settings=null;
async function getSettings() {
  if (_settings) return _settings;
  _settings = await GET('/api/settings'); return _settings;
}
async function refreshBranding() {
  if (!document.getElementById('club-logo')) return;
  _settings = await GET('/api/settings');
  if (!_settings) return;
  applyBranding(_settings);
  applyDemoVideoNav(_settings);
  return _settings;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshBranding();
});
function curSync(n,sym='Rs.') { return `${sym} ${Number(n||0).toLocaleString()}`; }

// Century billing total, in Rs. — a table can price century games per-minute AND/OR per-hour;
// rateType (per-game, chosen by the employee at start) picks which one applies. 'hour' only takes
// effect if the table actually has an hour rate set, and bills in whole-hour blocks, not prorated:
// the first 10 minutes are a grace period, then each following 60 minutes adds another block.
// Mirrors calcAmount() / centuryHourBlocks() in routes/games.js.
function centuryHourBlocks(mins) {
  const minutes = Number(mins || 0);
  if (minutes < 10) return 0;
  return Math.floor((minutes - 10) / 60) + 1;
}
function centuryAmount(t, mins, rateType) {
  if (mins === null || mins === undefined) return 0;
  if (rateType === 'hour' && t?.rate_hour) return Math.round(centuryHourBlocks(mins) * t.rate_hour);
  return Math.round(mins * (t?.rate_min || 3));
}

// ── Sidebar branding (club logo + "show club name instead of CueZone") ──
// Set by superadmin per tenant; used by the admin/employee sidebar-brand block.
function applyBranding(s) {
  const logo = document.getElementById('club-logo');
  if (logo) {
    if (s?.logo) {
      logo.onerror = () => { logo.style.display = 'none'; };
      logo.src = '/uploads/logos/' + s.logo + '?v=' + encodeURIComponent(s.logo);
      logo.style.display = 'block';
    } else logo.style.display = 'none';
  }
  const title = document.getElementById('brand-title');
  const nameLbl = document.getElementById('club-name-lbl');
  document.documentElement.classList.toggle('theme-games', s?.club_kind === 'game');
  if (s?.show_club_name && s?.club_name) {
    if (title) title.textContent = s.club_name;
    if (nameLbl) nameLbl.style.display = 'none';
  } else {
    if (title) title.textContent = '🎱 CueZone';
    if (nameLbl) { nameLbl.style.display = ''; if (s?.club_name) nameLbl.textContent = s.club_name; }
  }
}

function applyDemoVideoNav(s) {
  const slot = document.getElementById('nav-videos-slot');
  if (!slot) return;
  const hasSnooker = !!s?.has_snooker;
  const hasGames = !!s?.has_games;
  const item = (href, icon, label) =>
    `<a class="nav-item" href="${href}" target="_blank"><span class="icon">${icon}</span>${label}</a>`;
  if (hasSnooker && hasGames) {
    slot.innerHTML =
      item('/demo-videos?category=snooker', '🎬', 'Snooker Demo Videos') +
      item('/demo-videos?category=games', '🎮', 'Games Demo Videos');
  } else if (hasGames) {
    slot.innerHTML = item('/demo-videos?category=games', '🎮', 'Demo Videos');
  } else {
    slot.innerHTML = item('/demo-videos?category=snooker', '🎬', 'Demo Videos');
  }
}

// Outstanding loan tied to a game: a fully-loan game owes its whole balance;
// a mixed double ('partial') uses the per-game linked loan_amount.
function gameLoanAmt(g) {
  const linked = Number(g.loan_amount || 0);
  if (g.payment_status === 'loan') return Math.max(linked, (g.amount||0) - (g.paid_amount||0));
  return linked;
}
function isOnlineMethod(m) {
  return ['online','easypaisa','jazz_cash','card','bank'].includes(String(m||'').toLowerCase());
}
function isPaidNow(v) {
  return v === 'paid' || v === 'paid_online' || isOnlineMethod(v);
}
function gameCashAmt(g) {
  if (!g || g.status === 'void' || g.status === 'cancelled' || g.status === 'active') return 0;
  const pc = Number(g.paid_cash || 0), po = Number(g.paid_online || 0);
  if (po > 0 || pc > 0) return pc;
  if (g.payment_method === 'discount' || g.payment_method === 'loan') return 0;
  const paid = g.payment_status === 'paid' ? Number(g.amount||0) : Number(g.paid_amount||0);
  return isOnlineMethod(g.payment_method) ? 0 : paid;
}
function gameOnlineAmt(g) {
  if (!g || g.status === 'void' || g.status === 'cancelled' || g.status === 'active') return 0;
  const pc = Number(g.paid_cash || 0), po = Number(g.paid_online || 0);
  if (po > 0 || pc > 0) return po;
  if (g.payment_method === 'discount' || g.payment_method === 'loan') return 0;
  const paid = g.payment_status === 'paid' ? Number(g.amount||0) : Number(g.paid_amount||0);
  return isOnlineMethod(g.payment_method) ? paid : 0;
}

// Ball-count tier price (15/10/6/1 ball) — optional, additive override on top of a table's flat
// rate_game. Falls back to rate_game when no ball_type is chosen or the table hasn't priced that tier.
// Mirrors getBallRate() in routes/games.js.
function getBallRate(table, ballType) {
  if (!table) return 0;
  const col = { '15ball':'price_15ball', '10ball':'price_10ball', '6ball':'price_6ball', '1ball':'price_1ball' }[ballType];
  const tiered = col ? table[col] : null;
  return (tiered !== null && tiered !== undefined) ? Number(tiered) : (table.rate_game || 0);
}

// Human label for a stored ball_type ('15ball' → '15 Ball'); '—' when not applicable (e.g. Century, Standard Rate).
function ballTypeBadge(bt) {
  const m = { '15ball':'15 Ball', '10ball':'10 Ball', '6ball':'6 Ball', '1ball':'1 Ball' };
  return m[bt] ? `<span class="badge badge-blue text-xs">${m[bt]}</span>` : '<span class="text-muted text-xs">—</span>';
}

// ── Badges ───────────────────────────────────────────────────────
function payBadge(s, method) {
  if (method === 'free_of_cost') return '<span class="badge badge-orange">Guest / Free of Cost</span>';
  const labels = { easypaisa:'EasyPaisa', jazz_cash:'JazzCash', card:'Card', online:'Online', cash:'Cash', mixed:'Mixed' };
  if ((s === 'paid' || s === 'partial') && isOnlineMethod(method))
    return `<span class="badge badge-green">${labels[method]||'Online'}</span>`;
  if (s === 'paid' && method === 'cash') return '<span class="badge badge-green">Cash</span>';
  if (s === 'paid' && method === 'mixed') return '<span class="badge badge-orange">Cash + Online</span>';
  const m={paid:'badge-green',loan:'badge-red',partial:'badge-orange',pending:'badge-muted'};
  return `<span class="badge ${m[s]||'badge-muted'}">${labels[s]||s}</span>`;
}
function statusBadge(s) {
  const m={active:'badge-green',completed:'badge-muted',void:'badge-red',cancelled:'badge-orange'};
  return `<span class="badge ${m[s]||'badge-muted'}">${s}</span>`;
}
function typeBadge(t) {
  const m={single:'<span class="badge badge-gold">Single</span>',double:'<span class="badge badge-blue">Double</span>',century:'<span class="badge badge-purple">Century</span>',final:'<span class="badge badge-green">Final</span>',cashout:'<span class="badge badge-red">Cash Out</span>',
    single_player:'<span class="badge badge-gold">Single Player</span>','1v1':'<span class="badge badge-blue">1v1</span>','2v2':'<span class="badge badge-purple">2v2</span>'};
  return m[t]||t;
}

function arcadeAmount(t, mins, billingType, tokenCount) {
  const n = Number(mins || 0);
  if (billingType === 'token') return Math.round(Number(t?.rate_token || 0) * Math.max(1, Number(tokenCount || 1)));
  if (billingType === 'min') return Math.round(n * Number(t?.rate_min || 0));
  if (billingType === '30min') return Math.round(Math.max(1, Math.ceil(n / 30)) * Number(t?.rate_30min || 0));
  if (billingType === 'hour') return Math.round(centuryHourBlocks(n) * Number(t?.rate_hour || 0));
  return Math.round(Number(t?.rate_game || 0));
}
function loanBadge(s) {
  if(s==='paid')    return '<span class="badge badge-green">Paid</span>';
  if(s==='partial') return '<span class="badge badge-orange">Partial</span>';
  return '<span class="badge badge-red">Unpaid</span>';
}

// ── Café inventory categories ────────────────────────────────────
const CAFE_CATEGORIES = ['Cigarette', 'Biscuit', 'Cold Drink', 'Snacks', 'Water', 'Tea', 'Coffee', 'Other'];

function fillCafeCategorySelect(sel, value, { placeholder, includeAll } = {}) {
  if (!sel) return;
  let html = '';
  if (includeAll) html += '<option value="">All</option>';
  else html += `<option value="">${placeholder || 'Select category'}</option>`;
  CAFE_CATEGORIES.forEach(c => { html += `<option value="${c}">${c}</option>`; });
  if (value && !CAFE_CATEGORIES.includes(value)) {
    html += `<option value="${String(value).replace(/"/g, '&quot;')}">${value}</option>`;
  }
  sel.innerHTML = html;
  if (value) sel.value = value;
}
function subStatusBadge(s) {
  const m={active:'badge-green',trial:'badge-blue',expiring_soon:'badge-orange',expired:'badge-red',trial_expired:'badge-red',suspended:'badge-muted'};
  return `<span class="badge ${m[s]||'badge-muted'}">${s.replace('_',' ')}</span>`;
}

// ── Modal helpers ────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeAllModals(){ document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open')); }
document.addEventListener('click', e=>{ if(e.target.classList.contains('modal-overlay')) closeAllModals(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeAllModals(); });

// ── Nav / page ───────────────────────────────────────────────────
function showPage(pageId,navId) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
  if(navId) document.getElementById(navId)?.classList.add('active');
}

// ── Clock ────────────────────────────────────────────────────────
function startClock(elId) {
  const el=document.getElementById(elId); if(!el) return;
  const u=()=>{ el.textContent=new Date().toLocaleTimeString('en-PK',TIME_12_SEC); };
  u(); setInterval(u,1000);
}

// ── initials ─────────────────────────────────────────────────────
function initials(name) { return (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

// ── Password show/hide eye toggle ───────────────────────────────
// Pair a `.pw-eye` button right after a password `<input>` inside a `.pw-wrap`; call this from its onclick.
function togglePwField(btn) {
  const input = btn.parentElement ? btn.parentElement.querySelector('input') : btn.previousElementSibling;
  if (!input) return;
  if (input.classList.contains('pw-mask') || input.dataset.pwField === '1') {
    const revealing = input.classList.contains('pw-mask');
    input.classList.toggle('pw-mask', !revealing);
    btn.textContent = revealing ? '🙈' : '👁️';
    return;
  }
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁️';
}

// Keep the browser password manager off every in-app field. Login pages do not load this file,
// so username/password save still works only on / and /superadmin-login.
function disablePasswordManager(el) {
  if (!el || el.nodeType !== 1) return;
  if (el.dataset && el.dataset.allowPasswordSave === '1') return;
  const tag = (el.tagName || '').toLowerCase();
  if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') return;
  const isSecret = el.classList.contains('pw-mask') || el.type === 'password' || el.dataset.pwField === '1';
  el.setAttribute('autocomplete', isSecret ? 'new-password' : 'off');
  el.setAttribute('data-lpignore', 'true');
  el.setAttribute('data-1p-ignore', 'true');
  el.setAttribute('data-bwignore', 'true');
  el.setAttribute('data-form-type', 'other');
  if (el.type === 'password') {
    el.type = 'text';
    el.classList.add('pw-mask');
    el.dataset.pwField = '1';
    el.setAttribute('autocomplete', 'new-password');
  }
  if (isSecret) el.dataset.pwField = '1';
  const n = (el.getAttribute('name') || '').toLowerCase();
  if (n === 'username' || n === 'password' || n === 'user' || n === 'email') {
    el.setAttribute('name', 'ns_' + (el.id || 'f'));
  }
}

function disablePasswordManagerIn(root) {
  if (!root) return;
  if (root.matches && (root.matches('input,select,textarea'))) disablePasswordManager(root);
  (root.querySelectorAll ? root.querySelectorAll('input,select,textarea') : []).forEach(disablePasswordManager);
}

(function initNoPasswordSave() {
  const run = () => {
    disablePasswordManagerIn(document);
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1) disablePasswordManagerIn(n);
        });
      });
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  document.addEventListener('DOMContentLoaded', initTimeHints);
})();

const GAME_STYLE_IMGS = {
  controller: '/img/games/controller.jpg',
  carrom: '/img/games/carrom.jpg',
  chess: '/img/games/chess.jpg',
  ludo: '/img/games/ludo.jpg',
  tabletennis: '/img/games/tabletennis.jpg'
};
function gameStyleKey(t) {
  const s = String(t?.game_style || '').toLowerCase().replace(/[-_]/g, '');
  const key = s === 'tabletennis' || s === 'pingpong' ? 'tabletennis' : s;
  if (GAME_STYLE_IMGS[key]) return key;
  const n = String(t?.name || '').toLowerCase();
  if (/carrom|carom/.test(n)) return 'carrom';
  if (/chess/.test(n)) return 'chess';
  if (/ludo/.test(n)) return 'ludo';
  if (/tennis|ping/.test(n)) return 'tabletennis';
  return 'controller';
}
function isGameTable(t) {
  return (t?.table_kind || t?.table_kind) === 'game';
}
function gameStyleAttr(t) {
  if (!isGameTable(t)) return '';
  return ` data-game-style="${gameStyleKey(t)}"`;
}
function gameStyleImg(t) {
  if (!isGameTable(t)) return '';
  return `<div class="t-photo" aria-hidden="true"><img src="${GAME_STYLE_IMGS[gameStyleKey(t)]}" alt=""/></div>`;
}
