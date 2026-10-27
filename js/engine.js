/* VAGALUME — motor: configurações, pilha de cenas, laço principal,
 * pausa por perda de foco e notificações. */
(function () {
  'use strict';
  const R = window.RPG;

  // ------------------------------------------------------------ configurações
  const SETTINGS_KEY = 'vagalume.settings';
  const DEFAULTS = {
    master: 0.8,
    music: 0.7,
    sfx: 0.8,
    muted: false,
    textSpeed: 2, // 0 lento, 1 normal, 2 rápido, 3 instantâneo
    reduceEffects: false,
    scaleMode: 'ajustar', // 'ajustar' | 'inteira'
    touch: 'auto', // 'auto' | 'on' | 'off'
    binds: null,
    autosave: true,
    runDefault: false, // correr sem segurar Shift
    cleared: false, // terminou o primeiro arco (muda a tela inicial)
  };
  R.Settings = {
    data: Object.assign({}, DEFAULTS),
    storageOk: true,
    load() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const o = JSON.parse(raw);
          for (const k in DEFAULTS) if (o[k] !== undefined && typeof o[k] === typeof DEFAULTS[k] || (k === 'binds' && o[k])) this.data[k] = o[k];
        }
      } catch (e) {
        this.storageOk = false;
        R.Log.warn('Configurações não puderam ser lidas', e.message);
      }
      this.apply();
    },
    save() {
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data)); } catch (e) { this.storageOk = false; }
    },
    get(k) { return this.data[k]; },
    set(k, v) { this.data[k] = v; this.save(); this.apply(); },
    reset() {
      const cleared = this.data.cleared;
      this.data = Object.assign({}, DEFAULTS, { cleared });
      this.save();
      this.apply();
    },
    apply() {
      if (R.Input) R.Input.setBinds(this.data.binds);
      if (R.Screen && R.Screen.display) { R.Screen.scaleMode = this.data.scaleMode; R.Screen.resize(); }
      if (R.Audio) R.Audio.applyVolumes();
      const touch = document.getElementById('touch');
      if (touch) {
        const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const show = this.data.touch === 'on' || (this.data.touch === 'auto' && coarse);
        touch.classList.toggle('show', !!show);
        document.body.classList.toggle('has-touch', !!show);
        if (R.Screen && R.Screen.display) R.Screen.resize();
      }
    },
  };

  // ---------------------------------------------------------- pilha de cenas
  const Scenes = (R.Scenes = {
    stack: [],
    top() { return this.stack[this.stack.length - 1]; },
    // empilha e devolve promessa resolvida quando a cena terminar
    push(scene) {
      return new Promise((resolve) => {
        scene._resolve = resolve;
        const prev = this.top();
        if (prev && prev.pause) prev.pause();
        this.stack.push(scene);
        R.Input.consume();
        if (scene.enter) scene.enter();
      });
    },
    // remove a cena do topo (ou a indicada)
    pop(scene, result) {
      const s = scene || this.top();
      const i = this.stack.indexOf(s);
      if (i < 0) return;
      this.stack.splice(i, 1);
      if (s.exit) s.exit();
      R.Input.consume();
      const t = this.top();
      if (t && t.resume) t.resume();
      if (s._resolve) s._resolve(result);
    },
    // troca toda a pilha por uma cena
    reset(scene) {
      while (this.stack.length) {
        const s = this.stack.pop();
        if (s.exit) s.exit();
      }
      return this.push(scene);
    },
    find(type) { return this.stack.find((s) => s instanceof type); },
    update(dt) {
      const top = this.top();
      // cenas de baixo podem continuar animando (sem receber entrada)
      for (const s of this.stack) {
        if (s === top) continue;
        if (s.updateBelow) s.updateBelow(dt);
      }
      if (top && top.update) top.update(dt);
    },
    render(ctx) {
      let start = 0;
      for (let i = this.stack.length - 1; i >= 0; i--) {
        if (this.stack[i].opaque !== false) { start = i; break; }
      }
      for (let i = start; i < this.stack.length; i++) {
        const s = this.stack[i];
        if (s.render) s.render(ctx);
      }
    },
  });

  // ------------------------------------------------------------ notificações
  R.Toasts = {
    list: [],
    push(text, icon, color) {
      this.list.push({ text, icon, color, t: 0, life: 2.8 });
      if (this.list.length > 4) this.list.shift();
    },
    update(dt) {
      for (const t of this.list) t.t += dt;
      this.list = this.list.filter((t) => t.t < t.life);
    },
    render(ctx) {
      let y = 4;
      for (const t of this.list) {
        const w = R.Font.measure(t.text) + (t.icon ? 22 : 12);
        const slide = Math.min(1, t.t * 6) * Math.min(1, (t.life - t.t) * 4);
        const x = R.W - 4 - w * R.U.ease.outQuad(Math.max(0, slide));
        R.UI.window(ctx, x, y, w + 2, 16, { alpha: 0.92 });
        let tx = x + 6;
        if (t.icon) { R.UI.icon(ctx, t.icon, x + 5, y + 4); tx += 11; }
        R.Font.draw(ctx, t.text, tx, y + 2, t.color || R.THEME.text);
        y += 19;
      }
    },
  };

  // --------------------------------------------------------- laço principal
  const Engine = (R.Engine = {
    running: false,
    paused: false,
    last: 0,
    fps: 60,
    frames: 0,
    fpsT: 0,
    errorsThisSecond: 0,
    playTimeActive: false,
    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      document.addEventListener('visibilitychange', () => this.setPaused(document.hidden));
      window.addEventListener('blur', () => this.setPaused(true));
      window.addEventListener('focus', () => this.setPaused(document.hidden));
      window.addEventListener('pointerdown', () => { if (!document.hidden) this.setPaused(false); });
      requestAnimationFrame((t) => this.frame(t));
    },
    setPaused(p) {
      if (this.paused === p) return;
      this.paused = p;
      if (R.Input) R.Input.releaseAll();
      if (R.Audio) R.Audio.setSuspended(p);
    },
    frame(now) {
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (!(dt > 0)) dt = 0;
      dt = Math.min(dt, 0.05) * (this.timeScale || 1); // evita saltos grandes após travadas
      try {
        if (!this.paused) this.step(dt);
        this.draw();
      } catch (e) {
        this.errorsThisSecond++;
        R.Errors.report(e, 'quadro');
        if (this.errorsThisSecond > 30) {
          R.Errors.show('O jogo parou para evitar uma cascata de erros', String(e && e.message), true);
          this.running = false;
          return;
        }
      }
      this.fpsT += dt;
      this.frames++;
      if (this.fpsT >= 1) { this.fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0; this.errorsThisSecond = 0; }
      if (this.running) requestAnimationFrame((t) => this.frame(t));
    },
    step(dt) {
      R.Input.update(dt);
      if (this.playTimeActive && R.State && R.State.s) R.State.s.playTime += dt;
      R.Clock.update(dt);
      R.Screen.update(dt);
      R.Scenes.update(dt);
      R.Toasts.update(dt);
      if (R.Audio) R.Audio.update(dt);
      if (R.Debug) R.Debug.update(dt);
    },
    draw() {
      const ctx = R.Screen.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, R.W, R.H);
      R.Scenes.render(ctx);
      R.Toasts.render(ctx);
      R.Screen.drawOverlays(ctx);
      if (this.paused && R.Scenes.top() && R.Scenes.top().pausable !== false) {
        ctx.fillStyle = 'rgba(5,3,12,0.6)';
        ctx.fillRect(0, 0, R.W, R.H);
        R.UI.window(ctx, R.W / 2 - 60, R.H / 2 - 18, 120, 36);
        R.Font.draw(ctx, 'PAUSADO', R.W / 2, R.H / 2 - 12, R.THEME.accent, { align: 'center' });
        R.Font.draw(ctx, 'clique ou volte à aba', R.W / 2, R.H / 2, R.THEME.dim, { align: 'center' });
      }
      if (R.Debug) R.Debug.render(ctx);
      R.Screen.present();
    },
  });
  void Engine;
})();
