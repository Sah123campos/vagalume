/* VAGALUME — missões: pré-requisitos, etapas com condições automáticas,
 * recompensas, falha e notificações. Definições em data/quests.json. */
(function () {
  'use strict';
  const R = window.RPG;

  const Quests = (R.Quests = {
    def(id) { return R.DB.quests.quests[id]; },
    rec(id) { return R.State.s.quests[id]; },
    status(id) { const r = this.rec(id); return r ? r.state : 'inactive'; },
    stepDone(id, stepId) { const r = this.rec(id); return !!(r && r.steps && r.steps[stepId]); },
    canStart(id) {
      const d = this.def(id);
      return !!d && this.status(id) === 'inactive' && R.Cond.test(d.requires);
    },
    start(id, silent) {
      const d = this.def(id);
      if (!d) { R.Log.error('Missão inexistente: ' + id); return false; }
      if (this.status(id) !== 'inactive') return false;
      R.State.s.quests[id] = { state: 'active', steps: {}, started: Date.now() };
      if (!silent) { R.Toasts.push('Nova missão: ' + d.title, 'missao', R.THEME.accent); if (R.Audio) R.Audio.sfx('quest'); }
      this.refresh();
      R.State.changed();
      return true;
    },
    completeStep(id, stepId, silent) {
      const r = this.rec(id);
      const d = this.def(id);
      if (!r || r.state !== 'active' || r.steps[stepId]) return;
      r.steps[stepId] = true;
      const step = d.steps.find((s) => s.id === stepId);
      if (!silent && step && !step.hidden) R.Toasts.push('✓ ' + step.text, 'check', R.THEME.good);
      if (d.autoComplete !== false && d.steps.every((s) => s.optional || r.steps[s.id])) this.complete(id);
    },
    complete(id) {
      const r = this.rec(id);
      const d = this.def(id);
      if (!r || r.state === 'done') return;
      r.state = 'done';
      for (const s of d.steps) r.steps[s.id] = true;
      R.Toasts.push('Missão concluída: ' + d.title, 'missao', R.THEME.good);
      if (R.Audio) R.Audio.sfx('questDone');
      this.giveRewards(d.rewards);
      R.State.changed();
    },
    fail(id) {
      const r = this.rec(id);
      if (!r || r.state !== 'active') return;
      r.state = 'failed';
      R.Toasts.push('Missão falhou: ' + this.def(id).title, 'missao', R.THEME.bad);
      R.State.changed();
    },
    giveRewards(rw) {
      if (!rw) return;
      if (rw.money) { R.Inventory.addMoney(rw.money); R.Toasts.push('+' + rw.money + ' botões', 'botao'); }
      if (rw.items) for (const id in rw.items) { const n = R.Inventory.add(id, rw.items[id]); if (n) R.Toasts.push('Recebeu ' + R.Inventory.name(id) + (n > 1 ? ' x' + n : ''), 'lanche'); }
      if (rw.exp) {
        for (const pid of R.State.s.party) {
          const ev = R.Party.gainExp(pid, rw.exp);
          for (const e of ev) R.Toasts.push(R.Party.def(e.id).name + ' subiu para o nível ' + e.level + '!', 'brilho', R.THEME.accent);
        }
      }
      if (rw.flag) R.State.setFlag(rw.flag);
    },
    // verifica etapas automáticas, inícios automáticos e falhas
    refresh() {
      if (!R.State.s || this._refreshing) return;
      this._refreshing = true;
      try {
        const all = R.DB.quests.quests;
        for (let pass = 0; pass < 3; pass++)
        for (const id in all) {
          const d = all[id];
          const st = this.status(id);
          if (st === 'inactive' && d.autoStart && R.Cond.test(d.autoStart) && R.Cond.test(d.requires)) this.start(id);
          if (this.status(id) !== 'active') continue;
          if (d.fail && R.Cond.test(d.fail)) { this.fail(id); continue; }
          const r = this.rec(id);
          for (const s of d.steps) {
            if (r.steps[s.id]) continue;
            if (d.sequential) {
              const idx = d.steps.indexOf(s);
              if (d.steps.slice(0, idx).some((p) => !p.optional && !r.steps[p.id])) break;
            }
            if (s.done && R.Cond.test(s.done)) this.completeStep(id, s.id);
          }
        }
      } finally { this._refreshing = false; }
    },
    // etapa atual (texto) para o diário
    currentSteps(id) {
      const d = this.def(id), r = this.rec(id);
      if (!d || !r) return [];
      const out = [];
      for (const s of d.steps) {
        if (s.hidden && !r.steps[s.id]) continue;
        out.push({ text: s.text, done: !!r.steps[s.id], optional: s.optional });
        if (d.sequential && !r.steps[s.id] && !s.optional) break;
      }
      return out;
    },
    list(filter) {
      const all = R.DB.quests.quests;
      return Object.keys(all).filter((id) => {
        const st = this.status(id);
        if (filter === 'active') return st === 'active';
        if (filter === 'done') return st === 'done' || st === 'failed';
        return st !== 'inactive';
      });
    },
  });
  R.Bus.on('state-changed', () => Quests.refresh());
})();
