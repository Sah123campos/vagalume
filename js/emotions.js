/* VAGALUME — sistema de emoções (lógica pura, testável).
 *
 * Triângulo: FELIZ vence IRRITADO, IRRITADO vence TRISTE, TRISTE vence FELIZ.
 *   Atacante com vantagem: dano x1.5. Com desvantagem: dano x0.65.
 * Intensidades (1-3), cada personagem tem um máximo por emoção:
 *   FELIZ/RADIANTE/EUFÓRICO     VEL x1.25/1.5/2.0, crítico +10/20/30%, precisão x0.9/0.8/0.7
 *   TRISTE/ABATIDO/DESOLADO     DEF x1.25/1.4/1.6, VEL x0.8/0.65/0.5, 30/50/100% do dano vai para o BRILHO
 *   IRRITADO/FURIOSO/COLÉRICO   ATQ x1.3/1.5/2.0, DEF x0.7/0.5/0.3
 *   MEDO (2 turnos)             ATQ x0.8, DEF x0.75, não pode usar habilidades
 * Regras: aplicar a mesma emoção sobe a intensidade (até o máximo); outra emoção
 * substitui e começa na intensidade pedida; MEDO substitui qualquer emoção e expira;
 * "neutro" limpa. Efeitos de uma mesma ação são aplicados na ordem em que aparecem:
 * o último prevalece. Emoções duram até a batalha acabar ou serem trocadas. */
(function () {
  'use strict';
  const R = window.RPG;

  const MODS = {
    feliz: [{ vel: 1.25, crit: 0.1, acc: 0.9 }, { vel: 1.5, crit: 0.2, acc: 0.8 }, { vel: 2.0, crit: 0.3, acc: 0.7 }],
    triste: [{ def: 1.25, vel: 0.8, divert: 0.3 }, { def: 1.4, vel: 0.65, divert: 0.5 }, { def: 1.6, vel: 0.5, divert: 1.0 }],
    irritado: [{ atq: 1.3, def: 0.7 }, { atq: 1.5, def: 0.5 }, { atq: 2.0, def: 0.3 }],
    medo: [{ atq: 0.8, def: 0.75, noSkills: true }],
  };
  const LABEL = {
    feliz: ['FELIZ', 'RADIANTE', 'EUFÓRICO'],
    triste: ['TRISTE', 'ABATIDO', 'DESOLADO'],
    irritado: ['IRRITADO', 'FURIOSO', 'COLÉRICO'],
    medo: ['COM MEDO'],
  };
  const BEATS = { feliz: 'irritado', irritado: 'triste', triste: 'feliz' };

  const Emotions = (R.Emotions = {
    TYPES: ['feliz', 'triste', 'irritado'],
    MODS,
    LABEL,
    BEATS,
    ADV: 1.5,
    DISADV: 0.65,
    none() { return { type: null, tier: 0, turns: 0 }; },
    label(e) {
      if (!e || !e.type) return 'NEUTRO';
      return LABEL[e.type][Math.max(0, Math.min(LABEL[e.type].length - 1, e.tier - 1))];
    },
    color(e) { return R.THEME.emo[e && e.type ? e.type : 'neutro']; },
    // multiplicadores atuais
    mods(e) {
      const out = { atq: 1, def: 1, vel: 1, crit: 0, acc: 1, divert: 0, noSkills: false };
      if (!e || !e.type) return out;
      const m = MODS[e.type][Math.max(0, Math.min(MODS[e.type].length - 1, e.tier - 1))];
      return Object.assign(out, m);
    },
    // 1 = vantagem do atacante, -1 = desvantagem, 0 = neutro
    advantage(att, def) {
      const a = att && att.type, d = def && def.type;
      if (!a || !d || a === 'medo' || d === 'medo') return 0;
      if (BEATS[a] === d) return 1;
      if (BEATS[d] === a) return -1;
      return 0;
    },
    multiplier(att, def) {
      const adv = this.advantage(att, def);
      return adv > 0 ? this.ADV : adv < 0 ? this.DISADV : 1;
    },
    // aplica emoção em unidade {name, emotion, emotionMax, immune?}; devolve resultado descritivo
    apply(unit, type, steps = 1, turns) {
      const cur = unit.emotion || this.none();
      const before = { type: cur.type, tier: cur.tier };
      if (type === 'neutro' || !type) {
        if (!cur.type) return { changed: false, msg: unit.name + ' já está calmo.', before, after: before };
        unit.emotion = this.none();
        return { changed: true, msg: unit.name + ' se acalmou.', before, after: { type: null, tier: 0 } };
      }
      if (type === 'medo') {
        if (unit.fearless) return { changed: false, msg: unit.name + ' não sente medo.', before, after: before };
        unit.emotion = { type: 'medo', tier: 1, turns: turns || 2 };
        return { changed: true, msg: unit.name + ' ficou COM MEDO!', before, after: { type: 'medo', tier: 1 } };
      }
      const max = (unit.emotionMax && unit.emotionMax[type] !== undefined) ? unit.emotionMax[type] : 2;
      if (max <= 0) return { changed: false, msg: unit.name + ' não consegue ficar ' + LABEL[type][0] + '.', before, after: before, immune: true };
      let tier;
      if (cur.type === type) {
        tier = Math.min(max, cur.tier + steps);
        if (tier === cur.tier) return { changed: false, capped: true, msg: unit.name + ' não pode ficar mais ' + LABEL[type][0] + '!', before, after: before };
      } else tier = Math.min(max, Math.max(1, steps));
      unit.emotion = { type, tier, turns: 0 };
      const word = LABEL[type][tier - 1];
      return { changed: true, msg: unit.name + ' ficou ' + word + '!', before, after: { type, tier } };
    },
    // avança um turno (MEDO expira)
    tick(unit) {
      const e = unit.emotion;
      if (e && e.type === 'medo') {
        e.turns--;
        if (e.turns <= 0) { unit.emotion = this.none(); return unit.name + ' superou o medo.'; }
      }
      return null;
    },
  });
  void Emotions;
})();
