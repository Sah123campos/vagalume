/* VAGALUME — arte procedural dos inimigos e chefes (sprites de batalha).
 * Cada inimigo tem dois quadros: normal e piscando. */
(function () {
  'use strict';
  const R = window.RPG;
  const { PA, shade } = R.Pixel;
  const OUT = '#2a1d33';
  const EYE = '#1e1626';

  function eyes(p, x1, x2, y, blink, opts = {}) {
    const r = opts.r || 2;
    for (const x of [x1, x2]) {
      if (blink) { p.hline(x - r, x + r, y, EYE); continue; }
      if (opts.white) { p.circle(x, y, r + 1.2, '#ffffff'); p.circle(x + (opts.look || 0), y, r - 0.4, EYE); }
      else p.ellipse(x, y, r * 0.7, r, EYE);
      p.set(Math.round(x - r * 0.4), Math.round(y - r * 0.5), '#ffffff');
    }
  }
  function brows(p, x1, x2, y, kind, c = EYE) {
    if (kind === 'angry') { p.line(x1 - 3, y - 2, x1 + 2, y + 1, c); p.line(x2 + 3, y - 2, x2 - 2, y + 1, c); }
    if (kind === 'sad') { p.line(x1 - 3, y + 1, x1 + 2, y - 2, c); p.line(x2 + 3, y + 1, x2 - 2, y - 2, c); }
  }

  const E = {};
  E.pirulinho = (b) => {
    const p = new PA(48, 52);
    p.rect(22, 30, 4, 14, '#f6f0f4'); p.vline(25, 30, 43, '#d8ccd8');
    p.rect(17, 43, 5, 4, '#e86a9a'); p.rect(26, 43, 5, 4, '#e86a9a');
    p.circle(24, 18, 15, '#ff8fb8');
    p.ring(24, 18, 12, '#ffffff', 2); p.ring(24, 18, 7, '#ffffff', 2); p.circle(24, 18, 2.5, '#ffffff');
    p.line(14, 32, 8, 26, '#f6f0f4'); p.line(34, 32, 40, 26, '#f6f0f4');
    p.outline(OUT);
    p.ellipse(24, 21, 8, 6, '#ffc6e0');
    eyes(p, 20, 28, 20, b);
    p.line(21, 24, 24, 26, '#7a1f3a'); p.line(24, 26, 27, 24, '#7a1f3a');
    p.set(17, 23, [240, 110, 130, 200]); p.set(31, 23, [240, 110, 130, 200]);
    return p;
  };
  E.abelhao = (b) => {
    const p = new PA(52, 48);
    const W = new PA(52, 48);
    W.ellipse(16, 12, 8, 6, '#e8f6ff'); W.ellipse(34, 10, 9, 7, '#e8f6ff'); W.outline(OUT);
    p.draw(W);
    for (const [x, y, r] of [[26, 26, 14], [16, 24, 7], [36, 24, 7], [26, 34, 9], [20, 16, 6], [32, 16, 6]]) p.circle(x, y, r, '#fbf4f8');
    p.rect(14, 22, 24, 4, '#f4c430'); p.rect(16, 31, 20, 4, '#f4c430');
    p.poly([[40, 34], [48, 38], [40, 40]], '#5a4a40');
    p.outline(OUT);
    eyes(p, 21, 31, 18, b, { r: 2.4 });
    p.line(24, 21, 26, 22, EYE); p.line(26, 22, 28, 21, EYE);
    p.line(22, 6, 19, 1, OUT); p.line(30, 6, 33, 1, OUT); p.set(19, 1, '#f4c430'); p.set(33, 1, '#f4c430');
    return p;
  };
  E.nuvenzinha = (b) => {
    const p = new PA(52, 48);
    for (const [x, y, r] of [[26, 20, 12], [14, 24, 8], [38, 24, 8], [20, 14, 8], [32, 13, 9], [26, 27, 10]]) p.circle(x, y, r, '#b8c8e0');
    p.circle(18, 13, 3, '#dce6f4');
    p.outline(OUT);
    eyes(p, 20, 32, 22, b, { r: 2 });
    brows(p, 20, 32, 17, 'sad');
    p.line(23, 28, 26, 27, EYE); p.line(26, 27, 29, 28, EYE);
    for (const [x, y] of [[14, 38], [24, 42], [34, 39], [19, 45]]) { p.vline(x, y, y + 2, '#6aa6f0'); p.set(x, y + 3, '#9fd4ff'); }
    if (!b) { p.set(19, 25, '#9fd4ff'); p.set(19, 26, '#9fd4ff'); }
    return p;
  };
  E.cogumelo = (b) => {
    const p = new PA(48, 52);
    p.rect(16, 26, 16, 20, '#f4ead2'); p.ellipse(24, 46, 10, 3, '#e4d8bc');
    p.line(16, 34, 10, 38, '#f4ead2'); p.line(32, 34, 38, 38, '#f4ead2');
    p.ellipse(24, 20, 21, 12, '#d0506a'); p.ellipse(24, 26, 19, 4, '#a83a50');
    for (const [x, y, r] of [[14, 15, 3], [26, 11, 3.5], [35, 18, 2.6], [20, 21, 2]]) p.circle(x, y, r, '#fff4f0');
    p.rect(19, 44, 4, 4, '#c8b89a'); p.rect(26, 44, 4, 4, '#c8b89a');
    p.outline(OUT);
    eyes(p, 20, 28, 33, b, { r: 1.8 });
    brows(p, 20, 28, 29, 'angry');
    p.hline(21, 27, 38, EYE); p.set(20, 39, EYE);
    return p;
  };
  E.raposa = (b) => {
    const p = new PA(56, 48);
    p.poly([[36, 30], [54, 18], [52, 34], [40, 40]], '#5fae6a');
    p.poly([[42, 28], [52, 22], [50, 30]], '#7cc47a');
    p.ellipse(28, 32, 13, 9, '#e8823a');
    p.rect(19, 38, 4, 8, '#c86a2a'); p.rect(32, 38, 4, 8, '#c86a2a');
    p.circle(16, 22, 10, '#e8823a');
    p.poly([[8, 16], [9, 4], [15, 13]], '#e8823a'); p.poly([[17, 13], [22, 3], [24, 15]], '#e8823a');
    p.poly([[4, 26], [14, 22], [14, 30]], '#f4f0e8');
    p.outline(OUT);
    p.set(5, 26, EYE); p.set(6, 26, EYE);
    for (let i = 0; i < 4; i++) p.set(26 + i * 4, 28 + (i % 2), '#5fae6a');
    if (b) { p.hline(13, 16, 20, EYE); p.hline(19, 22, 20, EYE); }
    else { p.line(13, 19, 16, 21, EYE); p.line(22, 19, 19, 21, EYE); p.set(15, 21, EYE); p.set(20, 21, EYE); }
    p.line(10, 27, 14, 28, EYE);
    return p;
  };
  E.coruja = (b) => {
    const p = new PA(48, 52);
    p.ellipse(24, 30, 15, 18, '#8a6ab8'); p.ellipse(24, 34, 9, 12, '#c8b0e8');
    p.poly([[11, 14], [14, 4], [19, 13]], '#8a6ab8'); p.poly([[37, 14], [34, 4], [29, 13]], '#8a6ab8');
    p.ellipse(10, 32, 4, 9, '#6a4a98'); p.ellipse(38, 32, 4, 9, '#6a4a98');
    p.rect(17, 46, 4, 4, '#e0a040'); p.rect(27, 46, 4, 4, '#e0a040');
    p.outline(OUT);
    for (const x of [18, 30]) { p.circle(x, 21, 6, '#fff6d0'); p.ring(x, 21, 6, '#5a3a88'); p.ring(x, 22.5, 6.5, '#3a2a58'); }
    if (b) { p.hline(14, 22, 21, EYE); p.hline(26, 34, 21, EYE); }
    else { p.circle(18, 21, 2.6, EYE); p.circle(30, 21, 2.6, EYE); p.set(17, 20, '#fff'); p.set(29, 20, '#fff'); }
    p.poly([[22, 27], [26, 27], [24, 31]], '#e0a040');
    for (let i = 0; i < 3; i++) p.line(19 + i * 4, 37, 21 + i * 4, 39, '#9a7ac8');
    return p;
  };
  E.peixe_lanterna = (b) => {
    const p = new PA(56, 48);
    p.line(22, 16, 30, 4, '#4a5a7a'); p.line(30, 4, 36, 6, '#4a5a7a');
    p.ellipse(28, 28, 20, 14, '#2a3a6a');
    p.poly([[46, 28], [56, 18], [56, 38]], '#2a3a6a');
    p.ellipse(26, 33, 14, 6, '#3a4e86');
    p.poly([[24, 16], [32, 10], [34, 17]], '#3a4e86');
    p.outline('#0a0c1a');
    p.circle(37, 8, 3.5, '#fff6b0'); p.circle(37, 8, 1.6, '#ffffff');
    p.circle(17, 24, 4.5, '#e8e8f8'); p.circle(17, 24, b ? 0.6 : 2.2, EYE);
    if (b) p.hline(13, 21, 24, EYE);
    p.poly([[8, 32], [22, 30], [22, 36], [10, 38]], '#0a0c1a');
    for (let x = 10; x < 22; x += 3) { p.set(x, 32, '#ffffff'); p.set(x + 1, 37, '#ffffff'); }
    return p;
  };
  E.caranguejo = (b) => {
    const p = new PA(52, 48);
    p.ellipse(26, 30, 16, 10, '#f4f0f8'); p.rect(10, 22, 32, 8, '#f4f0f8'); p.ellipse(26, 22, 16, 4, '#e0d8ec');
    p.ellipse(26, 22, 13, 3, '#a87050');
    p.ring(44, 28, 4, '#f4f0f8', 2);
    for (let x = 12; x < 40; x += 6) p.set(x, 32, '#8ab0e0');
    p.ellipse(26, 40, 13, 3, '#f4f0f8');
    p.ellipse(10, 16, 6, 5, '#e85a4a'); p.ellipse(42, 14, 7, 6, '#e85a4a');
    p.line(10, 10, 6, 8, '#e85a4a'); p.line(42, 7, 46, 4, '#e85a4a');
    p.line(14, 21, 8, 20, '#e85a4a'); p.line(38, 21, 44, 19, '#e85a4a');
    p.outline(OUT);
    p.vline(22, 12, 18, '#e85a4a'); p.vline(30, 12, 18, '#e85a4a');
    p.circle(22, 11, 2.4, '#ffffff'); p.circle(30, 11, 2.4, '#ffffff');
    if (!b) { p.set(22, 11, EYE); p.set(30, 11, EYE); } else { p.hline(20, 24, 11, EYE); p.hline(28, 32, 11, EYE); }
    return p;
  };
  E.medusa = (b) => {
    const p = new PA(48, 56);
    for (let i = 0; i < 5; i++) {
      const x = 12 + i * 6;
      for (let y = 28; y < 52; y++) p.set(x + Math.round(Math.sin(y * 0.4 + i) * 1.5), y, [120, 190, 255, 200]);
    }
    p.poly([[24, 2], [40, 22], [36, 30], [12, 30], [8, 22]], [140, 200, 255, 220]);
    p.ellipse(24, 22, 16, 9, [140, 200, 255, 220]);
    p.ellipse(20, 15, 5, 3, [230, 245, 255, 230]);
    p.outline('#1a3a6a');
    eyes(p, 19, 29, 23, b, { r: 1.8 });
    brows(p, 19, 29, 19, 'sad', '#1a3a6a');
    if (!b) { p.vline(19, 26, 30, '#ffffff'); }
    return p;
  };
  E.rabisco = (b) => {
    const p = new PA(52, 56);
    const r = R.U.rng(b ? 7 : 3);
    for (let i = 0; i < 46; i++) {
      const x0 = 10 + r() * 32, y0 = 6 + r() * 44;
      p.line(x0, y0, x0 + (r() - 0.5) * 18, y0 + (r() - 0.5) * 18, r() < 0.8 ? '#16121e' : '#3a3448');
    }
    p.ellipse(26, 26, 13, 18, [22, 18, 30, 200]);
    p.circle(20, 20, 3, '#ffffff'); p.circle(31, 21, 2.4, '#ffffff');
    if (!b) { p.set(20, 20, '#d84a4a'); p.set(31, 21, '#d84a4a'); }
    p.line(19, 33, 33, 31, '#ffffff');
    return p;
  };
  E.manequim = (b) => {
    const p = new PA(44, 64);
    p.rect(20, 50, 4, 10, '#8a7a6a'); p.ellipse(22, 61, 9, 3, '#6a5a4a');
    p.ellipse(22, 36, 12, 16, '#e9ddc9');
    p.line(10, 26, 4, 44, '#e9ddc9'); p.line(34, 26, 40, 44, '#e9ddc9');
    p.rect(19, 18, 6, 5, '#d8cab4');
    p.circle(22, 12, 9, '#e9ddc9');
    p.hline(12, 32, 36, '#d0c2ac');
    p.outline(OUT);
    p.ellipse(18, 10, 1.4, b ? 0.4 : 1.6, EYE); p.ellipse(26, 10, 1.4, b ? 0.4 : 1.6, EYE);
    p.line(16, 15, 19, 17, '#c0392b'); p.hline(19, 25, 17, '#c0392b'); p.line(25, 17, 28, 15, '#c0392b');
    p.set(15, 13, [240, 130, 140, 160]); p.set(29, 13, [240, 130, 140, 160]);
    return p;
  };
  E.tv_estatica = (b) => {
    const p = new PA(52, 52);
    p.line(18, 10, 12, 0, '#3a3a40'); p.line(30, 10, 38, 1, '#3a3a40');
    p.rect(6, 10, 40, 30, '#6a5a50'); p.rect(9, 13, 30, 24, '#2a2a30');
    p.rect(40, 16, 4, 4, '#c8c8d0'); p.rect(40, 24, 4, 4, '#c8c8d0');
    p.rect(12, 40, 4, 8, '#3a3a40'); p.rect(36, 40, 4, 8, '#3a3a40');
    p.outline(OUT);
    const r = R.U.rng(b ? 11 : 5);
    for (let i = 0; i < 260; i++) p.set(10 + ((r() * 28) | 0), 14 + ((r() * 22) | 0), r() < 0.5 ? '#e8e8f0' : '#7a7a88');
    if (!b) { p.rect(16, 20, 4, 4, '#ffffff'); p.rect(28, 20, 4, 4, '#ffffff'); p.hline(17, 31, 30, '#ffffff'); }
    return p;
  };
  E.gaivota = (b) => {
    const p = new PA(56, 48);
    p.poly([[4, 18], [26, 22], [20, 28]], '#e8ecf0'); p.poly([[52, 12], [30, 22], [36, 28]], '#e8ecf0');
    p.line(4, 18, 14, 20, '#7a8a9a'); p.line(52, 12, 44, 16, '#7a8a9a');
    p.ellipse(28, 28, 11, 9, '#f4f6f8'); p.circle(24, 18, 6, '#f4f6f8');
    p.poly([[16, 18], [10, 21], [17, 21]], '#f4c430');
    p.rect(24, 36, 2, 7, '#e8a040'); p.rect(30, 36, 2, 7, '#e8a040');
    p.outline(OUT);
    if (b) p.hline(20, 24, 16, EYE); else { p.circle(22, 16, 1.6, '#ffffff'); p.set(22, 16, EYE); }
    p.line(19, 13, 25, 15, EYE);
    return p;
  };
  E.sombra = (b) => {
    const p = new PA(40, 72);
    p.ellipse(20, 12, 8, 10, '#14101e');
    p.poly([[12, 18], [28, 18], [32, 70], [8, 70]], '#14101e');
    p.line(12, 22, 2, 52, '#14101e'); p.line(28, 22, 38, 52, '#14101e');
    p.line(14, 24, 13, 62, '#262036');
    p.outline('#05040b');
    if (!b) { p.set(17, 11, '#e8e6ff'); p.set(23, 11, '#e8e6ff'); }
    return p;
  };
  E.brotinho = (b) => {
    const p = new PA(36, 40);
    p.rect(16, 18, 4, 16, '#7cc47a');
    p.ellipse(10, 16, 8, 4, '#7cc47a'); p.ellipse(26, 13, 8, 4, '#9bd68a');
    p.ellipse(18, 33, 10, 5, '#8a5f42');
    p.outline(OUT);
    eyes(p, 15, 21, 27, b, { r: 1.4 });
    return p;
  };
  E.isca = (b) => {
    const p = new PA(32, 48);
    p.line(16, 47, 14, 20, '#4a5a7a'); p.line(14, 20, 16, 14, '#4a5a7a');
    p.circle(16, 9, 8, b ? '#ffe08a' : '#fff6b0');
    p.circle(16, 9, 4, '#ffffff');
    p.outline('#0a0c1a');
    return p;
  };

  // ---------------------------------------------------------------- chefes
  E.mamae_raiz = (b, v) => {
    const p = new PA(120, 104);
    const bark = '#8a5f42', barkD = '#6a4630', barkL = '#a8784f';
    // raízes
    for (const [x0, x1] of [[20, 4], [36, 22], [84, 98], [98, 116], [60, 60]]) p.line(60, 92, x1, 102, barkD), p.line(x0 + 20, 90, x1, 102, barkD);
    p.ellipse(60, 96, 46, 7, barkD);
    // tronco-corpo
    p.poly([[32, 96], [88, 96], [80, 36], [40, 36]], bark);
    for (let x = 42; x < 80; x += 7) p.line(x, 40, x - 2, 94, barkD);
    p.line(46, 50, 48, 60, barkL); p.line(72, 46, 70, 70, barkL);
    // braços galho
    p.line(42, 52, 14, 34, bark); p.line(43, 53, 15, 35, bark); p.line(14, 34, 6, 22, bark); p.line(14, 34, 4, 38, bark);
    p.line(78, 52, 106, 34, bark); p.line(77, 53, 105, 35, bark); p.line(106, 34, 114, 22, bark); p.line(106, 34, 116, 40, bark);
    // copa / coroa
    for (const [x, y, r] of [[60, 22, 26], [36, 28, 14], [84, 28, 14], [48, 12, 12], [72, 12, 12]]) p.circle(x, y, r, '#3f9470');
    for (const [x, y, r] of [[58, 18, 20], [38, 24, 9], [82, 24, 9]]) p.circle(x, y, r, '#5fae6a');
    for (const [x, y] of [[44, 14], [66, 8], [80, 20], [36, 26], [58, 26]]) { p.circle(x, y, 2.5, v === 'irritada' ? '#e8504a' : '#ff9fc8'); p.set(x, y, '#ffe08a'); }
    p.outline(OUT);
    // rosto entalhado
    const fy = 60;
    p.ellipse(60, fy, 16, 12, barkD);
    if (b) { p.hline(50, 55, fy - 2, EYE); p.hline(65, 70, fy - 2, EYE); }
    else { p.ellipse(52, fy - 2, 3, 4, EYE); p.ellipse(68, fy - 2, 3, 4, EYE); p.set(51, fy - 4, '#f4e8c0'); p.set(67, fy - 4, '#f4e8c0'); }
    if (v === 'triste') { p.vline(52, fy + 2, fy + 14, '#9fd4ff'); p.vline(68, fy + 2, fy + 12, '#9fd4ff'); brows(p, 52, 68, fy - 7, 'sad', '#3a2418'); }
    if (v === 'irritada') brows(p, 52, 68, fy - 7, 'angry', '#3a2418');
    p.line(54, fy + 7, 60, fy + 5, EYE); p.line(60, fy + 5, 66, fy + 7, EYE);
    return p;
  };
  E.coisa_fundo = (b, v) => {
    const p = new PA(136, 96);
    const skin = '#c8d4e0', sd = '#9aaabc';
    p.ellipse(68, 60, 62, 34, skin);
    p.ellipse(68, 72, 54, 18, sd);
    p.poly([[10, 50], [0, 30], [18, 40]], skin); p.poly([[126, 50], [136, 30], [118, 40]], skin);
    p.line(30, 76, 4, 90, '#7a8a9c'); p.line(106, 76, 132, 90, '#7a8a9c');
    for (let i = 0; i < 5; i++) p.ellipse(30 + i * 18, 40 + (i % 2) * 3, 4, 2, '#dce6f0');
    p.outline('#1a2a44');
    // boca enorme
    p.ellipse(68, 76, 30, 8, '#1a1424');
    for (let x = 42; x < 96; x += 5) { p.set(x, 70, '#f4f0e8'); p.set(x + 2, 82, '#f4f0e8'); }
    // olhos tristes enormes
    for (const x of [40, 96]) {
      p.circle(x, 52, 11, '#f4f8fc'); p.ring(x, 52, 11, '#5a6a80');
      if (b) p.hline(x - 10, x + 10, 52, '#1a2a44');
      else { p.circle(x, 54, 6, '#1a1e2e'); p.circle(x - 2, 51, 2, '#ffffff'); }
    }
    brows(p, 40, 96, 38, 'sad', '#5a6a80');
    if (v === 'atordoada') { for (const [x, y] of [[30, 26], [68, 20], [106, 26]]) { p.set(x, y, '#ffd86b'); p.set(x - 1, y, '#ffd86b'); p.set(x + 1, y, '#ffd86b'); p.set(x, y - 1, '#ffd86b'); p.set(x, y + 1, '#ffd86b'); } }
    return p;
  };
  E.dona_ninguem = (b, v) => {
    const p = new PA(80, 120);
    const dress = '#4a3560', skin = '#efe8de';
    p.poly([[28, 40], [52, 40], [72, 116], [8, 116]], dress);
    for (let x = 14; x < 70; x += 8) p.line(x, 116, 40 + (x - 40) * 0.3, 44, shade(dress, -0.2));
    p.line(28, 44, 14, 80, skin); p.line(29, 44, 15, 80, skin); p.line(52, 44, 66, 80, skin); p.line(51, 44, 65, 80, skin);
    p.rect(36, 30, 8, 12, skin);
    p.ellipse(40, 18, 13, 16, skin);
    p.circle(40, 3, 7, '#2a2030'); p.ellipse(40, 8, 13, 6, '#2a2030');
    p.outline(OUT);
    // máscara
    const mask = v || 'nenhuma';
    const mc = { feliz: '#f7d64a', triste: '#6aa6f0', irritado: '#f0545e' }[mask];
    if (mc) {
      const m = new PA(80, 120);
      m.ellipse(40, 20, 11, 13, '#fffaf0');
      m.ring(40, 20, 11, mc, 2);
      m.outline(OUT);
      if (mask === 'feliz') { m.pattern(32, 14, ['.##.....##.', '#..#...#..#'], { '#': EYE }); m.line(33, 26, 40, 30, EYE); m.line(40, 30, 47, 26, EYE); }
      if (mask === 'triste') { m.hline(33, 37, 16, EYE); m.hline(43, 47, 16, EYE); m.vline(35, 18, 24, '#6aa6f0'); m.vline(45, 18, 23, '#6aa6f0'); m.line(34, 29, 40, 26, EYE); m.line(40, 26, 46, 29, EYE); }
      if (mask === 'irritado') { m.line(32, 12, 38, 16, EYE); m.line(48, 12, 42, 16, EYE); m.rect(34, 17, 3, 2, EYE); m.rect(43, 17, 3, 2, EYE); m.rect(34, 25, 12, 4, EYE); m.hline(35, 44, 26, '#ffffff'); }
      p.draw(m);
    } else if (!b) {
      // rosto vazio: só uma leve sombra onde os olhos deveriam estar
      p.ellipse(35, 18, 2, 1, [0, 0, 0, 30]); p.ellipse(45, 18, 2, 1, [0, 0, 0, 30]);
    }
    return p;
  };
  E.apagador = (b, v) => {
    const p = new PA(112, 128);
    const c = '#1d1a35', hi = '#2c2850';
    p.ellipse(56, 30, 30, 28, c);
    p.poly([[26, 30], [86, 30], [104, 120], [8, 120]], c);
    for (let x = 8; x < 104; x += 8) p.circle(x + 4, 120, 5, c);
    p.line(30, 50, 14, 100, hi); p.line(82, 50, 98, 100, hi); p.line(56, 60, 54, 116, hi); p.line(40, 40, 36, 110, hi);
    // braços de cobertor
    p.poly([[30, 52], [6, 78], [12, 84], [34, 64]], c); p.poly([[82, 52], [106, 78], [100, 84], [78, 64]], c);
    p.outline('#05040b');
    // fumaça no topo (pavio apagado)
    for (let i = 0; i < 6; i++) p.circle(56 + Math.sin(i) * 4, 2 + i * 0.5, 2 + i * 0.3, [120, 116, 150, 110 - i * 12]);
    if (!b) {
      p.ellipse(44, 30, 5, 3, '#e8e6ff'); p.ellipse(68, 30, 5, 3, '#e8e6ff');
      if (v === 'furioso') { p.set(44, 30, '#d84a4a'); p.set(68, 30, '#d84a4a'); }
    } else { p.hline(39, 49, 30, '#8a86b0'); p.hline(63, 73, 30, '#8a86b0'); }
    if (v === 'fraco') { p.map((col, x, y) => (y > 90 ? [col[0], col[1], col[2], Math.max(0, col[3] - (y - 90) * 6)] : null)); }
    return p;
  };

  const cache = new Map();
  R.Art = R.Art || {};
  R.Art.enemy = function (sprite, frame, variant) {
    const key = sprite + '|' + (frame ? 1 : 0) + '|' + (variant || '');
    let c = cache.get(key);
    if (c) return c;
    const fn = E[sprite];
    if (!fn) { R.Log.warn('Sprite de inimigo desconhecido: ' + sprite); return R.Art.enemy('pirulinho', frame); }
    c = fn(!!frame, variant).toCanvas();
    cache.set(key, c);
    return c;
  };
  R.Art.ENEMY_SPRITES = Object.keys(E);
  // prévia
  R.Art.enemies = function (g, W) {
    let x = 4, y = 4, rowH = 0;
    for (const id of Object.keys(E)) {
      const variants = { mamae_raiz: ['', 'triste', 'irritada'], dona_ninguem: ['', 'feliz', 'triste', 'irritado'], coisa_fundo: ['', 'atordoada'], apagador: ['', 'furioso'] }[id] || [''];
      for (const v of variants) {
        const c0 = R.Art.enemy(id, 0, v), c1 = R.Art.enemy(id, 1, v);
        if (x + c0.width * 2 + 8 > W) { x = 4; y += rowH + 12; rowH = 0; }
        g.fillStyle = '#3b3552'; g.fillRect(x, y, c0.width * 2 + 4, c0.height);
        g.drawImage(c0, x, y); g.drawImage(c1, x + c0.width + 4, y);
        R.Font.draw(g, id + (v ? ':' + v : ''), x, y + c0.height, '#fff', { shadow: '#000' });
        x += c0.width * 2 + 12; rowH = Math.max(rowH, c0.height);
      }
    }
  };
})();
