// UI: reads the controls, runs the model, renders the pick, ranking, table and chart.
import DATA from './data.js';
import { rankOptions, explain, CURRENT_YEAR } from './model.js';

const $ = (id) => document.getElementById(id);
const REPO = 'amalmehta/EnergyForAI';
const DEFAULT_WEIGHTS = { cost: 3, speed: 3, reliability: 3, carbon: 2 };
const WEIGHT_LABELS = { cost: 'Low cost', speed: 'Speed to power', reliability: 'Reliability', carbon: 'Low carbon' };
const LEVELS = ['Ignore', 'Low', 'Some', 'High', 'Critical'];

const store = {
  get(k, d) { try { const v = localStorage.getItem('efa.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('efa.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('efa.')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } },
};

const settings = Object.assign({ theme: 'auto', units: 'mwh', carbon: 'g', remember: true }, store.get('settings', {}));
let state = Object.assign(
  { loadMW: 500, neededBy: CURRENT_YEAR + 3, regionId: 'pjm', mustBeFirm: true, weights: { ...DEFAULT_WEIGHTS } },
  settings.remember ? store.get('input', {}) : {},
);
let view = 'list';
let openRow = null;

// ---------- formatting ----------
const fmtCost = (v) => settings.units === 'kwh' ? `${(v / 10).toFixed(1)}¢/kWh` : `$${v}/MWh`;
const fmtCarbon = (v) => settings.carbon === 't' ? `${v} t/GWh` : `${v} g/kWh`;
const fmtYears = (v) => `${v} yr`;
const srcIndex = new Map(DATA.sources.map((s, i) => [s.id, i + 1]));
const cite = (ids = []) => ids.filter((id) => srcIndex.has(id))
  .map((id) => `<a class="src-ref" href="#src-${id}" title="${esc(DATA.sources[srcIndex.get(id) - 1].title)}">[${srcIndex.get(id)}]</a>`).join('');
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const optById = Object.fromEntries(DATA.options.map((o) => [o.id, o]));

// ---------- static content ----------
function renderStatic() {
  $('facts').innerHTML = DATA.context.slice(0, 4).map((c) =>
    `<li title="${esc(c.fact)}"><strong>${esc(c.headline)}</strong>${esc(c.short)} <sup>${cite(c.src)}</sup></li>`).join('');
  $('sources').innerHTML = DATA.sources.map((s) =>
    `<li id="src-${s.id}"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> — ${esc(s.publisher)}, ${s.year}</li>`).join('');
  $('region').innerHTML = DATA.regions.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  $('neededBy').innerHTML = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR + 1 + i)
    .map((y) => `<option value="${y}">${y} (${y - CURRENT_YEAR} yr from now)</option>`).join('');
  $('weights').innerHTML = Object.keys(DEFAULT_WEIGHTS).map((k) => `
    <label class="field"><span>${WEIGHT_LABELS[k]} <output id="w-${k}-out"></output></span>
      <input type="range" min="0" max="4" step="1" data-weight="${k}"></label>`).join('');
}

function syncControls() {
  $('load').value = state.loadMW;
  $('neededBy').value = state.neededBy;
  if (!DATA.regions.some((r) => r.id === state.regionId)) state.regionId = DATA.regions[0].id;
  $('region').value = state.regionId;
  $('firm').checked = state.mustBeFirm;
  document.querySelectorAll('[data-weight]').forEach((el) => { el.value = state.weights[el.dataset.weight]; });
}

// ---------- render ----------
function render() {
  $('loadOut').textContent = state.loadMW >= 1000 ? `${(state.loadMW / 1000).toFixed(state.loadMW % 1000 ? 2 : 0)} GW` : `${state.loadMW} MW`;
  for (const k of Object.keys(DEFAULT_WEIGHTS)) $(`w-${k}-out`).textContent = LEVELS[state.weights[k]];
  if (settings.remember) store.set('input', state);

  const { region, rows } = rankOptions(DATA, state);
  const firstSentence = (region.notes || '').split(/(?<=\.)\s/)[0];
  $('regionNote').innerHTML = firstSentence ? `<span title="${esc(region.notes)}">${esc(firstSentence)}</span> ${cite(region.src.slice(0, 2))}` : '';
  renderPick(rows, region);
  renderRanking(rows);
  renderTable(rows);
  renderScatter(rows);
}

function flags(r) {
  const f = [];
  if (r.excluded) f.push('<span class="flag bad"><i></i>Not available here</span>');
  else if (r.missesDeadline) f.push('<span class="flag bad"><i></i>Misses deadline</span>');
  else if (r.tight) f.push('<span class="flag warn"><i></i>Tight timeline</span>');
  if (!r.firm) f.push('<span class="flag warn"><i></i>Not firm alone</span>');
  return f.join('');
}

function renderPick(rows, region) {
  const top = rows[0], next = rows.slice(1, 3);
  const opt = optById[top.id];
  $('pick').innerHTML = `
    <div class="eyebrow">Best fit for ${state.loadMW.toLocaleString()} MW in ${esc(region.name)} by ${state.neededBy}</div>
    <h3>${esc(top.name)}</h3>
    <p class="runner">${esc(opt.longName)}</p>
    <div>${flags(top)}</div>
    <div class="stats">
      <div class="stat"><span>Cost</span><b>${fmtCost(top.cost)}</b></div>
      <div class="stat"><span>Time to power</span><b>${fmtYears(top.years)}</b></div>
      <div class="stat"><span>Carbon</span><b>${fmtCarbon(top.carbon)}</b></div>
      <div class="stat"><span>Score</span><b>${top.score}</b></div>
    </div>
    <ul>${explain(top).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    ${opt.notes ? `<p class="runner">${esc(opt.notes)}</p>` : ''}
    <p class="runner">Also consider: ${next.map((r) => `<b>${esc(r.name)}</b> (${r.score})`).join(' and ')}.</p>`;
}

function renderRanking(rows) {
  $('ranking').innerHTML = rows.map((r, i) => {
    const o = optById[r.id];
    const open = openRow === r.id;
    return `<li>
      <button type="button" class="rank-row" data-id="${r.id}" aria-expanded="${open}">
        <span class="rank-n">${i + 1}</span>
        <span class="rank-name">${esc(r.name)}<small>${r.excluded ? 'Not available in this region' : `${fmtCost(r.cost)} · ${fmtYears(r.years)} · ${fmtCarbon(r.carbon)}`}</small></span>
        <span class="bar-track"><span class="bar" style="width:${Math.max(r.score, 1)}%"></span></span>
        <span class="rank-score">${r.score}</span>
      </button>
      ${open ? `<div class="detail">
        <div><b>${esc(o.longName)}</b> ${flags(r)}</div>
        <ul>${explain(r).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="kv">
          <span>Cost range <b>${fmtCost(o.lcoe_usd_mwh.low)}–${fmtCost(o.lcoe_usd_mwh.high)}</b> ${cite(o.lcoe_usd_mwh.src)}</span>
          <span>Timeline <b>${o.years_to_power.low}–${o.years_to_power.high} yr</b> ${cite(o.years_to_power.src)}</span>
          <span>Carbon <b>${fmtCarbon(o.carbon_g_per_kwh.value)}</b> ${cite(o.carbon_g_per_kwh.src)}</span>
          ${o.capacity_factor ? `<span>Capacity factor <b>${Math.round(o.capacity_factor.low * 100)}–${Math.round(o.capacity_factor.high * 100)}%</b> ${cite(o.capacity_factor.src)}</span>` : ''}
        </div>
        ${o.notes ? `<p>${esc(o.notes)}</p>` : ''}
        ${o.examples?.length ? `<p><b>Real deals:</b></p><ul>${o.examples.map((e) => `<li>${esc(e.text)} ${cite(e.src)}</li>`).join('')}</ul>` : ''}
      </div>` : ''}
    </li>`;
  }).join('');
}

function renderTable(rows) {
  $('tableWrap').innerHTML = `<table>
    <thead><tr><th>Option</th><th>Score</th><th>Cost</th><th>Time to power</th><th>Carbon</th><th>Firm</th><th>Projects needed</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.score}</td><td>${fmtCost(r.cost)}</td><td>${fmtYears(r.years)}</td>
      <td>${fmtCarbon(r.carbon)}</td><td>${r.firm ? 'Yes' : 'No'}</td><td>${r.sites}</td></tr>`).join('')}</tbody></table>`;
}

function niceMax(v, step) { return Math.ceil(v / step) * step; }

function renderScatter(rows) {
  const W = 720, H = 360, m = { l: 56, r: 24, t: 16, b: 44 };
  const pts = rows.filter((r) => !r.excluded);
  const xMax = niceMax(Math.max(...pts.map((r) => r.years), state.neededBy - CURRENT_YEAR) + 0.5, 2);
  const costs = pts.map((r) => r.cost);
  const yMax = niceMax(Math.max(...costs) * 1.08, 50);
  const x = (v) => m.l + (v / xMax) * (W - m.l - m.r);
  const y = (v) => H - m.b - (v / yMax) * (H - m.t - m.b);
  const topIds = new Set(rows.slice(0, 3).map((r) => r.id));

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter of cost against years to power for each option">`;
  for (let v = 0; v <= yMax; v += yMax > 300 ? 100 : 50) {
    s += `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<text class="tick" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${settings.units === 'kwh' ? (v / 10) + '¢' : '$' + v}</text>`;
  }
  for (let v = 0; v <= xMax; v += 2) s += `<text class="tick" x="${x(v)}" y="${H - m.b + 18}" text-anchor="middle">${v}</text>`;
  s += `<text class="axis-label" x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle">Years to power</text>`;
  s += `<text class="axis-label" transform="translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle">${settings.units === 'kwh' ? '¢ per kWh' : '$ per MWh'}</text>`;
  const dl = x(state.neededBy - CURRENT_YEAR);
  s += `<line class="deadline" x1="${dl}" x2="${dl}" y1="${m.t}" y2="${H - m.b}"/>`;
  s += `<text class="deadline-label" x="${dl + 6}" y="${m.t + 10}">Your deadline (${state.neededBy})</text>`;

  // Draw muted dots first so the top three sit on top.
  const ordered = [...pts].sort((a, b) => topIds.has(a.id) - topIds.has(b.id));
  for (const r of ordered) {
    const cls = topIds.has(r.id) ? 'top' : 'rest';
    s += `<circle class="dot ${cls}" cx="${x(r.years)}" cy="${y(r.cost)}" r="${cls === 'top' ? 7 : 5.5}"/>`;
    if (cls === 'top') {
      const right = x(r.years) < W - 180;
      s += `<text class="dot-label" x="${x(r.years) + (right ? 12 : -12)}" y="${y(r.cost) + 4}" text-anchor="${right ? 'start' : 'end'}">${esc(r.name)}</text>`;
    }
    s += `<circle class="hit" data-id="${r.id}" cx="${x(r.years)}" cy="${y(r.cost)}" r="14"/>`;
  }
  s += '</svg>';
  $('scatter').innerHTML = s;
  $('scatter').querySelectorAll('.hit').forEach((el) => {
    const r = rows.find((q) => q.id === el.dataset.id);
    el.addEventListener('pointerenter', (e) => showTip(e, r));
    el.addEventListener('pointermove', (e) => moveTip(e));
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('click', () => { openRow = r.id; setView('list'); render(); document.querySelector(`.rank-row[data-id="${r.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  });
}

// ---------- tooltip ----------
const tip = $('tooltip');
function showTip(e, r) {
  tip.innerHTML = `<b>${esc(r.name)}</b>${fmtCost(r.cost)} · ${fmtYears(r.years)} · ${fmtCarbon(r.carbon)}<br>Score ${r.score}${r.missesDeadline ? ' · misses deadline' : ''}`;
  tip.hidden = false; moveTip(e);
}
function moveTip(e) {
  const w = tip.offsetWidth;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - w - 8) + 'px';
  tip.style.top = (e.clientY + 14) + 'px';
}
function hideTip() { tip.hidden = true; }

// ---------- settings, feedback, events ----------
function applyTheme() {
  if (settings.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = settings.theme;
}
function saveSettings() { store.set('settings', settings); applyTheme(); render(); }

function setView(v) {
  view = v;
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === v));
  $('ranking').hidden = v !== 'list';
  $('tableWrap').hidden = v !== 'table';
}

function openSettings() {
  $('setTheme').value = settings.theme; $('setUnits').value = settings.units;
  $('setCarbon').value = settings.carbon; $('setRemember').checked = settings.remember;
  $('settings').showModal();
}

function bind() {
  $('load').addEventListener('input', (e) => { state.loadMW = +e.target.value; render(); });
  $('neededBy').addEventListener('change', (e) => { state.neededBy = +e.target.value; render(); });
  $('region').addEventListener('change', (e) => { state.regionId = e.target.value; render(); });
  $('firm').addEventListener('change', (e) => { state.mustBeFirm = e.target.checked; render(); });
  $('weights').addEventListener('input', (e) => { const k = e.target.dataset.weight; if (k) { state.weights[k] = +e.target.value; render(); } });
  $('resetWeights').addEventListener('click', () => { state.weights = { ...DEFAULT_WEIGHTS }; syncControls(); render(); });
  $('ranking').addEventListener('click', (e) => {
    const b = e.target.closest('.rank-row'); if (!b) return;
    openRow = openRow === b.dataset.id ? null : b.dataset.id; render();
  });
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  $('openSettings').addEventListener('click', openSettings);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); openSettings(); }
  });
  $('setTheme').addEventListener('change', (e) => { settings.theme = e.target.value; saveSettings(); });
  $('setUnits').addEventListener('change', (e) => { settings.units = e.target.value; saveSettings(); });
  $('setCarbon').addEventListener('change', (e) => { settings.carbon = e.target.value; saveSettings(); });
  $('setRemember').addEventListener('change', (e) => {
    settings.remember = e.target.checked;
    if (!settings.remember) store.set('input', {});
    saveSettings();
  });
  $('resetAll').addEventListener('click', () => { location.hash = ''; store.clear(); location.reload(); });

  $('openFeedback').addEventListener('click', () => $('feedback').showModal());
  $('cancelFeedback').addEventListener('click', () => $('feedback').close());
  $('feedbackForm').addEventListener('submit', () => {
    const text = $('feedbackText').value.trim();
    if (!text) return;
    const body = `${text}\n\n---\nRegion: ${state.regionId} · Load: ${state.loadMW} MW · Needed by: ${state.neededBy}`;
    window.open(`https://github.com/${REPO}/issues/new?title=${encodeURIComponent('Feedback: ' + text.slice(0, 60))}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    $('feedbackText').value = '';
  });
}

applyTheme();
renderStatic();
syncControls();
bind();
render();
