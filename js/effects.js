/* VAGALUME — efeitos visuais: partículas, clima ambiente, iluminação
 * (escuridão com fontes de luz) e números flutuantes. */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;

  // ----------------------------------------------------------- partículas
  class Particles {
    constructor(max = 300) { this.list = []; this.max = max; }
    add(p) {
      if (this.list.length >= this.max) this.list.shift();
      p.t = 0;
      p.life = p.life || 1;
      p.vx = p.vx || 0; p.vy = p.vy || 0;
      p.ax = p.ax || 0; p.ay = p.ay || 0;
      p.size = p.size || 1;
      this.list.push(p);
      return p;
    }
    burst(x, y, n, opts) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = U.rand(opts.speedMin || 20, opts.speed || 60);
        this.add({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0),
          ay: opts.gravity || 0, life: U.rand(0.4, opts.life || 0.9),
          color: Array.isArray(opts.color) ? U.choice(opts.color) : opts.color,
          size: opts.size || 1, shape: opts.shape, drag: opts.drag || 0,
        });
      }
    }
    update(dt) {
      for (const p of this.list) {
        p.t += dt;
        p.vx += p.ax * dt; p.vy += p.ay * dt;
        if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.update) p.update(p, dt);
      }
      this.list = this.list.filter((p) => p.t < p.life);
    }
    render(ctx, ox = 0, oy = 0) {
      for (const p of this.list) {
        const k = p.t / p.life;
        let a = p.fade === false ? 1 : 1 - k;
        if (p.fadeIn) a = Math.min(a, p.t / p.fadeIn);
        if (p.alpha) a *= p.alpha(p);
        if (a <= 0) continue;
        ctx.globalAlpha = Math.min(1, a);
        const x = Math.round(p.x - ox), y = Math.round(p.y - oy);
        ctx.fillStyle = p.color || '#fff';
        if (p.shape === 'glow') {
          ctx.globalAlpha = Math.min(1, a) * 0.35;
          ctx.fillRect(x - 1, y - 1, 3, 3);
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillRect(x, y, 1, 1);
        } else if (p.shape === 'star') {
          ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        } else if (p.shape === 'drop') {
          ctx.fillRect(x, y, 1, 3);
        } else if (p.shape === 'streak') {
          ctx.fillRect(x, y, 6, 1);
        } else if (p.shape === 'petal') {
          ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + 1, y + 1, 1, 1);
        } else if (p.shape === 'ring') {
          const r = Math.round(p.size + k * (p.grow || 10));
          ctx.fillRect(x - r, y, 1, 1); ctx.fillRect(x + r, y, 1, 1); ctx.fillRect(x, y - r, 1, 1); ctx.fillRect(x, y + r, 1, 1);
          ctx.fillRect(x - Math.round(r * 0.7), y - Math.round(r * 0.7), 1, 1); ctx.fillRect(x + Math.round(r * 0.7), y + Math.round(r * 0.7), 1, 1);
          ctx.fillRect(x + Math.round(r * 0.7), y - Math.round(r * 0.7), 1, 1); ctx.fillRect(x - Math.round(r * 0.7), y + Math.round(r * 0.7), 1, 1);
        } else if (p.text) {
          R.Font.draw(ctx, p.text, x, y, p.color, { outline: '#1a1224', align: 'center' });
        } else {
          const s = p.size | 0 || 1;
          ctx.fillRect(x, y, s, s);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  R.Particles = Particles;

  // ------------------------------------------------------- clima ambiente
  // gera partículas no espaço do mundo dentro da área visível
  class Ambient {
    constructor(kind) { this.kind = kind; this.ps = new Particles(160); this.acc = 0; this.t = 0; }
    update(dt, cam) {
      this.t += dt;
      const k = this.kind;
      if (!k) return;
      const reduce = R.Settings.get('reduceEffects');
      const rate = { fireflies: 3, petals: 6, dust: 3, bubbles: 4, wind: reduce ? 4 : 14, rain: reduce ? 30 : 90, snow: 10, embers: 5, static: 2, ash: 6 }[k] || 0;
      this.acc += dt * rate;
      while (this.acc >= 1) {
        this.acc -= 1;
        this.spawn(cam);
      }
      this.ps.update(dt);
    }
    spawn(cam) {
      const x = cam.x + Math.random() * R.W, y = cam.y + Math.random() * R.H;
      switch (this.kind) {
        case 'fireflies': {
          const ph = Math.random() * 6;
          this.ps.add({ x, y, life: U.rand(3, 6), shape: 'glow', color: U.choice(['#e8ff9a', '#fff6b0', '#c8ffb0']), fade: false, fadeIn: 0.8,
            alpha: (p) => 0.5 + 0.5 * Math.sin(p.t * 4 + ph) * Math.min(1, (p.life - p.t)),
            update: (p, dt) => { p.vx += (Math.random() - 0.5) * 30 * dt; p.vy += (Math.random() - 0.5) * 30 * dt; p.vx *= 0.98; p.vy *= 0.98; } });
          break;
        }
        case 'petals':
          this.ps.add({ x: x - 40, y: cam.y - 4, vx: U.rand(10, 22), vy: U.rand(14, 24), life: 7, shape: 'petal', color: U.choice(['#ffc6e0', '#ffffff', '#ffd0e4']), fade: false,
            update: (p) => { p.x += Math.sin(p.t * 3) * 0.3; } });
          break;
        case 'dust':
          this.ps.add({ x, y, vx: U.rand(-3, 3), vy: U.rand(-4, -1), life: U.rand(3, 5), color: '#fff6e0', alpha: () => 0.35, fadeIn: 1 });
          break;
        case 'bubbles':
          this.ps.add({ x, y: cam.y + R.H + 2, vy: U.rand(-18, -8), life: 8, shape: 'ring', size: 1, grow: 1, color: '#a8dcf8', alpha: () => 0.6, fade: false,
            update: (p) => { p.x += Math.sin(p.t * 2 + p.y) * 0.2; } });
          break;
        case 'wind':
          this.ps.add({ x: cam.x - 8, y, vx: U.rand(140, 220), vy: U.rand(-6, 6), life: 2.6, shape: 'streak', color: '#ffffff', alpha: () => 0.4 });
          break;
        case 'rain':
          this.ps.add({ x: x + 20, y: cam.y - 4, vx: -30, vy: U.rand(180, 240), life: 1.2, shape: 'drop', color: '#9fb8d8', alpha: () => 0.6 });
          break;
        case 'snow':
          this.ps.add({ x, y: cam.y - 2, vx: U.rand(-5, 5), vy: U.rand(10, 20), life: 12, color: '#ffffff', fade: false });
          break;
        case 'embers':
          this.ps.add({ x, y: cam.y + R.H, vx: U.rand(-6, 6), vy: U.rand(-24, -12), life: 6, shape: 'glow', color: U.choice(['#ffb347', '#ffd86b', '#ff8a5a']) });
          break;
        case 'ash':
          this.ps.add({ x, y: cam.y - 2, vx: U.rand(-8, 2), vy: U.rand(6, 14), life: 10, color: '#8a8698', fade: false, alpha: () => 0.7 });
          break;
        case 'static':
          this.ps.add({ x, y, life: 0.12, color: U.choice(['#ffffff', '#c8c8d0']), size: 1 });
          break;
        default: break;
      }
    }
    render(ctx, cam) { this.ps.render(ctx, cam.x, cam.y); }
  }
  R.Ambient = Ambient;

  // ------------------------------------------------------------- iluminação
  const Lighting = (R.Lighting = {
    canvas: null,
    ctx: null,
    ensure() {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = R.W; this.canvas.height = R.H;
        this.ctx = this.canvas.getContext('2d');
      }
    },
    // lights: [{x, y, r, color?}] em coordenadas de tela
    render(ctx, darkness, lights, tint = '10,6,24') {
      if (darkness <= 0.01) return;
      this.ensure();
      const g = this.ctx;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, R.W, R.H);
      g.fillStyle = 'rgba(' + tint + ',' + Math.min(1, darkness) + ')';
      g.fillRect(0, 0, R.W, R.H);
      g.globalCompositeOperation = 'destination-out';
      for (const l of lights) {
        if (l.r <= 0) continue;
        const grd = g.createRadialGradient(l.x, l.y, l.r * 0.15, l.x, l.y, l.r);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(0.55, 'rgba(0,0,0,0.75)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(l.x, l.y, l.r, 0, Math.PI * 2); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.canvas, 0, 0);
      // brilho quente aditivo
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        if (!l.glow) continue;
        const grd = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.6);
        grd.addColorStop(0, l.glow);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  });
  void Lighting;

  // ------------------------------------------- visões (imagem relâmpago)
  R.Vision = {
    kind: null, t: 0,
    show(kind, ms) { this.kind = kind; this.t = ms / 1000; this.cv = null; },
    draw(kind) {
      const c = document.createElement('canvas'); c.width = R.W; c.height = R.H;
      const g = c.getContext('2d');
      if (kind === 'teto') {
        g.fillStyle = '#d8dcd8'; g.fillRect(0, 0, R.W, R.H);
        g.fillStyle = '#b8bcb8';
        for (let x = 0; x < R.W; x += 48) g.fillRect(x, 0, 1, R.H);
        for (let y = 0; y < R.H; y += 48) g.fillRect(0, y, R.W, 1);
        g.fillStyle = '#ffffff'; g.fillRect(150, 70, 90, 20); g.fillStyle = '#f0f4ff'; g.fillRect(146, 66, 98, 28);
        g.fillStyle = '#ffffff'; g.fillRect(150, 70, 90, 20);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 40, R.H); g.fillRect(R.W - 40, 0, 40, R.H);
      } else if (kind === 'agua') {
        const gr = g.createLinearGradient(0, 0, 0, R.H); gr.addColorStop(0, '#9fd4ff'); gr.addColorStop(1, '#06142a');
        g.fillStyle = gr; g.fillRect(0, 0, R.W, R.H);
        g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 30; i++) g.fillRect((i * 53) % R.W, 20 + (i * 37) % 120, 2, 2);
      } else { g.fillStyle = '#fff'; g.fillRect(0, 0, R.W, R.H); }
      return c;
    },
    render(ctx) {
      if (this.t <= 0 || !this.kind) return;
      this.t -= 1 / 60;
      if (!this.cv) this.cv = this.draw(this.kind);
      ctx.globalAlpha = R.Settings.get('reduceEffects') ? 0.5 : 1;
      ctx.drawImage(this.cv, 0, 0);
      ctx.globalAlpha = 1;
    },
  };

  // ------------------------------------------------------ falhas de tela
  // pequenas anomalias (terror): deslocamento de faixas e ruído
  R.Glitch = {
    t: 0,
    strength: 0,
    trigger(ms = 300, strength = 1) {
      if (R.Settings.get('reduceEffects')) strength *= 0.3;
      this.t = ms / 1000; this.strength = strength;
    },
    update(dt) { if (this.t > 0) this.t -= dt; },
    render(ctx) {
      if (this.t <= 0) return;
      const src = R.Screen.canvas;
      const n = Math.round(4 * this.strength);
      for (let i = 0; i < n; i++) {
        const y = (Math.random() * R.H) | 0, h = 2 + ((Math.random() * 10) | 0);
        const dx = Math.round((Math.random() - 0.5) * 16 * this.strength);
        ctx.drawImage(src, 0, y, R.W, h, dx, y, R.W, h);
      }
      ctx.globalAlpha = 0.08 * this.strength;
      for (let i = 0; i < 60 * this.strength; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#000';
        ctx.fillRect((Math.random() * R.W) | 0, (Math.random() * R.H) | 0, 2, 1);
      }
      ctx.globalAlpha = 1;
    },
  };
})();
