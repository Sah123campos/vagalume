/* VAGALUME — inicialização: prepara tela, entrada, áudio, configurações,
 * carrega os dados, valida referências e abre a tela inicial. */
(function () {
  'use strict';
  const R = window.RPG;

  function setupErrorOverlay() {
    const el = document.getElementById('error-overlay');
    el.querySelector('.err-continue').addEventListener('click', () => R.Errors.hide());
    el.querySelector('.err-reload').addEventListener('click', () => location.reload());
    el.querySelector('.err-copy').addEventListener('click', () => {
      const txt = el.querySelector('.err-title').textContent + '\n' + el.querySelector('.err-detail').textContent + '\n\n' +
        R.Log.entries.slice(-30).map((e) => e.level + ': ' + e.msg + ' ' + e.extra).join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    });
  }

  function progress(p, label) {
    const f = document.getElementById('ld-fill');
    const t = document.getElementById('ld-text');
    if (f) f.style.width = Math.round(p * 100) + '%';
    if (t && label) t.textContent = 'Carregando ' + label + '...';
  }

  async function boot() {
    setupErrorOverlay();
    const canvas = document.getElementById('screen');
    R.Screen.init(canvas);
    R.Input.init();
    R.Input.initTouch(document.getElementById('touch'));
    R.Audio.init();
    R.Save.check();
    R.Settings.load();
    canvas.addEventListener('pointerdown', () => canvas.focus());
    try {
      await R.Data.load(progress);
    } catch (e) {
      const local = location.protocol === 'file:';
      R.Errors.show('Não foi possível carregar os dados do jogo',
        e.message + (local ? '\n\nVocê abriu o jogo direto do arquivo. O arquivo data/bundle.js deveria resolver isso; verifique se ele existe. ' +
          'Alternativa: rode um servidor local (python -m http.server) e abra http://localhost:8000.' : '\n\nVerifique se a pasta data/ foi enviada junto com o index.html.'), true);
      return;
    }
    const v = R.Validate.run();
    if (v.errors.length) {
      R.Log.error('Problemas nos dados: ' + v.errors.length);
      v.errors.slice(0, 40).forEach((m) => R.Log.error(m));
      if (R.DEBUG) R.Errors.show('Dados com problemas (' + v.errors.length + ')', v.errors.slice(0, 20).join('\n'), false);
    }
    v.warnings.forEach((m) => R.Log.warn(m));
    document.getElementById('loading').classList.add('done');
    R.Engine.start();
    if (R.DEBUG && R.Debug.boot()) return;
    R.Title.goto();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
