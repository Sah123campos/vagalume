/* VAGALUME — menu de pausa (itens, habilidades, equipar, grupo, missões, mapa,
 * configurações, tela inicial) e lojas (comprar / vender). */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;
  const TH = () => R.THEME;
  const F = () => R.Font;
  const { ListBox } = R.UIKit;

  const CATS = [
    { id: 'lanche', label: 'Lanches', icon: 'lanche' },
    { id: 'brinquedo', label: 'Brinquedos', icon: 'brinquedo' },
    { id: ['arma', 'amuleto'], label: 'Equipamento', icon: 'equip' },
    { id: 'chave', label: 'Importantes', icon: 'chave' },
  ];

  // ---------------------------------------------- uso de itens fora de batalha
  R.ItemUse = {
    canField(def) { return def && def.use && def.use.field !== false && (def.use.effects || []).some((e) => ['heal', 'healBr', 'revive'].includes(e.type)); },
    // aplica em um membro; devolve texto do resultado ou null se não faz efeito
    applyField(itemOrSkill, targetId) {
      const m = R.Party.member(targetId), st = R.Party.stats(m);
      const effs = itemOrSkill.use ? itemOrSkill.use.effects : itemOrSkill.effects;
      const out = [];
      for (const e of effs || []) {
        if (e.type === 'revive') {
          if (m.hp > 0) continue;
          m.hp = Math.max(1, Math.round(st.hp * (e.pct || 0.3)));
          out.push(R.Party.def(targetId).name + ' voltou a brilhar!');
        } else if (e.type === 'heal') {
          if (m.hp <= 0 || m.hp >= st.hp) continue;
          const v = Math.min(st.hp - m.hp, Math.round(e.amount || st.hp * (e.pct || 0)));
          m.hp += v; out.push('+' + v + ' VIDA');
        } else if (e.type === 'healBr') {
          if (m.hp <= 0 || m.br >= st.br) continue;
          const v = Math.min(st.br - m.br, Math.round(e.amount || st.br * (e.pct || 0)));
          m.br += v; out.push('+' + v + ' BRILHO');
        }
      }
      if (out.length) R.State.changed();
      return out.length ? out.join('  ') : null;
    },
  };

  // ============================================================ menu de pausa
  class MenuScene {
    constructor(start) {
      this.opaque = false;
      this.t = 0;
      this.root = new ListBox({ x: 10, y: 14, w: 80, rows: 8, items: [
        { label: 'Itens', id: 'itens' }, { label: 'Habilidades', id: 'habilidades' }, { label: 'Equipar', id: 'equipar' },
        { label: 'Grupo', id: 'grupo' }, { label: 'Missões', id: 'missoes' }, { label: 'Mapa', id: 'mapa' },
        { label: 'Configurar', id: 'config' }, { label: 'Tela inicial', id: 'sair' },
      ] });
      this.page = null;
      this.startPage = start;
    }
    enter() {
      R.Audio.sfx('confirm');
      if (this.startPage) { this.root.sel = Math.max(0, this.root.items.findIndex((i) => i.id === this.startPage)); this.openPage(this.startPage); }
    }
    openPage(id) {
      const P = { itens: ItemsPage, habilidades: SkillsPage, equipar: EquipPage, grupo: PartyPage, missoes: QuestsPage, mapa: MapPage }[id];
      if (P) { this.page = new P(this); return; }
      if (id === 'config') { this.busy = true; R.Scenes.push(new R.SettingsScene()).then(() => { this.busy = false; }); }
      if (id === 'sair') {
        this.busy = true;
        R.UIKit.confirm('Voltar à tela inicial? O que não foi salvo será perdido.').then((ok) => { this.busy = false; if (ok) R.Title.goto(); });
      }
    }
    close() { R.Scenes.pop(this); }
    update(dt) {
      this.t += dt;
      if (this.busy) return;
      if (this.page) {
        const r = this.page.update(dt);
        if (r === 'back') { this.page = null; if (this.startPage) this.close(); }
        return;
      }
      const I = R.Input;
      if (I.pressed('menu') && !I.pressed('cancel')) { R.Audio.sfx('cancel'); this.close(); return; }
      const r = this.root.input();
      if (r === 'cancel') this.close();
      else if (r === 'confirm') this.openPage(this.root.current().id);
    }
    render(ctx) {
      ctx.fillStyle = 'rgba(8,5,18,0.5)';
      ctx.fillRect(0, 0, R.W, R.H);
      R.UI.window(ctx, 4, 6, 92, 112);
      this.root.render(ctx, !this.page);
      const s = R.State.s;
      R.UI.window(ctx, 4, 122, 92, 38);
      R.UI.icon(ctx, 'botao', 10, 128);
      F().draw(ctx, s.money + ' botões', 22, 126, TH().accent);
      F().draw(ctx, U.formatTime(s.playTime), 10, 142, TH().dim);
      const map = R.DB.maps.maps[s.mapId];
      R.UI.window(ctx, 4, 164, 92, 46);
      F().draw(ctx, 'Local:', 10, 168, TH().dim);
      R.UI.wrapText(ctx, map ? map.name : '?', 10, 180, 82, TH().text, 11);
      if (this.page) this.page.render(ctx);
      else {
        s.party.forEach((id, i) => R.UIKit.memberCard(ctx, id, 102 + (i % 2) * 140, 8 + Math.floor(i / 2) * 50, 136));
        const q = R.Quests.list('active').map((id) => Object.assign({ id }, R.Quests.def(id))).find((d) => d.type === 'main');
        R.UI.window(ctx, 102, 112, 276, 98, { title: 'Objetivo' });
        if (q) {
          F().draw(ctx, q.title, 110, 118, TH().accent);
          const steps = R.Quests.currentSteps(q.id).filter((x) => !x.done).slice(0, 4);
          steps.forEach((x, i) => { F().draw(ctx, '●', 112, 134 + i * 12, TH().dim); R.UI.wrapText(ctx, x.text, 122, 132 + i * 12, 248, TH().text); });
        } else F().draw(ctx, 'Explore Algodoal.', 110, 120, TH().dim);
      }
    }
  }

  // escolha de alvo (membro do grupo)
  class TargetPicker {
    constructor(prompt, filter) { this.prompt = prompt; this.sel = 0; this.ids = R.State.s.party.slice(); this.filter = filter; }
    update() {
      const I = R.Input;
      const n = this.ids.length;
      if (I.repeat('left') || I.repeat('up')) { this.sel = (this.sel + n - 1) % n; R.Audio.sfx('cursor'); }
      if (I.repeat('right') || I.repeat('down')) { this.sel = (this.sel + 1) % n; R.Audio.sfx('cursor'); }
      if (I.pressed('confirm')) { R.Audio.sfx('confirm'); return { pick: this.ids[this.sel] }; }
      if (I.pressed('cancel')) { R.Audio.sfx('cancel'); return { cancel: true }; }
      return null;
    }
    render(ctx) {
      R.UI.window(ctx, 102, 8, 276, 16);
      F().draw(ctx, this.prompt, 110, 10, TH().accent);
      this.ids.forEach((id, i) => {
        const x = 102 + (i % 2) * 140, y = 28 + Math.floor(i / 2) * 50;
        R.UIKit.memberCard(ctx, id, x, y, 136, { selected: i === this.sel });
        if (i === this.sel) R.UI.cursor(ctx, x - 6, y + 16);
      });
    }
  }

  // ------------------------------------------------------------------ itens
  class ItemsPage {
    constructor(menu) {
      this.menu = menu;
      this.tab = 0;
      this.list = new ListBox({ x: 106, y: 30, w: 262, rows: 9, lh: 12 });
      this.build();
      this.msg = null;
    }
    build() {
      const cat = CATS[this.tab].id;
      const items = R.Inventory.list(cat).map((e) => ({ label: e.def.name, right: e.def.cat === 'chave' ? '' : 'x' + e.qty, id: e.id, def: e.def }));
      if (!items.length) items.push({ label: '(vazio)', disabled: true });
      this.list.setItems(items);
    }
    update() {
      if (this.picker) {
        const r = this.picker.update();
        if (!r) return;
        if (r.cancel) { this.picker = null; return; }
        const it = this.list.current();
        const res = R.ItemUse.applyField(it.def, r.pick);
        if (res) { R.Inventory.remove(it.id, 1); R.Audio.sfx('heal'); this.msg = { text: res, t: 2 }; if (!R.Inventory.has(it.id)) { this.picker = null; this.build(); } }
        else { R.Audio.sfx('buzzer'); this.msg = { text: 'Não teve efeito.', t: 1.5 }; }
        return;
      }
      if (this.msg) { this.msg.t -= 1 / 60; if (this.msg.t <= 0) this.msg = null; }
      const r = this.list.input();
      if (r === 'left' || r === 'right') { this.tab = (this.tab + (r === 'left' ? 3 : 1)) % 4; this.list.sel = 0; this.build(); R.Audio.sfx('cursor'); }
      else if (r === 'cancel') return 'back';
      else if (r === 'confirm') {
        const it = this.list.current();
        if (!it || !it.def) return;
        const d = it.def;
        if (it.id === 'mapa') { this.menu.page = new MapPage(this.menu); return; }
        if (R.ItemUse.canField(d) && d.use.target === 'allies') {
          const res = R.State.s.party.map((pid) => R.ItemUse.applyField(d, pid)).filter(Boolean);
          if (res.length) { R.Inventory.remove(it.id, 1); R.Audio.sfx('heal'); this.msg = { text: 'Todo o grupo se sente melhor.', t: 2 }; this.build(); }
          else { R.Audio.sfx('buzzer'); this.msg = { text: 'Não teve efeito.', t: 1.5 }; }
          return;
        }
        if (R.ItemUse.canField(d)) { this.picker = new TargetPicker('Usar ' + d.name + ' em quem?'); return; }
        if (d.cat === 'arma' || d.cat === 'amuleto') this.msg = { text: 'Use EQUIPAR para vestir.', t: 1.8 };
        else if (d.cat === 'chave') this.msg = { text: d.examine || d.desc, t: 3 };
        else this.msg = { text: 'Só pode ser usado em batalha.', t: 1.8 };
      }
    }
    render(ctx) {
      if (this.picker) { this.picker.render(ctx); if (this.msg) this.renderMsg(ctx); return; }
      R.UI.window(ctx, 100, 6, 280, 146);
      CATS.forEach((c, i) => {
        const x = 106 + i * 68;
        const sel = i === this.tab;
        if (sel) { ctx.fillStyle = '#2c2350'; ctx.fillRect(x - 2, 9, 66, 14); }
        R.UI.icon(ctx, c.icon, x, 12);
        F().draw(ctx, c.label, x + 11, 10, sel ? TH().accent : TH().dim);
      });
      F().draw(ctx, '←→', 368, 10, TH().dim, { align: 'right' });
      this.list.render(ctx);
      const it = this.list.current();
      R.UI.window(ctx, 100, 156, 280, 54);
      if (it && it.def) R.UI.wrapText(ctx, it.def.desc, 108, 160, 264, TH().text, 12);
      if (this.msg) this.renderMsg(ctx);
    }
    renderMsg(ctx) {
      const w = Math.min(270, F().measure(this.msg.text) + 20);
      R.UI.window(ctx, 240 - w / 2, 96, w, 20, { bg: '#2c2350' });
      F().draw(ctx, this.msg.text, 240, 100, TH().accent, { align: 'center' });
    }
  }

  // ------------------------------------------------------------ habilidades
  class SkillsPage {
    constructor(menu) { this.menu = menu; this.mi = 0; this.list = new ListBox({ x: 106, y: 52, w: 262, rows: 7, lh: 12 }); this.build(); }
    member() { return R.State.s.party[this.mi]; }
    build() {
      const m = R.Party.member(this.member());
      const sk = R.DB.skills.skills;
      const items = m.learned.map((id) => ({ label: (m.skills.includes(id) ? '★ ' : '   ') + sk[id].name, right: sk[id].cost + ' BR', id, def: sk[id] }));
      const d = R.Party.def(this.member());
      for (const s of d.skills) if (!m.learned.includes(s.id)) items.push({ label: '   ??? (nível ' + s.level + ')', disabled: true, locked: true });
      this.list.setItems(items);
    }
    update() {
      if (this.busy) return;
      if (this.picker) {
        const r = this.picker.update();
        if (!r) return;
        if (r.cancel) { this.picker = null; return; }
        const it = this.list.current();
        const m = R.Party.member(this.member());
        if (m.hp <= 0 || m.br < it.def.cost) { R.Audio.sfx('buzzer'); this.picker = null; return; }
        const res = R.ItemUse.applyField(it.def, r.pick);
        if (res) { m.br -= it.def.cost; R.Audio.sfx('heal'); } else R.Audio.sfx('buzzer');
        this.picker = null;
        return;
      }
      const r = this.list.input();
      if (r === 'left' || r === 'right') { const n = R.State.s.party.length; this.mi = (this.mi + (r === 'left' ? n - 1 : 1)) % n; this.list.sel = 0; this.build(); R.Audio.sfx('cursor'); }
      else if (r === 'cancel') return 'back';
      else if (r === 'confirm') {
        const it = this.list.current();
        if (!it || !it.def) return;
        const toggle = () => {
          if (!R.Party.toggleSkill(this.member(), it.id)) R.UIKit.message('Só cabem ' + R.Party.MAX_SKILLS + ' habilidades equipadas. Desequipe uma antes.');
          this.build();
        };
        if (!it.def.field) { toggle(); return; }
        this.busy = true;
        R.UIKit.ask(it.def.name, [R.Party.member(this.member()).skills.includes(it.id) ? 'Desequipar' : 'Equipar', 'Usar agora', 'Voltar'], 0).then((act) => {
          this.busy = false;
          if (act === 0) toggle();
          else if (act === 1) this.picker = new TargetPicker(it.def.name + ' em quem?');
        });
      }
    }
    render(ctx) {
      if (this.picker) { this.picker.render(ctx); return; }
      R.UI.window(ctx, 100, 6, 280, 146);
      const id = this.member();
      const m = R.Party.member(id);
      const sh = R.Art.sheet(id);
      ctx.drawImage(sh.frames.down[0], 108, 10);
      F().draw(ctx, '← ' + R.Party.def(id).name + ' →', 128, 12, TH().accent);
      F().draw(ctx, 'BRILHO ' + m.br + '/' + R.Party.stats(m).br, 370, 12, TH().br, { align: 'right' });
      F().draw(ctx, 'Equipadas: ' + m.skills.length + '/' + R.Party.MAX_SKILLS + '  (★ = em uso na batalha)', 128, 26, TH().dim);
      this.list.render(ctx);
      const it = this.list.current();
      R.UI.window(ctx, 100, 156, 280, 54);
      if (it && it.def) R.UI.wrapText(ctx, it.def.desc, 108, 160, 264, TH().text, 12);
    }
  }

  // ---------------------------------------------------------------- equipar
  class EquipPage {
    constructor(menu) { this.menu = menu; this.mi = 0; this.slot = 0; this.choosing = null; }
    member() { return R.State.s.party[this.mi]; }
    options() {
      const id = this.member();
      const slotKey = this.slot === 0 ? 'weapon' : 'charm';
      const cat = slotKey === 'weapon' ? 'arma' : 'amuleto';
      const list = R.Inventory.list(cat).filter((e) => R.Party.canEquip(id, e.id)).map((e) => ({ label: e.def.name, right: 'x' + e.qty, id: e.id, def: e.def }));
      if (slotKey === 'charm') list.unshift({ label: '(nenhum)', id: null });
      return list;
    }
    update() {
      const I = R.Input;
      if (this.choosing) {
        const r = this.choosing.input();
        if (r === 'cancel') this.choosing = null;
        else if (r === 'confirm') {
          const it = this.choosing.current();
          R.Party.equip(this.member(), this.slot === 0 ? 'weapon' : 'charm', it.id);
          R.Audio.sfx('buff');
          this.choosing = null;
        }
        return;
      }
      const n = R.State.s.party.length;
      if (I.repeat('left')) { this.mi = (this.mi + n - 1) % n; R.Audio.sfx('cursor'); }
      if (I.repeat('right')) { this.mi = (this.mi + 1) % n; R.Audio.sfx('cursor'); }
      if (I.repeat('up') || I.repeat('down')) { this.slot = 1 - this.slot; R.Audio.sfx('cursor'); }
      if (I.pressed('cancel')) { R.Audio.sfx('cancel'); return 'back'; }
      if (I.pressed('confirm')) {
        const opts = this.options();
        if (!opts.length) { R.Audio.sfx('buzzer'); return; }
        R.Audio.sfx('confirm');
        this.choosing = new ListBox({ x: 106, y: 100, w: 262, rows: 4, lh: 12, items: opts });
      }
    }
    render(ctx) {
      R.UI.window(ctx, 100, 6, 280, 204);
      const id = this.member();
      const m = R.Party.member(id);
      const sh = R.Art.sheet(id);
      ctx.drawImage(sh.frames.down[0], 108, 10);
      F().draw(ctx, '← ' + R.Party.def(id).name + ' →', 128, 12, TH().accent);
      const slots = [['Arma', m.equip.weapon], ['Amuleto', m.equip.charm]];
      slots.forEach(([lab, item], i) => {
        const y = 36 + i * 16;
        F().draw(ctx, lab + ':', 116, y, TH().dim);
        F().draw(ctx, item ? R.Inventory.name(item) : '—', 176, y, i === this.slot ? TH().accent : TH().text);
        if (i === this.slot && !this.choosing) R.UI.cursor(ctx, 106, y + 1);
      });
      // prévia de atributos
      const cur = R.Party.stats(m);
      let prev = null;
      if (this.choosing) {
        const it = this.choosing.current();
        const fake = R.U.clone(m);
        fake.equip[this.slot === 0 ? 'weapon' : 'charm'] = it ? it.id : null;
        prev = R.Party.stats(fake);
      }
      const names = { hp: 'VIDA', br: 'BRILHO', atq: 'ATAQUE', def: 'DEFESA', vel: 'VELOC.', sor: 'SORTE' };
      R.Party.STATS.forEach((k, i) => {
        const x = 240 + (i % 2) * 70, y = 34 + Math.floor(i / 2) * 12;
        F().draw(ctx, names[k], x, y, TH().dim);
        let col = TH().text, txt = String(cur[k]);
        if (prev && prev[k] !== cur[k]) { col = prev[k] > cur[k] ? TH().good : TH().bad; txt = String(prev[k]); }
        F().draw(ctx, txt, x + 64, y, col, { align: 'right' });
      });
      if (this.choosing) {
        R.UI.window(ctx, 100, 92, 280, 60, { title: 'Escolha' });
        this.choosing.render(ctx);
        const it = this.choosing.current();
        R.UI.window(ctx, 100, 156, 280, 54);
        if (it && it.def) R.UI.wrapText(ctx, it.def.desc, 108, 160, 264, TH().text, 12);
      } else {
        const item = slots[this.slot][1];
        const d = item && R.DB.items.items[item];
        R.UI.window(ctx, 100, 156, 280, 54);
        R.UI.wrapText(ctx, d ? d.desc : 'Nada equipado. Pressione Z para escolher.', 108, 160, 264, TH().text, 12);
      }
    }
  }

  // ------------------------------------------------------------------ grupo
  class PartyPage {
    constructor(menu) { this.menu = menu; this.mi = 0; }
    update() {
      const I = R.Input, n = R.State.s.party.length;
      if (I.repeat('left') || I.repeat('up')) { this.mi = (this.mi + n - 1) % n; R.Audio.sfx('cursor'); }
      if (I.repeat('right') || I.repeat('down')) { this.mi = (this.mi + 1) % n; R.Audio.sfx('cursor'); }
      if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('party')) { R.Audio.sfx('cancel'); return 'back'; }
    }
    render(ctx) {
      R.UI.window(ctx, 100, 6, 280, 204);
      const id = R.State.s.party[this.mi];
      const d = R.Party.def(id), m = R.Party.member(id), st = R.Party.stats(m);
      ctx.fillStyle = TH().emoBg.neutro; ctx.fillRect(108, 14, 52, 52);
      ctx.drawImage(R.Art.portrait(id, 'neutro', 1), 106, 12, 56, 56);
      F().draw(ctx, d.name, 168, 14, TH().accent, { scale: 2 });
      F().draw(ctx, d.title, 168, 38, TH().dim);
      F().draw(ctx, 'Nível ' + m.level, 168, 52, TH().text);
      const need = R.Party.expToNext(m.level);
      R.UI.bar(ctx, 220, 56, 100, 4, m.exp, need, TH().exp);
      F().draw(ctx, m.level >= R.Party.MAX_LEVEL ? 'MÁX' : m.exp + '/' + need, 372, 52, TH().dim, { align: 'right' });
      const names = { hp: 'VIDA', br: 'BRILHO', atq: 'ATAQUE', def: 'DEFESA', vel: 'VELOCIDADE', sor: 'SORTE' };
      R.Party.STATS.forEach((k, i) => {
        const x = 110 + (i % 2) * 132, y = 74 + Math.floor(i / 2) * 12;
        F().draw(ctx, names[k], x, y, TH().dim);
        const val = k === 'hp' ? m.hp + '/' + st.hp : k === 'br' ? m.br + '/' + st.br : st[k];
        F().draw(ctx, String(val), x + 120, y, TH().text, { align: 'right' });
      });
      F().draw(ctx, 'Emoções (intensidade máxima):', 110, 114, TH().dim);
      ['feliz', 'triste', 'irritado'].forEach((e, i) => {
        const x = 110 + i * 88;
        R.UI.icon(ctx, e, x, 128);
        F().draw(ctx, e.toUpperCase(), x + 11, 126, TH().emo[e]);
        for (let k = 0; k < 3; k++) { ctx.fillStyle = k < d.emotionMax[e] ? TH().emo[e] : '#3a3450'; ctx.fillRect(x + 11 + k * 6, 139, 4, 3); }
      });
      R.UI.wrapText(ctx, d.bio, 110, 148, 260, TH().text, 12);
      F().draw(ctx, (this.mi + 1) + '/' + R.State.s.party.length + '  ←→', 372, 196, TH().dim, { align: 'right' });
    }
  }

  // ---------------------------------------------------------------- missões
  class QuestsPage {
    constructor(menu) { this.menu = menu; this.tab = 0; this.list = new ListBox({ x: 106, y: 28, w: 110, rows: 13, lh: 12 }); this.build(); }
    build() {
      const ids = R.Quests.list(this.tab === 0 ? 'active' : 'done');
      ids.sort((a, b) => (R.Quests.def(a).type === 'main' ? 0 : 1) - (R.Quests.def(b).type === 'main' ? 0 : 1));
      const items = ids.map((id) => { const d = R.Quests.def(id); const st = R.Quests.status(id); return { label: (d.type === 'main' ? '★' : '') + d.title, id, color: st === 'failed' ? TH().bad : undefined }; });
      if (!items.length) items.push({ label: '(nenhuma)', disabled: true });
      this.list.setItems(items);
    }
    update() {
      const r = this.list.input();
      if (r === 'left' || r === 'right') { this.tab = 1 - this.tab; this.list.sel = 0; this.build(); R.Audio.sfx('cursor'); }
      else if (r === 'cancel') return 'back';
    }
    render(ctx) {
      R.UI.window(ctx, 100, 6, 280, 204);
      ['Em andamento', 'Concluídas'].forEach((t, i) => F().draw(ctx, t, 108 + i * 80, 10, i === this.tab ? TH().accent : TH().dim));
      F().draw(ctx, '←→', 372, 10, TH().dim, { align: 'right' });
      ctx.fillStyle = '#3a3058'; ctx.fillRect(226, 26, 1, 178);
      this.list.render(ctx);
      const it = this.list.current();
      if (!it || !it.id) return;
      const d = R.Quests.def(it.id);
      const st = R.Quests.status(it.id);
      F().draw(ctx, d.type === 'main' ? 'PRINCIPAL' : 'OPCIONAL', 232, 28, d.type === 'main' ? TH().accent : TH().exp);
      if (d.giver) F().draw(ctx, 'De: ' + d.giver, 372, 28, TH().dim, { align: 'right' });
      let y = 42;
      y += R.UI.wrapText(ctx, d.desc, 232, y, 140, TH().text, 11) * 11 + 4;
      for (const s of R.Quests.currentSteps(it.id)) {
        if (y > 186) break;
        R.UI.icon(ctx, s.done ? 'check' : 'neutro', 232, y + 2);
        y += R.UI.wrapText(ctx, s.text + (s.optional ? ' (opcional)' : ''), 244, y, 128, s.done ? TH().dim : TH().text, 11) * 11 + 2;
      }
      if (st === 'failed') F().draw(ctx, 'FALHOU', 372, 196, TH().bad, { align: 'right' });
      else if (d.rewards && st !== 'done') {
        const rw = [];
        if (d.rewards.money) rw.push(d.rewards.money + ' botões');
        if (d.rewards.exp) rw.push(d.rewards.exp + ' EXP');
        if (d.rewards.items) rw.push(Object.keys(d.rewards.items).map((i) => R.Inventory.name(i)).join(', '));
        R.UI.wrapText(ctx, 'Recompensa: ' + rw.join(', '), 232, 188, 140, TH().dim, 10);
      }
    }
  }

  // ------------------------------------------------------------------- mapa
  class MapPage {
    constructor(menu) { this.menu = menu; this.t = 0; }
    update(dt) {
      this.t += dt;
      const I = R.Input;
      if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('map')) { R.Audio.sfx('cancel'); return 'back'; }
    }
    render(ctx) {
      R.UI.window(ctx, 100, 6, 280, 204, { bg: '#1e2a3a' });
      if (!R.Inventory.has('mapa')) {
        R.UI.wrapText(ctx, 'Você ainda não tem um mapa de Algodoal. Talvez o Prefeito tenha um.', 116, 90, 250, TH().text);
        return;
      }
      const wm = R.DB.maps.worldmap;
      const ox = 108, oy = 14;
      // papel
      ctx.fillStyle = '#f2e6c8'; ctx.fillRect(ox, oy, 264, 188);
      ctx.fillStyle = '#e4d4ae';
      for (let i = 0; i < 40; i++) ctx.fillRect(ox + ((i * 53) % 264), oy + ((i * 37) % 188), 2, 1);
      const cur = R.DB.maps.maps[R.State.s.mapId].region;
      const known = (n) => n.maps.some((mid) => R.State.s.visited[mid]);
      ctx.strokeStyle = '#a89068'; ctx.lineWidth = 1;
      for (const [a, b] of wm.links) {
        const A = wm.nodes[a], B = wm.nodes[b];
        if (!known(A) && !known(B)) continue;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(ox + A.x + 0.5, oy + A.y + 0.5); ctx.lineTo(ox + B.x + 0.5, oy + B.y + 0.5); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const key in wm.nodes) {
        const n = wm.nodes[key];
        const k = known(n);
        const x = ox + n.x, y = oy + n.y;
        ctx.fillStyle = k ? n.color || '#5a8a5a' : '#c8b898';
        ctx.fillRect(x - 4, y - 4, 9, 9);
        ctx.fillStyle = '#5a4630'; ctx.fillRect(x - 4, y + 5, 9, 1);
        F().draw(ctx, k ? n.name : '???', x, y + 7, k ? '#3a2a1a' : '#a89878', { align: 'center' });
        if (key === cur && Math.floor(this.t * 3) % 2 === 0) { ctx.fillStyle = '#d84a4a'; ctx.fillRect(x - 2, y - 2, 5, 5); }
      }
      F().draw(ctx, 'ALGODOAL', ox + 6, oy + 4, '#7a5a3a');
    }
  }

  R.Menu = {
    open(page) {
      if (R.Events.busy() || R.Scenes.top() instanceof MenuScene) return Promise.resolve();
      return R.Scenes.push(new MenuScene(page));
    },
  };

  // ================================================================ lojas
  class ShopScene {
    constructor(id) {
      this.opaque = false;
      this.id = id;
      this.def = R.DB.items.shops[id];
      this.mode = 'root';
      this.root = new ListBox({ x: 18, y: 50, w: 70, rows: 3, items: [{ label: 'Comprar' }, { label: 'Vender', disabled: this.def.noSell }, { label: 'Sair' }] });
      this.list = new ListBox({ x: 108, y: 50, w: 262, rows: 8, lh: 12 });
      this.qty = 1;
      this.msg = this.def.greeting || 'Pode olhar à vontade!';
    }
    enter() { this.prevMusic = R.Audio.musicId; R.Audio.playMusic('loja', 300); }
    exit() { R.Audio.playMusic(this.prevMusic || null, 400); }
    stockLeft(e) {
      if (!e.stock) return Infinity;
      return e.stock - (R.State.s.stock[this.id + ':' + e.id] || 0);
    }
    buildBuy() {
      const items = this.def.items.filter((e) => R.Cond.test(e.cond)).map((e) => {
        const d = R.DB.items.items[e.id];
        const left = this.stockLeft(e);
        return { label: d.name, right: left <= 0 ? 'esgotado' : e.price + 'b', id: e.id, price: e.price, entry: e, def: d, disabled: left <= 0 };
      });
      this.list.setItems(items);
    }
    buildSell() {
      const items = R.Inventory.list().filter((e) => e.def.cat !== 'chave' && e.def.price).map((e) => ({ label: e.def.name, right: 'x' + e.qty + '  ' + Math.floor(e.def.price / 2) + 'b', id: e.id, price: Math.floor(e.def.price / 2), def: e.def }));
      if (!items.length) items.push({ label: '(nada para vender)', disabled: true });
      this.list.setItems(items);
    }
    maxQty(it) {
      if ((this.mode === 'qty' ? this.prevMode : this.mode) === 'buy') {
        const money = R.State.s.money;
        const afford = Math.floor(money / it.price);
        const room = R.Inventory.max(it.id) - R.Inventory.count(it.id);
        return Math.max(0, Math.min(afford, room, this.stockLeft(it.entry), 99));
      }
      return R.Inventory.count(it.id);
    }
    update() {
      if (this.busy) return;
      const I = R.Input;
      if (this.mode === 'root') {
        const r = this.root.input();
        if (r === 'cancel' || (r === 'confirm' && this.root.sel === 2)) { R.Scenes.pop(this); return; }
        if (r === 'confirm') { this.mode = this.root.sel === 0 ? 'buy' : 'sell'; this.list.sel = 0; this.mode === 'buy' ? this.buildBuy() : this.buildSell(); }
        return;
      }
      if (this.mode === 'qty') {
        const it = this.list.current();
        const mx = this.maxQty(it);
        if (I.repeat('left') || I.repeat('down')) { this.qty = Math.max(1, this.qty - 1); R.Audio.sfx('cursor'); }
        if (I.repeat('right') || I.repeat('up')) { this.qty = Math.min(mx, this.qty + 1); R.Audio.sfx('cursor'); }
        if (I.pressed('cancel')) { this.mode = this.prevMode; R.Audio.sfx('cancel'); return; }
        if (I.pressed('confirm')) {
          if (this.prevMode === 'buy') {
            const cost = it.price * this.qty;
            if (cost > R.State.s.money) { R.Audio.sfx('buzzer'); this.msg = 'Botões insuficientes.'; return; }
            const got = R.Inventory.add(it.id, this.qty);
            if (got <= 0) { R.Audio.sfx('buzzer'); this.msg = 'Sem espaço para carregar mais.'; return; }
            R.Inventory.addMoney(-it.price * got);
            if (it.entry.stock) R.State.s.stock[this.id + ':' + it.id] = (R.State.s.stock[this.id + ':' + it.id] || 0) + got;
            R.Audio.sfx('coin');
            this.msg = this.def.thanks || 'Obrigado pela compra!';
            this.mode = 'buy'; this.buildBuy();
          } else {
            const n = R.Inventory.remove(it.id, this.qty);
            R.Inventory.addMoney(it.price * n);
            R.Audio.sfx('coin');
            this.msg = 'Negócio fechado!';
            this.mode = 'sell'; this.buildSell();
          }
        }
        return;
      }
      const r = this.list.input();
      if (r === 'cancel') { this.mode = 'root'; return; }
      if (r === 'confirm') {
        const it = this.list.current();
        if (!it.id) return;
        const mx = this.maxQty(it);
        if (mx <= 0) { R.Audio.sfx('buzzer'); this.msg = this.mode === 'buy' ? (R.State.s.money < it.price ? 'Botões insuficientes.' : 'Você não carrega mais disso.') : '...'; return; }
        this.prevMode = this.mode;
        this.mode = 'qty';
        this.qty = 1;
      }
    }
    render(ctx) {
      ctx.fillStyle = 'rgba(8,5,18,0.45)'; ctx.fillRect(0, 0, R.W, R.H);
      R.UI.window(ctx, 6, 6, 372, 30);
      if (this.def.keeper) { const sh = R.Art.sheet(this.def.keeper); ctx.drawImage(sh.frames.down[0], 12, 9); }
      F().draw(ctx, this.def.name, 34, 9, TH().accent);
      R.UI.wrapText(ctx, this.msg, 34, 21, 250, TH().text, 11);
      R.UI.icon(ctx, 'botao', 300, 14);
      F().draw(ctx, R.State.s.money + ' botões', 372, 12, TH().accent, { align: 'right' });
      R.UI.window(ctx, 6, 40, 90, 50);
      this.root.render(ctx, this.mode === 'root');
      R.UI.window(ctx, 100, 40, 278, 108);
      if (this.mode !== 'root') {
        this.list.render(ctx, this.mode !== 'qty');
        const it = this.list.current();
        R.UI.window(ctx, 100, 152, 278, 58);
        if (it && it.def) {
          R.UI.wrapText(ctx, it.def.desc, 108, 156, 262, TH().text, 11);
          F().draw(ctx, 'Você tem: ' + R.Inventory.count(it.id), 108, 196, TH().dim);
          if (it.def.cat === 'arma' || it.def.cat === 'amuleto') {
            const who = it.def.for ? Object.keys(R.DB.characters.party).filter((p) => R.Party.canEquip(p, it.id)).map((p) => R.Party.def(p).name).join(', ') : 'todos';
            F().draw(ctx, 'Para: ' + who, 370, 196, TH().exp, { align: 'right' });
          }
        }
        if (this.mode === 'qty') {
          R.UI.window(ctx, 200, 96, 160, 40, { bg: '#2c2350' });
          F().draw(ctx, 'Quantidade:  ← ' + this.qty + ' →', 210, 102, TH().text);
          F().draw(ctx, 'Total: ' + it.price * this.qty + ' botões', 210, 116, TH().accent);
        }
      } else {
        F().draw(ctx, 'O que vai ser?', 110, 50, TH().dim);
        R.State.s.party.forEach((id, i) => { const sh = R.Art.sheet(id); ctx.drawImage(sh.frames.down[Math.floor(R.Clock.time * 3 + i) % 2 ? 0 : 0], 120 + i * 24, 100); });
      }
    }
  }
  R.Shop = { open(id) { if (!R.DB.items.shops[id]) { R.Log.error('Loja inexistente ' + id); return Promise.resolve(); } return R.Scenes.push(new ShopScene(id)); } };
})();
