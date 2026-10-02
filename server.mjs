import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PAVONEO_PORT || 4173);
const MODEL = 'claude-opus-5-5';
const CODE_EFFORT = 'high';
const API_URL = 'https://api.anthropic.com/v1/messages';
const BIND_HOST = process.env.PAVONEO_BIND_HOST || '127.0.0.1';
const OPTIONS = {
  size: ['small', 'medium', 'large'],
  entry: ['rise', 'fade', 'pop', 'slide', 'none'],
  background: ['navy', 'blue', 'transparent'],
  layout: ['center', 'left', 'lower'],
  accent: ['line', 'corner', 'none'],
  emphasis: ['none', 'first', 'last'],
  textMotion: ['stagger', 'wipe', 'cinematic', 'steady']
};
const MOTIFS = ['seed', 'growth', 'wave', 'orbit', 'thread', 'frame', 'page', 'grid', 'spark', 'spotlight', 'pulse'];
const MOTIONS = ['draw', 'drift', 'pulse', 'orbit', 'sweep', 'rise'];
const COLORS = ['cream', 'white', 'sky', 'mint'];
const DEFAULT_OPTIONS = { size: 'medium', entry: 'rise', background: 'navy', layout: 'center', accent: 'line', emphasis: 'none', textMotion: 'steady' };
const codeSchema = {
  type: 'object', additionalProperties: false,
  properties: { concept: { type: 'string' }, html: { type: 'string' }, css: { type: 'string' }, javascript: { type: 'string' } },
  required: ['concept', 'html', 'css', 'javascript']
};
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    ...Object.fromEntries(Object.entries(OPTIONS).map(([key, values]) => [key, { type: 'string', enum: values }])),
    concept: { type: 'string' },
    elements: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      motif: { type: 'string', enum: MOTIFS }, motion: { type: 'string', enum: MOTIONS }, color: { type: 'string', enum: COLORS },
      x: { type: 'number' }, y: { type: 'number' }, size: { type: 'number' }, delay: { type: 'number' }, meaning: { type: 'string' }
    }, required: ['motif', 'motion', 'color', 'x', 'y', 'size', 'delay', 'meaning'] } }
  },
  required: [...Object.keys(OPTIONS), 'concept', 'elements']
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function validDesign(value) {
  return value && typeof value === 'object' && Object.keys(OPTIONS).every(key => OPTIONS[key].includes(value[key]))
    && typeof value.concept === 'string' && value.concept.trim().length > 12 && value.concept.length <= 360
    && Array.isArray(value.elements) && value.elements.length >= 1 && value.elements.length <= 6
    && value.elements.every(el => MOTIFS.includes(el.motif) && MOTIONS.includes(el.motion) && COLORS.includes(el.color)
      && Number.isFinite(el.x) && el.x >= 0 && el.x <= 100 && Number.isFinite(el.y) && el.y >= 0 && el.y <= 100
      && Number.isFinite(el.size) && el.size >= 10 && el.size <= 75 && Number.isFinite(el.delay) && el.delay >= 0 && el.delay <= 3
      && typeof el.meaning === 'string' && el.meaning.trim().length >= 5 && el.meaning.length <= 180);
}
function normalizeDesign(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.concept !== 'string' || !Array.isArray(raw.elements)) return null;
  const bounded = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  const design = Object.fromEntries(Object.entries(OPTIONS).map(([key, values]) => [key, values.includes(raw[key]) ? raw[key] : DEFAULT_OPTIONS[key]]));
  design.concept = raw.concept.trim().slice(0, 360);
  design.elements = raw.elements.filter(el => el && typeof el === 'object' && MOTIFS.includes(el.motif)).slice(0, 6).map(el => ({
    motif: el.motif,
    motion: MOTIONS.includes(el.motion) ? el.motion : 'drift',
    color: COLORS.includes(el.color) ? el.color : 'cream',
    x: bounded(el.x, 0, 100, 50), y: bounded(el.y, 0, 100, 50),
    size: bounded(el.size, 10, 75, 30), delay: bounded(el.delay, 0, 3, 0),
    meaning: typeof el.meaning === 'string' ? el.meaning.trim().slice(0, 180) : ''
  }));
  return validDesign(design) ? design : null;
}
function validOpusCode(value) {
  return value && typeof value === 'object'
    && typeof value.concept === 'string' && value.concept.trim().length >= 12 && value.concept.length <= 1000
    && typeof value.html === 'string' && value.html.length >= 20 && value.html.length <= 18000
    && typeof value.css === 'string' && value.css.length >= 100 && value.css.length <= 30000
    && typeof value.javascript === 'string' && value.javascript.length <= 18000
    && !/<\s*\/?\s*(script|style|iframe|frame|meta|link|base|object|embed|form)\b/i.test(value.html)
    && !/\bon[a-z]+\s*=/i.test(value.html)
    && !/<\s*\/\s*style\b/i.test(value.css)
    && !/<\s*\/\s*script\b/i.test(value.javascript)
    && !/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|document\.cookie|window\.open|eval)\b/i.test(value.javascript)
    && hasMotion(value);
}
function hasMotion(value) {
  const cssAnimation = /(?:@(?:-webkit-)?keyframes\b|(?:-webkit-)?animation(?:-name)?\s*:)/i.test(value.css);
  const scriptedAnimation = /(?:requestAnimationFrame\s*\(|\.animate\s*\(|setInterval\s*\()/i.test(value.javascript);
  const scriptedTransition = /(?:-webkit-)?transition(?:-[\w-]+)?\s*:/i.test(value.css)
    && /(?:\.classList\.|\.style\.|setAttribute\s*\()/i.test(value.javascript);
  return cssAnimation || scriptedAnimation || scriptedTransition;
}
function invalidOpusCodeReason(value) {
  if (!value || typeof value !== 'object') return 'estructura ausente';
  for (const field of ['concept', 'html', 'css', 'javascript']) if (typeof value[field] !== 'string') return `${field} ausente`;
  if (value.concept.trim().length < 12 || value.concept.length > 1000) return 'concept fuera de rango';
  if (value.html.length < 20 || value.html.length > 18000) return `html fuera de rango (${value.html.length})`;
  if (value.css.length < 100 || value.css.length > 30000) return `css fuera de rango (${value.css.length})`;
  if (value.javascript.length > 18000) return `javascript fuera de rango (${value.javascript.length})`;
  if (/<\s*\/?\s*(script|style|iframe|frame|meta|link|base|object|embed|form)\b/i.test(value.html)) return 'etiqueta HTML no permitida';
  if (/\bon[a-z]+\s*=/i.test(value.html)) return 'atributo HTML de evento';
  if (/<\s*\/\s*style\b/i.test(value.css)) return 'cierre style en CSS';
  if (/<\s*\/\s*script\b/i.test(value.javascript)) return 'cierre script en JavaScript';
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|document\.cookie|window\.open|eval)\b/i.test(value.javascript)) return 'API no permitida en JavaScript';
  if (!hasMotion(value)) return 'no se detectó una animación CSS o JavaScript';
  return 'regla de seguridad no identificada';
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 8000) { reject(new Error('Solicitud demasiado grande.')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('JSON inválido.')); } });
    req.on('error', reject);
  });
}
async function generate(input, fetcher = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetcher(API_URL, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': process.env.ANTHROPIC_API_KEY },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2200,
        system: `Eres director de arte y especialista en motion graphics de Pavoneo 360º. Lee y comprende el mensaje del rótulo, el plano, la voz y el lugar del plano dentro del reel. Propón una animación vertical 9:16 personal y muy elaborada, con 2 a 6 elementos gráficos que materialicen ideas específicas del texto; cada elemento debe tener una razón semántica concreta. Evita adornos genéricos, símbolos literales torpes, clichés, ruido visual y capas que tapen el texto. Diseña una progresión: preparación, entrada, desarrollo y cierre, coordinada con la duración. El texto del rótulo está fijado: nunca lo reescribas, añadas ni elimines palabras. Tu salida es exclusivamente el plan del esquema; la aplicación renderiza los gráficos de forma segura. Identidad: azul noche #0c3065, azul vivo #105bbe, crema #f6f8ce, blanco y acentos menta; sans contundente con toques serif cursivos. Si hay vídeo detrás, puedes escoger fondo transparente. Ubica los elementos en porcentajes x/y y tamaño 10-75 para dejar espacio al rótulo. Los retrasos van de 0 a 3 segundos. El campo concept debe explicar en una frase la metáfora visual y su vínculo con el mensaje. Cada meaning debe justificar el elemento sin repetir una fórmula vacía. Prioriza legibilidad y exactitud del mensaje.`,
        messages: [{ role: 'user', content: `Proyecto: ${input.project || 'Pavoneo 360º'}\nRótulo exacto: ${input.caption}\nPlano: ${input.shot}\nMensaje de voz: ${input.voice}\nRótulo anterior: ${input.previousCaption || '(inicio)'}\nRótulo siguiente: ${input.nextCaption || '(cierre)'}\nDuración: ${input.duration} s. Genera una propuesta de motion graphics coherente y detallada para este rótulo.` }],
        output_config: { format: { type: 'json_schema', schema } }
      })
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('La clave API no es válida o no tiene acceso a Opus 5.5.');
      if (response.status === 429) throw new Error('Límite de la API alcanzado. Prueba de nuevo más tarde.');
      throw new Error(`La API devolvió el estado ${response.status}.`);
    }
    const data = await response.json();
    if (data.stop_reason !== 'end_turn') throw new Error('La respuesta de Opus 5.5 quedó incompleta.');
    const output = data.content?.filter(block => block.type === 'text').map(block => block.text).join('');
    let rawDesign;
    try { rawDesign = JSON.parse(output); } catch { throw new Error('La API no devolvió un diseño válido.'); }
    const design = normalizeDesign(rawDesign);
    if (!design) throw new Error('La API no devolvió elementos gráficos utilizables.');
    return design;
  } finally { clearTimeout(timeout); }
}
async function generateCode(input, fetcher = fetch) {
  const creativeDirection = await readFile(join(ROOT, 'CREATIVE_DIRECTION.md'), 'utf8');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 480000);
  try {
    const response = await fetcher(API_URL, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': process.env.ANTHROPIC_API_KEY },
      body: JSON.stringify({
        model: MODEL, max_tokens: 24000,
        system: `${creativeDirection}\n\nEres Claude Opus 5.5 actuando como director de arte y desarrollador experto en motion graphics. TÚ escribes la implementación creativa real: HTML de capas visuales, CSS de composición y keyframes, y JavaScript si aporta coreografía. La aplicación anfitriona NO creará movimientos ni figuras por ti. Devuelve exclusivamente los cuatro campos del esquema: concept, html, css, javascript. Diseña un rótulo vertical 9:16 singular y de calidad profesional para Pavoneo 360º. Lee con rigor el texto exacto, la descripción del plano, la voz y los rótulos vecinos. Antes de escribir código, deduce la idea principal, su tensión emocional y una metáfora visual específica que solo tenga sentido para este mensaje. Diseña una pequeña dramaturgia visual con tres fotogramas claramente distintos: apertura que genera expectativa, transformación o revelación en el centro, y composición final elegante que deja leer el rótulo. Mantén movimiento perceptible durante los ${input.duration} segundos; evita una escena que solo entra y después queda inmóvil. Haz que al menos un elemento gráfico cambie de forma, trayectoria, máscara, escala o relación con el texto a mitad de la pieza. Cada elemento debe tener una función narrativa y estar coordinado con la lectura, sin saturar la pantalla. Explora recursos propios del motion design cuando aporten significado: trazados SVG, máscaras, recortes, gradientes, repetición rítmica, parallax sutil, tipografía cinética y transiciones con profundidad. No repitas composiciones de plantilla, iconos genéricos, partículas gratuitas ni movimientos idénticos en todos los elementos. El acabado debe ser original, preciso y visualmente potente, con curvas, pausas, contrastes y jerarquía deliberados. Usa SVG inline, CSS y JS autocontenidos cuando sirvan, sin librerías, fuentes, imágenes, URL, importaciones ni recursos externos. Colores de marca: #0c3065, #105bbe, #f6f8ce, blanco, menta; puedes variar luminosidad y mezclas dentro de esa identidad. Debe funcionar a 220x390 y 1080x1920, con tamaños fluidos y texto legible. Incluye exactamente una etiqueta vacía <div id="exact-caption"></div> dentro de html, en la posición visual elegida. La aplicación insertará el texto exacto dentro de esa etiqueta. NO escribas el texto del rótulo ni otro texto visible en html; estiliza y anima #exact-caption con CSS/JS. Puedes envolver sus nodos de texto en spans mediante JS, siempre conservando textContent exactamente igual. html debe contener solo elementos visuales; no incluyas <style>, <script>, <iframe>, <meta>, <link>, <form> ni atributos on*. css debe ser CSS puro, sin </style>. javascript debe ser JavaScript puro, sin </script>, peticiones de red, navegación, almacenamiento, eval ni acceso a parent/top. Usa @keyframes en css; javascript puede ser una cadena vacía si CSS basta. No uses @media(prefers-reduced-motion) para detener el movimiento: este arte se exporta como animación. concept explica la metáfora concreta y la secuencia temporal en 2-3 frases. El código ha de ser original para este rótulo, no escoger motivos de una biblioteca fija. Presupuesto máximo: html 6000 caracteres, css 18000 caracteres y javascript 5000 caracteres. Usa solo el código necesario; no añadas comentarios ni repitas reglas CSS.`,
        messages: [{ role: 'user', content: `Proyecto: ${input.project || 'Pavoneo 360º'}\nRótulo exacto (lo insertará la aplicación): ${input.caption}\nPlano: ${input.shot}\nVoz: ${input.voice}\nRótulo anterior: ${input.previousCaption || '(inicio)'}\nRótulo siguiente: ${input.nextCaption || '(cierre)'}\nDuración: ${input.duration} segundos. Escribe el código creativo completo.` }],
        output_config: { effort: CODE_EFFORT, format: { type: 'json_schema', schema: codeSchema } }
      })
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('La clave API no es válida o no tiene acceso a Opus 5.5.');
      if (response.status === 429) throw new Error('Límite de la API alcanzado. Prueba de nuevo más tarde.');
      throw new Error(`La API devolvió el estado ${response.status}.`);
    }
    const data = await response.json();
    if (data.stop_reason !== 'end_turn') throw new Error('El código de Opus 5.5 quedó incompleto.');
    const output = data.content?.filter(block => block.type === 'text').map(block => block.text).join('');
    let code;
    try { code = JSON.parse(output); } catch { throw new Error('La API no devolvió código válido.'); }
    if (!validOpusCode(code)) throw new Error(`Opus devolvió código no admitido: ${invalidOpusCodeReason(code)}.`);
    return code;
  } finally { clearTimeout(timeout); }
}

const server = createServer(async (req, res) => {
  const publicOrigin = process.env.PAVONEO_PUBLIC_ORIGIN;
  const origin = publicOrigin || `http://127.0.0.1:${server.address()?.port || PORT}`;
  const path = new URL(req.url || '/', origin).pathname;
  if (req.headers.host !== new URL(origin).host) return json(res, 403, { error: 'Host no autorizado.' });
  if (publicOrigin) {
    const user = process.env.PAVONEO_AUTH_USER;
    const password = process.env.PAVONEO_AUTH_PASSWORD;
    if (!user || !password) return json(res, 503, { error: 'Configura el acceso protegido antes de publicar la aplicación.' });
    const expected = Buffer.from(`Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`);
    const actual = Buffer.from(String(req.headers.authorization || ''));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pavoneo 360"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end('Acceso privado');
      return;
    }
  }
  if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
    try {
      const html = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(html);
    } catch { json(res, 500, { error: 'No se pudo abrir index.html.' }); }
    return;
  }
  if (req.method === 'GET' && path === '/logo-pavoneo.png') {
    try {
      const logo = await readFile(join(ROOT, 'logo-pavoneo.png'));
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
      res.end(logo);
    } catch { json(res, 404, { error: 'Logotipo no disponible.' }); }
    return;
  }
  if (req.method === 'GET' && path === '/motion-renderer.js') {
    try {
      const script = await readFile(join(ROOT, 'motion-renderer.js'));
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(script);
    } catch { json(res, 404, { error: 'Renderizador no disponible.' }); }
    return;
  }
  if (req.method === 'GET' && path === '/rotulo-plano-02-opus.html') {
    try {
      const html = await readFile(join(ROOT, 'rotulo-plano-02-opus.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(html);
    } catch { json(res, 404, { error: 'Ejemplo no disponible.' }); }
    return;
  }
  if (req.method === 'GET' && path === '/api/status') return json(res, 200, { configured: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL, effort: CODE_EFFORT });
  if (req.method === 'POST' && path === '/api/generate-caption') {
    if (req.headers.origin !== origin || !String(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { error: 'Solicitud no autorizada.' });
    if (!process.env.ANTHROPIC_API_KEY) return json(res, 503, { error: 'Configura ANTHROPIC_API_KEY antes de iniciar el servidor.' });
    try {
      const input = await readJson(req);
      if (!input || typeof input.caption !== 'string' || !input.caption.trim() || input.caption.length > 300 || typeof input.shot !== 'string' || input.shot.length > 600 || typeof input.voice !== 'string' || input.voice.length > 600 || !Number.isInteger(input.duration) || input.duration < 1 || input.duration > 60 || ['project','previousCaption','nextCaption'].some(key => input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 300))) return json(res, 400, { error: 'Datos del plano inválidos.' });
      return json(res, 200, { design: await generate(input) });
    } catch (error) { return json(res, error.message === 'Solicitud demasiado grande.' || error.message === 'JSON inválido.' ? 400 : 502, { error: error.message || 'No se pudo generar el rótulo.' }); }
  }
  if (req.method === 'POST' && path === '/api/generate-caption-code') {
    if (req.headers.origin !== origin || !String(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { error: 'Solicitud no autorizada.' });
    if (!process.env.ANTHROPIC_API_KEY) return json(res, 503, { error: 'Configura ANTHROPIC_API_KEY antes de iniciar el servidor.' });
    try {
      const input = await readJson(req);
      if (!input || typeof input.caption !== 'string' || !input.caption.trim() || input.caption.length > 300 || typeof input.shot !== 'string' || input.shot.length > 1000 || typeof input.voice !== 'string' || input.voice.length > 1000 || !Number.isInteger(input.duration) || input.duration < 1 || input.duration > 60 || ['project','previousCaption','nextCaption'].some(key => input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 300))) return json(res, 400, { error: 'Datos del plano inválidos.' });
      return json(res, 200, { code: await generateCode(input) });
    } catch (error) { return json(res, error.message === 'Solicitud demasiado grande.' || error.message === 'JSON inválido.' ? 400 : 502, { error: error.message || 'No se pudo generar el código.' }); }
  }
  json(res, 404, { error: 'No encontrado.' });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (BIND_HOST !== '127.0.0.1' && (!process.env.PAVONEO_PUBLIC_ORIGIN?.startsWith('https://') || !process.env.PAVONEO_AUTH_USER || !process.env.PAVONEO_AUTH_PASSWORD)) {
    throw new Error('Para escuchar fuera de localhost configura PAVONEO_PUBLIC_ORIGIN=https://..., PAVONEO_AUTH_USER y PAVONEO_AUTH_PASSWORD.');
  }
  server.listen(PORT, BIND_HOST, () => console.log(`Pavoneo: ${process.env.PAVONEO_PUBLIC_ORIGIN || `http://127.0.0.1:${PORT}`}/ · Opus 5.5 ${process.env.ANTHROPIC_API_KEY ? 'configurado' : 'sin clave API'}`));
}
export { server, generate, generateCode, validDesign, normalizeDesign, validOpusCode, MODEL, CODE_EFFORT };

