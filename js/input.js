/* VAGALUME — entrada: teclado (remapeável), toque e gamepad.
 * Ações abstratas: up, down, left, right, confirm, cancel, run, menu, map, inventory, party. */
(function () {
  'use strict';
  const R = window.RPG;

  const DEFAULT_BINDS = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    confirm: ['KeyZ', 'Enter', 'Space'],
    cancel: ['KeyX', 'Escape', 'Backspace'],
    run: ['ShiftLeft', 'ShiftRight'],
    menu: ['KeyP', 'Escape'],
    map: ['KeyM'],
    inventory: ['KeyI'],
    party: ['KeyC'],
  };
  const ACTIONS = Object.keys(DEFAULT_BINDS);
  const ACTION_LABEL = {
    up: 'Cima', down: 'Baixo', left: 'Esquerda', right: 'Direita',
    confirm: 'Confirmar', cancel: 'Cancelar', run: 'Correr', menu: 'Menu',
    map: 'Mapa', inventory: 'Inventário', party: 'Grupo',
  };

  function keyLabel(code) {
    if (!code) return '—';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const m = {
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
      Enter: 'Enter', Space: 'Espaço', Escape: 'Esc', Backspace: 'Apagar',
      ShiftLeft: 'Shift', ShiftRight: 'Shift D', ControlLeft: 'Ctrl', Tab: 'Tab',
    };
    return m[code] || code;
  }

  const Input = (R.Input = {
    ACTIONS,
    ACTION_LABEL,
    keyLabel,
    binds: R.U.clone(DEFAULT_BINDS),
    keys: {}, // código -> pressionado
    virtual: {}, // ação -> pressionado (toque)
    pad: {}, // ação -> pressionado (gamepad)
    held: {}, // ação -> tempo segurando
    pressedNow: {},
    repeatNow: {},
    blockedUntilRelease: false,
    capture: null, // função de captura para remapear
    lastDevice: 'keyboard',
    init() {
      window.addEventListener('keydown', (e) => this.onKey(e, true));
      window.addEventListener('keyup', (e) => this.onKey(e, false));
      window.addEventListener('blur', () => this.releaseAll());
    },
    defaults() { return R.U.clone(DEFAULT_BINDS); },
    setBinds(b) {
      const out = R.U.clone(DEFAULT_BINDS);
      if (b && typeof b === 'object') for (const a of ACTIONS) if (Array.isArray(b[a]) && b[a].length) out[a] = b[a].slice(0, 3);
      this.binds = out;
    },
    gameKeys() {
      const s = new Set();
      for (const a of ACTIONS) for (const k of this.binds[a]) s.add(k);
      return s;
    },
    onKey(e, down) {
      if (this.capture && down) {
        e.preventDefault();
        const fn = this.capture;
        this.capture = null;
        fn(e.code);
        return;
      }
      // não atrapalha campos de texto
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (this.gameKeys().has(e.code) || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (down && e.repeat) return; // a repetição é tratada pelo jogo
      this.keys[e.code] = down;
      this.lastDevice = 'keyboard';
      if (down) R.Bus.emit('anykey', e.code);
    },
    releaseAll() {
      this.keys = {};
      this.virtual = {};
      this.held = {};
    },
    rawDown(a) {
      if (this.virtual[a] || this.pad[a]) return true;
      const list = this.binds[a] || [];
      for (const k of list) if (this.keys[k]) return true;
      return false;
    },
    // chamado uma vez por quadro, antes da lógica
    update(dt) {
      this.pollPad();
      let any = false;
      for (const a of ACTIONS) {
        const d = this.rawDown(a);
        if (d) any = true;
        const prev = this.held[a] || 0;
        this.pressedNow[a] = d && prev === 0;
        this.repeatNow[a] = false;
        if (d) {
          const t = prev + dt;
          this.held[a] = t;
          if (this.pressedNow[a]) this.repeatNow[a] = true;
          else if (t > 0.32) {
            const n0 = Math.floor((prev - 0.32) / 0.075), n1 = Math.floor((t - 0.32) / 0.075);
            if (n1 > n0 || prev <= 0.32) this.repeatNow[a] = true;
          }
        } else this.held[a] = 0;
      }
      if (this.blockedUntilRelease) {
        if (!any) this.blockedUntilRelease = false;
        else for (const a of ACTIONS) { this.pressedNow[a] = false; this.repeatNow[a] = false; }
      }
    },
    pressed(a) { return !!this.pressedNow[a]; },
    repeat(a) { return !!this.repeatNow[a]; },
    down(a) { return !this.blockedUntilRelease && this.rawDown(a); },
    // descarta entradas deste quadro (evita duplicidade ao trocar de tela)
    consume() {
      for (const a of ACTIONS) { this.pressedNow[a] = false; this.repeatNow[a] = false; }
    },
    // bloqueia até soltar todas as teclas
    block() { this.consume(); this.blockedUntilRelease = true; },
    // direção atual (prioriza a última pressionada)
    dir() {
      const order = ['up', 'down', 'left', 'right'];
      let best = null, bestT = Infinity;
      for (const d of order) if (this.down(d) && this.held[d] < bestT) { best = d; bestT = this.held[d]; }
      return best;
    },
    // --------------------------------------------------------------- gamepad
    pollPad() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const p = pads && pads[0];
      this.pad = {};
      if (!p) return;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      this.pad.up = b(12) || ay < -0.5;
      this.pad.down = b(13) || ay > 0.5;
      this.pad.left = b(14) || ax < -0.5;
      this.pad.right = b(15) || ax > 0.5;
      this.pad.confirm = b(0);
      this.pad.cancel = b(1);
      this.pad.run = b(2) || b(5);
      this.pad.menu = b(9) || b(3);
      this.pad.map = b(8);
      for (const k in this.pad) if (this.pad[k]) { this.lastDevice = 'pad'; R.Bus.emit('anykey', 'pad'); break; }
    },
    // ----------------------------------------------------------------- toque
    initTouch(root) {
      if (!root) return;
      const btns = root.querySelectorAll('[data-act]');
      btns.forEach((el) => {
        const act = el.dataset.act;
        const on = (e) => {
          e.preventDefault();
          this.virtual[act] = true;
          el.classList.add('on');
          this.lastDevice = 'touch';
          R.Bus.emit('anykey', 'touch');
        };
        const off = (e) => {
          e.preventDefault();
          this.virtual[act] = false;
          el.classList.remove('on');
        };
        el.addEventListener('pointerdown', on);
        el.addEventListener('pointerup', off);
        el.addEventListener('pointercancel', off);
        el.addEventListener('pointerleave', off);
      });
    },
    describe(a) { return (this.binds[a] || []).map(keyLabel).join(' / '); },
  });
})();
