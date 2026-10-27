/* VAGALUME — núcleo: namespace, utilidades, relógio de jogo, eventos e erros.
 * Todos os módulos são scripts clássicos que se registram em window.RPG.
 * Isso permite abrir o jogo direto pelo arquivo (file://) sem servidor. */
(function () {
  'use strict';
  const R = (window.RPG = window.RPG || {});

  R.VERSION = '1.0.0';
  R.SAVE_VERSION = 2;
  R.W = 384; // resolução interna (16:9)
  R.H = 216;
  R.TILE = 16;
  R.DEBUG = /[?&]debug=1/.test(location.search);

  // ---------------------------------------------------------------- utilidades
  const U = (R.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    approach(v, target, step) {
      if (v < target) return Math.min(v + step, target);
      return Math.max(v - step, target);
    },
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    chance: (p) => Math.random() < p,
    choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    // hash inteiro determinístico (variações de tiles)
    hash2(x, y, seed = 0) {
      let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      h = h ^ (h >>> 16);
      return (h >>> 0) / 4294967296;
    },
    // gerador pseudoaleatório com semente (mulberry32)
    rng(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    strSeed(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },
    clone: (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o))),
    ease: {
      outQuad: (t) => 1 - (1 - t) * (1 - t),
      inQuad: (t) => t * t,
      inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
      outBack: (t) => {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      },
    },
    dirVec: {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    },
    opposite: { up: 'down', down: 'up', left: 'right', right: 'left' },
    pad2: (n) => (n < 10 ? '0' : '') + n,
    formatTime(sec) {
      sec = Math.floor(sec);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return h + ':' + U.pad2(m) + ':' + U.pad2(s);
    },
    // remove acentos (para busca/ids)
    plain: (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  });

  // ------------------------------------------------------------------ registro
  const Log = (R.Log = {
    entries: [],
    max: 200,
    push(level, msg, extra) {
      const e = { t: Date.now(), level, msg: String(msg), extra: extra ? String(extra) : '' };
      this.entries.push(e);
      if (this.entries.length > this.max) this.entries.shift();
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      fn('[Vagalume] ' + msg, extra || '');
      return e;
    },
    info(m, x) { return this.push('info', m, x); },
    warn(m, x) { return this.push('warn', m, x); },
    error(m, x) { return this.push('error', m, x); },
  });

  // ------------------------------------------------- relógio de jogo (async)
  // Esperas medidas em tempo de jogo: não avançam com o jogo pausado.
  // Promessas criadas durante um quadro só podem resolver no quadro seguinte.
  R.Clock = {
    time: 0,
    waits: [],
    update(dt) {
      this.time += dt;
      if (!this.waits.length) return;
      const now = this.time;
      const pending = this.waits;
      this.waits = [];
      const ready = [];
      for (const w of pending) {
        if (w.at <= now) ready.push(w);
        else this.waits.push(w);
      }
      for (const w of ready) w.resolve();
    },
    wait(ms) {
      return new Promise((resolve) => {
        this.waits.push({ at: this.time + Math.max(0, ms) / 1000, resolve });
      });
    },
    nextFrame() {
      return new Promise((resolve) => this.waits.push({ at: this.time, resolve }));
    },
    // espera até uma condição ser verdadeira (checada a cada quadro)
    until(fn) {
      return new Promise((resolve) => {
        const check = () => {
          if (fn()) resolve();
          else this.waits.push({ at: this.time, resolve: check });
        };
        this.waits.push({ at: this.time, resolve: check });
      });
    },
  };

  // -------------------------------------------------------- barramento de eventos
  R.Bus = {
    map: {},
    on(name, fn) { (this.map[name] = this.map[name] || []).push(fn); return () => this.off(name, fn); },
    off(name, fn) { const l = this.map[name]; if (l) this.map[name] = l.filter((f) => f !== fn); },
    emit(name, ...args) {
      const l = this.map[name];
      if (!l) return;
      for (const fn of l.slice()) {
        try { fn(...args); } catch (e) { R.Errors.report(e, 'evento ' + name); }
      }
    },
  };

  // ------------------------------------------------------------------- erros
  R.Errors = {
    count: 0,
    lastShown: 0,
    report(err, context) {
      this.count++;
      const msg = (err && err.message) || String(err);
      Log.error((context ? context + ': ' : '') + msg, err && err.stack);
      this.show('Algo deu errado' + (context ? ' (' + context + ')' : ''), msg, false);
    },
    // fatal = impede o jogo de continuar (ex.: dados não carregaram)
    show(title, detail, fatal) {
      const el = document.getElementById('error-overlay');
      if (!el) return;
      const now = Date.now();
      if (!fatal && now - this.lastShown < 1500 && el.classList.contains('show')) return;
      this.lastShown = now;
      el.querySelector('.err-title').textContent = title;
      el.querySelector('.err-detail').textContent = detail;
      el.querySelector('.err-continue').style.display = fatal ? 'none' : '';
      el.classList.add('show');
      el.dataset.fatal = fatal ? '1' : '0';
    },
    hide() {
      const el = document.getElementById('error-overlay');
      if (el && el.dataset.fatal !== '1') el.classList.remove('show');
    },
  };

  window.addEventListener('error', (ev) => {
    if (ev.error) R.Errors.report(ev.error, 'script');
    else if (ev.message) R.Errors.report(new Error(ev.message), 'script');
  });
  window.addEventListener('unhandledrejection', (ev) => {
    R.Errors.report(ev.reason || new Error('Promessa rejeitada'), 'assíncrono');
  });
})();
