/* VAGALUME — mundo: mapas, entidades (com páginas condicionais), movimento em grade,
 * colisões, câmera, portas, seguidores, inimigos visíveis, luz e cena de exploração. */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;
  const T = R.TILE;

  const GRASSY = { grass: 1, flowers: 1, tallgrass: 1, tree: 1, bush: 1, rock: 1, fence: 1, stump: 1, mushroom: 1, hedge: 1, invisible: 1 };

  // ================================================================== mapa
  class GameMap {
    constructor(id) {
      const def = R.DB.maps.maps[id];
      if (!def) throw new Error('Mapa inexistente: ' + id);
      this.id = id;
      this.def = def;
      this.interior = def.interior || null;
      this.theme = def.theme || (this.interior ? null : 'vila');
      const base = this.interior ? R.DB.maps.legendInterior : R.DB.maps.legendExterior;
      this.legend = Object.assign({}, base, def.legend || {});
      const rows = def.layout;
      this.h = rows.length;
      this.w = rows.reduce((m, r) => Math.max(m, r.length), 0);
      this.tiles = new Array(this.w * this.h);
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const ch = rows[y][x] === undefined ? ' ' : rows[y][x];
          let e = this.legend[ch];
          if (e === undefined) { R.Log.warn('Caractere sem legenda "' + ch + '" em ' + id); e = 'void'; }
          if (typeof e === 'string') e = { t: e };
          const info = R.Tiles.TYPES[e.t] || { solid: true };
          this.tiles[y * this.w + x] = { t: e.t, c: e.c, solid: e.solid !== undefined ? e.solid : !!info.solid, counter: !!info.counter, object: info.object, ch };
        }
      this.anim = [];
      this.objects = [];
      this.buildGround();
    }
    tile(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.tiles[y * this.w + x];
    }
    tt(x, y) { const t = this.tile(x, y); return t ? t.t : 'void'; }
    variantAt(x, y) { return Math.floor(U.hash2(x, y, 7) * 8); }
    maskOf(x, y, test) {
      let m = 0;
      if (test(this.tt(x, y - 1), 0, -1)) m |= 1;
      if (test(this.tt(x + 1, y), 1, 0)) m |= 2;
      if (test(this.tt(x, y + 1), 0, 1)) m |= 4;
      if (test(this.tt(x - 1, y), -1, 0)) m |= 8;
      return m;
    }
    groundCanvas(x, y, frame) {
      const t = this.tile(x, y);
      const v = this.variantAt(x, y);
      const th = this.theme, ii = this.interior;
      let mask = 0, extra = t.c;
      switch (t.t) {
        case 'water': mask = this.maskOf(x, y, (n) => n === 'water' || n === 'bridge' || n === 'void'); break;
        case 'bridge': mask = this.maskOf(x, y, (n) => n === 'bridge' || n === 'path' || n === 'stone' || GRASSY[n]); break;
        case 'path': case 'stone': mask = this.maskOf(x, y, (n) => !GRASSY[n]); break;
        case 'rug': mask = this.maskOf(x, y, (n) => n === 'rug'); break;
        case 'cliff': {
          const below = this.tt(x, y + 1);
          extra = below === 'cliff' || below === 'void' ? 'top' : null;
          mask = this.maskOf(x, y, (n) => n === 'cliff' || n === 'void');
          break;
        }
        case 'wall': {
          const wl = (n) => n === 'wall' || n === 'void';
          const b1 = this.tt(x, y + 1), b2 = this.tt(x, y + 2);
          if (!wl(b1)) extra = 'lower';
          else if (b1 === 'wall' && !wl(b2) && this.tt(x, y - 1) !== 'void') extra = 'upper';
          else extra = 'top';
          mask = this.maskOf(x, y, wl);
          break;
        }
        default: break;
      }
      return R.Tiles.ground(t.t, th, ii, v, mask, frame || 0, extra);
    }
    buildGround() {
      const c = document.createElement('canvas');
      c.width = this.w * T; c.height = this.h * T;
      const g = c.getContext('2d');
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const t = this.tile(x, y);
          g.drawImage(this.groundCanvas(x, y, 0), x * T, y * T);
          if (R.Tiles.TYPES[t.t] && R.Tiles.TYPES[t.t].anim) this.anim.push([x, y]);
          if (t.object) this.objects.push({ kind: t.object, x, y, v: this.variantAt(x, y) });
        }
      this.ground = c;
    }
  }

  // ================================================================ entidade
  const TYPE_DEFAULTS = {
    npc: { solid: true, trigger: 'action' },
    obj: { trigger: 'action' },
    chest: { prop: 'bau', solid: true, trigger: 'action' },
    save: { prop: 'lampiao', solid: true, trigger: 'action' },
    building: { solid: true, trigger: 'none' },
    door: { solid: false, trigger: 'touch' },
    trigger: { solid: false, trigger: 'touch' },
    enemy: { solid: false, trigger: 'none' },
    boulder: { prop: 'pedregulho', solid: true, trigger: 'none' },
    plate: { prop: 'placa_pressao', solid: false, trigger: 'none' },
    light: { solid: false, trigger: 'none' },
    deco: { solid: true, trigger: 'none' },
  };

  class Entity {
    constructor(def) {
      this.def = def;
      this.id = def.id;
      this.type = def.type || 'npc';
      this.dir = def.dir || 'down';
      this.place(def.x || 0, def.y || 0);
      this.cur = {};
      this.active = true;
      this.pageIndex = -2;
      this.step = 0;
      this.animT = 0;
      this.moveT = U.rand(0.5, 2.5);
      this.emote = null;
      this.speed = def.speed || 3;
      this.alpha = 1;
    }
    place(x, y) {
      this.x = x; this.y = y; this.fx = x; this.fy = y;
      this.px = x * T; this.py = y * T;
      this.moving = false; this.mt = 1;
    }
    // escolhe a página ativa; devolve true se mudou
    resolve() {
      const def = this.def;
      let page = null, idx = -1;
      if (def.pages) {
        idx = def.pages.findIndex((p) => R.Cond.test(p.cond));
        page = idx >= 0 ? def.pages[idx] : null;
        if (idx < 0) { const ch = this.pageIndex !== -1; this.pageIndex = -1; this.active = false; return ch; }
      } else if (def.cond !== undefined && !R.Cond.test(def.cond)) {
        const ch = this.pageIndex !== -1; this.pageIndex = -1; this.active = false; return ch;
      }
      const changed = idx !== this.pageIndex;
      this.pageIndex = idx;
      const base = Object.assign({}, TYPE_DEFAULTS[this.type] || {}, def);
      delete base.pages;
      const cur = Object.assign(base, page || {});
      if (cur.variantVar) cur.variant = R.State.v(cur.variantVar);
      if (cur.variantFlag) cur.variant = R.State.flag(cur.variantFlag) ? 1 : 0;
      if (this.type === 'chest' && R.State.flag(this.chestFlag())) cur.variant = 1;
      if (cur.prop && cur.solid === undefined) {
        const pd = R.Tiles.PROPS[cur.prop];
        cur.solid = pd ? pd.solid !== false && pd.foot[0] > 0 : true;
      }
      if (cur.prop && !cur.foot) {
        const pd = R.Tiles.PROPS[cur.prop];
        cur.foot = pd ? [Math.max(1, pd.foot[0]), Math.max(1, pd.foot[1])] : [1, 1];
      }
      this.cur = cur;
      this.active = !cur.hidden;
      if (this.type === 'enemy' && R.World.map && (R.State.flag('derrotado_' + R.World.map.id + '_' + this.id) || R.World.session.defeated[this.id])) this.active = false;
      if (changed && page && (page.x !== undefined || page.y !== undefined) && !this.moving) this.place(page.x !== undefined ? page.x : this.x, page.y !== undefined ? page.y : this.y);
      if (changed && page && page.dir) this.dir = page.dir;
      if (changed) this.autoRan = false;
      if (cur.speed) this.speed = cur.speed;
      return changed;
    }
    chestFlag() { return this.def.flag || 'bau_' + R.World.map.id + '_' + this.id; }
    footprint() {
      const c = this.cur;
      if (this.type === 'building') return [c.w, c.h];
      if (c.foot) return c.foot;
      if (this.type === 'trigger' || this.type === 'door') return [c.w || 1, c.h || 1];
      return [1, 1];
    }
    occupies(x, y) {
      if (!this.active) return false;
      const [fw, fh] = this.footprint();
      return x >= this.x && x < this.x + fw && y >= this.y && y < this.y + fh;
    }
    isSolidAt(x, y) {
      if (!this.active || !this.cur.solid) return false;
      if (!this.occupies(x, y)) return false;
      if (this.type === 'building') {
        const c = this.cur;
        const door = c.door === undefined ? Math.floor(c.w / 2) : c.door;
        if (y === this.y + c.h - 1 && x === this.x + door && c.to) return false;
      }
      return true;
    }
    // inicia movimento para tile adjacente (sem checar colisão)
    startMove(dir, speed) {
      const [dx, dy] = U.dirVec[dir];
      this.dir = dir;
      this.fx = this.x; this.fy = this.y;
      this.x += dx; this.y += dy;
      this.moving = true;
      this.mt = 0;
      this.curSpeed = speed || this.speed;
    }
    update(dt) {
      if (this.moving) {
        this.mt += dt * this.curSpeed;
        if (this.mt >= 1) { this.mt = 1; this.moving = false; this.step++; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); } }
        this.px = U.lerp(this.fx * T, this.x * T, this.mt);
        this.py = U.lerp(this.fy * T, this.y * T, this.mt);
        this.animT += dt * this.curSpeed * 2;
      } else {
        this.px = this.x * T; this.py = this.y * T;
      }
      if (this.emote) { this.emote.t += dt; if (this.emote.t > this.emote.life) this.emote = null; }
    }
    walkFrame() {
      if (!this.moving && !this.forceWalk) return 0;
      return [1, 0, 2, 0][(Math.floor(this.animT) + this.step * 2) % 4];
    }
    sortY() {
      if (this.type === 'building') return (this.y + this.cur.h) * T;
      const fp = this.footprint();
      if (this.cur.floor) return -1e6;
      if (this.cur.prop && R.Tiles.PROPS[this.cur.prop] && R.Tiles.PROPS[this.cur.prop].wall) return this.y * T - 1000;
      return this.py + fp[1] * T - 0.5;
    }
    interactable() {
      if (!this.active) return false;
      const c = this.cur;
      if (c.trigger === 'none' || c.trigger === 'touch' || c.trigger === 'auto') return false;
      return !!(c.script || c.text || this.type === 'chest' || this.type === 'save');
    }
  }

  // ============================================================== mundo
  const World = (R.World = {
    map: null,
    entities: [],
    player: null,
    followers: [],
    cam: { x: 0, y: 0, tx: null, ty: null },
    ambient: null,
    banner: null,
    invuln: 0,
    session: { defeated: {} },
    refreshPending: false,
    tint: null,
    vars: {},
    lightBoost: 0,

    // ---------------------------------------------------------- carregamento
    load(mapId, x, y, dir) {
      const prevRegion = this.map && this.map.def.name;
      this.map = new GameMap(mapId);
      const s = R.State.s;
      s.mapId = mapId;
      s.x = x; s.y = y; s.dir = dir || s.dir;
      s.visited[mapId] = true;
      this.session.defeated = {};
      this.entities = (this.map.def.entities || []).map((d, i) => {
        const e = new Entity(Object.assign({ id: d.id || d.type + '_' + i }, d));
        return e;
      });
      for (const e of this.entities) e.resolve();
      // pedras de enigma já resolvido ficam sobre as placas
      for (const e of this.entities) if (e.type === 'boulder' && e.def.solved && R.State.flag(e.def.solved[2])) e.place(e.def.solved[0], e.def.solved[1]);
      this.player = new Entity({ id: 'player', type: 'npc', x, y, dir: dir || 'down', sprite: s.party[0] });
      this.player.cur = { sprite: s.party[0], solid: true };
      this.player.isPlayer = true;
      this.buildFollowers();
      this.applyVariant();
      this.snapCamera();
      if (this.map.def.name && this.map.def.name !== prevRegion) this.banner = { text: this.map.def.name, t: 0 };
      this.invuln = 1.2;
      R.Bus.emit('map-loaded', mapId);
    },
    buildFollowers() {
      const s = R.State.s;
      this.followers = s.party.slice(1).map((id, i) => {
        const f = new Entity({ id: 'follower_' + i, type: 'npc', x: this.player.x, y: this.player.y, dir: this.player.dir, sprite: id });
        f.cur = { sprite: id, solid: false };
        return f;
      });
      this.player.cur.sprite = s.party[0];
    },
    // configuração do mapa conforme condições (noite, escuridão, música...)
    applyVariant() {
      const def = this.map.def;
      const v = Object.assign({ dark: 0, music: null, particles: null, tint: null, glitch: 0, ambientSound: null }, def);
      if (def.variants) for (const vr of def.variants) if (R.Cond.test(vr.cond)) Object.assign(v, vr);
      this.mapCfg = v;
      if (!this.ambient || this.ambient.kind !== v.particles) this.ambient = new R.Ambient(v.particles);
      this.tint = v.tint;
      if (R.Audio) {
        R.Audio.playMusic(v.music === undefined ? null : v.music);
        R.Audio.playAmbience(v.ambientSound || null);
      }
    },
    refresh() {
      if (!this.map) return;
      const prevCfg = this.mapCfg ? JSON.stringify([this.mapCfg.music, this.mapCfg.dark, this.mapCfg.particles, this.mapCfg.tint]) : '';
      for (const e of this.entities) e.resolve();
      this.buildFollowersIfChanged();
      const def = this.map.def;
      if (def.variants) {
        const v = Object.assign({ dark: 0, music: null, particles: null, tint: null }, def);
        for (const vr of def.variants) if (R.Cond.test(vr.cond)) Object.assign(v, vr);
        const now = JSON.stringify([v.music, v.dark, v.particles, v.tint]);
        if (now !== prevCfg) this.applyVariant();
      }
    },
    buildFollowersIfChanged() {
      const ids = R.State.s.party.slice(1).join(',');
      const cur = this.followers.map((f) => f.cur.sprite).join(',');
      if (ids !== cur || this.player.cur.sprite !== R.State.s.party[0]) {
        const old = this.followers;
        this.buildFollowers();
        // mantém posições de quem já estava
        this.followers.forEach((f, i) => { if (old[i]) { f.place(old[i].x, old[i].y); f.dir = old[i].dir; } });
      }
    },
    entity(id) {
      if (id === 'player') return this.player;
      return this.entities.find((e) => e.id === id) || this.followers.find((f) => f.cur.sprite === id) || null;
    },

    // ------------------------------------------------------------ colisão
    passable(x, y, mover) {
      const m = this.map;
      const t = m.tile(x, y);
      if (!t || t.solid) return false;
      for (const e of this.entities) {
        if (e === mover) continue;
        if (e.isSolidAt(x, y)) return false;
      }
      if (mover !== this.player && this.player.x === x && this.player.y === y) return false;
      return true;
    },
    entitiesAt(x, y) { return this.entities.filter((e) => e.active && e.occupies(x, y)); },

    // ----------------------------------------------------------- câmera
    snapCamera() { this.updateCamera(1000); },
    updateCamera(dt) {
      const m = this.map;
      const W = m.w * T, H = m.h * T;
      let tx = this.cam.tx !== null && this.cam.tx !== undefined ? this.cam.tx : this.player.px + 8 - R.W / 2;
      let ty = this.cam.ty !== null && this.cam.ty !== undefined ? this.cam.ty : this.player.py + 8 - R.H / 2;
      tx = W <= R.W ? (W - R.W) / 2 : U.clamp(tx, 0, W - R.W);
      ty = H <= R.H ? (H - R.H) / 2 : U.clamp(ty, 0, H - R.H);
      if (this.cam.tx !== null && this.cam.tx !== undefined) {
        const k = Math.min(1, dt * 4);
        this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
      } else { this.cam.x = tx; this.cam.y = ty; }
    },

    // --------------------------------------------------------- jogador
    tryMovePlayer(dir, run) {
      const p = this.player;
      p.dir = dir;
      const [dx, dy] = U.dirVec[dir];
      const nx = p.x + dx, ny = p.y + dy;
      // empurrar pedra
      const boulder = this.entities.find((e) => e.active && e.type === 'boulder' && e.x === nx && e.y === ny);
      if (boulder) {
        if (boulder.moving) return false;
        const bx = nx + dx, by = ny + dy;
        if (this.passable(bx, by, boulder) && !this.entities.some((e) => e.active && e.type === 'enemy' && e.x === bx && e.y === by)) {
          boulder.startMove(dir, 3.2);
          boulder.onArrive = () => this.checkPlates();
          if (R.Audio) R.Audio.sfx('push');
          this.movePlayerTo(dir, 3.2);
          return true;
        }
        if (R.Audio) R.Audio.sfx('bump');
        return false;
      }
      if (!this.passable(nx, ny, p)) {
        // tocar em entidade sólida com gatilho de toque (ex.: porta trancada)
        const touch = this.entitiesAt(nx, ny).find((e) => e.cur.trigger === 'touch' && (e.cur.script || e.cur.text || e.type === 'door'));
        if (touch) { R.Events.runEntity(touch); return false; }
        this.bumpT = (this.bumpT || 0);
        if (this.bumpT <= 0) { if (R.Audio) R.Audio.sfx('bump'); this.bumpT = 0.35; }
        return false;
      }
      this.movePlayerTo(dir, run ? 7 : 4.4);
      return true;
    },
    movePlayerTo(dir, speed) {
      const p = this.player;
      // seguidores: cada um vai para onde estava o da frente
      const chain = [p].concat(this.followers);
      for (let i = chain.length - 1; i >= 1; i--) {
        const f = chain[i], lead = chain[i - 1];
        if (f.x === lead.x && f.y === lead.y) continue;
        const ddx = lead.x - f.x, ddy = lead.y - f.y;
        const fdir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up');
        f.dir = fdir;
        f.fx = f.x; f.fy = f.y; f.x = lead.x; f.y = lead.y;
        f.moving = true; f.mt = 0; f.curSpeed = speed;
      }
      p.startMove(dir, speed);
      p.onArrive = () => this.onPlayerArrive();
      if (R.Audio && p.step % 2 === 0) R.Audio.footstep(this.map.tt(p.x, p.y));
    },
    onPlayerArrive() {
      const p = this.player;
      R.State.s.x = p.x; R.State.s.y = p.y; R.State.s.dir = p.dir;
      // gatilhos de toque
      for (const e of this.entitiesAt(p.x, p.y)) {
        if (e.cur.trigger === 'touch' && (e.cur.script || e.cur.text || e.type === 'door')) { R.Events.runEntity(e); return; }
      }
      // porta de construção
      for (const e of this.entities) {
        if (!e.active || e.type !== 'building' || !e.cur.to) continue;
        const c = e.cur;
        const door = c.door === undefined ? Math.floor(c.w / 2) : c.door;
        if (p.x === e.x + door && p.y === e.y + c.h - 1) { R.Events.runEntity(e); return; }
      }
    },
    facingTile() {
      const [dx, dy] = U.dirVec[this.player.dir];
      return [this.player.x + dx, this.player.y + dy];
    },
    // entidade com a qual o jogador pode interagir agora
    facingEntity() {
      let [fx, fy] = this.facingTile();
      let list = this.entitiesAt(fx, fy).filter((e) => e.interactable());
      if (!list.length) {
        const t = this.map.tile(fx, fy);
        if (t && t.counter) {
          const [dx, dy] = U.dirVec[this.player.dir];
          fx += dx; fy += dy;
          list = this.entitiesAt(fx, fy).filter((e) => e.interactable());
        }
      }
      return list[0] || null;
    },
    interact() {
      const e = this.facingEntity();
      if (!e) return false;
      if (e.type === 'npc' && !e.cur.noTurn) e.dir = U.opposite[this.player.dir];
      R.Events.runEntity(e);
      return true;
    },
    checkPlates() {
      const groups = {};
      for (const e of this.entities) {
        if (!e.active || e.type !== 'plate') continue;
        const pressed = this.entities.some((b) => b.active && b.type === 'boulder' && b.x === e.x && b.y === e.y && !b.moving);
        const was = e.cur.variant === 1;
        e.cur.variant = pressed ? 1 : 0;
        if (pressed && !was && R.Audio) R.Audio.sfx('click');
        const g = e.def.group || 'main';
        groups[g] = groups[g] || { all: true };
        if (!pressed) groups[g].all = false;
      }
      const puzzles = this.map.def.puzzles || {};
      for (const g in groups) {
        const pz = puzzles[g];
        if (pz && groups[g].all && !R.State.flag(pz.flag)) {
          R.State.setFlag(pz.flag);
          if (pz.script) R.Events.run(pz.script, { self: null });
          else if (R.Audio) R.Audio.sfx('solve');
        }
      }
    },

    // ------------------------------------------------- IA de NPCs e inimigos
    updateAI(dt) {
      const p = this.player;
      for (const e of this.entities) {
        if (!e.active || e.moving || e.scripted) continue;
        const mv = e.cur.move;
        if (e.type === 'enemy') { this.enemyAI(e, dt); continue; }
        if (!mv || mv === 'static') continue;
        e.moveT -= dt;
        if (e.moveT > 0) continue;
        if (mv === 'look') { e.dir = U.choice(['up', 'down', 'left', 'right']); e.moveT = U.rand(1.5, 4); continue; }
        if (mv === 'wander') {
          e.moveT = U.rand(1.2, 3.5);
          const d = U.choice(['up', 'down', 'left', 'right']);
          const [dx, dy] = U.dirVec[d];
          const nx = e.x + dx, ny = e.y + dy;
          const r = e.cur.radius || 2;
          if (Math.abs(nx - e.def.x) <= r && Math.abs(ny - e.def.y) <= r && this.passable(nx, ny, e) && !this.isTriggerTile(nx, ny)) e.startMove(d, 2.2);
          else e.dir = d;
        }
        if (mv === 'watcher') {
          const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
          if (dist <= (e.cur.radius || 5) && !e.fading) {
            e.fading = true;
            if (e.cur.flag) R.State.setFlag(e.cur.flag);
          }
          e.moveT = 0.1;
        }
      }
      for (const e of this.entities) if (e.fading) { e.alpha = Math.max(0, e.alpha - dt * 1.5); if (e.alpha <= 0) e.active = false; }
    },
    isTriggerTile(x, y) {
      return this.entities.some((e) => e.active && (e.type === 'door' || e.type === 'trigger') && e.occupies(x, y));
    },
    enemyAI(e, dt) {
      if (R.Events.busy()) return;
      if (e.stun > 0) { e.stun -= dt; return; }
      const p = this.player;
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.abs(dx) + Math.abs(dy);
      const mode = e.cur.move || 'wander';
      e.moveT -= dt;
      if (e.moveT > 0) return;
      const tryDir = (d, speed) => {
        const [vx, vy] = U.dirVec[d];
        const nx = e.x + vx, ny = e.y + vy;
        const t = this.map.tile(nx, ny);
        if (!t || t.solid || this.isTriggerTile(nx, ny)) return false;
        if (this.entities.some((o) => o !== e && o.isSolidAt(nx, ny))) return false;
        if (this.entities.some((o) => o !== e && o.type === 'enemy' && o.active && o.x === nx && o.y === ny)) return false;
        e.startMove(d, speed);
        return true;
      };
      const toward = () => {
        const a = Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 'right' : 'left', dy > 0 ? 'down' : 'up'] : [dy > 0 ? 'down' : 'up', dx > 0 ? 'right' : 'left'];
        return a;
      };
      if (mode === 'creep') {
        // só se move quando o jogador está de costas
        const [fx, fy] = U.dirVec[p.dir];
        const looking = fx * (e.x - p.x) + fy * (e.y - p.y) > 0;
        e.moveT = 0.55;
        if (!looking && dist <= 9) { for (const d of toward()) if (tryDir(d, 3.5)) break; }
        return;
      }
      if (mode === 'chase' && dist <= (e.cur.sight || 5)) {
        e.moveT = e.cur.chaseDelay || 0.28;
        for (const d of toward()) if (tryDir(d, e.cur.chaseSpeed || 4.2)) break;
        e.alert = true;
        return;
      }
      e.alert = false;
      if (mode === 'static') { e.moveT = 1; return; }
      e.moveT = U.rand(0.8, 2.2);
      const d = U.choice(['up', 'down', 'left', 'right']);
      const [vx, vy] = U.dirVec[d];
      const r = e.cur.radius || 3;
      if (Math.abs(e.x + vx - e.def.x) <= r && Math.abs(e.y + vy - e.def.y) <= r) tryDir(d, 2);
    },
    checkEnemyContact() {
      if (this.invuln > 0 || R.Events.busy()) return;
      const p = this.player;
      for (const e of this.entities) {
        if (!e.active || e.type !== 'enemy' || e.stun > 0 || this.session.defeated[e.id]) continue;
        if (Math.abs(e.px - p.px) < 11 && Math.abs(e.py - p.py) < 11) {
          R.Events.run([['battle', e.cur.troop, Object.assign({ enemyEntity: e.id }, e.cur.battleOpts || {})]], { self: e.id });
          return;
        }
      }
    },
    defeatEnemy(id, permanent) {
      const e = this.entity(id);
      if (!e) return;
      this.session.defeated[id] = true;
      e.active = false;
      if (permanent || e.cur.once) R.State.setFlag('derrotado_' + this.map.id + '_' + id);
    },

    // ------------------------------------------------------------- luzes
    lights() {
      const out = [];
      const cam = this.cam;
      const t = R.Clock.time;
      const cfg = this.mapCfg;
      const embers = ['brasa_floresta', 'brasa_aguas', 'brasa_esquecida'].filter((i) => R.Inventory.has(i)).length;
      const lr = (cfg.lantern !== undefined ? cfg.lantern : 46) + embers * 12 + this.lightBoost;
      if (lr > 0) out.push({ x: this.player.px + 8 - cam.x, y: this.player.py + 4 - cam.y, r: lr + Math.sin(t * 7) * 1.5, glow: 'rgba(255,190,90,0.18)' });
      for (const e of this.entities) {
        if (!e.active) continue;
        let r = e.cur.light;
        const pd = e.cur.prop && R.Tiles.PROPS[e.cur.prop];
        if (!r && pd) r = pd.light || (pd.lightIfVariant && e.cur.variant ? pd.lightIfVariant : 0);
        if (e.type === 'building' && (e.cur.variant === 'lit' || e.cur.variant === 'night')) r = 56;
        if (!r) continue;
        const [fw] = e.footprint();
        let lx = e.px + fw * 8, ly = e.py + 2;
        if (e.type === 'building') { lx = e.px + e.cur.w * 8; ly = e.py + e.cur.h * T - 18; }
        if (e.cur.prop === 'poste' || e.cur.prop === 'poste_rua') ly = e.py - 14;
        if (e.cur.light && e.type === 'light') { lx = e.px + 8; ly = e.py + 8; }
        out.push({ x: lx - cam.x, y: ly - cam.y, r: r + Math.sin(t * 5 + e.x) * 1.2, glow: e.cur.glow || 'rgba(255,200,120,0.14)' });
      }
      return out;
    },
  });

  // ======================================================= desenho do mundo
  const Draw = {
    entity(ctx, e, cam) {
      if (!e.active || e.alpha <= 0) return;
      const c = e.cur;
      const x = Math.round(e.px - cam.x), y = Math.round(e.py - cam.y);
      if (e.alpha < 1) ctx.globalAlpha = e.alpha;
      if (e.type === 'building') {
        const frame = c.style === 'branco' ? Math.floor(R.Clock.time * 6) % 3 : 0;
        const cv = R.Tiles.building({ style: c.style, w: c.w, h: c.h, door: c.door, variant: c.variant, number: c.number, girl: c.girl, theme: c.theme }, frame);
        ctx.drawImage(cv, x, y - (cv._oy || 0));
      } else if (c.sprite) {
        const sh = R.Art.sheet(c.sprite);
        const fr = sh.frames[e.dir][e.walkFrame()];
        let bob = 0;
        if (c.bob) bob = Math.round(Math.sin(R.Clock.time * 3 + e.x) * 1);
        if (!c.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 3, y + 14, 10, 2); }
        ctx.drawImage(fr, x, y - 8 + bob);
      } else if (e.type === 'enemy' || c.esprite) {
        const cv = c.big ? R.Art.enemy(c.esprite, 0, c.variant || '') : R.Art.enemyMini(c.esprite || 'pirulinho');
        const bob = Math.round(Math.sin(R.Clock.time * 4 + e.x * 2) * 1.5);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        if (e.type === 'enemy') ctx.fillRect(x + 2, y + 13, 12, 3);
        const fw0 = e.footprint()[0];
        if (e.stun > 0 && Math.floor(R.Clock.time * 10) % 2) { /* pisca */ } else ctx.drawImage(cv, x + fw0 * 8 - Math.floor(cv.width / 2), y + e.footprint()[1] * 16 - cv.height + (e.type === 'enemy' ? bob : 0));
        if (e.alert) R.Font.draw(ctx, '!', x + 7, y - cv.height + 4, '#ff7b85', { outline: '#1a1224' });
      } else if (c.prop) {
        const pd = R.Tiles.PROPS[c.prop];
        let v = c.variant || 0;
        if (pd && pd.anim) v = (v || 0) + (Math.floor(R.Clock.time * 3) % pd.anim);
        const cv = R.Tiles.prop(c.prop, v);
        if (cv) {
          const fh = pd && pd.foot[1] > 0 ? pd.foot[1] : 1;
          let dy = y + fh * T - cv.height;
          if (pd && pd.wall) dy = y;
          ctx.drawImage(cv, x, dy);
        }
      }
      if (e.alpha < 1) ctx.globalAlpha = 1;
      if (e.emote) Draw.emote(ctx, e, x, y);
    },
    emote(ctx, e, x, y) {
      const em = e.emote;
      const k = Math.min(1, em.t * 6);
      const by = y - 22 - Math.round((1 - k) * 4);
      R.UI.window(ctx, x + 1, by, 14, 13, { alpha: 0.95, bg: '#fffaf0', border: '#2a1d33', inner: '#fffaf0' });
      const sym = { '!': '!', '?': '?', heart: '♥', dots: '…', note: '♪', zzz: 'z', sweat: '°', star: '★' }[em.kind] || em.kind;
      const colr = { heart: '#e84a6a', '!': '#d84a4a', note: '#5a6ad0' }[em.kind] || '#2a1d33';
      R.Font.draw(ctx, sym, x + 8, by + 0, colr, { align: 'center' });
    },
    objectTile(ctx, o, map, cam) {
      const x = o.x * T - cam.x, y = o.y * T - cam.y;
      if (o.kind === 'tree') {
        const cv = R.Tiles.tree(map.theme || 'vila', o.v + o.x);
        ctx.drawImage(cv, Math.round(x - 8), Math.round(y + T - 38));
      } else {
        const mask = o.kind === 'fence' ? map.maskOf(o.x, o.y, (n) => n === 'fence') : 0;
        const cv = R.Tiles.object(o.kind, map.theme || 'vila', o.v, mask);
        ctx.drawImage(cv, Math.round(x), Math.round(y + T - 24));
      }
    },
  };
  R.WorldDraw = Draw;

  // mini sprites de inimigos no mapa (reduz o sprite de batalha)
  const miniCache = {};
  R.Art.enemyMini = function (sprite) {
    if (miniCache[sprite]) return miniCache[sprite];
    const src = R.Art.enemy(sprite, 0);
    const g = src.getContext('2d');
    const data = g.getImageData(0, 0, src.width, src.height).data;
    const W = Math.ceil(src.width / 2), H = Math.ceil(src.height / 2);
    const p = new R.Pixel.PA(W + 2, H + 2);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        // escolhe o pixel mais opaco e mais claro do bloco 2x2 (preserva cores, não o contorno)
        let best = null, bestScore = -1;
        for (let j = 0; j < 2; j++)
          for (let i = 0; i < 2; i++) {
            const sx = x * 2 + i, sy = y * 2 + j;
            if (sx >= src.width || sy >= src.height) continue;
            const k = (sy * src.width + sx) * 4;
            if (data[k + 3] < 128) continue;
            const lum = data[k] + data[k + 1] + data[k + 2];
            const score = 1 + lum;
            if (score > bestScore) { bestScore = score; best = [data[k], data[k + 1], data[k + 2], 255]; }
          }
        if (best) p.set(x + 1, y + 1, best);
      }
    p.outline('#2a1d33');
    return (miniCache[sprite] = p.toCanvas());
  };

  // ======================================================== cena de exploração
  class WorldScene {
    constructor() { this.opaque = true; this.t = 0; this.hintT = 0; }
    enter() { R.Engine.playTimeActive = true; }
    exit() { R.Engine.playTimeActive = false; }
    resume() { R.Engine.playTimeActive = true; }
    pause() {}
    updateBelow(dt) { this.animate(dt); }
    animate(dt) {
      const W = World;
      for (const e of W.entities) e.update(dt);
      for (const f of W.followers) f.update(dt);
      W.player.update(dt);
      if (W.ambient) W.ambient.update(dt, W.cam);
      if (W.banner) { W.banner.t += dt; if (W.banner.t > 3.2) W.banner = null; }
      W.updateCamera(dt);
      R.Glitch.update(dt);
    }
    update(dt) {
      const W = World;
      this.t += dt;
      if (W.invuln > 0) W.invuln -= dt;
      if (W.bumpT > 0) W.bumpT -= dt;
      if (W.refreshPending) { W.refreshPending = false; W.refresh(); }
      const busy = R.Events.busy();
      if (!busy) this.handleInput(dt);
      W.updateAI(dt);
      this.animate(dt);
      if (!busy) {
        W.checkEnemyContact();
        R.Events.checkAuto();
        // anomalias aleatórias em mapas de terror
        const g = W.mapCfg && W.mapCfg.glitch;
        if (g && Math.random() < g * dt) R.Glitch.trigger(R.U.rand(80, 220), 0.6);
      }
    }
    handleInput() {
      const W = World, I = R.Input, p = W.player;
      if (I.pressed('menu') || I.pressed('cancel')) { R.Menu.open(); return; }
      if (I.pressed('inventory')) { R.Menu.open('itens'); return; }
      if (I.pressed('party')) { R.Menu.open('grupo'); return; }
      if (I.pressed('map')) { R.Menu.open('mapa'); return; }
      if (p.moving) return;
      if (I.pressed('confirm')) { if (W.interact()) return; }
      const d = I.dir();
      if (d) {
        const run = !W.mapCfg.noRun && (R.Settings.get('runDefault') ? !I.down('run') : I.down('run'));
        W.tryMovePlayer(d, run);
      }
    }
    render(ctx) {
      const W = World, m = W.map, cam = W.cam;
      if (!m) return;
      const sx = R.Screen.fx.sx, sy = R.Screen.fx.sy;
      const cx = Math.round(cam.x) - sx, cy = Math.round(cam.y) - sy;
      const camI = { x: cx, y: cy };
      ctx.fillStyle = W.mapCfg.bg || '#000';
      ctx.fillRect(0, 0, R.W, R.H);
      // chão
      ctx.drawImage(m.ground, -cx, -cy);
      // tiles animados
      const frame = Math.floor(R.Clock.time * 2.5) % 4;
      for (const [x, y] of m.anim) {
        const px = x * T - cx, py = y * T - cy;
        if (px < -T || py < -T || px > R.W || py > R.H) continue;
        ctx.drawImage(m.groundCanvas(x, y, frame), px, py);
      }
      // objetos de piso
      const draws = [];
      for (const e of W.entities) {
        if (!e.active) continue;
        if (e.cur.floor || (e.cur.prop && R.Tiles.PROPS[e.cur.prop] && R.Tiles.PROPS[e.cur.prop].floor)) Draw.entity(ctx, e, camI);
        else if (e.type !== 'door' && e.type !== 'trigger' && e.type !== 'light') draws.push({ y: e.sortY(), e });
      }
      for (const o of m.objects) {
        const px = o.x * T - cx, py = o.y * T - cy;
        if (px < -40 || py < -48 || px > R.W + 40 || py > R.H + 48) continue;
        draws.push({ y: o.y * T + T - 1, o });
      }
      if (!W.mapCfg.noFollowers) for (const f of W.followers) draws.push({ y: f.py + T - 0.2, e: f });
      draws.push({ y: W.player.py + T, e: W.player });
      draws.sort((a, b) => a.y - b.y);
      for (const d of draws) {
        if (d.o) Draw.objectTile(ctx, d.o, m, camI);
        else Draw.entity(ctx, d.e, camI);
      }
      // indicador de interação
      if (!R.Events.busy() && !W.player.moving) {
        const fe = W.facingEntity();
        if (fe) {
          const [fw] = fe.footprint();
          const ix = Math.round(fe.px + fw * 8 - cx), iy = Math.round(fe.py - cy - (fe.cur.sprite ? 14 : 6));
          const b = Math.round(Math.sin(R.Clock.time * 6) * 1.5);
          ctx.fillStyle = '#fffaf0';
          ctx.fillRect(ix - 1, iy - 4 + b, 3, 2);
          ctx.fillRect(ix, iy - 2 + b, 1, 1);
          ctx.fillStyle = 'rgba(42,29,51,0.8)';
          ctx.fillRect(ix - 1, iy - 2 + b, 1, 1); ctx.fillRect(ix + 1, iy - 2 + b, 1, 1);
        }
      }
      // partículas ambiente
      if (W.ambient) W.ambient.render(ctx, camI);
      // luz
      const cfg = W.mapCfg;
      if (cfg.dark > 0) R.Lighting.render(ctx, cfg.dark, W.lights(), cfg.darkTint);
      // tom de tela (atmosfera)
      if (W.tint) { ctx.fillStyle = W.tint; ctx.fillRect(0, 0, R.W, R.H); }
      R.Glitch.render(ctx);
      R.Vision.render(ctx);
      // nome da área
      if (W.banner) {
        const t = W.banner.t;
        const a = t < 0.4 ? t / 0.4 : t > 2.6 ? Math.max(0, (3.2 - t) / 0.6) : 1;
        if (a > 0) {
          const w = R.Font.measure(W.banner.text) + 20;
          ctx.globalAlpha = a;
          R.UI.window(ctx, 6, 6, w, 18, { alpha: 0.85 });
          R.Font.draw(ctx, W.banner.text, 16, 9, R.THEME.accent);
          ctx.globalAlpha = 1;
        }
      }
    }
  }
  R.WorldScene = WorldScene;
  R.Bus.on('state-changed', () => { World.refreshPending = true; });
  R.GameMap = GameMap;
  R.Entity = Entity;
})();
