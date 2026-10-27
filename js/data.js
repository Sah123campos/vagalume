/* VAGALUME — carregamento de dados.
 * Em http(s) (GitHub Pages, servidor local) lê os arquivos data/*.json.
 * Aberto direto do disco (file://), o navegador bloqueia fetch; então
 * usa data/bundle.js, uma cópia gerada dos mesmos JSON (tools/build-bundle.*). */
(function () {
  'use strict';
  const R = window.RPG;
  const FILES = ['maps', 'characters', 'enemies', 'items', 'skills', 'quests', 'dialogues', 'music'];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('não foi possível carregar ' + src));
      document.head.appendChild(s);
    });
  }

  R.Data = {
    FILES,
    source: null,
    async load(onProgress) {
      const db = {};
      let ok = false;
      const errors = [];
      if (/^https?:/.test(location.protocol)) {
        try {
          let n = 0;
          await Promise.all(
            FILES.map(async (f) => {
              const res = await fetch('data/' + f + '.json', { cache: 'no-cache' });
              if (!res.ok) throw new Error('data/' + f + '.json: HTTP ' + res.status);
              const txt = await res.text();
              try { db[f] = JSON.parse(txt); } catch (e) { throw new Error('data/' + f + '.json tem JSON inválido: ' + e.message); }
              n++;
              if (onProgress) onProgress(n / FILES.length, f);
            })
          );
          ok = true;
          this.source = 'json';
        } catch (e) {
          errors.push(e.message);
          R.Log.warn('Falha ao ler JSON; tentando data/bundle.js', e.message);
        }
      }
      if (!ok) {
        try {
          if (!window.VAGALUME_DATA) await loadScript('data/bundle.js');
          const b = window.VAGALUME_DATA;
          if (!b) throw new Error('data/bundle.js não definiu VAGALUME_DATA');
          for (const f of FILES) {
            if (!b[f]) throw new Error('bundle sem a seção "' + f + '"');
            db[f] = b[f];
          }
          ok = true;
          this.source = 'bundle';
          if (onProgress) onProgress(1, 'bundle');
        } catch (e) {
          errors.push(e.message);
        }
      }
      if (!ok) throw new Error(errors.join('\n'));
      R.DB = db;
      return db;
    },
  };
})();
