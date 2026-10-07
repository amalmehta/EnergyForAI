import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankOptions, evaluateOption, explain, CURRENT_YEAR } from '../js/model.js';
import DATA from '../js/data.js';

const opt = (id, o) => ({
  id, name: id, firm: true,
  lcoe_usd_mwh: { low: 80, high: 100 }, carbon_g_per_kwh: { value: 10 },
  years_to_power: { low: 2, high: 4 }, capacity_factor: { low: 0.9, high: 0.95 },
  typical_max_mw_per_site: { value: 1000 }, ...o,
});
const region = (o) => ({ id: 'r', name: 'Test', solar_cf: 0.25, wind_cf: 0.35, gas_price_usd_mmbtu: 3.5,
  geothermal_resource: 'good', hydro_resource: 'good', ...o });
const input = (o) => ({ loadMW: 500, neededBy: CURRENT_YEAR + 5, regionId: 'r', mustBeFirm: true,
  weights: { cost: 3, speed: 3, reliability: 3, carbon: 2 }, ...o });

test('cheaper option wins when only cost matters', () => {
  const data = { regions: [region()], options: [opt('a', { lcoe_usd_mwh: { low: 50, high: 60 } }), opt('b')] };
  const { rows } = rankOptions(data, input({ weights: { cost: 4, speed: 0, reliability: 0, carbon: 0 } }));
  assert.equal(rows[0].id, 'a');
  assert.equal(rows[0].score, 100);
});

test('options that cannot meet the deadline are penalised and flagged', () => {
  const data = { regions: [region()], options: [opt('slow', { years_to_power: { low: 6, high: 9 } }), opt('fast')] };
  const { rows } = rankOptions(data, input({ neededBy: CURRENT_YEAR + 3 }));
  const slow = rows.find((r) => r.id === 'slow');
  assert.ok(slow.missesDeadline);
  assert.equal(rows[0].id, 'fast');
});

test('grid uses regional price, queue and carbon', () => {
  const r = evaluateOption(opt('grid', { years_to_power: { low: 4, high: 7 } }), region({ industrial_power_price_usd_mwh: 70, grid_queue_years: { low: 5, high: 7 }, grid_carbon_g_per_kwh: 400 }), input());
  assert.deepEqual([r.cost, r.carbon], [70, 400]);
  assert.ok(r.years > 5.5, 'slow queue stretches the grid timeline');
});

test('higher gas price raises gas cost through the heat rate', () => {
  const cheap = evaluateOption(opt('gas_ccgt'), region({ gas_price_usd_mmbtu: 2.5 }), input());
  const dear = evaluateOption(opt('gas_ccgt'), region({ gas_price_usd_mmbtu: 4.5 }), input());
  assert.equal(dear.cost - cheap.cost, 13); // 2 $/MMBtu × 6.5 MMBtu/MWh
});

test('poor geothermal resource makes geothermal unavailable', () => {
  const data = { regions: [region({ geothermal_resource: 'poor' })], options: [opt('geothermal'), opt('x')] };
  const { rows } = rankOptions(data, input());
  const g = rows.find((r) => r.id === 'geothermal');
  assert.equal(g.score, 0);
  assert.ok(g.excluded);
});

test('load above one site needs multiple projects', () => {
  const r = evaluateOption(opt('x', { typical_max_mw_per_site: { value: 300 } }), region(), input({ loadMW: 1000 }));
  assert.equal(r.sites, 4);
});

test('non-firm option is penalised when 24/7 is required', () => {
  const data = { regions: [region()], options: [opt('solar_storage', { firm: false }), opt('x')] };
  const firm = rankOptions(data, input()).rows.find((r) => r.id === 'solar_storage').score;
  const loose = rankOptions(data, input({ mustBeFirm: false })).rows.find((r) => r.id === 'solar_storage').score;
  assert.ok(firm < loose);
});

test('explain names strengths and weaknesses', () => {
  const lines = explain({ parts: { cost: 1, carbon: 0, speed: 0.5, reliability: 0.8 }, notes: [] });
  assert.match(lines[0], /cost/);
  assert.match(lines[1], /carbon/);
});

test('real data: every option is complete and every citation resolves', () => {
  const ids = new Set(DATA.sources.map((s) => s.id));
  for (const o of DATA.options) {
    for (const k of ['lcoe_usd_mwh', 'carbon_g_per_kwh', 'years_to_power']) {
      assert.ok(o[k], `${o.id} missing ${k}`);
      for (const s of o[k].src || []) assert.ok(ids.has(s), `${o.id}.${k} cites unknown source ${s}`);
    }
  }
  for (const c of DATA.context) for (const s of c.src) assert.ok(ids.has(s), `context cites unknown ${s}`);
});

test('real data: every region ranks without NaN', () => {
  for (const r of DATA.regions) {
    const { rows } = rankOptions(DATA, input({ regionId: r.id }));
    for (const row of rows) assert.ok(Number.isFinite(row.score), `${r.id}/${row.id} score ${row.score}`);
  }
});
