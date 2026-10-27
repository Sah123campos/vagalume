/* VAGALUME — estado persistente da partida: flags, variáveis, condições,
 * inventário, grupo, níveis e equipamentos. Tudo aqui vai para o save. */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;

  const MAX_LEVEL = 20;
  const MAX_SKILLS = 4;
  const MAX_MONEY = 99999;

  // ------------------------------------------------------------------ estado
  const State = (R.State = {
    s: null,
    newGame() {
      this.s = {
        mapId: 'arvore', x: 5, y: 6, dir: 'down',
        party: ['lume'],
        members: {},
        inventory: {},
        money: 0,
        flags: {},
        vars: { phase: 0 },
        quests: {},
        visited: {},
        playTime: 0,
        stock: {}, // estoque já comprado em lojas
        version: R.SAVE_VERSION,
      };
      for (const id of Object.keys(R.DB.characters.party)) this.s.members[id] = Party.createMember(id, 1);
      return this.s;
    },
    flag(k) { return !!this.s.flags[k]; },
    setFlag(k, v = true) {
      if (v) this.s.flags[k] = true; else delete this.s.flags[k];
      this.changed();
    },
    v(k) { return this.s.vars[k] || 0; },
    setVar(k, val) { this.s.vars[k] = val; this.changed(); },
    addVar(k, d) { this.s.vars[k] = (this.s.vars[k] || 0) + d; this.changed(); },
    phase() { return this.s.vars.phase || 0; },
    // chamado quando algo muda: missões se atualizam, mundo reavalia páginas
    changed() {
      if (this._batch) { this._dirty = true; return; }
      R.Bus.emit('state-changed');
    },
    batch(fn) {
      this._batch = true;
      try { fn(); } finally { this._batch = false; if (this._dirty) { this._dirty = false; R.Bus.emit('state-changed'); } }
    },
  });

  // ------------------------------------------------------------- condições
  // "flag:x", "!flag:x", "var:x>=3", "phase>=2", "item:id", "item:id>=2", "!item:id",
  // "quest:id=active|done|inactive|failed", "quest:id.step", "party:brisa", "money>=10",
  // "dir:up", "map:vila", "seen:mapId". Arrays = E; {"any":[...]} = OU; {"not": c} = NÃO.
  const OPS = {
    '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '!=': (a, b) => a != b, // eslint-disable-line eqeqeq
    '==': (a, b) => a == b, '=': (a, b) => a == b, '>': (a, b) => a > b, '<': (a, b) => a < b, // eslint-disable-line eqeqeq
  };
  function cmpExpr(str) {
    const m = str.match(/^(.*?)(>=|<=|!=|==|=|>|<)(.*)$/);
    if (!m) return null;
    return { key: m[1].trim(), op: m[2], val: m[3].trim() };
  }
  function numOrStr(v) { const n = Number(v); return isNaN(n) ? v : n; }

  function evalOne(c) {
    if (c === undefined || c === null || c === true) return true;
    if (c === false) return false;
    if (Array.isArray(c)) return c.every(evalOne);
    if (typeof c === 'object') {
      if (c.any) return c.any.some(evalOne);
      if (c.not) return !evalOne(c.not);
      if (c.all) return c.all.every(evalOne);
      return true;
    }
    let s = String(c).trim();
    let neg = false;
    if (s[0] === '!') { neg = true; s = s.slice(1); }
    const r = evalAtom(s);
    return neg ? !r : r;
  }
  function evalAtom(s) {
    const st = State.s;
    const colon = s.indexOf(':');
    const head = colon >= 0 ? s.slice(0, colon) : s;
    const rest = colon >= 0 ? s.slice(colon + 1) : '';
    switch (head) {
      case 'flag': return !!st.flags[rest];
      case 'var': {
        const e = cmpExpr(rest);
        if (!e) return !!st.vars[rest];
        return OPS[e.op](st.vars[e.key] || 0, numOrStr(e.val));
      }
      case 'item': {
        const e = cmpExpr(rest);
        if (!e) return Inventory.count(rest) > 0;
        return OPS[e.op](Inventory.count(e.key), Number(e.val));
      }
      case 'quest': {
        const e = cmpExpr(rest);
        if (e) {
          if (e.key.includes('.')) {
            const [qid, step] = e.key.split('.');
            return R.Quests.stepDone(qid, step) === (e.val === 'true' || e.val === '1');
          }
          return OPS[e.op](R.Quests.status(e.key), e.val);
        }
        if (rest.includes('.')) { const [qid, step] = rest.split('.'); return R.Quests.stepDone(qid, step); }
        return R.Quests.status(rest) === 'active';
      }
      case 'party': return st.party.includes(rest);
      case 'dir': return R.World && R.World.player && R.World.player.dir === rest;
      case 'map': return st.mapId === rest;
      case 'seen': return !!st.visited[rest];
      case 'equip': { const [cid, item] = rest.split('='); const m = st.members[cid]; return !!m && (m.equip.weapon === item || m.equip.charm === item); }
      case 'level': { const e = cmpExpr(rest); return e ? OPS[e.op](st.members[e.key] ? st.members[e.key].level : 0, Number(e.val)) : false; }
      default: {
        // atalhos: phase>=2, money>=10
        const e = cmpExpr(s);
        if (e) {
          if (e.key === 'phase') return OPS[e.op](st.vars.phase || 0, Number(e.val));
          if (e.key === 'money') return OPS[e.op](st.money, Number(e.val));
          return OPS[e.op](st.vars[e.key] || 0, numOrStr(e.val));
        }
        R.Log.warn('Condição desconhecida: ' + s);
        return false;
      }
    }
  }
  R.Cond = { test: (c) => { try { return evalOne(c); } catch (e) { R.Log.error('Erro em condição ' + JSON.stringify(c), e.message); return false; } } };

  // -------------------------------------------------------------- inventário
  const Inventory = (R.Inventory = {
    def(id) { return R.DB.items.items[id]; },
    max(id) {
      const d = this.def(id);
      if (!d) return 0;
      if (d.max) return d.max;
      if (d.cat === 'chave') return 1;
      if (d.cat === 'arma' || d.cat === 'amuleto') return 9;
      return 30;
    },
    count(id) { return (State.s && State.s.inventory[id]) || 0; },
    has(id, n = 1) { return this.count(id) >= n; },
    // devolve quantos realmente entraram
    add(id, n = 1) {
      const d = this.def(id);
      if (!d) { R.Log.error('Item inexistente: ' + id); return 0; }
      const cur = this.count(id);
      const room = Math.max(0, this.max(id) - cur);
      const k = Math.min(room, n);
      if (k > 0) { State.s.inventory[id] = cur + k; State.changed(); }
      return k;
    },
    remove(id, n = 1) {
      const cur = this.count(id);
      const k = Math.min(cur, n);
      if (k <= 0) return 0;
      if (cur - k <= 0) delete State.s.inventory[id]; else State.s.inventory[id] = cur - k;
      State.changed();
      return k;
    },
    list(cat) {
      const out = [];
      const items = R.DB.items.items;
      for (const id of Object.keys(State.s.inventory)) {
        const d = items[id];
        if (!d) continue;
        if (cat && !(Array.isArray(cat) ? cat.includes(d.cat) : d.cat === cat)) continue;
        out.push({ id, def: d, qty: State.s.inventory[id] });
      }
      const order = Object.keys(items);
      out.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      return out;
    },
    addMoney(n) { State.s.money = U.clamp(State.s.money + n, 0, MAX_MONEY); State.changed(); },
    name(id) { const d = this.def(id); return d ? d.name : id; },
  });

  // -------------------------------------------------------------------- grupo
  const STATS = ['hp', 'br', 'atq', 'def', 'vel', 'sor'];
  const Party = (R.Party = {
    MAX_LEVEL,
    MAX_SKILLS,
    STATS,
    def(id) { return R.DB.characters.party[id]; },
    createMember(id, level) {
      const d = this.def(id);
      const m = { id, level, exp: 0, hp: 1, br: 1, equip: { weapon: d.startWeapon || null, charm: null }, skills: [], learned: [] };
      this.learnUpTo(m, level, true);
      const st = this.stats(m);
      m.hp = st.hp; m.br = st.br;
      return m;
    },
    member(id) { return State.s.members[id]; },
    // atributos finais (base + crescimento + equipamento)
    stats(m) {
      if (typeof m === 'string') m = this.member(m);
      const d = this.def(m.id);
      const out = {};
      for (const k of STATS) out[k] = Math.floor(d.base[k] + d.growth[k] * (m.level - 1));
      for (const slot of ['weapon', 'charm']) {
        const it = m.equip[slot] && R.DB.items.items[m.equip[slot]];
        if (it && it.stats) for (const k in it.stats) out[k] = (out[k] || 0) + it.stats[k];
      }
      for (const k of STATS) out[k] = Math.max(1, out[k]);
      return out;
    },
    expToNext(level) { return Math.floor(14 * Math.pow(level, 1.6) + 12); },
    // aprende habilidades até o nível; equipa automaticamente se houver espaço
    learnUpTo(m, level, silent) {
      const d = this.def(m.id);
      const learned = [];
      for (const s of d.skills) {
        if (s.level <= level && !m.learned.includes(s.id)) {
          m.learned.push(s.id);
          if (m.skills.length < MAX_SKILLS) m.skills.push(s.id);
          learned.push(s.id);
        }
      }
      if (!silent && learned.length) State.changed();
      return learned;
    },
    // ganha EXP; devolve lista de eventos de nível
    gainExp(id, amount) {
      const m = this.member(id);
      const events = [];
      if (!m || m.level >= MAX_LEVEL) return events;
      m.exp += amount;
      while (m.level < MAX_LEVEL && m.exp >= this.expToNext(m.level)) {
        m.exp -= this.expToNext(m.level);
        const before = this.stats(m);
        m.level++;
        const after = this.stats(m);
        m.hp += after.hp - before.hp;
        m.br += after.br - before.br;
        const skills = this.learnUpTo(m, m.level, true);
        events.push({ id, level: m.level, before, after, skills });
      }
      if (m.level >= MAX_LEVEL) m.exp = 0;
      State.changed();
      return events;
    },
    healAll() {
      for (const id of State.s.party) {
        const m = this.member(id);
        const st = this.stats(m);
        m.hp = st.hp; m.br = st.br;
      }
      State.changed();
    },
    clampAll() {
      for (const id of Object.keys(State.s.members)) {
        const m = this.member(id);
        const st = this.stats(m);
        m.hp = U.clamp(Math.round(m.hp), 0, st.hp);
        m.br = U.clamp(Math.round(m.br), 0, st.br);
      }
    },
    join(id) {
      if (!State.s.party.includes(id)) {
        // novo membro chega no nível médio do grupo
        const avg = Math.round(State.s.party.reduce((a, p) => a + this.member(p).level, 0) / State.s.party.length);
        const m = this.member(id);
        if (m.level < avg) {
          const fresh = this.createMember(id, avg);
          fresh.equip = m.equip;
          State.s.members[id] = fresh;
        }
        State.s.party.push(id);
        const mm = this.member(id), st = this.stats(mm);
        mm.hp = st.hp; mm.br = st.br;
        State.changed();
      }
    },
    leave(id) {
      State.s.party = State.s.party.filter((p) => p !== id);
      State.changed();
    },
    // equipa item do inventário (devolve o anterior)
    equip(id, slot, itemId) {
      const m = this.member(id);
      const prev = m.equip[slot];
      if (itemId) {
        if (!Inventory.has(itemId)) return false;
        Inventory.remove(itemId, 1);
      }
      if (prev) Inventory.add(prev, 1);
      m.equip[slot] = itemId || null;
      this.clampAll();
      State.changed();
      return true;
    },
    canEquip(id, itemId) {
      const it = R.DB.items.items[itemId];
      if (!it) return false;
      if (it.cat === 'arma') return it.for === this.def(id).weaponType || it.for === id;
      if (it.cat === 'amuleto') return !it.for || it.for === id;
      return false;
    },
    toggleSkill(id, skillId) {
      const m = this.member(id);
      const i = m.skills.indexOf(skillId);
      if (i >= 0) { m.skills.splice(i, 1); State.changed(); return true; }
      if (m.skills.length >= MAX_SKILLS) return false;
      if (!m.learned.includes(skillId)) return false;
      m.skills.push(skillId);
      State.changed();
      return true;
    },
    leaderLevel() { return this.member(State.s.party[0]).level; },
  });
})();
