import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

// Render the actual component with React's server renderer. Capture the real JSX
// elements to exercise their callback props without a browser or a new dependency.
// Effects do not run during SSR; timing marks still need the manager's browser QA.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const runtime = require('react/jsx-runtime');
let renderedElements = [];
const capturedRuntime = { ...runtime };
for (const method of ['jsx', 'jsxs']) {
  capturedRuntime[method] = (...args) => {
    const element = runtime[method](...args);
    renderedElements.push(element);
    return element;
  };
}

const modules = new Map();
function loadSource(requestedFile) {
  const file = [requestedFile, `${requestedFile}.ts`, `${requestedFile}.tsx`, `${requestedFile}.json`].find((candidate) => fs.existsSync(candidate));
  assert.ok(file, `Unable to resolve test module: ${requestedFile}`);
  if (file.endsWith('.css')) return {};
  if (modules.has(file)) return modules.get(file).exports;
  const sourceModule = { exports: {} };
  modules.set(file, sourceModule);
  if (file.endsWith('.json')) {
    sourceModule.exports = JSON.parse(fs.readFileSync(file, 'utf8'));
    return sourceModule.exports;
  }
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier === 'react/jsx-runtime') return capturedRuntime;
    if (specifier === 'next/image') return ({ src, alt, sizes }) => React.createElement('img', { src, alt, sizes });
    if (specifier.startsWith('@/')) return loadSource(path.join(root, specifier.slice(2)));
    if (specifier.startsWith('.')) return loadSource(path.resolve(path.dirname(file), specifier));
    return require(specifier);
  };
  const execute = new vm.Script(`(function(require, module, exports) {\n${output}\n})`, { filename: file }).runInThisContext();
  execute(localRequire, sourceModule, sourceModule.exports);
  return sourceModule.exports;
}

const { HomeView } = loadSource(path.join(root, 'views/home/HomeView.tsx'));
const { guideData } = loadSource(path.join(root, 'lib/data.ts'));
const { routeCityForDay } = loadSource(path.join(root, 'features/trip/tripModel.ts'));
const { yuan } = loadSource(path.join(root, 'features/app/appModel.ts'));
const sourceSnapshot = JSON.stringify(guideData);
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
freeze(guideData);

function textOf(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textOf).join('');
  return textOf(value.props?.children);
}

function render(overrides = {}) {
  const calls = [];
  const callbackNames = ['openTrip', 'openCityTrip', 'openNextAction', 'openReadiness', 'openBudget'];
  const callbacks = Object.fromEntries(callbackNames.map((name) => [name, (...args) => calls.push({ name, args })]));
  const props = freeze({ daysLeft: 49, selectedDay: 7, projectedBudget: 54321, actualTotal: 8765, unknownCosts: 3, activeEntityCount: 27, ...callbacks, ...overrides });
  const before = JSON.stringify(props);
  renderedElements = [];
  const html = renderToStaticMarkup(React.createElement(HomeView, props));
  const elements = [...renderedElements];
  assert.equal(JSON.stringify(props), before, 'Rendering must preserve input props');
  assert.deepEqual(calls, [], 'Rendering must not invoke navigation callbacks');
  return { html, elements, calls, buttons: elements.filter((element) => element.type === 'button'), node: elements.find((element) => element.props?.['data-home-view'] !== undefined) };
}

function buttonByText(view, label) {
  const found = view.buttons.filter((button) => textOf(button).trim() === label);
  assert.equal(found.length, 1, `Expected exactly one button: ${label}`);
  return found[0];
}
function click(view, button, callback, args = []) {
  const count = view.calls.length;
  assert.equal(button.props.type, 'button');
  button.props.onClick();
  assert.deepEqual(view.calls.slice(count), [{ name: callback, args }]);
}

for (const [daysLeft, phase, label] of [
  [49, 'upcoming', '距出发 49 天'],
  [1, 'upcoming', '距出发 1 天'],
  [0, 'traveling', '旅程进行中'],
  [-(guideData.days.length - 1), 'traveling', '旅程进行中'],
  [-guideData.days.length, 'past', '旅程回顾'],
  [null, 'pending', '旅行概览'],
]) {
  const view = render({ daysLeft });
  assert.equal(view.node.props['data-trip-phase'], phase);
  assert.ok(textOf(view.node).includes(label));
  assert.ok(view.elements.some((element) => element.type === 'time' && element.props.dateTime === guideData.trip.startDate));
  assert.ok(view.elements.some((element) => element.type === 'time' && element.props.dateTime === guideData.trip.endDate));
  assert.ok(textOf(view.node).includes(`${guideData.days.length}天 · ${guideData.trip.cities.length}城`));
}

for (const day of guideData.days) {
  const view = render({ selectedDay: day.day });
  const dateLabel = `${Number(day.date.slice(5, 7))}月${Number(day.date.slice(8, 10))}日`;
  const label = `查看 Day ${day.day} · ${dateLabel} · ${routeCityForDay(day)}行程`;
  const entry = view.buttons.find((button) => button.props['aria-label'] === label);
  assert.ok(entry, `Day ${day.day} entry must preserve the selected date and city`);
  const hero = view.elements.find((element) => element.props?.['data-home-hero'] !== undefined);
  assert.ok(textOf(hero).includes(day.theme));
  assert.ok(textOf(hero).includes(dateLabel));
  assert.equal(view.elements.filter((element) => element.type === 'time' && element.props.dateTime === day.date && textOf(element) === dateLabel).length, 1);
  click(view, entry, 'openTrip');
}
const missingDay = render({ selectedDay: 99 });
assert.equal(missingDay.buttons.some((button) => button.props['aria-label']?.startsWith('查看 Day ')), false);
click(missingDay, buttonByText(missingDay, '查看完整行程'), 'openTrip');

for (const [target, label] of [['checkin', '查看入住'], ['deadlines', '查看关键日期'], ['tasks', '查看待办']]) {
  const nextAction = { id: 'fixture', source: 'task', sourceId: 'fixture', target, title: `测试${target}待办`, detail: '来自输入的待办详情', due: '2026-11-09', priority: 'Critical', status: 'Open' };
  const view = render({ nextAction });
  assert.ok(textOf(view.node).includes(nextAction.title));
  assert.ok(textOf(view.node).includes(nextAction.detail));
  assert.ok(textOf(view.node).includes(nextAction.due));
  click(view, buttonByText(view, label), 'openNextAction');
}
const noAction = render();
assert.deepEqual(noAction.elements.filter((element) => element.type === 'h1').map(textOf), ['欧洲冬日旅程']);
assert.ok(textOf(noAction.node).includes('当前暂无待办'));
click(noAction, buttonByText(noAction, '查看出发准备'), 'openReadiness');
click(noAction, buttonByText(noAction, '查看准备'), 'openReadiness');
click(noAction, buttonByText(noAction, '查看明细'), 'openBudget');
click(noAction, buttonByText(noAction, '全部行程'), 'openTrip');

const cityButtons = noAction.buttons.filter((button) => /^打开.+行程$/.test(button.props['aria-label'] ?? ''));
assert.deepEqual(cityButtons.map((button) => button.props['aria-label']), guideData.trip.cities.map((city) => `打开${city.name}行程`));
for (const [index, city] of guideData.trip.cities.entries()) {
  click(noAction, cityButtons[index], 'openCityTrip', [city.name]);
  assert.ok(textOf(cityButtons[index]).includes(`${city.country} · ${city.nights}晚`));
  assert.ok(noAction.html.includes(`/images/home-city-${city.id}.webp`));
}
for (const input of [
  { projectedBudget: 54321, actualTotal: 8765, unknownCosts: 3, activeEntityCount: 27 },
  { projectedBudget: 0, actualTotal: 0, unknownCosts: 0, activeEntityCount: 0 },
]) {
  const view = render(input);
  const budget = view.elements.find((element) => element.props?.className === 'hw-summary-card hw-budget-card');
  const readiness = view.elements.find((element) => element.props?.className === 'hw-summary-card hw-readiness-card');
  assert.ok(textOf(budget).includes(`${yuan(input.projectedBudget)} 预计总额`));
  assert.ok(textOf(budget).includes(`实际记录 ${yuan(input.actualTotal)}`));
  assert.ok(textOf(budget).includes(`${input.unknownCosts}项费用待确认`));
  assert.ok(textOf(readiness).includes(`${input.activeEntityCount} 项行程安排`));
}
assert.equal(JSON.stringify(guideData), sourceSnapshot, 'Home must preserve all guide facts');

const homeSource = fs.readFileSync(path.join(root, 'views/home/HomeView.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'views/home/home-workbench.css'), 'utf8');
for (const mark of ['homeMountedAt', 'homeTtfbMs', 'homeJsReadyMs', 'homeJsTransferBytes', 'homeLcpMs', 'homeHeroLoadedMs']) assert.ok(homeSource.includes(mark));
const heroImage = noAction.elements.find((element) => element.type === 'img' && element.props.src === '/images/home-eiffel-winter-sunset.png');
assert.equal(heroImage.props.fetchPriority, 'high');
assert.equal(heroImage.props.loading, 'eager');
assert.equal(typeof heroImage.props.onLoad, 'function');
assert.ok(noAction.elements.some((element) => element.type === 'source' && element.props.media === '(max-width: 767px)' && element.props.srcSet === '/images/home-eiffel-winter-mobile.webp'));
assert.doesNotMatch(homeSource, /day\.(?:timeline|shooting)|localStorage|sessionStorage/);
assert.doesNotMatch(css, /var\(--serif\)/);
for (const color of css.match(/#[0-9a-f]{3,8}\b/gi) ?? []) assert.equal(color.toLowerCase(), '#fff', 'Brand colors must come from shared tokens');
assert.ok(css.includes('.home-v2.home-workbench'));
console.log('Home workbench passed: real React render, 18 selected dates, phase boundaries, six city callbacks, action targets, zero values and fact preservation. Browser layout and performance marks await manager QA.');
