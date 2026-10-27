/* VAGALUME — validação dos dados: encontra referências quebradas entre mapas,
 * scripts, itens, inimigos, missões e músicas. Roda a cada inicialização. */
(function () {
  'use strict';
  const R = window.RPG;

  R.Validate = {
    run() {
      const errors = [], warnings = [];
      const DB = R.DB;
      const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
      const items = DB.items.items, maps = DB.maps.maps, scripts = DB.dialogues.scripts;
      const troops = DB.enemies.troops, enemies = DB.enemies.enemies, skills = DB.skills.skills;
      const quests = DB.quests.quests, tracks = DB.music.tracks;
      const chars = Object.assign({}, DB.characters.npcs, DB.characters.party);
      const sprites = new Set(R.Art.ENEMY_SPRITES || []);

      const speaker = (spk, where) => {
        if (!spk || spk === 'think') return;
        const id = String(spk).split(':')[0];
        if (id === '?') return;
        if (!chars[id]) err(where + ': falante desconhecido "' + id + '"');
      };
      const checkCond = (c, where) => {
        if (!c) return;
        const list = Array.isArray(c) ? c : c.any || c.all || [c];
        for (let x of list) {
          if (typeof x === 'object') { checkCond(x, where); continue; }
          x = String(x).replace(/^!/, '');
          const [head, rest] = [x.split(':')[0], x.split(':').slice(1).join(':')];
          if (head === 'item') { const id = rest.split(/[<>=!]/)[0]; if (!items[id]) err(where + ': condição com item inexistente ' + id); }
          if (head === 'quest') { const id = rest.split(/[.<>=!]/)[0]; if (!quests[id]) err(where + ': condição com missão inexistente ' + id); }
          if (head === 'party' && !DB.characters.party[rest]) err(where + ': condição com membro inexistente ' + rest);
        }
      };
      const walk = (cmds, where) => {
        if (typeof cmds === 'string') { if (!scripts[cmds]) err(where + ': script inexistente "' + cmds + '"'); return; }
        if (!Array.isArray(cmds)) { err(where + ': script não é lista'); return; }
        for (const c of cmds) {
          if (!Array.isArray(c)) { err(where + ': comando inválido ' + JSON.stringify(c)); continue; }
          const op = c[0];
          if (!R.Events.CMDS[op]) { err(where + ': comando desconhecido "' + op + '"'); continue; }
          switch (op) {
            case 'say': speaker(c[1], where); for (let i = 2; i < c.length; i++) if (typeof c[i] !== 'string') err(where + ': fala não é texto'); break;
            case 'give': case 'take': if (!items[c[1]]) err(where + ': item inexistente "' + c[1] + '"'); break;
            case 'battle': if (!troops[c[1]]) err(where + ': tropa inexistente "' + c[1] + '"'); break;
            case 'teleport': {
              const m = maps[c[1]];
              if (!m) err(where + ': mapa inexistente "' + c[1] + '"');
              else if (c[3] >= m.layout.length || c[2] >= Math.max(...m.layout.map((r) => r.length))) err(where + ': posição fora do mapa ' + c[1]);
              break;
            }
            case 'quest': if (!quests[c[1]]) err(where + ': missão inexistente "' + c[1] + '"'); else if (c[2] && c[2].startsWith('step:') && !quests[c[1]].steps.some((s) => s.id === c[2].slice(5))) err(where + ': etapa inexistente ' + c[2]); break;
            case 'join': case 'leave': if (!DB.characters.party[c[1]]) err(where + ': personagem inexistente ' + c[1]); break;
            case 'shop': if (!DB.items.shops[c[1]]) err(where + ': loja inexistente ' + c[1]); break;
            case 'music': if (c[1] && !tracks[c[1]]) err(where + ': música inexistente ' + c[1]); break;
            case 'call': walk(c[1], where + '>call'); break;
            case 'if': case 'unless': checkCond(c[1], where); walk(c[2], where + '>if'); if (c[3]) walk(c[3], where + '>else'); break;
            case 'choice': for (const o of c.slice(1)) if (Array.isArray(o)) walk(o[1], where + '>' + o[0]); break;
            case 'random': for (const o of c.slice(1)) walk(o, where + '>random'); break;
            case 'learn': if (!skills[c[2]]) err(where + ': habilidade inexistente ' + c[2]); break;
            default: break;
          }
        }
      };

      for (const id in scripts) walk(scripts[id], 'script ' + id);

      for (const mid in maps) {
        const m = maps[mid];
        const where = 'mapa ' + mid;
        if (!Array.isArray(m.layout) || !m.layout.length) { err(where + ': sem layout'); continue; }
        const legend = Object.assign({}, m.interior ? DB.maps.legendInterior : DB.maps.legendExterior, m.legend || {});
        const W = Math.max(...m.layout.map((r) => r.length));
        m.layout.forEach((row, y) => {
          if (row.length !== W) warn(where + ': linha ' + y + ' com largura ' + row.length + ' (esperado ' + W + ')');
          for (const ch of row) if (legend[ch] === undefined) err(where + ': caractere sem legenda "' + ch + '"');
        });
        if (m.music && !tracks[m.music]) err(where + ': música inexistente ' + m.music);
        for (const v of m.variants || []) { if (v.music && !tracks[v.music]) err(where + ': música inexistente ' + v.music); checkCond(v.cond, where); }
        const ids = new Set();
        for (const e of m.entities || []) {
          const ew = where + ' entidade ' + (e.id || e.type);
          if (e.id) { if (ids.has(e.id)) err(ew + ': id repetido'); ids.add(e.id); }
          const all = [e].concat(e.pages || []);
          for (const p of all) {
            if (p.sprite && !chars[p.sprite]) err(ew + ': sprite inexistente ' + p.sprite);
            if (p.prop && !R.Tiles.PROPS[p.prop]) err(ew + ': prop inexistente ' + p.prop);
            if (p.script) walk(p.script, ew);
            if (p.cond) checkCond(p.cond, ew);
            if (p.troop && !troops[p.troop]) err(ew + ': tropa inexistente ' + p.troop);
            if (p.esprite && !sprites.has(p.esprite)) err(ew + ': sprite de inimigo inexistente ' + p.esprite);
            if (p.item && !items[p.item]) err(ew + ': item inexistente ' + p.item);
            if (p.items) for (const i in p.items) if (!items[i]) err(ew + ': item inexistente ' + i);
            if (p.style && !R.Tiles.BSTYLE[p.style]) err(ew + ': estilo de construção inexistente ' + p.style);
            if (p.to) {
              const t = maps[p.to];
              if (!t) err(ew + ': porta para mapa inexistente ' + p.to);
              else if (p.ty >= t.layout.length || p.tx >= t.layout[0].length) err(ew + ': saída fora do mapa ' + p.to + ' (' + p.tx + ',' + p.ty + ')');
              else {
                const tl = Object.assign({}, t.interior ? DB.maps.legendInterior : DB.maps.legendExterior, t.legend || {});
                const ch = t.layout[p.ty][p.tx];
                let te = tl[ch]; if (typeof te === 'string') te = { t: te };
                const info = te && R.Tiles.TYPES[te.t];
                if (!te || (te.solid !== undefined ? te.solid : info && info.solid)) err(ew + ': destino da porta é sólido em ' + p.to + ' (' + p.tx + ',' + p.ty + ') "' + ch + '"');
              }
            }
            if (p.x !== undefined && (p.y >= m.layout.length || p.x >= W)) err(ew + ': fora do mapa');
          }
        }
      }
      for (const id in items) {
        const it = items[id];
        if (!it.name || !it.desc) err('item ' + id + ': sem nome/descrição');
        if (it.cat === 'arma' && !it.for) err('item ' + id + ': arma sem dono (for)');
      }
      for (const sid in DB.items.shops) for (const e of DB.items.shops[sid].items) { if (!items[e.id]) err('loja ' + sid + ': item inexistente ' + e.id); if (e.cond) checkCond(e.cond, 'loja ' + sid); }
      for (const id in enemies) {
        const e = enemies[id];
        if (!sprites.has(e.sprite)) err('inimigo ' + id + ': sprite inexistente ' + e.sprite);
        for (const a of e.ai || []) if (a.skill !== 'atacar' && !skills[a.skill]) err('inimigo ' + id + ': habilidade inexistente ' + a.skill);
        for (const d of e.drops || []) if (!items[d.item]) err('inimigo ' + id + ': drop inexistente ' + d.item);
      }
      for (const id in troops) {
        for (const en of troops[id].enemies) if (!enemies[en]) err('tropa ' + id + ': inimigo inexistente ' + en);
        if (troops[id].music && !tracks[troops[id].music]) err('tropa ' + id + ': música inexistente');
      }
      for (const pid in DB.characters.party) {
        const p = DB.characters.party[pid];
        for (const s of p.skills) if (!skills[s.id]) err('personagem ' + pid + ': habilidade inexistente ' + s.id);
        if (p.startWeapon && !items[p.startWeapon]) err('personagem ' + pid + ': arma inicial inexistente');
      }
      for (const qid in quests) {
        const q = quests[qid];
        if (q.rewards && q.rewards.items) for (const i in q.rewards.items) if (!items[i]) err('missão ' + qid + ': recompensa inexistente ' + i);
        for (const s of q.steps) checkCond(s.done, 'missão ' + qid);
      }
      for (const fid in DB.skills.followups || {}) for (const f of DB.skills.followups[fid]) if (!DB.characters.party[f.with]) err('combo ' + fid + ': parceiro inexistente ' + f.with);
      return { errors, warnings };
    },
  };
})();
