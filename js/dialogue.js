/* VAGALUME — caixa de diálogo: nome, retrato, revelação progressiva com som por personagem,
 * acelerar/pular, pausas dramáticas, cores e efeitos ({shake}, {wave}), escolhas.
 * Marcadores: {p} pausa curta, {P} pausa longa, {red}/{blue}/{yellow}/{gray}/{pink}/{green} cor,
 * {shake} tremido, {wave} ondulado, {slow} devagar, {/} fecha efeito, \n quebra linha. */
(function () {
  'use strict';
  const R = window.RPG;
  const TH = () => R.THEME;

  const COLORS = { red: '#ff7b85', blue: '#8ec4ff', yellow: '#ffd86b', gray: '#a8a2bc', pink: '#ffa8d0', green: '#8ee6a0', white: '#f6efe0', purple: '#c8a8ff' };
  const SPEED = [28, 55, 95, 100000];

  const BOX = { x: 8, y: 152, w: 368, h: 58 };
  const TEXT_W = BOX.w - 20;
  const LINES = 3;

  // converte texto com marcadores em lista de "células"
  function parse(text) {
    const out = [];
    let style = { color: null, fx: null, slow: false };
    const stack = [];
    let i = 0;
    text = String(text);
    while (i < text.length) {
      const ch = text[i];
      if (ch === '{') {
        const j = text.indexOf('}', i);
        if (j > i) {
          const tag = text.slice(i + 1, j);
          i = j + 1;
          if (tag === 'p') { out.push({ pause: 0.28 }); continue; }
          if (tag === 'P') { out.push({ pause: 0.8 }); continue; }
          if (tag === '/') { style = stack.pop() || { color: null, fx: null, slow: false }; continue; }
          stack.push(style);
          style = Object.assign({}, style);
          if (COLORS[tag]) style.color = COLORS[tag];
          else if (tag === 'shake' || tag === 'wave') style.fx = tag;
          else if (tag === 'slow') style.slow = true;
          continue;
        }
      }
      if (ch === '\\' && text[i + 1] === 'n') { out.push({ ch: '\n', style }); i += 2; continue; }
      out.push({ ch, style });
      i++;
    }
    return out;
  }
  // quebra as células em linhas pela largura
  function layout(cells, maxW) {
    const lines = [[]];
    let word = [], wordW = 0, lineW = 0;
    const flush = () => {
      const space = lines[lines.length - 1].length && lines[lines.length - 1].some((c) => c.ch) ? 0 : 0;
      if (lineW + wordW > maxW && lines[lines.length - 1].some((c) => c.ch && c.ch !== ' ')) {
        // remove espaço final
        const L = lines[lines.length - 1];
        while (L.length && L[L.length - 1].ch === ' ') L.pop();
        lines.push([]);
        lineW = 0;
        while (word.length && word[0].ch === ' ') { word.shift(); }
        wordW = word.reduce((a, c) => a + (c.ch ? R.Font.charWidth(c.ch) + 1 : 0), 0);
      }
      void space;
      lines[lines.length - 1].push(...word);
      lineW += wordW;
      word = []; wordW = 0;
    };
    for (const c of cells) {
      if (c.ch === '\n') { flush(); lines.push([]); lineW = 0; continue; }
      if (c.ch === ' ') { flush(); word.push(c); wordW += R.Font.charWidth(' ') + 1; flush(); continue; }
      word.push(c);
      if (c.ch) wordW += R.Font.charWidth(c.ch) + 1;
    }
    flush();
    return lines;
  }

  function speakerInfo(spk) {
    if (!spk) return { name: '', portrait: null, voice: 500, narration: true };
    if (spk === 'think') return { name: 'LUME', portrait: null, voice: 0, think: true };
    let [id, expr] = String(spk).split(':');
    if (id === '?') return { name: expr || '???', portrait: null, voice: 400 };
    const party = R.DB.characters.party[id];
    const npc = R.DB.characters.npcs[id];
    const def = party || npc;
    if (!def) return { name: String(id).toUpperCase(), portrait: null, voice: 500 };
    let tier = 1;
    if (expr) { const m = expr.match(/^([a-z]+)(\d)?$/); if (m) { expr = m[1]; tier = m[2] ? +m[2] : 1; } }
    return {
      name: def.name, voice: def.voice || 500, id,
      portrait: R.Art.portrait(id, expr || 'neutro', tier),
      expr: expr || 'neutro', party: !!party,
    };
  }

  class DialogueScene {
    constructor() {
      this.opaque = false;
      this.pausable = true;
      this.queue = null;
      this.page = null;
      this.choice = null;
      this.closing = false;
      this.t = 0;
      this.openT = 0;
    }
    // ---------------------------------------------------------------- API
    say(speaker, text) {
      // se outra fala ainda esperava resposta, libera-a (evita travar dois scripts)
      if (this.resolveSay) { const prev = this.resolveSay; this.resolveSay = null; prev(); }
      return new Promise((resolve) => {
        const info = speakerInfo(speaker);
        let cells = parse(text);
        if (info.think) cells = parse('{gray}(' + text + '){/}');
        const lines = layout(cells, TEXT_W - (info.portrait ? 0 : 0));
        // divide em páginas de 3 linhas
        const pages = [];
        for (let i = 0; i < lines.length; i += LINES) pages.push(lines.slice(i, i + LINES));
        this.info = info;
        this.pages = pages;
        this.pageIdx = 0;
        this.resolveSay = resolve;
        this.startPage();
      });
    }
    startPage() {
      const lines = this.pages[this.pageIdx];
      this.flat = [];
      lines.forEach((L, li) => {
        let x = 0;
        for (const c of L) {
          if (c.pause) { this.flat.push({ pause: c.pause }); continue; }
          this.flat.push({ ch: c.ch, style: c.style, x, line: li });
          x += R.Font.charWidth(c.ch) + 1;
        }
      });
      this.shown = 0;
      this.acc = 0;
      this.pauseT = 0;
      this.done = false;
      this.blipN = 0;
    }
    choose(options, cancelIndex) {
      return new Promise((resolve) => {
        this.choice = { options, sel: 0, cancelIndex: cancelIndex === undefined ? options.length - 1 : cancelIndex, resolve, t: 0 };
        if (R.Audio) R.Audio.sfx('cursor');
      });
    }
    close() {
      R.Scenes.pop(this);
    }
    // ------------------------------------------------------------ atualização
    update(dt) {
      this.t += dt;
      this.openT = Math.min(1, this.openT + dt * 8);
      const I = R.Input;
      if (this.choice) {
        const c = this.choice;
        c.t += dt;
        if (I.repeat('up')) { c.sel = (c.sel + c.options.length - 1) % c.options.length; R.Audio.sfx('cursor'); }
        if (I.repeat('down')) { c.sel = (c.sel + 1) % c.options.length; R.Audio.sfx('cursor'); }
        if (I.pressed('confirm') && c.t > 0.15) { this.choice = null; R.Audio.sfx('confirm'); I.consume(); c.resolve(c.sel); return; }
        if (I.pressed('cancel') && c.cancelIndex >= 0) { this.choice = null; R.Audio.sfx('cancel'); I.consume(); c.resolve(c.cancelIndex); return; }
        return;
      }
      if (!this.flat) return;
      if (!this.done) {
        const speed = SPEED[R.Settings.get('textSpeed')] || 55;
        const fast = I.down('confirm') && this.t > 0.2;
        if ((I.pressed('confirm') || I.pressed('cancel')) && this.shown > 1) { this.revealAll(); I.consume(); return; }
        if (this.pauseT > 0) { this.pauseT -= dt * (fast ? 4 : 1); return; }
        this.acc += dt * speed * (fast ? 3 : 1);
        while (this.acc >= 1 && this.shown < this.flat.length) {
          const c = this.flat[this.shown];
          if (c.pause) { this.shown++; this.pauseT = c.pause; this.acc = 0; break; }
          const slow = c.style && c.style.slow;
          this.acc -= slow ? 3 : 1;
          this.shown++;
          if (c.ch !== ' ' && this.info.voice && (this.blipN++ % 2 === 0)) R.Audio.blip(this.info.voice);
        }
        if (this.shown >= this.flat.length) this.done = true;
        return;
      }
      if (I.pressed('confirm') || I.pressed('cancel')) {
        I.consume();
        if (this.pageIdx < this.pages.length - 1) { this.pageIdx++; this.startPage(); R.Audio.sfx('text'); return; }
        const r = this.resolveSay;
        this.resolveSay = null;
        this.flat = null;
        if (r) r();
      }
    }
    revealAll() {
      this.shown = this.flat.length;
      this.done = true;
      this.pauseT = 0;
    }
    // --------------------------------------------------------------- desenho
    render(ctx) {
      const info = this.info;
      if (!info) return;
      const k = R.U.ease.outQuad(this.openT);
      const by = BOX.y + Math.round((1 - k) * 12);
      ctx.globalAlpha = k;
      R.UI.window(ctx, BOX.x, by, BOX.w, BOX.h, { alpha: 0.94 });
      if (info.name) {
        const nw = R.Font.measure(info.name) + 14;
        R.UI.window(ctx, BOX.x + 6, by - 13, nw, 15, { bg: '#2a2045' });
        R.Font.draw(ctx, info.name, BOX.x + 13, by - 12, info.think ? TH().dim : TH().accent);
      }
      if (info.portrait) {
        const px = BOX.x + BOX.w - 52, py = by - 50;
        const bg = info.party ? (TH().emoBg[info.expr] || TH().emoBg.neutro) : '#2a2045';
        R.UI.window(ctx, px, py, 48, 48, { bg });
        ctx.drawImage(info.portrait, px + 4, py + 4);
      }
      if (this.flat) {
        const t = this.t;
        const tx = BOX.x + 10, ty = by + 6;
        let n = 0;
        for (const c of this.flat) {
          if (n >= this.shown) break;
          n++;
          if (c.pause || c.ch === ' ') continue;
          let ox = 0, oy = 0;
          const st = c.style || {};
          if (st.fx === 'shake' && !R.Settings.get('reduceEffects')) { ox = Math.round((Math.random() - 0.5) * 1.6); oy = Math.round((Math.random() - 0.5) * 1.6); }
          if (st.fx === 'wave') oy = Math.round(Math.sin(t * 6 + c.x * 0.15) * 1.5);
          const color = st.color || (info.narration ? '#e8e2f4' : TH().text);
          R.Font.drawChar(ctx, c.ch, tx + c.x + ox, ty + c.line * 13 + oy, color);
        }
        if (this.done) {
          const b = Math.floor(t * 3) % 2;
          R.Font.draw(ctx, '▼', BOX.x + BOX.w - 14, by + BOX.h - 13 + b, TH().accent);
        }
      }
      ctx.globalAlpha = 1;
      if (this.choice) this.renderChoice(ctx, by);
    }
    renderChoice(ctx, by) {
      const c = this.choice;
      const w = Math.max(...c.options.map((o) => R.Font.measure(o))) + 28;
      const h = c.options.length * 13 + 8;
      const x = BOX.x + BOX.w - w - (this.info.portrait ? 56 : 4), y = by - h - 4;
      R.UI.window(ctx, x, y, w, h);
      c.options.forEach((o, i) => {
        R.Font.draw(ctx, o, x + 16, y + 4 + i * 13, i === c.sel ? TH().accent : TH().text);
        if (i === c.sel) R.UI.cursor(ctx, x + 5, y + 5 + i * 13);
      });
    }
  }

  // controla uma única caixa aberta por vez
  R.Dialogue = {
    scene: null,
    isOpen() { return !!this.scene && R.Scenes.stack.includes(this.scene); },
    ensure() {
      if (!this.isOpen()) {
        this.scene = new DialogueScene();
        R.Scenes.push(this.scene);
      }
      return this.scene;
    },
    async say(speaker, text) { return this.ensure().say(speaker, text); },
    async choose(options, cancelIndex) { return this.ensure().choose(options, cancelIndex); },
    close() { if (this.isOpen()) this.scene.close(); this.scene = null; },
    parse,
    layout,
  };
})();
