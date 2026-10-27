/* VAGALUME — interface da batalha: arena animada, inimigos, retratos do grupo
 * (cor = emoção), menus (lutar/fugir, comandos, habilidades, itens, alvo, combo),
 * números de dano, efeitos visuais, painel de vitória e transição de entrada. */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;
  const E = R.Emotions;
  const TH = () => R.THEME;
  const F = () => R.Font;
  const Battle = R.Battle.Battle;

  const BOXES = [[2, 138], [302, 138], [2, 2], [302, 2]];
  const BW = 80, BH = 76;
  const CMD = { x: 86, y: 156, w: 212, h: 56 };

  // ------------------------------------------------------------- âncoras
  Battle.prototype.boxPos = function (u) {
    const i = this.party.indexOf(u);
    return BOXES[i] || BOXES[0];
  };
  Battle.prototype.anchor = function (u) {
    if (u.side === 'party') { const [x, y] = this.boxPos(u); return [x + BW / 2, y + 24]; }
    const c = R.Art.enemy(u.sprite, 0);
    return [u.slotX, u.slotY - c.height * 0.55];
  };
  Battle.prototype.popup = function (u, text, color, delay = 0, sub = null) {
    const [x, y] = this.anchor(u);
    const n = this.popups.filter((p) => p.u === u && p.t < 0.5).length;
    this.popups.push({ u, x: x + U.rand(-4, 4), y: y - n * 10, text, color, t: -delay, sub });
  };
  Battle.prototype.sparkle = function (u, kind) {
    const [x, y] = this.anchor(u);
    if (kind === 'heal') for (let i = 0; i < 10; i++) this.ps.add({ x: x + U.rand(-14, 14), y: y + U.rand(-4, 12), vy: U.rand(-40, -20), life: 0.8, text: '+', color: U.choice(['#8ee6a0', '#ffc6e0']) });
  };
  Battle.prototype.emoBurst = function (u, key) {
    const [x, y] = this.anchor(u);
    const col = TH().emo[key] || '#fff';
    this.ps.add({ x, y, life: 0.6, shape: 'ring', size: 4, grow: 22, color: col });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.ps.add({ x, y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, drag: 3, life: 0.7, shape: key === 'triste' ? 'drop' : key === 'irritado' ? 'star' : 'glow', color: col });
    }
  };

  // --------------------------------------------------------------- efeitos
  const FX = {
    slash(b, x, y) { for (let i = 0; i < 3; i++) b.ps.add({ x: x - 16 + i * 4, y: y - 14 + i * 3, vx: 120, vy: 80, life: 0.25, shape: 'streak', color: '#ffffff' }); b.ps.burst(x, y, 8, { color: ['#fff', '#ffe08a'], speed: 60, life: 0.4 }); },
    claw(b, x, y) { for (let i = 0; i < 3; i++) b.ps.add({ x: x - 14 + i * 6, y: y - 16, vx: 40, vy: 140, life: 0.22, shape: 'drop', color: '#ff7b85', size: 2 }); b.ps.burst(x, y, 6, { color: ['#ff7b85', '#fff'], speed: 50, life: 0.35 }); },
    lantern(b, x, y) { b.ps.add({ x, y, life: 0.45, shape: 'ring', size: 3, grow: 18, color: '#ffb347' }); b.ps.burst(x, y, 14, { color: ['#ffb347', '#ffd86b', '#fff2a8'], speed: 70, life: 0.6, gravity: -40 }); },
    bat(b, x, y) { b.ps.burst(x, y, 16, { color: ['#ffffff', '#ffd86b'], speed: 110, life: 0.35, shape: 'star' }); b.ps.add({ x, y: y - 18, vy: -20, life: 0.5, text: 'POW!', color: '#ffd86b' }); },
    umbrella(b, x, y) { for (let i = 0; i < 10; i++) b.ps.add({ x: x + U.rand(-18, 18), y: y - 30, vy: U.rand(90, 140), life: 0.4, shape: 'drop', color: '#9ad4ff' }); b.ps.add({ x, y, life: 0.4, shape: 'ring', size: 2, grow: 16, color: '#5b7bd5' }); },
    book(b, x, y) { for (let i = 0; i < 10; i++) b.ps.add({ x: x + U.rand(-10, 10), y: y + U.rand(-10, 10), vx: U.rand(-60, 60), vy: U.rand(-70, -10), ay: 80, life: 0.7, size: 2, color: U.choice(['#fffaf0', '#e8e0ff']) }); b.ps.burst(x, y, 8, { color: ['#c8a8ff'], speed: 40, life: 0.5, shape: 'glow' }); },
    fire(b, x, y) { for (let i = 0; i < 22; i++) b.ps.add({ x: x + U.rand(-14, 14), y: y + U.rand(-4, 14), vy: U.rand(-80, -30), life: U.rand(0.4, 0.8), shape: 'glow', color: U.choice(['#ff8a3a', '#ffd86b', '#ff5a3a']) }); },
    water(b, x, y) { b.ps.burst(x, y, 18, { color: ['#7cc0ec', '#a8dcf8', '#ffffff'], speed: 80, life: 0.5, gravity: 120, shape: 'drop' }); },
    heal(b, x, y) { for (let i = 0; i < 10; i++) b.ps.add({ x: x + U.rand(-14, 14), y: y + U.rand(0, 14), vy: U.rand(-40, -20), life: 0.8, text: '+', color: U.choice(['#8ee6a0', '#ffc6e0']) }); },
    snack(b, x, y) { b.ps.burst(x, y + 6, 10, { color: ['#e9b06a', '#c88a40'], speed: 40, life: 0.6, gravity: 100 }); FX.heal(b, x, y); },
    star(b, x, y) { b.ps.burst(x, y, 14, { color: ['#ffd86b', '#fff6b0'], speed: 80, life: 0.5, shape: 'star' }); },
    shine(b, x, y) { b.ps.burst(x, y, 16, { color: ['#ffffff', '#fff6b0'], speed: 50, life: 0.7, shape: 'glow' }); },
    dark(b, x, y) { for (let i = 0; i < 18; i++) b.ps.add({ x: x + U.rand(-16, 16), y: y + U.rand(-10, 10), vx: U.rand(-20, 20), vy: U.rand(-30, 0), life: 0.9, size: 3, color: U.choice(['#1d1a35', '#3a3458', '#000000']) }); },
    stare(b, x, y) { R.Screen.flash('#1a1030', 0.4); b.ps.add({ x, y, life: 0.6, shape: 'ring', size: 10, grow: -8, color: '#c8c2ff' }); },
    kite(b, x, y) { for (let i = 0; i < 8; i++) b.ps.add({ x: x - 60 + i * 4, y: y - 30 + i * 2, vx: 260, vy: 90, life: 0.35, shape: 'streak', color: U.choice(['#e8504a', '#ffd86b']) }); FX.bat(b, x, y); },
    roots(b, x, y) { for (let i = 0; i < 14; i++) b.ps.add({ x: x + U.rand(-20, 20), y: y + 26, vy: U.rand(-90, -40), life: 0.5, size: 2, color: U.choice(['#8a5f42', '#5fae6a']) }); },
    sleep(b, x, y) { for (let i = 0; i < 4; i++) b.ps.add({ x: x + i * 5, y: y - i * 6, vy: -18, vx: 8, life: 1, text: 'z', color: '#c8c2ff' }); },
    mask(b, x, y) { b.ps.burst(x, y, 14, { color: ['#c8a8ff', '#ffffff'], speed: 60, life: 0.6, shape: 'glow' }); },
    tide(b, x, y) { for (let i = 0; i < 24; i++) b.ps.add({ x: x + U.rand(-30, 30), y: y + 20, vy: U.rand(-110, -40), ay: 160, life: 0.7, shape: 'drop', color: U.choice(['#4a8ac0', '#7cc0ec', '#ffffff']) }); },
    page(b, x, y) { FX.book(b, x, y); },
    alltogether(b, x, y) { R.Screen.flash('#ffffff', 0.7); b.ps.burst(x, y, 40, { color: ['#f7d64a', '#6aa6f0', '#f0545e', '#ffffff', '#ffc6e0'], speed: 140, life: 0.9, shape: 'star' }); },
    none() {},
  };
  Battle.prototype.fx = async function (kind, targets, user) {
    const fn = FX[kind] || FX.slash;
    if (user && user.side === 'enemy') { user.anim.act = 1; }
    for (const t of targets) { const [x, y] = this.anchor(t); fn(this, x, y); }
    if (kind && kind !== 'none') await this.wait(kind === 'alltogether' ? 600 : 320);
  };

  // ---------------------------------------------------------------- fundos
  const BG = {
    quintal: ['#9bd68a', '#5f9f75', 'dots', '#b9e8a4'],
    campos: ['#ffd0e4', '#b8a8f0', 'hearts', '#fff4fa'],
    floresta: ['#2f6a58', '#173a33', 'leaves', '#4f9a7a'],
    gruta: ['#203a68', '#0c1430', 'bubbles', '#4a7ab0'],
    bairro: ['#6a6a74', '#2a2a32', 'lines', '#8a8a96'],
    rochedo: ['#7a9ac8', '#3a4a7a', 'waves', '#a8c4e8'],
    farol: ['#3a2a4a', '#120c1c', 'stars', '#6a5a8a'],
    casa: ['#c89a6a', '#7a5a4a', 'dots', '#e0b888'],
    boss_raiz: ['#4a8a5a', '#1a2a1a', 'leaves', '#ff9fc8'],
    boss_fundo: ['#16305a', '#04081a', 'bubbles', '#2a6aa0'],
    boss_ninguem: ['#5a4a6a', '#1a1424', 'masks', '#a898c0'],
    boss_apagador: ['#1a1830', '#020208', 'stars', '#4a4670'],
    tutorial: ['#9bd68a', '#5f9f75', 'dots', '#b9e8a4'],
  };
  Battle.prototype.drawBg = function (ctx) {
    const d = BG[this.bg] || BG.campos;
    const g = ctx.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, d[0]); g.addColorStop(1, d[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
    const t = this.t;
    ctx.fillStyle = d[3];
    ctx.globalAlpha = 0.28;
    const pat = d[2];
    for (let j = -1; j < 9; j++)
      for (let i = -1; i < 14; i++) {
        let x = i * 32 + ((t * 10) % 32) + (j % 2) * 16, y = j * 28 + ((t * 6) % 28);
        x = Math.round(x); y = Math.round(y);
        if (pat === 'dots') { ctx.fillRect(x, y, 3, 3); }
        else if (pat === 'hearts') { ctx.fillRect(x, y + 1, 2, 2); ctx.fillRect(x + 3, y + 1, 2, 2); ctx.fillRect(x + 1, y + 2, 3, 2); ctx.fillRect(x + 2, y + 4, 1, 1); }
        else if (pat === 'leaves') { ctx.fillRect(x, y, 4, 2); ctx.fillRect(x + 1, y + 2, 2, 1); }
        else if (pat === 'bubbles') { const yy = y - ((t * 20 + i * 7) % 40); ctx.fillRect(x, yy, 2, 1); ctx.fillRect(x - 1, yy + 1, 1, 2); ctx.fillRect(x + 2, yy + 1, 1, 2); ctx.fillRect(x, yy + 3, 2, 1); }
        else if (pat === 'lines') { ctx.fillRect(x, y, 10, 1); }
        else if (pat === 'waves') { ctx.fillRect(x + Math.round(Math.sin(t + j) * 3), y, 6, 1); ctx.fillRect(x + 6 + Math.round(Math.sin(t + j) * 3), y + 1, 4, 1); }
        else if (pat === 'stars') { if ((i * 7 + j * 3) % 4 === 0) { const a = Math.sin(t * 2 + i + j) > 0 ? 1 : 0; ctx.fillRect(x, y, 1, 1 + a); ctx.fillRect(x - a, y + a, 1 + 2 * a, 1); } }
        else if (pat === 'masks') { ctx.fillRect(x, y, 6, 4); ctx.clearRect && 0; }
      }
    ctx.globalAlpha = 1;
    // palco
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(192, 134, 120, 12, 0, 0, Math.PI * 2); ctx.fill();
  };

  // silhueta branca para o piscar de dano
  const whiteCache = new Map();
  function whiteOf(c) {
    let w = whiteCache.get(c);
    if (w) return w;
    w = document.createElement('canvas');
    w.width = c.width; w.height = c.height;
    const g = w.getContext('2d');
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w.width, w.height);
    whiteCache.set(c, w);
    return w;
  }

  // ---------------------------------------------------------------- desenho
  Battle.prototype.render = function (ctx) {
    const intro = R.U.ease.outQuad(this.introT);
    ctx.save();
    ctx.translate(R.Screen.fx.sx, R.Screen.fx.sy);
    this.drawBg(ctx);
    // maré
    if (this.tide) {
      const lvl = this.tide.level / 4;
      const wy = Math.round(140 - lvl * 70 + Math.sin(this.t * 2) * 2);
      ctx.fillStyle = 'rgba(40,110,180,0.35)';
      ctx.fillRect(0, wy, R.W, R.H - wy);
      ctx.fillStyle = 'rgba(200,230,255,0.5)';
      for (let x = 0; x < R.W; x += 6) ctx.fillRect(x, wy + Math.round(Math.sin(this.t * 3 + x * 0.2) * 1.5), 4, 1);
    }
    // inimigos
    const tgt = this.ui && this.ui.targets ? this.ui.current() : null;
    const order = this.enemies.filter((e) => !e.gone).slice().sort((a, b) => a.slotY - b.slotY);
    for (const e of order) {
      const a = e.anim;
      const blink = Math.floor(this.t * 1.3 + e.slotX) % 6 === 0 && (this.t * 1.3 + e.slotX) % 1 < 0.15;
      const variant = this.brain && this.brain.variant ? this.brain.variant(e) : '';
      const c = R.Art.enemy(e.sprite, blink ? 1 : 0, variant);
      const bob = Math.round(Math.sin(this.t * 2.2 + e.slotX * 0.1) * 2);
      const sx = a.shake > 0 ? Math.round(Math.sin(a.shake * 60) * 3) : 0;
      const lunge = a.act > 0 ? Math.round(Math.sin(a.act * Math.PI) * 6) : 0;
      const x = Math.round(e.slotX - c.width / 2 + sx), y = Math.round(e.slotY - c.height + bob + lunge - (1 - intro) * 120 - (a.dying || 0) * 20);
      ctx.globalAlpha = Math.max(0, a.alpha);
      // aura da emoção
      if (e.emotion.type && e.alive()) {
        ctx.globalAlpha = Math.max(0, a.alpha) * (0.25 + 0.1 * Math.sin(this.t * 4));
        ctx.fillStyle = TH().emo[e.emotion.type];
        ctx.beginPath(); ctx.ellipse(e.slotX, y + c.height * 0.55, c.width * 0.55, c.height * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = Math.max(0, a.alpha);
      }
      ctx.drawImage(c, x, y);
      if (a.flash > 0) { ctx.globalAlpha = a.flash * Math.max(0, a.alpha); ctx.drawImage(whiteOf(c), x, y); }
      ctx.globalAlpha = 1;
      if (!e.alive() || a.alpha < 0.5) continue;
      // barra de vida + emoção
      const bw = Math.min(46, Math.max(30, c.width * 0.6));
      const by = e.slotY + 4;
      R.UI.bar(ctx, e.slotX - bw / 2, by, bw, 3, e.hp, e.mhp, '#ff6f8e', '#3a1a28');
      if (e.emotion.type) {
        R.UI.icon(ctx, e.emotion.type, e.slotX - bw / 2 - 11, by - 3);
        for (let k = 0; k < e.emotion.tier; k++) { ctx.fillStyle = TH().emo[e.emotion.type]; ctx.fillRect(e.slotX - bw / 2 + k * 4, by + 5, 3, 2); }
      }
      const tags = [];
      if (e.status.atordoado) tags.push('ATORD.');
      if (e.status.sonolento) tags.push('zzz');
      if (e.buffs.some((b) => b.mult < 1)) tags.push('↓');
      if (e.buffs.some((b) => b.mult > 1)) tags.push('↑');
      if (tags.length) F().draw(ctx, tags.join(' '), e.slotX + bw / 2 + 3, by - 3, '#c8c2ff', { outline: '#1a1224' });
      if (tgt === e) {
        const ay = y - 10 + Math.round(Math.sin(this.t * 8) * 2);
        F().draw(ctx, '▼', e.slotX - 2, ay, TH().accent, { outline: '#1a1224' });
      }
    }
    // escuridão (Apagador)
    if (this.darkness > 0) {
      ctx.fillStyle = 'rgba(2,2,10,' + this.darkness + ')';
      ctx.fillRect(0, 0, R.W, R.H);
      if (this.darkness > 0.3) {
        const g = ctx.createRadialGradient(192, 110, 4, 192, 110, 60);
        g.addColorStop(0, 'rgba(255,240,180,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(100, 40, 184, 140);
      }
    }
    // grupo
    this.party.forEach((u, i) => this.drawBox(ctx, u, i, intro));
    // mensagem
    R.UI.window(ctx, 86, 2, 212, 27, { alpha: 0.9 });
    if (this.msg) F().draw(ctx, this.fitText(this.msg, 200), 92, 4, TH().text);
    if (this.msg2) F().draw(ctx, this.fitText(this.msg2, 200), 92, 15, TH().accent);
    // maré (indicador)
    if (this.tide) {
      F().draw(ctx, 'MARÉ', 92, 32, '#9ad4ff', { outline: '#0a1430' });
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k < this.tide.level ? '#4a9ae8' : '#1a2a48'; ctx.fillRect(118 + k * 9, 34, 7, 5); }
    }
    // laço
    this.drawLaco(ctx);
    // menu
    if (this.ui) this.ui.render(ctx);
    else {
      R.UI.window(ctx, CMD.x, CMD.y, CMD.w, CMD.h, { alpha: 0.8 });
      if (this.activeExec) F().draw(ctx, 'Vez de ' + this.activeExec.name, CMD.x + CMD.w / 2, CMD.y + 22, TH().dim, { align: 'center' });
      F().draw(ctx, 'segure Z para acelerar', CMD.x + CMD.w / 2, CMD.y + 40, '#5d5677', { align: 'center' });
    }
    this.ps.render(ctx);
    // números
    for (const p of this.popups) {
      if (p.t < 0) continue;
      const k = p.t;
      const y = p.y - 8 - Math.min(10, k * 40) + (k > 0.15 ? Math.min(3, (k - 0.15) * 20) : 0);
      const a = k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.3) : 1;
      ctx.globalAlpha = a;
      F().draw(ctx, p.text, Math.round(p.x), Math.round(y), p.color, { outline: '#1a1224', align: 'center' });
      if (p.sub) F().draw(ctx, p.sub, Math.round(p.x), Math.round(y) - 11, p.sub === 'CRÍTICO!' ? '#ffd86b' : p.sub === 'VANTAGEM!' ? '#8ee6a0' : '#a8a2bc', { outline: '#1a1224', align: 'center' });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // entrada
    if (this.introT < 1) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - intro) + ')'; ctx.fillRect(0, 0, R.W, R.H); }
  };
  Battle.prototype.fitText = function (t, w) {
    if (F().measure(t) <= w) return t;
    while (t.length > 3 && F().measure(t + '…') > w) t = t.slice(0, -1);
    return t + '…';
  };
  Battle.prototype.drawBox = function (ctx, u, i, intro) {
    let [x, y] = BOXES[i];
    const slide = (1 - intro) * (y < 100 ? -90 : 90);
    y = Math.round(y + slide);
    const active = this.active === u || this.activeExec === u;
    const a = u.anim;
    if (a.shake > 0) x += Math.round(Math.sin(a.shake * 70) * 2);
    if (active) y += y < 100 ? 2 : -3;
    const isTarget = this.ui && this.ui.targets && this.ui.current() === u;
    const emo = u.emotion.type || 'neutro';
    R.UI.window(ctx, x, y, BW, BH, { bg: u.alive() ? TH().bg : '#100c18', border: isTarget ? TH().accent : active ? '#fff6b0' : TH().border });
    // retrato
    const px = x + 18, py = y + 3;
    ctx.fillStyle = u.alive() ? TH().emoBg[emo] : '#1a1622';
    ctx.fillRect(px, py, 44, 40);
    if (u.alive() && emo !== 'neutro') {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.t * 3);
      ctx.fillStyle = TH().emo[emo];
      for (let k = 0; k < 44; k += 6) ctx.fillRect(px + ((k + Math.floor(this.t * 12)) % 44), py, 2, 40);
      ctx.globalAlpha = 1;
    }
    let expr = 'neutro', tier = 1;
    if (!u.alive()) expr = 'apagado';
    else if (a.hurt > 0) expr = 'ferido';
    else if (u.emotion.type) { expr = u.emotion.type; tier = u.emotion.tier; }
    const p = R.Art.portrait(u.id, expr, tier);
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, 44, 40); ctx.clip();
    const bob = active ? Math.round(Math.sin(this.t * 6)) : 0;
    ctx.drawImage(p, px + 2, py + 1 + bob);
    if (a.flash > 0) { ctx.globalAlpha = a.flash * 0.6; ctx.fillStyle = '#ff4050'; ctx.fillRect(px, py, 44, 40); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.strokeStyle = '#06040c'; ctx.lineWidth = 1; ctx.strokeRect(px - 0.5, py - 0.5, 45, 41);
    // emoção
    if (u.alive() && u.emotion.type) {
      R.UI.icon(ctx, u.emotion.type, x + 66, y + 4);
      for (let k = 0; k < (u.emotion.tier || 1); k++) { ctx.fillStyle = TH().emo[u.emotion.type]; ctx.fillRect(x + 66 + k * 4, y + 15, 3, 2); }
    }
    // estados
    const tags = [];
    if (u.defending) tags.push('DEF');
    if (u.status.protegido) tags.push('ABR');
    if (u.status.provocando) tags.push('PRV');
    if (u.status.sonolento) tags.push('zz');
    if (u.status.enraizado) tags.push('RAIZ');
    if (u.status.selado) tags.push('ESQ');
    if (u.status.contra) tags.push('CTR');
    tags.slice(0, 3).forEach((tg, k) => F().draw(ctx, tg, x + 3, y + 3 + k * 10, '#c8c2ff', { outline: '#120e1e' }));
    // nome e barras
    F().draw(ctx, u.name, x + 4, y + 43, active ? TH().accent : u.alive() ? TH().text : TH().disabled);
    F().draw(ctx, String(u.hp), x + 76, y + 43, '#ff9aa8', { align: 'right' });
    R.UI.bar(ctx, x + 4, y + 56, 72, 3, u.hp, u.mhp, TH().hp, TH().hpBg);
    F().draw(ctx, 'BR', x + 4, y + 59, '#c89050');
    F().draw(ctx, u.br + '/' + u.mbr, x + 76, y + 59, TH().br, { align: 'right' });
    R.UI.bar(ctx, x + 4, y + 71, 72, 2, u.br, u.mbr, TH().br, TH().brBg);
  };
  Battle.prototype.drawLaco = function (ctx) {
    const x = 104, y = 142;
    F().draw(ctx, 'LAÇO', x - 16, y - 2, '#ffa8d0', { outline: '#1a1224' });
    R.UI.icon(ctx, 'laco', x + 10, y - 1);
    for (let k = 0; k < 10; k++) {
      const on = k < this.laco;
      const xx = x + 22 + k * 15;
      ctx.fillStyle = '#1a1224'; ctx.fillRect(xx - 1, y - 1, 14, 8);
      ctx.fillStyle = on ? (k >= 9 ? '#fff6b0' : k >= 2 ? '#ff8ec0' : '#c86a9a') : '#3a2a48';
      ctx.fillRect(xx, y, 12, 6);
      if (on) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(xx, y, 12, 1); }
      if (k === 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(xx + 12, y - 2, 1, 10); }
    }
  };

  // ============================================================ menus
  // LUTAR / FUGIR
  class PartyMenu {
    constructor(b) { this.b = b; this.sel = 0; }
    update() {
      const I = R.Input;
      if (I.repeat('left') || I.repeat('right')) { this.sel = 1 - this.sel; R.Audio.sfx('cursor'); }
      if (I.pressed('confirm')) { R.Audio.sfx('confirm'); return this.sel === 0 ? 'fight' : 'flee'; }
      return null;
    }
    render(ctx) {
      R.UI.window(ctx, CMD.x, CMD.y, CMD.w, CMD.h);
      F().draw(ctx, 'O que vocês vão fazer?', CMD.x + CMD.w / 2, CMD.y + 6, TH().dim, { align: 'center' });
      ['LUTAR', 'FUGIR'].forEach((t, i) => {
        const x = CMD.x + 30 + i * 100, y = CMD.y + 26;
        const dis = i === 1 && !this.b.opts.canFlee;
        R.UI.window(ctx, x, y, 72, 18, { bg: i === this.sel ? '#2c2350' : TH().bg });
        F().draw(ctx, t, x + 36, y + 3, dis ? TH().disabled : i === this.sel ? TH().accent : TH().text, { align: 'center' });
        if (i === this.sel) R.UI.cursor(ctx, x - 9, y + 5);
      });
    }
  }
  // ATACAR / HABILIDADE / ITEM / DEFENDER (+ especiais de chefe)
  class CommandMenu {
    constructor(b, u, special) {
      this.b = b; this.u = u;
      const base = [
        { label: 'ATACAR', v: 'attack' },
        { label: 'HABILIDADE', v: 'skill', disabled: !u.skills.length || E.mods(u.emotion).noSkills },
        { label: 'ITEM', v: 'item', disabled: !battleItems(b).length },
        { label: 'DEFENDER', v: 'defend' },
      ];
      if (special && special.only) this.opts = special.options.map((o) => ({ label: o.label, v: { special: o.special }, disabled: o.disabled, hint: o.hint }));
      else {
        this.opts = base;
        if (special) for (const o of special.options) this.opts.push({ label: o.label, v: { special: o.special }, disabled: o.disabled, hint: o.hint });
      }
      this.sel = 0;
      R.Audio.sfx('cursor');
    }
    update() {
      const I = R.Input, n = this.opts.length;
      const cols = 2;
      if (I.repeat('right')) { this.sel = (this.sel + 1) % n; R.Audio.sfx('cursor'); }
      if (I.repeat('left')) { this.sel = (this.sel + n - 1) % n; R.Audio.sfx('cursor'); }
      if (I.repeat('down')) { this.sel = Math.min(n - 1, this.sel + cols); R.Audio.sfx('cursor'); }
      if (I.repeat('up')) { this.sel = Math.max(0, this.sel - cols); R.Audio.sfx('cursor'); }
      if (I.pressed('confirm')) {
        const o = this.opts[this.sel];
        if (o.disabled) { R.Audio.sfx('buzzer'); return null; }
        R.Audio.sfx('confirm');
        return o.v;
      }
      if (I.pressed('cancel')) { R.Audio.sfx('cancel'); return 'back'; }
      return null;
    }
    render(ctx) {
      const h = Math.max(CMD.h, 18 + Math.ceil(this.opts.length / 2) * 14);
      const y0 = CMD.y + CMD.h - h;
      R.UI.window(ctx, CMD.x, y0, CMD.w, h);
      F().draw(ctx, 'O que ' + this.u.name + ' vai fazer?', CMD.x + 8, y0 + 4, TH().dim);
      this.opts.forEach((o, i) => {
        const x = CMD.x + 16 + (i % 2) * 100, y = y0 + 18 + Math.floor(i / 2) * 14;
        F().draw(ctx, o.label, x, y, o.disabled ? TH().disabled : i === this.sel ? TH().accent : TH().text);
        if (i === this.sel) R.UI.cursor(ctx, x - 11, y + 1);
      });
      const o = this.opts[this.sel];
      const hint = o.hint || { attack: 'Ataque básico. Enche o LAÇO.', skill: 'Habilidades equipadas (gastam BRILHO).', item: 'Usar lanches e brinquedos.', defend: 'Reduz o dano pela metade nesta rodada.' }[o.v];
      if (hint) { this.b.msg = this.u.name + ' — ' + E.label(this.u.emotion); this.b.msg2 = hint; }
    }
  }
  function battleItems(b) {
    return R.Inventory.list(['lanche', 'brinquedo']).filter((e) => e.def.use && e.def.use.battle !== false && e.qty - (b.reserved[e.id] || 0) > 0 &&
      (e.def.use.target !== 'allyDead' || b.party.some((p) => !p.alive())));
  }
  // lista genérica (habilidades / itens)
  class ListMenu {
    constructor(b, u, items, title) {
      this.b = b; this.u = u; this.items = items; this.title = title;
      this.lb = new R.UIKit.ListBox({ x: CMD.x + 6, y: CMD.y - 30, w: CMD.w - 16, rows: 6, lh: 12, items });
    }
    update() {
      const r = this.lb.input();
      if (r === 'cancel') return 'back';
      if (r === 'confirm') return this.lb.current().v;
      return null;
    }
    render(ctx) {
      R.UI.window(ctx, CMD.x, CMD.y - 38, CMD.w, CMD.h + 38, { title: this.title });
      this.lb.render(ctx);
      const it = this.lb.current();
      if (it) { this.b.msg = it.descA || ''; this.b.msg2 = it.descB || ''; }
    }
  }
  class SkillMenu extends ListMenu {
    constructor(b, u) {
      const S = R.DB.skills.skills;
      const items = u.skills.map((id) => {
        const d = S[id];
        const sealed = u.status.selado && u.status.selado.skill === id;
        const noTarget = !b.targetPool(u, d).length;
        const dis = u.br < d.cost || sealed || noTarget;
        const words = R.Font.wrap(d.desc, 200);
        return { label: d.name + (sealed ? ' (esquecida)' : noTarget ? ' (sem alvo)' : ''), right: d.cost + ' BR', v: id, disabled: dis, descA: words[0] || '', descB: words.slice(1).join(' ') };
      });
      super(b, u, items, 'Habilidades de ' + u.name);
    }
  }
  class ItemMenu extends ListMenu {
    constructor(b, u) {
      const items = battleItems(b).map((e) => {
        const words = R.Font.wrap(e.def.desc, 200);
        return { label: e.def.name, right: 'x' + (e.qty - (b.reserved[e.id] || 0)), v: e.id, descA: words[0] || '', descB: words.slice(1).join(' ') };
      });
      super(b, u, items, 'Itens');
    }
  }
  // escolha de alvo
  class TargetMenu {
    constructor(b, u, pool, def) {
      this.b = b; this.u = u; this.targets = pool; this.def = def;
      this.sel = 0;
      if (pool.includes(b.lastTarget) && def.target === 'foe') this.sel = pool.indexOf(b.lastTarget);
    }
    current() { return this.targets[this.sel]; }
    update() {
      const I = R.Input, n = this.targets.length;
      if (I.repeat('right') || I.repeat('down')) { this.sel = (this.sel + 1) % n; R.Audio.sfx('cursor'); }
      if (I.repeat('left') || I.repeat('up')) { this.sel = (this.sel + n - 1) % n; R.Audio.sfx('cursor'); }
      if (I.pressed('confirm')) { R.Audio.sfx('confirm'); return this.current(); }
      if (I.pressed('cancel')) { R.Audio.sfx('cancel'); return 'back'; }
      return null;
    }
    render(ctx) {
      const t = this.current();
      R.UI.window(ctx, CMD.x, CMD.y, CMD.w, CMD.h);
      F().draw(ctx, 'Escolha o alvo  (← →)', CMD.x + 8, CMD.y + 4, TH().dim);
      if (!t) return;
      F().draw(ctx, t.name, CMD.x + 8, CMD.y + 18, TH().accent);
      F().draw(ctx, 'VIDA ' + t.hp + '/' + t.mhp, CMD.x + 8, CMD.y + 30, TH().text);
      const emo = E.label(t.emotion);
      F().draw(ctx, emo, CMD.x + CMD.w - 8, CMD.y + 18, E.color(t.emotion), { align: 'right' });
      const adv = this.def && (this.def.basic || (this.def.effects || []).some((e) => e.type === 'damage')) && t.side !== this.u.side ? E.advantage(this.u.emotion, t.emotion) : 0;
      if (adv) F().draw(ctx, adv > 0 ? 'Vantagem emocional!' : 'Desvantagem emocional...', CMD.x + CMD.w - 8, CMD.y + 30, adv > 0 ? TH().good : TH().bad, { align: 'right' });
      if (t.def && t.def.desc) F().draw(ctx, this.b.fitText(t.def.desc, CMD.w - 16), CMD.x + 8, CMD.y + 42, TH().dim);
      if (t.side === 'party') { const [x, y] = this.b.boxPos(t); R.UI.cursor(ctx, x + BW / 2 - 3, y < 100 ? y + BH + 2 : y - 9); }
    }
  }
  // combos do LAÇO
  class FollowupMenu {
    constructor(b, u, opts) {
      this.b = b; this.u = u;
      this.items = opts.map((f) => ({ label: f.name + (f.all ? '' : ' + ' + R.Party.def(f.with).name), right: f.cost, v: f, desc: f.desc }));
      this.items.push({ label: 'Seguir sem combo', v: 'back', desc: 'Guardar o LAÇO para depois.' });
      this.lb = new R.UIKit.ListBox({ x: 104, y: 70, w: 172, rows: 6, lh: 13, items: this.items });
      this.t = 0;
    }
    update(dt) {
      this.t += dt;
      const r = this.lb.input();
      if (r === 'cancel') return 'back';
      if (r === 'confirm') return this.lb.current().v;
      return null;
    }
    render(ctx) {
      const h = this.items.length * 13 + 30;
      R.UI.window(ctx, 92, 52, 200, h, { title: 'COMBO! (LAÇO ' + this.b.laco + ')', bg: '#2a1838' });
      this.lb.render(ctx);
      const it = this.lb.current();
      if (it) { const w = R.Font.wrap(it.desc || '', 200); this.b.msg = w[0] || ''; this.b.msg2 = w.slice(1).join(' '); }
    }
  }
  // painel de vitória
  class VictoryPanel {
    constructor(b, info) {
      this.b = b; this.info = info; this.page = 0; this.t = 0;
      this.pages = [{ kind: 'sum' }].concat(info.levels.map((l) => ({ kind: 'lvl', l })));
    }
    update(dt) {
      this.t += dt;
      if (this.t > 0.5 && (R.Input.pressed('confirm') || R.Input.pressed('cancel'))) {
        this.page++; this.t = 0;
        R.Audio.sfx('text');
        if (this.page < this.pages.length && this.pages[this.page].kind === 'lvl') R.Audio.sfx('levelup');
        if (this.page >= this.pages.length) return 'done';
      }
      return null;
    }
    render(ctx) {
      const p = this.pages[Math.min(this.page, this.pages.length - 1)];
      R.UI.window(ctx, 96, 44, 192, 92, { title: p.kind === 'sum' ? 'VITÓRIA!' : 'NOVO NÍVEL!', bg: '#1e2a3a' });
      if (p.kind === 'sum') {
        F().draw(ctx, 'EXP ganha: ' + this.info.exp, 108, 56, TH().exp);
        R.UI.icon(ctx, 'botao', 108, 72);
        F().draw(ctx, this.info.money + ' botões', 120, 70, TH().accent);
        F().draw(ctx, this.info.items.length ? 'Encontrou: ' + this.info.items.join(', ') : 'Nenhum item encontrado.', 108, 86, TH().text);
        F().draw(ctx, 'Amigos que caíram voltam com 1 de VIDA.', 108, 104, TH().dim);
      } else {
        const l = p.l, d = R.Party.def(l.id);
        F().draw(ctx, d.name + ' chegou ao nível ' + l.level + '!', 108, 56, TH().accent);
        const names = { hp: 'VIDA', br: 'BR', atq: 'ATQ', def: 'DEF', vel: 'VEL', sor: 'SOR' };
        R.Party.STATS.forEach((k, i) => {
          const x = 108 + (i % 3) * 58, y = 72 + Math.floor(i / 3) * 12;
          const dlt = l.after[k] - l.before[k];
          F().draw(ctx, names[k] + ' ' + l.after[k], x, y, TH().text);
          if (dlt > 0) F().draw(ctx, '+' + dlt, x + 50, y, TH().good, { align: 'right' });
        });
        if (l.skills.length) F().draw(ctx, 'Aprendeu: ' + l.skills.map((s) => R.DB.skills.skills[s].name).join(', '), 108, 100, '#ffa8d0');
      }
      if (this.t > 0.5) F().draw(ctx, '▼', 276, 124 + (Math.floor(this.t * 3) % 2), TH().accent);
    }
  }

  // ------------------------------------------------------------ transição
  class TransitionScene {
    constructor(snapshot) { this.opaque = true; this.snap = snapshot; this.t = 0; this.pausable = false; }
    enter() { R.Audio.sfx('battleStart'); }
    update(dt) { this.t += dt; if (this.t >= 0.65) R.Scenes.pop(this); }
    render(ctx) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, R.H);
      const k = Math.min(1, this.t / 0.6);
      const strips = 12, h = R.H / strips;
      for (let i = 0; i < strips; i++) {
        const dir = i % 2 ? 1 : -1;
        const off = dir * Math.pow(k, 2) * R.W * 1.1;
        ctx.drawImage(this.snap, 0, i * h, R.W, h, Math.round(off), i * h, R.W, h);
      }
      if (this.t < 0.12) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - this.t / 0.12) + ')'; ctx.fillRect(0, 0, R.W, R.H); }
    }
  }

  R.BattleUI = {
    PartyMenu, CommandMenu, SkillMenu, ItemMenu, TargetMenu, FollowupMenu, VictoryPanel,
    transition() {
      const snap = document.createElement('canvas');
      snap.width = R.W; snap.height = R.H;
      snap.getContext('2d').drawImage(R.Screen.canvas, 0, 0);
      return R.Scenes.push(new TransitionScene(snap));
    },
  };
  void Battle;
})();
