// Dependency-free check of the planner's core interactions; the app itself only needs a browser.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const renderer = fs.readFileSync('motion-renderer.js', 'utf8');
assert.ok(script, 'embedded JavaScript exists');
new Function(script);
new Function(renderer);
assert.doesNotMatch(renderer, /prefers-reduced-motion/, 'exported motion graphics remain animated');
assert.match(renderer, /pav-layer--pulse svg\{animation:pav-pulse/, 'graphic layers include continuous motion');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: '', textContent: '', innerHTML: '', srcdoc: '', dataset: {}, handlers: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(name, fn) { this.handlers[name] = fn; },
    querySelectorAll() { return []; },
    showModal() {}, close() {}
  });
  return elements.get(id);
}
const storage = new Map();
const context = {
  document: { getElementById: element },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  crypto: require('node:crypto').webcrypto,
  location: {protocol:'file:'},
  setTimeout, clearTimeout, setInterval:()=>1, clearInterval:()=>{}, confirm: () => true
};
vm.runInNewContext(renderer, context);
const placeholderOutput=context.renderOpusDocument({concept:'La frase aparece con una onda de luz.',html:'<div id="opus-stage"><div class="onda"></div><div id="exact-caption"></div></div>',css:'#exact-caption{animation:enter 5s both}@keyframes enter{from{opacity:0}to{opacity:1}}',javascript:'document.getElementById("exact-caption").style.color="white";'},'TEXTO EXACTO',5);
assert.equal((placeholderOutput.match(/id="exact-caption"/g)||[]).length,1);
assert.equal((placeholderOutput.match(/id="opus-stage"/g)||[]).length,1);
assert.match(placeholderOutput, /id="exact-caption">TEXTO EXACTO<\/div>/);
vm.runInNewContext(script, context);
const cards = element('cards');
const firstId = () => cards.innerHTML.match(/data-id="([^"]+)"/)?.[1];
assert.equal(element('total-time').textContent, '1:26');
assert.equal(element('scene-count').textContent, '11 planos');
assert.equal((cards.innerHTML.match(/class="card"/g) || []).length, 11);
assert.match(cards.innerHTML, /Diseñar rótulo/);

const originalFirstId = firstId();
const action = (name, id) => cards.handlers.click({target: {closest: () => ({dataset: {action: name}, closest: () => ({dataset: {id}})})}});
action('down', originalFirstId);
assert.notEqual(firstId(), originalFirstId, 'reorder changes the first card');
action('up', originalFirstId);
assert.equal(firstId(), originalFirstId, 'reorder can be reversed');

cards.handlers.input({target: {dataset: {field: 'duration'}, value: '9', closest: () => ({dataset: {id: originalFirstId}})}});
assert.equal(element('total-time').textContent, '1:29');
action('delete', originalFirstId);
assert.equal(element('scene-count').textContent, '10 planos');
assert.equal(element('total-time').textContent, '1:20');
element('add-button').handlers.click();
assert.equal(element('scene-count').textContent, '11 planos');
assert.equal(element('total-time').textContent, '1:25');
action('caption', firstId());
assert.match(element('caption-code').value, /pav-caption/);
assert.match(element('caption-preview').srcdoc, /<!doctype html>/);
assert.match(element('caption-code').value, /#0c3065/);
context.location.protocol = 'http:';
context.fetch = async (url, options) => {
  assert.equal(url, '/api/generate-caption-code');
  assert.equal(JSON.parse(options.body).caption, 'LO VIVIDO SE TRANSFORMA');
  assert.equal(JSON.parse(options.body).previousCaption, '');
  return {ok:true,json:async()=>({code:{concept:'Una onda convierte la experiencia en una idea visible.',html:'<svg class="onda" viewBox="0 0 100 100"><path d="M0 50H100"/></svg>',css:'#opus-stage{background:#105bbe}.onda{width:100%;animation:mover 5s linear both}@keyframes mover{from{transform:translateX(-100%)}to{transform:translateX(100%)}}',javascript:'document.querySelector(".onda").style.opacity="1";'}})};
};
element('generate-ai').handlers.click().then(() => {
  assert.match(element('caption-code').value, /#105bbe/);
  assert.match(element('caption-code').value, /<script>/);
  assert.match(element('caption-code').value, /LO VIVIDO SE TRANSFORMA/);
  assert.equal(element('caption-settings').hidden, true);
  assert.match(element('motion-brief').textContent, /experiencia en una idea/);
  assert.match(element('ai-status').textContent, /aplicado/);
});

setTimeout(() => {
  const saved = JSON.parse(storage.get('pavoneo360_reel_planner_v1'));
  assert.equal(saved.scenes.length, 11);
  console.log('OK: example, total, reorder, edit, delete, add, AI design, caption and local save');
}, 300);
