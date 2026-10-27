/* VAGALUME — salvamento local (localStorage): 3 espaços manuais + 1 automático,
 * cópia de segurança antes de sobrescrever, validação, migração de versões,
 * exportação/importação em arquivo JSON. Nunca apaga dados ilegíveis sozinho. */
(function () {
  'use strict';
  const R = window.RPG;
  const PREFIX = 'vagalume.save.';
  const SLOTS = ['auto', '1', '2', '3'];
  const FORMAT = 'vagalume-save';

  // migrações: de versão N para N+1
  const MIGRATIONS = {
    1: (st) => { st.stock = st.stock || {}; st.visited = st.visited || {}; return st; },
  };

  const memory = {}; // usado se o navegador bloquear o localStorage

  const Save = (R.Save = {
    SLOTS,
    storageOk: true,
    check() {
      try {
        const k = PREFIX + '__teste';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
        this.storageOk = true;
      } catch (e) {
        this.storageOk = false;
        R.Log.warn('localStorage indisponível; saves ficarão só na memória desta aba');
      }
      return this.storageOk;
    },
    rawGet(k) { try { return this.storageOk ? localStorage.getItem(k) : (memory[k] || null); } catch (e) { return memory[k] || null; } },
    rawSet(k, v) {
      try { if (this.storageOk) { localStorage.setItem(k, v); return true; } } catch (e) { R.Log.error('Falha ao gravar save', e.message); return false; }
      memory[k] = v; return true;
    },
    rawDel(k) { try { if (this.storageOk) localStorage.removeItem(k); } catch (e) { /* ok */ } delete memory[k]; },

    summary() {
      const s = R.State.s;
      const map = R.DB.maps.maps[s.mapId];
      return {
        location: (map && map.name) || s.mapId,
        level: R.Party.member(s.party[0]).level,
        party: s.party.slice(),
        playTime: Math.floor(s.playTime),
        phase: s.vars.phase || 0,
        money: s.money,
      };
    },
    pack() {
      R.Party.clampAll();
      return {
        format: FORMAT,
        version: R.SAVE_VERSION,
        game: R.VERSION,
        savedAt: new Date().toISOString(),
        summary: this.summary(),
        state: R.U.clone(R.State.s),
      };
    },
    // valida estrutura; devolve {ok, data, error}
    validate(obj) {
      if (!obj || typeof obj !== 'object') return { ok: false, error: 'arquivo não é um save' };
      if (obj.format !== FORMAT) return { ok: false, error: 'formato desconhecido' };
      if (typeof obj.version !== 'number') return { ok: false, error: 'versão ausente' };
      if (obj.version > R.SAVE_VERSION) return { ok: false, error: 'save de uma versão mais nova do jogo (' + obj.version + ')' };
      let st = obj.state;
      if (!st || typeof st !== 'object') return { ok: false, error: 'estado ausente' };
      // migra
      let v = obj.version;
      try {
        while (v < R.SAVE_VERSION) {
          if (MIGRATIONS[v]) st = MIGRATIONS[v](st);
          v++;
        }
      } catch (e) { return { ok: false, error: 'falha na migração: ' + e.message }; }
      const req = { mapId: 'string', x: 'number', y: 'number', party: 'object', members: 'object', inventory: 'object', money: 'number', flags: 'object', vars: 'object', quests: 'object' };
      for (const k in req) if (typeof st[k] !== req[k] || st[k] === null) return { ok: false, error: 'campo inválido: ' + k };
      if (!Array.isArray(st.party) || !st.party.length) return { ok: false, error: 'grupo vazio' };
      if (!R.DB.maps.maps[st.mapId]) return { ok: false, error: 'mapa inexistente: ' + st.mapId };
      for (const id of st.party) if (!st.members[id] || !R.DB.characters.party[id]) return { ok: false, error: 'membro inválido: ' + id };
      // limpa itens que não existem mais (sem quebrar o resto)
      for (const id of Object.keys(st.inventory)) if (!R.DB.items.items[id]) { R.Log.warn('Item removido do save (não existe mais): ' + id); delete st.inventory[id]; }
      st.visited = st.visited || {};
      st.stock = st.stock || {};
      st.playTime = st.playTime || 0;
      st.version = R.SAVE_VERSION;
      return { ok: true, data: Object.assign({}, obj, { version: R.SAVE_VERSION, state: st }) };
    },
    // lê um espaço: {status:'empty'|'ok'|'corrupt', data?, error?, raw?}
    read(slot) {
      const raw = this.rawGet(PREFIX + slot);
      if (!raw) return { status: 'empty' };
      let obj;
      try { obj = JSON.parse(raw); } catch (e) { return { status: 'corrupt', error: 'JSON ilegível', raw }; }
      const v = this.validate(obj);
      if (!v.ok) return { status: 'corrupt', error: v.error, raw };
      return { status: 'ok', data: v.data, raw };
    },
    write(slot) {
      const prev = this.rawGet(PREFIX + slot);
      if (prev) this.rawSet(PREFIX + slot + '.bak', prev);
      const data = this.pack();
      const ok = this.rawSet(PREFIX + slot, JSON.stringify(data));
      if (ok) R.Log.info('Jogo salvo no espaço ' + slot);
      return ok;
    },
    autosave() {
      if (!R.State.s || !R.Settings.get('autosave')) return false;
      const ok = this.write('auto');
      if (ok) R.Toasts.push('Salvo automaticamente', 'check', R.THEME.dim);
      return ok;
    },
    load(slot) {
      const r = this.read(slot);
      if (r.status !== 'ok') return r;
      this.apply(r.data.state);
      return r;
    },
    apply(st) {
      R.State.s = R.U.clone(st);
      // garante membros para personagens novos adicionados em atualizações
      for (const id of Object.keys(R.DB.characters.party)) if (!R.State.s.members[id]) R.State.s.members[id] = R.Party.createMember(id, 1);
      R.Party.clampAll();
    },
    restoreBackup(slot) {
      const bak = this.rawGet(PREFIX + slot + '.bak');
      if (!bak) return false;
      this.rawSet(PREFIX + slot, bak);
      return true;
    },
    hasBackup(slot) { return !!this.rawGet(PREFIX + slot + '.bak'); },
    erase(slot) {
      const prev = this.rawGet(PREFIX + slot);
      if (prev) this.rawSet(PREFIX + slot + '.bak', prev);
      this.rawDel(PREFIX + slot);
    },
    // espaço mais recente válido (para "Continuar")
    latest() {
      let best = null;
      for (const s of SLOTS) {
        const r = this.read(s);
        if (r.status === 'ok' && (!best || r.data.savedAt > best.data.savedAt)) best = { slot: s, data: r.data };
      }
      return best;
    },
    anyValid() { return !!this.latest(); },
    // ---------------------------------------------------- exportar/importar
    exportSlot(slot) {
      const raw = this.rawGet(PREFIX + slot);
      if (!raw) return false;
      const d = new Date();
      const name = 'vagalume-save-' + slot + '-' + d.getFullYear() + R.U.pad2(d.getMonth() + 1) + R.U.pad2(d.getDate()) + '.json';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      return true;
    },
    // abre seletor de arquivo; resolve {ok, data|error}
    pickFile() {
      return new Promise((resolve) => {
        const inp = document.getElementById('import-file');
        if (!inp) { resolve({ ok: false, error: 'seletor indisponível' }); return; }
        inp.value = '';
        const done = () => {
          inp.removeEventListener('change', onChange);
          window.removeEventListener('focus', onFocus);
        };
        const onChange = () => {
          done();
          const f = inp.files && inp.files[0];
          if (!f) { resolve({ ok: false, error: 'nenhum arquivo' }); return; }
          if (f.size > 2 * 1024 * 1024) { resolve({ ok: false, error: 'arquivo grande demais' }); return; }
          const rd = new FileReader();
          rd.onload = () => {
            let obj;
            try { obj = JSON.parse(rd.result); } catch (e) { resolve({ ok: false, error: 'JSON inválido' }); return; }
            const v = this.validate(obj);
            resolve(v.ok ? { ok: true, data: v.data, raw: JSON.stringify(v.data) } : { ok: false, error: v.error });
          };
          rd.onerror = () => resolve({ ok: false, error: 'não foi possível ler o arquivo' });
          rd.readAsText(f);
        };
        // se o usuário cancelar, o foco volta sem "change"
        const onFocus = () => setTimeout(() => { if (!inp.files || !inp.files.length) { done(); resolve({ ok: false, error: 'cancelado' }); } }, 600);
        inp.addEventListener('change', onChange);
        window.addEventListener('focus', onFocus);
        inp.click();
      });
    },
    importTo(slot, raw) {
      const prev = this.rawGet(PREFIX + slot);
      if (prev) this.rawSet(PREFIX + slot + '.bak', prev);
      return this.rawSet(PREFIX + slot, raw);
    },
    // ------------------------------------------- instantâneo (repetir batalha)
    snapshot() { return R.U.clone(R.State.s); },
    restoreSnapshot(snap) {
      const keepTime = R.State.s.playTime;
      R.State.s = R.U.clone(snap);
      R.State.s.playTime = keepTime;
      R.State.changed();
    },
  });
  void Save;
})();
