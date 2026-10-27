/* VAGALUME — telas: kit de interface, título, salvar/carregar, configurações,
 * créditos, cartões narrativos e fim de jogo. */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;
  const TH = () => R.THEME;
  const F = () => R.Font;

  // ================================================================ kit
  class ListBox {
    constructor(o) {
      Object.assign(this, { x: 0, y: 0, w: 120, rows: 6, lh: 13, items: [], sel: 0, scroll: 0, wrap: true }, o);
    }
    setItems(items) { this.items = items; this.sel = U.clamp(this.sel, 0, Math.max(0, items.length - 1)); this.fix(); }
    fix() {
      if (this.sel < this.scroll) this.scroll = this.sel;
      if (this.sel >= this.scroll + this.rows) this.scroll = this.sel - this.rows + 1;
      this.scroll = U.clamp(this.scroll, 0, Math.max(0, this.items.length - this.rows));
    }
    current() { return this.items[this.sel]; }
    // devolve 'confirm' | 'cancel' | 'left' | 'right' | null
    input() {
      const I = R.Input;
      const n = this.items.length;
      if (n && I.repeat('up')) { this.sel = this.wrap ? (this.sel + n - 1) % n : Math.max(0, this.sel - 1); this.fix(); R.Audio.sfx('cursor'); }
      if (n && I.repeat('down')) { this.sel = this.wrap ? (this.sel + 1) % n : Math.min(n - 1, this.sel + 1); this.fix(); R.Audio.sfx('cursor'); }
      if (I.repeat('left')) return 'left';
      if (I.repeat('right')) return 'right';
      if (I.pressed('confirm')) {
        const it = this.current();
        if (!it || it.disabled) { R.Audio.sfx('buzzer'); return null; }
        R.Audio.sfx('confirm');
        return 'confirm';
      }
      if (I.pressed('cancel')) { R.Audio.sfx('cancel'); return 'cancel'; }
      return null;
    }
    render(ctx, focus = true) {
      R.UI.list(ctx, this.items, this.x, this.y, this.sel, { rows: this.rows, scroll: this.scroll, lh: this.lh, width: this.w, focus });
    }
  }

  // caixa de confirmação / mensagem
  class PromptScene {
    constructor(text, options, opts = {}) {
      this.opaque = false;
      this.text = text;
      this.opts = opts;
      const lines = F().wrap(text, 240);
      this.lines = lines;
      const w = Math.max(160, Math.min(280, Math.max(...lines.map((l) => F().measure(l))) + 24));
      this.w = w;
      this.h = lines.length * 12 + 14 + (options.length ? options.length * 13 + 6 : 0);
      this.x = Math.round((R.W - w) / 2);
      this.y = Math.round((R.H - this.h) / 2);
      this.list = new ListBox({ x: this.x + 10, y: this.y + 8 + lines.length * 12 + 4, w: w - 20, rows: options.length, items: options.map((o) => ({ label: o })) });
      this.list.sel = opts.default || 0;
    }
    update() {
      if (!this.list.items.length) {
        if (R.Input.pressed('confirm') || R.Input.pressed('cancel')) { R.Audio.sfx('confirm'); R.Scenes.pop(this, 0); }
        return;
      }
      const r = this.list.input();
      if (r === 'confirm') R.Scenes.pop(this, this.list.sel);
      else if (r === 'cancel') R.Scenes.pop(this, this.opts.cancel === undefined ? this.list.items.length - 1 : this.opts.cancel);
    }
    render(ctx) {
      ctx.fillStyle = 'rgba(5,3,12,0.45)';
      ctx.fillRect(0, 0, R.W, R.H);
      R.UI.window(ctx, this.x, this.y, this.w, this.h);
      this.lines.forEach((l, i) => F().draw(ctx, l, this.x + 10, this.y + 6 + i * 12, this.opts.color || TH().text));
      if (this.list.items.length) this.list.render(ctx);
      else F().draw(ctx, '▼', this.x + this.w - 12, this.y + this.h - 12 + (Math.floor(R.Clock.time * 3) % 2), TH().accent);
    }
  }
  const UIKit = (R.UIKit = {
    ListBox,
    PromptScene,
    async confirm(text, yes = 'Sim', no = 'Não') { return (await R.Scenes.push(new PromptScene(text, [yes, no], { default: 1 }))) === 0; },
    async message(text, color) { await R.Scenes.push(new PromptScene(text, [], { color })); },
    async ask(text, options, def) { return R.Scenes.push(new PromptScene(text, options, { default: def || 0 })); },
    memberCard(ctx, id, x, y, w, opts = {}) {
      const m = R.Party.member(id), st = R.Party.stats(m), d = R.Party.def(id);
      R.UI.window(ctx, x, y, w, 44, { bg: opts.selected ? '#2c2350' : TH().bg });
      const p = R.Art.portrait(id, m.hp <= 0 ? 'apagado' : 'neutro', 1);
      ctx.fillStyle = TH().emoBg.neutro;
      ctx.fillRect(x + 4, y + 4, 36, 36);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 4, 36, 36); ctx.clip();
      ctx.drawImage(p, x + 2, y + 2);
      ctx.restore();
      F().draw(ctx, d.name, x + 44, y + 3, opts.selected ? TH().accent : TH().text);
      F().draw(ctx, 'Nv ' + m.level, x + w - 6, y + 3, TH().dim, { align: 'right' });
      const bw = w - 50;
      R.UI.bar(ctx, x + 44, y + 18, bw, 4, m.hp, st.hp, TH().hp, TH().hpBg);
      F().draw(ctx, m.hp + '/' + st.hp, x + w - 6, y + 21, TH().text, { align: 'right' });
      R.UI.icon(ctx, 'coracao', x + 44, y + 23);
      R.UI.bar(ctx, x + 44, y + 34, bw, 3, m.br, st.br, TH().br, TH().brBg);
      F().draw(ctx, m.br + '/' + st.br, x + w - 6, y + 30, TH().dim, { align: 'right' });
      R.UI.icon(ctx, 'brilho', x + 54, y + 23);
    },
  });

  // ============================================================ fundo noturno
  const Sky = {
    stars: null,
    ps: null,
    init() {
      if (this.stars) return;
      const r = U.rng(42);
      this.stars = Array.from({ length: 70 }, () => ({ x: r() * R.W, y: r() * 130, p: r() * 6, b: r() }));
      this.ps = new R.Particles(60);
    },
    update(dt) {
      this.init();
      this.ps.update(dt);
      if (Math.random() < dt * 4) {
        const ph = Math.random() * 6;
        this.ps.add({ x: Math.random() * R.W, y: 110 + Math.random() * 100, vx: U.rand(-6, 6), vy: U.rand(-8, -2), life: U.rand(3, 6), shape: 'glow', color: U.choice(['#e8ff9a', '#fff6b0']), fadeIn: 1,
          alpha: (p) => 0.6 + 0.4 * Math.sin(p.t * 4 + ph) });
      }
    },
    render(ctx, lit) {
      this.init();
      const g = ctx.createLinearGradient(0, 0, 0, R.H);
      g.addColorStop(0, '#0d0a24'); g.addColorStop(0.6, '#2a1d4a'); g.addColorStop(1, '#3d2a52');
      ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
      const t = R.Clock.time;
      for (const s of this.stars) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.p));
        ctx.globalAlpha = a * (0.5 + s.b * 0.5);
        ctx.fillStyle = '#fffaf0';
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }
      ctx.globalAlpha = 1;
      // lua
      ctx.fillStyle = '#f4f0d8'; ctx.beginPath(); ctx.arc(60, 40, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1438'; ctx.beginPath(); ctx.arc(66, 37, 11, 0, Math.PI * 2); ctx.fill();
      // facho do farol
      if (lit) {
        const ang = t * 0.6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(300, 112);
        ctx.rotate(Math.sin(ang) * 0.6 - 0.2);
        const bg = ctx.createLinearGradient(0, 0, -260, 0);
        bg.addColorStop(0, 'rgba(255,240,170,0.35)'); bg.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-280, -40); ctx.lineTo(-280, 40); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // colinas
      ctx.fillStyle = '#1a1430';
      ctx.beginPath(); ctx.moveTo(0, 190);
      for (let x = 0; x <= R.W; x += 8) ctx.lineTo(x, 176 + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.05) * 3);
      ctx.lineTo(R.W, R.H); ctx.lineTo(0, R.H); ctx.fill();
      ctx.fillStyle = '#120e24';
      ctx.beginPath(); ctx.moveTo(200, R.H); ctx.quadraticCurveTo(290, 120, 384, 128); ctx.lineTo(384, R.H); ctx.fill();
      // farol (silhueta)
      ctx.fillStyle = '#0c0a1a';
      ctx.beginPath(); ctx.moveTo(292, 140); ctx.lineTo(308, 140); ctx.lineTo(305, 112); ctx.lineTo(295, 112); ctx.fill();
      ctx.fillRect(293, 104, 14, 9);
      ctx.beginPath(); ctx.moveTo(291, 105); ctx.lineTo(309, 105); ctx.lineTo(300, 97); ctx.fill();
      ctx.fillStyle = lit ? '#fff2a8' : '#2a2440';
      ctx.fillRect(296, 106, 8, 5);
      // árvores
      ctx.fillStyle = '#0c0a1a';
      for (const [x, s] of [[24, 1], [44, 0.8], [130, 0.9], [168, 0.7]]) {
        ctx.beginPath(); ctx.arc(x, 178 - 14 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 2, 178 - 6 * s, 4, 10);
      }
      this.ps.render(ctx);
    },
  };
  R.Sky = Sky;

  // ================================================================= título
  class TitleScene {
    constructor() {
      this.opaque = true;
      this.pausable = false;
      this.stage = 'press';
      this.t = 0;
      this.list = new ListBox({ x: 150, y: 132, w: 100, rows: 5 });
      this.refreshItems();
    }
    refreshItems() {
      const has = R.Save.anyValid();
      this.list.setItems([
        { label: 'Continuar', id: 'continue', disabled: !has },
        { label: 'Novo jogo', id: 'new' },
        { label: 'Carregar', id: 'load' },
        { label: 'Configurações', id: 'settings' },
        { label: 'Créditos', id: 'credits' },
      ]);
      this.list.sel = has ? 0 : 1;
    }
    enter() { R.Audio.playMusic(null); R.Audio.playAmbience(null); R.Screen.fadeIn(600); }
    resume() { this.refreshItems(); }
    update(dt) {
      this.t += dt;
      Sky.update(dt);
      const I = R.Input;
      if (this.stage === 'press') {
        if (this.t > 0.4 && (I.pressed('confirm') || I.pressed('cancel') || I.pressed('menu'))) {
          this.stage = 'menu';
          R.Audio.unlock();
          R.Audio.sfx('confirm');
          R.Audio.playMusic('titulo');
        }
        return;
      }
      if (this.busy) return;
      const r = this.list.input();
      if (r === 'confirm') this.choose(this.list.current().id);
    }
    async choose(id) {
      this.busy = true;
      try {
        if (id === 'new') await Title.newGame();
        else if (id === 'continue') { const l = R.Save.latest(); if (l) await Title.loadSlot(l.slot); }
        else if (id === 'load') await R.SaveMenu.open('load');
        else if (id === 'settings') await R.Scenes.push(new SettingsScene());
        else if (id === 'credits') await R.Credits.show(true);
      } finally { this.busy = false; this.refreshItems(); }
    }
    render(ctx) {
      const lit = R.Settings.get('cleared');
      Sky.render(ctx, lit);
      const b = Math.sin(this.t * 1.5) * 1.5;
      // título
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.1 + 0.05 * Math.sin(this.t * 2);
      ctx.fillStyle = '#ffd86b';
      ctx.beginPath(); ctx.ellipse(R.W / 2, 62, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      F().draw(ctx, 'VAGALUME', R.W / 2, 40 + b, '#fff6d0', { scale: 4, outline: '#2a1d40', align: 'center' });
      F().draw(ctx, 'um sonho que não quer acabar', R.W / 2, 92, '#c8b8f0', { align: 'center', shadow: '#120e24' });
      if (this.stage === 'press') {
        if (Math.floor(this.t * 2) % 2 === 0) F().draw(ctx, 'Pressione Z (ou toque) para começar', R.W / 2, 150, TH().text, { align: 'center', shadow: '#000' });
      } else {
        R.UI.window(ctx, 136, 124, 112, 74, { alpha: 0.85 });
        this.list.render(ctx);
      }
      F().draw(ctx, 'v' + R.VERSION, R.W - 4, R.H - 12, '#6a5a8a', { align: 'right' });
      if (!R.Save.storageOk) F().draw(ctx, 'Aviso: armazenamento bloqueado — use Exportar', 4, R.H - 12, TH().bad);
    }
  }

  const Title = (R.Title = {
    goto() {
      R.Engine.playTimeActive = false;
      R.Events.reset();
      R.Screen.fx.fade = 1;
      R.Scenes.reset(new TitleScene());
    },
    async newGame() {
      await R.Screen.fadeOut(600);
      R.State.newGame();
      R.Events.reset();
      R.World.map = null;
      R.Scenes.reset(new R.WorldScene());
      R.World.load('arvore', 4, 6, 'down');
      R.Screen.fx.fade = 1;
      R.Events.run('intro');
    },
    async loadSlot(slot) {
      const r = R.Save.read(slot);
      if (r.status !== 'ok') { await UIKit.message('Não foi possível carregar: ' + (r.error || 'vazio'), TH().bad); return false; }
      await R.Screen.fadeOut(400);
      R.Save.apply(r.data.state);
      R.Events.reset();
      const s = R.State.s;
      R.Scenes.reset(new R.WorldScene());
      R.World.map = null;
      R.World.load(s.mapId, s.x, s.y, s.dir);
      await R.Clock.nextFrame();
      R.Screen.fadeIn(500);
      R.Toasts.push('Jogo carregado', 'check');
      R.Events.run('ao_carregar');
      return true;
    },
  });

  // ======================================================== salvar / carregar
  class SaveMenuScene {
    constructor(mode) {
      this.mode = mode; // 'save' | 'load'
      this.opaque = mode === 'load' && !R.World.map ? true : false;
      this.list = new ListBox({ x: 18, y: 36, w: 340, rows: 4, lh: 34 });
      this.refresh();
    }
    refresh() {
      const items = [];
      for (const s of R.Save.SLOTS) {
        if (this.mode === 'save' && s === 'auto') continue;
        const r = R.Save.read(s);
        items.push({ slot: s, r, label: '' });
      }
      items.push({ slot: 'import', label: '' });
      this.list.setItems(items);
    }
    update() {
      if (this.busy) return;
      const r = this.list.input();
      if (r === 'cancel') R.Scenes.pop(this, false);
      else if (r === 'confirm') this.act(this.list.current());
    }
    async act(it) {
      this.busy = true;
      try {
        if (it.slot === 'import') {
          const res = await R.Save.pickFile();
          if (!res.ok) { if (res.error !== 'cancelado') await UIKit.message('Importação falhou: ' + res.error, TH().bad); return; }
          const target = await UIKit.ask('Importar para qual espaço?', ['Espaço 1', 'Espaço 2', 'Espaço 3', 'Cancelar'], 0);
          if (target > 2) return;
          const slot = String(target + 1);
          if (R.Save.read(slot).status !== 'empty' && !(await UIKit.confirm('O espaço ' + slot + ' já tem um jogo. Substituir? (uma cópia de segurança será guardada)'))) return;
          R.Save.importTo(slot, res.raw);
          R.Audio.sfx('save');
          await UIKit.message('Save importado para o espaço ' + slot + '.');
          this.refresh();
          return;
        }
        const st = it.r.status;
        const opts = [];
        if (this.mode === 'save' && it.slot !== 'auto') opts.push(['Salvar aqui', 'save']);
        if (st === 'ok') opts.push(['Carregar', 'load']);
        if (st !== 'empty') opts.push(['Exportar arquivo', 'export']);
        if (R.Save.hasBackup(it.slot)) opts.push(['Restaurar cópia anterior', 'backup']);
        if (st !== 'empty') opts.push(['Apagar', 'erase']);
        opts.push(['Voltar', 'back']);
        let pick = 0;
        if (opts.length > 2 || st === 'corrupt') pick = await UIKit.ask(st === 'corrupt' ? 'Este save não pôde ser lido (' + it.r.error + '). Ele NÃO foi apagado.' : 'Espaço ' + (it.slot === 'auto' ? 'automático' : it.slot), opts.map((o) => o[0]), 0);
        const action = opts[pick][1];
        if (action === 'save') {
          if (st !== 'empty' && !(await UIKit.confirm('Sobrescrever este jogo salvo?'))) return;
          if (R.Save.write(it.slot)) { R.Audio.sfx('save'); await UIKit.message('Progresso salvo no espaço ' + it.slot + '.'); R.Scenes.pop(this, true); }
          else await UIKit.message('Não foi possível salvar. O armazenamento do navegador pode estar cheio ou bloqueado. Use "Exportar".', TH().bad);
        } else if (action === 'load') {
          if (R.World.map && R.State.s && !(await UIKit.confirm('Carregar? O progresso não salvo será perdido.'))) return;
          R.Scenes.pop(this, true);
          await Title.loadSlot(it.slot);
        } else if (action === 'export') {
          R.Save.exportSlot(it.slot);
          await UIKit.message('Arquivo baixado. Guarde-o para recuperar seu progresso depois.');
        } else if (action === 'backup') {
          if (await UIKit.confirm('Restaurar a cópia anterior deste espaço?')) { R.Save.restoreBackup(it.slot); this.refresh(); }
        } else if (action === 'erase') {
          if (await UIKit.confirm('Apagar este jogo salvo? (fica uma cópia de segurança)')) { R.Save.erase(it.slot); this.refresh(); }
        }
      } finally { this.busy = false; this.refresh(); }
    }
    render(ctx) {
      if (this.opaque) Sky.render(ctx, R.Settings.get('cleared'));
      else { ctx.fillStyle = 'rgba(5,3,12,0.55)'; ctx.fillRect(0, 0, R.W, R.H); }
      R.UI.window(ctx, 8, 8, R.W - 16, R.H - 16, { title: this.mode === 'save' ? 'Escrever no diário' : 'Carregar jogo' });
      const L = this.list;
      for (let i = 0; i < L.rows; i++) {
        const idx = L.scroll + i;
        const it = L.items[idx];
        if (!it) break;
        const y = L.y + i * L.lh - 14;
        const sel = idx === L.sel;
        R.UI.window(ctx, 30, y, 330, 30, { bg: sel ? '#2c2350' : TH().bg, alpha: 0.9 });
        if (sel) R.UI.cursor(ctx, 18, y + 11);
        if (it.slot === 'import') {
          F().draw(ctx, 'Importar save de um arquivo...', 40, y + 9, sel ? TH().accent : TH().text);
          continue;
        }
        const name = it.slot === 'auto' ? 'Automático' : 'Espaço ' + it.slot;
        F().draw(ctx, name, 38, y + 3, sel ? TH().accent : TH().text);
        if (it.r.status === 'empty') F().draw(ctx, '— vazio —', 38, y + 15, TH().dim);
        else if (it.r.status === 'corrupt') F().draw(ctx, 'Ilegível: ' + it.r.error, 38, y + 15, TH().bad);
        else {
          const sm = it.r.data.summary || {};
          F().draw(ctx, (sm.location || '?') + '  •  Nv ' + (sm.level || 1), 38, y + 15, TH().text);
          F().draw(ctx, U.formatTime(sm.playTime || 0), 352, y + 3, TH().dim, { align: 'right' });
          const d = new Date(it.r.data.savedAt);
          F().draw(ctx, U.pad2(d.getDate()) + '/' + U.pad2(d.getMonth() + 1) + ' ' + U.pad2(d.getHours()) + ':' + U.pad2(d.getMinutes()), 352, y + 15, TH().dim, { align: 'right' });
          (sm.party || []).forEach((pid, k) => { const sh = R.Art.sheet(pid); ctx.drawImage(sh.frames.down[0], 0, 0, 16, 16, 230 + k * 17, y + 7, 16, 16); });
        }
      }
      F().draw(ctx, 'Saves ficam no navegador. Exporte para não perdê-los.', R.W / 2, R.H - 24, TH().dim, { align: 'center' });
    }
  }
  R.SaveMenu = { open(mode) { return R.Scenes.push(new SaveMenuScene(mode)); } };

  // ========================================================= configurações
  class SettingsScene {
    constructor() {
      this.opaque = !R.World.map;
      this.list = new ListBox({ x: 24, y: 30, w: 330, rows: 12, lh: 13 });
      this.build();
    }
    build() {
      const S = R.Settings;
      const pct = (v) => Math.round(v * 100) + '%';
      const items = [
        { label: 'Volume geral', key: 'master', right: pct(S.get('master')), kind: 'vol' },
        { label: 'Música', key: 'music', right: pct(S.get('music')), kind: 'vol' },
        { label: 'Efeitos sonoros', key: 'sfx', right: pct(S.get('sfx')), kind: 'vol' },
        { label: 'Silenciar tudo', key: 'muted', right: S.get('muted') ? 'Sim' : 'Não', kind: 'bool' },
        { label: 'Velocidade do texto', key: 'textSpeed', right: ['Lenta', 'Normal', 'Rápida', 'Instantânea'][S.get('textSpeed')], kind: 'cycle', n: 4 },
        { label: 'Reduzir efeitos intensos', key: 'reduceEffects', right: S.get('reduceEffects') ? 'Sim' : 'Não', kind: 'bool' },
        { label: 'Escala da tela', key: 'scaleMode', right: S.get('scaleMode') === 'inteira' ? 'Pixel perfeito' : 'Preencher', kind: 'scale' },
        { label: 'Controles de toque', key: 'touch', right: { auto: 'Automático', on: 'Sempre', off: 'Nunca' }[S.get('touch')], kind: 'touch' },
        { label: 'Salvamento automático', key: 'autosave', right: S.get('autosave') ? 'Sim' : 'Não', kind: 'bool' },
        { label: 'Correr sem segurar Shift', key: 'runDefault', right: S.get('runDefault') ? 'Sim' : 'Não', kind: 'bool' },
        { label: 'Teclas...', kind: 'keys' },
        { label: 'Restaurar padrões', kind: 'reset' },
        { label: 'Voltar', kind: 'back' },
      ];
      const sel = this.list.sel;
      this.list.setItems(items);
      this.list.sel = sel;
    }
    change(it, d) {
      const S = R.Settings;
      if (it.kind === 'vol') S.set(it.key, U.clamp(Math.round((S.get(it.key) + d * 0.1) * 10) / 10, 0, 1));
      else if (it.kind === 'bool') S.set(it.key, !S.get(it.key));
      else if (it.kind === 'cycle') S.set(it.key, (S.get(it.key) + d + it.n) % it.n);
      else if (it.kind === 'scale') S.set('scaleMode', S.get('scaleMode') === 'inteira' ? 'ajustar' : 'inteira');
      else if (it.kind === 'touch') { const o = ['auto', 'on', 'off']; S.set('touch', o[(o.indexOf(S.get('touch')) + d + 3) % 3]); }
      else return false;
      R.Audio.sfx('cursor');
      this.build();
      return true;
    }
    async update() {
      if (this.busy) return;
      const r = this.list.input();
      const it = this.list.current();
      if (r === 'left' || r === 'right') this.change(it, r === 'left' ? -1 : 1);
      else if (r === 'cancel') R.Scenes.pop(this);
      else if (r === 'confirm') {
        if (this.change(it, 1)) return;
        if (it.kind === 'back') R.Scenes.pop(this);
        else if (it.kind === 'reset') { this.busy = true; if (await UIKit.confirm('Restaurar todas as configurações?')) { R.Settings.reset(); this.build(); } this.busy = false; }
        else if (it.kind === 'keys') { this.busy = true; await R.Scenes.push(new KeysScene()); this.busy = false; }
      }
    }
    render(ctx) {
      if (this.opaque) Sky.render(ctx, R.Settings.get('cleared'));
      else { ctx.fillStyle = 'rgba(5,3,12,0.55)'; ctx.fillRect(0, 0, R.W, R.H); }
      R.UI.window(ctx, 12, 14, R.W - 24, R.H - 28, { title: 'Configurações' });
      this.list.render(ctx);
      F().draw(ctx, '← → muda o valor   Z confirma   X volta', R.W / 2, R.H - 26, TH().dim, { align: 'center' });
    }
  }
  R.SettingsScene = SettingsScene;

  class KeysScene {
    constructor() {
      this.opaque = false;
      this.list = new ListBox({ x: 30, y: 34, w: 320, rows: 11, lh: 13 });
      this.build();
    }
    build() {
      const items = R.Input.ACTIONS.map((a) => ({ label: R.Input.ACTION_LABEL[a], a, right: R.Input.describe(a) }));
      items.push({ label: 'Voltar', back: true });
      const s = this.list.sel; this.list.setItems(items); this.list.sel = s;
    }
    update() {
      if (this.waiting) return;
      const r = this.list.input();
      if (r === 'cancel') R.Scenes.pop(this);
      else if (r === 'confirm') {
        const it = this.list.current();
        if (it.back) { R.Scenes.pop(this); return; }
        this.waiting = it.a;
        R.Input.capture = (code) => {
          this.waiting = null;
          if (code === 'Escape') { this.build(); return; }
          const binds = R.U.clone(R.Input.binds);
          // nova tecla vira a principal; mantém uma secundária
          binds[it.a] = [code].concat(binds[it.a].filter((k) => k !== code)).slice(0, 2);
          R.Settings.set('binds', binds);
          R.Input.block();
          R.Audio.sfx('confirm');
          this.build();
        };
      }
    }
    render(ctx) {
      ctx.fillStyle = 'rgba(5,3,12,0.6)'; ctx.fillRect(0, 0, R.W, R.H);
      R.UI.window(ctx, 18, 18, R.W - 36, R.H - 36, { title: 'Teclas' });
      this.list.render(ctx);
      if (this.waiting) {
        R.UI.window(ctx, 92, 90, 200, 36);
        F().draw(ctx, 'Pressione a nova tecla para', R.W / 2, 96, TH().text, { align: 'center' });
        F().draw(ctx, R.Input.ACTION_LABEL[this.waiting] + ' (Esc cancela)', R.W / 2, 108, TH().accent, { align: 'center' });
      }
    }
  }

  // ================================================================= cartão
  // tela preta com texto narrativo centralizado
  class CardScene {
    constructor(lines, opts = {}) {
      this.opaque = true;
      this.lines = lines;
      this.idx = 0;
      this.t = 0;
      this.opts = opts;
    }
    enter() { this.prevFade = R.Screen.fx.fade; R.Screen.fx.fade = 0; }
    exit() { R.Screen.fx.fade = this.prevFade || 0; }
    update(dt) {
      this.t += dt;
      const I = R.Input;
      if (this.t > 0.6 && (I.pressed('confirm') || I.pressed('cancel'))) {
        this.idx++;
        this.t = 0;
        R.Audio.sfx('text');
        if (this.idx >= this.lines.length) R.Scenes.pop(this);
      }
    }
    render(ctx) {
      ctx.fillStyle = this.opts.bg || '#000';
      ctx.fillRect(0, 0, R.W, R.H);
      const line = this.lines[Math.min(this.idx, this.lines.length - 1)];
      const a = Math.min(1, this.t * 1.5);
      const wrapped = F().wrap(line.replace(/\{[^}]*\}/g, ''), 300);
      const y0 = R.H / 2 - wrapped.length * 7;
      ctx.globalAlpha = a;
      wrapped.forEach((l, i) => F().draw(ctx, l, R.W / 2, y0 + i * 14, this.opts.color || '#e8e2f4', { align: 'center' }));
      ctx.globalAlpha = 1;
      if (this.t > 0.6 && Math.floor(this.t * 2) % 2 === 0) F().draw(ctx, '▼', R.W / 2, R.H - 20, '#6a5a8a', { align: 'center' });
    }
  }
  R.Card = { show(lines, opts) { return R.Scenes.push(new CardScene(lines, opts)); } };

  // =============================================================== créditos
  class CreditsScene {
    constructor(fromTitle) {
      this.opaque = true;
      this.t = 0;
      this.fromTitle = fromTitle;
      this.lines = R.DB.dialogues.credits || ['VAGALUME'];
      this.speed = 18;
    }
    enter() { R.Audio.playMusic('creditos'); this.prevFade = R.Screen.fx.fade; R.Screen.fx.fade = 0; }
    exit() { R.Screen.fx.fade = this.prevFade || 0; if (this.fromTitle) R.Audio.playMusic('titulo'); }
    update(dt) {
      this.t += dt;
      Sky.update(dt);
      const I = R.Input;
      const fast = I.down('confirm');
      this.t += fast ? dt * 3 : 0;
      const end = this.lines.length * 16 + R.H + 40;
      if (I.pressed('cancel') || this.t * this.speed > end) R.Scenes.pop(this);
    }
    render(ctx) {
      Sky.render(ctx, true);
      ctx.fillStyle = 'rgba(8,6,20,0.55)';
      ctx.fillRect(0, 0, R.W, R.H);
      const y0 = R.H + 10 - this.t * this.speed;
      this.lines.forEach((l, i) => {
        const y = y0 + i * 16;
        if (y < -16 || y > R.H) return;
        const head = l.startsWith('#');
        const big = l.startsWith('##');
        const txt = l.replace(/^#+\s*/, '');
        F().draw(ctx, txt, R.W / 2, y, head ? TH().accent : TH().text, { align: 'center', scale: big ? 2 : 1, shadow: '#000' });
      });
      F().draw(ctx, 'Z acelera • X sai', R.W - 4, R.H - 12, '#6a5a8a', { align: 'right' });
    }
  }
  R.Credits = { show(fromTitle) { return R.Scenes.push(new CreditsScene(fromTitle)); } };

  // ============================================================ fim de jogo
  class GameOverScene {
    constructor() {
      this.opaque = true;
      this.t = 0;
      this.list = new ListBox({ x: 150, y: 140, w: 100, rows: 3, items: [{ label: 'Tentar de novo' }, { label: 'Carregar jogo' }, { label: 'Tela inicial' }] });
    }
    enter() { R.Audio.playMusic(null); R.Audio.sfx('gameover'); }
    async update(dt) {
      this.t += dt;
      if (this.t < 1.2 || this.busy) return;
      const r = this.list.input();
      if (r !== 'confirm') return;
      const s = this.list.sel;
      if (s === 0) R.Scenes.pop(this, 'retry');
      else if (s === 1) { this.busy = true; const ok = await R.SaveMenu.open('load'); this.busy = false; void ok; }
      else { R.Title.goto(); }
    }
    render(ctx) {
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, R.W, R.H);
      const a = Math.min(1, this.t / 1.2);
      ctx.globalAlpha = a;
      // lamparina apagando
      const fl = Math.max(0, 1 - this.t / 2);
      ctx.fillStyle = '#3a3040'; ctx.fillRect(R.W / 2 - 6, 70, 12, 16);
      ctx.fillStyle = '#5a4a40'; ctx.fillRect(R.W / 2 - 8, 68, 16, 3); ctx.fillRect(R.W / 2 - 8, 86, 16, 3);
      if (fl > 0) { ctx.globalAlpha = a * fl; ctx.fillStyle = '#ffb347'; ctx.fillRect(R.W / 2 - 2, 74, 4, 7); ctx.globalAlpha = a; }
      else { ctx.fillStyle = '#6a6680'; const t = this.t; for (let i = 0; i < 4; i++) ctx.fillRect(R.W / 2 + Math.round(Math.sin(t * 2 + i) * 2), 62 - i * 3 - (t * 4 % 3), 1, 2); }
      F().draw(ctx, 'A LUZ SE APAGOU...', R.W / 2, 100, '#e8e2f4', { align: 'center', scale: 2 });
      F().draw(ctx, 'Mas lamparinas podem ser acesas de novo.', R.W / 2, 122, TH().dim, { align: 'center' });
      if (this.t > 1.2) this.list.render(ctx);
      ctx.globalAlpha = 1;
    }
  }
  R.GameOver = { show() { return R.Scenes.push(new GameOverScene()); } };
})();
