/* Safe, self-contained renderer. Model output only selects values from fixed visual vocabulary. */
(function (root) {
  'use strict';
  const motifs = Object.freeze({
    seed: '<circle cx="50" cy="57" r="9"/><path d="M50 48C45 34 39 28 27 27M50 48c5-14 11-20 23-21"/><path d="M27 27c7-3 13-1 18 5M73 27c-7-3-13-1-18 5"/>',
    growth: '<path d="M50 88V19M50 66C34 65 23 54 22 39c15 0 26 8 28 25M50 49c3-20 15-29 29-29-1 17-10 27-29 29"/><circle cx="50" cy="88" r="3" fill="currentColor" stroke="none"/>',
    wave: '<path d="M4 52c12 0 12-26 24-26s12 50 24 50 12-50 24-50 12 26 20 26"/><path d="M4 67c12 0 12-12 24-12s12 24 24 24 12-24 24-24 12 12 20 12" opacity=".45"/>',
    orbit: '<circle cx="50" cy="50" r="37"/><circle cx="50" cy="50" r="21"/><circle cx="82" cy="31" r="5" fill="currentColor" stroke="none"/><path d="M10 50h13M77 50h13"/>',
    thread: '<path d="M6 77C20 17 35 92 50 35S75 10 94 70"/><path d="M8 83C26 26 38 92 56 40S78 17 93 66" opacity=".42"/>',
    frame: '<rect x="10" y="14" width="80" height="72" rx="5"/><path d="M20 28h20M20 36h13M65 70h15M68 22h12"/>',
    page: '<path d="M23 10h43l12 13v67H23zM66 10v15h12"/><path d="M34 40h32M34 50h32M34 60h23M34 70h29"/>',
    grid: '<path d="M12 25h76M12 50h76M12 75h76M25 12v76M50 12v76M75 12v76"/><circle cx="50" cy="50" r="7" fill="currentColor" stroke="none"/>',
    spark: '<path d="M50 7v25M50 68v25M7 50h25M68 50h25M19 19l18 18M63 63l18 18M81 19 63 37M37 63 19 81"/><circle cx="50" cy="50" r="8"/>',
    spotlight: '<path d="M50 8 10 87h80z"/><circle cx="50" cy="44" r="11"/><path d="M20 82h60"/>',
    pulse: '<circle cx="50" cy="50" r="12"/><circle cx="50" cy="50" r="28"/><circle cx="50" cy="50" r="44" opacity=".5"/>'
  });
  const colors = Object.freeze({cream:'#f6f8ce',white:'#ffffff',sky:'#72c6f5',mint:'#70c6b5'});
  const motions = ['draw','drift','pulse','orbit','sweep','rise'];
  function escape(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function bounded(value,min,max,fallback) { const n=Number(value); return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback; }
  function art(plan,seconds) {
    if(!plan || !Array.isArray(plan.elements))return '';
    return plan.elements.slice(0,6).map(el => {
      if(!el || !Object.hasOwn(motifs,el.motif))return '';
      const x=bounded(el.x,5,95,50), y=bounded(el.y,5,95,50), size=bounded(el.size,10,75,30), delay=bounded(el.delay,0,3,0);
      const motion=motions.includes(el.motion)?el.motion:'drift';
      const color=Object.hasOwn(colors,el.color)?colors[el.color]:colors.cream;
      const span=Math.max(1.2,Math.min(6,seconds*.65));
      return `<div class="pav-layer pav-layer--${motion}" style="left:${x}%;top:${y}%;width:${size}%;color:${color};--delay:${delay}s;--span:${span}s"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${motifs[el.motif]}</svg></div>`;
    }).join('');
  }
  function renderPavoneoCaption(scene,choice,requestedSeconds) {
    const seconds=bounded(requestedSeconds,1,60,5);
    const size={small:'clamp(18px,6.5vw,78px)',medium:'clamp(20px,8vw,96px)',large:'clamp(22px,10vw,120px)'}[choice.size]||'clamp(20px,8vw,96px)';
    const entry=['rise','fade','pop','slide','none'].includes(choice.entry)?choice.entry:'rise';
    const background={navy:'#0c3065',blue:'#105bbe',transparent:'transparent'}[choice.background]||'#0c3065';
    const horizontal=choice.layout==='left'?'flex-start':'center';
    const vertical=choice.layout==='lower'?'flex-end':'center';
    const textAlign=choice.layout==='left'?'left':'center';
    const accent=choice.accent==='none'?'':`<span class="pav-caption-accent pav-caption-accent--${choice.accent==='corner'?'corner':'line'}" aria-hidden="true"></span>`;
    const caption=String(scene.caption||'');
    const raw=caption.trim()?caption:'Escribe un rótulo en la tarjeta';
    const tokens=raw.split(/(\s+)/);
    const words=tokens.map((part,index)=>part.trim()?index:-1).filter(index=>index>=0);
    const emphasized=choice.emphasis==='first'?words[0]:choice.emphasis==='last'?words.at(-1):-1;
    let word=0;
    const visual=tokens.map((part,index)=>part.trim()?`<span class="pav-word" style="--i:${Math.min(word++,18)}">${index===emphasized?`<em>${escape(part)}</em>`:escape(part)}</span>`:escape(part)).join('');
    const textMotion=['stagger','wipe','cinematic','steady'].includes(choice.textMotion)?choice.textMotion:'steady';
    const entryAnimation=entry==='none'?'none':`pav-enter-${entry} ${Math.min(1.1,seconds/4)}s cubic-bezier(.2,.75,.25,1) both`;
    const layers=art(scene.motionPlan,seconds);
    return `<style>\n.pav-caption{box-sizing:border-box;width:100%;height:100%;min-height:100vh;position:relative;display:flex;align-items:${vertical};justify-content:${horizontal};padding:9%;background:${background};color:#fff;text-align:${textAlign};overflow:hidden}.pav-caption *{box-sizing:border-box}.pav-caption__art{position:absolute;inset:0;pointer-events:none;animation:pav-life ${seconds}s linear both}.pav-layer{position:absolute;transform:translate(-50%,-50%);opacity:0;animation:pav-appear .7s ease both;animation-delay:var(--delay)}.pav-layer svg{display:block;width:100%;height:auto;filter:drop-shadow(0 0 14px #68b7e755)}.pav-layer--draw svg{animation:pav-draw var(--span) ease both;animation-delay:var(--delay)}.pav-layer--drift svg{animation:pav-drift var(--span) ease-in-out infinite alternate}.pav-layer--pulse svg{animation:pav-pulse var(--span) ease-in-out infinite}.pav-layer--orbit svg{animation:pav-orbit var(--span) linear infinite}.pav-layer--sweep svg{animation:pav-sweep var(--span) ease-in-out infinite alternate}.pav-layer--rise svg{animation:pav-rise var(--span) ease-in-out infinite alternate}.pav-caption__frame{position:relative;z-index:2;max-width:100%;animation:pav-life ${seconds}s linear both}.pav-caption__text{font-family:Manrope,"Segoe UI",Arial,sans-serif;font-size:${size};font-weight:800;line-height:1.04;letter-spacing:-.055em;overflow-wrap:anywhere;white-space:pre-wrap;text-shadow:0 3px 20px #071f43dd;animation:${entryAnimation}}.pav-caption__text em{font-family:"DM Serif Display",Georgia,serif;font-style:italic;font-weight:400;color:#f6f8ce;letter-spacing:-.035em}.pav-caption-accent{display:block;background:#f6f8ce;margin-bottom:5%}.pav-caption-accent--line{width:13%;height:5px;min-width:34px;border-radius:5px}.pav-caption-accent--corner{width:38px;height:38px;background:transparent;border-top:5px solid #f6f8ce;border-left:5px solid #f6f8ce}.pav-word{display:inline-block}.pav-text--stagger .pav-word{animation:pav-word-in .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*.11s)}.pav-text--wipe{animation:pav-wipe .9s cubic-bezier(.2,.7,.2,1) both}.pav-text--cinematic{animation:pav-cinematic 1.1s ease-out both}@keyframes pav-enter-rise{from{opacity:0;transform:translateY(10%)}to{opacity:1;transform:translateY(0)}}@keyframes pav-enter-fade{from{opacity:0}to{opacity:1}}@keyframes pav-enter-pop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}@keyframes pav-enter-slide{from{opacity:0;transform:translateX(-12%)}to{opacity:1;transform:translateX(0)}}@keyframes pav-word-in{from{opacity:0;transform:translateY(.45em) rotate(-2deg)}to{opacity:1;transform:none}}@keyframes pav-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}@keyframes pav-cinematic{from{opacity:0;filter:blur(14px);transform:scale(1.06)}to{opacity:1;filter:blur(0);transform:scale(1)}}@keyframes pav-appear{from{opacity:0}to{opacity:.72}}@keyframes pav-draw{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}@keyframes pav-drift{from{transform:translate(-5%,4%)}to{transform:translate(5%,-4%)}}@keyframes pav-pulse{0%,100%{transform:scale(.88);opacity:.5}50%{transform:scale(1.12);opacity:1}}@keyframes pav-orbit{to{transform:rotate(360deg)}}@keyframes pav-sweep{from{transform:translateX(-10%) rotate(-4deg)}to{transform:translateX(10%) rotate(4deg)}}@keyframes pav-rise{from{transform:translateY(10%)}to{transform:translateY(-10%)}}@keyframes pav-life{0%,85%{opacity:1}100%{opacity:0}}\n</style>\n<div class="pav-caption" role="img" aria-label="${escape(raw.replace(/\s+/g,' '))}"><div class="pav-caption__art" aria-hidden="true">${layers}</div><div class="pav-caption__frame"><div class="pav-caption__text pav-text--${textMotion}">${accent}${visual}</div></div></div>`;
  }
  function validOpusCode(code) {
    const cssAnimation=typeof code?.css==='string'&&/(?:@(?:-webkit-)?keyframes\b|(?:-webkit-)?animation(?:-name)?\s*:)/i.test(code.css);
    const scriptedAnimation=typeof code?.javascript==='string'&&/(?:requestAnimationFrame\s*\(|\.animate\s*\(|setInterval\s*\()/i.test(code.javascript);
    const scriptedTransition=typeof code?.css==='string'&&/(?:-webkit-)?transition(?:-[\w-]+)?\s*:/i.test(code.css)&&typeof code?.javascript==='string'&&/(?:\.classList\.|\.style\.|setAttribute\s*\()/i.test(code.javascript);
    return code && typeof code === 'object'
      && typeof code.concept === 'string' && code.concept.length <= 1000
      && typeof code.html === 'string' && code.html.length <= 18000
      && typeof code.css === 'string' && code.css.length <= 30000
      && typeof code.javascript === 'string' && code.javascript.length <= 18000
      && !/<\s*\/?\s*(script|style|iframe|frame|meta|link|base|object|embed|form)\b/i.test(code.html)
      && !/\bon[a-z]+\s*=/i.test(code.html)
      && !/<\s*\/\s*style\b/i.test(code.css)
      && !/<\s*\/\s*script\b/i.test(code.javascript)
      && !/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|document\.cookie|window\.open|eval)\b/i.test(code.javascript)
      && (cssAnimation||scriptedAnimation||scriptedTransition);
  }
  function renderOpusDocument(code,caption,seconds) {
    if(!validOpusCode(code))return null;
    const duration=bounded(seconds,1,60,5);
    const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
    const placeholders=code.html.match(/\bid\s*=\s*['"]exact-caption['"]/gi)||[];
    const stages=code.html.match(/\bid\s*=\s*['"]opus-stage['"]/gi)||[];
    if(placeholders.length>1)return null;
    if(stages.length>1)return null;
    let html=code.html;
    if(placeholders.length){
      const emptyCaption=/<([a-z][a-z0-9-]*)\b([^>]*\bid\s*=\s*(['"])exact-caption\3[^>]*)>\s*<\/\1>/i;
      if(!emptyCaption.test(html))return null;
      html=html.replace(emptyCaption,(_,tag,attributes)=>`<${tag}${attributes}>${escape(caption)}</${tag}>`);
    }else html+=`<div id="exact-caption">${escape(caption)}</div>`;
    const stage=stages.length?html:`<div id="opus-stage" data-duration="${duration}">${html}</div>`;
    return `<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>Rótulo de Opus 5.5</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body{aspect-ratio:9/16;background:transparent;color:white}#opus-stage{position:relative!important;inset:auto!important;width:100%!important;height:100%!important;overflow:hidden;isolation:isolate}#exact-caption{position:relative;z-index:5;white-space:pre-wrap;font-family:Manrope,"Segoe UI",Arial,sans-serif;font-weight:800}</style><style>${code.css}</style></head><body>${stage}<script>"use strict";\n${code.javascript}\n<\/script></body></html>`;
  }
  function wrapOpusDocument(documentCode) {
    if (typeof documentCode !== 'string' || !documentCode.startsWith('<!doctype html>')) return null;
    return `<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rótulo vertical · Opus 5.5</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:grid;place-items:center;background:#071f43}iframe{display:block;width:min(100vw,56.25vh);height:min(100vh,177.7778vw);border:0;background:#0c3065}</style></head><body><iframe title="Animación vertical 9:16" sandbox="allow-scripts" srcdoc="${escape(documentCode)}"></iframe></body></html>`;
  }
  root.renderPavoneoCaption=renderPavoneoCaption;
  root.renderOpusDocument=renderOpusDocument;
  root.wrapOpusDocument=wrapOpusDocument;
  root.validOpusCode=validOpusCode;
})(globalThis);

