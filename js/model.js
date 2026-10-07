// Scoring model: turns a developer's inputs into a ranked list of power options.
// Pure functions only — no DOM — so it runs in the browser and under `node --test`.

export const CURRENT_YEAR = 2026;

// Reference conditions the base figures in data.js are assumed to describe.
// Regional adjustments scale away from these.
export const REF = {
  solarCF: 0.25,     // US utility PV average capacity factor
  windCF: 0.35,      // US onshore wind average capacity factor
  gasPrice: 2.5,     // $/MMBtu: rough 2024 US delivered price to power plants, so only the regional differential passes through
  queueYears: 4.6,   // LBNL national median request-to-operation time (55 months)
};

// Options whose timeline depends on the regional interconnection queue.
const QUEUE_BOUND = new Set(['grid', 'solar_storage', 'wind_storage', 'solar_wind_gas_hybrid', 'hydro']);

// Heat rates (MMBtu per MWh) used to pass regional gas prices through to cost.
const HEAT_RATE = {
  gas_ccgt: 6.5,
  gas_recip_or_aero: 9.0,
  fuel_cells: 7.0,
  solar_wind_gas_hybrid: 2.5, // gas covers roughly a third of the hours
};

const RESOURCE_COST = { good: 1, fair: 1.25, poor: null };
const RESOURCE_DELAY = { good: 0, fair: 1, poor: null };

const mid = (r) => (r && r.low != null && r.high != null ? (r.low + r.high) / 2 : null);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Apply a region's conditions to one option. Returns a flat, comparable record. */
export function evaluateOption(opt, region, input) {
  const notes = [];
  let cost = mid(opt.lcoe_usd_mwh);
  let years = mid(opt.years_to_power);
  let yearsLow = opt.years_to_power?.low ?? years;
  let carbon = opt.carbon_g_per_kwh?.value ?? 0;
  let available = true;

  if (opt.id === 'grid') {
    if (region.industrial_power_price_usd_mwh) cost = region.industrial_power_price_usd_mwh;
    if (region.grid_carbon_g_per_kwh) carbon = region.grid_carbon_g_per_kwh;
  }
  // Regional queue medians measure new generators, not load, so they only scale the national range.
  const q = mid(region.grid_queue_years);
  if (q && QUEUE_BOUND.has(opt.id)) {
    const f = clamp(q / REF.queueYears, 0.7, 1.3);
    years *= f; yearsLow = +(yearsLow * f).toFixed(1);
  }
  if (HEAT_RATE[opt.id] && region.gas_price_usd_mmbtu) {
    cost += (region.gas_price_usd_mmbtu - REF.gasPrice) * HEAT_RATE[opt.id];
  }
  if (opt.id === 'solar_storage' && region.solar_cf) {
    cost *= clamp(REF.solarCF / region.solar_cf, 0.75, 1.6);
  }
  if (opt.id === 'wind_storage' && region.wind_cf) {
    cost *= clamp(REF.windCF / region.wind_cf, 0.75, 1.8);
  }
  if (opt.id === 'solar_wind_gas_hybrid' && region.solar_cf) {
    cost *= clamp(0.5 + 0.5 * (REF.solarCF / region.solar_cf), 0.85, 1.3);
  }
  for (const [id, key] of [['geothermal', 'geothermal_resource'], ['hydro', 'hydro_resource']]) {
    if (opt.id !== id) continue;
    const res = region[key] || 'fair';
    if (RESOURCE_COST[res] == null) {
      available = false;
      notes.push(`Little usable ${id} resource in ${region.name}.`);
    } else {
      cost *= RESOURCE_COST[res];
      years += RESOURCE_DELAY[res];
      yearsLow += RESOURCE_DELAY[res];
      if (res === 'fair') notes.push(`${region.name} has only a fair ${id} resource, so expect higher cost and a longer timeline.`);
    }
  }

  const maxMW = opt.typical_max_mw_per_site?.value ?? Infinity;
  const sites = Math.max(1, Math.ceil(input.loadMW / maxMW));
  if (sites > 1) {
    notes.push(`${input.loadMW.toLocaleString()} MW is more than one typical project (~${maxMW.toLocaleString()} MW), so you'd need about ${sites} of them.`);
    years += Math.min(3, (sites - 1) * 0.25); // each extra project adds permitting/supply-chain friction
  }

  const yearsAvailable = input.neededBy - CURRENT_YEAR;
  const missesDeadline = yearsLow > yearsAvailable;
  const tight = !missesDeadline && years > yearsAvailable;
  if (missesDeadline) notes.push(`Even the fastest cases (~${yearsLow} yr) miss ${input.neededBy}.`);
  else if (tight) notes.push(`Typical timeline (~${years.toFixed(1)} yr) is past ${input.neededBy}; only the fast cases make it.`);

  // Grid and gas-firmed hybrids have no capacity factor of their own; treat them as highly available.
  const cf = mid(opt.capacity_factor) ?? (opt.firm ? 0.95 : 0.35);
  // Reliability: firm sources score by availability; variable ones are capped well below firm.
  const reliability = opt.firm ? 0.6 + 0.4 * cf : 0.5 * cf;
  if (input.mustBeFirm && !opt.firm) notes.push('Not firm on its own: it can’t carry a 24/7 load without backup.');

  return {
    id: opt.id, name: opt.name, firm: !!opt.firm, available,
    cost: Math.round(cost), years: +years.toFixed(1), yearsLow, carbon: Math.round(carbon),
    reliability: +reliability.toFixed(3), sites, missesDeadline, tight, notes,
  };
}

/** Rank all options. Each criterion is min-max normalised to 0..1 (1 = best), then weighted. */
export function rankOptions(data, input) {
  const region = data.regions.find((r) => r.id === input.regionId) || data.regions[0];
  const rows = data.options.map((o) => evaluateOption(o, region, input));

  const pool = rows.filter((r) => r.available);
  const norm = (key, lowerIsBetter) => {
    const vals = pool.map((r) => r[key]);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return (v) => (hi === lo ? 1 : lowerIsBetter ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo));
  };
  // criterion -> [row field, normaliser]
  const f = {
    cost: ['cost', norm('cost', true)],
    carbon: ['carbon', norm('carbon', true)],
    speed: ['years', norm('years', true)],
    reliability: ['reliability', norm('reliability', false)],
  };
  const w = input.weights;
  const wSum = Object.values(w).reduce((a, b) => a + b, 0) || 1;

  for (const r of rows) {
    r.parts = {};
    let s = 0;
    for (const k of Object.keys(f)) {
      const [field, fn] = f[k];
      r.parts[k] = clamp(fn(r[field]), 0, 1);
      s += (w[k] || 0) * r.parts[k];
    }
    let score = (s / wSum) * 100;
    if (!r.available) score = 0;
    if (r.missesDeadline) score *= 0.5;
    else if (r.tight) score *= 0.85;
    if (input.mustBeFirm && !r.firm) score *= 0.6;
    r.score = Math.round(score);
    r.excluded = !r.available;
  }
  rows.sort((a, b) => b.score - a.score);
  return { region, rows };
}

/** Plain-English reasons for an option's rank: its strongest and weakest criteria. */
export function explain(row) {
  const label = { cost: 'cost', carbon: 'carbon', speed: 'speed to power', reliability: 'reliability' };
  const entries = Object.entries(row.parts).sort((a, b) => b[1] - a[1]);
  const strong = entries.filter(([, v]) => v >= 0.7).map(([k]) => label[k]);
  const weak = entries.filter(([, v]) => v <= 0.3).map(([k]) => label[k]);
  const out = [];
  if (strong.length) out.push(`Strong on ${strong.join(', ')}.`);
  if (weak.length) out.push(`Weak on ${weak.join(', ')}.`);
  return out.concat(row.notes);
}
