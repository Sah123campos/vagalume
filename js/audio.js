/* VAGALUME — áudio 100% procedural (Web Audio API).
 * Música: sequenciador com acordes, melodia, baixo, arpejo, pad e bateria (data/music.json).
 * Ambiências: vento, água, grilos, chuva, hospital, estática, mar.
 * Efeitos sonoros: sintetizados na hora. Nenhum arquivo externo.
 * O navegador só libera som após um gesto do jogador; até lá tudo é ignorado com segurança. */
(function () {
  'use strict';
  const R = window.RPG;

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(n);
    if (!m) return null;
    let v = NOTE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return v + (parseInt(m[3], 10) + 1) * 12;
  }
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], aug: [0, 4, 8],
    sus4: [0, 5, 7], sus2: [0, 2, 7], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  };
  function chord(sym) {
    const m = /^([A-G])([#b]?)(.*)$/.exec(sym || 'C');
    if (!m) return { root: 48, tones: [0, 4, 7] };
    const root = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 48;
    return { root, tones: QUAL[m[3]] || QUAL[''] };
  }

  const Audio = (R.Audio = {
    ctx: null,
    ready: false,
    music: null,
    musicId: null,
    wantMusic: null,
    amb: null,
    wantAmb: null,
    noiseBuf: null,
    suspended: false,
    init() {
      const unlock = () => this.unlock();
      ['keydown', 'pointerdown', 'touchstart', 'mousedown'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
      R.Bus.on('anykey', unlock);
    },
    unlock() {
      if (this.ready) { if (this.ctx.state === 'suspended' && !this.suspended) this.ctx.resume().catch(() => {}); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        const c = this.ctx;
        this.master = c.createGain();
        this.master.connect(c.destination);
        this.musicBus = c.createGain(); this.musicBus.connect(this.master);
        this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
        this.ambBus = c.createGain(); this.ambBus.connect(this.master);
        // reverberação
        this.reverb = c.createConvolver();
        this.reverb.buffer = this.impulse(2.6, 2.2);
        this.revSend = c.createGain(); this.revSend.gain.value = 0.25;
        this.revSend.connect(this.reverb); this.reverb.connect(this.musicBus);
        this.sfxRev = c.createGain(); this.sfxRev.gain.value = 0.15; this.sfxRev.connect(this.reverb);
        // ruído
        const len = c.sampleRate * 2;
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // onda de pulso 25%
        const real = new Float32Array(32), imag = new Float32Array(32);
        for (let n = 1; n < 32; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
        this.pulse = c.createPeriodicWave(real, imag);
        this.ready = true;
        this.applyVolumes();
        if (c.state === 'suspended') c.resume().catch(() => {});
        if (this.wantMusic) { const w = this.wantMusic; this.wantMusic = null; this.musicId = null; this.playMusic(w); }
        if (this.wantAmb) { const a = this.wantAmb; this.wantAmb = null; this.ambId = null; this.playAmbience(a); }
      } catch (e) {
        R.Log.warn('Áudio indisponível', e.message);
        this.ready = false;
      }
    },
    impulse(sec, decay) {
      const c = this.ctx, len = Math.floor(c.sampleRate * sec);
      const b = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return b;
    },
    applyVolumes() {
      if (!this.ready) return;
      const S = R.Settings;
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(S.get('muted') ? 0 : S.get('master'), t, 0.05);
      this.musicBus.gain.setTargetAtTime(S.get('music') * 0.55, t, 0.05);
      this.sfxBus.gain.setTargetAtTime(S.get('sfx') * 0.7, t, 0.05);
      this.ambBus.gain.setTargetAtTime(S.get('sfx') * 0.5, t, 0.05);
    },
    setSuspended(p) {
      this.suspended = p;
      if (!this.ready) return;
      if (p) this.ctx.suspend().catch(() => {}); else this.ctx.resume().catch(() => {});
    },

    // ------------------------------------------------------------- vozes
    voice(inst, f, t, dur, vol, dest, opts = {}) {
      const c = this.ctx;
      const g = c.createGain();
      g.connect(dest);
      const env = (a, d, s, r) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + a);
        g.gain.setTargetAtTime(vol * s, t + a, d);
        g.gain.setTargetAtTime(0.0001, t + dur, r);
      };
      const osc = (type, fr, detune = 0) => {
        const o = c.createOscillator();
        if (type === 'pulse') o.setPeriodicWave(this.pulse); else o.type = type;
        o.frequency.setValueAtTime(fr, t);
        if (detune) o.detune.setValueAtTime(detune, t);
        if (opts.wobble) {
          const l = c.createOscillator(), lg = c.createGain();
          l.frequency.value = 0.5 + Math.random() * 2; lg.gain.value = opts.wobble;
          l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + 2);
        }
        o.start(t); o.stop(t + dur + 2.5);
        return o;
      };
      switch (inst) {
        case 'bell': {
          const a = osc('sine', f), b = osc('sine', f * 2.01), d2 = osc('sine', f * 3.98);
          const gb = c.createGain(); gb.gain.value = 0.35; b.connect(gb); gb.connect(g);
          const gd = c.createGain(); gd.gain.value = 0.12; d2.connect(gd); gd.connect(g);
          a.connect(g);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.6, dur * 2.2));
          break;
        }
        case 'piano': {
          const a = osc('triangle', f), b = osc('sine', f * 2);
          const gb = c.createGain(); gb.gain.value = 0.25; b.connect(gb); gb.connect(g); a.connect(g);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.5, dur * 1.8));
          break;
        }
        case 'pluck': {
          const a = osc('triangle', f); a.connect(g);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35 + dur * 0.3);
          break;
        }
        case 'lead': {
          const a = osc('pulse', f), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
          a.connect(lp); lp.connect(g); env(0.01, 0.1, 0.7, 0.06);
          break;
        }
        case 'soft': {
          const a = osc('sine', f), v = c.createOscillator(), vg = c.createGain();
          v.frequency.value = 5; vg.gain.value = 6; v.connect(vg); vg.connect(a.detune); v.start(t); v.stop(t + dur + 1);
          a.connect(g); env(0.03, 0.2, 0.8, 0.12);
          break;
        }
        case 'pad': {
          const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opts.cutoff || 900; lp.connect(g);
          osc('sawtooth', f, -8).connect(lp); osc('sawtooth', f, 8).connect(lp);
          env(0.35, 0.5, 0.8, 0.5);
          break;
        }
        case 'organ': {
          [1, 2, 4].forEach((h, i) => { const o = osc('sine', f * h); const gg = c.createGain(); gg.gain.value = [0.6, 0.3, 0.12][i]; o.connect(gg); gg.connect(g); });
          env(0.02, 0.2, 0.8, 0.1);
          break;
        }
        case 'bass': {
          const a = osc('triangle', f); a.connect(g); env(0.005, 0.15, 0.6, 0.06);
          break;
        }
        case 'sqbass': {
          const a = osc('square', f), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
          a.connect(lp); lp.connect(g); env(0.005, 0.1, 0.5, 0.05);
          break;
        }
        case 'kick': {
          const o = c.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
          o.connect(g); o.start(t); o.stop(t + 0.3);
          g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
          break;
        }
        case 'snare': case 'hat': case 'noise': {
          const s = c.createBufferSource(); s.buffer = this.noiseBuf;
          const fl = c.createBiquadFilter();
          fl.type = inst === 'hat' ? 'highpass' : 'bandpass';
          fl.frequency.value = opts.ff || (inst === 'hat' ? 7000 : 1800);
          if (opts.q) fl.Q.value = opts.q;
          s.connect(fl); fl.connect(g);
          const len = inst === 'hat' ? 0.05 : inst === 'snare' ? 0.14 : dur;
          s.start(t, Math.random()); s.stop(t + len + 0.1);
          g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          break;
        }
        default: {
          const a = osc(inst || 'sine', f); a.connect(g); env(0.01, 0.1, 0.6, 0.08);
        }
      }
      return g;
    },

    // ------------------------------------------------------------- música
    playMusic(id, fadeMs) {
      if (id === this.musicId && this.music) return;
      if (!this.ready) { this.wantMusic = id; return; }
      const fade = (fadeMs === undefined ? 700 : fadeMs) / 1000;
      if (this.music) {
        const old = this.music;
        old.dead = true;
        const t = this.ctx.currentTime;
        old.gain.gain.setTargetAtTime(0.0001, t, Math.max(0.05, fade / 3));
        setTimeout(() => { try { old.gain.disconnect(); } catch (e) { /* ok */ } }, fade * 1000 + 1500);
        this.music = null;
      }
      this.musicId = id;
      if (!id) return;
      const def = R.DB.music.tracks[id];
      if (!def) { R.Log.warn('Música inexistente: ' + id); return; }
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.setTargetAtTime(def.volume || 1, this.ctx.currentTime, Math.max(0.05, fade / 3));
      g.connect(this.musicBus);
      const send = this.ctx.createGain(); send.gain.value = def.reverb === undefined ? 0.3 : def.reverb;
      g.connect(send); send.connect(this.revSend);
      this.music = this.compile(def);
      this.music.gain = g;
      this.music.nextTime = this.ctx.currentTime + 0.08;
    },
    compile(def) {
      const spb = def.stepsPerBar || 8;
      const chords = (def.chords || 'C').split(/\s+/).filter(Boolean);
      const parseLine = (s) => (s || '').replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
      const tracks = (def.voices || []).map((v) => ({ inst: v.inst, vol: v.vol || 0.2, oct: v.oct || 0, notes: parseLine(v.notes), wobble: v.wobble, every: v.every || 1 }));
      const bars = chords.length;
      return { def, spb, chords: chords.map(chord), tracks, bars, step: 0, total: bars * spb };
    },
    scheduleMusic() {
      const m = this.music;
      if (!m || m.dead) return;
      const c = this.ctx;
      const def = m.def;
      const stepDur = 60 / (def.bpm || 100) / (def.perBeat || 2);
      while (m.nextTime < c.currentTime + 0.25) {
        const s = m.step % m.total;
        const bar = Math.floor(s / m.spb), sb = s % m.spb;
        const ch = m.chords[bar];
        let t = m.nextTime;
        if (def.swing && sb % 2 === 1) t += stepDur * def.swing;
        const dest = m.gain;
        const style = def.style || {};
        const wob = def.wobble || 0;
        // vozes escritas
        for (const v of m.tracks) {
          if (!v.notes.length) continue;
          const tok = v.notes[s % v.notes.length];
          if (!tok || tok === '.' || tok === '-') continue;
          let len = 1;
          for (let k = 1; k < 16; k++) { if (v.notes[(s + k) % v.notes.length] === '-') len++; else break; }
          const n = midi(tok);
          if (n === null) continue;
          this.voice(v.inst, freq(n + v.oct * 12), t, stepDur * len * 0.95, v.vol, dest, { wobble: v.wobble || wob });
        }
        // acompanhamento gerado pelos acordes
        if (style.bass) {
          const pat = { root: [0], half: [0, m.spb / 2], quarter: [0, 2, 4, 6], pulse: [0, 1, 2, 3, 4, 5, 6, 7], waltz: [0], octave: [0, 2, 4, 6] }[style.bass] || [0];
          if (pat.includes(sb)) {
            let n = ch.root - 12 + (style.bassOct || 0) * 12;
            if (style.bass === 'half' && sb > 0) n += 7;
            if (style.bass === 'octave' && sb % 4 === 2) n += 12;
            this.voice(style.bassInst || 'bass', freq(n), t, stepDur * (style.bass === 'pulse' ? 0.9 : style.bass === 'root' ? m.spb * 0.9 : 1.8), style.bassVol || 0.22, dest);
          }
        }
        if (style.arp && sb % (style.arpEvery || 1) === 0) {
          const tones = ch.tones.concat(ch.tones.map((x) => x + 12));
          let idx;
          const k = Math.floor(sb / (style.arpEvery || 1));
          if (style.arp === 'down') idx = tones.length - 1 - (k % tones.length);
          else if (style.arp === 'updown') { const L = tones.length * 2 - 2; const q = k % L; idx = q < tones.length ? q : L - q; }
          else if (style.arp === 'random') idx = Math.floor(Math.random() * tones.length);
          else idx = k % tones.length;
          const n = ch.root + 12 + (style.arpOct || 0) * 12 + tones[idx];
          this.voice(style.arpInst || 'pluck', freq(n), t, stepDur * 0.9, style.arpVol || 0.07, dest, { wobble: wob });
        }
        if (style.pad && sb === 0) {
          for (const tn of ch.tones.slice(0, 3)) this.voice('pad', freq(ch.root + 12 + tn + (style.padOct || 0) * 12), t, stepDur * m.spb * 0.98, style.padVol || 0.035, dest, { cutoff: style.padCut || 900, wobble: wob });
        }
        if (style.waltz && (sb === 2 || sb === 4)) {
          for (const tn of ch.tones.slice(0, 3)) this.voice('pluck', freq(ch.root + 12 + tn), t, stepDur, 0.045, dest);
        }
        if (style.drums) {
          const D = {
            soft: { kick: [0], hat: [2, 6], hatVol: 0.025 },
            pop: { kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], hatVol: 0.018 },
            battle: { kick: [0, 3, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], hatVol: 0.03 },
            boss: { kick: [0, 2, 3, 4, 6], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], hatVol: 0.035 },
            march: { kick: [0, 4], snare: [2, 3, 6], hatVol: 0 },
            heart: { kick: [0, 1], hatVol: 0 },
            waltz: { kick: [0], hat: [2, 4], hatVol: 0.02 },
          }[style.drums];
          if (D) {
            if (D.kick && D.kick.includes(sb)) this.voice('kick', 0, t, 0.2, style.kickVol || 0.3, dest);
            if (D.snare && D.snare.includes(sb)) this.voice('snare', 0, t, 0.15, 0.09, dest);
            if (D.hat && D.hat.includes(sb)) this.voice('hat', 0, t, 0.05, D.hatVol, dest);
          }
        }
        // notas esparsas aleatórias (trilhas ambientes)
        if (style.sparkle && Math.random() < style.sparkle) {
          const sc = ch.tones.concat([2, 9]);
          const n = ch.root + 24 + sc[Math.floor(Math.random() * sc.length)];
          this.voice(style.sparkleInst || 'bell', freq(n), t, stepDur * 2, style.sparkleVol || 0.05, dest, { wobble: wob });
        }
        m.step++;
        m.nextTime += stepDur;
      }
    },

    // --------------------------------------------------------- ambiências
    playAmbience(id) {
      if (id === this.ambId) return;
      if (!this.ready) { this.wantAmb = id; return; }
      if (this.amb) {
        const old = this.amb;
        old.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
        setTimeout(() => { try { old.nodes.forEach((n) => n.stop && n.stop()); old.gain.disconnect(); } catch (e) { /* ok */ } }, 2000);
        this.amb = null;
      }
      this.ambId = id;
      if (!id) return;
      const c = this.ctx;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.setTargetAtTime(1, c.currentTime, 0.5);
      g.connect(this.ambBus);
      const a = { id, gain: g, nodes: [], t: 0, next: 0 };
      const noiseLoop = (type, f, q, vol, lfoRate, lfoDepth) => {
        const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
        const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7;
        const gg = c.createGain(); gg.gain.value = vol;
        s.connect(fl); fl.connect(gg); gg.connect(g);
        if (lfoRate) {
          const l = c.createOscillator(), lg = c.createGain();
          l.frequency.value = lfoRate; lg.gain.value = lfoDepth;
          l.connect(lg); lg.connect(gg.gain); l.start(); a.nodes.push(l);
        }
        s.start(); a.nodes.push(s);
      };
      switch (id) {
        case 'vento': noiseLoop('lowpass', 500, 0.8, 0.12, 0.13, 0.08); break;
        case 'ventania': noiseLoop('bandpass', 700, 0.6, 0.2, 0.25, 0.14); break;
        case 'mar': noiseLoop('lowpass', 380, 0.7, 0.18, 0.09, 0.15); break;
        case 'chuva': noiseLoop('highpass', 3000, 0.5, 0.06); noiseLoop('lowpass', 800, 0.5, 0.05); break;
        case 'estatica': noiseLoop('bandpass', 2400, 0.4, 0.03, 0.7, 0.02); break;
        case 'hospital': {
          const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 60;
          const og = c.createGain(); og.gain.value = 0.03; o.connect(og); og.connect(g); o.start(); a.nodes.push(o);
          break;
        }
        case 'caverna': noiseLoop('lowpass', 220, 0.6, 0.08, 0.05, 0.03); break;
        case 'casa': noiseLoop('lowpass', 160, 0.5, 0.04); break;
        default: break;
      }
      this.amb = a;
    },
    ambienceTick(dt) {
      const a = this.amb;
      if (!a) return;
      a.t += dt;
      if (a.t < a.next) return;
      const c = this.ctx, t = c.currentTime;
      switch (a.id) {
        case 'agua': case 'caverna':
          this.voice('sine', 900 + Math.random() * 900, t, 0.05, 0.05, a.gain);
          this.voice('sine', 500 + Math.random() * 300, t + 0.03, 0.04, 0.02, this.sfxRev);
          a.next = a.t + 0.7 + Math.random() * 2.5;
          break;
        case 'grilos': case 'noite':
          for (let i = 0; i < 3; i++) this.voice('sine', 4200 + Math.random() * 300, t + i * 0.06, 0.03, 0.015, a.gain);
          a.next = a.t + 0.4 + Math.random() * 1.2;
          break;
        case 'hospital':
          this.voice('sine', 1046, t, 0.12, 0.06, a.gain);
          a.next = a.t + 1.1;
          break;
        case 'estatica':
          if (Math.random() < 0.3) this.voice('noise', 0, t, 0.08, 0.04, a.gain, { ff: 1500 });
          a.next = a.t + 0.5 + Math.random() * 3;
          break;
        case 'pingos':
          this.voice('sine', 1400 + Math.random() * 400, t, 0.04, 0.04, a.gain);
          a.next = a.t + 1.8 + Math.random() * 2;
          break;
        default: a.next = a.t + 5;
      }
    },

    // ------------------------------------------------------- efeitos sonoros
    sfx(id) {
      if (!this.ready || this.suspended) return;
      const c = this.ctx, t = c.currentTime, d = this.sfxBus;
      const v = (inst, f, dt, dur, vol, o) => this.voice(inst, f, t + dt, dur, vol, d, o);
      const sweep = (type, f0, f1, dur, vol, dt = 0) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(f0, t + dt); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dt + dur);
        g.gain.setValueAtTime(vol, t + dt); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + dur);
        o.connect(g); g.connect(d); o.start(t + dt); o.stop(t + dt + dur + 0.05);
      };
      switch (id) {
        case 'cursor': v('pulse', 880, 0, 0.03, 0.05); break;
        case 'confirm': v('pulse', 988, 0, 0.04, 0.06); v('pulse', 1319, 0.04, 0.06, 0.05); break;
        case 'cancel': v('pulse', 660, 0, 0.04, 0.05); v('pulse', 494, 0.04, 0.06, 0.05); break;
        case 'buzzer': v('square', 140, 0, 0.18, 0.06); break;
        case 'text': v('triangle', 700, 0, 0.03, 0.04); break;
        case 'item': [784, 988, 1175, 1568].forEach((f, i) => v('bell', f, i * 0.07, 0.2, 0.08)); break;
        case 'coin': v('pulse', 1319, 0, 0.05, 0.05); v('pulse', 1976, 0.05, 0.12, 0.05); break;
        case 'chest': sweep('triangle', 200, 500, 0.15, 0.1); [659, 880, 1047].forEach((f, i) => v('bell', f, 0.12 + i * 0.06, 0.2, 0.06)); break;
        case 'door': this.voice('noise', 0, t, 0.12, 0.08, d, { ff: 500, q: 2 }); v('triangle', 110, 0.08, 0.1, 0.12); break;
        case 'locked': v('square', 220, 0, 0.05, 0.05); v('square', 200, 0.08, 0.05, 0.05); break;
        case 'bump': v('triangle', 90, 0, 0.06, 0.08); break;
        case 'push': this.voice('noise', 0, t, 0.25, 0.08, d, { ff: 300, q: 1 }); break;
        case 'click': v('pulse', 1500, 0, 0.02, 0.06); v('pulse', 900, 0.03, 0.02, 0.05); break;
        case 'solve': [523, 659, 784, 1047, 1319].forEach((f, i) => v('bell', f, i * 0.09, 0.3, 0.07)); break;
        case 'save': [523, 784, 1047].forEach((f, i) => v('bell', f, i * 0.12, 0.6, 0.07)); break;
        case 'heal': [659, 784, 988, 1319].forEach((f, i) => v('soft', f, i * 0.06, 0.15, 0.06)); break;
        case 'join': [392, 523, 659, 784].forEach((f, i) => v('pluck', f, i * 0.08, 0.2, 0.1)); break;
        case 'levelup': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => v('pulse', f, i * 0.07, 0.08, 0.05)); break;
        case 'quest': [587, 880].forEach((f, i) => v('bell', f, i * 0.1, 0.3, 0.07)); break;
        case 'questDone': [523, 659, 784, 1047].forEach((f, i) => v('bell', f, i * 0.1, 0.4, 0.08)); break;
        case 'surprise': v('pulse', 880, 0, 0.05, 0.06); v('pulse', 1760, 0.05, 0.08, 0.05); break;
        case 'pop': v('sine', 600, 0, 0.05, 0.06); sweep('sine', 500, 1100, 0.06, 0.05); break;
        case 'glitch': for (let i = 0; i < 5; i++) this.voice('noise', 0, t + i * 0.03, 0.03, 0.07, d, { ff: 500 + Math.random() * 4000, q: 4 }); break;
        case 'hit': this.voice('noise', 0, t, 0.08, 0.14, d, { ff: 900, q: 1 }); v('square', 120, 0, 0.06, 0.08); break;
        case 'crit': this.voice('noise', 0, t, 0.12, 0.18, d, { ff: 1200, q: 1 }); sweep('square', 400, 80, 0.15, 0.1); v('bell', 1568, 0.02, 0.1, 0.06); break;
        case 'miss': sweep('sine', 900, 300, 0.12, 0.06); break;
        case 'enemyHit': this.voice('noise', 0, t, 0.08, 0.12, d, { ff: 1400, q: 1.5 }); v('triangle', 180, 0, 0.06, 0.1); break;
        case 'enemyDie': sweep('square', 600, 60, 0.35, 0.07); this.voice('noise', 0, t + 0.1, 0.3, 0.06, d, { ff: 600 }); break;
        case 'partyDown': sweep('triangle', 500, 70, 0.6, 0.12); break;
        case 'skill': sweep('sine', 400, 1200, 0.15, 0.07); v('bell', 1175, 0.1, 0.15, 0.04); break;
        case 'fire': this.voice('noise', 0, t, 0.35, 0.12, d, { ff: 700, q: 0.7 }); sweep('sawtooth', 300, 90, 0.3, 0.05); break;
        case 'water': this.voice('noise', 0, t, 0.3, 0.1, d, { ff: 1200, q: 3 }); sweep('sine', 800, 300, 0.25, 0.06); break;
        case 'emoHappy': [784, 988, 1175, 1568].forEach((f, i) => v('bell', f, i * 0.05, 0.15, 0.06)); break;
        case 'emoSad': [659, 587, 523, 392].forEach((f, i) => v('soft', f, i * 0.09, 0.2, 0.06)); break;
        case 'emoAngry': v('sawtooth', 110, 0, 0.25, 0.06); v('sawtooth', 116, 0, 0.25, 0.06); this.voice('noise', 0, t, 0.2, 0.06, d, { ff: 300 }); break;
        case 'emoAfraid': sweep('sine', 900, 600, 0.4, 0.05); sweep('sine', 950, 620, 0.4, 0.04, 0.05); break;
        case 'emoCalm': v('soft', 523, 0, 0.3, 0.06); v('soft', 784, 0.05, 0.4, 0.05); break;
        case 'buff': sweep('triangle', 300, 900, 0.2, 0.08); break;
        case 'debuff': sweep('triangle', 900, 250, 0.25, 0.08); break;
        case 'flee': for (let i = 0; i < 4; i++) v('pulse', 400 + i * 150, i * 0.04, 0.03, 0.05); break;
        case 'battleStart': sweep('sawtooth', 100, 900, 0.4, 0.06); this.voice('noise', 0, t, 0.4, 0.08, d, { ff: 2000, q: 0.5 }); break;
        case 'victory': [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => v('lead', f, i * 0.1, 0.09, 0.06)); break;
        case 'gameover': [392, 370, 349, 330, 262].forEach((f, i) => v('soft', f, i * 0.25, 0.35, 0.07)); break;
        case 'followup': [659, 880, 1319].forEach((f, i) => v('pulse', f, i * 0.04, 0.05, 0.06)); break;
        case 'bigHit': this.voice('noise', 0, t, 0.3, 0.22, d, { ff: 500, q: 0.7 }); this.voice('kick', 0, t, 0.3, 0.5, d); break;
        case 'tide': this.voice('noise', 0, t, 0.8, 0.14, d, { ff: 400, q: 1 }); sweep('sine', 120, 60, 0.8, 0.1); break;
        case 'mask': v('bell', 330, 0, 0.4, 0.08); v('bell', 311, 0.1, 0.4, 0.06); break;
        case 'darkness': sweep('sawtooth', 220, 40, 1.2, 0.06); this.voice('noise', 0, t, 1, 0.05, d, { ff: 200 }); break;
        case 'heartbeat': v('kick', 0, 0, 0.2, 0.35); v('kick', 0, 0.22, 0.2, 0.25); break;
        case 'beep': v('sine', 1046, 0, 0.12, 0.08); break;
        case 'phone': for (let i = 0; i < 8; i++) { v('sine', 440, i * 0.05, 0.03, 0.05); v('sine', 480, i * 0.05, 0.03, 0.05); } break;
        case 'static': this.voice('noise', 0, t, 0.6, 0.08, d, { ff: 2500, q: 0.4 }); break;
        case 'whoosh': this.voice('noise', 0, t, 0.25, 0.1, d, { ff: 1500, q: 0.8 }); break;
        case 'shine': [1568, 2093, 2637].forEach((f, i) => v('bell', f, i * 0.06, 0.3, 0.05)); break;
        case 'stare': v('soft', 196, 0, 0.6, 0.06, { wobble: 30 }); break;
        case 'swing': sweep('triangle', 600, 200, 0.12, 0.08); break;
        case 'page': this.voice('noise', 0, t, 0.1, 0.06, d, { ff: 4000, q: 0.5 }); break;
        case 'yawn': sweep('sine', 500, 200, 0.6, 0.06); break;
        case 'lightup': sweep('sine', 200, 1600, 1.2, 0.07); [523, 784, 1047, 1568, 2093].forEach((f, i) => v('bell', f, 0.6 + i * 0.12, 0.8, 0.06)); break;
        case 'step': this.voice('noise', 0, t, 0.03, 0.03, d, { ff: 900, q: 1 }); break;
        default: v('pulse', 600, 0, 0.04, 0.04);
      }
    },
    blip(f) {
      if (!this.ready || this.suspended) return;
      this.voice('pulse', f * (0.97 + Math.random() * 0.06), this.ctx.currentTime, 0.025, 0.035, this.sfxBus);
    },
    footstep(surface) {
      if (!this.ready || this.suspended) return;
      const ff = { grass: 700, flowers: 700, tallgrass: 600, path: 1200, stone: 2000, floor: 1500, floor2: 1700, rug: 500, bridge: 1000, sand: 600, darkfloor: 1300, asphalt: 1800 }[surface] || 1000;
      this.voice('noise', 0, this.ctx.currentTime, 0.03, 0.025, this.sfxBus, { ff, q: 1.2 });
    },
    update(dt) {
      if (!this.ready || this.suspended) return;
      try { this.scheduleMusic(); this.ambienceTick(dt); } catch (e) { R.Log.warn('Erro de áudio', e.message); }
    },
  });
  void Audio;
})();
