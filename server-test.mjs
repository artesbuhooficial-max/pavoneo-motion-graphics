import assert from 'node:assert/strict';
import { once } from 'node:events';
import { server, generate, generateCode, normalizeDesign, validOpusCode, MODEL } from './server.mjs';

const design = { size: 'large', entry: 'slide', background: 'navy', layout: 'lower', accent: 'corner', emphasis: 'first', textMotion: 'stagger', concept: 'Una semilla crece como metáfora del proceso creativo.', elements: [
  {motif:'seed',motion:'draw',color:'cream',x:24,y:28,size:33,delay:0,meaning:'La semilla representa el comienzo del proceso.'},
  {motif:'growth',motion:'rise',color:'mint',x:72,y:70,size:40,delay:1,meaning:'El crecimiento muestra cómo madura una idea.'}
] };
const input = { caption: 'TEXTO EXACTO', shot: 'Primer plano', voice: 'Mensaje', duration: 5 };
const opusCode = {concept:'Una línea de luz expresa el comienzo de una idea y atraviesa la escena.',html:'<svg class="linea" viewBox="0 0 100 100"><path d="M0 50H100"/></svg>',css:'#opus-stage{background:#0c3065} .linea{width:100%;animation:mover 5s linear both}@keyframes mover{from{transform:translateX(-100%)}to{transform:translateX(100%)}}',javascript:'document.querySelector(".linea").style.opacity="1";'};
const oldKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = 'fake-test-key';
let providerRequest;
const fakeProvider = async (url, options) => {
  providerRequest = { url, options };
  return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(design) }] }), { status: 200 });
};

try {
  assert.equal(MODEL, 'claude-opus-5-5');
  assert.deepEqual(await generate(input, fakeProvider), design);
  const sent = JSON.parse(providerRequest.options.body);
  assert.equal(sent.model, MODEL);
  assert.match(sent.messages[0].content, /TEXTO EXACTO/);
  assert.equal(sent.output_config.format.type, 'json_schema');
  assert.equal(providerRequest.options.headers['x-api-key'], 'fake-test-key');
  const unusual = structuredClone(design);
  unusual.concept = 'Un concepto visual extenso que Opus puede explicar con bastante detalle. '.repeat(8);
  unusual.elements[0].size = 120;
  unusual.elements[0].delay = 4.2;
  unusual.elements[0].meaning = 'La semilla da origen al proceso creativo. '.repeat(8);
  unusual.elements[1].x = -8;
  unusual.textMotion = 'unknown';
  const normalized = normalizeDesign(unusual);
  assert.equal(normalized.elements[0].size, 75);
  assert.equal(normalized.elements[0].delay, 3);
  assert.equal(normalized.elements[1].x, 0);
  assert.equal(normalized.textMotion, 'steady');
  assert.equal(normalized.concept.length, 360);
  assert.equal(normalized.elements[0].meaning.length, 180);
  assert.deepEqual(await generate(input, async () => new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(unusual) }] }), { status: 200 })), normalized);
  await assert.rejects(generate(input, async () => new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] }), { status: 200 })), /elementos gráficos utilizables/);
  assert.equal(validOpusCode(opusCode), true);
  assert.equal(validOpusCode({...opusCode,javascript:'fetch("https://example.com")'}), false);
  const fakeCodeProvider = async (url, options) => {
    providerRequest = {url, options};
    return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(opusCode)}]}),{status:200});
  };
  assert.deepEqual(await generateCode(input, fakeCodeProvider), opusCode);
  assert.equal(JSON.parse(providerRequest.options.body).model, MODEL);
  assert.equal(JSON.parse(providerRequest.options.body).max_tokens, 24000);
  assert.match(JSON.parse(providerRequest.options.body).system, /TÚ escribes la implementación creativa real/);
  assert.match(JSON.parse(providerRequest.options.body).system, /jerarquía editorial/);

  delete process.env.ANTHROPIC_API_KEY;
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const nativeFetch = globalThis.fetch;
  const page = await nativeFetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Una idea/);
  const logo = await nativeFetch(`${base}/logo-pavoneo.png`);
  assert.equal(logo.status, 200);
  assert.equal(logo.headers.get('content-type'), 'image/png');
  const renderer = await nativeFetch(`${base}/motion-renderer.js`);
  assert.equal(renderer.status, 200);
  assert.match(await renderer.text(), /renderPavoneoCaption/);
  const status = await (await nativeFetch(`${base}/api/status`)).json();
  assert.equal(status.configured, false);
  assert.equal(status.model, MODEL);
  const post = (origin = base) => nativeFetch(`${base}/api/generate-caption`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(input) });
  assert.equal((await post('https://example.com')).status, 403);
  assert.equal((await post()).status, 503);

  process.env.ANTHROPIC_API_KEY = 'fake-test-key';
  globalThis.fetch = fakeProvider;
  const generated = await post();
  assert.equal(generated.status, 200);
  assert.deepEqual((await generated.json()).design, design);
  globalThis.fetch = fakeCodeProvider;
  const coded = await nativeFetch(`${base}/api/generate-caption-code`, {method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(input)});
  assert.equal(coded.status, 200);
  assert.deepEqual((await coded.json()).code, opusCode);
  globalThis.fetch = nativeFetch;
  console.log('OK: local server, origin guard, missing key, Opus 5.5 request and validated design');
} finally {
  await new Promise(resolve => server.close(resolve));
  if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = oldKey;
}
