/* VAGALUME — renderizador: canvas interno 384x216, escala nítida,
 * efeitos de tela (fade, flash, tremor) e utilitários de interface. */
(function () {
  'use strict';
  const R = window.RPG;
  const { PA, col, shade } = R.Pixel;

  // paleta da interface
  const THEME = (R.THEME = {
    bg: '#171229',
    bg2: '#221a3d',
    border: '#f3e9d2',
    borderDark: '#06040c',
    text: '#f6efe0',
    dim: '#9b93b5',
    disabled: '#5d5677',
    accent: '#ffd86b',
    good: '#8ee6a0',
    bad: '#ff7b85',
    hp: '#ff6f8e',
    hpBg: '#4a1f33',
    br: '#ffb347',
    brBg: '#4a3418',
    exp: '#9ad4ff',
    emo: {
      neutro: '#d8d4e8',
      feliz: '#f7d64a',
      triste: '#6aa6f0',
      irritado: '#f0545e',
      medo: '#a77be8',
    },
    emoBg: {
      neutro: '#3b3552',
      feliz: '#8a6b16',
      triste: '#1f4677',
      irritado: '#7a1f2a',
      medo: '#43286e',
    },
  });

  const Screen = (R.Screen = {
    canvas: null,
    ctx: null, // contexto do buffer interno
    display: null,
    dctx: null,
    scaleMode: 'ajustar',
    scale: 1,
    fx: { fade: 0, fadeColor: '#000', flash: 0, flashColor: '#fff', shake: 0, shakeMag: 0, sx: 0, sy: 0 },
    init(displayEl) {
      this.display = displayEl;
      this.dctx = displayEl.getContext('2d', { alpha: false });
      this.canvas = document.createElement('canvas');
      this.canvas.width = R.W;
      this.canvas.height = R.H;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
      this.resize();
    },
    resize() {
      const box = document.getElementById('game');
      if (!box || !this.display) return;
      const vw = box.clientWidth || window.innerWidth;
      const vh = box.clientHeight || window.innerHeight;
      let s = Math.min(vw / R.W, vh / R.H);
      if (this.scaleMode === 'inteira' && s >= 1) s = Math.floor(s);
      s = Math.max(0.5, s);
      this.scale = s;
      const dpr = window.devicePixelRatio || 1;
      const k = Math.max(1, Math.ceil(s * dpr - 0.001));
      const cssW = Math.floor(R.W * s), cssH = Math.floor(R.H * s);
      if (this.display.width !== R.W * k) {
        this.display.width = R.W * k;
        this.display.height = R.H * k;
      }
      this.display.style.width = cssW + 'px';
      this.display.style.height = cssH + 'px';
      const exact = Math.abs(s * dpr - Math.round(s * dpr)) < 0.01;
      this.display.style.imageRendering = exact ? 'pixelated' : 'auto';
      this.k = k;
      R.Bus.emit('resize', { cssW, cssH, s });
    },
    present() {
      const d = this.dctx;
      d.imageSmoothingEnabled = false;
      d.drawImage(this.canvas, 0, 0, this.display.width, this.display.height);
    },
    // ---------------------------------------------------------------- efeitos
    update(dt) {
      const fx = this.fx;
      if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt * 3);
      if (fx.shake > 0) {
        fx.shake -= dt;
        const m = fx.shakeMag * Math.min(1, fx.shake * 4);
        fx.sx = Math.round((Math.random() * 2 - 1) * m);
        fx.sy = Math.round((Math.random() * 2 - 1) * m);
      } else { fx.sx = 0; fx.sy = 0; }
      if (this._fadeTween) {
        const t = this._fadeTween;
        t.e += dt;
        const p = Math.min(1, t.e / t.d);
        fx.fade = t.from + (t.to - t.from) * p;
        if (p >= 1) { this._fadeTween = null; t.resolve(); }
      }
    },
    reduced() { return R.Settings && R.Settings.get('reduceEffects'); },
    shake(mag = 3, dur = 0.3) {
      if (this.reduced()) mag = Math.min(mag, 1);
      this.fx.shake = dur;
      this.fx.shakeMag = mag;
    },
    flash(color = '#fff', strength = 0.8) {
      if (this.reduced()) strength *= 0.25;
      this.fx.flash = strength;
      this.fx.flashColor = color;
    },
    fadeTo(alpha, ms = 400, color) {
      if (color) this.fx.fadeColor = color;
      if (this._fadeTween) this._fadeTween.resolve();
      return new Promise((resolve) => {
        if (ms <= 0) { this.fx.fade = alpha; resolve(); return; }
        this._fadeTween = { from: this.fx.fade, to: alpha, d: ms / 1000, e: 0, resolve };
      });
    },
    fadeOut(ms = 350, color = '#000') { return this.fadeTo(1, ms, color); },
    fadeIn(ms = 350) { return this.fadeTo(0, ms); },
    drawOverlays(ctx) {
      const fx = this.fx;
      if (fx.flash > 0) {
        ctx.globalAlpha = Math.min(1, fx.flash);
        ctx.fillStyle = fx.flashColor;
        ctx.fillRect(0, 0, R.W, R.H);
        ctx.globalAlpha = 1;
      }
      if (fx.fade > 0) {
        ctx.globalAlpha = Math.min(1, fx.fade);
        ctx.fillStyle = fx.fadeColor;
        ctx.fillRect(0, 0, R.W, R.H);
        ctx.globalAlpha = 1;
      }
    },
  });

  // --------------------------------------------------------------- interface
  const iconCache = {};
  function makeIcon(name) {
    const p = new PA(9, 9);
    const E = THEME.emo;
    switch (name) {
      case 'feliz': // sol-estrela
        p.circle(4.5, 4.5, 2.6, E.feliz);
        [[4, 0], [4, 8], [0, 4], [8, 4], [1, 1], [7, 7], [7, 1], [1, 7]].forEach(([x, y]) => p.set(x, y, E.feliz));
        p.set(3, 4, '#5a3d00'); p.set(5, 4, '#5a3d00');
        break;
      case 'triste': // gota
        p.poly([[4.5, 0.5], [7.5, 5], [4.5, 8.5], [1.5, 5]], E.triste);
        p.circle(4.5, 5.6, 2.9, E.triste);
        p.set(3, 4, '#dff0ff');
        break;
      case 'irritado': // chama pontuda
        p.poly([[1, 8.5], [1.5, 3], [3, 5], [4.5, 0.5], [6, 5], [7.5, 3], [8, 8.5]], E.irritado);
        p.set(4, 6, '#ffd0a0');
        break;
      case 'medo': // espiral
        p.ring(4.5, 4.5, 4, E.medo);
        p.ring(4.5, 4.5, 2, E.medo);
        p.set(4, 4, E.medo);
        break;
      case 'neutro':
        p.ring(4.5, 4.5, 3.5, E.neutro);
        break;
      case 'botao': // moeda-botão
        p.circle(4.5, 4.5, 4, '#e7a33e');
        p.ring(4.5, 4.5, 4, '#8a5a17');
        p.set(3, 3, '#5a3a10'); p.set(5, 3, '#5a3a10'); p.set(3, 5, '#5a3a10'); p.set(5, 5, '#5a3a10');
        break;
      case 'coracao':
        p.pattern(0, 1, ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], { '#': THEME.hp });
        break;
      case 'brilho':
        p.pattern(1, 0, ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'], { '#': THEME.br });
        break;
      case 'chave':
        p.ring(2.5, 4.5, 2.2, '#ffd86b'); p.hline(4, 8, 4, '#ffd86b'); p.set(7, 5, '#ffd86b'); p.set(8, 5, '#ffd86b');
        break;
      case 'lanche':
        p.circle(4.5, 4.5, 3.8, '#e9b06a'); p.set(3, 3, '#7a4a20'); p.set(6, 4, '#7a4a20'); p.set(4, 6, '#7a4a20');
        break;
      case 'brinquedo':
        p.circle(4.5, 4.5, 3.8, '#ff7aa8'); p.vline(4, 1, 8, '#fff'); p.hline(1, 8, 4, '#fff');
        break;
      case 'equip':
        p.line(1, 8, 7, 2, '#cfd7e6'); p.line(2, 8, 8, 2, '#8a96ad'); p.hline(0, 3, 6, '#b5793c');
        break;
      case 'amuleto':
        p.circle(4.5, 5.5, 2.8, '#7be0c8'); p.vline(4, 0, 3, '#e8e0ff');
        break;
      case 'missao':
        p.rect(1, 1, 7, 8, '#f3e9d2'); p.hline(2, 6, 3, '#6a5a80'); p.hline(2, 6, 5, '#6a5a80'); p.hline(2, 5, 7, '#6a5a80');
        break;
      case 'check':
        p.line(1, 4, 3, 7, THEME.good); p.line(3, 7, 8, 1, THEME.good);
        break;
      case 'laco':
        p.pattern(0, 1, ['.##.##.', '#..#..#', '#.....#', '.#...#.', '..#.#..', '...#...'], { '#': '#ff9fc4' });
        break;
      default:
        p.rect(1, 1, 7, 7, '#888');
    }
    return p.toCanvas();
  }

  const UI = (R.UI = {
    icon(ctx, name, x, y) {
      let c = iconCache[name];
      if (!c) c = iconCache[name] = makeIcon(name);
      ctx.drawImage(c, Math.round(x), Math.round(y));
    },
    // janela com moldura dupla e cantos arredondados
    window(ctx, x, y, w, h, opts = {}) {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      const bg = opts.bg || THEME.bg;
      const border = opts.border || THEME.border;
      ctx.globalAlpha = opts.alpha === undefined ? 0.96 : opts.alpha;
      ctx.fillStyle = bg;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.globalAlpha = 1;
      // brilho interno
      ctx.fillStyle = opts.inner || THEME.bg2;
      ctx.fillRect(x + 2, y + 2, w - 4, 1);
      ctx.fillRect(x + 2, y + 2, 1, h - 4);
      // borda clara
      ctx.fillStyle = border;
      ctx.fillRect(x + 1, y, w - 2, 1);
      ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
      ctx.fillRect(x, y + 1, 1, h - 2);
      ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
      // sombra externa
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x + 2, y + h, w - 2, 1);
      ctx.fillRect(x + w, y + 2, 1, h - 2);
      if (opts.title) {
        const tw = R.Font.measure(opts.title) + 10;
        UI.window(ctx, x + 4, y - 9, tw, 13, { bg: opts.titleBg || THEME.bg2 });
        R.Font.draw(ctx, opts.title, x + 9, y - 8, opts.titleColor || THEME.accent);
      }
    },
    // cursor de vagalume animado
    cursor(ctx, x, y, t) {
      t = t === undefined ? R.Clock.time : t;
      const bob = Math.round(Math.sin(t * 6) * 1);
      x = Math.round(x + bob);
      y = Math.round(y);
      ctx.fillStyle = 'rgba(255,230,120,0.35)';
      ctx.fillRect(x - 1, y + 1, 7, 5);
      ctx.fillStyle = '#fff6b0';
      ctx.fillRect(x + 2, y + 2, 3, 3);
      ctx.fillStyle = '#ffd86b';
      ctx.fillRect(x + 1, y + 3, 1, 1);
      ctx.fillRect(x + 5, y + 3, 1, 1);
      ctx.fillStyle = '#c9c2ff';
      const w = (Math.floor(t * 12) % 2) ? 1 : 0;
      ctx.fillRect(x + 2, y + 1 - w, 1, 1);
      ctx.fillRect(x + 4, y + 1 - w, 1, 1);
    },
    bar(ctx, x, y, w, h, v, max, color, bg) {
      x = Math.round(x); y = Math.round(y);
      ctx.fillStyle = THEME.borderDark;
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = bg || '#2a2440';
      ctx.fillRect(x, y, w, h);
      const f = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
      const fw = Math.round(w * f);
      if (fw > 0) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, fw, h);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, y, fw, 1);
      }
    },
    text(ctx, t, x, y, color, opts) { return R.Font.draw(ctx, t, x, y, color || THEME.text, opts || {}); },
    // lista vertical simples com cursor
    list(ctx, items, x, y, sel, opts = {}) {
      const lh = opts.lh || 13;
      const start = opts.scroll || 0;
      const n = Math.min(items.length - start, opts.rows || items.length);
      for (let i = 0; i < n; i++) {
        const it = items[start + i];
        const label = typeof it === 'string' ? it : it.label;
        const disabled = typeof it === 'object' && it.disabled;
        const yy = y + i * lh;
        const isSel = start + i === sel;
        const color = disabled ? THEME.disabled : isSel ? (opts.selColor || THEME.accent) : (it.color || THEME.text);
        R.Font.draw(ctx, label, x + 10, yy, color);
        if (it.right !== undefined) R.Font.draw(ctx, String(it.right), x + (opts.width || 100), yy, disabled ? THEME.disabled : THEME.dim, { align: 'right' });
        if (isSel && opts.focus !== false) UI.cursor(ctx, x, yy + 1);
      }
      // setas de rolagem
      if (opts.rows && items.length > opts.rows) {
        const t = R.Clock.time;
        const b = Math.round(Math.sin(t * 5));
        if (start > 0) R.Font.draw(ctx, '↑', x + (opts.width || 100) / 2, y - 10 + b, THEME.dim);
        if (start + opts.rows < items.length) R.Font.draw(ctx, '↓', x + (opts.width || 100) / 2, y + opts.rows * lh - 2 - b, THEME.dim);
      }
    },
    wrapText(ctx, text, x, y, maxW, color, lh = 12) {
      const lines = R.Font.wrap(text, maxW);
      lines.forEach((l, i) => R.Font.draw(ctx, l, x, y + i * lh, color || THEME.text));
      return lines.length;
    },
    emoColor(e) { return THEME.emo[e && e.type ? e.type : 'neutro']; },
  });
  void col; void shade;
})();
