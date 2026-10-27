/* VAGALUME — interpretador de eventos. Scripts são listas de comandos JSON:
 *   ["say", "brisa:feliz", "Oi!", "Segunda fala"], ["if", cond, [então], [senão]],
 *   ["choice", ["Sim", [...]], ["Não", [...]]], ["give", "item", 2], ["battle", "tropa"], ...
 * Lista completa em README.md (seção "Comandos de evento"). */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;
  const STOP = { stop: true };

  // comandos que fecham a caixa de diálogo antes de executar
  const CLOSERS = { move: 1, teleport: 1, fade: 1, battle: 1, shop: 1, savepoint: 1, camera: 1, card: 1, credits: 1, ending: 1, title: 1, sleep: 1, menu: 1, scene: 1 };

  function resolveScript(s) {
    if (!s) return [];
    if (typeof s === 'string') {
      const sc = R.DB.dialogues.scripts[s];
      if (!sc) { R.Log.error('Script inexistente: ' + s); return [['say', '', '...']]; }
      return sc;
    }
    return s;
  }
  function ent(ctx, id) {
    if (id === 'self' || id === undefined) return ctx.self ? R.World.entity(ctx.self) : null;
    return R.World.entity(id);
  }
  function fmtItem(id, n) { return '{yellow}' + R.Inventory.name(id) + '{/}' + (n > 1 ? ' x' + n : ''); }

  // move entidade seguindo caminho "U2 L R3 face:down wait:300"
  async function walkPath(e, path, opts) {
    const toks = String(path).trim().split(/\s+/);
    const W = R.World;
    for (const tk of toks) {
      if (!tk) continue;
      if (tk.startsWith('face:')) { e.dir = tk.slice(5); continue; }
      if (tk.startsWith('wait:')) { await R.Clock.wait(+tk.slice(5)); continue; }
      const m = tk.match(/^([UDLR])(\d*)$/i);
      if (!m) continue;
      const dir = { U: 'up', D: 'down', L: 'left', R: 'right' }[m[1].toUpperCase()];
      const n = m[2] ? +m[2] : 1;
      for (let i = 0; i < n; i++) {
        const [dx, dy] = U.dirVec[dir];
        let waited = 0;
        while (!opts.through && !(e.isPlayer ? W.passable(e.x + dx, e.y + dy, e) : W.passable(e.x + dx, e.y + dy, e))) {
          e.dir = dir;
          await R.Clock.wait(100);
          waited += 100;
          if (waited > 1500) break;
        }
        if (waited > 1500) break;
        if (e.isPlayer) W.movePlayerTo(dir, opts.speed || 3.6);
        else e.startMove(dir, opts.speed || 3);
        await R.Clock.until(() => !e.moving);
      }
    }
  }

  const CMDS = {
    async say(c) {
      const spk = c[1];
      for (let i = 2; i < c.length; i++) await R.Dialogue.say(spk, c[i]);
    },
    async think(c) { for (let i = 1; i < c.length; i++) await R.Dialogue.say('think', c[i]); },
    async choice(c, ctx) {
      let opts = c.slice(1);
      let cancel;
      if (opts[0] && !Array.isArray(opts[0])) { cancel = opts[0].cancel; opts = opts.slice(1); }
      opts = opts.filter((o) => o[2] === undefined || R.Cond.test(o[2]));
      const idx = await R.Dialogue.choose(opts.map((o) => o[0]), cancel);
      await Events.exec(resolveScript(opts[idx][1]), ctx);
    },
    async if(c, ctx) {
      if (R.Cond.test(c[1])) await Events.exec(resolveScript(c[2]), ctx);
      else if (c[3]) await Events.exec(resolveScript(c[3]), ctx);
    },
    async random(c, ctx) { await Events.exec(resolveScript(U.choice(c.slice(1))), ctx); },
    async call(c, ctx) { await Events.exec(resolveScript(c[1]), ctx); },
    async end() { return STOP; },
    async flag(c) { R.State.setFlag(c[1], c[2] === undefined ? true : !!c[2]); },
    async unflag(c) { R.State.setFlag(c[1], false); },
    async var(c) {
      const [, k, op, v] = c;
      if (op === '+') R.State.addVar(k, v); else if (op === '-') R.State.addVar(k, -v); else R.State.setVar(k, v);
    },
    async phase(c) { R.State.setVar('phase', c[1]); },
    async give(c) {
      const id = c[1], n = c[2] || 1;
      const got = R.Inventory.add(id, n);
      R.Audio.sfx('item');
      if (c[3] === 'silent') return;
      if (got > 0) await R.Dialogue.say('', 'Você recebeu ' + fmtItem(id, got) + '!');
      else await R.Dialogue.say('', 'Você não consegue carregar mais ' + fmtItem(id, 1) + '.');
    },
    async take(c) { R.Inventory.remove(c[1], c[2] || 1); },
    async money(c) {
      R.Inventory.addMoney(c[1]);
      if (c[1] > 0) { R.Audio.sfx('coin'); if (c[2] !== 'silent') await R.Dialogue.say('', 'Você recebeu {yellow}' + c[1] + ' botões{/}!'); }
    },
    async quest(c) {
      const [, id, act] = c;
      if (act === 'start') R.Quests.start(id);
      else if (act === 'complete') R.Quests.complete(id);
      else if (act === 'fail') R.Quests.fail(id);
      else if (act && act.startsWith('step:')) R.Quests.completeStep(id, act.slice(5));
    },
    async join(c) {
      R.Party.join(c[1]);
      R.World.buildFollowersIfChanged();
      R.Audio.sfx('join');
      if (c[2] !== 'silent') await R.Dialogue.say('', '{yellow}' + R.Party.def(c[1]).name + '{/} entrou no grupo!');
    },
    async leave(c) { R.Party.leave(c[1]); R.World.buildFollowersIfChanged(); },
    async exp(c) {
      for (const pid of R.State.s.party) {
        for (const ev of R.Party.gainExp(pid, c[1])) {
          R.Audio.sfx('levelup');
          await R.Dialogue.say('', '{yellow}' + R.Party.def(ev.id).name + '{/} subiu para o nível ' + ev.level + '!');
        }
      }
    },
    async heal(c) {
      R.Party.healAll();
      R.Audio.sfx('heal');
      R.Screen.flash('#fff6d0', 0.4);
      if (c[1] !== 'silent') await R.Dialogue.say('', 'Todos recuperaram VIDA e BRILHO.');
    },
    async wait(c) { await R.Clock.wait(c[1] || 300); },
    async fade(c) {
      if (c[1] === 'out') await R.Screen.fadeOut(c[2] || 400, c[3] || '#000');
      else await R.Screen.fadeIn(c[2] || 400);
    },
    async flash(c) { R.Screen.flash(c[1] || '#fff', c[2] || 0.8); },
    async shake(c) { R.Screen.shake(c[1] || 3, (c[2] || 300) / 1000); },
    async glitch(c) { R.Glitch.trigger(c[1] || 300, c[2] || 1); R.Audio.sfx('glitch'); },
    async tint(c) { R.World.tint = c[1] || null; },
    async sfx(c) { R.Audio.sfx(c[1]); },
    async music(c) { R.Audio.playMusic(c[1] || null, c[2]); },
    async ambience(c) { R.Audio.playAmbience(c[1] || null); },
    async teleport(c) {
      const [, map, x, y, dir, fade] = c;
      await Events.transfer(map, x, y, dir, fade);
    },
    async move(c, ctx) {
      const e = ent(ctx, c[1]);
      if (!e) { R.Log.warn('move: entidade não encontrada ' + c[1]); return; }
      const opts = c[3] || {};
      e.scripted = true;
      const p = walkPath(e, c[2], opts).finally(() => { e.scripted = false; });
      if (!opts.nowait) await p;
    },
    async setpos(c, ctx) {
      const e = ent(ctx, c[1]);
      if (!e) return;
      e.place(c[2], c[3]);
      if (c[4]) e.dir = c[4];
      if (e.isPlayer) { R.World.followers.forEach((f) => { f.place(c[2], c[3]); f.dir = e.dir; }); R.World.snapCamera(); }
    },
    async face(c, ctx) { const e = ent(ctx, c[1]); if (e) e.dir = c[2]; },
    async faceplayer(c, ctx) {
      const e = ent(ctx, c[1]);
      const p = R.World.player;
      if (!e) return;
      const dx = p.x - e.x, dy = p.y - e.y;
      e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    },
    async emote(c, ctx) {
      const e = ent(ctx, c[1]);
      if (!e) return;
      e.emote = { kind: c[2], t: 0, life: (c[3] || 900) / 1000 };
      R.Audio.sfx(c[2] === '!' ? 'surprise' : 'pop');
      if (c[4] !== 'nowait') await R.Clock.wait(Math.min(700, c[3] || 900));
    },
    async show(c, ctx) { const e = ent(ctx, c[1]); if (e) { e.active = true; e.alpha = 1; e.fading = false; } },
    async hide(c, ctx) { const e = ent(ctx, c[1]); if (e) e.active = false; },
    async camera(c, ctx) {
      const W = R.World;
      if (c[1] === 'player' || c[1] === undefined) { W.cam.tx = null; W.cam.ty = null; await R.Clock.wait(c[2] || 400); return; }
      if (typeof c[1] === 'string') { const e = ent(ctx, c[1]); if (e) { W.cam.tx = e.px + 8 - R.W / 2; W.cam.ty = e.py + 8 - R.H / 2; } }
      else { W.cam.tx = c[1] * 16 + 8 - R.W / 2; W.cam.ty = c[2] * 16 + 8 - R.H / 2; }
      await R.Clock.wait(c[3] || 700);
    },
    async refresh() { R.World.refresh(); },
    async toast(c) { R.Toasts.push(c[1], c[2] || null); },
    async learn(c) { const m = R.Party.member(c[1]); if (m && !m.learned.includes(c[2])) { m.learned.push(c[2]); if (m.skills.length < R.Party.MAX_SKILLS) m.skills.push(c[2]); } },
    async light(c) { R.World.lightBoost = c[1] || 0; },
    async autosave() { R.Save.autosave(); },
    async cleared() { R.Settings.set('cleared', true); },
    async battle(c, ctx) {
      const troop = c[1];
      const opts = Object.assign({}, c[2] || {});
      const W = R.World;
      const snap = R.Save.snapshot();
      let res;
      for (;;) {
        res = await R.Battle.run(troop, opts);
        if (res === 'lose' && !opts.canLose) {
          const choice = await R.GameOver.show();
          if (choice === 'retry') { R.Save.restoreSnapshot(snap); continue; }
          return STOP;
        }
        break;
      }
      R.State.s.vars._battle = res;
      const eid = opts.enemyEntity;
      if (eid) {
        if (res === 'win') W.defeatEnemy(eid, opts.once);
        else { const e = W.entity(eid); if (e) e.stun = 3; }
      }
      W.invuln = 1.6;
      if (res === 'lose') R.Party.healAll();
    },
    async shop(c) { await R.Shop.open(c[1]); },
    async savepoint(c, ctx) {
      await R.Dialogue.say('', 'O lampião do Vô brilha, morno e paciente.');
      const idx = await R.Dialogue.choose(['Escrever no diário (salvar)', 'Sentar perto da luz (recuperar)', 'Deixar'], 2);
      if (idx === 0) { R.Dialogue.close(); await R.SaveMenu.open('save'); }
      else if (idx === 1) {
        R.Dialogue.close();
        await R.Screen.fadeOut(300, '#1a1020');
        R.Party.healAll();
        R.Audio.sfx('heal');
        await R.Clock.wait(300);
        await R.Screen.fadeIn(300);
        await R.Dialogue.say('', 'Todos recuperaram VIDA e BRILHO.');
      }
      void ctx;
    },
    async card(c) { await R.Card.show(c.slice(1)); },
    async vision(c) { R.Vision.show(c[1], c[2] || 160); await R.Clock.wait(c[2] || 160); },
    async credits() { await R.Credits.show(); },
    async title() { R.Title.goto(); return STOP; },
    async sleep(c) {
      await R.Screen.fadeOut(500);
      await R.Clock.wait(c[1] || 800);
      await R.Screen.fadeIn(500);
    },
    async menu(c) { await R.Menu.open(c[1]); },
    async chest(c, ctx) {
      const e = ent(ctx);
      if (!e) return;
      const f = e.chestFlag();
      if (R.State.flag(f)) { await R.Dialogue.say('', e.cur.emptyText || 'Está vazio.'); return; }
      R.Audio.sfx('chest');
      R.State.setFlag(f);
      e.cur.variant = 1;
      if (e.cur.money) await CMDS.money(['money', e.cur.money]);
      const items = e.cur.items || (e.cur.item ? { [e.cur.item]: e.cur.qty || 1 } : {});
      for (const id in items) await CMDS.give(['give', id, items[id]]);
      if (e.cur.after) await Events.exec(resolveScript(e.cur.after), ctx);
    },
    async door(c, ctx) {
      const e = ent(ctx);
      if (!e) return;
      const d = e.cur;
      if (d.lockedIf && R.Cond.test(d.lockedIf)) {
        R.Audio.sfx('locked');
        if (d.lockedScript) await Events.exec(resolveScript(d.lockedScript), ctx);
        else await R.Dialogue.say('', d.lockedText || 'Está trancado.');
        // recua um passo se entrou no tile
        const p = R.World.player;
        if (!p.moving && e.occupies(p.x, p.y)) await walkPath(p, { up: 'D', down: 'U', left: 'R', right: 'L' }[p.dir], { through: true });
        return;
      }
      if (d.enterScript) { await Events.exec(resolveScript(d.enterScript), ctx); if (d.enterScriptOnly) return; }
      R.Audio.sfx(d.sfx || 'door');
      await Events.transfer(d.to, d.tx, d.ty, d.tdir || 'down');
    },
  };
  CMDS.unless = async (c, ctx) => { if (!R.Cond.test(c[1])) await Events.exec(resolveScript(c[2]), ctx); };

  const Events = (R.Events = {
    running: 0,
    CMDS,
    busy() { return this.running > 0; },
    // abandona scripts em andamento (ao voltar ao título ou carregar)
    reset() { this.running = 0; this.pendingAutosave = false; R.Dialogue.scene = null; },
    async run(script, ctx = {}) {
      const cmds = resolveScript(script);
      this.running++;
      try {
        await this.exec(cmds, ctx);
      } catch (e) {
        if (e !== STOP) R.Errors.report(e, 'evento');
      } finally {
        this.running--;
        if (this.running === 0) {
          R.Dialogue.close();
          if (R.World.map) R.World.refreshPending = true;
          if (this.pendingAutosave) { this.pendingAutosave = false; R.Save.autosave(); }
        }
      }
    },
    async exec(cmds, ctx) {
      for (let i = 0; i < cmds.length; i++) {
        const c = cmds[i];
        if (!Array.isArray(c)) continue;
        const fn = CMDS[c[0]];
        if (!fn) { R.Log.warn('Comando de evento desconhecido: ' + c[0]); continue; }
        if (CLOSERS[c[0]] && R.Dialogue.isOpen()) R.Dialogue.close();
        const r = await fn(c, ctx);
        if (r === STOP) throw STOP;
      }
    },
    runEntity(e) {
      const c = e.cur;
      let script;
      if (e.type === 'chest') script = [['chest']];
      else if (e.type === 'save') script = c.script ? resolveScript(c.script).concat([['savepoint']]) : [['savepoint']];
      else if (e.type === 'door' || (e.type === 'building' && c.to)) script = [['door']];
      else if (c.script) script = resolveScript(c.script);
      else if (c.text) script = [['say', c.speaker || ''].concat(Array.isArray(c.text) ? c.text : [c.text])];
      if (!script) return;
      if (c.once) { const f = 'visto_' + R.World.map.id + '_' + e.id; if (R.State.flag(f)) return; R.State.setFlag(f); }
      return this.run(script, { self: e.id });
    },
    checkAuto() {
      const W = R.World;
      for (const e of W.entities) {
        if (!e.active || e.autoRan || e.cur.trigger !== 'auto') continue;
        e.autoRan = true;
        this.runEntity(e);
        return;
      }
    },
    // troca de mapa com transição
    async transfer(map, x, y, dir, fade) {
      const W = R.World;
      if (fade !== 'none') await R.Screen.fadeOut(fade === 'slow' ? 700 : 220, fade === 'white' ? '#fff' : '#000');
      W.load(map, x, y, dir || W.player.dir);
      await R.Clock.nextFrame();
      if (fade !== 'none') R.Screen.fadeIn(fade === 'slow' ? 700 : 220);
      if (W.map.def.safe && R.Settings.get('autosave')) this.pendingAutosave = true;
    },
  });
  void STOP;
})();
