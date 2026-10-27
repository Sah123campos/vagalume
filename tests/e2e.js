/* VAGALUME — testes de ponta a ponta (Playwright).
 * Uso:  1) sirva a pasta pai do jogo:  python3 -m http.server 8765   (na pasta que CONTÉM "vagalume/")
 *       2) node tests/e2e.js http://localhost:8765/vagalume/
 * Requer: npm i playwright (ou Playwright já instalado globalmente).
 * Cada cenário imprime OK/FALHOU. Nada aqui é necessário para jogar. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BASE = process.argv[2] || 'http://localhost:8765/vagalume/';
const ONLY = process.argv[3] || '';
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// robô de batalha: responde aos menus automaticamente (injetado na página)
const BOT = `
window.__bot = setInterval(() => {
  const R = window.RPG, b = R.Battle && R.Battle.current;
  if (!b || !b.ui || !b.uiResolve) return;
  const ui = b.ui, n = ui.constructor.name;
  let v;
  if (n === 'PartyMenu') v = window.__botFlee ? 'flee' : 'fight';
  else if (n === 'CommandMenu') {
    const sp = ui.opts.find((o) => o.v && o.v.special && !o.disabled && (o.v.special === 'acender' || o.v.special === 'brasas' || o.v.special === 'mao'));
    if (sp) v = sp.v; else {
      const sk = ui.opts.find((o) => o.v === 'skill' && !o.disabled) && ui.u.skills.some((id) => { const d = R.DB.skills.skills[id]; return ui.u.br >= d.cost && b.targetPool(ui.u, d).length; });
      const low = b.aliveParty().some((u) => u.hp < u.mhp * 0.45);
      const healer = ui.u.skills.some((s) => /verso_doce|lanchinho|cantiga|abraco_urso/.test(s));
      window.__wantHeal = low && healer;
      v = (window.__botSkills && sk && (window.__wantHeal || Math.random() < 0.4)) ? 'skill' : 'attack';
    }
  }
  else if (n === 'SkillMenu') {
    const ok = ui.items.filter((i) => !i.disabled);
    const heal = ok.find((i) => /verso_doce|lanchinho|cantiga|abraco_urso/.test(i.v));
    const fx = ok.find((i) => /fagulha|palavra_afiada/.test(i.v));
    v = window.__wantHeal && heal ? heal.v : fx && Math.random() < 0.5 ? fx.v : ok.length ? ok[Math.floor(Math.random() * ok.length)].v : 'back';
  }
  else if (n === 'ItemMenu') v = 'back';
  else if (n === 'TargetMenu') { const t = ui.targets.slice(); v = t[0].side === 'party' ? t.sort((x, y) => x.hp / x.mhp - y.hp / y.mhp)[0] : (b.tide && b.tide.level >= 2 && t.find((x) => x.key === 'isca')) || t.find((x) => x.boss) || t[0]; }
  else if (n === 'FollowupMenu') v = ui.items[0].v;
  else if (n === 'VictoryPanel') v = 'done';
  if (v === undefined) return;
  const res = b.uiResolve; b.ui = null; b.uiResolve = null; res(v);
}, 40);
// avança diálogos sozinho
window.__talk = setInterval(() => {
  const R = window.RPG, d = R.Dialogue.scene;
  if (!d || !R.Scenes.stack.includes(d)) return;
  if (d.choice) { const c = d.choice; d.choice = null; c.resolve(window.__choice || 0); return; }
  if (d.flat) { if (!d.done) d.revealAll(); else if (d.resolveSay) { const r = d.resolveSay; d.resolveSay = null; d.flat = null; r(); } }
}, 30);
// fecha cartões e créditos
window.__cards = setInterval(() => {
  const R = window.RPG, t = R.Scenes.top();
  if (t && (t.constructor.name === 'CardScene' || t.constructor.name === 'CreditsScene')) R.Scenes.pop(t);
}, 200);
`;

async function scenario(name, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1152, height: 648 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let ok = false, info = '';
  try {
    info = (await fn(p, ctx)) || '';
    ok = errors.length === 0;
    if (!ok) info += ' | erros: ' + errors.slice(0, 3).join(' ; ');
  } catch (e) {
    try { info = 'estado: ' + JSON.stringify(await p.evaluate(() => ({ map: RPG.State.s && RPG.State.s.mapId, pos: RPG.World.player && [RPG.World.player.x, RPG.World.player.y], ev: RPG.Events.running, scenes: RPG.Scenes.stack.map((x) => x.constructor.name) }))) + ' | '; } catch (e2) { /* */ }
    info += 'exceção: ' + e.message + (errors.length ? ' | ' + errors.slice(0, 3).join(' ; ') : ''); }
  results.push({ name, ok, info });
  console.log((ok ? 'OK      ' : 'FALHOU  ') + name + (info ? '  — ' + info : ''));
  await b.close();
}
const ev = (p, f, a) => p.evaluate(f, a);
async function waitFor(p, fn, timeout = 30000, arg) {
  await p.waitForFunction(fn, arg, { timeout, polling: 50 });
}
async function boot(p, q) {
  await p.goto(BASE + 'index.html' + (q ? '?' + q : ''));
  await waitFor(p, () => window.RPG && window.RPG.DB && window.RPG.Scenes.stack.length > 0);
}
async function key(p, k, hold = 80) { await p.keyboard.down(k); await sleep(hold); await p.keyboard.up(k); await sleep(120); }
async function walk(p, dir, n) { for (let i = 0; i < n; i++) { await key(p, dir); await waitFor(p, () => !RPG.World.player.moving); await sleep(40); } }
async function idle(p, timeout = 30000) { await waitFor(p, () => RPG.Events.running === 0 && !(RPG.Battle && RPG.Battle.current), timeout); }

(async () => {
  await scenario('abre sem save: título, "Continuar" desativado', async (p) => {
    await boot(p);
    const r = await ev(p, () => { const t = RPG.Scenes.top(); return { scene: t.constructor.name, cont: t.list.items[0].disabled }; });
    if (r.scene !== 'TitleScene' || !r.cont) throw new Error(JSON.stringify(r));
    return 'tela inicial ok';
  });

  await scenario('novo jogo, intro, mover, colidir, bilhete, mesa, sair da casa', async (p) => {
    await boot(p);
    await sleep(800);
    await key(p, 'KeyZ'); await sleep(400); await key(p, 'KeyZ');
    await p.evaluate(BOT);
    await waitFor(p, () => RPG.State.s && RPG.State.s.flags.acordou && RPG.Events.running === 0);
    await sleep(300);
    const start = await ev(p, () => [RPG.World.player.x, RPG.World.player.y]);
    await walk(p, 'ArrowLeft', 3); // parede/cama
    const after = await ev(p, () => [RPG.World.player.x, RPG.World.player.y]);
    if (after[0] < 2) throw new Error('atravessou parede ' + after);
    await walk(p, 'ArrowRight', 7 - after[0]); await walk(p, 'ArrowDown', 3);
    await key(p, 'KeyZ'); await idle(p);
    await walk(p, 'ArrowUp', 3); await walk(p, 'ArrowRight', 1); await key(p, 'ArrowUp'); await sleep(200);
    await key(p, 'KeyZ'); await idle(p);
    const f = await ev(p, () => RPG.State.s.flags);
    if (!f.leu_carta || !f.pegou_lamparina) throw new Error('flags ' + JSON.stringify(f));
    await walk(p, 'ArrowLeft', 2); await walk(p, 'ArrowDown', 5);
    await waitFor(p, () => RPG.State.s.mapId === 'quintal');
    await waitFor(p, () => RPG.State.s.party.includes('brisa') && RPG.Events.running === 0, 60000);
    return 'início ' + start + ' → colisão ' + after + ' → quintal com Brisa; missão: ' + JSON.stringify(await ev(p, () => RPG.State.s.quests.q_despertar.steps));
  });

  await scenario('portas: entrar e sair da Padaria; conversar; missão; loja', async (p) => {
    await boot(p, 'debug=1&map=vila&x=6&y=17&party=lume,brisa&phase=1&flags=prefeito_fase1&money=100');
    await p.evaluate(BOT);
    await walk(p, 'ArrowUp', 1); // em frente
    await walk(p, 'ArrowUp', 1); // porta
    await waitFor(p, () => RPG.State.s.mapId === 'padaria');
    await idle(p);
    // ir até o balcão: Broa em (4,3), balcão linha 4 -> ficar em (4,5) olhando para cima
    const pos = await ev(p, () => [RPG.World.player.x, RPG.World.player.y]);
    await walk(p, 'ArrowUp', pos[1] - 5); await walk(p, 'ArrowLeft', pos[0] - 4); await key(p, 'ArrowUp'); await sleep(150);
    await ev(p, () => { window.__choice = 1; });
    await key(p, 'KeyZ'); await idle(p);
    const q = await ev(p, () => RPG.Quests.status('q_receita'));
    // loja: escolha 0 (Comprar)
    await ev(p, () => { window.__choice = 0; });
    await key(p, 'KeyZ');
    await waitFor(p, () => RPG.Scenes.top().constructor.name === 'ShopScene');
    await sleep(200);
    await key(p, 'KeyZ'); // Comprar
    await key(p, 'KeyZ'); // primeiro item
    await key(p, 'ArrowRight'); // qtd 2
    await key(p, 'KeyZ');
    const inv = await ev(p, () => ({ b: RPG.Inventory.count('biscoito'), money: RPG.State.s.money }));
    await key(p, 'KeyX'); await key(p, 'KeyX');
    await idle(p);
    // sair
    const pos2 = await ev(p, () => [RPG.World.player.x, RPG.World.player.y]);
    await walk(p, 'ArrowRight', 6 - pos2[0]); await walk(p, 'ArrowDown', 8 - pos2[1]);
    await waitFor(p, () => RPG.State.s.mapId === 'vila');
    const back = await ev(p, () => [RPG.World.player.x, RPG.World.player.y]);
    if (q !== 'active' || inv.b !== 2 || inv.money !== 84) throw new Error(JSON.stringify({ q, inv }));
    return 'receita=' + q + ', comprou 2 biscoitos (botões 100→' + inv.money + '), saiu em ' + back;
  });

  await scenario('usar item pelo menu (biscoito cura)', async (p) => {
    await boot(p, 'debug=1&map=vila&x=21&y=14&party=lume&items=biscoito:2');
    await ev(p, () => { RPG.Party.member('lume').hp = 10; });
    await key(p, 'KeyX'); await sleep(200);
    await key(p, 'KeyZ'); await sleep(200); // Itens
    await key(p, 'KeyZ'); await sleep(200); // biscoito
    await key(p, 'KeyZ'); await sleep(300); // alvo Lume
    const r = await ev(p, () => ({ hp: RPG.Party.member('lume').hp, n: RPG.Inventory.count('biscoito') }));
    if (r.hp !== 45 || r.n !== 1) throw new Error(JSON.stringify(r));
    return 'VIDA 10→45, biscoitos 2→1';
  });

  async function bossTest(p, troop, extra = '') {
    await boot(p, 'debug=1&speed=4&map=vila&x=21&y=14&party=lume,brisa,toco,nina&level=' + extra);
    await p.evaluate(BOT);
    await ev(p, () => { window.__botSkills = true; });
    const t0 = Date.now();
    const res = await p.evaluate((tr) => new Promise((resolve) => { RPG.Events.run([['battle', tr, { canLose: true }], ['var', '_fim', '=', 1]]).then(() => resolve(RPG.State.s.vars._battle)); }), troop);
    return { res, secs: Math.round((Date.now() - t0) / 1000) };
  }
  await scenario('chefe 1: Mamãe Raiz (nível 6)', async (p) => { const r = await bossTest(p, 'chefe_raiz', 6); return JSON.stringify(r); });
  await scenario('chefe 2: A Coisa no Fundo (nível 8)', async (p) => { const r = await bossTest(p, 'chefe_fundo', 8); return JSON.stringify(r); });
  await scenario('chefe 3: Dona Ninguém (nível 10)', async (p) => { const r = await bossTest(p, 'chefe_ninguem', 10); return JSON.stringify(r); });
  await scenario('chefe final: O Apagador (nível 13, escolha ACENDER)', async (p) => {
    const r = await bossTest(p, 'chefe_final', 13);
    if (r.res !== 'win') throw new Error(JSON.stringify(r));
    return JSON.stringify(r);
  });

  await scenario('história completa: todos os eventos principais em ordem', async (p) => {
    await boot(p, 'debug=1&speed=4&map=prefeitura&x=8&y=5&party=lume,brisa&level=14');
    await p.evaluate(BOT);
    await ev(p, () => { window.__botSkills = true; window.__choice = 0; RPG.State.setFlag('leu_carta'); RPG.State.setFlag('pegou_lamparina'); RPG.State.setFlag('brisa_entrou'); });
    const run = async (sc, map, x, y) => {
      if (map) await ev(p, ([m, xx, yy]) => { RPG.Events.reset(); RPG.World.load(m, xx, yy, 'up'); }, [map, x, y]);
      await p.evaluate((sc) => RPG.Events.run(sc), sc);
      await idle(p, 240000);
    };
    const log = [];
    const chk = async (label, fn) => { const v = await ev(p, fn); log.push(label + ':' + (v ? '✓' : '✗')); if (!v) throw new Error(label + ' falhou; ' + log.join(' ')); };
    await run('prefeito_falar'); await chk('falou_prefeito', () => RPG.State.flag('falou_prefeito') && RPG.Quests.status('q_amigos') === 'active');
    await run('padaria_toco', 'padaria', 11, 4); await chk('toco', () => RPG.State.s.party.includes('toco'));
    await run('biblio_nina', 'biblioteca', 10, 6); await chk('nina', () => RPG.State.s.party.includes('nina'));
    await run('prefeito_falar', 'prefeitura', 8, 5); await chk('fase1', () => RPG.State.phase() === 1 && RPG.Inventory.has('mapa') && RPG.Quests.status('q_amigos') === 'done');
    await run('raiz_chefe', 'coracao', 11, 10); await chk('brasa1', () => RPG.Inventory.has('brasa_floresta') && RPG.State.phase() === 2);
    await run('fundo_chefe', 'gruta_fundo', 9, 10); await chk('brasa2', () => RPG.Inventory.has('brasa_aguas') && RPG.State.phase() === 3);
    await ev(p, () => { RPG.Events.reset(); RPG.World.load('vila', 21, 19, 'up'); });
    await idle(p, 60000); await chk('cena_noite', () => RPG.State.flag('cena_noite'));
    await ev(p, () => { RPG.Events.reset(); RPG.World.load('abandonada', 5, 8, 'up'); }); await sleep(500); await idle(p);
    await run('aband_toca'); await run('aband_telefone');
    for (let i = 0; i < 3; i++) await run('aband_loop');
    await run('aband_chave'); await chk('chave', () => RPG.Inventory.has('chave_porao'));
    await ev(p, () => { RPG.Events.reset(); RPG.World.load('bairro', 3, 9, 'down'); }); await sleep(500); await idle(p);
    await ev(p, () => { RPG.State.setFlag('casa7_entrou'); RPG.State.setFlag('entrou_bairro'); RPG.State.setFlag('aband_entrou'); });
    await run('casa7_chefe', 'casa7', 10, 5); await chk('brasa3', () => RPG.Inventory.has('brasa_esquecida') && RPG.State.phase() === 4);
    await run('casa7_leito');
    await waitFor(p, () => RPG.State.flag('cena_ponte'), 60000); await idle(p, 60000);
    await chk('volta_vila', () => RPG.State.s.mapId === 'vila' && RPG.State.flag('cena_ponte'));
    await run('rochedo_pedestal', 'rochedo', 13, 7); await chk('pedestais', () => RPG.State.flag('brasas_no_farol') && RPG.Quests.status('q_farol') === 'done');
    await run('farol_memorias', 'farol_base', 7, 3);
    await run('topo_chefe', 'farol_topo', 7, 9);
    await waitFor(p, () => RPG.State.flag('arco1_completo') && RPG.State.s.mapId === 'arvore', 240000);
    await idle(p, 60000);
    await chk('final', () => RPG.State.flag('farol_aceso') && RPG.State.flag('arco1_completo') && RPG.State.phase() === 5 && RPG.State.s.mapId === 'arvore' && RPG.Settings.get('cleared'));
    await chk('missoes', () => ['q_despertar', 'q_amigos', 'q_farol', 'q_ultima_chama'].map((q) => RPG.Quests.status(q)).filter((x) => x === 'done').length >= 3);
    return log.join(' ');
  });

  await scenario('derrota → tela de fim → tentar de novo', async (p) => {
    await boot(p, 'debug=1&map=vila&x=21&y=14&party=lume');
    await p.evaluate(BOT);
    await ev(p, () => { RPG.Party.member('lume').hp = 1; RPG.Events.run([['battle', 'chefe_raiz']]); });
    await waitFor(p, () => RPG.Scenes.top().constructor.name === 'GameOverScene', 60000);
    await sleep(1500);
    await key(p, 'KeyZ');
    await waitFor(p, () => RPG.Battle.current && RPG.Battle.current.round >= 1, 15000);
    const hp = await ev(p, () => RPG.Battle.current.party[0].hp);
    if (hp !== 1) throw new Error('hp restaurado errado ' + hp);
    return 'Game Over exibido; nova tentativa começou com o estado de antes da luta';
  });

  await scenario('fugir de batalha comum', async (p) => {
    await boot(p, 'debug=1&map=campos&x=30&y=15&party=lume,brisa');
    await p.evaluate(BOT);
    await ev(p, () => { window.__botFlee = true; });
    const r = await p.evaluate(() => new Promise((res) => RPG.Events.run([['battle', 'pirulinhos', { canLose: true }]]).then(() => res(RPG.State.s.vars._battle))));
    return 'resultado: ' + r;
  });

  await scenario('salvar, recarregar a página, continuar (progresso preservado)', async (p) => {
    await boot(p, 'debug=1&map=vila&x=21&y=14&party=lume,brisa,toco&money=77&items=coxinha:3');
    await ev(p, () => { RPG.State.setFlag('teste_persistencia'); RPG.State.s.vars.phase = 2; RPG.Quests.start('q_gato'); RPG.Save.write('2'); });
    await p.goto(BASE + 'index.html');
    await waitFor(p, () => window.RPG && RPG.Scenes.top() && RPG.Scenes.top().constructor.name === 'TitleScene');
    const cont = await ev(p, () => !RPG.Scenes.top().list.items[0].disabled);
    await sleep(800);
    await key(p, 'KeyZ'); await sleep(400); await key(p, 'KeyZ');
    await waitFor(p, () => RPG.World.map && RPG.Scenes.top().constructor.name === 'WorldScene');
    const s = await ev(p, () => ({ map: RPG.State.s.mapId, x: RPG.World.player.x, y: RPG.World.player.y, party: RPG.State.s.party, money: RPG.State.s.money, cox: RPG.Inventory.count('coxinha'), flag: RPG.State.flag('teste_persistencia'), gato: RPG.Quests.status('q_gato'), phase: RPG.State.s.vars.phase }));
    if (!cont || s.money !== 77 || s.cox !== 3 || !s.flag || s.gato !== 'active' || s.party.length !== 3 || s.x !== 21) throw new Error(JSON.stringify(s));
    return JSON.stringify(s);
  });

  await scenario('save corrompido não é apagado; versão futura é recusada', async (p) => {
    await boot(p);
    const r = await ev(p, () => {
      localStorage.setItem('vagalume.save.3', '{isso não é json');
      localStorage.setItem('vagalume.save.1', JSON.stringify({ format: 'vagalume-save', version: 999, state: {} }));
      const a = RPG.Save.read('3'), b = RPG.Save.read('1');
      return { a: a.status, b: b.status, berr: b.error, still: localStorage.getItem('vagalume.save.3') };
    });
    if (r.a !== 'corrupt' || r.b !== 'corrupt' || !r.still) throw new Error(JSON.stringify(r));
    return JSON.stringify(r);
  });

  await scenario('exportar e importar save (arquivo JSON)', async (p) => {
    await boot(p, 'debug=1&map=vila&x=21&y=14&party=lume,brisa&money=55');
    await ev(p, () => RPG.Save.write('1'));
    const [dl] = await Promise.all([p.waitForEvent('download'), ev(p, () => RPG.Save.exportSlot('1'))]);
    const file = path.join(os.tmpdir(), 'vagalume-teste.json');
    await dl.saveAs(file);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    await ev(p, () => localStorage.removeItem('vagalume.save.1'));
    p.once('filechooser', (fc) => fc.setFiles(file));
    const res = await ev(p, () => RPG.Save.pickFile());
    await ev(p, (raw) => RPG.Save.importTo('3', raw), res.raw);
    const back = await ev(p, () => RPG.Save.read('3').data.state.money);
    if (!res.ok || back !== 55) throw new Error(JSON.stringify(res).slice(0, 200));
    return 'arquivo ' + path.basename(file) + ' (' + json.format + ' v' + json.version + ') importado no espaço 3';
  });

  await scenario('enigmas: corujas, livros coloridos e pedras/placas', async (p) => {
    await boot(p, 'debug=1&map=floresta&x=19&y=16&party=lume,nina');
    await p.evaluate(BOT);
    await idle(p);
    // corujas: começam 2,1,3 → girar A duas vezes, B uma vez
    for (const s of ['floresta_coruja1', 'floresta_coruja1', 'floresta_coruja2']) {
      await ev(p, () => { window.__choice = 0; });
      await p.evaluate((sc) => RPG.Events.run(sc), s); await idle(p);
    }
    const owl = await ev(p, () => RPG.State.flag('floresta_portao'));
    // livros
    await ev(p, () => { RPG.Events.reset(); RPG.World.load('biblioteca', 7, 8, 'up'); });
    for (const c of ['azul', 'verde', 'vermelho', 'amarelo']) { await ev(p, () => { window.__choice = 0; }); await p.evaluate((sc) => RPG.Events.run(sc), 'biblio_livro_' + c); await idle(p); }
    const books = await ev(p, () => RPG.State.flag('biblio_secreta'));
    // pedras na gruta
    await ev(p, () => { RPG.Events.reset(); RPG.World.load('gruta', 6, 16, 'down'); });
    await sleep(300);
    await walk(p, 'ArrowDown', 2); // empurra pedra1 até (6,19)
    await walk(p, 'ArrowUp', 2); await walk(p, 'ArrowRight', 3); await walk(p, 'ArrowDown', 2); // (9,18)
    await walk(p, 'ArrowRight', 2); // pedra2 → (12,18)
    await walk(p, 'ArrowUp', 1); await walk(p, 'ArrowRight', 1); await walk(p, 'ArrowDown', 1); // empurra p/ (12,19)
    await idle(p);
    const gate = await ev(p, () => RPG.State.flag('gruta_portao'));
    if (!owl || !books || !gate) throw new Error(JSON.stringify({ owl, books, gate }));
    return 'corujas ✓ livros ✓ pedras ✓';
  });

  await scenario('subdiretório + validação de dados sem erros', async (p) => {
    await boot(p);
    const v = await ev(p, () => RPG.Validate.run());
    const src = await ev(p, () => RPG.Data.source);
    if (v.errors.length) throw new Error(v.errors.slice(0, 5).join('; '));
    return 'dados via ' + src + ', 0 erros de referência, ' + v.warnings.length + ' avisos';
  });

  await scenario('abrir direto do arquivo (file://) usa data/bundle.js', async (p) => {
    const local = 'file://' + path.resolve(__dirname, '..', 'index.html');
    await p.goto(local);
    await waitFor(p, () => window.RPG && window.RPG.DB && window.RPG.Scenes.stack.length > 0, 15000);
    return 'fonte de dados: ' + (await ev(p, () => RPG.Data.source));
  });

  await scenario('celular retrato (390x844) com controles de toque', async (p) => {
    await p.setViewportSize({ width: 390, height: 844 });
    await boot(p, 'debug=1&map=vila&x=21&y=14');
    await ev(p, () => RPG.Settings.set('touch', 'on'));
    await sleep(300);
    const r = await ev(p, () => { const c = document.getElementById('screen').getBoundingClientRect(); return { w: c.width, h: c.height, left: c.left, right: c.right, touch: document.getElementById('touch').classList.contains('show') }; });
    const btn = await p.$('[data-act="right"]');
    const x0 = await ev(p, () => RPG.World.player.x);
    const bb = await btn.boundingBox();
    await p.mouse.move(bb.x + 5, bb.y + 5); await p.mouse.down(); await sleep(150); await p.mouse.up(); await sleep(400);
    const x1 = await ev(p, () => RPG.World.player.x);
    if (r.right > 391 || r.left < -1 || !r.touch || x1 !== x0 + 1) throw new Error(JSON.stringify({ r, x0, x1 }));
    await p.screenshot({ path: path.join(os.tmpdir(), 'vagalume-mobile.png') });
    return 'canvas ' + Math.round(r.w) + 'x' + Math.round(r.h) + ' cabe na tela; botão ▶ moveu o jogador';
  });

  const fails = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - fails) + '/' + results.length + ' cenários passaram.');
  process.exit(fails ? 1 : 0);
})();
