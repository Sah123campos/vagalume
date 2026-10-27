/* VAGALUME — batalha por turnos: unidades, fluxo (comandos -> execução por velocidade),
 * dano, emoções, efeitos, LAÇO (combos entre amigos), fuga, vitória e derrota.
 * A interface (desenho e menus) fica em combat-ui.js; a IA em combat-ai.js. */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;
  const E = R.Emotions;

  const BASIC = { id: 'atacar', name: 'Atacar', target: 'foe', cost: 0, effects: [{ type: 'damage', power: 1 }], basic: true };
  const STAT_NAME = { atq: 'ATAQUE', def: 'DEFESA', vel: 'VELOCIDADE', sor: 'SORTE' };
  const LACO_MAX = 10;

  // ================================================================ unidade
  class Unit {
    constructor(side) {
      this.side = side;
      this.emotion = E.none();
      this.buffs = [];
      this.status = {};
      this.anim = { flash: 0, shake: 0, ox: 0, oy: 0, alpha: 1, dying: 0, hurt: 0, act: 0 };
    }
    alive() { return this.hp > 0; }
    stat(k) {
      let v = this.base[k];
      const em = E.mods(this.emotion);
      if (k === 'atq') v *= em.atq;
      if (k === 'def') v *= em.def;
      if (k === 'vel') v *= em.vel;
      for (const b of this.buffs) if (b.stat === k) v *= b.mult;
      if (this.battle && this.side === 'party' && this.battle.sintonia === 'irritado' && k === 'atq') v *= 1.15;
      return Math.max(1, Math.round(v));
    }
    critChance() {
      let c = 0.04 + this.stat('sor') / 220 + E.mods(this.emotion).crit;
      if (this.battle && this.side === 'party' && this.battle.sintonia === 'feliz') c += 0.1;
      return c;
    }
  }

  function partyUnit(id, battle) {
    const m = R.Party.member(id), d = R.Party.def(id), st = R.Party.stats(m);
    const u = new Unit('party');
    u.battle = battle;
    u.id = id; u.name = d.name;
    u.mhp = st.hp; u.mbr = st.br;
    u.base = { atq: st.atq, def: st.def, vel: st.vel, sor: st.sor };
    u.hp = m.hp; u.br = m.br;
    u.emotionMax = Object.assign({}, d.emotionMax);
    u.skills = m.skills.slice();
    u.attackFx = d.attackFx || 'slash';
    u.voice = d.voice;
    const charm = m.equip.charm && R.DB.items.items[m.equip.charm];
    if (charm && charm.special) {
      const sp = charm.special;
      if (sp.startEmotion) u.startEmotion = sp.startEmotion;
      if (sp.fearless) u.fearless = true;
      if (sp.brRegen) u.brRegen = sp.brRegen;
      if (sp.emotionMaxUp) u.emotionMax[sp.emotionMaxUp] = Math.min(3, (u.emotionMax[sp.emotionMaxUp] || 0) + 1);
    }
    return u;
  }
  function enemyUnit(key, idx, battle) {
    const d = R.DB.enemies.enemies[key];
    const u = new Unit('enemy');
    u.battle = battle;
    u.key = key; u.id = key + '#' + idx; u.def = d;
    u.name = d.name;
    u.sprite = d.sprite;
    u.mhp = d.hp; u.hp = d.hp; u.mbr = 0; u.br = 0;
    u.base = { atq: d.atq, def: d.def, vel: d.vel, sor: d.sor || 3 };
    u.emotionMax = Object.assign({ feliz: 2, triste: 2, irritado: 2 }, d.emotionMax || {});
    if (d.startEmotion) E.apply(u, d.startEmotion[0], d.startEmotion[1] || 1);
    u.boss = !!d.boss;
    u.fearless = !!d.fearless;
    u.size = d.size || 1;
    return u;
  }

  // ================================================================= batalha
  class Battle {
    constructor(troopId, opts) {
      this.opaque = true;
      this.pausable = true;
      this.troopId = troopId;
      this.troop = R.DB.enemies.troops[troopId];
      this.opts = Object.assign({ canFlee: this.troop.canFlee !== false }, opts || {});
      this.party = R.State.s.party.map((id) => partyUnit(id, this));
      this.enemies = this.troop.enemies.map((k, i) => enemyUnit(k, i, this));
      this.round = 0;
      this.laco = 0;
      this.msg = '';
      this.msg2 = '';
      this.ps = new R.Particles(400);
      this.popups = [];
      this.ui = null;
      this.t = 0;
      this.dt = 0;
      this.ended = false;
      this.result = null;
      this.introT = 0;
      this.bg = this.troop.bg || (R.World.map && R.World.map.def.battleBg) || 'campos';
      this.reserved = {};
      this.lastTarget = null;
      this.sintonia = null;
      this.guard = null;
      this.darkness = 0;
      this.tide = null;
      this.brain = this.troop.brain ? R.BattleAI.brain(this.troop.brain, this) : null;
      this.layoutEnemies();
    }
    units() { return this.party.concat(this.enemies); }
    aliveParty() { return this.party.filter((u) => u.alive()); }
    aliveEnemies() { return this.enemies.filter((u) => u.alive() && !u.gone); }
    opponents(u) { return u.side === 'party' ? this.aliveEnemies() : this.aliveParty(); }
    allies(u) { return u.side === 'party' ? this.aliveParty() : this.aliveEnemies(); }
    layoutEnemies() {
      const list = this.enemies.filter((e) => !e.gone);
      const n = list.length;
      const spacing = Math.min(74, 210 / Math.max(1, n));
      list.forEach((e, i) => { e.slotX = 192 + (i - (n - 1) / 2) * spacing; e.slotY = 132; });
    }
    addEnemy(key) {
      const u = enemyUnit(key, this.enemies.length, this);
      u.anim.alpha = 0;
      u.anim.spawn = 1;
      this.enemies.push(u);
      this.layoutEnemies();
      return u;
    }

    // ------------------------------------------------------- ciclo da cena
    enter() {
      R.Battle.current = this;
      this.prevMusic = R.Audio.musicId;
      R.Audio.playMusic(this.opts.music || this.troop.music || 'batalha', 200);
      R.Audio.sfx('battleStart');
      this.run().catch((e) => { R.Errors.report(e, 'batalha'); this.finish('win'); });
    }
    exit() {
      R.Battle.current = null;
      if (this.opts.keepMusic) return;
      if (R.World.mapCfg) R.Audio.playMusic(R.World.mapCfg.music || null, 600);
    }
    update(dt) {
      this.t += dt;
      this.dt = dt;
      this.fast = R.Input.down('confirm') && !this.ui;
      this.ps.update(dt);
      for (const p of this.popups) p.t += dt;
      this.popups = this.popups.filter((p) => p.t < 1.1);
      for (const u of this.units()) {
        const a = u.anim;
        a.flash = Math.max(0, a.flash - dt * 4);
        a.shake = Math.max(0, a.shake - dt);
        a.hurt = Math.max(0, a.hurt - dt);
        a.act = Math.max(0, a.act - dt * 3);
        if (a.spawn) { a.spawn = Math.max(0, a.spawn - dt * 2); a.alpha = 1 - a.spawn; }
        if (a.dying) { a.dying = Math.min(1, a.dying + dt * 1.6); a.alpha = 1 - a.dying; if (a.dying >= 1) u.gone = true; }
      }
      if (this.ui) {
        const r = this.ui.update(dt);
        if (r !== undefined && r !== null) { const res = this.uiResolve; this.ui = null; this.uiResolve = null; R.Input.consume(); res(r); }
      }
      if (R.Debug && R.Debug.on && R.Input.pressed('map') && this.ui) { /* nada */ }
    }
    // espera em tempo de batalha (segurar Z acelera)
    wait(ms) {
      return new Promise((resolve) => {
        let t = 0;
        const tick = () => {
          t += this.dt * 1000 * (this.fast ? 3 : 1);
          if (t >= ms) resolve(); else R.Clock.nextFrame().then(tick);
        };
        R.Clock.nextFrame().then(tick);
      });
    }
    async say(text, ms = 650, text2 = '') {
      this.msg = text; this.msg2 = text2;
      await this.wait(ms);
    }
    menu(ui) {
      return new Promise((resolve) => { this.ui = ui; this.uiResolve = resolve; });
    }
    async speak(speaker, lines) {
      for (const l of [].concat(lines)) await R.Dialogue.say(speaker, l);
      R.Dialogue.close();
    }

    // ---------------------------------------------------------------- fluxo
    async run() {
      // entrada
      this.introT = 0;
      for (let i = 0; i < 30; i++) { this.introT = i / 30; await R.Clock.nextFrame(); }
      this.introT = 1;
      for (const u of this.party) if (u.startEmotion) this.applyEmotion(u, u.startEmotion, 1, null, true);
      const names = this.enemies.map((e) => e.name);
      const uniq = [...new Set(names)];
      await this.say(this.troop.intro || (uniq.length === 1 && names.length > 1 ? names.length + 'x ' + uniq[0] + ' apareceram!' : uniq.join(', ') + (names.length > 1 ? ' apareceram!' : ' apareceu!')), 900);
      if (this.brain && this.brain.onStart) await this.brain.onStart();
      if (this.opts.tutorial) await R.BattleTutorial.start(this);
      while (!this.ended) {
        this.round++;
        await this.roundStart();
        if (this.checkEnd()) break;
        const plan = await this.inputPhase();
        if (plan === 'fled') { this.result = 'flee'; break; }
        if (this.checkEnd()) break;
        await this.executePhase(plan);
        if (this.checkEnd()) break;
        await this.roundEnd();
        if (this.checkEnd()) break;
      }
      await this.outro();
    }
    checkEnd() {
      if (this.result) return true;
      if (!this.aliveEnemies().length && !this.enemies.some((e) => e.anim.dying > 0 && e.anim.dying < 1)) { this.result = 'win'; return true; }
      if (!this.aliveEnemies().length) { this.result = 'win'; return true; }
      if (!this.aliveParty().length) { this.result = 'lose'; return true; }
      return false;
    }
    async roundStart() {
      this.msg2 = '';
      // sintonia: 3+ amigos com a mesma família de emoção
      this.sintonia = null;
      const fam = {};
      for (const u of this.aliveParty()) if (u.emotion.type && u.emotion.type !== 'medo') fam[u.emotion.type] = (fam[u.emotion.type] || 0) + 1;
      for (const f in fam) if (fam[f] >= 3) this.sintonia = f;
      if (this.sintonia) {
        this.addLaco(1);
        const txt = { feliz: 'crítico +10%', triste: 'recuperam BRILHO', irritado: 'ataque +15%' }[this.sintonia];
        if (this.sintonia === 'triste') for (const u of this.aliveParty()) u.br = Math.min(u.mbr, u.br + Math.ceil(u.mbr * 0.08));
        R.Audio.sfx('followup');
        await this.say('SINTONIA ' + E.LABEL[this.sintonia][0] + '! (' + txt + ')', 800);
      }
      for (const u of this.aliveParty()) if (u.brRegen) u.br = Math.min(u.mbr, u.br + u.brRegen);
      if (this.brain && this.brain.onRoundStart) await this.brain.onRoundStart();
    }
    async inputPhase() {
      this.reserved = {};
      const choice = await this.menu(new R.BattleUI.PartyMenu(this));
      if (choice === 'flee') {
        if (!this.opts.canFlee) { R.Audio.sfx('buzzer'); await this.say('Não dá para fugir desta luta!', 800); return this.inputPhase(); }
        const pv = this.aliveParty().reduce((a, u) => a + u.stat('vel'), 0) / Math.max(1, this.aliveParty().length);
        const ev = this.aliveEnemies().reduce((a, u) => a + u.stat('vel'), 0) / Math.max(1, this.aliveEnemies().length);
        const p = U.clamp(0.55 + (pv - ev) / 30 + this.round * 0.05, 0.25, 0.92);
        if (Math.random() < p) { R.Audio.sfx('flee'); await this.say('Vocês fugiram!', 700); return 'fled'; }
        await this.say('Não conseguiram fugir!', 700);
        return [];
      }
      const plan = [];
      const actors = this.party.filter((u) => u.alive());
      let i = 0;
      while (i < actors.length) {
        const u = actors[i];
        this.active = u;
        if (u.status.enraizado || u.status.atordoado) { plan[i] = { actor: u, kind: 'skip' }; i++; continue; }
        const act = await this.chooseAction(u);
        if (act === 'back') {
          if (i === 0) { this.active = null; return this.inputPhase(); }
          i--;
          const prev = plan[i];
          if (prev && prev.kind === 'item') this.reserved[prev.item] = (this.reserved[prev.item] || 1) - 1;
          // pula para trás quem não escolhe
          while (i > 0 && plan[i] && plan[i].kind === 'skip') i--;
          continue;
        }
        plan[i] = act;
        if (act.kind === 'item') this.reserved[act.item] = (this.reserved[act.item] || 0) + 1;
        i++;
      }
      this.active = null;
      return plan.filter(Boolean);
    }
    async chooseAction(u) {
      for (;;) {
        const special = this.brain && this.brain.commandOverride ? this.brain.commandOverride(u) : null;
        const cmd = await this.menu(new R.BattleUI.CommandMenu(this, u, special));
        if (cmd === 'back') return 'back';
        if (cmd && cmd.special) return { actor: u, kind: 'special', id: cmd.special };
        if (cmd === 'defend') return { actor: u, kind: 'defend' };
        if (cmd === 'attack') {
          const t = await this.pickTarget(u, BASIC);
          if (t === 'back') continue;
          return { actor: u, kind: 'attack', target: t };
        }
        if (cmd === 'skill') {
          const sk = await this.menu(new R.BattleUI.SkillMenu(this, u));
          if (sk === 'back') continue;
          const def = R.DB.skills.skills[sk];
          const t = await this.pickTarget(u, def);
          if (t === 'back') continue;
          return { actor: u, kind: 'skill', skill: sk, target: t };
        }
        if (cmd === 'item') {
          const it = await this.menu(new R.BattleUI.ItemMenu(this, u));
          if (it === 'back') continue;
          const def = R.DB.items.items[it];
          const t = await this.pickTarget(u, def.use);
          if (t === 'back') continue;
          return { actor: u, kind: 'item', item: it, target: t };
        }
      }
    }
    targetPool(u, def) {
      const tt = def.target || 'foe';
      if (tt === 'foes') return this.opponents(u);
      if (tt === 'allies' || tt === 'self') return [u];
      if (tt === 'allyDead') return this.party.filter((p) => !p.alive());
      if (tt === 'otherAlly') return this.allies(u).filter((p) => p !== u);
      if (tt === 'ally') return this.allies(u);
      if (tt === 'any') return this.aliveEnemies().concat(this.aliveParty());
      return this.opponents(u);
    }
    async pickTarget(u, def) {
      const tt = def.target || 'foe';
      if (tt === 'foes' || tt === 'allies' || tt === 'self' || tt === 'randomFoe') return null;
      let pool;
      if (tt === 'foe') pool = this.opponents(u);
      else if (tt === 'ally') pool = this.allies(u);
      else if (tt === 'allyDead') pool = this.party.filter((p) => !p.alive());
      else if (tt === 'otherAlly') pool = this.allies(u).filter((p) => p !== u);
      else if (tt === 'any') pool = this.aliveEnemies().concat(this.aliveParty());
      else pool = this.opponents(u);
      if (!pool.length) { R.Audio.sfx('buzzer'); return 'back'; }
      return this.menu(new R.BattleUI.TargetMenu(this, u, pool, def));
    }

    // ------------------------------------------------------------- execução
    async executePhase(plan) {
      const queue = plan.slice();
      for (const e of this.aliveEnemies()) {
        const n = this.brain && this.brain.actionsFor ? this.brain.actionsFor(e) : (e.def.actions || 1);
        for (let k = 0; k < n; k++) queue.push({ actor: e, kind: 'ai' });
      }
      const pri = (a) => (a.kind === 'defend' ? 100 : a.kind === 'skill' && R.DB.skills.skills[a.skill].priority ? R.DB.skills.skills[a.skill].priority : 0);
      for (const a of queue) a._spd = a.actor.stat('vel') * U.rand(0.92, 1.08);
      queue.sort((a, b) => pri(b) - pri(a) || b._spd - a._spd);
      for (const a of queue) {
        if (this.checkEnd()) return;
        if (!a.actor.alive() || a.actor.gone) continue;
        await this.perform(a);
        await this.wait(120);
      }
    }
    async perform(a) {
      const u = a.actor;
      if (a.kind === 'skip' || u.status.enraizado || u.status.atordoado) {
        const why = u.status.enraizado ? ' está preso pelas raízes!' : u.status.atordoado ? ' está atordoado!' : ' não pode agir.';
        await this.say(u.name + why, 650);
        return;
      }
      if (u.status.sonolento && Math.random() < 0.5) { R.Audio.sfx('yawn'); await this.say(u.name + ' cochilou...', 700); return; }
      this.activeExec = u;
      u.anim.act = 1;
      try {
        if (a.kind === 'defend') {
          u.defending = true;
          this.addLaco(1);
          R.Audio.sfx('buff');
          await this.say(u.name + ' se protege e respira fundo.', 550);
        } else if (a.kind === 'attack') {
          await this.useSkill(u, BASIC, a.target);
        } else if (a.kind === 'skill') {
          await this.useSkill(u, R.DB.skills.skills[a.skill], a.target);
        } else if (a.kind === 'item') {
          await this.useItem(u, a.item, a.target);
        } else if (a.kind === 'special') {
          if (this.brain && this.brain.performSpecial) await this.brain.performSpecial(u, a.id);
        } else if (a.kind === 'ai') {
          let c = this.brain && this.brain.choose ? await this.brain.choose(u) : null;
          if (c === 'skip') return;
          if (!c) c = R.BattleAI.choose(this, u);
          if (!c) { await this.say(u.name + ' observa vocês.', 500); return; }
          await this.useSkill(u, c.skill, c.target);
        }
      } finally { this.activeExec = null; }
    }
    resolveTargets(u, def, chosen) {
      const tt = def.target || 'foe';
      const opp = this.opponents(u), all = this.allies(u);
      const pickFoe = () => {
        // provocação: inimigos miram em quem provoca
        if (u.side === 'enemy') {
          const taunt = opp.filter((p) => p.status.provocando);
          if (taunt.length && Math.random() < 0.75) return taunt[0];
        }
        return U.choice(opp);
      };
      switch (tt) {
        case 'foes': return opp;
        case 'allies': return all;
        case 'self': return [u];
        case 'randomFoe': return opp.length ? [pickFoe()] : [];
        case 'allyDead': return chosen && !chosen.alive() ? [chosen] : this.party.filter((p) => !p.alive()).slice(0, 1);
        case 'ally': case 'otherAlly': return chosen && chosen.alive() ? [chosen] : all.length ? [all[0]] : [];
        case 'any': return chosen && chosen.alive() ? [chosen] : [];
        default:
          if (chosen && chosen.alive() && !chosen.gone && opp.includes(chosen)) return [chosen];
          return opp.length ? [chosen === undefined ? pickFoe() : U.choice(opp)] : [];
      }
    }
    async useSkill(u, def, chosen, extra = {}) {
      if (!def) return;
      if (!def.basic && u.side === 'party') {
        if (E.mods(u.emotion).noSkills) { await this.say(u.name + ' está com medo demais para isso!', 750); return; }
        if (u.status.selado && u.status.selado.skill === def.id) { await this.say(u.name + ' esqueceu como fazer ' + def.name + '...', 800); return; }
        if (u.br < def.cost) { R.Audio.sfx('buzzer'); await this.say(u.name + ' não tem BRILHO suficiente!', 750); return; }
        u.br -= def.cost;
      }
      const targets = this.resolveTargets(u, def, chosen);
      if (!targets.length) { await this.say(u.name + ' não encontrou um alvo.', 500); return; }
      const msg = (def.msg || (def.basic ? (u.side === 'party' ? '{u} ataca {t}!' : '{u} ataca {t}!') : '{u} usou {s}!'))
        .replace('{u}', u.name).replace('{s}', def.name.toUpperCase()).replace('{t}', targets.length > 1 ? 'todos' : targets[0].name);
      this.msg = msg; this.msg2 = '';
      if (!def.basic) R.Audio.sfx(def.sfx || 'skill');
      const fx = def.basic ? (u.side === 'party' ? u.attackFx : (u.def.attackFx || 'claw')) : def.fx;
      await this.fx(fx, targets, u);
      let anyHit = false;
      const ctx = { skill: def, user: u, mul: extra.mul || 1, lacoGiven: false };
      for (const t of targets) {
        const r = await this.applyEffects(u, t, def.effects || [], ctx);
        if (r.hit) anyHit = true;
        if (targets.length > 1) await this.wait(90);
      }
      if (targets.length === 1) this.lastTarget = targets[0];
      await this.wait(260);
      if (def.basic && u.side === 'party' && anyHit) {
        this.addLaco(1);
        await this.offerFollowup(u);
      }
    }
    async useItem(u, itemId, chosen) {
      const def = R.DB.items.items[itemId];
      if (!R.Inventory.has(itemId)) { await this.say('Acabou ' + def.name + '!', 650); return; }
      R.Inventory.remove(itemId, 1);
      this.reserved[itemId] = Math.max(0, (this.reserved[itemId] || 1) - 1);
      const use = def.use;
      const targets = this.resolveTargets(u, use, chosen);
      this.msg = u.name + ' usou ' + def.name.toUpperCase() + '!';
      R.Audio.sfx(use.sfx || 'item');
      await this.fx(use.fx || 'heal', targets, u);
      const ctx = { item: def, user: u, mul: 1 };
      for (const t of targets) await this.applyEffects(u, t, use.effects, ctx);
      await this.wait(300);
    }

    // ----------------------------------------------------------- efeitos
    async applyEffects(u, t, effects, ctx) {
      const out = { hit: false };
      for (const e of effects) {
        if (e.chance !== undefined && Math.random() > e.chance) continue;
        const target = e.on === 'self' ? u : t;
        if (!target) continue;
        if (!target.alive() && e.type !== 'revive') continue;
        switch (e.type) {
          case 'damage': {
            const hits = e.hits || 1;
            for (let h = 0; h < hits; h++) {
              if (!target.alive()) break;
              const r = this.calcDamage(u, target, (e.power || 1) * (ctx.mul || 1), e);
              if (r.miss) { this.popup(target, 'ERROU', '#c8c2d8'); R.Audio.sfx('miss'); await this.wait(250); return out; }
              out.hit = true;
              await this.dealDamage(target, r.dmg, { crit: r.crit, adv: r.adv, attacker: u, ctx });
              if (hits > 1) await this.wait(160);
            }
            break;
          }
          case 'fixed': {
            out.hit = true;
            const adv = E.multiplier(u.emotion, target.emotion);
            await this.dealDamage(target, Math.round(e.amount * adv * U.rand(0.9, 1.1)), { attacker: u, ctx });
            break;
          }
          case 'heal': {
            const v = Math.round((e.amount || target.mhp * (e.pct || 0)) * (ctx.mul || 1));
            const healed = Math.min(target.mhp - target.hp, v);
            target.hp += healed;
            this.popup(target, '+' + healed, R.THEME.good);
            this.sparkle(target, 'heal');
            break;
          }
          case 'healBr': {
            if (target.side !== 'party') break;
            const v = Math.round((e.amount || target.mbr * (e.pct || 0)) * (ctx.mul || 1));
            const healed = Math.min(target.mbr - target.br, v);
            target.br += healed;
            this.popup(target, '+' + healed + ' BR', R.THEME.br);
            break;
          }
          case 'revive': {
            if (target.alive()) break;
            target.hp = Math.max(1, Math.round(target.mhp * (e.pct || 0.3)));
            target.emotion = E.none();
            R.Audio.sfx('heal');
            this.sparkle(target, 'heal');
            await this.say(target.name + ' voltou a brilhar!', 700);
            break;
          }
          case 'emotion': this.applyEmotion(target, e.emotion, e.steps || 1, e.turns); await this.wait(220); break;
          case 'buff': {
            const ex = target.buffs.find((b) => b.stat === e.stat && (b.mult > 1) === (e.mult > 1));
            if (ex) { ex.turns = Math.max(ex.turns, e.turns || 3); ex.mult = e.mult; }
            else target.buffs.push({ stat: e.stat, mult: e.mult, turns: e.turns || 3 });
            const up = e.mult > 1;
            R.Audio.sfx(up ? 'buff' : 'debuff');
            this.popup(target, STAT_NAME[e.stat] + (up ? ' ↑' : ' ↓'), up ? R.THEME.good : R.THEME.bad);
            await this.wait(200);
            break;
          }
          case 'status': {
            if (target.boss && e.status !== 'selado' && e.bossImmune !== false && (e.status === 'atordoado' || e.status === 'enraizado')) { this.popup(target, 'IMUNE', R.THEME.dim); break; }
            if (e.status === 'selado') {
              const sk = target.skills && target.skills.length ? U.choice(target.skills) : null;
              if (!sk) break;
              target.status.selado = { skill: sk, turns: e.turns || 2 };
              this.popup(target, 'ESQUECEU', '#c8a8ff');
              await this.say(target.name + ' esqueceu ' + R.DB.skills.skills[sk].name + '!', 700);
              break;
            }
            target.status[e.status] = e.turns || 2;
            const lab = { sonolento: 'SONOLENTO', enraizado: 'ENRAIZADO', atordoado: 'ATORDOADO' }[e.status] || e.status.toUpperCase();
            this.popup(target, lab, '#c8a8ff');
            await this.wait(200);
            break;
          }
          case 'laco': this.addLaco(e.amount || 1); break;
          case 'taunt': u.status.provocando = e.turns || 2; this.popup(u, 'PROVOCANDO', R.THEME.emo.irritado); break;
          case 'cover': {
            target.status.protegido = { by: u, turns: e.turns || 2 };
            this.popup(target, 'PROTEGIDO', '#9ad4ff');
            break;
          }
          case 'counter': u.status.contra = e.turns || 1; this.popup(u, 'CONTRA-ATAQUE', '#9ad4ff'); break;
          case 'guardAll': this.guard = { side: u.side, mult: e.mult || 0.5 }; this.popup(u, 'VIGÍLIA', '#fff6b0'); break;
          case 'cleanse': target.buffs = target.buffs.filter((b) => b.mult > 1); delete target.status.sonolento; delete target.status.selado; delete target.status.enraizado; if (target.emotion.type === 'medo') target.emotion = E.none(); this.popup(target, 'LIMPO', R.THEME.good); break;
          case 'drainBr': {
            if (target.side !== 'party') break;
            const v = Math.min(target.br, e.amount || 5);
            target.br -= v;
            this.popup(target, '-' + v + ' BR', R.THEME.br);
            break;
          }
          case 'steal': {
            const snacks = R.Inventory.list('lanche');
            if (!snacks.length) { await this.say('...mas não achou nada para roubar.', 600); break; }
            const it = U.choice(snacks);
            R.Inventory.remove(it.id, 1);
            await this.say(u.name + ' roubou um ' + it.def.name + '!', 800);
            break;
          }
          case 'special': if (R.BattleAI.specials[e.id]) await R.BattleAI.specials[e.id](this, u, target, e, ctx); break;
          default: R.Log.warn('Efeito desconhecido ' + e.type);
        }
      }
      return out;
    }
    applyEmotion(target, type, steps, turns, silent) {
      const r = E.apply(target, type, steps, turns);
      if (r.changed) {
        const key = r.after.type || 'neutro';
        R.Audio.sfx({ feliz: 'emoHappy', triste: 'emoSad', irritado: 'emoAngry', medo: 'emoAfraid', neutro: 'emoCalm' }[key]);
        this.popup(target, r.after.type ? E.label(r.after) : 'CALMO', R.THEME.emo[key]);
        this.emoBurst(target, key);
        if (this.brain && this.brain.onEmotion) this.brain.onEmotion(target, r);
      } else if (!silent) this.popup(target, r.capped ? 'NO LIMITE' : 'SEM EFEITO', R.THEME.dim);
      if (!silent) this.msg2 = r.msg;
      return r;
    }
    calcDamage(u, t, power, e = {}) {
      const atk = u.stat('atq');
      const df = e.ignoreDef ? 0 : t.stat('def');
      let base = Math.max(atk * 2 - df, atk * 0.35);
      let dmg = base * power * U.rand(0.9, 1.1);
      const acc = (e.sureHit ? 1 : 0.95) * E.mods(u.emotion).acc;
      if (Math.random() > acc) return { miss: true };
      let crit = false;
      if (!e.noCrit && Math.random() < u.critChance()) { crit = true; dmg *= 1.5; }
      const adv = E.advantage(u.emotion, t.emotion);
      dmg *= adv > 0 ? E.ADV : adv < 0 ? E.DISADV : 1;
      if (this.brain && this.brain.modifyDamage) dmg = this.brain.modifyDamage(u, t, dmg, { adv, crit });
      return { dmg: Math.max(1, Math.round(dmg)), crit, adv };
    }
    async dealDamage(target, amount, info = {}) {
      // proteção (Abrigo)
      if (target.side === 'party' && target.status.protegido && target.status.protegido.by !== target && target.status.protegido.by.alive()) {
        const prot = target.status.protegido.by;
        this.popup(target, 'PROTEGIDO', '#9ad4ff');
        this.msg2 = prot.name + ' se pôs na frente de ' + target.name + '!';
        target = prot;
        amount = Math.round(amount * 0.75);
      }
      if (target.defending) amount = Math.round(amount * 0.5);
      if (this.guard && this.guard.side === target.side) amount = Math.round(amount * this.guard.mult);
      amount = Math.max(info.allowZero ? 0 : 1, amount);
      // TRISTE: parte do dano vai para o BRILHO
      const div = E.mods(target.emotion).divert;
      if (div > 0 && target.side === 'party' && target.br > 0) {
        const fromBr = Math.min(target.br, Math.round(amount * div));
        target.br -= fromBr;
        amount -= fromBr;
        if (fromBr > 0) this.popup(target, '-' + fromBr + ' BR', R.THEME.br, 0.2);
      }
      target.hp = Math.max(0, target.hp - amount);
      target.anim.flash = 1;
      target.anim.shake = 0.35;
      target.anim.hurt = 0.6;
      const col = info.crit ? '#ffd86b' : target.side === 'party' ? '#ff9aa8' : '#ffffff';
      this.popup(target, String(amount), col, 0, info.crit ? 'CRÍTICO!' : info.adv > 0 ? 'VANTAGEM!' : info.adv < 0 ? 'resistiu...' : null);
      R.Audio.sfx(info.crit ? 'crit' : target.side === 'party' ? 'hit' : 'enemyHit');
      if (info.crit || amount > target.mhp * 0.3) R.Screen.shake(info.crit ? 3 : 2, 0.25);
      if (info.crit && info.attacker && info.attacker.side === 'party') this.addLaco(1);
      if (target.side === 'party' && info.ctx && !info.ctx.lacoGiven) { info.ctx.lacoGiven = true; this.addLaco(1); }
      if (this.brain && this.brain.onDamaged) await this.brain.onDamaged(target, amount, info.attacker);
      if (target.hp <= 0) await this.knockout(target);
      // contra-ataque (Guarda-chuva Giratório)
      else if (target.status.contra && info.attacker && info.attacker.side !== target.side && info.attacker.alive() && !info.isCounter) {
        await this.wait(200);
        this.msg2 = target.name + ' contra-atacou!';
        const r = this.calcDamage(target, info.attacker, 0.8, { sureHit: true });
        await this.dealDamage(info.attacker, r.dmg, { attacker: target, isCounter: true });
      }
    }
    async knockout(u) {
      if (this.brain && this.brain.onKnockout) { const keep = await this.brain.onKnockout(u); if (keep) return; }
      if (u.side === 'party') {
        u.hp = 0;
        u.emotion = E.none();
        u.buffs = [];
        u.status = {};
        R.Audio.sfx('partyDown');
        await this.say(u.name + ' se APAGOU...', 700);
      } else {
        u.anim.dying = 0.01;
        R.Audio.sfx('enemyDie');
        this.ps.burst(u.slotX, u.slotY - 30, 24, { color: ['#fff6d0', '#c8b8f0', '#ffffff'], speed: 70, life: 0.9, gravity: -20 });
        this.msg2 = u.name + ' foi derrotado!';
        await this.wait(400);
      }
    }
    addLaco(n) { this.laco = U.clamp(this.laco + n, 0, LACO_MAX); }

    // ------------------------------------------------------- combos (LAÇO)
    followupOptions(u) {
      const list = (R.DB.skills.followups[u.id] || []).filter((f) => {
        const p = this.party.find((x) => x.id === f.with);
        return p && p.alive() && !p.status.enraizado && !p.status.atordoado;
      }).map((f) => Object.assign({ cost: 3 }, f));
      if (this.laco >= LACO_MAX && this.party.length === 4 && this.aliveParty().length === 4) list.push(Object.assign({}, R.DB.skills.allTogether, { all: true, cost: LACO_MAX }));
      return list;
    }
    async offerFollowup(u) {
      if (this.checkEnd() || this.laco < 3 || !u.alive()) return;
      const opts = this.followupOptions(u).filter((f) => this.laco >= f.cost);
      if (!opts.length) return;
      const pick = await this.menu(new R.BattleUI.FollowupMenu(this, u, opts));
      if (!pick || pick === 'back') return;
      await this.doFollowup(u, pick);
    }
    async doFollowup(u, f) {
      this.laco -= f.cost;
      R.Audio.sfx('followup');
      R.Screen.flash('#fff6d0', 0.35);
      if (f.all) return this.allTogether(u, f);
      const partner = this.party.find((x) => x.id === f.with);
      const reson = u.emotion.type && u.emotion.type !== 'medo' && u.emotion.type === partner.emotion.type;
      const mul = reson ? 1.5 : 1;
      this.msg = u.name + ' + ' + partner.name + ': ' + f.name.toUpperCase() + '!';
      this.msg2 = reson ? 'RESSONÂNCIA ' + E.LABEL[u.emotion.type][0] + '! (efeito x1.5)' : '';
      partner.anim.act = 1;
      await this.wait(350);
      let chosen = this.lastTarget && this.lastTarget.alive() ? this.lastTarget : null;
      const def = { target: f.target || 'foe', effects: f.effects };
      const targets = f.target === 'partner' ? [partner] : f.target === 'attacker' ? [u] : this.resolveTargets(f.useAttacker ? u : partner, def, chosen);
      await this.fx(f.fx || 'star', targets, partner);
      const ctx = { skill: f, user: partner, mul, lacoGiven: true };
      for (const t of targets) await this.applyEffects(f.useAttacker ? u : partner, t, f.effects, ctx);
      await this.wait(300);
    }
    async allTogether(u, f) {
      const P = this.aliveParty();
      const fams = new Set(P.map((p) => p.emotion.type).filter((x) => x && x !== 'medo'));
      const same = P.every((p) => p.emotion.type && p.emotion.type === P[0].emotion.type && p.emotion.type !== 'medo');
      this.msg = 'TODOS JUNTOS!';
      this.msg2 = same ? 'Em perfeita SINTONIA ' + E.LABEL[P[0].emotion.type][0] + '!' : fams.size >= 3 ? 'Três sentimentos, uma só luz!' : '';
      for (const p of P) p.anim.act = 1;
      R.Screen.shake(4, 0.5);
      await this.fx('alltogether', this.aliveEnemies(), u);
      const avgAtk = P.reduce((a, p) => a + p.stat('atq'), 0) / P.length;
      const pseudo = { stat: (k) => (k === 'atq' ? Math.round(avgAtk) : 10), emotion: same ? P[0].emotion : E.none(), critChance: () => 0.2, side: 'party' };
      const mul = (same ? 1.6 : 1) * (fams.size >= 3 ? 1.25 : 1);
      for (const t of this.aliveEnemies()) {
        const r = this.calcDamage(pseudo, t, (f.power || 2.2) * mul, { sureHit: true });
        await this.dealDamage(t, r.dmg, { crit: r.crit, attacker: u });
        if (same && t.alive()) this.applyEmotion(t, P[0].emotion.type, 1, null, true);
        await this.wait(120);
      }
      for (const p of P) { const h = Math.round(p.mhp * 0.15); p.hp = Math.min(p.mhp, p.hp + h); this.popup(p, '+' + h, R.THEME.good); }
      await this.wait(400);
    }

    // ------------------------------------------------------------ fim de rodada
    async roundEnd() {
      for (const u of this.units()) {
        u.defending = false;
        u.buffs = u.buffs.filter((b) => --b.turns > 0);
        for (const k of Object.keys(u.status)) {
          const s = u.status[k];
          if (typeof s === 'number') { u.status[k] = s - 1; if (u.status[k] <= 0) delete u.status[k]; }
          else if (s && typeof s === 'object') { s.turns--; if (s.turns <= 0) delete u.status[k]; }
        }
        if (u.alive()) { const m = E.tick(u); if (m) { this.msg2 = m; } }
      }
      this.guard = null;
      if (this.brain && this.brain.onRoundEnd) await this.brain.onRoundEnd();
    }

    // ------------------------------------------------------------------ fim
    async outro() {
      this.active = null;
      if (this.result === 'win') {
        R.Audio.playMusic(null, 100);
        R.Audio.sfx('victory');
        let exp = 0, money = 0;
        const drops = [];
        for (const e of this.enemies) {
          if (e.def.noReward) continue;
          exp += e.def.exp || 0;
          money += e.def.money || 0;
          for (const d of e.def.drops || []) if (Math.random() < d.chance) drops.push(d.item);
        }
        if (this.troop.exp) exp += this.troop.exp;
        if (this.troop.money) money += this.troop.money;
        this.writeBack();
        R.Inventory.addMoney(money);
        const got = [];
        for (const d of drops) if (R.Inventory.add(d, 1)) got.push(R.Inventory.name(d));
        const levels = [];
        for (const id of R.State.s.party) for (const ev of R.Party.gainExp(id, exp)) levels.push(ev);
        await this.menu(new R.BattleUI.VictoryPanel(this, { exp, money, items: got, levels }));
      } else if (this.result === 'flee') {
        this.writeBack();
      } else if (this.result === 'lose') {
        await this.say('A luz de todos se apagou...', 1200);
      }
      this.finish(this.result);
    }
    // grava VIDA/BRILHO de volta no estado (quem caiu volta com 1)
    writeBack() {
      for (const u of this.party) {
        const m = R.Party.member(u.id);
        m.hp = Math.max(1, u.hp);
        m.br = Math.max(0, u.br);
      }
      R.State.changed();
    }
    finish(result) {
      if (this.finished) return;
      this.finished = true;
      R.Scenes.pop(this, result || 'win');
    }
    debugWin() {
      for (const e of this.enemies) e.hp = 0;
      this.result = 'win';
      if (this.ui && this.uiResolve) { const r = this.uiResolve; this.ui = null; this.uiResolve = null; r('back'); }
    }
  }

  R.Battle = {
    current: null,
    Battle,
    Unit,
    BASIC,
    run(troopId, opts) {
      const troop = R.DB.enemies.troops[troopId];
      if (!troop) { R.Log.error('Tropa inexistente: ' + troopId); return Promise.resolve('win'); }
      return R.BattleUI.transition().then(() => R.Scenes.push(new Battle(troopId, opts)));
    },
  };
})();
