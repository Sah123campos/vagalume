/* VAGALUME — utilitário de pixel art procedural.
 * Desenha pixel a pixel em um buffer RGBA, com contorno automático,
 * sombreamento e composição em camadas. Toda a arte do jogo nasce aqui. */
(function () {
  'use strict';
  const R = window.RPG;

  const cache = new Map();
  function col(c) {
    if (c === null || c === undefined) return null;
    if (Array.isArray(c)) return c;
    let v = cache.get(c);
    if (v) return v;
    let s = c.replace('#', '');
    if (s.length === 3) s = s.split('').map((h) => h + h).join('');
    const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255;
    v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), a];
    cache.set(c, v);
    return v;
  }
  // clareia (+) ou escurece (-) uma cor em fração 0..1
  function shade(c, amt) {
    const v = col(c);
    const f = (x) => Math.round(amt >= 0 ? x + (255 - x) * amt : x * (1 + amt));
    return [f(v[0]), f(v[1]), f(v[2]), v[3]];
  }
  function mix(a, b, t) {
    const x = col(a), y = col(b);
    return [0, 1, 2, 3].map((i) => Math.round(x[i] + (y[i] - x[i]) * t));
  }
  function toHex(c) {
    const v = col(c);
    return '#' + v.slice(0, 3).map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  class PA {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.d = new Uint8ClampedArray(w * h * 4);
    }
    idx(x, y) { return (y * this.w + x) * 4; }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    set(x, y, c) {
      x |= 0; y |= 0;
      if (!this.inb(x, y)) return;
      const v = col(c);
      if (!v) return;
      const i = this.idx(x, y);
      if (v[3] === 255) {
        this.d[i] = v[0]; this.d[i + 1] = v[1]; this.d[i + 2] = v[2]; this.d[i + 3] = 255;
      } else if (v[3] > 0) {
        const a = v[3] / 255, d = this.d;
        d[i] = d[i] * (1 - a) + v[0] * a;
        d[i + 1] = d[i + 1] * (1 - a) + v[1] * a;
        d[i + 2] = d[i + 2] * (1 - a) + v[2] * a;
        d[i + 3] = Math.min(255, d[i + 3] + v[3]);
      }
    }
    clear(x, y) { if (this.inb(x, y)) this.d[this.idx(x, y) + 3] = 0; }
    alpha(x, y) { return this.inb(x, y) ? this.d[this.idx(x, y) + 3] : 0; }
    get(x, y) {
      if (!this.inb(x, y)) return null;
      const i = this.idx(x, y);
      return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
    }
    fill(c) { this.rect(0, 0, this.w, this.h, c); return this; }
    rect(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
      return this;
    }
    hline(x0, x1, y, c) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c); return this; }
    vline(x, y0, y1, c) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c); return this; }
    // elipse preenchida com centro em ponto flutuante (pixel-exata)
    ellipse(cx, cy, rx, ry, c) {
      const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
      const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.set(x, y, c);
        }
      return this;
    }
    circle(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
    ring(cx, cy, r, c, th = 1) {
      for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
        for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d <= r && d > r - th) this.set(x, y, c);
        }
      return this;
    }
    line(x0, y0, x1, y1, c) {
      x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.set(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    // polígono preenchido (scanline)
    poly(pts, c) {
      let minY = Infinity, maxY = -Infinity;
      for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        const yc = y + 0.5;
        const xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
            xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
          }
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2)
          for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c);
      }
      return this;
    }
    // desenha padrão de string: linhas, cada char mapeado em pal
    pattern(x, y, rows, pal) {
      rows.forEach((r, j) => {
        for (let i = 0; i < r.length; i++) {
          const k = r[i];
          if (k !== '.' && k !== ' ' && pal[k]) this.set(x + i, y + j, pal[k]);
        }
      });
      return this;
    }
    // contorno externo: pixels transparentes vizinhos (4-dir) a opacos
    outline(c, diag = false) {
      const v = col(c);
      const mark = [];
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (this.alpha(x, y) > 0) continue;
          if (this.alpha(x - 1, y) > 100 || this.alpha(x + 1, y) > 100 || this.alpha(x, y - 1) > 100 || this.alpha(x, y + 1) > 100 ||
            (diag && (this.alpha(x - 1, y - 1) > 100 || this.alpha(x + 1, y + 1) > 100 || this.alpha(x + 1, y - 1) > 100 || this.alpha(x - 1, y + 1) > 100)))
            mark.push(x, y);
        }
      for (let i = 0; i < mark.length; i += 2) this.set(mark[i], mark[i + 1], v);
      return this;
    }
    // escurece a borda inferior/direita dos pixels opacos (volume)
    shadeEdges(amt = -0.18, dirs = ['down']) {
      const out = [];
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (this.alpha(x, y) < 200) continue;
          let edge = false;
          for (const d of dirs) {
            const [dx, dy] = R.U.dirVec[d];
            if (this.alpha(x + dx, y + dy) < 100) edge = true;
          }
          if (edge) out.push(x, y);
        }
      for (let i = 0; i < out.length; i += 2) {
        const c = this.get(out[i], out[i + 1]);
        this.set(out[i], out[i + 1], shade(c, amt));
      }
      return this;
    }
    // compõe outro PA por cima
    draw(o, dx = 0, dy = 0) {
      for (let y = 0; y < o.h; y++)
        for (let x = 0; x < o.w; x++) {
          const i = o.idx(x, y);
          if (o.d[i + 3] === 0) continue;
          this.set(x + dx, y + dy, [o.d[i], o.d[i + 1], o.d[i + 2], o.d[i + 3]]);
        }
      return this;
    }
    // substitui cor
    recolor(from, to) {
      const f = col(from), t = col(to);
      for (let i = 0; i < this.d.length; i += 4)
        if (this.d[i + 3] && this.d[i] === f[0] && this.d[i + 1] === f[1] && this.d[i + 2] === f[2]) {
          this.d[i] = t[0]; this.d[i + 1] = t[1]; this.d[i + 2] = t[2];
        }
      return this;
    }
    // aplica função a cada pixel opaco
    map(fn) {
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const i = this.idx(x, y);
          if (!this.d[i + 3]) continue;
          const r = fn([this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]], x, y);
          if (r) { this.d[i] = r[0]; this.d[i + 1] = r[1]; this.d[i + 2] = r[2]; this.d[i + 3] = r[3] === undefined ? this.d[i + 3] : r[3]; }
        }
      return this;
    }
    flipX() {
      const o = new PA(this.w, this.h);
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const i = this.idx(x, y), j = o.idx(this.w - 1 - x, y);
          o.d[j] = this.d[i]; o.d[j + 1] = this.d[i + 1]; o.d[j + 2] = this.d[i + 2]; o.d[j + 3] = this.d[i + 3];
        }
      return o;
    }
    copy() {
      const o = new PA(this.w, this.h);
      o.d.set(this.d);
      return o;
    }
    // ruído pontilhado com semente (texturas)
    speckle(x, y, w, h, c, density, rnd) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rnd() < density) this.set(x + i, y + j, c);
      return this;
    }
    grayscale(amount = 1) {
      return this.map((c) => {
        const g = c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;
        return [c[0] + (g - c[0]) * amount, c[1] + (g - c[1]) * amount, c[2] + (g - c[2]) * amount];
      });
    }
    toCanvas() {
      const cv = document.createElement('canvas');
      cv.width = this.w;
      cv.height = this.h;
      if (this.w && this.h) {
        const g = cv.getContext('2d');
        const img = g.createImageData(this.w, this.h);
        img.data.set(this.d);
        g.putImageData(img, 0, 0);
      }
      return cv;
    }
  }

  R.Pixel = { PA, col, shade, mix, toHex };
})();
