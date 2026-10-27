/* VAGALUME — IA de inimigos, efeitos especiais e "cérebros" de chefes.
 *  MAMÃE RAIZ: casca dura (DEF alta) que só racha quando ela fica IRRITADA; brotinhos que a curam;
 *              na segunda fase chora seiva (fica ABATIDA) e enraíza um amigo.
 *  A COISA NO FUNDO: maré que sobe a cada rodada (na 4ª, MARÉ ALTA atinge todos); a ISCA DE LUZ
 *              pode ser destruída para baixar a maré e atordoar o monstro; corpo submerso resiste.
 *  DONA NINGUÉM: troca de máscara (FELIZ > TRISTE > IRRITADO) a cada 2 rodadas e fica imune a quem
 *              estiver em desvantagem emocional; faz esquecer habilidades; sem máscaras, age 2x.
 *  O APAGADOR: apaga emoções, escurece a arena (LUME pode ERGUER AS BRASAS), e no fim não pode
 *              ser vencido pela força: é preciso escolher ACENDER. */
(function () {
  'use strict';
  const R = window.RPG;
  const U = R.U;
  const E = R.Emotions;

  function condOK(c, b, u) {
    if (!c) return true;
    for (const part of [].concat(c)) {
      let s = String(part), neg = false;
      if (s[0] === '!') { neg = true; s = s.slice(1); }
      let ok = true;
      let m;
      if ((m = s.match(/^hp([<>])(\d+)$/))) ok = m[1] === '<' ? u.hp / u.mhp * 100 < +m[2] : u.hp / u.mhp * 100 > +m[2];
      else if ((m = s.match(/^round%(\d+)=(\d+)$/))) ok = b.round % +m[1] === +m[2];
      else if ((m = s.match(/^round([<>])(\d+)$/))) ok = m[1] === '<' ? b.round < +m[2] : b.round > +m[2];
      else if ((m = s.match(/^allies([<>])(\d+)$/))) { const n = b.aliveEnemies().length; ok = m[1] === '<' ? n < +m[2] : n > +m[2]; }
      else if ((m = s.match(/^foeEmotion:(\w+)$/))) ok = b.aliveParty().some((p) => p.emotion.type === m[1]);
      else if ((m = s.match(/^self:(\w+)$/))) ok = (u.emotion.type || 'neutro') === m[1];
      else if ((m = s.match(/^flag:(\w+)$/))) ok = !!u.flags && !!u.flags[m[1]];
      else ok = true;
      if (neg) ok = !ok;
      if (!ok) return false;
    }
    return true;
  }

  const AI = (R.BattleAI = {
    condOK,
    choose(b, u) {
      const acts = (u.def.ai || [{ skill: 'atacar', w: 1 }]).filter((a) => condOK(a.cond, b, u));
      if (!acts.length) return null;
      let tot = acts.reduce((s, a) => s + (a.w || 1), 0);
      let r = Math.random() * tot;
      let pick = acts[0];
      for (const a of acts) { r -= a.w || 1; if (r <= 0) { pick = a; break; } }
      const def = pick.skill === 'atacar' ? R.Battle.BASIC : R.DB.skills.skills[pick.skill];
      if (!def) return null;
      let target;
      if (def.target === 'ally') target = b.aliveEnemies().sort((x, y) => x.hp / x.mhp - y.hp / y.mhp)[0];
      return { skill: def, target };
    },
    brain(id, b) {
      const B = BRAINS[id];
      if (!B) { R.Log.warn('Cérebro de chefe inexistente: ' + id); return null; }
      return B(b);
    },
    specials: {},
  });

  // ------------------------------------------------------------- especiais
  const SP = AI.specials;
  SP.summon = async (b, u, t, e) => {
    const n = b.aliveEnemies().filter((x) => x.key === e.enemy).length;
    if (n >= (e.max || 2)) { await b.say('...mas nada aconteceu.', 500); return; }
    const nu = b.addEnemy(e.enemy);
    R.Audio.sfx('pop');
    await b.say(nu.name + ' apareceu!', 650);
  };
  SP.randomEmotion = async (b, u, t) => { b.applyEmotion(t, U.choice(['feliz', 'triste', 'irritado']), 1); await b.wait(200); };
  SP.stealLaco = async (b) => { if (b.laco > 0) { b.laco = 0; R.Audio.sfx('debuff'); await b.say('O LAÇO de vocês foi esquecido...', 700); } };
  SP.lampejo = async (b, u) => {
    const fams = new Set(b.aliveParty().map((p) => p.emotion.type).filter((x) => x && x !== 'medo'));
    const power = 1.4 + fams.size * 0.6;
    b.msg2 = fams.size ? fams.size + ' sentimento(s) diferentes no grupo: poder x' + power.toFixed(1) : 'Sem emoções no grupo...';
    for (const t of b.aliveEnemies()) {
      const r = b.calcDamage(u, t, power, { sureHit: true });
      await b.dealDamage(t, r.dmg, { crit: r.crit, adv: r.adv, attacker: u });
      await b.wait(120);
    }
  };
  SP.homeRun = async (b, u, t) => {
    const angry = u.emotion.type === 'irritado';
    const power = angry ? 2.2 + 0.4 * u.emotion.tier : 1.0;
    b.msg2 = angry ? 'Com raiva, a tacada vai longe!' : 'Faltou raiva para a tacada perfeita...';
    const r = b.calcDamage(u, t, power, { ignoreDef: angry, sureHit: angry });
    if (r.miss) { b.popup(t, 'ERROU', '#c8c2d8'); return; }
    await b.dealDamage(t, r.dmg, { crit: r.crit, adv: r.adv, attacker: u });
  };
  SP.pontoFinal = async (b, u, t) => {
    const had = t.emotion.type && t.emotion.type !== 'medo';
    if (had) { const tier = t.emotion.tier; b.applyEmotion(t, 'neutro'); const r = b.calcDamage(u, t, 0.6 + tier * 0.35, { sureHit: true }); await b.dealDamage(t, r.dmg, { attacker: u }); }
    else { const r = b.calcDamage(u, t, 0.5, {}); if (!r.miss) await b.dealDamage(t, r.dmg, { attacker: u }); }
  };
  SP.tideUp = async (b, u, t, e) => { if (b.tide) { b.tide.level = Math.min(4, b.tide.level + (e.amount || 1)); R.Audio.sfx('tide'); await b.say('A água sobe!', 600); } };
  SP.cobertor = async (b) => { b.darkness = Math.min(0.8, (b.darkness || 0) + 0.2); };

  // ------------------------------------------------------------- tutorial
  R.BattleTutorial = {
    async start(b) {
      await b.speak('brisa:feliz', [
        'Opa, um PIRULINHO! Bora mostrar pra ele, LUME!',
        'Lembra como é? A cada rodada, cada um escolhe o que fazer: {yellow}ATACAR{/}, {yellow}HABILIDADE{/}, {yellow}ITEM{/} ou {yellow}DEFENDER{/}.',
        'Depois todo mundo age, do mais rápido pro mais lento. Habilidades gastam {yellow}BRILHO{/}.',
      ]);
      await b.speak('brisa', [
        'E não esquece das {yellow}EMOÇÕES{/}! {yellow}FELIZ{/} vence {red}IRRITADO{/}, {red}IRRITADO{/} vence {blue}TRISTE{/}, e {blue}TRISTE{/} vence {yellow}FELIZ{/}.',
        'Quem tem vantagem bate mais forte. A cor do retrato mostra como cada um tá se sentindo.',
        'E quando a gente ataca, o {pink}LAÇO{/} enche. Com 3 pontos, dá pra chamar um amigo pra um {pink}COMBO{/}!',
      ]);
    },
  };

  // ================================================================= chefes
  const BRAINS = {};

  // ------------------------------------------------------------ Mamãe Raiz
  BRAINS.mamae_raiz = (b) => {
    const boss = () => b.enemies.find((e) => e.key === 'mamae_raiz');
    let phase = 1, hinted = false;
    return {
      async onStart() {
        await b.speak('?:MAMÃE RAIZ', ['Meus filhos... alguém levou a luzinha dos meus filhos...', 'Vocês também vieram me deixar sozinha?']);
      },
      async onRoundStart() {
        const m = boss();
        if (!m || !m.alive()) return;
        if (b.round === 2 && !hinted && m.emotion.type !== 'irritado') {
          hinted = true;
          const nina = b.party.find((p) => p.id === 'nina' && p.alive());
          await b.speak(nina ? 'nina' : 'brisa', ['A casca dela é dura demais... Se ela ficasse {red}IRRITADA{/}, a casca ia rachar!']);
        }
      },
      choose(u) {
        if (u.key === 'brotinho') return { skill: R.DB.skills.skills.e_cutucada };
        const S = R.DB.skills.skills;
        if (b.round % 3 === 0 && b.aliveEnemies().filter((e) => e.key === 'brotinho').length < 2) return { skill: S.b_brotar };
        if (phase === 2 && Math.random() < 0.3) return { skill: S.b_enraizar };
        return { skill: U.choice([S.b_galhada, S.b_galhada, S.b_raizes, phase === 2 ? S.b_lagrimas_seiva : S.b_cantiga_folhas]) };
      },
      modifyDamage(att, t, dmg) {
        // casca grossa: só racha quando ela está irritada
        if (t.key === 'mamae_raiz' && t.emotion.type !== 'irritado') { if (Math.random() < 0.35) b.msg2 = 'A casca grossa amortece o golpe...'; return dmg * 0.7; }
        return dmg;
      },
      async onDamaged(t) {
        if (t.key === 'mamae_raiz' && phase === 1 && t.hp < t.mhp * 0.5 && t.hp > 0) {
          phase = 2;
          await b.wait(300);
          await b.speak('?:MAMÃE RAIZ', ['Por que dói tanto... cuidar de alguém?']);
          b.applyEmotion(t, 'triste', 2);
          await b.say('A MAMÃE RAIZ chora seiva. Ela ficou ABATIDA!', 900);
        }
      },
      async onRoundEnd() {
        const m = boss();
        if (!m || !m.alive()) return;
        for (const s of b.aliveEnemies().filter((e) => e.key === 'brotinho')) {
          const h = Math.round(m.mhp * 0.035);
          m.hp = Math.min(m.mhp, m.hp + h);
          b.popup(m, '+' + h, R.THEME.good);
          b.msg2 = 'O BROTINHO deu seiva para a MAMÃE RAIZ.';
          void s;
          await b.wait(300);
        }
      },
      variant(u) { return u.key === 'mamae_raiz' ? (u.emotion.type === 'triste' ? 'triste' : u.emotion.type === 'irritado' ? 'irritada' : '') : ''; },
    };
  };

  // ---------------------------------------------------- A Coisa no Fundo
  BRAINS.coisa_fundo = (b) => {
    const body = () => b.enemies.find((e) => e.key === 'coisa_fundo');
    const lure = () => b.enemies.find((e) => e.key === 'isca' && e.alive() && !e.gone);
    b.tide = { level: 0, regrow: 0 };
    let stunned = 0;
    return {
      async onStart() {
        await b.speak('?:A COISA NO FUNDO', ['Shhh... Aqui embaixo é quietinho.', 'Ninguém precisa acordar. Ninguém precisa {blue}lembrar{/}.']);
        await b.say('A ISCA DE LUZ balança. A maré começa a subir...', 900);
      },
      async onRoundStart() {
        if (b.tide.level >= 4) {
          b.tide.level = 0;
          R.Audio.sfx('tide');
          R.Screen.shake(4, 0.6);
          await b.say('MARÉ ALTA! A água fria cobre todo mundo!', 900);
          const m = body();
          for (const p of b.aliveParty()) {
            const r = b.calcDamage(m, p, 1.1, { sureHit: true, noCrit: true });
            await b.dealDamage(p, r.dmg, { attacker: m });
            if (p.alive()) b.applyEmotion(p, 'triste', 1, null, true);
            await b.wait(120);
          }
        }
        if (b.tide.regrow > 0) {
          b.tide.regrow--;
          if (b.tide.regrow === 0 && !lure()) {
            const old = b.enemies.find((e) => e.key === 'isca');
            if (old) { b.enemies.splice(b.enemies.indexOf(old), 1); }
            b.addEnemy('isca');
            await b.say('Uma nova ISCA DE LUZ acende no escuro.', 800);
          }
        }
      },
      actionsFor(u) { return u.key === 'isca' ? 0 : 1; },
      choose(u) {
        if (u.key === 'isca') return 'skip';
        if (stunned > 0) return 'skip';
        const S = R.DB.skills.skills;
        const low = u.hp < u.mhp * 0.3;
        if (low && Math.random() < 0.35) return { skill: S.b_afundar };
        return { skill: U.choice([S.b_abraco_gelado, S.b_abraco_gelado, S.b_canto_fundo, S.b_engolir_luz, S.b_bolha]) };
      },
      async onKnockout(u) {
        if (u.key === 'isca') {
          u.anim.dying = 0.01;
          R.Audio.sfx('enemyDie');
          b.tide.level = 0;
          b.tide.regrow = 3;
          stunned = 2;
          const m = body();
          await b.say('A ISCA se apagou! A maré baixa e A COISA se debate, confusa!', 1000);
          if (m) m.status.atordoado = 1;
          return true;
        }
        return false;
      },
      modifyDamage(att, t, dmg) {
        if (t.key === 'coisa_fundo' && !t.status.atordoado && stunned <= 0) { if (Math.random() < 0.3) b.msg2 = 'O corpo submerso amortece o golpe.'; return dmg * 0.6; }
        if (t.key === 'coisa_fundo') return dmg * 1.25;
        return dmg;
      },
      async onRoundEnd() {
        if (stunned > 0) stunned--;
        if (lure()) {
          b.tide.level++;
          R.Audio.sfx('tide');
          b.msg2 = b.tide.level >= 4 ? 'A maré está no limite!' : 'A maré sobe... (' + b.tide.level + '/4)';
          await b.wait(400);
        }
      },
      variant(u) { return u.key === 'coisa_fundo' && (u.status.atordoado || stunned > 0) ? 'atordoada' : ''; },
      isStunned() { return stunned > 0; },
    };
  };

  // -------------------------------------------------------- Dona Ninguém
  BRAINS.dona_ninguem = (b) => {
    const boss = () => b.enemies.find((e) => e.key === 'dona_ninguem');
    const ORDER = ['feliz', 'triste', 'irritado'];
    let mi = 0, broken = false, nextSwap = 2;
    const setMask = (m) => { const d = boss(); d.mask = m; d.emotion = { type: m, tier: 2, turns: 0 }; };
    return {
      async onStart() {
        setMask(ORDER[0]);
        await b.speak('?:DONA NINGUÉM', ['Ah. Visita. Ninguém vem visitar a Dona Ninguém.', 'Vocês trouxeram uma cara nova pra mim? Eu tenho {yellow}tantas{/}...']);
        await b.say('Ela usa uma máscara FELIZ. Quem estiver IRRITADO não vai conseguir feri-la.', 1100);
      },
      async onRoundStart() {
        const d = boss();
        if (!d || !d.alive() || broken) return;
        if (b.round === nextSwap) await b.say('A máscara dela começa a rachar...', 700);
        if (b.round === nextSwap + 1) {
          mi = (mi + 1) % 3;
          nextSwap = b.round + 2;
          setMask(ORDER[mi]);
          R.Audio.sfx('mask');
          const weak = Object.keys(E.BEATS).find((k) => E.BEATS[k] === ORDER[mi]);
          const imm = E.BEATS[ORDER[mi]];
          await b.say('Nova máscara: ' + E.LABEL[ORDER[mi]][0] + '! Imune a quem está ' + E.LABEL[imm][0] + '; frágil contra ' + E.LABEL[weak][0] + '.', 1300);
        }
      },
      actionsFor(u) { return u.key === 'dona_ninguem' && broken ? 2 : 1; },
      choose(u) {
        const S = R.DB.skills.skills;
        if (u.key !== 'dona_ninguem') return null;
        const mannequins = b.aliveEnemies().filter((e) => e.key === 'manequim').length;
        if (b.round % 4 === 2 && mannequins < 2) return { skill: S.b_visita };
        if (Math.random() < 0.22) return { skill: S.b_esquecer };
        if (Math.random() < 0.15 && b.laco >= 3) return { skill: S.b_ninguem_lembra };
        return { skill: U.choice([S.b_tapa, S.b_tapa, S.b_mascarar]) };
      },
      modifyDamage(att, t, dmg, info) {
        if (t.key !== 'dona_ninguem') return dmg;
        if (broken) return dmg * 1.3;
        if (info.adv < 0) { b.msg2 = 'A máscara ri do golpe. Nenhum efeito!'; return 0.4; }
        return dmg;
      },
      onEmotion(t, r) {
        // a máscara impõe a emoção dela
        if (t.key === 'dona_ninguem' && !broken && t.mask && r.after.type !== t.mask) { t.emotion = { type: t.mask, tier: 2, turns: 0 }; b.msg2 = 'A máscara não deixa a expressão mudar.'; }
      },
      async onDamaged(t) {
        if (t.key === 'dona_ninguem' && !broken && t.hp < t.mhp * 0.3 && t.hp > 0) {
          broken = true;
          t.mask = null;
          t.emotion = E.none();
          R.Audio.sfx('glitch');
          R.Glitch.trigger(400, 1);
          await b.speak('?:DONA NINGUÉM', ['Não... não olha pra mim sem máscara...', '{shake}NÃO TEM NINGUÉM AQUI.{/}']);
          await b.say('As máscaras caíram. Ela age duas vezes, mas fica frágil!', 1000);
        }
      },
      variant(u) { return u.key === 'dona_ninguem' ? (u.mask || '') : ''; },
    };
  };

  // ------------------------------------------------------------- Apagador
  BRAINS.apagador = (b) => {
    const boss = () => b.enemies.find((e) => e.key === 'apagador');
    let phase = 1, brasaCooldown = 0, stay = 0, lit = false, brasaTurns = 0;
    return {
      async onStart() {
        await b.speak('apagador', ['Você não precisa acender.', 'Fica. Aqui ninguém vai embora. Aqui o Vô ainda está no farol...', '...você só não consegue ver ele.']);
        await b.speak('brisa:irritado', ['Sai da frente dela!']);
        await b.speak('nina:triste', ['Ele... está com medo, Lume. Igual a você.']);
        await b.speak('toco', ['A gente tá aqui. Do teu lado.']);
      },
      async onRoundStart() {
        const a = boss();
        if (brasaCooldown > 0) brasaCooldown--;
        if (brasaTurns > 0) { brasaTurns--; if (brasaTurns === 0 && phase === 2) { b.darkness = 0.75; await b.say('A escuridão volta a se fechar...', 700); } }
        if (phase === 1 && a.hp < a.mhp * 0.6) {
          phase = 2;
          b.darkness = 0.75;
          R.Audio.sfx('darkness');
          await b.say('Todas as luzes se apagam. Golpes no escuro perdem força.', 1000);
          await b.speak('lume', ['(As brasas no meu bolso... ainda estão quentes.)']);
        }
      },
      commandOverride(u) {
        if (phase === 3) {
          if (u.id === 'lume') return { only: true, options: [{ label: 'ACENDER', special: 'acender' }, { label: 'FICAR', special: 'ficar' }] };
          return { only: true, options: [{ label: 'SEGURAR A MÃO', special: 'mao' }] };
        }
        if (phase === 2 && u.id === 'lume') return { options: [{ label: 'BRASAS', special: 'brasas', disabled: brasaCooldown > 0, hint: brasaCooldown > 0 ? 'Recarregando (' + brasaCooldown + ')' : 'Erguer as três brasas: afasta a escuridão' }] };
        return null;
      },
      async performSpecial(u, id) {
        const a = boss();
        if (id === 'brasas') {
          brasaCooldown = 3;
          brasaTurns = 2;
          b.darkness = 0;
          R.Audio.sfx('lightup');
          R.Screen.flash('#fff2a8', 0.7);
          await b.say('LUME ergue as três BRASAS! A escuridão recua!', 900);
          for (const p of b.aliveParty()) { const h = Math.round(p.mhp * 0.2); p.hp = Math.min(p.mhp, p.hp + h); b.popup(p, '+' + h, R.THEME.good); }
          a.status.atordoado = 1;
          b.popup(a, 'OFUSCADO', '#fff6b0');
          await b.wait(500);
        } else if (id === 'mao') {
          b.addLaco(2);
          u.defending = true;
          await b.say(u.name + ' segura a mão de LUME.', 700);
        } else if (id === 'ficar') {
          stay++;
          await R.Screen.fadeOut(700, '#05030a');
          R.Audio.sfx('darkness');
          await b.wait(600);
          a.hp = Math.min(a.mhp, a.hp + Math.round(a.mhp * 0.1));
          await R.Screen.fadeIn(700);
          if (stay === 1) await b.speak('apagador', ['Isso. Fecha os olhos. Está tão quentinho aqui...']);
          if (stay === 1) await b.speak('brisa:triste2', ['LUME! Não! Não vai embora de novo!']);
          if (stay >= 2) { await b.speak('?:???', ['{slow}...Acende, meu bem. O Vô tá vendo.{/}']); }
        } else if (id === 'acender') {
          lit = true;
          await this.finale();
        }
      },
      async finale() {
        const a = boss();
        R.Audio.playMusic(null, 300);
        await b.speak('lume', ['...Eu tenho medo de acordar.', 'Mas eu tenho mais medo de esquecer.']);
        await b.speak('apagador', ['Se você acender... vai ter que saber.', 'Vai ter que saber que ele não vai voltar.']);
        await b.speak('lume', ['Eu sei.', 'Eu sei, Vô.']);
        R.Audio.sfx('lightup');
        for (let i = 0; i < 3; i++) { R.Screen.flash('#fff6d0', 0.5 + i * 0.2); await b.wait(350); }
        b.darkness = 0;
        a.anim.dying = 0.01;
        await b.say('A LAMPARINA de LUME acende. E depois mais nada fica escuro.', 1400);
        b.result = 'win';
      },
      choose(u) {
        const S = R.DB.skills.skills;
        if (phase === 3) return 'skip';
        if (b.round === 1) return { skill: S.b_apagar };
        if (phase === 2 && Math.random() < 0.3) return { skill: S.b_sussurro };
        return { skill: U.choice([S.b_apagar, S.b_cobertor, S.b_cobertor, S.b_sussurro, S.b_peso]) };
      },
      actionsFor(u) { return phase === 2 && b.round % 2 === 0 ? 2 : 1; },
      modifyDamage(att, t, dmg) {
        if (att.side === 'party' && b.darkness > 0.3) return dmg * 0.65;
        return dmg;
      },
      async enterPhase3() {
        if (phase === 3) return;
        phase = 3;
        b.darkness = 0.4;
        await b.speak('apagador', ['Por favor.', 'Por favor, fica.']);
        await b.say('O APAGADOR não ataca mais. Ele só espera.', 1000);
      },
      async onKnockout(u) {
        if (u.key !== 'apagador') return false;
        if (lit) return false;
        u.hp = 1;
        await this.enterPhase3();
        return true;
      },
      async onDamaged(t) {
        if (t.key === 'apagador' && phase === 2 && t.hp > 0 && t.hp < t.mhp * 0.25) await this.enterPhase3();
      },
      variant(u) { return u.key === 'apagador' ? (phase === 2 ? 'furioso' : phase === 3 ? 'fraco' : '') : ''; },
    };
  };
  void E;
})();
