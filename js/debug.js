/* VAGALUME — ferramentas de depuração. Só funcionam com ?debug=1 na URL.
 * F2 painel de informações • F3 colisões/ids • F4 teleporte • F6 dar item
 * F7 vencer batalha atual • F8 atravessar paredes • F9 definir flag
 * URL: ?debug=1&map=vila&x=10&y=8&party=lume,brisa&phase=2&flags=a,b */
(function () {
  'use strict';
  const R = window.RPG;
  const Debug = {
    on: R.DEBUG,
    panel: false,
    grid: false,
    noclip: false,
    t: 0,
    el: null,
    init() {
      if (!this.on) return;
      const sp = +new URLSearchParams(location.search).get('speed');
      if (sp > 0) R.Engine.timeScale = Math.min(8, sp);
      this.el = document.createElement('div');
      this.el.id = 'debug-panel';
      document.body.appendChild(this.el);
      window.addEventListener('keydown', (e) => {
        if (!this.on) return;
        if (e.code === 'F2') { this.panel = !this.panel; this.el.classList.toggle('show', this.panel); e.preventDefault(); }
        if (e.code === 'F3') { this.grid = !this.grid; e.preventDefault(); }
        if (e.code === 'F4') { e.preventDefault(); const s = prompt('Teleportar: mapa x y', (R.State.s ? R.State.s.mapId : 'vila') + ' 5 5'); if (s) { const [m, x, y] = s.split(/\s+/); R.Events.transfer(m, +x, +y, 'down'); } }
        if (e.code === 'F6') { e.preventDefault(); const s = prompt('Item e quantidade', 'biscoito 5'); if (s) { const [id, n] = s.split(/\s+/); R.Inventory.add(id, +n || 1); } }
        if (e.code === 'F7') { e.preventDefault(); const b = R.Battle && R.Battle.current; if (b) b.debugWin(); }
        if (e.code === 'F8') { e.preventDefault(); this.noclip = !this.noclip; R.Toasts.push('Atravessar paredes: ' + (this.noclip ? 'sim' : 'não')); }
        if (e.code === 'F9') { e.preventDefault(); const s = prompt('flag (ou var=valor)', ''); if (s) { if (s.includes('=')) { const [k, v] = s.split('='); R.State.setVar(k, isNaN(+v) ? v : +v); } else R.State.setFlag(s); } }
      });
      // atravessar paredes
      const orig = R.World.passable.bind(R.World);
      R.World.passable = (x, y, mover) => (this.noclip && mover === R.World.player ? !!R.World.map.tile(x, y) : orig(x, y, mover));
    },
    // inicia direto em um mapa (testes)
    boot() {
      const q = new URLSearchParams(location.search);
      if (!q.get('map')) return false;
      R.State.newGame();
      const party = (q.get('party') || 'lume').split(',');
      for (const p of party.slice(1)) R.Party.join(p);
      if (q.get('phase')) R.State.s.vars.phase = +q.get('phase');
      for (const f of (q.get('flags') || '').split(',').filter(Boolean)) R.State.s.flags[f] = true;
      if (q.get('level')) for (const id of Object.keys(R.State.s.members)) R.State.s.members[id] = R.Party.createMember(id, +q.get('level'));
      if (q.get('items')) for (const it of q.get('items').split(',')) { const [id, n] = it.split(':'); R.Inventory.add(id, +n || 1); }
      if (q.get('money')) R.State.s.money = +q.get('money');
      R.Scenes.reset(new R.WorldScene());
      R.World.load(q.get('map'), +(q.get('x') || 5), +(q.get('y') || 5), 'down');
      R.Screen.fx.fade = 0;
      return true;
    },
    update(dt) {
      if (!this.on || !this.panel) return;
      this.t += dt;
      if (this.t < 0.25) return;
      this.t = 0;
      const W = R.World, s = R.State.s;
      const lines = [];
      lines.push('FPS ' + R.Engine.fps.toFixed(0) + '  cenas: ' + R.Scenes.stack.map((x) => x.constructor.name).join(' > '));
      lines.push('eventos ativos: ' + R.Events.running + '  dados: ' + R.Data.source + '  armazenamento: ' + (R.Save.storageOk ? 'ok' : 'BLOQUEADO'));
      if (s && W.map) {
        lines.push('mapa ' + W.map.id + ' (' + W.map.w + 'x' + W.map.h + ')  jogador ' + W.player.x + ',' + W.player.y + ' ' + W.player.dir + '  fase ' + (s.vars.phase || 0));
        const fe = W.facingEntity();
        lines.push('olhando para: ' + (fe ? fe.id + ' (' + fe.type + ')' : '-'));
        lines.push('grupo: ' + s.party.map((p) => p + ' nv' + s.members[p].level + ' ' + s.members[p].hp + 'hp').join(', '));
        lines.push('missões: ' + Object.keys(s.quests).map((q) => q + '=' + s.quests[q].state).join(', '));
        lines.push('flags: ' + Object.keys(s.flags).slice(-24).join(', '));
        lines.push('vars: ' + JSON.stringify(s.vars));
      }
      const b = R.Battle && R.Battle.current;
      if (b) {
        lines.push('--- batalha ' + b.troopId + ' rodada ' + b.round + ' laço ' + b.laco);
        for (const u of b.units()) lines.push((u.side === 'party' ? 'P ' : 'E ') + u.name + ' ' + u.hp + '/' + u.mhp + ' br' + u.br + ' ' + (u.emotion.type || 'neutro') + (u.emotion.tier || '') + ' ' + Object.keys(u.status).join(','));
      }
      lines.push('--- erros recentes');
      R.Log.entries.filter((e) => e.level !== 'info').slice(-6).forEach((e) => lines.push(e.level + ': ' + e.msg));
      this.el.textContent = lines.join('\n');
    },
    render(ctx) {
      if (!this.on || !this.grid || !R.World.map || !(R.Scenes.top() instanceof R.WorldScene || R.Scenes.stack.some((s) => s instanceof R.WorldScene))) return;
      const W = R.World, m = W.map, cx = Math.round(W.cam.x), cy = Math.round(W.cam.y);
      ctx.globalAlpha = 0.35;
      for (let y = 0; y < m.h; y++)
        for (let x = 0; x < m.w; x++) {
          const t = m.tile(x, y);
          const solid = t.solid || W.entities.some((e) => e.isSolidAt(x, y));
          if (solid) { ctx.fillStyle = '#ff3050'; ctx.fillRect(x * 16 - cx, y * 16 - cy, 16, 16); }
        }
      ctx.globalAlpha = 1;
      for (const e of W.entities) {
        if (!e.active) continue;
        ctx.fillStyle = e.type === 'door' || e.type === 'trigger' ? '#30ff90' : '#ffe030';
        const [fw, fh] = e.footprint();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.strokeRect(e.x * 16 - cx + 0.5, e.y * 16 - cy + 0.5, fw * 16 - 1, fh * 16 - 1);
        R.Font.draw(ctx, e.id, e.x * 16 - cx, e.y * 16 - cy - 10, '#fff', { outline: '#000' });
      }
    },
  };
  R.Debug = Debug;
  Debug.init();
})();
