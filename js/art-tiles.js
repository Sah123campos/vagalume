/* VAGALUME — arte procedural de cenário: tiles 16x16 por tema (região),
 * auto-bordas (água, caminhos, paredes, penhascos), árvores, construções e móveis. */
(function () {
  'use strict';
  const R = window.RPG;
  const { PA, shade, col, mix } = R.Pixel;
  const OUT = '#2a1d33';
  const T = 16;

  // ------------------------------------------------------------------ paletas
  const THEMES = {
    vila: {
      grass: '#9bd68a', grass2: '#8ccb7c', grassDk: '#72b468', tuft: '#b9e8a4',
      path: '#ead7a8', path2: '#dcc590', pathDk: '#c9ad78',
      stone: '#d6cfe0', stone2: '#c0b8d0', stoneDk: '#a49cb8',
      water: '#7cc0ec', water2: '#a8dcf8', waterDk: '#5aa2d8', foam: '#e8f6ff',
      cliff: '#b08a68', cliffDk: '#8a6a50',
      leaf: '#5fae6a', leaf2: '#7cc47a', leafDk: '#468a55', trunk: '#8a5f42',
      flowers: ['#ffb3d1', '#fff1a8', '#b8d8ff', '#ffffff'], sand: '#f2e2b0', tree: 'round',
    },
    campos: {
      grass: '#c4ecd0', grass2: '#b4e2c4', grassDk: '#9cd2b0', tuft: '#ffd0e4',
      path: '#fbe3ef', path2: '#f4d0e2', pathDk: '#e4b8cf',
      stone: '#efe4f8', stone2: '#e0d0f0', stoneDk: '#c8b4e0',
      water: '#c3b0f2', water2: '#ddd0ff', waterDk: '#a690e0', foam: '#f4eeff',
      cliff: '#e8b8d0', cliffDk: '#c898b4',
      leaf: '#ff9fc8', leaf2: '#ffc6e0', leafDk: '#e47aa8', trunk: '#f6f0f4',
      flowers: ['#fff1a8', '#9ad4ff', '#ffffff', '#c8a8ff'], sand: '#fff0d8', tree: 'candy',
    },
    floresta: {
      grass: '#5f9a6a', grass2: '#548e60', grassDk: '#447a52', tuft: '#79b47e',
      path: '#9a8a68', path2: '#8a7a5a', pathDk: '#76684c',
      stone: '#8a9488', stone2: '#7a8478', stoneDk: '#646e62',
      water: '#4f8ab0', water2: '#6ea8c8', waterDk: '#3a6a90', foam: '#a8d0e0',
      cliff: '#6a6a54', cliffDk: '#4e4e3e',
      leaf: '#2f7a5e', leaf2: '#3f9470', leafDk: '#225a48', trunk: '#5a4030',
      flowers: ['#e8f0a0', '#a0e8e0', '#f0a0c8'], sand: '#b8a880', tree: 'pine',
    },
    gruta: {
      grass: '#3e4868', grass2: '#38425f', grassDk: '#2c3552', tuft: '#4a5678',
      path: '#4a5272', path2: '#424a68', pathDk: '#363e5a',
      stone: '#566082', stone2: '#4c5676', stoneDk: '#3c4462',
      water: '#2f6a9a', water2: '#4a8ac0', waterDk: '#204a78', foam: '#7ab8e0',
      cliff: '#2c3554', cliffDk: '#1c2238',
      leaf: '#3a7a8a', leaf2: '#4a9aa8', leafDk: '#2a5a6a', trunk: '#3a3448',
      flowers: ['#7ae0f0', '#a0f0d0', '#c0a8ff'], sand: '#5a6280', tree: 'crystal',
    },
    bairro: {
      grass: '#8e9a90', grass2: '#848f86', grassDk: '#737d75', tuft: '#a0aaa2',
      path: '#b4b4b8', path2: '#a8a8ad', pathDk: '#909096',
      stone: '#5e6068', stone2: '#56585f', stoneDk: '#4a4c52',
      water: '#6a7a88', water2: '#7a8a98', waterDk: '#5a6a78', foam: '#9aa8b4',
      cliff: '#6e6a70', cliffDk: '#56525a',
      leaf: '#6a7a6e', leaf2: '#7a8a7e', leafDk: '#525e56', trunk: '#4a4440',
      flowers: ['#c8c8c8', '#a8a8b0'], sand: '#a0a0a0', tree: 'bare',
    },
    rochedo: {
      grass: '#a4bc84', grass2: '#98b078', grassDk: '#7e9a66', tuft: '#c0d4a0',
      path: '#d4c09a', path2: '#c4b08a', pathDk: '#ae9a76',
      stone: '#a8b0bc', stone2: '#98a0ac', stoneDk: '#7e8692',
      water: '#4a7ab0', water2: '#6a9ad0', waterDk: '#36609a', foam: '#d8ecff',
      cliff: '#8a96a8', cliffDk: '#6a7486',
      leaf: '#6a9a6a', leaf2: '#86b080', leafDk: '#4e7a52', trunk: '#6a5040',
      flowers: ['#ffffff', '#f0e0a0'], sand: '#e8dcb8', tree: 'wind',
    },
    sonho: { // vazio branco do Esquecimento / cenas especiais
      grass: '#ece8f4', grass2: '#e4e0ee', grassDk: '#d4cfe2', tuft: '#f8f6fc',
      path: '#ffffff', path2: '#f4f2f8', pathDk: '#e0dcea',
      stone: '#d8d4e4', stone2: '#ccc8dc', stoneDk: '#b8b2cc',
      water: '#c8d8f0', water2: '#dce8f8', waterDk: '#b0c4e4', foam: '#ffffff',
      cliff: '#c8c4d8', cliffDk: '#aaa4c0',
      leaf: '#d0d0e0', leaf2: '#e0e0ee', leafDk: '#b8b8cc', trunk: '#a8a4b8',
      flowers: ['#ffffff'], sand: '#f0f0f0', tree: 'round',
    },
  };
  // estilos de interior (piso / parede)
  const INTERIORS = {
    casa: { floor: '#c89a6a', floor2: '#b8895a', floorDk: '#9a7048', wallFace: '#f2dcc0', wallFace2: '#e6ccac', wallTop: '#3a2c3a', trim: '#a8754a', pattern: 'stripes' },
    arvore: { floor: '#b88a58', floor2: '#a87a4c', floorDk: '#8a6038', wallFace: '#c49a68', wallFace2: '#b08858', wallTop: '#3a2a26', trim: '#7a5236', pattern: 'planks' },
    padaria: { floor: '#e8d0b0', floor2: '#f4e4cc', floorDk: '#c8a888', wallFace: '#ffd4c4', wallFace2: '#f6c2b0', wallTop: '#4a2a30', trim: '#c86a5a', pattern: 'dots', floorStyle: 'checker' },
    biblioteca: { floor: '#7a5a7a', floor2: '#6a4a6a', floorDk: '#563a56', wallFace: '#bcc4e0', wallFace2: '#a8b0d0', wallTop: '#22203a', trim: '#5a5a8a', pattern: 'panels', floorStyle: 'carpet' },
    oficina: { floor: '#9aa0a8', floor2: '#8a9098', floorDk: '#70767e', wallFace: '#b08a68', wallFace2: '#9a7656', wallTop: '#2a2a32', trim: '#5a5a62', pattern: 'planks', floorStyle: 'metal' },
    pousada: { floor: '#c8a8d8', floor2: '#b898c8', floorDk: '#9a7aaa', wallFace: '#f0e4f8', wallFace2: '#e0d0ee', wallTop: '#30263e', trim: '#9a7ab8', pattern: 'stripes', floorStyle: 'carpet' },
    prefeitura: { floor: '#d8d0c0', floor2: '#c8c0b0', floorDk: '#a8a090', wallFace: '#f4ecd8', wallFace2: '#e8dcc4', wallTop: '#3a2a2a', trim: '#b83a4a', pattern: 'panels', floorStyle: 'checker' },
    abandonada: { floor: '#6a5a50', floor2: '#5e4e46', floorDk: '#4a3c36', wallFace: '#8a7a70', wallFace2: '#7a6a62', wallTop: '#1a1418', trim: '#4a3a34', pattern: 'peeling' },
    bairro: { floor: '#9a9088', floor2: '#8e847c', floorDk: '#766c66', wallFace: '#c8c4bc', wallFace2: '#b8b4ac', wallTop: '#26242a', trim: '#7a7672', pattern: 'stripes' },
    quarto_real: { floor: '#a88a6a', floor2: '#987a5c', floorDk: '#7a6048', wallFace: '#a8c0d8', wallFace2: '#98b0c8', wallTop: '#24242e', trim: '#6a7a8a', pattern: 'plain' },
    hospital: { floor: '#dfe4dc', floor2: '#d2d8d0', floorDk: '#b8beb6', wallFace: '#cfdcd4', wallFace2: '#c0cec6', wallTop: '#2a3230', trim: '#8aa098', pattern: 'plain', floorStyle: 'checker' },
    farol: { floor: '#c8b8a0', floor2: '#b8a890', floorDk: '#9a8a74', wallFace: '#e8dcc8', wallFace2: '#d8ccb6', wallTop: '#2a2430', trim: '#b8484a', pattern: 'bricks' },
    gruta: { floor: '#3e4868', floor2: '#38425f', floorDk: '#2c3552', wallFace: '#2c3554', wallFace2: '#283050', wallTop: '#10141f', trim: '#1c2238', pattern: 'rock' },
    floresta: { floor: '#5f9a6a', floor2: '#548e60', floorDk: '#447a52', wallFace: '#3a5a48', wallFace2: '#30503e', wallTop: '#14261e', trim: '#22402e', pattern: 'rock' },
  };

  R.Tiles = R.Tiles || {};
  R.Tiles.THEMES = THEMES;
  R.Tiles.INTERIORS = INTERIORS;
  const th = (n) => THEMES[n] || THEMES.vila;
  const it = (n) => INTERIORS[n] || INTERIORS.casa;

  // classes de tile para auto-borda
  const WATERISH = { water: 1, deepwater: 1 };
  const PATHISH = { path: 1, stone: 1, bridge: 0 };
  const WALLISH = { wall: 1, cliff: 1, void: 0 };

  // ------------------------------------------------------------- cache geral
  const cache = new Map();
  function cached(key, fn) {
    let c = cache.get(key);
    if (!c) { c = fn(); cache.set(key, c); }
    return c;
  }

  // --------------------------------------------------------- tiles de chão
  function grassTile(t, v, p, flowers) {
    const r = R.U.rng(v * 977 + 13);
    p.fill(t.grass);
    for (let i = 0; i < 10; i++) p.set((r() * 16) | 0, (r() * 16) | 0, t.grass2);
    for (let i = 0; i < 3; i++) {
      const x = (r() * 14) | 0, y = 2 + ((r() * 13) | 0);
      p.set(x, y, t.tuft); p.set(x + 1, y - 1, t.tuft); p.set(x + 2, y, t.tuft);
    }
    if (r() < 0.4) { const x = (r() * 14) | 0, y = (r() * 14) | 0; p.set(x, y, t.grassDk); p.set(x + 1, y, t.grassDk); }
    if (flowers) {
      const n = 2 + ((r() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const x = 1 + ((r() * 13) | 0), y = 1 + ((r() * 13) | 0);
        const fc = t.flowers[(r() * t.flowers.length) | 0];
        p.set(x, y - 1, fc); p.set(x - 1, y, fc); p.set(x + 1, y, fc); p.set(x, y + 1, fc);
        p.set(x, y, '#fff6a0');
      }
    }
  }
  function pathTile(t, v, mask, p, kind) {
    const r = R.U.rng(v * 331 + 7);
    const base = kind === 'stone' ? t.stone : t.path;
    p.fill(base);
    if (kind === 'stone') {
      // pedras do calçamento
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          const ox = (j % 2) * 2;
          const x = i * 4 + ox, y = j * 4;
          p.rect(x, y, 3, 3, r() < 0.5 ? t.stone : t.stone2);
          p.hline(x, x + 2, y + 3, t.stoneDk);
          p.set(x + 3, y + 1, t.stoneDk);
        }
    } else {
      for (let i = 0; i < 8; i++) p.set((r() * 16) | 0, (r() * 16) | 0, t.path2);
      for (let i = 0; i < 2; i++) { const x = (r() * 15) | 0, y = (r() * 15) | 0; p.set(x, y, t.pathDk); p.set(x + 1, y, t.path2); }
    }
    // bordas com grama (bits: 1 cima, 2 dir, 4 baixo, 8 esq = vizinho também é caminho)
    const g = t.grass, gd = t.grassDk;
    const edge = (fn) => { for (let k = 0; k < 16; k++) fn(k, (k * 7 + v) % 3 === 0 ? 2 : 1); };
    if (!(mask & 1)) edge((k, d) => { for (let y = 0; y < d; y++) p.set(k, y, g); p.set(k, d, gd); });
    if (!(mask & 4)) edge((k, d) => { for (let y = 0; y < d; y++) p.set(k, 15 - y, g); });
    if (!(mask & 8)) edge((k, d) => { for (let x = 0; x < d; x++) p.set(x, k, g); p.set(d, k, gd); });
    if (!(mask & 2)) edge((k, d) => { for (let x = 0; x < d; x++) p.set(15 - x, k, g); });
  }
  function waterTile(t, v, mask, frame, p) {
    p.fill(t.water);
    const r = R.U.rng(v * 53 + 3);
    for (let i = 0; i < 3; i++) {
      const y = ((r() * 14) | 0) + 1;
      const x = ((r() * 10) + frame * 2) % 16 | 0;
      p.hline(x, Math.min(15, x + 3), y, t.water2);
    }
    if (frame % 2) p.set(((v * 5) % 14) + 1, ((v * 3) % 12) + 2, t.foam);
    // margens
    const land = t.grass;
    if (!(mask & 1)) { p.hline(0, 15, 0, land); p.hline(0, 15, 1, t.foam); p.hline(0, 15, 2, t.water2); }
    if (!(mask & 4)) { p.hline(0, 15, 15, t.waterDk); }
    if (!(mask & 8)) { p.vline(0, 0, 15, land); p.vline(1, 0, 15, t.foam); }
    if (!(mask & 2)) { p.vline(15, 0, 15, land); p.vline(14, 0, 15, t.foam); }
  }
  function cliffTile(t, mask, v, p, below) {
    // below: tipo do tile de baixo; face se não for penhasco
    const r = R.U.rng(v * 71 + 5);
    if (!below) {
      p.fill(t.cliff);
      for (let y = 3; y < 16; y += 4) p.hline(0, 15, y, t.cliffDk);
      for (let i = 0; i < 6; i++) { const x = (r() * 16) | 0, y = (r() * 16) | 0; p.set(x, y, shade(t.cliff, 0.15)); }
      for (let y = 0; y < 16; y += 4) p.set(((y * 5 + v) % 15), y + 1, t.cliffDk);
      if (!(mask & 1)) { p.hline(0, 15, 0, t.grassDk); p.hline(0, 15, 1, shade(t.cliff, 0.2)); }
    } else {
      // topo do penhasco (gramado)
      grassTile(t, v, p, false);
      if (!(mask & 1)) p.hline(0, 15, 0, t.grassDk);
      if (!(mask & 8)) { p.vline(0, 0, 15, t.cliffDk); p.vline(1, 0, 15, t.grassDk); }
      if (!(mask & 2)) { p.vline(15, 0, 15, t.cliffDk); p.vline(14, 0, 15, t.grassDk); }
    }
  }
  function bridgeTile(t, mask, p) {
    const horiz = (mask & 2) || (mask & 8);
    p.fill(t.water);
    const wood = '#c09060', wd = '#8a603c';
    if (horiz) {
      p.rect(0, 2, 16, 12, wood);
      for (let x = 0; x < 16; x += 4) p.vline(x, 2, 13, wd);
      p.hline(0, 15, 2, '#e0b888'); p.hline(0, 15, 13, wd); p.hline(0, 15, 14, OUT);
    } else {
      p.rect(2, 0, 12, 16, wood);
      for (let y = 0; y < 16; y += 4) p.hline(2, 13, y, wd);
      p.vline(2, 0, 15, '#e0b888'); p.vline(13, 0, 15, wd);
    }
  }
  function asphaltTile(t, v, p, line) {
    const r = R.U.rng(v * 17 + 1);
    p.fill(t.stone);
    for (let i = 0; i < 10; i++) p.set((r() * 16) | 0, (r() * 16) | 0, t.stone2);
    if (line === 'h') { p.rect(2, 7, 5, 2, '#d8d0a0'); p.rect(10, 7, 5, 2, '#d8d0a0'); }
    if (line === 'v') { p.rect(7, 2, 2, 5, '#d8d0a0'); p.rect(7, 10, 2, 5, '#d8d0a0'); }
  }
  function blankTile(v, frame, p) {
    // estática do Esquecimento
    const r = R.U.rng(v * 13 + frame * 101);
    p.fill('#f4f2fa');
    for (let i = 0; i < 26; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? '#ffffff' : '#dcd8e8');
  }

  // ----------------------------------------------------- piso e paredes internos
  function floorTile(ii, v, p, style) {
    const r = R.U.rng(v * 29 + 3);
    style = style || ii.floorStyle || 'wood';
    if (style === 'checker') {
      p.fill(ii.floor);
      p.rect(0, 0, 8, 8, ii.floor2); p.rect(8, 8, 8, 8, ii.floor2);
      p.hline(0, 15, 15, ii.floorDk);
    } else if (style === 'carpet') {
      p.fill(ii.floor);
      for (let i = 0; i < 14; i++) p.set((r() * 16) | 0, (r() * 16) | 0, ii.floor2);
      if (v % 4 === 0) { p.set(7, 7, ii.floorDk); p.set(8, 8, ii.floorDk); }
    } else if (style === 'metal') {
      p.fill(ii.floor);
      p.hline(0, 15, 0, shade(ii.floor, 0.15)); p.hline(0, 15, 15, ii.floorDk);
      p.vline(0, 0, 15, shade(ii.floor, 0.1)); p.vline(15, 0, 15, ii.floorDk);
      p.set(2, 2, ii.floorDk); p.set(13, 2, ii.floorDk); p.set(2, 13, ii.floorDk); p.set(13, 13, ii.floorDk);
    } else if (style === 'rock') {
      p.fill(ii.floor);
      for (let i = 0; i < 12; i++) p.set((r() * 16) | 0, (r() * 16) | 0, ii.floor2);
      for (let i = 0; i < 3; i++) p.set((r() * 16) | 0, (r() * 16) | 0, ii.floorDk);
    } else {
      // tábuas de madeira
      p.fill(ii.floor);
      const off = (v % 2) * 8;
      for (let y = 0; y < 16; y += 4) {
        p.hline(0, 15, y + 3, ii.floorDk);
        const sx = (off + y * 3) % 16;
        p.vline(sx, y, y + 2, ii.floorDk);
        for (let i = 0; i < 3; i++) p.set((r() * 16) | 0, y + ((r() * 3) | 0), ii.floor2);
      }
    }
  }
  function wallTile(ii, kind, mask, v, p) {
    // kind: 'top' | 'upper' | 'lower'
    if (kind === 'top') {
      p.fill(ii.wallTop);
      const edge = shade(ii.wallTop, 0.25);
      if (!(mask & 1)) p.hline(0, 15, 0, edge);
      if (!(mask & 2)) p.vline(15, 0, 15, edge);
      if (!(mask & 8)) p.vline(0, 0, 15, edge);
      if (!(mask & 4)) p.hline(0, 15, 15, edge);
      return;
    }
    const f = ii.wallFace, f2 = ii.wallFace2;
    p.fill(f);
    const r = R.U.rng(v * 41 + 9);
    switch (ii.pattern) {
      case 'stripes': for (let x = 0; x < 16; x += 4) p.vline(x, 0, 15, f2); break;
      case 'dots': for (let y = 2; y < 16; y += 5) for (let x = (y % 2) * 3 + 1; x < 16; x += 6) p.set(x, y, f2); break;
      case 'panels': p.rect(2, kind === 'upper' ? 3 : 0, 12, kind === 'upper' ? 13 : 9, f2); p.rect(3, kind === 'upper' ? 4 : 0, 10, kind === 'upper' ? 12 : 8, f); break;
      case 'planks': for (let y = 3; y < 16; y += 4) p.hline(0, 15, y, f2); p.vline(v % 16, 0, 15, f2); break;
      case 'bricks':
        for (let y = 0; y < 16; y += 4) { p.hline(0, 15, y + 3, f2); for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) p.vline(x, y, y + 2, f2); }
        break;
      case 'peeling':
        for (let x = 0; x < 16; x += 4) p.vline(x, 0, 15, f2);
        for (let i = 0; i < 5; i++) { const x = (r() * 14) | 0, y = (r() * 14) | 0; p.rect(x, y, 2, 2, shade(f, -0.25)); }
        break;
      case 'rock':
        for (let i = 0; i < 18; i++) p.set((r() * 16) | 0, (r() * 16) | 0, f2);
        for (let y = 2; y < 16; y += 5) p.hline((r() * 6) | 0, 8 + ((r() * 7) | 0), y, shade(f, -0.25));
        break;
      default: break;
    }
    if (kind === 'upper') { p.hline(0, 15, 0, shade(ii.wallTop, 0.3)); p.hline(0, 15, 1, ii.trim); }
    if (kind === 'lower') { p.rect(0, 13, 16, 3, ii.trim); p.hline(0, 15, 13, shade(ii.trim, 0.25)); }
  }

  // ---------------------------------------------------------- API de tiles
  // tipos de chão conhecidos e se são sólidos por padrão
  const TYPES = {
    grass: { solid: false, ground: true },
    flowers: { solid: false, ground: true },
    tallgrass: { solid: false, ground: true },
    path: { solid: false, ground: true },
    stone: { solid: false, ground: true },
    sand: { solid: false, ground: true },
    water: { solid: true, ground: true, anim: true },
    bridge: { solid: false, ground: true },
    cliff: { solid: true, ground: true },
    void: { solid: true, ground: true },
    blank: { solid: true, ground: true, anim: true },
    asphalt: { solid: false, ground: true },
    road_h: { solid: false, ground: true },
    road_v: { solid: false, ground: true },
    floor: { solid: false, ground: true },
    floor2: { solid: false, ground: true },
    rug: { solid: false, ground: true },
    wall: { solid: true, ground: true },
    counter: { solid: true, ground: true, counter: true },
    darkfloor: { solid: false, ground: true },
    stairs: { solid: false, ground: true },
    // objetos sobre grama (desenhados no passe de profundidade)
    tree: { solid: true, object: 'tree' },
    bush: { solid: true, object: 'bush' },
    rock: { solid: true, object: 'rock' },
    fence: { solid: true, object: 'fence' },
    stump: { solid: true, object: 'stump' },
    crystal: { solid: true, object: 'crystal' },
    mushroom: { solid: true, object: 'mushroom' },
    hedge: { solid: true, object: 'hedge' },
    invisible: { solid: true, ground: true },
  };
  R.Tiles.TYPES = TYPES;

  // desenha tile de chão (canvas 16x16)
  R.Tiles.ground = function (type, theme, interior, v, mask, frame, extra) {
    const key = type + '|' + theme + '|' + interior + '|' + (v % 8) + '|' + mask + '|' + (frame || 0) + '|' + (extra || '');
    return cached(key, () => {
      const p = new PA(T, T);
      const t = th(theme), ii = it(interior);
      switch (type) {
        case 'grass': case 'tree': case 'bush': case 'rock': case 'fence': case 'stump': case 'mushroom': case 'hedge': case 'invisible':
          if (interior && !theme) floorTile(ii, v, p); else grassTile(t, v % 8, p, false);
          break;
        case 'crystal': floorTile(it('gruta'), v, p, 'rock'); break;
        case 'flowers': grassTile(t, v % 8, p, true); break;
        case 'tallgrass':
          grassTile(t, v % 8, p, false);
          for (let x = 1; x < 16; x += 3) { p.vline(x, 9, 14, t.grassDk); p.vline(x + 1, 7, 14, t.tuft); }
          break;
        case 'path': pathTile(t, v % 8, mask, p, 'path'); break;
        case 'stone': pathTile(t, v % 8, mask, p, 'stone'); break;
        case 'sand': { p.fill(t.sand); const r = R.U.rng(v * 7); for (let i = 0; i < 6; i++) p.set((r() * 16) | 0, (r() * 16) | 0, shade(t.sand, -0.08)); break; }
        case 'water': waterTile(t, v % 8, mask, frame || 0, p); break;
        case 'bridge': bridgeTile(t, mask, p); break;
        case 'cliff': cliffTile(t, mask, v % 8, p, extra === 'top'); break;
        case 'void': p.fill('#000000'); break;
        case 'blank': blankTile(v % 8, frame || 0, p); break;
        case 'asphalt': asphaltTile(t, v % 8, p, null); break;
        case 'road_h': asphaltTile(t, v % 8, p, 'h'); break;
        case 'road_v': asphaltTile(t, v % 8, p, 'v'); break;
        case 'floor': floorTile(ii, v % 8, p); break;
        case 'floor2': floorTile(ii, v % 8, p, ii.floorStyle === 'checker' ? 'wood' : 'checker'); break;
        case 'darkfloor': floorTile(it('gruta'), v % 8, p, 'rock'); break;
        case 'rug': {
          const rc = extra || '#c8506a';
          floorTile(ii, v % 8, p);
          p.fill(rc);
          const b = shade(rc, 0.3);
          if (!(mask & 1)) p.hline(0, 15, 1, b);
          if (!(mask & 4)) p.hline(0, 15, 14, b);
          if (!(mask & 8)) p.vline(1, 0, 15, b);
          if (!(mask & 2)) p.vline(14, 0, 15, b);
          if ((v % 3) === 0) { p.set(7, 7, b); p.set(8, 8, b); p.set(7, 8, b); p.set(8, 7, b); }
          break;
        }
        case 'wall': wallTile(ii, extra || 'top', mask, v % 8, p); break;
        case 'counter': {
          const wood = '#b07a50';
          p.fill(wood);
          p.hline(0, 15, 0, '#e0b080'); p.hline(0, 15, 1, '#d09a6a');
          p.rect(0, 9, 16, 7, shade(wood, -0.2));
          p.hline(0, 15, 9, shade(wood, -0.35));
          for (let x = 3; x < 16; x += 6) p.vline(x, 10, 15, shade(wood, -0.3));
          break;
        }
        case 'stairs': {
          p.fill(interior ? ii.floorDk : t.stoneDk);
          for (let y = 0; y < 16; y += 4) { p.hline(0, 15, y, shade(interior ? ii.floor : t.stone, 0.1)); p.hline(0, 15, y + 1, interior ? ii.floor : t.stone); }
          break;
        }
        default: p.fill('#ff00ff');
      }
      return p.toCanvas();
    });
  };

  // ------------------------------------------------------------- árvores
  R.Tiles.tree = function (theme, v) {
    const t = th(theme);
    const kind = t.tree;
    return cached('tree|' + theme + '|' + (v % 3), () => {
      const p = new PA(32, 40);
      const r = R.U.rng(v * 97 + 1);
      const cx = 16;
      if (kind === 'pine') {
        p.rect(14, 30, 4, 8, t.trunk);
        const layers = [[30, 12], [23, 10], [16, 8], [10, 5]];
        for (const [y, w] of layers) p.poly([[cx - w - 1, y + 3], [cx + w + 1, y + 3], [cx, y - 8]], t.leaf);
        for (const [y, w] of layers) p.poly([[cx - w + 2, y + 2], [cx - 1, y + 2], [cx - 1, y - 5]], t.leaf2);
        p.outline(OUT);
      } else if (kind === 'candy') {
        // pirulito gigante
        p.rect(15, 20, 3, 18, t.trunk);
        for (let y = 21; y < 38; y += 3) p.set(15, y, '#ff8fb8');
        p.circle(cx, 13, 11, t.leaf);
        p.ring(cx, 13, 8, t.leaf2, 2); p.ring(cx, 13, 4, t.leaf2, 2);
        p.circle(cx - 4, 9, 2, '#ffffff');
        p.outline(OUT);
      } else if (kind === 'bare') {
        p.rect(14, 18, 4, 20, t.trunk);
        p.line(16, 20, 8, 8, t.trunk); p.line(16, 22, 25, 10, t.trunk); p.line(12, 14, 10, 4, t.trunk); p.line(22, 14, 26, 6, t.trunk);
        p.line(16, 18, 17, 3, t.trunk);
        p.outline(OUT);
      } else if (kind === 'crystal') {
        p.poly([[10, 38], [14, 10], [18, 38]], '#7ae0f0'); p.poly([[16, 38], [22, 16], [26, 38]], '#a0b8ff'); p.poly([[6, 38], [8, 24], [12, 38]], '#c0a8ff');
        p.line(14, 14, 13, 34, '#ffffff');
        p.outline(OUT);
      } else if (kind === 'wind') {
        p.rect(13, 26, 4, 12, t.trunk);
        p.line(15, 28, 22, 22, t.trunk);
        p.ellipse(19, 17, 12, 8, t.leafDk); p.ellipse(18, 15, 10, 7, t.leaf); p.ellipse(16, 13, 6, 4, t.leaf2);
        p.outline(OUT);
      } else {
        p.rect(14, 26, 4, 12, t.trunk);
        p.set(13, 37, t.trunk); p.set(18, 37, t.trunk);
        const blobs = [[16, 16, 12, 11], [9 + r() * 2, 19, 6, 6], [23 - r() * 2, 19, 6, 6], [16, 8, 8, 6]];
        for (const [x, y, rx, ry] of blobs) p.ellipse(x, y, rx, ry, t.leafDk);
        for (const [x, y, rx, ry] of blobs) p.ellipse(x - 1, y - 1, rx - 1.5, ry - 1.5, t.leaf);
        p.ellipse(12, 10, 5, 3.5, t.leaf2);
        p.set(20, 14, t.leaf2); p.set(10, 18, t.leaf2);
        p.outline(OUT);
        if (theme === 'vila' && v % 3 === 1) { p.circle(11, 19, 1.4, '#ff6f6f'); p.circle(20, 12, 1.4, '#ff6f6f'); p.circle(22, 21, 1.4, '#ff6f6f'); }
      }
      // sombra no chão
      const s = new PA(32, 40);
      s.ellipse(16, 38, 9, 2.4, [0, 0, 0, 50]);
      s.draw(p);
      return s.toCanvas();
    });
  };

  // ----------------------------------------------------- objetos simples de tile
  R.Tiles.object = function (kind, theme, v, mask) {
    const t = th(theme);
    return cached('obj|' + kind + '|' + theme + '|' + (v % 3) + '|' + (mask || 0), () => {
      const p = new PA(16, 24);
      switch (kind) {
        case 'bush':
          p.ellipse(8, 17, 7.5, 6, t.leafDk); p.ellipse(7.5, 16, 6, 4.8, t.leaf); p.ellipse(6, 14, 2.5, 2, t.leaf2);
          if (theme === 'campos') { p.circle(5, 17, 1.2, '#fff1a8'); p.circle(11, 15, 1.2, '#ffffff'); }
          p.outline(OUT);
          break;
        case 'hedge':
          p.rect(0, 10, 16, 13, t.leafDk); p.rect(0, 9, 16, 11, t.leaf); p.hline(0, 15, 9, t.leaf2);
          for (let x = 2; x < 16; x += 5) p.set(x, 13, t.leaf2);
          p.outline(OUT);
          break;
        case 'rock':
          p.ellipse(8, 18, 7, 5.5, t.stone2); p.ellipse(7, 16.5, 5, 3.5, t.stone); p.set(5, 15, '#ffffff');
          p.outline(OUT);
          break;
        case 'stump':
          p.ellipse(8, 19, 6, 3.5, t.trunk); p.rect(2, 15, 13, 5, t.trunk); p.ellipse(8, 15, 6, 3, shade(t.trunk, 0.35)); p.ring(8, 15, 2, shade(t.trunk, 0.1));
          p.outline(OUT);
          break;
        case 'mushroom': {
          const cap = theme === 'floresta' ? '#d0506a' : '#ff8fb8';
          p.rect(6, 14, 4, 8, '#f4ead2'); p.ellipse(8, 12, 7, 5, cap); p.circle(5, 11, 1.2, '#fff'); p.circle(10, 9, 1.2, '#fff'); p.circle(11, 13, 1, '#fff');
          p.outline(OUT);
          break;
        }
        case 'crystal':
          p.poly([[4, 23], [7, 6], [10, 23]], '#7ae0f0'); p.poly([[8, 23], [12, 11], [15, 23]], '#a0b8ff'); p.line(7, 9, 7, 20, '#fff');
          p.outline(OUT);
          break;
        case 'fence': {
          const w = theme === 'bairro' ? '#c8c8c8' : '#f4ead8', wd = shade(w, -0.25);
          p.rect(6, 10, 4, 12, w); p.vline(9, 10, 21, wd);
          if (mask & 8) { p.rect(0, 12, 6, 2, w); p.rect(0, 17, 6, 2, w); }
          if (mask & 2) { p.rect(10, 12, 6, 2, w); p.rect(10, 17, 6, 2, w); }
          p.outline(OUT);
          break;
        }
        default: p.rect(2, 10, 12, 12, '#f0f');
      }
      return p.toCanvas();
    });
  };

  // ============================================================ construções
  // def: {style, w, h, door (coluna relativa), variant}
  const BSTYLE = {
    casa: { wall: '#f4e4c8', wall2: '#e4d0b0', roof: '#d86a5a', roof2: '#b85048', door: '#8a5a3a', trim: '#ffffff' },
    casa_azul: { wall: '#e4ecf8', wall2: '#cdd8ec', roof: '#5a7ad0', roof2: '#4862b0', door: '#6a4a3a', trim: '#ffffff' },
    casa_verde: { wall: '#f4f0d8', wall2: '#e0dcc0', roof: '#5aa070', roof2: '#468a5c', door: '#8a5a3a', trim: '#ffffff' },
    casa_brisa: { wall: '#fff0d0', wall2: '#ecdab8', roof: '#e8823a', roof2: '#c86a2a', door: '#3f6fb5', trim: '#ffffff' },
    padaria: { wall: '#ffd8c8', wall2: '#f0c0ae', roof: '#9a6040', roof2: '#7a4a30', door: '#c86a5a', trim: '#fff4ec', awning: ['#ff8a8a', '#ffffff'], sign: 'pao' },
    biblioteca: { wall: '#d4d8ec', wall2: '#bcc2dc', roof: '#4a5aa0', roof2: '#3a4888', door: '#5a3a5a', trim: '#f4f4ff', sign: 'livro', columns: true },
    oficina: { wall: '#b8906a', wall2: '#a07a58', roof: '#7a828e', roof2: '#626a76', door: '#5a5a62', trim: '#d8c0a0', sign: 'engrenagem', planks: true },
    pousada: { wall: '#ece0f8', wall2: '#d8c8ee', roof: '#8a6ab8', roof2: '#7058a0', door: '#6a4a7a', trim: '#ffffff', sign: 'cama', awning: ['#b89ae0', '#ffffff'] },
    prefeitura: { wall: '#f8f0e0', wall2: '#e8dcc4', roof: '#c84a52', roof2: '#a83a42', door: '#7a3a3a', trim: '#ffd86b', sign: 'chama', tower: true, columns: true },
    abandonada: { wall: '#8a7e78', wall2: '#766a64', roof: '#4a4048', roof2: '#3a3038', door: '#2a2024', trim: '#a8a098', broken: true },
    bairro: { wall: '#c4c2bc', wall2: '#b0aea8', roof: '#6a6870', roof2: '#58565e', door: '#4a4850', trim: '#dcdad4', gray: true },
    arvore: { treehouse: true },
    farol: { lighthouse: true },
    caverna: { cave: true },
    branco: { blank: true },
  };
  R.Tiles.BSTYLE = BSTYLE;

  function signIcon(p, kind, x, y) {
    p.rect(x, y, 10, 8, '#f4e4c8'); p.hline(x, x + 9, y + 7, '#c8a878');
    p.vline(x + 2, y - 2, y - 1, '#5a4030'); p.vline(x + 7, y - 2, y - 1, '#5a4030');
    const c = { pao: '#d8a050', livro: '#5a6ad0', engrenagem: '#7a828e', cama: '#8a6ab8', chama: '#ff9a3a' }[kind] || '#888';
    if (kind === 'pao') { p.ellipse(x + 5, y + 4, 3.5, 2.2, c); p.set(x + 4, y + 3, '#f4d090'); }
    else if (kind === 'livro') { p.rect(x + 2, y + 2, 6, 4, c); p.vline(x + 5, y + 2, y + 5, '#fff'); }
    else if (kind === 'engrenagem') { p.circle(x + 5, y + 4, 3, c); p.set(x + 5, y + 4, '#f4e4c8'); p.set(x + 5, y, c); p.set(x + 5, y + 7, c); p.set(x + 1, y + 4, c); p.set(x + 8, y + 4, c); }
    else if (kind === 'cama') { p.rect(x + 1, y + 3, 8, 3, c); p.rect(x + 1, y + 2, 3, 2, '#fff'); }
    else if (kind === 'chama') { p.ellipse(x + 5, y + 4, 2.2, 3, c); p.set(x + 5, y + 4, '#fff2a8'); }
  }

  R.Tiles.building = function (def, frameVariant) {
    const style = def.style || 'casa';
    const variant = def.variant || '';
    const key = 'bld|' + style + '|' + def.w + 'x' + def.h + '|' + (def.door || 0) + '|' + variant + '|' + (def.number || '') + '|' + (frameVariant || 0);
    return cached(key, () => {
      const S = BSTYLE[style] || BSTYLE.casa;
      const W = def.w * T, H = def.h * T;
      if (S.treehouse) return treehouse(def);
      if (S.lighthouse) return lighthouse(def, variant);
      if (S.cave) return cave(def);
      if (S.blank) return blankHouse(def, frameVariant || 0);
      const extraTop = S.tower ? 26 : 8;
      const p = new PA(W, H + extraTop);
      const oy = extraTop;
      const wallRows = 2;
      const wallY = oy + (def.h - wallRows) * T;
      const roofY0 = oy - 4;
      const doorX = (def.door === undefined ? Math.floor(def.w / 2) : def.door) * T;
      // paredes
      p.rect(2, wallY, W - 4, wallRows * T, S.wall);
      if (S.planks) for (let y = wallY + 3; y < wallY + wallRows * T; y += 5) p.hline(2, W - 3, y, S.wall2);
      else if (S.gray) for (let x = 6; x < W - 2; x += 8) p.vline(x, wallY, wallY + wallRows * T - 1, S.wall2);
      else p.rect(2, wallY + wallRows * T - 4, W - 4, 4, S.wall2);
      if (S.broken) { p.line(10, wallY + 4, 16, wallY + 14, S.wall2); p.line(W - 20, wallY + 6, W - 14, wallY + 20, S.wall2); }
      // telhado
      const roofH = wallY - roofY0 + 3;
      for (let y = 0; y < roofH; y++) {
        const inset = Math.max(0, 3 - y);
        p.hline(inset, W - 1 - inset, roofY0 + y, (Math.floor(y / 3) % 2) ? S.roof : S.roof2);
      }
      for (let y = roofY0 + 2; y < wallY; y += 3) for (let x = (y % 6 ? 3 : 7); x < W - 3; x += 8) p.set(x, y, shade(S.roof, -0.3));
      p.hline(0, W - 1, wallY + 2, shade(S.roof2, -0.25));
      p.hline(4, W - 5, roofY0, shade(S.roof, 0.25));
      if (S.broken) { p.rect(W - 26, roofY0 + 6, 8, 6, '#1a1418'); p.rect(12, roofY0 + 12, 5, 3, '#1a1418'); }
      // chaminé
      if (!S.tower && def.w >= 4) {
        const cx = W - 20;
        p.rect(cx, roofY0 - 6, 8, 12, '#a87060'); p.rect(cx - 1, roofY0 - 7, 10, 3, '#8a5a4a');
      }
      // torre do relógio
      if (S.tower) {
        const tx = Math.floor(W / 2) - 14;
        p.rect(tx, 0, 28, oy + 12, S.wall);
        p.poly([[tx - 3, 6], [tx + 31, 6], [tx + 14, -12]], S.roof);
        p.circle(tx + 14, 16, 8, '#fffaf0'); p.ring(tx + 14, 16, 8, '#5a3a3a');
        p.line(tx + 14, 16, tx + 14, 10, '#3a2a2a'); p.line(tx + 14, 16, tx + 18, 18, '#3a2a2a');
      }
      // colunas
      if (S.columns) for (const x of [6, W - 10, doorX - 6, doorX + T + 2]) if (x > 2 && x < W - 6) { p.rect(x, wallY + 2, 4, wallRows * T - 2, S.trim); p.vline(x + 3, wallY + 2, wallY + wallRows * T - 1, S.wall2); }
      // janelas
      const lit = variant === 'lit' || variant === 'night';
      for (let cx = 0; cx < def.w; cx++) {
        if (cx * T === doorX || cx === 0 || cx === def.w - 1 && def.w > 3) continue;
        if (Math.abs(cx * T - doorX) < T) continue;
        const wx = cx * T + 3, wy = wallY + 5;
        const glass = lit ? '#ffe08a' : S.gray ? '#3a3c44' : S.broken ? '#2a2226' : '#a8d8f0';
        p.rect(wx - 1, wy - 1, 12, 11, S.trim);
        p.rect(wx, wy, 10, 9, glass);
        if (!lit && !S.gray && !S.broken) { p.line(wx + 1, wy + 7, wx + 5, wy + 1, '#e8f6ff'); }
        p.vline(wx + 5, wy, wy + 8, S.trim); p.hline(wx, wx + 9, wy + 4, S.trim);
        if (S.broken && !lit) { p.line(wx, wy, wx + 9, wy + 8, '#8a7a6a'); p.line(wx, wy + 8, wx + 9, wy, '#8a7a6a'); }
        if (def.girl && cx === def.girl) { p.circle(wx + 5, wy + 4, 2.5, '#e8b48a'); p.rect(wx + 2, wy + 1, 7, 3, '#c4573a'); p.rect(wx + 2, wy + 4, 2, 5, '#c4573a'); }
      }
      // toldo
      if (S.awning) {
        const ay = wallY + 1;
        for (let x = 2; x < W - 2; x++) p.vline(x, ay, ay + 3, Math.floor(x / 5) % 2 ? S.awning[0] : S.awning[1]);
        for (let x = 2; x < W - 2; x += 5) p.set(x + 2, ay + 4, S.awning[0]);
      }
      // porta
      const dy = wallY + wallRows * T - 22;
      p.rect(doorX + 2, dy, 12, 22, shade(S.door, -0.3));
      if (variant === 'open' || variant === 'lit') { p.rect(doorX + 3, dy + 1, 10, 21, '#140e18'); p.rect(doorX + 3, dy + 1, 3, 21, S.door); }
      else {
        p.rect(doorX + 3, dy + 1, 10, 21, S.door);
        p.rect(doorX + 5, dy + 4, 6, 6, shade(S.door, 0.15)); p.rect(doorX + 5, dy + 12, 6, 7, shade(S.door, 0.15));
        p.set(doorX + 11, dy + 12, '#ffd86b');
      }
      p.hline(doorX + 1, doorX + 14, wallY + wallRows * T - 1, '#7a6a5a');
      if (S.sign) signIcon(p, S.sign, doorX + T + 1, wallY + 3);
      if (def.number !== undefined) {
        p.rect(doorX - 9, wallY + 4, 8, 9, '#e8e4dc');
        const n = String(def.number);
        const dg = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 5: ['###', '#..', '##.', '..#', '##.'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 2: ['##.', '..#', '.#.', '#..', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 6: ['.##', '#..', '###', '#.#', '###'], 8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'] }[n];
        if (dg) p.pattern(doorX - 7, wallY + 6, dg, { '#': '#3a3a40' });
      }
      p.outline(OUT);
      // sombra
      const out = new PA(W + 4, H + extraTop + 4);
      out.rect(4, H + extraTop - 2, W - 4, 4, [0, 0, 0, 45]);
      out.draw(p);
      const c = out.toCanvas();
      c._oy = extraTop;
      return c;
    });
  };

  function treehouse(def) {
    const W = def.w * T, H = def.h * T;
    const extra = 28;
    const p = new PA(W, H + extra);
    const oy = extra;
    const t = THEMES.vila;
    // tronco
    p.rect(W / 2 - 10, oy + 20, 20, H - 20, t.trunk);
    p.vline(W / 2 - 4, oy + 22, oy + H - 2, shade(t.trunk, -0.2)); p.vline(W / 2 + 5, oy + 26, oy + H - 4, shade(t.trunk, -0.2));
    p.rect(W / 2 - 13, oy + H - 4, 26, 4, t.trunk);
    // copa
    for (const [x, y, rx, ry] of [[W / 2, oy + 6, W / 2 - 2, 18], [12, oy + 14, 12, 12], [W - 12, oy + 14, 12, 12]]) p.ellipse(x, y, rx, ry, t.leafDk);
    for (const [x, y, rx, ry] of [[W / 2, oy + 4, W / 2 - 4, 16], [12, oy + 12, 10, 10], [W - 12, oy + 12, 10, 10]]) p.ellipse(x - 1, y - 1, rx, ry, t.leaf);
    p.ellipse(W / 2 - 10, oy - 4, 10, 6, t.leaf2);
    // casinha
    const hx = W / 2 - 18, hy = oy - 6;
    p.rect(hx, hy + 8, 36, 22, '#c49a68');
    for (let y = hy + 11; y < hy + 30; y += 4) p.hline(hx, hx + 35, y, '#a87e50');
    p.poly([[hx - 4, hy + 10], [hx + 40, hy + 10], [hx + 18, hy - 8]], '#d86a5a');
    p.hline(hx - 4, hx + 40, hy + 10, '#a84a40');
    p.rect(hx + 4, hy + 14, 9, 8, '#ffe08a'); p.vline(hx + 8, hy + 14, hy + 21, '#c49a68');
    p.rect(hx + 22, hy + 14, 9, 16, '#6a4a30'); p.set(hx + 29, hy + 22, '#ffd86b');
    // escada
    for (let y = oy + 26; y < oy + H - 2; y += 4) p.hline(W / 2 - 4, W / 2 + 3, y, '#e0c090');
    p.vline(W / 2 - 5, oy + 24, oy + H - 1, '#a87e50'); p.vline(W / 2 + 4, oy + 24, oy + H - 1, '#a87e50');
    p.outline(OUT);
    const c = p.toCanvas();
    c._oy = extra;
    return c;
  }
  function lighthouse(def, variant) {
    const W = def.w * T, H = def.h * T;
    const extra = 120;
    const p = new PA(W, H + extra);
    const base = H + extra;
    const cx = W / 2;
    // torre listrada afunilando
    for (let y = 30; y < base - 2; y++) {
      const tpos = (y - 30) / (base - 32);
      const hw = 9 + tpos * (W / 2 - 12);
      const stripe = Math.floor((y - 30) / 14) % 2;
      p.hline(Math.round(cx - hw), Math.round(cx + hw), y, stripe ? '#f4f0e8' : '#d84a4a');
      p.set(Math.round(cx + hw), y, stripe ? '#d8d0c4' : '#a83636');
      p.set(Math.round(cx + hw) - 1, y, stripe ? '#d8d0c4' : '#a83636');
    }
    // sala da lâmpada
    const lit = variant === 'lit';
    p.rect(cx - 12, 16, 24, 15, '#3a3448');
    p.rect(cx - 9, 18, 18, 11, lit ? '#fff2a8' : '#262236');
    if (lit) p.circle(cx, 23, 4, '#ffffff');
    p.vline(cx - 3, 18, 28, '#3a3448'); p.vline(cx + 3, 18, 28, '#3a3448');
    p.poly([[cx - 15, 17], [cx + 15, 17], [cx, 2]], '#3a3448');
    p.rect(cx - 15, 30, 30, 3, '#5a5068');
    p.set(cx, 0, '#3a3448'); p.set(cx, 1, '#3a3448');
    // porta e janelas
    p.rect(cx - 7, base - 26, 14, 24, '#4a3a3a');
    if (variant === 'open' || lit) p.rect(cx - 6, base - 25, 12, 23, '#140e18');
    else { p.rect(cx - 6, base - 25, 12, 23, '#6a4a40'); for (let i = 0; i < 3; i++) p.circle(cx - 4 + i * 4, base - 18, 1.4, lit ? '#ffd86b' : '#2a2026'); }
    p.rect(cx - 4, 60, 8, 10, lit ? '#ffe08a' : '#3a3448'); p.rect(cx - 4, 96, 8, 10, lit ? '#ffe08a' : '#3a3448');
    p.outline(OUT);
    const c = p.toCanvas();
    c._oy = extra;
    return c;
  }
  function cave(def) {
    const W = def.w * T, H = def.h * T;
    const p = new PA(W, H + 8);
    const t = THEMES[def.theme || 'campos'] || THEMES.campos;
    p.ellipse(W / 2, H / 2 + 8, W / 2, H / 2 + 2, t.cliff);
    p.ellipse(W / 2 - 4, H / 2 + 2, W / 2 - 6, H / 2 - 4, shade(t.cliff, 0.12));
    for (let i = 0; i < 6; i++) p.set(6 + i * 7, 12 + (i % 3) * 5, t.cliffDk);
    const dx = (def.door === undefined ? Math.floor(def.w / 2) : def.door) * T;
    p.ellipse(dx + 8, H + 2, 9, 14, '#120c18');
    p.outline(OUT);
    const c = p.toCanvas();
    c._oy = 8;
    return c;
  }
  function blankHouse(def, frame) {
    const W = def.w * T, H = def.h * T;
    const p = new PA(W, H + 8);
    const r = R.U.rng(frame * 31 + 7);
    p.rect(2, 10, W - 4, H - 4, '#f6f4fa');
    p.poly([[0, 14], [W, 14], [W / 2, 0]], '#f6f4fa');
    for (let i = 0; i < W * H / 6; i++) p.set((r() * W) | 0, (r() * (H + 8)) | 0, r() < 0.5 ? '#ffffff' : '#dedae8');
    const c = p.toCanvas();
    c._oy = 8;
    return c;
  }

  // ============================================================ móveis/props
  // cada prop: {w, h (px), foot [tw, th] tiles sólidos, draw(p, v)}
  // âncora: canto inferior-esquerdo do canvas alinhado ao canto inferior-esquerdo da pegada
  const PROPS = {};
  const def = (id, w, h, foot, draw, opts) => (PROPS[id] = Object.assign({ w, h, foot, draw }, opts || {}));
  const wood = '#b07a50', woodDk = '#8a5a38', woodLt = '#d09a6a';

  def('cama', 16, 32, [1, 2], (p, v) => {
    const c = ['#7aa0e0', '#e88a9a', '#8ad0a0', '#c8a0e8'][v % 4];
    p.rect(1, 2, 14, 29, woodDk); p.rect(2, 3, 12, 6, '#f4f0ff'); p.rect(2, 10, 12, 20, c); p.hline(2, 13, 10, shade(c, 0.3));
    p.rect(1, 0, 14, 3, wood);
    p.outline(OUT);
  });
  def('cama_lume', 16, 32, [1, 2], (p, v) => {
    PROPS.cama.draw(p, 0);
    if (v === 1) { // alguém dormindo
      p.circle(8, 6, 4.4, '#f2c9a0'); p.ellipse(8, 4, 4.6, 3, '#2b2440'); p.hline(6, 7, 7, '#241a2e'); p.hline(9, 10, 7, '#241a2e');
      p.ellipse(8, 18, 6, 6, shade('#7aa0e0', -0.1));
    }
  });
  def('cama_hospital', 16, 32, [1, 2], (p, v) => {
    p.rect(1, 2, 14, 29, '#c8ccd0'); p.rect(2, 3, 12, 6, '#ffffff'); p.rect(2, 10, 12, 20, '#e8ecf0'); p.hline(2, 13, 10, '#ffffff');
    p.rect(0, 0, 16, 3, '#9aa0a8'); p.vline(0, 0, 31, '#9aa0a8'); p.vline(15, 0, 31, '#9aa0a8');
    if (v === 1) { p.circle(8, 6, 4.4, '#f2c9a0'); p.ellipse(8, 4, 4.6, 3, '#2b2440'); p.hline(6, 7, 7, '#241a2e'); p.hline(9, 10, 7, '#241a2e'); p.ellipse(8, 18, 5, 7, '#dfe4ea'); }
    if (v === 2) { p.ellipse(8, 17, 5, 9, '#dfe4ea'); p.circle(8, 6, 4, '#e8ecf0'); }
    p.outline(OUT);
  });
  def('mesa', 32, 24, [2, 1], (p) => {
    p.rect(1, 2, 30, 12, woodLt); p.hline(1, 30, 2, '#f0c090'); p.rect(1, 14, 30, 3, woodDk);
    p.rect(2, 17, 3, 6, woodDk); p.rect(27, 17, 3, 6, woodDk);
    p.rect(6, 4, 8, 6, '#f4f4f4'); p.rect(19, 5, 5, 4, '#e88a9a');
    p.outline(OUT);
  });
  def('mesinha', 16, 20, [1, 1], (p, v) => {
    p.rect(1, 4, 14, 8, woodLt); p.rect(1, 12, 14, 2, woodDk); p.rect(2, 14, 2, 5, woodDk); p.rect(12, 14, 2, 5, woodDk);
    if (v === 1) { p.rect(5, 0, 6, 6, '#3a3a40'); p.rect(6, 1, 4, 2, '#5a5a62'); p.set(8, 4, '#ff6f6f'); } // telefone
    if (v === 2) { p.rect(3, 0, 10, 6, '#7a5a40'); p.rect(4, 1, 5, 4, '#d0c0a0'); p.circle(11, 3, 1.5, '#3a3a40'); } // rádio
    p.outline(OUT);
  });
  def('cadeira', 16, 20, [1, 1], (p) => {
    p.rect(3, 2, 10, 8, wood); p.rect(3, 10, 10, 3, woodLt); p.rect(3, 13, 2, 6, woodDk); p.rect(11, 13, 2, 6, woodDk);
    p.outline(OUT);
  }, { solid: false });
  def('estante', 16, 32, [1, 1], (p, v) => {
    p.rect(0, 0, 16, 32, woodDk); p.rect(1, 1, 14, 30, '#5a3a28');
    const r = R.U.rng(v * 13 + 5);
    const cols = ['#d86a5a', '#5a7ad0', '#5aa070', '#e8c050', '#a070c0', '#f4f0e8'];
    for (let sy = 2; sy < 30; sy += 7) {
      let x = 2;
      while (x < 14) {
        const w = 1 + ((r() * 2) | 0), h = 4 + ((r() * 2) | 0);
        p.rect(x, sy + 6 - h, w, h, cols[(r() * cols.length) | 0]);
        x += w + (r() < 0.2 ? 1 : 0);
      }
      p.hline(1, 14, sy + 6, woodLt);
    }
    p.outline(OUT);
  });
  def('estante_cor', 16, 32, [1, 1], (p, v) => {
    // estante do enigma: um livro grande colorido em destaque
    PROPS.estante.draw(p, v + 3);
    const c = ['#5a8ae8', '#5ac070', '#e8504a', '#f4c430'][v % 4];
    p.rect(5, 15, 6, 6, OUT); p.rect(6, 16, 4, 5, c); p.vline(9, 16, 20, shade(c, 0.4));
  });
  def('balcao_forno', 16, 32, [1, 1], (p) => {
    p.rect(0, 6, 16, 26, '#a8a0a8'); p.rect(2, 14, 12, 10, '#3a2a2a'); p.rect(3, 15, 10, 8, '#ff9a4a'); p.rect(4, 19, 8, 3, '#ffd86b');
    p.rect(1, 2, 14, 6, '#8a8090'); p.rect(5, 0, 4, 3, '#6a6070');
    p.outline(OUT);
  });
  def('saco_farinha', 16, 20, [1, 1], (p, v) => {
    p.ellipse(8, 13, 6.5, 6.5, '#f4ecdc'); p.rect(4, 4, 8, 4, '#f4ecdc'); p.hline(5, 10, 6, '#c8a878');
    p.rect(5, 11, 6, 4, '#e8dcc4'); p.set(7, 12, '#c86a5a'); p.set(8, 13, '#c86a5a');
    if (v === 1) { p.ellipse(8, 9, 5, 3, '#f4ecdc'); } // saco que ronca
    p.outline(OUT);
  });
  def('barril', 16, 20, [1, 1], (p) => {
    p.ellipse(8, 12, 6.5, 7.5, wood); p.rect(2, 6, 13, 12, wood); p.ellipse(8, 5, 6.5, 2.5, woodLt);
    p.hline(2, 14, 8, '#7a7a82'); p.hline(2, 14, 15, '#7a7a82');
    p.outline(OUT);
  });
  def('caixa', 16, 20, [1, 1], (p) => {
    p.rect(1, 4, 14, 15, '#c89a60'); p.rect(1, 4, 14, 3, '#e0b878'); p.line(2, 8, 13, 17, '#a07848'); p.line(13, 8, 2, 17, '#a07848');
    p.outline(OUT);
  });
  def('planta', 16, 24, [1, 1], (p, v) => {
    p.rect(4, 15, 8, 7, '#c86a4a'); p.hline(3, 12, 15, '#e08a6a');
    const g = v % 2 ? '#5fae6a' : '#7cc47a';
    p.ellipse(8, 10, 6, 6, g); p.ellipse(5, 6, 3, 4, g); p.ellipse(11, 7, 3, 4, shade(g, 0.15));
    if (v === 2) { p.circle(6, 8, 1.4, '#ffb3d1'); p.circle(10, 10, 1.4, '#ffb3d1'); }
    p.outline(OUT);
  });
  def('relogio', 16, 32, [1, 1], (p) => {
    p.rect(2, 0, 12, 32, woodDk); p.rect(3, 1, 10, 30, wood); p.circle(8, 7, 4.5, '#fffaf0'); p.line(8, 7, 8, 4, '#3a2a2a'); p.line(8, 7, 10, 8, '#3a2a2a');
    p.rect(5, 14, 6, 14, '#5a3a28'); p.circle(8, 24, 2, '#e8c050'); p.vline(8, 15, 22, '#e8c050');
    p.outline(OUT);
  });
  def('abajur', 16, 28, [1, 1], (p) => {
    p.rect(7, 10, 2, 16, '#6a5a50'); p.rect(4, 25, 8, 2, '#6a5a50');
    p.poly([[3, 11], [13, 11], [11, 2], [5, 2]], '#ffe8a8');
    p.outline(OUT);
  }, { light: 34 });
  def('espelho', 16, 28, [1, 1], (p, v) => {
    p.rect(2, 0, 12, 26, woodDk); p.rect(3, 1, 10, 24, '#bcd8f0'); p.line(4, 20, 11, 3, '#e8f6ff'); p.line(5, 22, 12, 6, '#d8ecfa');
    if (v === 1) { p.ellipse(8, 11, 3.5, 4, '#f2c9a0'); p.ellipse(8, 9, 3.7, 2.4, '#2b2440'); p.hline(6, 7, 12, '#241a2e'); p.hline(9, 10, 12, '#241a2e'); }
    p.rect(4, 26, 8, 2, woodDk);
    p.outline(OUT);
  });
  def('bau', 16, 18, [1, 1], (p, v) => {
    const open = v === 1;
    const c = '#c87a3a';
    p.rect(1, 7, 14, 10, c); p.rect(1, 13, 14, 1, shade(c, -0.25));
    if (open) { p.rect(1, 2, 14, 5, '#3a2020'); p.rect(1, 0, 14, 3, shade(c, 0.15)); }
    else { p.rect(1, 3, 14, 5, shade(c, 0.15)); p.hline(1, 14, 3, shade(c, 0.35)); }
    p.rect(6, 7, 4, 4, '#ffd86b'); p.set(7, 9, '#7a5a20');
    p.outline(OUT);
  });
  def('bau_brinquedo', 16, 18, [1, 1], (p, v) => {
    PROPS.bau.draw(p, v);
    p.map((c) => (c[0] === 200 && c[1] === 122 ? [122, 160, 224] : null));
  });
  def('lampiao', 16, 28, [1, 1], (p, v) => {
    // ponto de salvamento: lampião do Vô
    p.rect(6, 22, 4, 5, '#5a4a40'); p.rect(4, 26, 8, 2, '#5a4a40');
    p.rect(3, 8, 10, 14, '#3a3040'); p.rect(4, 9, 8, 12, '#ffe8a0');
    const fl = v % 2;
    p.ellipse(8, 15, 2.6, 4 - fl * 0.6, '#ffb347'); p.ellipse(8, 16, 1.2, 2, '#fff6c0');
    p.rect(2, 6, 12, 3, '#5a4a40'); p.rect(6, 3, 4, 3, '#5a4a40'); p.ring(8, 3, 2, '#5a4a40');
    p.outline(OUT);
  }, { light: 60, anim: 2 });
  def('poste', 16, 40, [1, 1], (p, v) => {
    p.rect(7, 12, 2, 27, '#4a4a58'); p.rect(5, 37, 6, 3, '#4a4a58');
    p.rect(3, 2, 10, 11, '#3a3a48'); p.rect(4, 3, 8, 9, v === 1 ? '#3a3448' : '#ffe8a0'); p.poly([[2, 3], [14, 3], [8, -2]], '#3a3a48');
    p.outline(OUT);
  }, { light: 46 });
  def('poste_rua', 16, 48, [1, 1], (p, v) => {
    p.rect(7, 6, 2, 41, '#5a5c64'); p.rect(5, 45, 6, 3, '#5a5c64'); p.rect(2, 3, 12, 4, '#4a4c54'); p.rect(3, 6, 10, 2, v === 1 ? '#5a5c64' : '#f4f0c8');
    p.outline(OUT);
  }, { light: 40 });
  def('placa', 16, 20, [1, 1], (p) => {
    p.rect(7, 10, 2, 9, woodDk); p.rect(1, 2, 14, 9, wood); p.rect(2, 3, 12, 7, woodLt); p.hline(4, 11, 5, woodDk); p.hline(4, 9, 7, woodDk);
    p.outline(OUT);
  });
  def('caixa_correio', 16, 24, [1, 1], (p, v) => {
    const c = v === 1 ? '#8a8a90' : '#d84a4a';
    p.rect(7, 12, 2, 11, '#6a5a50'); p.rect(2, 4, 12, 9, c); p.ellipse(8, 4, 6, 3, c); p.rect(4, 7, 8, 2, shade(c, -0.35));
    p.rect(13, 2, 2, 5, '#ffd86b');
    p.outline(OUT);
  });
  def('fonte', 48, 40, [3, 2], (p, v) => {
    p.ellipse(24, 26, 23, 12, '#c0b8d0'); p.ellipse(24, 25, 20, 9.5, '#7cc0ec'); p.ellipse(24, 23, 14, 5, '#a8dcf8');
    p.rect(21, 6, 6, 18, '#d6cfe0'); p.ellipse(24, 7, 8, 3, '#d6cfe0'); p.ellipse(24, 6, 6, 2, '#7cc0ec');
    const f = v % 2;
    p.set(22, 2 + f, '#e8f6ff'); p.set(26, 3 - f, '#e8f6ff'); p.set(24, 0 + f, '#ffffff'); p.set(19, 5, '#e8f6ff'); p.set(29, 5, '#e8f6ff');
    p.outline(OUT);
  }, { anim: 2 });
  def('banco', 32, 20, [2, 1], (p) => {
    p.rect(1, 4, 30, 4, wood); p.rect(1, 10, 30, 4, woodLt); p.rect(3, 14, 2, 5, '#4a4a58'); p.rect(27, 14, 2, 5, '#4a4a58');
    p.outline(OUT);
  });
  def('toalha', 32, 32, [0, 0], (p) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, ((x >> 2) + (y >> 2)) % 2 ? '#ff8a9a' : '#fff4f4');
    p.rect(20, 6, 9, 7, '#c89a60'); p.hline(20, 28, 6, '#e0b878'); p.circle(8, 22, 3, '#f4c430'); p.circle(14, 24, 2.5, '#ff6f6f');
  }, { floor: true, solid: false });
  def('poco', 32, 32, [2, 2], (p) => {
    p.ellipse(16, 22, 14, 9, '#a8a0b0'); p.ellipse(16, 20, 11, 6, '#1a1a2a');
    p.rect(3, 2, 2, 20, woodDk); p.rect(27, 2, 2, 20, woodDk); p.poly([[0, 4], [32, 4], [16, -4]], '#c86a5a');
    p.outline(OUT);
  });
  def('estatua_coruja', 16, 28, [1, 1], (p, v) => {
    const st = '#a8b0a0', sd = '#7a8478';
    p.rect(2, 20, 12, 8, sd); p.rect(1, 19, 14, 2, st);
    p.ellipse(8, 12, 6, 8, st);
    const dir = v % 4; // 0 cima,1 dir,2 baixo,3 esq
    if (dir === 2) { p.circle(5.5, 10, 2, '#e8f0a0'); p.circle(10.5, 10, 2, '#e8f0a0'); p.set(5, 10, OUT); p.set(10, 10, OUT); p.set(8, 13, '#e0a040'); }
    else if (dir === 0) { p.line(4, 8, 12, 8, sd); p.line(5, 14, 11, 14, sd); p.set(8, 4, sd); }
    else if (dir === 1) { p.circle(10.5, 10, 2, '#e8f0a0'); p.set(11, 10, OUT); p.set(13, 13, '#e0a040'); }
    else { p.circle(5.5, 10, 2, '#e8f0a0'); p.set(5, 10, OUT); p.set(3, 13, '#e0a040'); }
    p.set(4, 4, st); p.set(12, 4, st); p.set(3, 3, st); p.set(13, 3, st);
    p.outline(OUT);
  });
  def('pedra_lua', 32, 32, [2, 1], (p) => {
    p.ellipse(16, 22, 14, 9, '#8a9488'); p.ellipse(16, 20, 12, 7, '#a8b0a0');
    p.circle(16, 14, 7, '#f4f0c8'); p.circle(19, 12, 6, '#a8b0a0');
    p.outline(OUT);
  });
  def('pedregulho', 16, 18, [1, 1], (p) => {
    p.ellipse(8, 10, 7.5, 7, '#8a96a8'); p.ellipse(7, 8, 5, 4, '#a8b4c4'); p.set(5, 6, '#e8f0f8');
    p.line(9, 12, 12, 9, '#6a7486');
    p.outline(OUT);
  });
  def('placa_pressao', 16, 16, [0, 0], (p, v) => {
    p.rect(2, 2, 12, 12, v === 1 ? '#5ac0a0' : '#7a8478'); p.rect(3, 3, 10, 10, v === 1 ? '#7ae0c0' : '#9aa49a');
    p.ring(8, 8, 3, v === 1 ? '#ffffff' : '#6a7468');
  }, { floor: true, solid: false });
  def('portao', 16, 32, [1, 1], (p, v) => {
    if (v === 1) { p.rect(0, 26, 16, 4, '#4a4a58'); return; } // aberto (no chão)
    p.rect(0, 2, 16, 3, '#4a4a58');
    for (let x = 1; x < 16; x += 4) p.rect(x, 2, 2, 28, '#6a6a7a');
    p.rect(0, 14, 16, 2, '#4a4a58');
    p.outline(OUT);
  });
  def('cipos', 16, 32, [1, 1], (p) => {
    for (let x = 1; x < 16; x += 3) { p.line(x, 0, x + 1, 31, '#3f8a5a'); p.set(x + 1, 8 + (x % 5), '#5fae6a'); p.set(x, 20 - (x % 7), '#5fae6a'); }
    p.circle(4, 12, 1.4, '#f0a0c8'); p.circle(11, 22, 1.4, '#f0a0c8');
    p.outline(OUT);
  });
  def('arbusto_brilho', 16, 24, [1, 1], (p, v) => {
    p.ellipse(8, 17, 7.5, 6, '#468a55'); p.ellipse(7.5, 16, 6, 4.8, '#5fae6a');
    if (v % 2) { p.set(6, 13, '#fff6b0'); p.set(10, 16, '#ffffff'); }
    else { p.set(11, 13, '#fff6b0'); p.set(5, 17, '#ffffff'); }
    p.outline(OUT);
  }, { anim: 2 });
  def('chave', 16, 16, [0, 0], (p, v) => {
    p.ring(5, 8, 2.6, '#9ad4ff'); p.hline(7, 13, 8, '#9ad4ff'); p.vline(11, 9, 10, '#9ad4ff'); p.vline(13, 9, 11, '#9ad4ff');
    if (v % 2) p.set(4, 6, '#ffffff');
    p.outline(OUT);
  }, { floor: true, solid: false, anim: 2 });
  def('arbusto', 16, 24, [1, 1], (p) => {
    p.ellipse(8, 17, 7.5, 6, '#468a55'); p.ellipse(7.5, 16, 6, 4.8, '#5fae6a'); p.ellipse(6, 14, 2.5, 2, '#7cc47a');
    p.outline(OUT);
  });
  def('barreira', 16, 20, [1, 1], (p) => {
    p.rect(1, 6, 14, 5, '#f4f0e8'); for (let x = 1; x < 15; x += 4) p.rect(x, 6, 2, 5, '#d84a4a');
    p.rect(2, 11, 2, 8, '#8a5a38'); p.rect(12, 11, 2, 8, '#8a5a38');
    p.outline(OUT);
  });
  def('barraca', 48, 40, [3, 1], (p) => {
    p.rect(4, 16, 40, 18, '#c8a878'); p.rect(4, 24, 40, 10, '#a88858');
    for (let x = 0; x < 48; x++) p.vline(x, 4, 14, Math.floor(x / 6) % 2 ? '#8a3ad8' : '#f4f0ff');
    p.poly([[0, 14], [48, 14], [44, 4], [4, 4]], [0, 0, 0, 0]);
    p.rect(2, 4, 2, 30, woodDk); p.rect(44, 4, 2, 30, woodDk);
    p.rect(10, 18, 6, 5, '#ff8a9a'); p.rect(20, 18, 6, 5, '#e8504a'); p.rect(30, 18, 6, 5, '#f4f0f0');
    p.outline(OUT);
  });
  def('pneu', 16, 32, [1, 1], (p) => {
    p.line(8, 0, 8, 14, '#c8b48a'); p.ring(8, 20, 6, '#2a2a30', 3);
    p.outline(OUT);
  });
  def('carro', 48, 32, [3, 1], (p) => {
    p.rect(1, 12, 46, 14, '#7a7a88'); p.rect(8, 4, 28, 10, '#6a6a78'); p.rect(10, 6, 11, 7, '#3a3c48'); p.rect(23, 6, 11, 7, '#3a3c48');
    p.circle(10, 26, 5, '#2a2a30'); p.circle(38, 26, 5, '#2a2a30'); p.circle(10, 26, 2, '#8a8a90'); p.circle(38, 26, 2, '#8a8a90');
    p.outline(OUT);
  });
  def('lixeira', 16, 22, [1, 1], (p) => {
    p.rect(3, 6, 10, 15, '#6a7a6e'); p.rect(2, 4, 12, 3, '#5a6a5e'); p.vline(6, 8, 19, '#5a6a5e'); p.vline(10, 8, 19, '#5a6a5e');
    p.outline(OUT);
  });
  def('tv', 16, 24, [1, 1], (p, v) => {
    p.rect(1, 4, 14, 12, '#3a3a40'); p.rect(2, 5, 12, 10, v % 2 ? '#c8c8d0' : '#9a9aa8');
    const r = R.U.rng(v * 7 + 1); for (let i = 0; i < 20; i++) p.set(2 + ((r() * 12) | 0), 5 + ((r() * 10) | 0), r() < 0.5 ? '#ffffff' : '#5a5a62');
    p.rect(4, 16, 8, 6, woodDk); p.line(6, 4, 4, 0, '#3a3a40'); p.line(10, 4, 12, 0, '#3a3a40');
    p.outline(OUT);
  }, { anim: 2 });
  def('monitor', 16, 28, [1, 1], (p, v) => {
    p.rect(7, 14, 2, 12, '#8a9098'); p.rect(4, 25, 8, 3, '#8a9098');
    p.rect(1, 2, 14, 12, '#3a4048'); p.rect(2, 3, 12, 10, '#0a1a14');
    const k = v % 4;
    for (let x = 2; x < 14; x++) { const y = (x === 6 + k || x === 7 + k) ? 4 + ((x - k) % 2) * 6 : 8; p.set(x, y, '#5af0a0'); }
    p.outline(OUT);
  }, { anim: 4, light: 20 });
  def('janela', 16, 16, [0, 0], (p, v) => {
    const night = v === 1;
    p.rect(1, 2, 14, 12, '#f4f0e8'); p.rect(2, 3, 12, 10, night ? '#1a1838' : '#a8d8f0');
    if (night) { p.set(5, 6, '#ffffff'); p.set(10, 5, '#fff6b0'); } else p.line(3, 11, 7, 4, '#e8f6ff');
    p.vline(8, 3, 12, '#f4f0e8'); p.hline(2, 13, 8, '#f4f0e8');
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('quadro', 16, 16, [0, 0], (p, v) => {
    p.rect(2, 2, 12, 11, '#c89a40'); p.rect(3, 3, 10, 9, ['#a8d8f0', '#f4e8d0', '#e8d0f0', '#2a2a3a'][v % 4]);
    if (v % 4 === 0) { p.circle(8, 9, 3, '#5fae6a'); p.rect(3, 10, 10, 2, '#5fae6a'); }
    if (v % 4 === 1) { p.rect(5, 6, 6, 5, '#d86a5a'); p.poly([[4, 6], [12, 6], [8, 3]], '#8a5a3a'); }
    if (v % 4 === 2) { p.circle(6, 7, 2, '#f2c9a0'); p.circle(10, 7, 2, '#d9a87e'); p.rect(4, 9, 8, 3, '#3f5f8a'); }
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('desenho', 16, 16, [0, 0], (p, v) => {
    p.rect(2, 1, 12, 13, '#fffaf0'); p.set(2, 1, '#e8504a');
    p.rect(3, 9, 10, 3, '#9bd68a');
    p.rect(10, 3, 2, 6, '#d84a4a'); p.set(10, 2, v === 1 ? '#3a3448' : '#ffd86b'); p.set(11, 2, v === 1 ? '#3a3448' : '#ffd86b');
    [[4, '#f4c430'], [6, '#e8603c'], [8, '#e98a3a']].forEach(([x, c]) => { p.set(x, 7, '#2a2440'); p.set(x, 8, c); });
    p.set(7, 4, '#ffffff'); p.set(5, 3, '#ffffff');
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('calendario', 16, 16, [0, 0], (p) => {
    p.rect(3, 1, 10, 13, '#fffaf0'); p.rect(3, 1, 10, 3, '#d84a4a');
    for (let y = 6; y < 13; y += 2) for (let x = 4; x < 12; x += 2) p.set(x, y, '#9a9aa8');
    p.ring(8, 10, 2, '#d84a4a');
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('foto', 16, 16, [0, 0], (p) => {
    p.rect(3, 3, 10, 9, '#f4f0e8'); p.rect(4, 4, 8, 6, '#7cc0ec'); p.rect(4, 8, 8, 2, '#5a7ad0'); p.rect(6, 6, 5, 2, '#c87a3a'); p.set(7, 5, '#f2c9a0'); p.set(9, 5, '#d9a87e');
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('poster', 16, 16, [0, 0], (p, v) => {
    p.rect(2, 1, 12, 14, ['#ff8a8a', '#7cc0ec', '#c8a0e8'][v % 3]); p.circle(8, 6, 3, '#fff6b0'); p.hline(4, 11, 11, '#ffffff'); p.hline(5, 10, 13, '#ffffff');
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('pipa_parede', 16, 16, [0, 0], (p) => {
    p.poly([[8, 1], [14, 7], [8, 13], [2, 7]], '#e8504a'); p.line(8, 1, 8, 13, '#ffd86b'); p.line(2, 7, 14, 7, '#ffd86b'); p.line(8, 13, 10, 15, '#ffffff');
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('escrivaninha', 32, 24, [2, 1], (p, v) => {
    p.rect(1, 4, 30, 10, wood); p.hline(1, 30, 4, woodLt); p.rect(1, 14, 30, 2, woodDk); p.rect(2, 16, 3, 7, woodDk); p.rect(27, 16, 3, 7, woodDk);
    p.rect(20, 5, 8, 8, woodDk); p.set(24, 9, '#ffd86b');
    if (v !== 1) { p.rect(5, 0, 6, 6, '#c89a40'); p.ellipse(8, 3, 2, 2.5, '#ffe8a0'); } // lamparina sobre a mesa
    p.rect(13, 6, 5, 4, '#fffaf0');
    p.outline(OUT);
  });
  def('fogao', 16, 28, [1, 1], (p) => {
    p.rect(0, 8, 16, 20, '#e8e8ec'); p.rect(1, 9, 14, 3, '#3a3a40'); p.circle(4, 10, 1.5, '#5a5a62'); p.circle(11, 10, 1.5, '#5a5a62');
    p.rect(2, 14, 12, 10, '#c8c8d0'); p.hline(3, 12, 15, '#9a9aa8'); p.rect(4, 3, 8, 6, '#9a9aa8'); p.ellipse(8, 3, 4, 1.5, '#7a7a88');
    p.outline(OUT);
  });
  def('geladeira', 16, 32, [1, 1], (p) => {
    p.rect(1, 0, 14, 32, '#f0f0f4'); p.hline(1, 14, 11, '#b8b8c0'); p.vline(12, 3, 8, '#9a9aa8'); p.vline(12, 14, 20, '#9a9aa8');
    p.rect(3, 15, 5, 6, '#fffaf0'); p.set(4, 16, '#d84a4a');
    p.outline(OUT);
  });
  def('sofa', 32, 24, [2, 1], (p, v) => {
    const c = v === 1 ? '#7a7a88' : '#c86a7a';
    p.rect(0, 4, 32, 10, shade(c, -0.15)); p.rect(2, 10, 28, 8, c); p.rect(0, 8, 4, 12, shade(c, -0.1)); p.rect(28, 8, 4, 12, shade(c, -0.1));
    p.rect(2, 20, 2, 3, woodDk); p.rect(28, 20, 2, 3, woodDk);
    p.outline(OUT);
  });
  def('bancada', 32, 24, [2, 1], (p) => {
    p.rect(0, 6, 32, 6, '#8a8a92'); p.rect(0, 12, 32, 10, '#6a6a72'); p.hline(0, 31, 6, '#aaaab2');
    p.circle(8, 4, 3, '#c9a24a'); p.set(8, 4, '#6a6a72'); p.rect(16, 2, 10, 3, '#5a5a62'); p.rect(14, 1, 3, 5, '#b85a3a');
    p.outline(OUT);
  });
  def('engrenagens', 16, 20, [1, 1], (p) => {
    p.circle(6, 13, 5, '#9aa0a8'); p.circle(6, 13, 2, '#6a7078'); p.circle(12, 8, 3.5, '#c9a24a'); p.circle(12, 8, 1.2, '#8a6a2a');
    for (const [x, y] of [[6, 7], [1, 13], [11, 13], [6, 18]]) p.set(x, y, '#9aa0a8');
    p.outline(OUT);
  });
  def('atril', 16, 24, [1, 1], (p) => {
    p.rect(7, 10, 2, 12, woodDk); p.rect(4, 21, 8, 2, woodDk); p.poly([[1, 4], [15, 4], [13, 11], [3, 11]], wood);
    p.rect(3, 5, 10, 5, '#fffaf0'); p.vline(8, 5, 9, '#c8b8a0');
    p.outline(OUT);
  });
  def('globo', 16, 24, [1, 1], (p) => {
    p.rect(7, 14, 2, 8, woodDk); p.rect(4, 21, 8, 2, woodDk); p.circle(8, 8, 6, '#7cc0ec'); p.ellipse(6, 7, 3, 2, '#7cc47a'); p.ellipse(10, 11, 2, 1.5, '#7cc47a'); p.ring(8, 8, 7, '#c89a40');
    p.outline(OUT);
  });
  def('cesto_la', 16, 18, [1, 1], (p) => {
    p.rect(2, 8, 12, 9, '#c89a60'); for (let x = 3; x < 14; x += 3) p.vline(x, 9, 16, '#a07848');
    p.circle(5, 7, 3, '#ff9fc4'); p.circle(10, 6, 3, '#9ad4ff'); p.circle(8, 4, 2.5, '#fff1a8');
    p.outline(OUT);
  });
  def('vela_grande', 16, 24, [1, 1], (p, v) => {
    p.rect(4, 10, 8, 12, '#f4ead2'); p.rect(3, 21, 10, 2, '#c79a3e'); p.set(4, 12, '#f4ead2');
    p.ellipse(8, 6 + (v % 2) * 0.5, 2.2, 3.5, '#ffb347'); p.ellipse(8, 7, 1, 1.8, '#fff2a8');
    p.outline(OUT);
  }, { light: 40, anim: 2 });
  def('pedestal', 16, 24, [1, 1], (p, v) => {
    p.rect(3, 10, 10, 13, '#c8b8a0'); p.rect(2, 8, 12, 3, '#e8dcc8'); p.rect(2, 21, 12, 2, '#9a8a74');
    if (v >= 1) { const c = ['#5fae6a', '#5aa8e8', '#c8a0e8'][v - 1] || '#ffb347'; p.ellipse(8, 5, 3, 4, c); p.ellipse(8, 5, 1.5, 2, '#ffffff'); }
    else p.ellipse(8, 8, 3, 1.2, '#3a3040');
    p.outline(OUT);
  }, { lightIfVariant: 30 });
  def('lampada_farol', 48, 48, [3, 2], (p, v) => {
    const lit = v === 1;
    p.rect(8, 30, 32, 16, '#5a5068'); p.rect(10, 32, 28, 4, '#7a7088');
    p.circle(24, 18, 15, lit ? '#fff6c0' : '#3a3448'); p.circle(24, 18, 11, lit ? '#ffffff' : '#4a4458'); p.ring(24, 18, 15, '#8a8098', 2);
    for (let a = 0; a < 6; a++) p.line(24, 18, 24 + Math.round(Math.cos(a) * 11), 18 + Math.round(Math.sin(a) * 11), lit ? '#ffe08a' : '#5a5468');
    p.outline(OUT);
  }, { lightIfVariant: 120 });
  def('escada_desce', 16, 16, [0, 0], (p) => {
    p.fill('#2a2030'); for (let y = 2; y < 16; y += 4) { p.hline(1, 14, y, '#6a5a70'); p.hline(1, 14, y + 1, '#4a3a50'); }
  }, { floor: true, solid: false });
  def('alcapao', 16, 16, [0, 0], (p, v) => {
    if (v === 1) { p.rect(1, 1, 14, 14, '#120c18'); p.rect(1, 1, 14, 2, '#8a5a38'); return; }
    p.rect(1, 1, 14, 14, '#8a5a38'); for (let x = 4; x < 16; x += 4) p.vline(x, 1, 14, '#6a4028'); p.ring(8, 8, 2, '#c9a24a');
  }, { floor: true, solid: false });
  def('tapete_redondo', 32, 24, [0, 0], (p, v) => {
    const c = ['#c8506a', '#5a7ad0', '#5aa070', '#d8a040'][v % 4];
    p.ellipse(16, 12, 15, 10, shade(c, -0.15)); p.ellipse(16, 12, 12.5, 8, c); p.ellipse(16, 12, 7, 4, shade(c, 0.25));
  }, { floor: true, solid: false });
  def('barco', 48, 24, [3, 1], (p) => {
    p.poly([[0, 6], [48, 6], [40, 20], [8, 20]], '#a86a40'); p.hline(0, 47, 6, '#d09a6a'); p.hline(6, 42, 12, '#8a5a38');
    p.rect(22, 0, 2, 7, '#6a4a30');
    p.outline(OUT);
  });
  def('varas_pesca', 16, 32, [1, 1], (p) => {
    p.line(3, 31, 6, 0, '#8a6a4a'); p.line(8, 31, 9, 2, '#8a6a4a'); p.line(12, 31, 13, 4, '#8a6a4a'); p.line(6, 0, 4, 10, '#e8e8e8');
    p.rect(1, 26, 14, 5, '#5a7a9a');
    p.outline(OUT);
  });
  def('flor_gigante', 32, 40, [1, 1], (p, v) => {
    const c = ['#ff9fc8', '#9ad4ff', '#fff1a8', '#c8a8ff'][v % 4];
    p.rect(15, 18, 3, 21, '#7cc47a'); p.ellipse(10, 28, 5, 2.5, '#7cc47a'); p.ellipse(22, 24, 5, 2.5, '#7cc47a');
    for (let a = 0; a < 6; a++) p.circle(16 + Math.cos(a * 1.047) * 7, 12 + Math.sin(a * 1.047) * 7, 5, c);
    p.circle(16, 12, 4.5, '#ffd86b'); p.set(15, 11, '#fff6b0');
    p.outline(OUT);
  });
  def('nuvem_algodao', 32, 24, [2, 1], (p) => {
    for (const [x, y, r] of [[8, 14, 7], [16, 10, 9], [24, 14, 7], [16, 16, 8]]) p.circle(x, y, r, '#fbe3ef');
    p.circle(13, 8, 3, '#ffffff');
    p.outline(OUT);
  });
  def('ninho', 16, 16, [0, 0], (p) => {
    p.ellipse(8, 10, 7, 4, '#a07848'); p.ellipse(8, 9, 5, 2.5, '#6a4a30'); p.circle(6, 8, 1.6, '#f4f0e8'); p.circle(10, 8, 1.6, '#f4f0e8');
  }, { floor: true, solid: false });
  def('pegadas', 16, 16, [0, 0], (p, v) => {
    const c = [90, 120, 170, 140];
    if (v % 2) { p.ellipse(5, 5, 1.6, 2.4, c); p.ellipse(10, 11, 1.6, 2.4, c); }
    else { p.ellipse(10, 4, 1.6, 2.4, c); p.ellipse(5, 10, 1.6, 2.4, c); }
  }, { floor: true, solid: false });
  def('papel', 16, 16, [0, 0], (p) => {
    p.poly([[4, 5], [12, 4], [13, 12], [5, 13]], '#fffaf0'); p.hline(6, 11, 7, '#9a9aa8'); p.hline(6, 10, 9, '#9a9aa8');
    p.outline(OUT);
  }, { floor: true, solid: false });
  def('engrenagem_chao', 16, 16, [0, 0], (p, v) => {
    p.circle(8, 9, 4, '#c9a24a'); p.circle(8, 9, 1.5, '#7a5a20'); [[8, 4], [3, 9], [13, 9], [8, 14]].forEach(([x, y]) => p.set(x, y, '#c9a24a'));
    if (v % 2) p.set(6, 6, '#ffffff');
    p.outline(OUT);
  }, { floor: true, solid: false, anim: 2 });
  def('pipa_arvore', 32, 40, [1, 1], (p) => {
    // árvore de pirulito com pipa presa
    p.rect(15, 20, 3, 18, '#f6f0f4'); p.circle(16, 13, 11, '#ff9fc8'); p.ring(16, 13, 8, '#ffc6e0', 2);
    p.poly([[22, 2], [28, 8], [22, 14], [16, 8]], '#e8504a'); p.line(22, 2, 22, 14, '#ffd86b'); p.line(22, 14, 26, 20, '#ffffff');
    p.outline(OUT);
  });
  def('manequim_vitrine', 16, 28, [1, 1], (p) => {
    p.rect(7, 22, 2, 5, '#8a7a6a'); p.rect(4, 26, 8, 2, '#8a7a6a'); p.ellipse(8, 14, 4, 7, '#e9ddc9'); p.circle(8, 5, 3.5, '#e9ddc9');
    p.line(6, 6, 7, 7, '#c0392b'); p.line(9, 7, 10, 6, '#c0392b');
    p.outline(OUT);
  });
  def('telefone_parede', 16, 16, [0, 0], (p) => {
    p.rect(4, 3, 8, 10, '#e8e0d0'); p.rect(5, 2, 6, 3, '#3a3a40'); p.rect(6, 7, 4, 4, '#9a9aa8');
    p.outline(OUT);
  }, { wall: true, solid: false });
  def('pia', 16, 24, [1, 1], (p) => {
    p.rect(0, 8, 16, 16, '#e8e8ec'); p.rect(2, 9, 12, 4, '#a8c8e0'); p.rect(7, 4, 2, 5, '#9a9aa8'); p.hline(5, 10, 4, '#9a9aa8');
    p.vline(8, 14, 22, '#c8c8d0');
    p.outline(OUT);
  });
  def('caixa_registradora', 16, 16, [0, 0], (p) => {
    p.rect(2, 6, 12, 8, '#7a828e'); p.rect(3, 3, 10, 4, '#5a5a62'); p.rect(4, 4, 8, 2, '#8af0a0'); p.rect(4, 8, 8, 4, '#9aa0a8');
    p.outline(OUT);
  }, { solid: false });
  def('paes', 16, 16, [0, 0], (p) => {
    p.ellipse(5, 9, 4, 2.5, '#d8a050'); p.ellipse(11, 10, 4, 2.5, '#c88a40'); p.ellipse(8, 6, 3.5, 2.2, '#e8b868'); p.set(7, 5, '#f8e0a0');
    p.outline(OUT);
  }, { solid: false });

  R.Tiles.PROPS = PROPS;
  R.Tiles.prop = function (id, v) {
    const d = PROPS[id];
    if (!d) return null;
    return cached('prop|' + id + '|' + (v || 0), () => {
      const p = new PA(d.w, d.h);
      d.draw(p, v || 0);
      return p.toCanvas();
    });
  };
  R.Tiles.clearCache = () => cache.clear();
  void col; void mix; void WATERISH; void PATHISH; void WALLISH;
})();
