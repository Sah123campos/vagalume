/* VAGALUME — fonte bitmap proporcional original (com acentos do português).
 * Cada glifo: linhas separadas por "|", "#" = pixel aceso.
 * Linhas 0-6 ficam acima da linha de base; 7-8 são descendentes.
 * Duas linhas extras no topo guardam acentos de maiúsculas. Altura de linha: 12px. */
(function () {
  'use strict';
  const R = window.RPG;

  const G = {
    A: '.##.|#..#|#..#|####|#..#|#..#|#..#',
    B: '###.|#..#|#..#|###.|#..#|#..#|###.',
    C: '.###|#...|#...|#...|#...|#...|.###',
    D: '###.|#..#|#..#|#..#|#..#|#..#|###.',
    E: '####|#...|#...|###.|#...|#...|####',
    F: '####|#...|#...|###.|#...|#...|#...',
    G: '.###|#...|#...|#.##|#..#|#..#|.###',
    H: '#..#|#..#|#..#|####|#..#|#..#|#..#',
    I: '###|.#.|.#.|.#.|.#.|.#.|###',
    J: '..##|...#|...#|...#|#..#|#..#|.##.',
    K: '#..#|#..#|#.#.|##..|#.#.|#..#|#..#',
    L: '#...|#...|#...|#...|#...|#...|####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
    N: '#..#|##.#|##.#|#.##|#.##|#..#|#..#',
    O: '.##.|#..#|#..#|#..#|#..#|#..#|.##.',
    P: '###.|#..#|#..#|###.|#...|#...|#...',
    Q: '.##.|#..#|#..#|#..#|#..#|#.#.|.#.#',
    R: '###.|#..#|#..#|###.|#.#.|#..#|#..#',
    S: '.###|#...|#...|.##.|...#|...#|###.',
    T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    U: '#..#|#..#|#..#|#..#|#..#|#..#|.##.',
    V: '#...#|#...#|#...#|.#.#.|.#.#.|.#.#.|..#..',
    W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
    X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    a: '....|....|.##.|...#|.###|#..#|.###',
    b: '#...|#...|###.|#..#|#..#|#..#|###.',
    c: '...|...|.##|#..|#..|#..|.##',
    d: '...#|...#|.###|#..#|#..#|#..#|.###',
    e: '....|....|.##.|#..#|####|#...|.###',
    f: '.##|#..|###|#..|#..|#..|#..',
    g: '....|....|.###|#..#|#..#|#..#|.###|...#|.##.',
    h: '#...|#...|###.|#..#|#..#|#..#|#..#',
    i: '#|.|#|#|#|#|#',
    j: '.#|..|.#|.#|.#|.#|.#|.#|#.',
    k: '#...|#...|#..#|#.#.|##..|#.#.|#..#',
    l: '#.|#.|#.|#.|#.|#.|.#',
    m: '.....|.....|####.|#.#.#|#.#.#|#.#.#|#.#.#',
    n: '....|....|###.|#..#|#..#|#..#|#..#',
    o: '....|....|.##.|#..#|#..#|#..#|.##.',
    p: '....|....|###.|#..#|#..#|#..#|###.|#...|#...',
    q: '....|....|.###|#..#|#..#|#..#|.###|...#|...#',
    r: '....|....|#.##|##..|#...|#...|#...',
    s: '....|....|.###|#...|.##.|...#|###.',
    t: '.#.|.#.|###|.#.|.#.|.#.|..#',
    u: '....|....|#..#|#..#|#..#|#..#|.###',
    v: '.....|.....|#...#|#...#|.#.#.|.#.#.|..#..',
    w: '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.',
    x: '....|....|#..#|#..#|.##.|#..#|#..#',
    y: '....|....|#..#|#..#|#..#|#..#|.###|...#|.##.',
    z: '....|....|####|...#|.##.|#...|####',
    'ı': '.|.|#|#|#|#|#', // i sem pingo (base para í)
    0: '.##.|#..#|#.##|##.#|#..#|#..#|.##.',
    1: '.#.|##.|.#.|.#.|.#.|.#.|###',
    2: '.##.|#..#|...#|..#.|.#..|#...|####',
    3: '###.|...#|...#|.##.|...#|...#|###.',
    4: '#..#|#..#|#..#|####|...#|...#|...#',
    5: '####|#...|#...|###.|...#|...#|###.',
    6: '.##.|#...|#...|###.|#..#|#..#|.##.',
    7: '####|...#|...#|..#.|.#..|.#..|.#..',
    8: '.##.|#..#|#..#|.##.|#..#|#..#|.##.',
    9: '.##.|#..#|#..#|.###|...#|...#|.##.',
    '.': '.|.|.|.|.|.|#',
    ',': '..|..|..|..|..|..|.#|#.',
    '!': '#|#|#|#|#|.|#',
    '?': '.##.|#..#|...#|..#.|.#..|....|.#..',
    ':': '.|.|.|#|.|.|#',
    ';': '..|..|..|.#|..|..|.#|#.',
    '-': '...|...|...|###',
    '+': '...|...|.#.|###|.#.',
    "'": '#|#',
    '"': '#.#|#.#',
    '(': '.#|#.|#.|#.|#.|#.|.#',
    ')': '#.|.#|.#|.#|.#|.#|#.',
    '/': '..#|..#|.#.|.#.|.#.|#..|#..',
    '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##',
    '*': '...|#.#|.#.|#.#',
    '=': '...|...|###|...|###',
    '<': '...|..#|.#.|#..|.#.|..#',
    '>': '...|#..|.#.|..#|.#.|#..',
    '#': '.....|.#.#.|#####|.#.#.|#####|.#.#.',
    '&': '.#..|#.#.|#.#.|.#..|#.##|#..#|.##.',
    _: '....|....|....|....|....|....|....|####',
    '~': '....|....|.#.#|#.#.',
    '[': '##|#.|#.|#.|#.|#.|##',
    ']': '##|.#|.#|.#|.#|.#|##',
    '…': '.....|.....|.....|.....|.....|.....|#.#.#', // …
    '—': '.....|.....|.....|#####', // —
    '–': '....|....|....|####', // –
    '°': '.#.|#.#|.#.', // °
    '♥': '.#.#.|#####|#####|.###.|..#..', // ♥
    '★': '..#..|..#..|#####|.###.|.#.#.', // ★
    '♪': '..##|..#.|..#.|..#.|###.|###.', // ♪
    '→': '.....|..#..|...#.|#####|...#.|..#..', // →
    '←': '.....|..#..|.#...|#####|.#...|..#..', // ←
    '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..', // ↑
    '↓': '..#..|..#..|..#..|#.#.#|.###.|..#..', // ↓
    '●': '...|.#.|###|.#.', // ●
    '▶': '#..|##.|###|##.|#..', // ▶
    '▼': '.....|.....|#####|.###.|..#..', // ▼
    $: '.#.|.##|#..|.#.|..#|##.|.#.',
  };

  // acentos (2 linhas). Minúsculas: linhas 0-1; maiúsculas: linhas -2/-1
  const ACC = {
    acute: ['.#', '#.'],
    grave: ['#.', '.#'],
    circ: ['.#.', '#.#'],
    tilde: ['.#.#', '#.#.'],
    diaer: ['', '#.#'],
  };
  const COMPOSED = {
    'á': ['a', 'acute'], 'à': ['a', 'grave'], 'â': ['a', 'circ'], 'ã': ['a', 'tilde'], 'ä': ['a', 'diaer'],
    'é': ['e', 'acute'], 'è': ['e', 'grave'], 'ê': ['e', 'circ'], 'ë': ['e', 'diaer'],
    'í': ['ı', 'acute'], 'ì': ['ı', 'grave'], 'î': ['ı', 'circ'], 'ï': ['ı', 'diaer'],
    'ó': ['o', 'acute'], 'ò': ['o', 'grave'], 'ô': ['o', 'circ'], 'õ': ['o', 'tilde'], 'ö': ['o', 'diaer'],
    'ú': ['u', 'acute'], 'ù': ['u', 'grave'], 'û': ['u', 'circ'], 'ü': ['u', 'diaer'],
    'ñ': ['n', 'tilde'],
    'Á': ['A', 'acute'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ã': ['A', 'tilde'],
    'É': ['E', 'acute'], 'Ê': ['E', 'circ'], 'È': ['E', 'grave'],
    'Í': ['I', 'acute'], 'Ó': ['O', 'acute'], 'Ô': ['O', 'circ'], 'Õ': ['O', 'tilde'],
    'Ú': ['U', 'acute'], 'Ü': ['U', 'diaer'], 'Ñ': ['N', 'tilde'],
  };
  const ALIAS = { '“': '"', '”': '"', '‘': "'", '’': "'", '«': '"', '»': '"', ' ': ' ' };

  const CELL_H = 11; // 2 (acento maiúsculo) + 9
  const LINE_H = 12;

  // glyph -> {w, px:[[x,y]...]} em coordenadas da célula (y 0..10)
  const glyphs = {};
  function parse(str) {
    const rows = str.split('|');
    let w = 0;
    rows.forEach((r) => (w = Math.max(w, r.length)));
    const px = [];
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push([x, y + 2]);
    });
    return { w, px };
  }
  for (const k in G) glyphs[k] = parse(G[k]);
  glyphs[' '] = { w: 3, px: [] };

  for (const ch in COMPOSED) {
    const [baseKey, accKey] = COMPOSED[ch];
    const base = glyphs[baseKey];
    const acc = ACC[accKey];
    const aw = Math.max(acc[0].length, acc[1].length);
    const W = Math.max(base.w, aw);
    const bx = Math.floor((W - base.w) / 2);
    const ax = Math.floor((W - aw) / 2);
    const upper = baseKey === baseKey.toUpperCase() && baseKey !== 'ı';
    const ay = upper ? 0 : 2;
    const px = base.px.map(([x, y]) => [x + bx, y]);
    acc.forEach((row, ry) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') px.push([x + ax, ay + ry]);
    });
    glyphs[ch] = { w: W, px };
  }
  // cedilha
  {
    const c = glyphs.c;
    glyphs['ç'] = { w: c.w, px: c.px.concat([[1, 9], [0, 10], [1, 10]]) };
    const C = glyphs.C;
    glyphs['Ç'] = { w: C.w, px: C.px.concat([[1, 9], [2, 9], [1, 10]]) };
  }

  // ------------------------------------------------------------ atlas de glifos
  const chars = Object.keys(glyphs);
  let atlas = null;
  const pos = {};
  function buildAtlas() {
    let x = 0;
    for (const ch of chars) { pos[ch] = x; x += glyphs[ch].w + 1; }
    atlas = document.createElement('canvas');
    atlas.width = x;
    atlas.height = CELL_H;
    const g = atlas.getContext('2d');
    g.fillStyle = '#fff';
    for (const ch of chars) {
      const ox = pos[ch];
      for (const [px, py] of glyphs[ch].px) g.fillRect(ox + px, py, 1, 1);
    }
  }
  const tinted = new Map();
  function tint(color) {
    let c = tinted.get(color);
    if (c) return c;
    if (!atlas) buildAtlas();
    c = document.createElement('canvas');
    c.width = atlas.width;
    c.height = atlas.height;
    const g = c.getContext('2d');
    g.drawImage(atlas, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tinted.set(color, c);
    return c;
  }

  function norm(ch) {
    if (glyphs[ch]) return ch;
    if (ALIAS[ch]) return ALIAS[ch];
    const p = R.U.plain(ch);
    if (glyphs[p]) return p;
    return '?';
  }

  const Font = (R.Font = {
    LINE_H,
    CELL_H,
    glyph(ch) { return glyphs[norm(ch)]; },
    charWidth(ch) {
      if (ch === '\n') return 0;
      return glyphs[norm(ch)].w;
    },
    measure(text) {
      let w = 0, max = 0;
      for (const ch of String(text)) {
        if (ch === '\n') { max = Math.max(max, w - 1); w = 0; continue; }
        w += this.charWidth(ch) + 1;
      }
      return Math.max(max, w - 1, 0);
    },
    // desenha um caractere; retorna avanço horizontal
    drawChar(ctx, ch, x, y, color, scale = 1) {
      const k = norm(ch);
      const gl = glyphs[k];
      if (k !== ' ') {
        const src = tint(color);
        ctx.drawImage(src, pos[k], 0, gl.w, CELL_H, Math.round(x), Math.round(y), gl.w * scale, CELL_H * scale);
      }
      return (gl.w + 1) * scale;
    },
    /* desenha texto. opts: {shadow, outline, scale, align:'left'|'center'|'right', alpha} */
    draw(ctx, text, x, y, color = '#fff', opts = {}) {
      text = String(text);
      const scale = opts.scale || 1;
      let w = this.measure(text) * scale;
      if (opts.align === 'center') x -= Math.floor(w / 2);
      else if (opts.align === 'right') x -= w;
      if (opts.alpha !== undefined) { ctx.save(); ctx.globalAlpha = opts.alpha; }
      if (opts.outline) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]])
          this._line(ctx, text, x + dx * scale, y + dy * scale, opts.outline, scale);
      } else if (opts.shadow) {
        this._line(ctx, text, x + scale, y + scale, opts.shadow, scale);
      }
      this._line(ctx, text, x, y, color, scale);
      if (opts.alpha !== undefined) ctx.restore();
      return w;
    },
    _line(ctx, text, x, y, color, scale) {
      let cx = x, cy = y;
      for (const ch of text) {
        if (ch === '\n') { cx = x; cy += LINE_H * scale; continue; }
        cx += this.drawChar(ctx, ch, cx, cy, color, scale);
      }
    },
    // quebra em linhas que cabem em maxW
    wrap(text, maxW) {
      const out = [];
      for (const para of String(text).split('\n')) {
        const words = para.split(' ');
        let line = '';
        for (const word of words) {
          const test = line ? line + ' ' + word : word;
          if (this.measure(test) <= maxW || !line) line = test;
          else { out.push(line); line = word; }
        }
        out.push(line);
      }
      return out;
    },
    hasGlyph: (ch) => !!glyphs[ch] || !!ALIAS[ch],
  });
  void Font;
})();
