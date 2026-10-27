/* VAGALUME — arte procedural de personagens.
 * Sprites de mapa 16x24 (4 direções x 3 quadros) e retratos 40x40
 * com expressões por emoção. Definições visuais em data/characters.json. */
(function () {
  'use strict';
  const R = window.RPG;
  const { PA, shade, mix } = R.Pixel;
  const OUT = '#2a1d33';
  const EYE = '#241a2e';
  const BLUSH = [245, 140, 150, 150];

  const Art = (R.Art = R.Art || {});

  // ------------------------------------------------------------------ helpers
  function inHead(x, y, cx, cy, rx, ry) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  function fillHead(p, h, c, cond) {
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) if (inHead(x, y, h.cx, h.cy, h.rx, h.ry) && cond(x, y)) p.set(x, y, c);
  }

  // ======================================================= sprite "criança"
  function kidLegs(L, s, d, f) {
    const pants = s.bottom || '#4a4060';
    const shoes = s.shoes || '#3a2a2a';
    const legSkin = s.bottomStyle === 'shorts' || s.bottomStyle === 'skirt' ? (s.socks || s.skin) : pants;
    const top = s.bottomStyle === 'shorts' ? pants : legSkin;
    if (d === 'down' || d === 'up') {
      const legs = [[5, f === 2 ? 1 : 0], [9, f === 1 ? 1 : 0]];
      for (const [x, lift] of legs) {
        L.rect(x, 20, 2, 1, top);
        L.rect(x, 21, 2, 1 - lift, legSkin);
        L.rect(x, 22 - lift, 2, 1, shoes);
      }
    } else {
      const far = shade(legSkin, -0.25), farTop = shade(top, -0.25), farShoe = shade(shoes, -0.2);
      if (f === 0) {
        L.rect(6, 20, 4, 1, top); L.rect(6, 21, 4, 1, legSkin); L.rect(5, 22, 5, 1, shoes);
      } else {
        const a = f === 1 ? [4, 9] : [9, 4]; // [perna da frente, perna de trás]
        L.rect(a[1], 20, 2, 1, farTop); L.rect(a[1], 21, 2, 1, far); L.rect(a[1] - 1, 22, 2, 1, farShoe);
        L.rect(a[0], 20, 2, 1, top); L.rect(a[0], 21, 2, 1, legSkin); L.rect(a[0] - 1, 22, 3, 1, shoes);
      }
    }
  }

  function kidBody(B, s, d, f) {
    const top = s.top || '#7a6ac8';
    const dark = shade(top, -0.22);
    const style = s.topStyle || 'tshirt';
    const skin = s.skin;
    const big = s.build === 'big';
    if (d === 'down' || d === 'up') {
      const x0 = big ? 4 : 5, x1 = big ? 11 : 10;
      for (let y = 15; y <= 19; y++) {
        let a = x0, b = x1;
        if (style === 'raincoat' && y >= 17) { a--; b++; }
        let c = top;
        if (style === 'striped') c = y % 2 ? top : (s.top2 || '#f0f0e8');
        B.hline(a, b, y, c);
      }
      // gola / capuz atrás do pescoço
      if (style === 'raincoat' || style === 'hoodie') B.hline(x0 - 1, x1 + 1, 14, dark);
      if (style === 'sweater') B.hline(6, 9, 15, s.top2 || '#f4f0ff');
      if (style === 'apron') B.rect(6, 16, 4, 4, s.top2 || '#f8f4ec');
      if (style === 'overalls') { B.rect(6, 17, 4, 3, s.top2 || '#4a6fb0'); B.set(6, 15, s.top2 || '#4a6fb0'); B.set(9, 15, s.top2 || '#4a6fb0'); }
      if (style === 'dress') { B.hline(x0 - 1, x1 + 1, 19, top); B.hline(x0 - 1, x1 + 1, 20, top); }
      // braços
      const sleeve = style === 'tshirt' || style === 'striped' ? (style === 'striped' ? top : top) : top;
      const ax0 = (style === 'raincoat' ? x0 - 2 : x0 - 1), ax1 = (style === 'raincoat' ? x1 + 2 : x1 + 1);
      const armLong = style === 'raincoat' || style === 'hoodie' || style === 'sweater' || style === 'robe';
      for (const ax of [ax0, ax1]) {
        B.vline(ax, 15, armLong ? 18 : 16, shade(sleeve, -0.1));
        if (!armLong) B.vline(ax, 17, 18, skin);
        B.set(ax, 19, skin);
      }
      if (style === 'raincoat' && d === 'down') { B.set(7, 16, dark); B.set(7, 18, dark); B.set(8, 16, dark); B.set(8, 18, dark); }
      if (s.bottomStyle === 'skirt') { B.hline(4, 11, 19, s.bottom); B.hline(4, 11, 20, s.bottom); }
    } else {
      const x0 = big ? 5 : 6, x1 = big ? 10 : 9;
      for (let y = 15; y <= 19; y++) {
        let a = x0, b = x1;
        if (style === 'raincoat' && y >= 17) { a--; b++; }
        let c = top;
        if (style === 'striped') c = y % 2 ? top : (s.top2 || '#f0f0e8');
        B.hline(a, b, y, c);
      }
      if (style === 'raincoat' || style === 'hoodie') B.hline(x0 + 1, x1 + 2, 14, dark);
      if (style === 'apron') B.rect(5, 16, 2, 4, s.top2 || '#f8f4ec');
      if (style === 'dress') { B.hline(x0 - 1, x1 + 1, 19, top); B.hline(x0 - 1, x1 + 1, 20, top); }
      if (s.bottomStyle === 'skirt') { B.hline(5, 10, 19, s.bottom); B.hline(5, 10, 20, s.bottom); }
      // braço que balança
      const arm = shade(top, -0.12);
      const armLong = style === 'raincoat' || style === 'hoodie' || style === 'sweater' || style === 'robe';
      if (f === 0) { B.vline(7, 15, 18, arm); B.set(7, 19, skin); if (!armLong) { B.set(7, 17, skin); B.set(7, 18, skin); } }
      else if (f === 1) { B.set(6, 15, arm); B.set(5, 16, arm); B.set(5, 17, armLong ? arm : skin); B.set(4, 18, skin); }
      else { B.set(8, 15, arm); B.set(9, 16, arm); B.set(10, 17, armLong ? arm : skin); B.set(11, 18, skin); }
    }
  }

  // penteados: desenham em Hr (frente) e BK (atrás)
  const HAIR = {
    bob(Hr, BK, s, d, h) {
      const c = s.hairColor, hi = shade(c, 0.25);
      if (d === 'down') {
        fillHead(Hr, h, c, (x, y) => y <= 5);
        fillHead(Hr, h, c, (x, y) => y === 6 && !(x === 5 || x === 6 || x === 9 || x === 10));
        fillHead(Hr, h, c, (x, y) => y >= 7 && y <= 11 && (x <= 3 || x >= 12));
      } else if (d === 'left') {
        fillHead(Hr, h, c, (x, y) => y <= 5);
        fillHead(Hr, h, c, (x, y) => y === 6 && (x <= 3 || x >= 7));
        fillHead(Hr, h, c, (x, y) => y >= 7 && y <= 11 && x >= 8);
      } else fillHead(Hr, h, c, (x, y) => y <= 12);
      Hr.set(8, 1, c); Hr.set(9, 0, c);
      Hr.hline(4, 6, 3, hi);
    },
    ponytail(Hr, BK, s, d, h) {
      const c = s.hairColor, hi = shade(c, 0.25), band = s.hairAcc || '#3fbf7f';
      if (d === 'down') {
        fillHead(Hr, h, c, (x, y) => y <= 4);
        fillHead(Hr, h, c, (x, y) => y === 5 && (x <= 4 || x === 7 || x === 8 || x >= 11));
        fillHead(Hr, h, c, (x, y) => y >= 6 && y <= 9 && (x <= 2 || x >= 13));
        BK.rect(11, 0, 3, 3, c); BK.rect(13, 3, 2, 5, c);
        fillHead(Hr, h, band, (x, y) => y === 3);
      } else if (d === 'left') {
        fillHead(Hr, h, c, (x, y) => y <= 4);
        fillHead(Hr, h, c, (x, y) => y === 5 && (x <= 3 || x >= 8));
        fillHead(Hr, h, c, (x, y) => y >= 6 && y <= 10 && x >= 9);
        BK.rect(12, 1, 3, 3, c); BK.rect(13, 4, 3, 6, c); BK.set(14, 10, c);
        fillHead(Hr, h, band, (x, y) => y === 3);
      } else {
        fillHead(Hr, h, c, (x, y) => y <= 11);
        fillHead(Hr, h, band, (x, y) => y === 3);
        Hr.rect(7, 1, 3, 2, c); Hr.rect(7, 4, 3, 9, shade(c, -0.12)); Hr.hline(7, 9, 3, band);
      }
      Hr.hline(4, 6, 2, hi);
    },
    beanie(Hr, BK, s, d, h) {
      const c = s.hairAcc || '#5b7bd5', rim = s.hairAcc2 || '#eef0ff', hair = s.hairColor;
      for (let y = 0; y <= 5; y++)
        for (let x = 0; x < 16; x++) if (inHead(x, y, 8, 6, h.rx + 0.4, 5.4)) Hr.set(x, y, y >= 4 ? rim : c);
      Hr.circle(8, 0.6, 1.7, rim);
      if (d === 'down') { Hr.vline(2, 6, 9, hair); Hr.vline(13, 6, 9, hair); Hr.vline(1, 6, 8, hair); Hr.vline(14, 6, 8, hair); }
      else if (d === 'left') fillHead(Hr, h, hair, (x, y) => y >= 6 && y <= 10 && x >= 9);
      else fillHead(Hr, h, hair, (x, y) => y >= 6 && y <= 11);
      Hr.hline(4, 6, 2, shade(c, 0.25));
    },
    braids(Hr, BK, s, d, h) {
      const c = s.hairColor, dk = shade(c, -0.18), rib = s.hairAcc || '#ff9fc4';
      if (d === 'down') {
        fillHead(Hr, h, c, (x, y) => y <= 6);
        fillHead(Hr, h, c, (x, y) => y >= 7 && y <= 11 && (x <= 2 || x >= 13));
        for (let y = 9; y <= 16; y++) { Hr.set(1, y, y % 2 ? c : dk); Hr.set(2, y, y % 2 ? dk : c); Hr.set(13, y, y % 2 ? c : dk); Hr.set(14, y, y % 2 ? dk : c); }
        Hr.hline(1, 2, 16, rib); Hr.hline(13, 14, 16, rib);
      } else if (d === 'left') {
        fillHead(Hr, h, c, (x, y) => y <= 5);
        fillHead(Hr, h, c, (x, y) => y === 6 && (x <= 3 || x >= 7));
        fillHead(Hr, h, c, (x, y) => y >= 7 && y <= 10 && x >= 8);
        for (let y = 10; y <= 17; y++) { BK.set(11, y, y % 2 ? c : dk); BK.set(12, y, y % 2 ? dk : c); }
        BK.hline(11, 12, 17, rib);
      } else {
        fillHead(Hr, h, c, (x, y) => y <= 11);
        for (let y = 10; y <= 17; y++) { Hr.set(4, y, y % 2 ? c : dk); Hr.set(5, y, y % 2 ? dk : c); Hr.set(10, y, y % 2 ? c : dk); Hr.set(11, y, y % 2 ? dk : c); }
        Hr.hline(4, 5, 17, rib); Hr.hline(10, 11, 17, rib);
      }
      Hr.hline(4, 6, 3, shade(c, 0.22));
    },
    short(Hr, BK, s, d, h) {
      const c = s.hairColor;
      if (d === 'down') {
        fillHead(Hr, h, c, (x, y) => y <= 4);
        fillHead(Hr, h, c, (x, y) => y === 5 && (x <= 3 || x >= 12 || x === 7));
        fillHead(Hr, h, c, (x, y) => y >= 6 && y <= 8 && (x <= 2 || x >= 13));
      } else if (d === 'left') {
        fillHead(Hr, h, c, (x, y) => y <= 4);
        fillHead(Hr, h, c, (x, y) => y >= 5 && y <= 9 && x >= 8);
      } else fillHead(Hr, h, c, (x, y) => y <= 10);
      Hr.hline(4, 6, 3, shade(c, 0.22));
    },
    spiky(Hr, BK, s, d, h) {
      HAIR.short(Hr, BK, s, d, h);
      const c = s.hairColor;
      [[3, 2], [5, 1], [7, 0], [9, 1], [11, 1], [12, 3]].forEach(([x, y]) => { Hr.set(x, y, c); Hr.set(x, y + 1, c); });
    },
    long(Hr, BK, s, d, h) {
      const c = s.hairColor;
      if (d === 'down') {
        fillHead(Hr, h, c, (x, y) => y <= 6);
        fillHead(Hr, h, c, (x, y) => y >= 7 && (x <= 3 || x >= 12));
        BK.rect(1, 8, 3, 9, c); BK.rect(12, 8, 3, 9, c);
      } else if (d === 'left') {
        fillHead(Hr, h, c, (x, y) => y <= 6);
        fillHead(Hr, h, c, (x, y) => y >= 7 && x >= 7);
        BK.rect(9, 9, 5, 9, c);
      } else { fillHead(Hr, h, c, () => true); Hr.rect(3, 12, 10, 6, c); }
      Hr.hline(4, 6, 3, shade(c, 0.22));
    },
    bun(Hr, BK, s, d, h) {
      HAIR.short(Hr, BK, s, d, h);
      const c = s.hairColor;
      if (d === 'left') BK.circle(12, 3, 2.6, c);
      else Hr.circle(8, 1.5, 2.6, c);
    },
    curly(Hr, BK, s, d, h) {
      const c = s.hairColor, dk = shade(c, -0.2);
      fillHead(Hr, h, c, (x, y) => y <= (d === 'up' ? 11 : 5));
      const bumps = d === 'up' ? [[2, 4], [13, 4], [2, 8], [13, 8], [4, 1], [8, 0.5], [12, 1]] : [[2, 4], [13, 4], [4, 1.5], [8, 0.5], [12, 1.5], [2, 7], [13, 7]];
      for (const [x, y] of bumps) Hr.circle(x, y + 1, 2, c);
      for (const [x, y] of bumps) Hr.set(Math.round(x), Math.round(y + 1), dk);
    },
    bald(Hr, BK, s, d, h) {
      const c = s.hairColor || '#d8d4d0';
      if (d !== 'up') { Hr.vline(2, 6, 9, c); Hr.vline(13, 6, 9, c); if (d === 'left') fillHead(Hr, h, c, (x, y) => y >= 6 && y <= 10 && x >= 10); }
      else fillHead(Hr, h, c, (x, y) => y >= 7 && y <= 11);
    },
    cap(Hr, BK, s, d, h) {
      const c = s.hairAcc || '#d04848', hair = s.hairColor;
      fillHead(Hr, h, c, (x, y) => y <= 5);
      if (d === 'down') { Hr.hline(3, 12, 6, shade(c, -0.25)); Hr.vline(2, 6, 9, hair); Hr.vline(13, 6, 9, hair); }
      else if (d === 'left') { Hr.hline(0, 5, 6, shade(c, -0.25)); fillHead(Hr, h, hair, (x, y) => y >= 6 && y <= 9 && x >= 9); }
      else fillHead(Hr, h, hair, (x, y) => y >= 6 && y <= 11);
    },
    buckethat(Hr, BK, s, d, h) {
      const c = s.hairAcc || '#c9b27a';
      fillHead(Hr, h, c, (x, y) => y <= 5);
      Hr.hline(0, 15, 6, shade(c, -0.2));
      Hr.hline(1, 14, 5, c);
    },
    none() {},
  };

  function kidFace(F, s, d) {
    const eye = s.eyeColor || EYE;
    if (d === 'down') {
      if (s.face === 'sleepy') { F.hline(4, 6, 10, eye); F.hline(9, 11, 10, eye); }
      else if (s.face === 'smile') { F.set(5, 9, eye); F.set(10, 9, eye); F.line(5, 11, 7, 12, '#c0392b'); F.line(8, 12, 10, 11, '#c0392b'); }
      else if (s.face === 'blank') { /* sem rosto */ }
      else if (s.face === 'frog') { F.circle(4.5, 8.5, 2, '#f8f8f0'); F.circle(11.5, 8.5, 2, '#f8f8f0'); F.set(4, 8, eye); F.set(11, 8, eye); F.hline(5, 10, 12, '#3a5a30'); }
      else { F.vline(5, 9, 10, eye); F.vline(10, 9, 10, eye); }
      if (s.face !== 'blank' && s.face !== 'frog') { F.set(4, 11, BLUSH); F.set(11, 11, BLUSH); }
      if (s.glasses) {
        const g = s.glassesLight || '#d8cff5';
        F.hline(4, 6, 8, g); F.hline(9, 11, 8, g); F.hline(7, 8, 9, g);
        F.set(4, 9, g); F.set(11, 9, g);
      }
      if (s.bandaid) { F.set(7, 11, '#f0d9b5'); F.set(8, 11, '#e6c49a'); }
      if (s.beard) { F.rect(4, 11, 8, 2, s.beard); F.hline(5, 10, 13, s.beard); }
    } else if (d === 'left') {
      if (s.face === 'sleepy') F.hline(3, 5, 10, eye);
      else if (s.face === 'blank') { /* nada */ }
      else if (s.face === 'frog') { F.circle(4, 8.5, 2, '#f8f8f0'); F.set(3, 8, eye); F.hline(2, 6, 12, '#3a5a30'); }
      else F.vline(4, 9, 10, eye);
      if (s.face !== 'blank' && s.face !== 'frog') F.set(4, 11, BLUSH);
      if (s.glasses) { const g = s.glassesLight || '#d8cff5'; F.hline(3, 5, 8, g); F.set(5, 9, g); }
      if (s.bandaid) F.set(3, 11, '#f0d9b5');
      if (s.beard) { F.rect(2, 11, 5, 2, s.beard); }
    }
  }

  function kidFrame(s, dir, f) {
    const d = dir === 'right' ? 'left' : dir;
    const BK = new PA(16, 24), L = new PA(16, 24), B = new PA(16, 24), H = new PA(16, 24), Hr = new PA(16, 24), F = new PA(16, 24);
    const h = { cx: 8, cy: 8, rx: s.build === 'big' ? 6.5 : 6, ry: 5.6 };
    kidLegs(L, s, d, f);
    kidBody(B, s, d, f);
    H.ellipse(h.cx, h.cy, h.rx, h.ry, s.skin);
    // sombra sob o cabelo / queixo
    fillHead(H, h, shade(s.skin, -0.12), (x, y) => y === 13);
    (HAIR[s.hair] || HAIR.short)(Hr, BK, s, d, h);
    kidFace(F, s, d);
    // cabeça + cabelo como uma única silhueta (sem contorno dentro do rosto)
    const HH = new PA(16, 24);
    HH.draw(H); HH.draw(Hr);
    for (let y = 1; y < 24; y++)
      for (let x = 0; x < 16; x++)
        if (H.alpha(x, y) && !Hr.alpha(x, y) && Hr.alpha(x, y - 1)) HH.set(x, y, shade(s.skin, -0.16));
    const out = new PA(16, 24);
    for (const layer of [BK, L, B, HH]) { layer.outline(OUT); out.draw(layer); }
    out.draw(F);
    return dir === 'right' ? out.flipX() : out;
  }

  // ===================================================== criaturas e outros
  const BODY = {
    candle(s, d, f) {
      const p = new PA(16, 24);
      const wax = s.wax || '#f4ead2', wd = shade(wax, -0.14);
      const top = s.tall ? 7 : 9;
      const bob = f === 0 ? 0 : 1;
      p.rect(4, top + bob, 8, 21 - top - bob, wax);
      p.vline(11, top + bob, 20, wd);
      p.vline(10, top + 2 + bob, 20, wd);
      // gotas de cera
      p.set(4, top + 2 + bob, wax); p.set(5, top + 3 + bob, wax); p.set(9, top + 2 + bob, wax);
      p.rect(3, 21, 10, 2, s.base || '#c79a3e');
      p.hline(3, 12, 21, shade(s.base || '#c79a3e', 0.25));
      if (s.sash) p.line(4, top + 4 + bob, 11, top + 9 + bob, s.sash);
      p.outline(OUT);
      // pavio e chama
      const fl = new PA(16, 24);
      const fy = top - 1 + bob;
      fl.set(7, fy, '#3a2a2a'); fl.set(8, fy, '#3a2a2a');
      const fc = s.flame || '#ffb347';
      const wob = (f % 2) ? 0.4 : -0.4;
      fl.ellipse(7.5 + wob, fy - 2.5, 2.2, 3, fc);
      fl.set(Math.round(7.5 + wob * 2), fy - 6, fc);
      fl.ellipse(7.5 + wob, fy - 2, 1, 1.6, '#fff2a8');
      p.draw(fl);
      if (d !== 'up') {
        const ex = d === 'left' ? -1 : 0;
        p.vline(6 + ex, top + 4 + bob, top + 5 + bob, EYE);
        p.vline(9 + ex, top + 4 + bob, top + 5 + bob, EYE);
        if (s.monocle) { p.ring(9.5 + ex, top + 5 + bob, 1.8, '#d4b04a'); }
        p.set(4 + (d === 'left' ? 0 : 1), top + 6 + bob, BLUSH);
        if (d === 'down') p.set(10, top + 6 + bob, BLUSH);
      }
      return p;
    },
    capybara(s, d, f) {
      const p = new PA(16, 24);
      const fur = s.fur || '#a0714a', fd = shade(fur, -0.18);
      const bob = f ? 1 : 0;
      p.ellipse(8, 16 + bob * 0.5, 7, 6.5, fur);
      p.ellipse(8, 9 + bob, 5.5, 4.6, fd);
      p.set(3, 5 + bob, fd); p.set(12, 5 + bob, fd);
      if (s.apron) { p.rect(5, 13, 6, 7, s.apron); p.hline(5, 10, 13, shade(s.apron, -0.1)); }
      p.rect(5, 21, 2, 2, fd); p.rect(9, 21, 2, 2, fd);
      if (s.hat) { p.rect(5, 1 + bob, 6, 3, s.hat); p.circle(6, 1 + bob, 1.6, s.hat); p.circle(10, 1 + bob, 1.6, s.hat); p.circle(8, 0.5 + bob, 1.8, s.hat); }
      p.outline(OUT);
      if (d === 'down') {
        p.rect(6, 10 + bob, 4, 2, '#5a3a22');
        p.set(5, 8 + bob, EYE); p.set(10, 8 + bob, EYE);
        p.set(4, 10 + bob, BLUSH); p.set(11, 10 + bob, BLUSH);
      } else if (d === 'left') {
        p.rect(3, 10 + bob, 3, 2, '#5a3a22'); p.set(5, 8 + bob, EYE); p.set(6, 10 + bob, BLUSH);
      }
      return p;
    },
    sheep(s, d, f) {
      const p = new PA(16, 24);
      const wool = s.wool || '#f4f1ea', face = s.faceColor || '#3a3040';
      const bob = f ? 1 : 0;
      for (const [x, y, r] of [[8, 15, 6], [4, 13, 3], [12, 13, 3], [4, 18, 3], [12, 18, 3], [8, 20, 3.5], [8, 11, 3.5]]) p.circle(x, y + bob * 0.5, r, wool);
      p.rect(5, 21, 2, 2, face); p.rect(9, 21, 2, 2, face);
      p.outline(OUT);
      const hd = new PA(16, 24);
      if (d !== 'up') {
        hd.ellipse(d === 'left' ? 6 : 8, 8 + bob, 3.5, 4, face);
        hd.set(d === 'left' ? 2 : 3, 7 + bob, face); hd.set(d === 'left' ? 9 : 12, 7 + bob, face);
      }
      if (s.hat) { hd.poly([[4, 5 + bob], [12, 5 + bob], [13, 0 + bob]], s.hat); hd.circle(13, 0.5 + bob, 1.4, '#fff'); }
      hd.outline(OUT);
      p.draw(hd);
      if (d === 'down') { p.set(7, 8 + bob, '#fff'); p.set(9, 8 + bob, '#fff'); }
      if (d === 'left') p.set(5, 8 + bob, '#fff');
      return p;
    },
    moth(s, d, f) {
      const p = new PA(16, 24);
      const body = s.bodyColor || '#8a7a68', wing = s.wing || '#c9b89a';
      const flap = f === 1 ? 1 : 0;
      const W = new PA(16, 24);
      W.ellipse(3, 13 - flap, 3, 5, wing); W.ellipse(13, 13 - flap, 3, 5, wing);
      W.circle(3, 13 - flap, 1.2, shade(wing, -0.25)); W.circle(13, 13 - flap, 1.2, shade(wing, -0.25));
      W.outline(OUT);
      const Bd = new PA(16, 24);
      Bd.ellipse(8, 16, 3.5, 6, body);
      if (s.shawl) Bd.rect(5, 12, 6, 3, s.shawl);
      Bd.circle(8, 7, 4, shade(body, 0.2));
      Bd.line(6, 4, 4, 0, body); Bd.line(10, 4, 12, 0, body);
      Bd.rect(6, 21, 1, 2, body); Bd.rect(9, 21, 1, 2, body);
      Bd.outline(OUT);
      p.draw(W); p.draw(Bd);
      if (d !== 'up') {
        const ex = d === 'left' ? -1 : 0;
        p.set(6 + ex, 7, EYE); p.set(9 + ex, 7, EYE);
        if (s.glasses) { p.ring(6.5 + ex, 7.5, 1.6, s.glasses); p.ring(9.5 + ex, 7.5, 1.6, s.glasses); }
      }
      return p;
    },
    toad(s, d, f) {
      const p = new PA(16, 24);
      const g = s.skin || '#6fae5a', bob = f ? 1 : 0;
      p.ellipse(8, 17 + bob * 0.5, 7, 5.5, g);
      p.ellipse(8, 19, 5, 3, s.belly || '#d9e8a6');
      p.circle(4.5, 11 + bob, 2.4, g); p.circle(11.5, 11 + bob, 2.4, g);
      if (s.hat) { p.rect(5, 8 + bob, 6, 3, s.hat); p.hline(4, 11, 10 + bob, shade(s.hat, -0.2)); }
      p.outline(OUT);
      if (d !== 'up') {
        p.circle(4.5, 11 + bob, 1.4, '#f8f8f0'); p.circle(11.5, 11 + bob, 1.4, '#f8f8f0');
        p.set(4, 11 + bob, EYE); p.set(11, 11 + bob, EYE);
        p.hline(5, 10, 16 + bob, shade(g, -0.45));
      }
      return p;
    },
    snail(s, d, f) {
      const p = new PA(16, 24);
      const shell = s.shell || '#d98f5a', bodyC = s.bodyColor || '#d8ccaa';
      const slide = f === 1 ? 1 : 0;
      const Bd = new PA(16, 24);
      Bd.rect(1 + slide, 18, 13, 4, bodyC);
      Bd.rect(2 + slide, 11, 3, 8, bodyC);
      Bd.line(3 + slide, 11, 2 + slide, 8, bodyC); Bd.line(4 + slide, 11, 5 + slide, 8, bodyC);
      if (s.hat) { Bd.rect(1 + slide, 10, 5, 2, s.hat); Bd.set(0 + slide, 11, s.hat); }
      Bd.outline(OUT);
      const Sh = new PA(16, 24);
      Sh.circle(10, 14, 5, shell);
      Sh.ring(10, 14, 3, shade(shell, -0.25));
      Sh.set(10, 14, shade(shell, -0.25));
      Sh.outline(OUT);
      p.draw(Bd); p.draw(Sh);
      p.set(2 + slide, 7, EYE); p.set(5 + slide, 7, EYE);
      if (s.bag) { p.rect(7, 17, 4, 3, s.bag); }
      return d === 'right' ? p : p; // espelhado pelo chamador
    },
    robot(s, d, f) {
      const p = new PA(16, 24);
      const tin = s.tin || '#b8c2cc', dk = shade(tin, -0.2);
      const bob = f ? 1 : 0;
      p.rect(4, 11 + bob, 8, 9, tin);
      p.vline(11, 11 + bob, 19 + bob, dk);
      p.rect(4, 2 + bob, 8, 8, shade(tin, 0.1));
      p.vline(8, 0 + bob, 1 + bob, dk); p.set(8, 0 + bob, '#ff6f6f');
      p.rect(5, 20, 2, 3, dk); p.rect(9, 20, 2, 3, dk);
      if (d !== 'right') { p.rect(12, 13 + bob, 1, 2, '#c9a24a'); p.rect(13, 12 + bob, 1, 4, '#c9a24a'); }
      p.outline(OUT);
      if (d !== 'up') {
        const ex = d === 'left' ? -1 : 0;
        p.rect(5 + ex, 5 + bob, 2, 2, '#ffd86b'); p.rect(9 + ex, 5 + bob, 2, 2, '#ffd86b');
        p.hline(6 + ex, 9 + ex, 8 + bob, dk);
        p.set(6, 14 + bob, dk); p.set(9, 14 + bob, dk); p.set(6, 17 + bob, dk); p.set(9, 17 + bob, dk);
      }
      return p;
    },
    cat(s, d, f) {
      const p = new PA(16, 24);
      const c = s.fur || '#f2a65a', st = shade(c, -0.25);
      const step = f ? 1 : 0;
      if (d === 'down' || d === 'up') {
        p.ellipse(8, 19, 4, 3.4, c);
        p.circle(8, 14, 3.6, c);
        p.poly([[4.5, 12], [5, 9], [7, 11]], c); p.poly([[11.5, 12], [11, 9], [9, 11]], c);
        p.rect(5, 21, 2, 2 - step, c); p.rect(9, 21, 2, 1 + step, c);
        p.line(12, 19, 14, 15, c);
      } else {
        p.ellipse(9, 19, 5, 3.2, c);
        p.circle(5, 15, 3.4, c);
        p.poly([[2.5, 13], [3, 10], [5, 12]], c); p.poly([[6, 12], [7.5, 10], [8, 13]], c);
        p.rect(5 + step, 21, 2, 2, c); p.rect(11 - step, 21, 2, 2, c);
        p.line(14, 18, 15, 13, c);
      }
      p.outline(OUT);
      p.set(7, 18, st); p.set(9, 18, st); p.set(8, 20, st);
      if (d === 'down') { p.set(6, 14, EYE); p.set(10, 14, EYE); p.set(8, 15, '#d06a6a'); }
      if (d === 'left') { p.set(4, 15, EYE); p.set(2, 16, '#d06a6a'); }
      return p;
    },
    rock(s, d) {
      const p = new PA(16, 24);
      const c = s.stone || '#9a9aa8';
      p.ellipse(8, 18, 7, 5, c);
      p.ellipse(7, 16.5, 4, 2, shade(c, 0.18));
      p.set(11, 20, shade(c, -0.25)); p.set(4, 19, shade(c, -0.2));
      p.outline(OUT);
      if (d !== 'up') { p.set(6, 18, EYE); p.set(10, 18, EYE); p.hline(7, 9, 20, shade(c, -0.4)); }
      return p;
    },
    ghost(s, d, f) {
      // figura alta de cobertor (o Apagador)
      const p = new PA(16, 24);
      const c = s.cloth || '#1d1a35', hi = shade(c, 0.14);
      const sway = f === 1 ? 1 : f === 2 ? -1 : 0;
      p.ellipse(8, 7, 6, 6.5, c);
      p.rect(2, 7, 12, 14, c);
      for (let x = 2; x < 14; x++) if ((x + sway) % 3 !== 0) p.set(x, 21, c);
      p.line(5, 9, 4, 19, hi); p.line(11, 10, 12, 19, hi);
      p.outline('#05040b');
      if (d !== 'up') {
        const ex = d === 'left' ? -2 : 0;
        p.rect(5 + ex, 7, 2, 2, s.eyes || '#e8e6ff'); p.rect(9 + ex, 7, 2, 2, s.eyes || '#e8e6ff');
      }
      p.set(8 + sway, 0, '#56506e'); p.set(9, 1, '#3f3a58');
      return p;
    },
    tall(s, d, f) {
      // adulta alta e magra (Dona Ninguém)
      const p = new PA(16, 24);
      const dress = s.top || '#4a3560', skin = s.skin || '#e8dccb';
      const sw = f === 1 ? 1 : f === 2 ? -1 : 0;
      const Bd = new PA(16, 24);
      Bd.poly([[5, 9], [11, 9], [13 + sw * 0.5, 22], [3 + sw * 0.5, 22]], dress);
      Bd.vline(4, 10, 15, skin); Bd.vline(12, 10, 15, skin);
      Bd.outline(OUT);
      const Hd = new PA(16, 24);
      Hd.ellipse(8, 5, 3.6, 4.4, skin);
      if (s.hairColor) { Hd.circle(8, 0.8, 2, s.hairColor); fillHead(Hd, { cx: 8, cy: 5, rx: 3.6, ry: 4.4 }, s.hairColor, (x, y) => y <= 2 || (d === 'up')); }
      Hd.outline(OUT);
      p.draw(Bd); p.draw(Hd);
      return p;
    },
  };

  function creatureFrame(s, dir, f) {
    const d = dir === 'right' ? 'left' : dir;
    const fn = BODY[s.body] || BODY.rock;
    const pa = fn(s, d, f);
    return dir === 'right' ? pa.flipX() : pa;
  }

  // -------------------------------------------------------------- spritesheet
  const sheets = {};
  Art.charDef = function (id) {
    const db = R.DB && R.DB.characters;
    if (!db) return null;
    return (db.party && db.party[id] && db.party[id].look) || (db.npcs && db.npcs[id]) || null;
  };
  Art.sheet = function (id) {
    if (sheets[id]) return sheets[id];
    let s = Art.charDef(id);
    if (!s) { R.Log.warn('Sprite desconhecido: ' + id); s = { body: 'kid', skin: '#ccc', hair: 'short', hairColor: '#555', top: '#888' }; }
    const frames = {};
    for (const dir of ['down', 'up', 'left', 'right']) {
      frames[dir] = [0, 1, 2].map((f) => {
        const pa = s.body === 'kid' || !s.body ? kidFrame(s, dir, f) : creatureFrame(s, dir, f);
        return pa.toCanvas();
      });
    }
    return (sheets[id] = { w: 16, h: 24, frames, def: s });
  };
  // quadro de animação de caminhada: 0 parado, alterna 1/2
  Art.walkFrame = function (step, moving) {
    if (!moving) return 0;
    return [1, 0, 2, 0][step % 4];
  };

  // ================================================================ retratos
  const PH = { cx: 20, cy: 20, rx: 13, ry: 12 };
  const PHAIR = {
    bob(Hr, BK, s) {
      const c = s.hairColor, hi = shade(c, 0.22);
      fillHead(Hr, PH, c, (x, y) => y <= 15);
      fillHead(Hr, PH, c, (x, y) => y >= 16 && y <= 18 && !((x >= 12 && x <= 16) || (x >= 23 && x <= 27)));
      fillHead(Hr, PH, c, (x, y) => y >= 19 && y <= 28 && (x <= 10 || x >= 29));
      Hr.rect(6, 18, 3, 11, c); Hr.rect(31, 18, 3, 11, c);
      Hr.line(21, 7, 23, 2, c); Hr.line(22, 7, 25, 3, c); Hr.set(25, 4, c);
      Hr.line(11, 11, 15, 9, hi); Hr.line(12, 12, 16, 10, hi);
    },
    ponytail(Hr, BK, s) {
      const c = s.hairColor, hi = shade(c, 0.22), band = s.hairAcc || '#3fbf7f';
      BK.ellipse(33, 9, 5, 7, c); BK.ellipse(36, 17, 3.5, 6, c);
      fillHead(Hr, PH, c, (x, y) => y <= 14);
      fillHead(Hr, PH, band, (x, y) => y >= 12 && y <= 13);
      fillHead(Hr, PH, c, (x, y) => y >= 15 && y <= 17 && (x <= 15 || x >= 25) && !(x >= 11 && x <= 12));
      Hr.rect(6, 15, 3, 9, c); Hr.rect(31, 15, 3, 9, c);
      Hr.line(11, 9, 16, 7, hi);
    },
    beanie(Hr, BK, s) {
      const c = s.hairAcc || '#5b7bd5', rim = s.hairAcc2 || '#eef0ff', hair = s.hairColor;
      for (let y = 0; y <= 15; y++) for (let x = 0; x < 40; x++) if (inHead(x, y, 20, 15, 14, 12)) Hr.set(x, y, y >= 12 ? rim : c);
      for (let x = 9; x < 32; x += 3) Hr.vline(x, 5, 11, shade(c, -0.15));
      Hr.circle(20, 3, 3.2, rim);
      Hr.rect(6, 15, 3, 7, hair); Hr.rect(31, 15, 3, 7, hair);
    },
    braids(Hr, BK, s) {
      const c = s.hairColor, dk = shade(c, -0.18), rib = s.hairAcc || '#ff9fc4';
      fillHead(Hr, PH, c, (x, y) => y <= 17);
      Hr.line(20, 8, 20, 12, dk);
      Hr.rect(6, 17, 3, 8, c); Hr.rect(31, 17, 3, 8, c);
      for (let y = 22; y <= 37; y++) {
        const o = y % 4 < 2 ? 0 : 1;
        Hr.rect(4 + o, y, 4, 1, y % 2 ? c : dk); Hr.rect(32 - o, y, 4, 1, y % 2 ? c : dk);
      }
      Hr.rect(4, 34, 5, 2, rib); Hr.rect(31, 34, 5, 2, rib);
      Hr.line(12, 11, 16, 9, shade(c, 0.22));
    },
    short(Hr, BK, s) {
      const c = s.hairColor;
      fillHead(Hr, PH, c, (x, y) => y <= 14);
      fillHead(Hr, PH, c, (x, y) => y >= 15 && y <= 20 && (x <= 9 || x >= 30));
      Hr.line(12, 10, 16, 8, shade(c, 0.22));
    },
    bald(Hr, BK, s) {
      const c = s.hairColor || '#e4e0dc';
      fillHead(Hr, PH, c, (x, y) => y >= 13 && y <= 24 && (x <= 9 || x >= 30));
      if (s.hairAcc) { fillHead(Hr, PH, s.hairAcc, (x, y) => y <= 11); Hr.hline(5, 34, 12, shade(s.hairAcc, -0.25)); Hr.hline(4, 35, 13, shade(s.hairAcc, -0.25)); }
    },
    long(Hr, BK, s) {
      const c = s.hairColor;
      BK.rect(5, 16, 30, 22, c);
      fillHead(Hr, PH, c, (x, y) => y <= 15);
      fillHead(Hr, PH, c, (x, y) => y >= 16 && (x <= 10 || x >= 29));
      Hr.line(12, 10, 16, 8, shade(c, 0.22));
    },
  };

  const EX = { L: 14, Rr: 26, Y: 21, M: 28 };
  function drawFace(F, s, expr, tier) {
    const eye = EYE;
    const red = '#b8323c', mouthC = '#5a2430', tear = '#9fd4ff';
    const eyes = (pat, y0) => { [EX.L, EX.Rr].forEach((cx, i) => { const rows = i ? pat.map((r) => r.split('').reverse().join('')) : pat; F.pattern(cx - Math.floor(rows[0].length / 2), y0, rows, { '#': eye, w: '#ffffff', b: tear }); }); };
    const blush = (strong) => { const c = strong ? [240, 110, 130, 190] : [245, 140, 150, 120]; F.rect(9, 25, 4, 2, c); F.rect(27, 25, 4, 2, c); };
    const brows = (kind) => {
      const c = shade(s.hairColor || '#333', -0.2);
      if (kind === 'sad') { F.line(11, 18, 16, 16, c); F.line(24, 16, 29, 18, c); }
      if (kind === 'angry') { F.line(11, 16, 16, 18, c); F.line(24, 18, 29, 16, c); F.line(12, 16, 16, 19, c); F.line(24, 19, 28, 16, c); }
      if (kind === 'up') { F.line(11, 16, 16, 16, c); F.line(24, 16, 29, 16, c); }
    };
    if (s.glassesP) {
      // armação redonda atrás dos olhos (desenhada antes)
    }
    switch (expr) {
      case 'feliz':
        if (tier === 1) { eyes(['.##.', '#..#'], 21); F.line(17, 27, 18, 28, mouthC); F.hline(19, 21, 29, mouthC); F.line(22, 28, 23, 27, mouthC); blush(false); }
        else if (tier === 2) { eyes(['.##.', '#..#'], 20); F.pattern(17, 27, ['#######', '.#rrr#.', '..###..'], { '#': mouthC, r: '#e86a7a' }); blush(true); }
        else {
          eyes(['.#.', '###', '.#.'], 20); F.set(EX.L, 18, '#fff6b0'); F.set(EX.Rr, 18, '#fff6b0');
          F.pattern(16, 26, ['#########', '#wwwwwww#', '.#rrrrr#.', '..#####..'], { '#': mouthC, r: '#e86a7a', w: '#fff' });
          blush(true);
          [[5, 6], [34, 8], [3, 30], [36, 28]].forEach(([x, y]) => { F.set(x, y, '#fff6b0'); F.set(x - 1, y, '#ffd86b'); F.set(x + 1, y, '#ffd86b'); F.set(x, y - 1, '#ffd86b'); F.set(x, y + 1, '#ffd86b'); });
        }
        break;
      case 'triste':
        brows('sad');
        if (tier === 1) { eyes(['##', '##', '##'], 21); F.line(17, 29, 18, 28, mouthC); F.hline(19, 21, 28, mouthC); F.line(22, 28, 23, 29, mouthC); }
        else if (tier === 2) { eyes(['###', '###', '.b.'], 21); F.set(EX.L, 24, tear); F.set(EX.Rr, 24, tear); F.set(EX.L, 25, tear); F.hline(18, 22, 29, mouthC); F.set(17, 30, mouthC); F.set(23, 30, mouthC); }
        else {
          eyes(['###', '.#.'], 22);
          for (let y = 24; y <= 33; y++) { F.set(EX.L - 1 + (y % 3 === 0 ? 1 : 0), y, tear); F.set(EX.Rr + (y % 3 === 0 ? -1 : 0), y, tear); }
          F.pattern(17, 27, ['.#####.', '#.....#', '.#.#.#.'], { '#': mouthC });
        }
        break;
      case 'irritado':
        brows('angry');
        if (tier === 1) { eyes(['##', '##', '##'], 21); F.hline(18, 22, 28, mouthC); }
        else if (tier === 2) { eyes(['###', '###'], 22); F.pattern(17, 27, ['#######', '#w#w#w#', '#######'], { '#': mouthC, w: '#fff' }); blush(true); }
        else {
          eyes(['w#w', '###'], 21);
          F.pattern(16, 26, ['#########', '#w.w.w.w#', '#.......#', '#w.w.w.w#', '#########'], { '#': mouthC, w: '#fff', '.': '#7a1f2a' });
          F.pattern(29, 6, ['.#.#.', '#...#', '.....', '#...#', '.#.#.'], { '#': red });
        }
        break;
      case 'medo':
        brows('up');
        eyes(['.www.', 'ww#ww', '.www.'], 20);
        F.pattern(16, 28, ['.#.#.#.#.', '#.#.#.#.#'], { '#': mouthC });
        F.pattern(32, 12, ['.b.', 'bbb', 'bbb', '.b.'], { b: tear });
        break;
      case 'ferido':
        F.pattern(EX.L - 2, 20, ['#...', '.##.', '#...'], { '#': eye });
        F.pattern(EX.Rr - 1, 20, ['...#', '.##.', '...#'], { '#': eye });
        F.pattern(17, 27, ['#######', '.#.#.#.'], { '#': mouthC });
        break;
      case 'apagado':
        F.hline(EX.L - 2, EX.L + 1, 22, eye); F.hline(EX.Rr - 1, EX.Rr + 2, 22, eye);
        F.hline(19, 21, 28, mouthC);
        break;
      default: // neutro
        eyes(['##', '##', '##', '##'], 20);
        F.set(EX.L - 1, 20, '#ffffff'); F.set(EX.Rr, 20, '#ffffff');
        if (s.face === 'sleepy') { F.rect(EX.L - 1, 20, 2, 2, s.skin); F.rect(EX.Rr, 20, 2, 2, s.skin); }
        F.hline(19, 20, 28, mouthC);
        blush(false);
    }
  }

  const portraits = {};
  Art.portrait = function (id, expr = 'neutro', tier = 1) {
    const key = id + ':' + expr + ':' + tier;
    if (portraits[key]) return portraits[key];
    const s = Art.charDef(id);
    let canvas;
    if (!s) return null;
    if ((s.body === 'kid' || !s.body) && PHAIR[s.portraitHair || s.hair]) canvas = kidPortrait(s, expr, tier);
    else canvas = autoPortrait(id, s, expr);
    portraits[key] = canvas;
    return canvas;
  };

  function kidPortrait(s, expr, tier) {
    const BK = new PA(40, 40), B = new PA(40, 40), H = new PA(40, 40), Hr = new PA(40, 40), F = new PA(40, 40), G = new PA(40, 40);
    const skin = expr === 'medo' ? mix(s.skin, '#e8e8ff', 0.25) : expr === 'irritado' && tier === 3 ? mix(s.skin, '#ff8080', 0.25) : s.skin;
    // ombros e roupa
    B.ellipse(20, 41, 15, 9, s.top || '#888');
    if (s.topStyle === 'striped') for (let y = 33; y < 40; y += 2) B.map((c, x, yy) => (yy === y ? R.Pixel.col(s.top2 || '#f0f0e8') : null));
    if (s.topStyle === 'raincoat' || s.topStyle === 'hoodie') { B.ellipse(20, 34, 11, 4, shade(s.top, -0.2)); }
    if (s.topStyle === 'sweater') B.ellipse(20, 33, 6, 2.5, s.top2 || '#f4f0ff');
    B.rect(17, 29, 6, 4, shade(skin, -0.15));
    const big = s.build === 'big' ? 1 : 0;
    H.ellipse(PH.cx, PH.cy, PH.rx + big, PH.ry, skin);
    H.ellipse(PH.cx, PH.cy + 10, 9, 2, shade(skin, -0.06));
    (PHAIR[s.portraitHair || s.hair] || PHAIR.short)(Hr, BK, s);
    if (s.glasses) {
      G.ring(EX.L - 0.5 + 0.5, EX.Y + 1.5, 4.6, s.glasses); G.ring(EX.Rr + 0.5, EX.Y + 1.5, 4.6, s.glasses);
      G.hline(19, 21, 21, s.glasses);
    }
    drawFace(F, s, expr, tier);
    if (s.bandaid) { F.rect(18, 24, 5, 2, '#f0d9b5'); F.set(20, 24, '#d9b48a'); F.set(20, 25, '#d9b48a'); }
    if (s.beard) { F.rect(14, 27, 12, 3, s.beard); F.rect(16, 30, 8, 2, s.beard); }
    const out = new PA(40, 40);
    for (const layer of [BK, B, H, Hr]) { layer.outline(OUT); out.draw(layer); }
    out.draw(F);
    out.draw(G);
    if (expr === 'apagado') {
      out.grayscale(0.85);
      [[20, 4], [21, 2], [20, 0], [19, 1]].forEach(([x, y]) => out.set(x, y, '#8a8a9a'));
    }
    return out.toCanvas();
  }

  function autoPortrait(id, s, expr) {
    const sh = Art.sheet(id);
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    // cabeça/corpo superior ampliados 2x
    g.drawImage(sh.frames.down[0], 0, 0, 16, 18, 4, 3, 32, 36);
    if (expr === 'apagado') { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#888'; g.fillRect(0, 0, 40, 40); }
    return c;
  }

  // retrato especial (sprite inteiro) para inimigos/objetos no diálogo
  Art.clearCache = function () { for (const k in sheets) delete sheets[k]; for (const k in portraits) delete portraits[k]; };
  void mix;
})();
