(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const nameEditor = {
    root: document.getElementById('name-editor'),
    form: document.getElementById('name-editor-form'),
    input: document.getElementById('name-editor-input'),
    cancel: document.getElementById('name-editor-cancel'),
    anchor: null,
    afterSave: null
  };
  let W = 1280;
  let H = 720;
  const TAU = Math.PI * 2;
  const FIXED_DT = 1 / 60;

  function isSmallPortraitViewport() {
    return window.innerHeight / Math.max(1, window.innerWidth) >= 1.45 && window.innerWidth <= 760;
  }

  function configureCanvasSize() {
    const portrait = isSmallPortraitViewport();
    if (portrait) {
      W = 640;
      H = Math.round(W * window.innerHeight / Math.max(1, window.innerWidth));
    } else {
      W = 1280;
      H = 720;
    }
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    canvas.dataset.layout = portrait ? 'portrait' : 'landscape';
    ctx.imageSmoothingEnabled = true;
    layoutNameEditor();
  }

  function isPortraitLayout() {
    return H > W;
  }

  function isMobileLike() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth < 900;
  }

  function touchControlLayout() {
    const portrait = isPortraitLayout();
    return {
      portrait,
      joyX: portrait ? 106 : 150,
      joyY: portrait ? H - 190 : H - 130,
      joyR: portrait ? 96 : 72,
      knobR: portrait ? 38 : 28,
      dashX: portrait ? W - 94 : W - 120,
      dashY: portrait ? H - 198 : H - 120,
      dashR: portrait ? 72 : 54,
      odX: portrait ? W - 244 : W - 290,
      odY: portrait ? H - 168 : H - 104,
      odR: portrait ? 62 : 48
    };
  }

  function isNameEditorOpen() {
    return !!(nameEditor.root && !nameEditor.root.hidden);
  }

  function logicalRectToViewport(rect) {
    const bounds = canvas.getBoundingClientRect();
    return {
      left: bounds.left + rect.x / W * bounds.width,
      top: bounds.top + rect.y / H * bounds.height,
      width: rect.w / W * bounds.width,
      height: rect.h / H * bounds.height
    };
  }

  function layoutNameEditor() {
    if (!isNameEditorOpen() || !nameEditor.anchor) return;
    const root = nameEditor.root;
    const anchor = logicalRectToViewport(nameEditor.anchor);
    const margin = 12;
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 320;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 568;
    const width = Math.min(Math.max(anchor.width, isPortraitLayout() ? viewportW - 32 : 300), viewportW - margin * 2);
    const left = Math.max(margin, Math.min(viewportW - width - margin, anchor.left + anchor.width / 2 - width / 2));
    root.style.width = Math.round(width) + 'px';
    root.style.left = Math.round(left) + 'px';
    root.style.top = '-9999px';
    const panelH = root.offsetHeight || 140;
    let top = anchor.top + anchor.height + 8;
    if (top + panelH > viewportH - margin) top = anchor.top - panelH - 8;
    root.style.top = Math.round(Math.max(margin, top)) + 'px';
  }

  configureCanvasSize();
  window.addEventListener('resize', configureCanvasSize);
  window.addEventListener('orientationchange', () => window.setTimeout(configureCanvasSize, 80));

  const C = {
    bg: '#050510',
    bg2: '#09091a',
    player: '#00F0FF',
    playerDark: '#0A1A2A',
    enemy: '#FF2E97',
    enemyDark: '#2A0818',
    elite: '#C84DFF',
    eliteDark: '#1C0830',
    pickup: '#FFD300',
    white: '#FFFFFF',
    danger: '#FF3B3B',
    heal: '#3CFF88',
    orange: '#FF7A1A',
    purple: '#6A2BD9',
    blue: '#1B2E7A',
    steel: '#8FA8C8',
    panel: '#0A0A18',
    track: '#122036'
  };

  const ASSET_MANIFEST = {}; // Code-only edition uses existing procedural renderers.

  const Assets = {
    images: {},
    state: {},
    loaded: 0,
    total: Object.keys(ASSET_MANIFEST).length,
    ready: false
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (a, b, c, d) => {
    const x = a - c;
    const y = b - d;
    return x * x + y * y;
  };
  const angleTo = (a, b, c, d) => Math.atan2(d - b, c - a);
  const fmt = (n) => Math.floor(n).toLocaleString('pt-BR');
  const timeFmt = (s) => {
    s = Math.max(0, Math.floor(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function rnd(a, b) {
    return a + (b - a) * game.rng();
  }

  function chance(p) {
    return game.rng() < p;
  }

  function savePath() {
    return 'starship2050.save.v1';
  }

  function loadSave() {
    const base = {
      version: 1,
      cores: 0,
      bestScore: 0,
      bestWave: 0,
      totalRuns: 0,
      totalKills: 0,
      totalNearMisses: 0,
      totalTime: 0,
      unlockedShips: ['falcao'],
      selectedShip: 'falcao',
	      upgrades: { hull: 0, weapons: 0, engines: 0, systems: 0, fortune: 0 },
	      achievements: {},
	      dailyDate: '',
	      muted: false,
	      playerName: 'PILOTO',
	      localLeaderboard: []
	    };
    try {
      const raw = localStorage.getItem(savePath());
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return Object.assign(base, parsed, {
	        upgrades: Object.assign(base.upgrades, parsed.upgrades || {}),
	        achievements: Object.assign(base.achievements, parsed.achievements || {}),
	        localLeaderboard: Array.isArray(parsed.localLeaderboard) ? parsed.localLeaderboard : []
	      });
    } catch (err) {
      return base;
    }
  }

	  function storeSave() {
	    try {
	      localStorage.setItem(savePath(), JSON.stringify(game.save));
	    } catch (err) {
	      // Storage can be unavailable in embedded previews.
	    }
	  }

	  function localLeaderboard() {
	    return (game.save.localLeaderboard || [])
	      .slice()
	      .sort((a, b) => b.score - a.score || b.wave - a.wave || b.createdAt - a.createdAt)
	      .slice(0, 25);
	  }

	  function addLocalLeaderboard(entry) {
	    const list = game.save.localLeaderboard || [];
	    list.push(entry);
	    game.save.localLeaderboard = list
	      .sort((a, b) => b.score - a.score || b.wave - a.wave || b.createdAt - a.createdAt)
	      .slice(0, 25);
	    storeSave();
	  }

	  function normalizeLeaderboardEntries(entries) {
	    return (Array.isArray(entries) ? entries : []).map((e) => ({
	      name: sanitizePlayerName(e.name),
	      score: Math.max(0, Math.floor(Number(e.score) || 0)),
	      wave: Math.max(1, Math.floor(Number(e.wave) || 1)),
	      ship: String(e.ship || 'falcao').slice(0, 24),
	      grade: String(e.grade || '-').slice(0, 2),
	      createdAt: Number(e.createdAt) || 0
	    })).filter((e) => e.score > 0).slice(0, 25);
	  }

	  function refreshLeaderboard(force) {
        game.leaderboard = localLeaderboard();
        game.leaderboardState = 'local';
        game.leaderboardError = 'Ranking local';
        game.leaderboardLastLoad = performance.now();
      }

	  function submitLeaderboardScore(result) {
	    if (!game.run || !result || result.submitted || result.submitState === 'sending') return;
	    const playerName = sanitizePlayerName(game.save.playerName);
	    if (playerName === 'PILOTO' && !result.nameDirty) {
	      result.submitState = 'needsName';
	      return;
	    }
	    const entry = {
	      name: playerName,
	      score: Math.floor(game.run.score),
	      wave: Math.floor(game.run.wave),
	      ship: game.run.ship.id,
	      grade: result.grade,
	      victory: !!result.victory,
	      createdAt: Date.now()
	    };
	    result.name = entry.name;
	    result.submitState = 'sending';
	    if (!result.localSaved) {
	      addLocalLeaderboard(entry);
	      result.localSaved = true;
	    }
        result.submitted = true;
        result.submitState = 'local';
        game.leaderboard = localLeaderboard();
        game.leaderboardState = 'local';
        game.leaderboardError = 'Score salvo localmente';
      }

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.noiseBuffer = null;
      this.disabled = false;
      this.unlocked = false;
      this.muted = !!game.save.muted;
      this.track = 'menu';
      this.nextBeat = 0;
      this.beat = 0;
      this.lastSfx = {};
    }

    unlock() {
      if (this.disabled) return Promise.resolve(false);
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this.disabled = true;
        return Promise.resolve(false);
      }
      if (!this.ctx) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.82;
        this.sfxGain.gain.value = 0.78;
        this.musicGain.gain.value = 0.24;
        this.sfxGain.connect(this.master);
        this.musicGain.connect(this.master);
        this.master.connect(this.ctx.destination);
      }
      return this.ctx.resume().then(() => {
        this.unlocked = true;
        return true;
      }).catch(() => false);
    }

    setMuted(value, persist) {
      this.muted = !!value;
      game.save.muted = this.muted;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.82, this.ctx.currentTime, 0.025);
      }
      if (persist !== false) storeSave();
    }

    toggle() {
      this.setMuted(!this.muted);
      if (!this.muted) this.unlock();
      return this.muted;
    }

    setTrack(track) {
      if (this.track === track) return;
      this.track = track;
      this.nextBeat = 0;
      this.beat = 0;
    }

    update() {
      if (!this.ctx || !this.unlocked || this.muted || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      if (this.nextBeat < now) this.nextBeat = now + 0.03;
      const horizon = now + 0.22;
      const step = this.track === 'boss' ? 0.24 : this.track === 'run' ? 0.32 : 0.48;
      while (this.nextBeat < horizon) {
        this.scheduleMusicBeat(this.nextBeat);
        this.nextBeat += step;
        this.beat++;
      }
    }

    play(id, power) {
      if (!this.ctx || !this.unlocked || this.muted || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const cooldowns = {
        shot: 0.045,
        hit: 0.035,
        pickup: 0.035,
        near_miss: 0.12,
        boss_fire: 0.18,
        beam: 0.22,
        ui_nav: 0.07
      };
      const cd = cooldowns[id] || 0;
      if (cd && this.lastSfx[id] && now - this.lastSfx[id] < cd) return;
      this.lastSfx[id] = now;
      const p = clamp(power || 1, 0.35, 1.8);

      if (id === 'ui_nav') this.beep(520, 0.045, 'triangle', 0.035 * p, now, 650);
      else if (id === 'ui_confirm') {
        this.beep(620, 0.055, 'triangle', 0.045 * p, now);
        this.beep(930, 0.075, 'triangle', 0.032 * p, now + 0.055);
      } else if (id === 'error') this.beep(150, 0.12, 'sawtooth', 0.05 * p, now, 90);
      else if (id === 'purchase') {
        this.beep(660, 0.06, 'triangle', 0.044 * p, now);
        this.beep(880, 0.08, 'triangle', 0.038 * p, now + 0.06);
        this.beep(1320, 0.11, 'sine', 0.032 * p, now + 0.13);
      } else if (id === 'wave') {
        this.beep(220, 0.08, 'sawtooth', 0.05 * p, now, 330);
        this.beep(440, 0.13, 'triangle', 0.035 * p, now + 0.08);
      } else if (id === 'shot') this.beep(760, 0.032, 'square', 0.018 * p, now, 1180);
      else if (id === 'beam') this.beep(390, 0.12, 'sine', 0.016 * p, now, 520);
      else if (id === 'hit') this.noise(0.035, 0.015 * p, now, 980, 'bandpass');
      else if (id === 'dash') {
        this.beep(760, 0.09, 'sawtooth', 0.05 * p, now, 180);
        this.noise(0.09, 0.03 * p, now, 1550, 'bandpass');
      } else if (id === 'overdrive_on') {
        for (let i = 0; i < 5; i++) this.beep(260 + i * 120, 0.09, 'triangle', 0.035 * p, now + i * 0.045);
        this.noise(0.28, 0.025 * p, now, 1800, 'highpass');
      } else if (id === 'overdrive_off') this.beep(420, 0.18, 'triangle', 0.04 * p, now, 120);
      else if (id === 'pickup') {
        this.beep(900, 0.045, 'sine', 0.026 * p, now);
        this.beep(1200, 0.045, 'sine', 0.021 * p, now + 0.04);
      } else if (id === 'level_up') {
        this.beep(392, 0.12, 'triangle', 0.045 * p, now);
        this.beep(588, 0.16, 'triangle', 0.04 * p, now + 0.1);
        this.beep(784, 0.22, 'sine', 0.038 * p, now + 0.22);
      } else if (id === 'kill') {
        this.beep(180, 0.07, 'sawtooth', 0.038 * p, now, 90);
        this.noise(0.045, 0.018 * p, now, 700, 'bandpass');
      } else if (id === 'elite_kill') {
        this.beep(120, 0.14, 'sawtooth', 0.052 * p, now, 60);
        this.beep(360, 0.08, 'triangle', 0.035 * p, now + 0.08);
        this.noise(0.12, 0.028 * p, now, 640, 'lowpass');
      } else if (id === 'near_miss') this.beep(1120, 0.08, 'triangle', 0.035 * p, now, 520);
      else if (id === 'player_hit') {
        this.beep(95, 0.22, 'sawtooth', 0.06 * p, now, 55);
        this.noise(0.16, 0.045 * p, now, 420, 'lowpass');
      } else if (id === 'boss_alert') {
        for (let i = 0; i < 3; i++) this.beep(180, 0.22, 'sawtooth', 0.055 * p, now + i * 0.24, 360);
      } else if (id === 'boss_phase') {
        this.beep(150, 0.12, 'sawtooth', 0.055 * p, now, 80);
        this.beep(450, 0.2, 'triangle', 0.035 * p, now + 0.08, 900);
      } else if (id === 'boss_fire') this.beep(130, 0.075, 'sawtooth', 0.026 * p, now, 210);
      else if (id === 'boss_special') {
        this.beep(82, 0.22, 'sawtooth', 0.06 * p, now, 45);
        this.noise(0.2, 0.035 * p, now, 380, 'lowpass');
      } else if (id === 'boss_explosion') {
        this.beep(72, 0.45, 'sawtooth', 0.075 * p, now, 34);
        this.noise(0.5, 0.06 * p, now, 520, 'lowpass');
      } else if (id === 'mission') {
        this.beep(520, 0.09, 'triangle', 0.04 * p, now);
        this.beep(780, 0.12, 'triangle', 0.038 * p, now + 0.09);
        this.beep(1040, 0.16, 'sine', 0.03 * p, now + 0.18);
      } else if (id === 'victory') {
        for (let i = 0; i < 6; i++) this.beep(330 * (1 + i * 0.16), 0.13, 'triangle', 0.035 * p, now + i * 0.07);
      } else if (id === 'gameover') this.beep(220, 0.42, 'sawtooth', 0.05 * p, now, 70);
    }

    beep(freq, dur, type, vol, when, slideTo, dest) {
      if (!this.ctx) return;
      const out = dest || this.sfxGain;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(Math.max(20, freq), when);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + dur);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(gain);
      gain.connect(out);
      osc.start(when);
      osc.stop(when + dur + 0.03);
    }

    noise(dur, vol, when, freq, type) {
      if (!this.ctx) return;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      source.buffer = this.getNoiseBuffer();
      filter.type = type || 'bandpass';
      filter.frequency.setValueAtTime(freq || 900, when);
      filter.Q.value = 0.9;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      source.start(when);
      source.stop(when + dur + 0.02);
    }

    getNoiseBuffer() {
      if (this.noiseBuffer) return this.noiseBuffer;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * 0.75));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let v = 0;
      for (let i = 0; i < length; i++) {
        v = v * 0.78 + (Math.random() * 2 - 1) * 0.22;
        data[i] = v;
      }
      this.noiseBuffer = buffer;
      return buffer;
    }

    scheduleMusicBeat(when) {
      const step = this.beat % 16;
      if (this.track === 'boss') {
        if (step % 2 === 0) this.beep(82, 0.15, 'sawtooth', 0.025, when, 62, this.musicGain);
        if (step % 4 === 3) this.beep(247, 0.09, 'triangle', 0.014, when, 330, this.musicGain);
        return;
      }
      if (this.track === 'run') {
        const root = 110;
        const arp = [1, 1.25, 1.5, 1.875];
        if (step % 4 === 0) this.beep(root, 0.18, 'sine', 0.02, when, root * 0.5, this.musicGain);
        if (step % 2 === 1) this.beep(root * 2 * arp[Math.floor(step / 2) % arp.length], 0.07, 'triangle', 0.011, when, null, this.musicGain);
        return;
      }
      if (this.track === 'levelup') {
        const notes = [392, 494, 588, 784];
        if (step % 2 === 0) this.beep(notes[(step / 2) % notes.length], 0.16, 'sine', 0.016, when, null, this.musicGain);
        return;
      }
      const menuNotes = [146.83, 220, 293.66, 329.63];
      if (step % 4 === 0) this.beep(menuNotes[(step / 4) % menuNotes.length], 0.32, 'sine', 0.015, when, null, this.musicGain);
    }
  }

  function glow(color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  function noGlow() {
    ctx.shadowBlur = 0;
  }

  function chamfer(x, y, w, h, c) {
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w - c, y);
    ctx.lineTo(x + w, y + c);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x + c, y + h);
    ctx.lineTo(x, y + h - c);
    ctx.lineTo(x, y + c);
    ctx.closePath();
  }

  function drawText(text, x, y, size, color, align, weight) {
    ctx.font = (weight || '600') + ' ' + size + 'px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || C.white;
    ctx.fillText(text, x, y);
  }

  function drawMono(text, x, y, size, color, align, weight) {
    ctx.font = (weight || '600') + ' ' + size + 'px Consolas, "Courier New", monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || C.white;
    ctx.fillText(text, x, y);
  }

  function drawBar(x, y, w, h, value, color, label, borderColor) {
    value = clamp(value, 0, 1);
    ctx.fillStyle = C.track;
    chamfer(x, y, w, h, 4);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    chamfer(x, y, w * value, h, 4);
    ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, color);
    g.addColorStop(1, C.white);
    ctx.fillStyle = g;
    chamfer(x, y, w, h, 4);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 1;
    ctx.strokeStyle = borderColor || color;
    chamfer(x, y, w, h, 4);
    ctx.stroke();
    if (label) drawMono(label, x + w - 6, y + h / 2, Math.max(11, h - 2), C.white, 'right', '700');
  }

  function loadAssets() {
    const entries = Object.entries(ASSET_MANIFEST);
    if (!entries.length) {
      Assets.ready = true;
      return Promise.resolve();
    }
    return Promise.all(entries.map(([id, url]) => new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = (state) => {
        if (done) return;
        done = true;
        Assets.state[id] = state;
        Assets.loaded++;
        if (state === 'sprite') Assets.images[id] = img;
        resolve();
      };
      const timer = window.setTimeout(() => finish('timeout'), 3000);
      img.onload = () => {
        window.clearTimeout(timer);
        finish('sprite');
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        finish('missing');
      };
      img.decoding = 'async';
      img.src = url;
    }))).then(() => {
      Assets.ready = true;
    });
  }

  function hasAsset(id) {
    return !!Assets.images[id];
  }

	  function drawSprite(id, x, y, angle, width, height, alpha) {
	    const img = Assets.images[id];
	    if (!img) return false;
	    ctx.save();
	    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
	    ctx.restore();
	    return true;
	  }

	  function drawCoverAsset(id, x, y, w, h, alpha, zoom, dx, dy) {
	    const img = Assets.images[id];
	    if (!img) return false;
	    const scale = Math.max(w / img.width, h / img.height) * (zoom || 1);
	    const dw = img.width * scale;
	    const dh = img.height * scale;
	    ctx.save();
	    if (alpha !== undefined) ctx.globalAlpha *= alpha;
	    ctx.drawImage(img, x + (w - dw) / 2 + (dx || 0), y + (h - dh) / 2 + (dy || 0), dw, dh);
	    ctx.restore();
	    return true;
	  }

	  function drawCinematicBackdrop(speed, alpha, zoom) {
	    drawBackground(speed || 8);
	    if (drawCoverAsset('keyart_principal', 0, 0, W, H, alpha || 0.82, zoom || 1.02, 0, 0)) {
	      const shade = ctx.createLinearGradient(0, 0, W, H);
	      shade.addColorStop(0, 'rgba(1,3,12,0.32)');
	      shade.addColorStop(0.42, 'rgba(2,3,14,0.66)');
	      shade.addColorStop(1, 'rgba(1,3,12,0.46)');
	      ctx.fillStyle = shade;
	      ctx.fillRect(0, 0, W, H);
	    }
	    drawVignette();
	  }

	  function drawPanel(x, y, w, h, border, alpha) {
	    const fill = ctx.createLinearGradient(x, y, x + w, y + h);
	    fill.addColorStop(0, 'rgba(7,13,30,' + (alpha || 0.82) + ')');
	    fill.addColorStop(1, 'rgba(5,6,18,' + (alpha || 0.82) + ')');
	    ctx.fillStyle = fill;
	    ctx.strokeStyle = border || 'rgba(0,240,255,0.82)';
	    ctx.lineWidth = 1.6;
	    chamfer(x, y, w, h, 12);
	    ctx.fill();
	    glow(border || C.player, 10);
	    ctx.stroke();
	    noGlow();
	    ctx.globalAlpha = 0.24;
	    ctx.strokeStyle = C.white;
	    ctx.beginPath();
	    ctx.moveTo(x + 20, y + 1.5);
	    ctx.lineTo(x + w - 20, y + 1.5);
	    ctx.stroke();
	    ctx.globalAlpha = 1;
	  }

	  function drawMenuButton(label, x, y, w, h, selected) {
	    drawPanel(x, y, w, h, selected ? C.pickup : 'rgba(0,240,255,0.68)', selected ? 0.9 : 0.72);
	    if (selected) {
	      ctx.globalAlpha = 0.18;
	      ctx.fillStyle = C.pickup;
	      chamfer(x + 4, y + 4, w - 8, h - 8, 9);
	      ctx.fill();
	      ctx.globalAlpha = 1;
	    }
	    drawText(label, x + w / 2, y + h / 2, 25, selected ? C.pickup : C.white, 'center', '900');
	  }

	  function hitRect(x, y, w, h) {
	    const m = game.input && game.input.mouse;
	    return !!(m && m.clicked && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h);
	  }

	  function drawFittedText(text, x, y, maxWidth, size, color, align, weight) {
	    let s = size;
	    do {
	      ctx.font = (weight || '800') + ' ' + s + 'px "Segoe UI", Arial, sans-serif';
	      if (ctx.measureText(text).width <= maxWidth) break;
	      s -= 1;
	    } while (s >= 10);
	    drawText(text, x, y, s, color, align, weight);
	  }

  function cleanPlayerNameDraft(name) {
    return String(name || '')
	      .toUpperCase()
	      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
	      .replace(/[^A-Z0-9 _-]/g, '')
	      .replace(/\s+/g, ' ')
	      .trim()
	      .slice(0, 12);
  }

	  function sanitizePlayerName(name) {
	    const cleaned = cleanPlayerNameDraft(name);
	    return cleaned || 'PILOTO';
	  }

  function setPlayerName(name, options) {
    const result = game.run && game.run.result;
    const next = sanitizePlayerName(name);
    game.save.playerName = next;
    if (result && result.submitState !== 'sent') {
      result.name = next;
      result.submitted = false;
      result.submitState = 'pending';
      if (options && options.dirty) result.nameDirty = true;
    }
    storeSave();
    return next;
  }

  function openPlayerNameEditor(anchor, afterSave) {
    if (!nameEditor.root || !nameEditor.input) return false;
    const current = sanitizePlayerName(game.save.playerName);
    nameEditor.anchor = anchor || menuNameRect();
    nameEditor.afterSave = typeof afterSave === 'function' ? afterSave : null;
    nameEditor.input.value = current === 'PILOTO' ? '' : current;
    nameEditor.root.hidden = false;
    layoutNameEditor();
    window.setTimeout(() => {
      nameEditor.input.focus({ preventScroll: true });
      nameEditor.input.select();
      layoutNameEditor();
    }, 0);
    return true;
  }

  function closePlayerNameEditor(saveName) {
    if (!nameEditor.root || nameEditor.root.hidden) return;
    const afterSave = nameEditor.afterSave;
    if (saveName) {
      setPlayerName(nameEditor.input.value, { dirty: true });
      audioEvent('ui_confirm');
    }
    nameEditor.root.hidden = true;
    nameEditor.anchor = null;
    nameEditor.afterSave = null;
    canvas.focus && canvas.focus();
    if (saveName && afterSave) afterSave();
  }

  if (nameEditor.form && nameEditor.input) {
    nameEditor.form.addEventListener('submit', (e) => {
      e.preventDefault();
      closePlayerNameEditor(true);
    });
    nameEditor.input.addEventListener('input', () => {
      const cleaned = cleanPlayerNameDraft(nameEditor.input.value);
      if (nameEditor.input.value !== cleaned) nameEditor.input.value = cleaned;
    });
    nameEditor.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePlayerNameEditor(false);
      }
    });
  }

  if (nameEditor.cancel) {
    nameEditor.cancel.addEventListener('click', () => closePlayerNameEditor(false));
  }

  function appendPlayerNameText(text) {
    const result = game.run && game.run.result;
    if (result && result.submitState === 'sent') return;
    const base = result && result.nameDirty ? game.save.playerName : '';
    setPlayerName(base + text, { dirty: true });
  }

  function removePlayerNameChar() {
    const result = game.run && game.run.result;
    if (result && result.submitState === 'sent') return;
    setPlayerName(String(game.save.playerName || '').slice(0, -1), { dirty: true });
  }

	  function cardAssetId(id) {
	    const map = {
	      pulse: 'proj_pulse',
	      boomerang: 'proj_orbital',
	      scatter: 'proj_scatter',
	      orbital: 'proj_orbital',
	      missile: 'proj_missile',
	      prism: 'proj_prism',
	      reactor: 'pickup_nucleo_vex',
	      magnet: 'pickup_ima',
	      cadence: 'proj_drone_aliado',
	      armor: 'pickup_reparo',
	      vex_pact: 'pickup_bomba_emp'
	    };
	    return map[id] || null;
	  }

	  function menuItems() {
	    return ['JOGAR', 'HANGAR', 'DESAFIO DIARIO', 'RANKING'];
	  }

  function shipAssetId(id) {
    return 'ship_' + id;
  }

  function enemyAssetId(type) {
    if (type === 'swarm') return 'enemy_swarm';
    return 'enemy_' + type;
  }

	  function bossAssetId(id) {
	    return 'boss_' + id;
	  }

	  function bossAnimAssetId(baseId, boss) {
	    const attackId = baseId + '_attack';
	    const phaseId = baseId + '_phase';
	    if ((boss.attackAnim || 0) > 0 && hasAsset(attackId)) return attackId;
	    if (((boss.phaseAnim || 0) > 0 || (boss.phase >= 2 && Math.sin(game.t * 2.6) > 0.55)) && hasAsset(phaseId)) return phaseId;
	    return baseId;
	  }

	  function bossAnimScale(boss) {
	    const attack = clamp((boss.attackAnim || 0) / 0.65, 0, 1);
	    const phase = clamp((boss.phaseAnim || 0) / 0.95, 0, 1);
	    return 1 + Math.sin(game.t * 22) * attack * 0.025 + phase * 0.035;
	  }

  function currentSector() {
    const wave = game.run ? game.run.wave : 1;
    if (wave >= 21) return { id: 4, name: 'NUCLEO SINGULAR' };
    if (wave >= 16) return { id: 4, name: 'OLHO DA MENTE' };
    if (wave >= 11) return { id: 3, name: 'FORJA OBELISCO' };
    if (wave >= 6) return { id: 2, name: 'FENDA HIDRA' };
    return { id: 1, name: 'CINTURAO NEON' };
  }

  const SHIPS = {
    falcao: {
      id: 'falcao',
      name: 'FALCAO',
      tag: 'Equilibrada',
      hp: 105,
      speed: 272,
      dashCd: 2.35,
      dashDist: 220,
      weapon: 'pulse',
      ability: 'Comeca com Overdrive em 45% e XP +10%.',
      cost: 0
    },
    espectro: {
      id: 'espectro',
      name: 'ESPECTRO',
      tag: 'Dash agressivo',
      hp: 75,
      speed: 318,
      dashCd: 1.75,
      dashDist: 245,
      weapon: 'boomerang',
      ability: 'Dash deixa eco que explode e provoca inimigos.',
      cost: 200
    },
    tita: {
      id: 'tita',
      name: 'TITA',
      tag: 'Tanque pesado',
      hp: 165,
      speed: 210,
      dashCd: 3.05,
      dashDist: 175,
      weapon: 'scatter',
      ability: 'Ao tomar dano, solta onda de choque defensiva.',
      cost: 350
    },
    tempestade: {
      id: 'tempestade',
      name: 'TEMPESTADE',
      tag: 'Porta-drones',
      hp: 92,
      speed: 252,
      dashCd: 2.35,
      dashDist: 220,
      weapon: 'missile',
      ability: 'Dois drones aliados orbitam e disparam sozinhos.',
      cost: 600
    },
    aurora: {
      id: 'aurora',
      name: 'AURORA',
      tag: 'Prototipo laser',
      hp: 88,
      speed: 260,
      dashCd: 2.15,
      dashDist: 225,
      weapon: 'prism',
      ability: 'Dano cresce enquanto nao toma dano.',
      cost: 1000
    }
  };

  const WEAPON_META = {
	    pulse: {
	      name: 'CANHAO DE PULSO',
	      kind: 'weapon',
	      max: 8,
	      desc: 'Tiros ciano precisos. Mais nivel = mais projeteis e perfuracao.'
	    },
	    boomerang: {
	      name: 'LAMINAS ESPECTRAIS',
	      kind: 'weapon',
	      max: 8,
	      desc: 'Discos retornantes atravessam alvos e limpam flancos.'
	    },
	    scatter: {
	      name: 'DISPERSOR FOTON',
	      kind: 'weapon',
	      max: 8,
	      desc: 'Rajada em cone. Excelente perto de enxames e chefes.'
    },
    orbital: {
      name: 'LAMINAS ORBITAIS',
      kind: 'weapon',
      max: 8,
      desc: 'Laminas giram ao redor da nave e cortam inimigos.'
    },
    missile: {
      name: 'MISSEIS COLMEIA',
      kind: 'weapon',
      max: 8,
      desc: 'Misseis teleguiados procuram alvos fora da mira.'
    },
    prism: {
      name: 'FEIXE PRISMA',
      kind: 'weapon',
      max: 8,
      desc: 'Laser continuo prende no alvo mais proximo.'
    },
    reactor: {
      name: 'REATOR TURBINADO',
      kind: 'passive',
      max: 5,
      desc: '+12% dano por nivel em todos os sistemas.'
    },
    magnet: {
      name: 'IMA DE PLASMA',
      kind: 'passive',
      max: 5,
      desc: '+35 px de imantacao por nivel.'
    },
    cadence: {
      name: 'SINCRONIA DE TIRO',
      kind: 'passive',
      max: 5,
      desc: '+10% cadencia por nivel.'
    },
    armor: {
      name: 'BLINDAGEM EDEN',
      kind: 'passive',
      max: 5,
      desc: '+15 HP maximo por nivel e cura parcial.'
    },
    vex_pact: {
      name: 'PACTO VEX',
      kind: 'pact',
      max: 2,
      desc: '+40% dano e +30% score. Inimigos ficam 18% mais rapidos.'
    }
  };

  const ENEMY_TYPES = {
    drone: { hp: 18, speed: 58, r: 13, score: 10, xp: 2, touch: 9, color: C.enemy },
    swarm: { hp: 9, speed: 95, r: 9, score: 5, xp: 1, touch: 6, color: C.enemy },
    hunter: { hp: 32, speed: 118, r: 15, score: 25, xp: 3, touch: 13, color: C.enemy },
    sentry: { hp: 46, speed: 32, r: 17, score: 30, xp: 4, touch: 10, color: C.enemy },
    bomber: { hp: 70, speed: 42, r: 20, score: 45, xp: 6, touch: 18, color: C.orange },
    weaver: { hp: 64, speed: 50, r: 18, score: 55, xp: 6, touch: 14, color: C.enemy },
    reaper: { hp: 160, speed: 84, r: 26, score: 250, xp: 16, touch: 24, color: C.elite },
    miniboss: { hp: 520, speed: 46, r: 42, score: 500, xp: 28, touch: 28, color: C.elite }
  };

  const BOSSES = [
    { id: 'devorador', name: 'DEVORADOR', hp: 1850, r: 96, score: 2000, wave: 5 },
    { id: 'hidra', name: 'HIDRA-VEX', hp: 2900, r: 104, score: 4000, wave: 10 },
    { id: 'obelisco', name: 'OBELISCO', hp: 4200, r: 108, score: 7000, wave: 15 },
    { id: 'mente', name: 'MENTE-MAE', hp: 6500, r: 116, score: 12000, wave: 20 },
    { id: 'serafim', name: 'SERAFIM-NULL', hp: 8600, r: 122, score: 17000, wave: 25 },
    { id: 'cronofago', name: 'CRONOFAGO', hp: 11200, r: 130, score: 24000, wave: 30 }
  ];

  const game = {
    mode: 'splash',
    t: 0,
    dt: 0,
    rng: mulberry32(Date.now()),
    fxRng: mulberry32(12345),
    save: loadSave(),
    input: null,
    audio: null,
    pointer: { x: 0, y: 0, down: false, active: false },
    run: null,
    menuIndex: 0,
    selectedShipIndex: 0,
    stars: [],
    nebula: [],
    particles: [],
    floaters: [],
    lastMs: performance.now(),
    accum: 0,
	    screenShake: 0,
	    debugFast: /(\?|&)fast=1/.test(location.search),
	    debugDemo: /(\?|&)demo=run/.test(location.search),
	    pokiGameplay: false,
	    adActive: false,
	    leaderboard: [],
	    leaderboardState: 'idle',
	    leaderboardError: '',
	    leaderboardLastLoad: 0,
	    assets: Assets
	  };

  window.__STARSHIP_GAME__ = game;

  class Input {
    constructor() {
	      this.keys = {};
	      this.pressed = {};
	      this.released = {};
	      this.text = '';
	      this.mouse = { x: W / 2, y: H / 2, down: false, clicked: false };
      this.touchMove = { active: false, x: 0, y: 0, vx: 0, vy: 0 };
      this.touchButtons = { dash: false, overdrive: false };
      window.addEventListener('keydown', (e) => {
        if (isNameEditorOpen() || (e.target && e.target.closest && e.target.closest('#name-editor'))) return;
        if (game.adActive) {
          e.preventDefault();
          return;
        }
	        ensureAudio();
	        if (!this.keys[e.code]) this.pressed[e.code] = true;
	        if (e.key && e.key.length === 1) this.text += e.key;
	        this.keys[e.code] = true;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      });
      window.addEventListener('keyup', (e) => {
        if (isNameEditorOpen() || (e.target && e.target.closest && e.target.closest('#name-editor'))) return;
        this.keys[e.code] = false;
        this.released[e.code] = true;
      });
      canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
      canvas.addEventListener('mousedown', (e) => {
        if (game.adActive) return;
        ensureAudio();
        this.updateMouse(e);
        this.mouse.down = true;
        this.mouse.clicked = true;
      });
      window.addEventListener('mouseup', () => {
        this.mouse.down = false;
        game.pointer.down = false;
        this.touchMove.active = false;
        this.touchButtons.dash = false;
        this.touchButtons.overdrive = false;
      });
      canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
      canvas.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: false });
      canvas.addEventListener('touchend', (e) => this.handleTouch(e), { passive: false });
      canvas.addEventListener('touchcancel', (e) => this.handleTouch(e), { passive: false });
      window.addEventListener('blur', () => {
        if (window.__STARSHIP_NO_AUTO_PAUSE__) return;
        if (game.mode === 'run') setMode('pause');
      });
      document.addEventListener('visibilitychange', () => {
        if (window.__STARSHIP_NO_AUTO_PAUSE__) return;
        if (document.hidden && game.mode === 'run') setMode('pause');
      });
    }
    updateMouse(e) {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) / r.width * W;
      this.mouse.y = (e.clientY - r.top) / r.height * H;
      game.pointer.x = this.mouse.x;
      game.pointer.y = this.mouse.y;
    }
    handleTouch(e) {
      e.preventDefault();
      if (game.adActive) return;
      ensureAudio();
      this.touchMove.active = false;
      this.touchButtons.dash = false;
      this.touchButtons.overdrive = false;
      const r = canvas.getBoundingClientRect();
      for (let i = 0; i < e.touches.length; i++) {
        const tx = (e.touches[i].clientX - r.left) / r.width * W;
        const ty = (e.touches[i].clientY - r.top) / r.height * H;
        this.mouse.x = tx;
        this.mouse.y = ty;
        if (game.mode !== 'run') {
          if (e.type === 'touchstart') this.mouse.clicked = true;
          continue;
        }
        const controls = touchControlLayout();
        if (tx < W * 0.48) {
	          this.touchMove.active = true;
	          const dx = tx - controls.joyX;
	          const dy = ty - controls.joyY;
	          const len = Math.max(1, Math.hypot(dx, dy));
	          this.touchMove.vx = clamp(dx / controls.joyR, -1, 1);
	          this.touchMove.vy = clamp(dy / controls.joyR, -1, 1);
	          if (len < 12) {
	            this.touchMove.vx = 0;
	            this.touchMove.vy = 0;
	          }
	        } else if (Math.hypot(tx - controls.dashX, ty - controls.dashY) <= controls.dashR * 1.45) {
	          this.touchButtons.dash = true;
	        } else if (Math.hypot(tx - controls.odX, ty - controls.odY) <= controls.odR * 1.5) {
	          this.touchButtons.overdrive = true;
        } else {
          this.mouse.clicked = e.type === 'touchstart';
        }
      }
      this.mouse.down = e.touches.length > 0;
    }
    endFrame() {
	      this.pressed = {};
	      this.released = {};
	      this.text = '';
	      this.mouse.clicked = false;
    }
    isDown(code) {
      return !!this.keys[code];
    }
    wasPressed(code) {
      return !!this.pressed[code];
    }
    moveVector() {
      let x = 0;
      let y = 0;
      if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
      if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
      if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
      if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
      if (this.touchMove.active) {
        x += this.touchMove.vx;
        y += this.touchMove.vy;
      }
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      return { x, y };
    }
  }

  function ensureAudio() {
    if (!game.audio) game.audio = new AudioEngine();
    return game.audio.unlock();
  }

  function audioEvent(id, power) {
    if (game.audio) game.audio.play(id, power);
  }

  function toggleMute() {
    if (!game.audio) game.audio = new AudioEngine();
    const muted = game.audio.toggle();
    if (game.mode === 'run' && game.run) {
      floater(muted ? 'SOM OFF' : 'SOM ON', game.run.player.x, game.run.player.y - 58, muted ? C.steel : C.pickup, 16);
    }
    return muted;
  }

  function currentAudioTrack() {
    if (game.mode === 'run') return game.run && game.run.boss ? 'boss' : 'run';
    if (game.mode === 'levelup') return 'levelup';
    return 'menu';
  }

  function updateAudio() {
    if (!game.audio) return;
    game.audio.setTrack(currentAudioTrack());
    game.audio.update();
  }

  window.__STARSHIP_AD_START__ = function () {
    game.adActive = true;
    if (game.audio && game.audio.master && game.audio.ctx && !game.audio.muted) {
      game.audio.master.gain.setTargetAtTime(0, game.audio.ctx.currentTime, 0.02);
    }
  };

  window.__STARSHIP_AD_END__ = function () {
    game.adActive = false;
    if (game.audio && game.audio.master && game.audio.ctx) {
      game.audio.master.gain.setTargetAtTime(game.audio.muted ? 0 : 0.82, game.audio.ctx.currentTime, 0.04);
    }
  };

  function audioStatusText() {
    if (game.save.muted) return 'SOM OFF';
    if (game.audio && game.audio.unlocked) return 'SOM ON';
    return 'M SOM';
  }

  function drawAudioStatus(x, y, align) {
    drawMono(audioStatusText(), x, y, 13, game.save.muted ? C.steel : C.pickup, align || 'right', '800');
  }

  function handleAudioShortcut() {
	    if (['splash', 'menu', 'hangar', 'run', 'levelup', 'ranking'].includes(game.mode) && game.input.wasPressed('KeyM')) {
      toggleMute();
      audioEvent('ui_confirm');
    }
  }

  function initVisuals() {
    game.rng = mulberry32(hashSeed('starfield-2050'));
    game.stars.length = 0;
    for (let layer = 0; layer < 3; layer++) {
      const count = [90, 70, 45][layer];
      for (let i = 0; i < count; i++) {
        game.stars.push({
          x: rnd(0, W),
          y: rnd(0, H),
          z: layer + 1,
          r: rnd(0.5, 1.8 + layer * 0.4),
          a: rnd(0.3, 0.9),
          tw: rnd(1.5, 4.5)
        });
      }
    }
    game.nebula = [
      { x: 210, y: 160, r: 320, c: C.purple, a: 0.12 },
      { x: 930, y: 210, r: 390, c: C.blue, a: 0.14 },
      { x: 690, y: 610, r: 430, c: C.purple, a: 0.10 }
    ];
    game.rng = mulberry32(Date.now());
  }

  function drawBackground(speed) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const sector = currentSector();
    const bg = Assets.images['bg_sector_' + sector.id];
    if (bg) {
      ctx.save();
      ctx.globalAlpha = game.mode === 'run' ? 0.54 : 0.72;
      const pan = game.t * (speed || 10) * 0.18;
      ctx.drawImage(bg, -24 + Math.sin(game.t * 0.05) * 24, -18 + (pan % 36), W + 48, H + 36);
      ctx.restore();
    }
    for (const n of game.nebula) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c);
      g.addColorStop(1, 'rgba(5,5,16,0)');
      ctx.globalAlpha = n.a;
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.globalAlpha = 1;
    for (const s of game.stars) {
      const y = (s.y + game.t * (speed || 12) * s.z) % H;
      ctx.globalAlpha = s.a + Math.sin(game.t * s.tw + s.x) * 0.12;
      ctx.fillStyle = s.z === 3 ? '#D8F6FF' : C.white;
      ctx.fillRect(s.x, y, s.r, s.r);
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = C.player;
    ctx.lineWidth = 1;
    const grid = 64;
    const off = (game.t * 28) % grid;
    for (let x = -grid; x < W + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x + off * 0.2, 0);
      ctx.lineTo(x - off * 0.2, H);
      ctx.stroke();
    }
    for (let y = -grid; y < H + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y + off);
      ctx.lineTo(W, y + off);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function spawnParticle(x, y, color, count, power, size) {
    for (let i = 0; i < count; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(power * 0.35, power);
      game.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rnd(0.25, 0.8),
        max: 0.8,
        color,
        size: rnd(size * 0.55, size * 1.3),
        drag: rnd(0.88, 0.97)
      });
    }
  }

  function floater(text, x, y, color, size) {
    game.floaters.push({ text, x, y, color, size: size || 16, life: 0.75, max: 0.75, vy: -38 });
  }

  function updateFx(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.life -= dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) game.particles.splice(i, 1);
    }
    for (let i = game.floaters.length - 1; i >= 0; i--) {
      const f = game.floaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      if (f.life <= 0) game.floaters.splice(i, 1);
    }
    game.screenShake = Math.max(0, game.screenShake - dt * 18);
  }

  function drawFx() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of game.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      glow(p.color, 10);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, TAU);
      ctx.fill();
    }
    noGlow();
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const f of game.floaters) {
      const a = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = a;
      drawMono(f.text, f.x, f.y, f.size, f.color, 'center', '800');
    }
    ctx.globalAlpha = 1;
  }

	  function setMode(mode) {
	    if (game.mode === 'run' && mode !== 'run' && game.pokiGameplay) {
	      window.PokiBridge.gameplayStop();
	      game.pokiGameplay = false;
	    }
	    game.mode = mode;
	    if (mode === 'ranking') refreshLeaderboard(false);
	  }

  function startRun(options) {
    const ship = SHIPS[game.save.selectedShip] || SHIPS.falcao;
    const seed = options && options.daily ? hashSeed(new Date().toISOString().slice(0, 10)) : Date.now();
    game.rng = mulberry32(seed);
    const u = game.save.upgrades;
    const hpMax = Math.round(ship.hp * (1 + u.hull * 0.04));
    const run = {
      seed,
      ship,
      daily: !!(options && options.daily),
      time: 0,
      wave: 1,
      waveTimer: 0,
      waveDuration: game.debugFast ? 8 : 40,
      phase: 'wave',
      bossIndex: -1,
      boss: null,
      enemies: [],
      bullets: [],
      enemyBullets: [],
      orbs: [],
      pickups: [],
      drones: [],
      telegraphs: [],
      player: {
        x: W / 2,
        y: H / 2 + 120,
        vx: 0,
        vy: 0,
        r: 8,
        hp: hpMax,
        hpMax,
        speed: ship.speed * (1 + u.engines * 0.03),
        face: -Math.PI / 2,
        invuln: 0,
        dashCd: 0,
        dashBase: ship.dashCd * (1 - u.engines * 0.04),
        dashTime: 0,
        dashVx: 0,
        dashVy: 0,
        overdrive: ship.id === 'falcao' ? 45 : 0,
        overdriveTime: 0,
        level: 1,
        xp: 0,
        xpNeed: 14,
        fire: 0,
        noDamageTime: 0,
        damageBoost: 0
      },
      weapons: {},
      passives: { reactor: 0, magnet: 0, cadence: 0, armor: 0, vex_pact: 0 },
      score: 0,
      combo: 0,
      comboTimer: 0,
      kills: 0,
      nearMisses: 0,
      bossKills: 0,
      completedWaves: 0,
      cards: [],
      selectedCard: 0,
      levelPause: false,
      spawnAcc: 0,
      spawnBudget: 0,
      missionToast: 0,
      nearMissTextCd: 0,
      tutorial: 0,
      overdriveReadyToast: false,
      missions: makeMissions(),
      lastNaturalBreak: 0,
      pacts: 0,
      evolved: 0,
      mobileButtons: []
    };
    run.weapons[ship.weapon] = 1;
    if (ship.id === 'tempestade') {
      run.drones.push({ a: 0, fire: 0 });
      run.drones.push({ a: Math.PI, fire: 0 });
    }
    if (ship.id === 'tita') run.passives.armor = 1;
    game.run = run;
    game.save.totalRuns++;
    storeSave();
    game.particles.length = 0;
    game.floaters.length = 0;
    spawnWaveMessage('ONDA 1');
    spawnSectorMessage();
    setMode('run');
    if (!game.pokiGameplay) {
      window.PokiBridge.gameplayStart();
      game.pokiGameplay = true;
    }
  }

  function makeMissions() {
    const pool = [
      { id: 'kills', title: 'MISSAO: corte o enxame', desc: 'Abata 55 Vex', target: 55, value: 0, done: false, reward: 12 },
      { id: 'near', title: 'MISSAO: na risca', desc: 'Consiga 10 near-misses', target: 10, value: 0, done: false, reward: 10 },
      { id: 'survive', title: 'MISSAO: segure a rota', desc: 'Conclua 4 ondas', target: 4, value: 0, done: false, reward: 14 },
      { id: 'level', title: 'MISSAO: calibragem', desc: 'Alcance nivel 6', target: 6, value: 1, done: false, reward: 16 },
      { id: 'combo', title: 'MISSAO: sequencia', desc: 'Chegue a combo 30', target: 30, value: 0, done: false, reward: 13 },
      { id: 'boss', title: 'MISSAO: quebre o chefe', desc: 'Derrote o DEVORADOR', target: 1, value: 0, done: false, reward: 20 }
    ];
    const chosen = [pool[0], pool[1], pool[2], pool[5]];
    if (chance(0.5)) chosen[2] = pool[3];
    if (chance(0.35)) chosen[1] = pool[4];
    return chosen.map((m) => Object.assign({}, m));
  }

  function missionProgress(id, amount) {
    const run = game.run;
    if (!run) return;
    const m = run.missions.find((x) => x.id === id);
    if (!m || m.done) return;
    m.value = clamp(m.value + amount, 0, m.target);
    if (m.value >= m.target) {
      m.done = true;
      run.score += m.reward * 100;
      audioEvent('mission');
      floater('MISSAO + ' + m.reward + ' NUCLEOS', W / 2, 150, C.pickup, 22);
      spawnParticle(W / 2, 150, C.pickup, 36, 180, 4);
      run.missionToast = 3;
    }
  }

  function spawnWaveMessage(text) {
    audioEvent('wave');
    floater(text, W / 2, 118, C.white, 32);
    spawnParticle(W / 2, 118, C.player, 18, 100, 3);
  }

  function spawnSectorMessage() {
    const sector = currentSector();
    floater('SETOR ' + sector.id + ': ' + sector.name, W / 2, 156, C.pickup, 18);
  }

  function pickSpawnPoint() {
    const side = Math.floor(rnd(0, 4));
    if (side === 0) return { x: rnd(-40, W + 40), y: -36 };
    if (side === 1) return { x: W + 36, y: rnd(-20, H + 20) };
    if (side === 2) return { x: rnd(-40, W + 40), y: H + 36 };
    return { x: -36, y: rnd(-20, H + 20) };
  }

  function spawnEnemy(type, x, y, extra) {
    const base = ENEMY_TYPES[type] || ENEMY_TYPES.drone;
    const run = game.run;
    const pactSpeed = 1 + run.passives.vex_pact * 0.18;
    const waveMult = 1 + (run.wave - 1) * 0.12;
    const e = {
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      r: base.r * (extra && extra.scale ? extra.scale : 1),
      hp: Math.round(base.hp * waveMult * (extra && extra.hpMult ? extra.hpMult : 1)),
      maxHp: 0,
      speed: base.speed * pactSpeed * (extra && extra.speedMult ? extra.speedMult : 1),
      score: base.score,
      xp: base.xp,
      touch: base.touch,
      fire: rnd(0.3, 2.0),
      phase: rnd(0, TAU),
      spawn: 0.25,
      rot: rnd(0, TAU),
      hitFlash: 0,
      state: 'chase',
      stateT: 0,
      color: base.color,
      elite: type === 'reaper' || type === 'miniboss',
      targetX: W / 2,
      targetY: H / 2
    };
    e.maxHp = e.hp;
    run.enemies.push(e);
    return e;
  }

  function spawnBoss(index) {
    const data = BOSSES[index % BOSSES.length];
    const cycle = Math.floor(index / BOSSES.length);
    const hp = Math.floor(data.hp * (1 + cycle * 0.75));
    const boss = {
      id: data.id,
      name: data.name,
      x: W / 2,
      y: -110,
      r: data.r,
      hp,
      maxHp: hp,
      score: data.score,
      entry: 2.1,
      fire: 1.1,
      special: 2.4,
      patternT: 0,
      phase: 1,
      rot: 0,
      invuln: 1.8,
      heads: data.id === 'hidra' ? 3 : 0,
      petals: data.id === 'mente' ? 6 : 0,
      wings: data.id === 'serafim' ? 6 : 0,
	      rings: data.id === 'cronofago' ? 3 : 0,
	      attackAnim: 0,
	      phaseAnim: 0,
	      dead: false
	    };
    game.run.boss = boss;
    game.run.phase = 'boss';
    game.run.bossIndex = index;
    game.run.waveTimer = 0;
    game.screenShake = 10;
    audioEvent('boss_alert');
    floater('CHEFE DETECTADO: ' + boss.name, W / 2, 116, C.danger, 28);
    spawnParticle(W / 2, 92, C.enemy, 42, 180, 4);
  }

  function updateRun(dt) {
    const run = game.run;
    const p = run.player;
    run.time += dt;
    run.waveTimer += dt;
    game.save.totalTime += dt;
    p.noDamageTime += dt;

    if (game.input.wasPressed('Escape') || game.input.wasPressed('KeyP')) {
      setMode('pause');
      return;
    }
    if (game.input.wasPressed('KeyF')) toggleFullscreen();

    updatePlayer(dt);
    updateDrones(dt);
    updateWeapons(dt);
    updateSpawner(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateProjectiles(dt);
    updateOrbs(dt);
    updateTelegraphs(dt);
    updateMissions(dt);
    run.nearMissTextCd = Math.max(0, run.nearMissTextCd - dt);
    updateFx(dt);
    if (p.hp <= 0) finishRun(false, 'destruido');
  }

  function updateMissions(dt) {
    const run = game.run;
    if (run.missionToast > 0) run.missionToast -= dt;
    for (const m of run.missions) {
      if (m.id === 'boss' && run.bossKills > 0 && !m.done) missionProgress('boss', 1);
      if (m.id === 'level' && !m.done) missionProgress('level', Math.max(0, run.player.level - m.value));
      if (m.id === 'combo' && !m.done && run.combo > m.value) missionProgress('combo', run.combo - m.value);
    }
  }

  function updatePlayer(dt) {
    const run = game.run;
    const p = run.player;
    const mv = game.input.moveVector();
    const moving = Math.hypot(mv.x, mv.y) > 0.01;
    if (moving) p.face = angleTo(0, 0, mv.x, mv.y);
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.overdriveTime > 0) {
      p.overdriveTime -= dt;
      p.overdrive = clamp(p.overdriveTime / overdriveDuration() * 100, 0, 100);
      if (p.overdriveTime <= 0) {
        p.overdrive = 0;
        audioEvent('overdrive_off');
        floater('OVERDRIVE ESGOTADO', p.x, p.y - 40, C.steel, 16);
      }
    }
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;
      spawnParticle(p.x - Math.cos(p.face) * 14, p.y - Math.sin(p.face) * 14, C.player, 1, 30, 3);
    } else {
      const speed = p.speed * (p.overdriveTime > 0 ? 1.15 : 1);
      p.vx = mv.x * speed;
      p.vy = mv.y * speed;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    p.x = clamp(p.x, 24, W - 24);
    p.y = clamp(p.y, 64, H - 28);
    if ((game.input.wasPressed('Space') || game.input.touchButtons.dash) && p.dashCd <= 0) {
      const dx = moving ? mv.x : Math.cos(p.face);
      const dy = moving ? mv.y : Math.sin(p.face);
      const len = Math.max(1, Math.hypot(dx, dy));
      p.dashVx = dx / len * shipDashSpeed();
      p.dashVy = dy / len * shipDashSpeed();
      p.dashTime = 0.18;
      p.invuln = 0.25 + game.save.upgrades.engines * 0.02;
      p.dashCd = p.dashBase;
      game.screenShake = 3;
      game.save.totalDashes = (game.save.totalDashes || 0) + 1;
      audioEvent('dash');
      spawnParticle(p.x, p.y, C.player, 18, 160, 3);
      if (run.ship.id === 'espectro') spawnEcho(p.x, p.y);
    }
    if ((game.input.wasPressed('ShiftLeft') || game.input.wasPressed('ShiftRight') || game.input.touchButtons.overdrive) && p.overdrive >= 100 && p.overdriveTime <= 0) {
      p.overdriveTime = overdriveDuration();
      p.overdriveReadyToast = false;
      game.screenShake = 7;
      game.save.totalOverdrives = (game.save.totalOverdrives || 0) + 1;
      audioEvent('overdrive_on');
      floater('OVERDRIVE', p.x, p.y - 46, C.pickup, 24);
      spawnParticle(p.x, p.y, C.white, 48, 240, 4);
      if (game.save.upgrades.systems >= 5) clearEnemyBullets(210);
    }
  }

  function overdriveDuration() {
    return 6 + game.save.upgrades.systems * 0.2;
  }

  function shipDashSpeed() {
    return game.run.ship.dashDist / 0.18;
  }

  function spawnEcho(x, y) {
    game.run.telegraphs.push({ kind: 'echo', x, y, r: 58, life: 1.5, max: 1.5, damage: 28 });
  }

  function clearEnemyBullets(radius) {
    const run = game.run;
    const p = run.player;
    for (let i = run.enemyBullets.length - 1; i >= 0; i--) {
      const b = run.enemyBullets[i];
      if (dist2(b.x, b.y, p.x, p.y) <= radius * radius) {
        spawnParticle(b.x, b.y, C.player, 4, 90, 2);
        run.enemyBullets.splice(i, 1);
      }
    }
  }

  function updateDrones(dt) {
    const run = game.run;
    const p = run.player;
    for (const d of run.drones) {
      d.a += dt * 2.1;
      d.x = p.x + Math.cos(d.a) * 70;
      d.y = p.y + Math.sin(d.a) * 70;
      d.fire -= dt;
      if (d.fire <= 0) {
        const target = nearestEnemy(d.x, d.y, 580);
        if (target) {
          const a = angleTo(d.x, d.y, target.x, target.y);
          addBullet(d.x, d.y, Math.cos(a) * 580, Math.sin(a) * 580, 7 * damageMult() * 0.65, 4, 'player', C.player, 'pulse');
          d.fire = 0.8 / cadenceMult();
        }
      }
    }
  }

	  function updateWeapons(dt) {
	    const run = game.run;
	    const p = run.player;
	    const target = nearestEnemy(p.x, p.y, 760) || run.boss;
	    p.fire -= dt;
	    if (p.fire <= 0 && target) {
	      const baseCd = Math.max(0.13, 0.42 / cadenceMult());
	      if (run.weapons.pulse) firePulse(target);
	      if (run.weapons.boomerang) fireBoomerang(target);
	      if (run.weapons.scatter) fireScatter(target);
	      if (run.weapons.missile) fireMissile(target);
	      p.fire = baseCd;
	    }
    if (run.weapons.orbital) updateOrbitals(dt);
    if (run.weapons.prism) updatePrism(dt);
  }

  function cadenceMult() {
    return 1 + game.run.passives.cadence * 0.10 + (game.run.player.overdriveTime > 0 ? 0.4 : 0);
  }

  function damageMult() {
    const run = game.run;
    let m = 1 + run.passives.reactor * 0.12 + game.save.upgrades.weapons * 0.03 + run.passives.vex_pact * 0.40;
    if (run.player.overdriveTime > 0) m *= 1.3;
    if (run.ship.id === 'aurora') {
      run.player.damageBoost = clamp(run.player.noDamageTime * 0.04, 0, 0.6);
      m *= 1 + run.player.damageBoost;
    }
    return m;
  }

  function firePulse(target) {
    const run = game.run;
    const p = run.player;
    const lv = run.weapons.pulse || 1;
    const a = angleTo(p.x, p.y, target.x, target.y);
    const count = lv >= 6 ? 3 : lv >= 3 ? 2 : 1;
    const dmg = (10 + lv * 4.1) * damageMult();
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 13;
      const ox = Math.cos(a + Math.PI / 2) * off;
      const oy = Math.sin(a + Math.PI / 2) * off;
      addBullet(p.x + ox, p.y + oy, Math.cos(a) * 640, Math.sin(a) * 640, dmg, 5, 'player', C.player, 'pulse', lv >= 4 ? 1 : 0);
    }
  }

	  function fireScatter(target) {
    const run = game.run;
    const p = run.player;
    const lv = run.weapons.scatter || 1;
    const base = angleTo(p.x, p.y, target.x, target.y);
    const count = 4 + Math.floor(lv * 0.65);
    const spread = (40 + lv * 1.4) * Math.PI / 180;
    const dmg = (5.5 + lv * 1.1) * damageMult();
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const a = base + t * spread;
      addBullet(p.x, p.y, Math.cos(a) * 520, Math.sin(a) * 520, dmg, 5, 'player', C.player, 'scatter', lv >= 6 ? 1 : 0, 0.7);
	    }
	  }

	  function fireBoomerang(target) {
	    const run = game.run;
	    const p = run.player;
	    const lv = run.weapons.boomerang || 1;
	    const base = angleTo(p.x, p.y, target.x, target.y);
	    const count = lv >= 6 ? 3 : lv >= 3 ? 2 : 1;
	    for (let i = 0; i < count; i++) {
	      const a = base + (i - (count - 1) / 2) * 0.22;
	      const b = addBullet(p.x, p.y, Math.cos(a) * 470, Math.sin(a) * 470, (8 + lv * 2.8) * damageMult(), 9, 'player', C.player, 'boomerang', 2 + Math.floor(lv / 2), 1.15);
	      b.spin = (i % 2 ? -1 : 1) * (10 + lv * 0.6);
	    }
	  }

  function fireMissile(target) {
    const run = game.run;
    const p = run.player;
    const lv = run.weapons.missile || 1;
    const count = lv >= 7 ? 3 : lv >= 4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const a = p.face + (i - (count - 1) / 2) * 0.35;
      const b = addBullet(p.x, p.y, Math.cos(a) * 300, Math.sin(a) * 300, (15 + lv * 4) * damageMult(), 6, 'player', C.pickup, 'missile', 0, 2.5);
      b.homing = 5.2;
    }
  }

  function updatePrism(dt) {
    const run = game.run;
    const p = run.player;
    const target = nearestEnemy(p.x, p.y, 520) || run.boss;
    if (!target) return;
    const lv = run.weapons.prism || 1;
    const dmg = (20 + lv * 5) * damageMult() * dt;
    target.hp -= dmg;
    target.hitFlash = 0.04;
    run.prismBeam = { x1: p.x, y1: p.y, x2: target.x, y2: target.y, life: 0.08 };
    audioEvent('beam');
    spawnParticle(target.x, target.y, C.player, 1, 18, 2);
  }

  function updateOrbitals(dt) {
    const run = game.run;
    const p = run.player;
    const lv = run.weapons.orbital || 1;
    run.orbitalAngle = (run.orbitalAngle || 0) + dt * (2.6 + lv * 0.15);
    const count = Math.min(6, 2 + Math.floor(lv / 2));
    const radius = 58 + lv * 6;
    for (let i = 0; i < count; i++) {
      const a = run.orbitalAngle + i * TAU / count;
      const x = p.x + Math.cos(a) * radius;
      const y = p.y + Math.sin(a) * radius;
      for (const e of run.enemies) {
        if (dist2(x, y, e.x, e.y) < (e.r + 12) * (e.r + 12)) {
          e.hp -= (18 + lv * 4) * damageMult() * dt * 2.8;
          e.hitFlash = 0.05;
        }
      }
      if (run.boss && dist2(x, y, run.boss.x, run.boss.y) < (run.boss.r + 14) * (run.boss.r + 14)) {
        run.boss.hp -= (18 + lv * 4) * damageMult() * dt * 2.2;
      }
    }
  }

	  function addBullet(x, y, vx, vy, dmg, r, owner, color, kind, pierce, life) {
	    const ttl = life || 1.5;
	    const b = { x, y, vx, vy, dmg, r, owner, color, kind, pierce: pierce || 0, life: ttl, maxLife: ttl, near: false, nearMin: 999, rot: angleTo(0, 0, vx, vy) };
    if (owner === 'player') {
      game.run.bullets.push(b);
      audioEvent('shot', kind === 'missile' ? 0.9 : 0.55);
    } else {
      game.run.enemyBullets.push(b);
    }
    return b;
  }

  function nearestEnemy(x, y, maxDist) {
    const run = game.run;
    let best = null;
    let bd = maxDist * maxDist;
    for (const e of run.enemies) {
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (run.boss && run.boss.entry <= 0 && run.boss.hp > 0) {
      const d = dist2(x, y, run.boss.x, run.boss.y);
      if (d < bd) best = run.boss;
    }
    return best;
  }

  function updateSpawner(dt) {
    const run = game.run;
    if (run.phase === 'boss') return;
    const spawnRate = 0.58 + run.wave * 0.11;
    run.spawnAcc += dt * spawnRate;
    while (run.spawnAcc >= 1) {
      run.spawnAcc -= 1;
      spawnWaveEnemy();
    }
    if (run.wave >= 3 && run.wave % 3 === 0 && !run.minibossSpawned) {
      const p = pickSpawnPoint();
      spawnEnemy('miniboss', p.x, p.y, { hpMult: 1 + run.wave * 0.08 });
      run.minibossSpawned = true;
      floater('MINIBOSS', W / 2, 135, C.elite, 24);
      game.screenShake = 5;
    }
    if (run.waveTimer >= run.waveDuration) {
      completeWave();
    }
  }

  function spawnWaveEnemy() {
    const run = game.run;
    const w = run.wave;
    const p = pickSpawnPoint();
    let type = 'drone';
    const roll = game.rng();
    if (w <= 2) type = roll < 0.7 ? 'drone' : 'swarm';
    else if (w <= 4) type = roll < 0.42 ? 'drone' : roll < 0.68 ? 'hunter' : roll < 0.84 ? 'swarm' : 'sentry';
    else if (w <= 8) type = roll < 0.25 ? 'drone' : roll < 0.48 ? 'hunter' : roll < 0.63 ? 'sentry' : roll < 0.78 ? 'bomber' : roll < 0.92 ? 'weaver' : 'reaper';
    else type = roll < 0.16 ? 'swarm' : roll < 0.34 ? 'hunter' : roll < 0.52 ? 'sentry' : roll < 0.68 ? 'bomber' : roll < 0.83 ? 'weaver' : 'reaper';
    if (type === 'swarm') {
      const count = 3 + Math.floor(rnd(0, 4));
      for (let i = 0; i < count; i++) spawnEnemy(type, p.x + rnd(-24, 24), p.y + rnd(-24, 24), { speedMult: rnd(0.8, 1.15) });
    } else {
      spawnEnemy(type, p.x, p.y);
    }
  }

  function completeWave() {
    const run = game.run;
    run.completedWaves++;
    run.score += run.wave * 100;
    addOverdrive(10);
    missionProgress('survive', 1);
    if (run.wave % 5 === 0) {
      spawnBoss(run.wave / 5 - 1);
    } else {
      run.wave++;
      run.waveTimer = 0;
      run.minibossSpawned = false;
      spawnWaveMessage('ONDA ' + run.wave);
      if (run.wave === 6 || run.wave === 11 || run.wave === 16 || run.wave === 21) spawnSectorMessage();
      if (run.wave % 3 === 2) spawnEvent();
    }
  }

  function spawnEvent() {
    const names = ['CAMPO DE METEOROS', 'CACADA DE ELITE', 'CHUVA DE SUPRIMENTOS', 'ZONA ESCURA'];
    const name = names[Math.floor(rnd(0, names.length))];
    floater(name, W / 2, 156, C.pickup, 20);
    if (name === 'CACADA DE ELITE') {
      for (let i = 0; i < 2; i++) {
        const p = pickSpawnPoint();
        spawnEnemy('reaper', p.x, p.y, { hpMult: 1.25 });
      }
    }
    if (name === 'CHUVA DE SUPRIMENTOS') {
      for (let i = 0; i < 9; i++) runDropOrb(rnd(100, W - 100), rnd(100, H - 100), 8 + Math.floor(rnd(0, 7)));
    }
  }

  function updateEnemies(dt) {
    const run = game.run;
    const p = run.player;
    for (let i = run.enemies.length - 1; i >= 0; i--) {
      const e = run.enemies[i];
      if (e.spawn > 0) e.spawn -= dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.stateT += dt;
      const a = angleTo(e.x, e.y, p.x, p.y);
      let speed = e.speed;
      if (e.type === 'sentry') speed *= dist2(e.x, e.y, p.x, p.y) < 260 * 260 ? 0.12 : 0.5;
      if (e.type === 'weaver') speed *= 0.75 + Math.sin(game.t * 2 + e.phase) * 0.1;
      if (e.type === 'miniboss') speed *= Math.sin(e.stateT * 3) > 0.2 ? 1 : 0.45;
      e.vx = Math.cos(a) * speed;
      e.vy = Math.sin(a) * speed;
      if (e.type === 'swarm') {
        e.vx += Math.cos(a + Math.PI / 2) * Math.sin(game.t * 5 + e.phase) * 42;
        e.vy += Math.sin(a + Math.PI / 2) * Math.sin(game.t * 5 + e.phase) * 42;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot = a;
      e.fire -= dt;
      if (e.fire <= 0 && (e.type === 'sentry' || e.type === 'weaver' || e.type === 'reaper' || e.type === 'miniboss')) {
        fireEnemy(e);
        e.fire = enemyFireDelay(e);
      }
      if (e.spawn <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r) * (e.r + p.r)) {
        damagePlayer(e.touch);
        const push = angleTo(e.x, e.y, p.x, p.y);
        p.x += Math.cos(push) * 20;
        p.y += Math.sin(push) * 20;
      }
      if (e.hp <= 0) killEnemy(i);
    }
  }

  function enemyFireDelay(e) {
    if (e.type === 'miniboss') return 0.85;
    if (e.type === 'reaper') return 1.2;
    if (e.type === 'weaver') return 1.7;
    return 1.4;
  }

  function fireEnemy(e) {
    const run = game.run;
    const p = run.player;
    const base = angleTo(e.x, e.y, p.x, p.y);
    if (e.type === 'miniboss') {
      for (let i = 0; i < 8; i++) {
        const a = base + (i - 3.5) * 0.18;
        addBullet(e.x, e.y, Math.cos(a) * 190, Math.sin(a) * 190, 10, 5, 'enemy', C.enemy, 'orb', 0, 4);
      }
      return;
    }
    if (e.type === 'reaper') {
      for (let i = 0; i < 3; i++) {
        const a = base + (i - 1) * 0.22;
        addBullet(e.x, e.y, Math.cos(a) * 240, Math.sin(a) * 240, 11, 5, 'enemy', C.elite, 'needle', 0, 3.4);
      }
      return;
    }
    const sp = e.type === 'weaver' ? 180 : 210;
    addBullet(e.x, e.y, Math.cos(base) * sp, Math.sin(base) * sp, 9, 5, 'enemy', C.enemy, 'orb', 0, 3.2);
  }

  function killEnemy(index) {
    const run = game.run;
    const e = run.enemies[index];
    run.enemies.splice(index, 1);
    const over = run.player.overdriveTime > 0 ? 2 : 1;
    const mult = comboMult();
    run.score += Math.floor(e.score * mult * over);
    run.combo++;
    run.comboTimer = 4;
    run.kills++;
    game.save.totalKills++;
    addOverdrive(e.elite ? 10 : 2);
    runDropOrb(e.x, e.y, e.xp);
    if (e.type === 'bomber') {
      addExplosion(e.x, e.y, 64, 30);
    }
    spawnParticle(e.x, e.y, e.elite ? C.elite : C.enemy, e.elite ? 36 : 16, e.elite ? 190 : 120, e.elite ? 4 : 3);
    floater('+' + Math.floor(e.score * mult * over), e.x, e.y - 16, e.elite ? C.pickup : C.white, e.elite ? 18 : 14);
    audioEvent(e.elite ? 'elite_kill' : 'kill');
    missionProgress('kills', 1);
  }

  function comboMult() {
    const c = game.run.combo;
    if (c >= 200) return 5;
    if (c >= 100) return 4;
    if (c >= 50) return 3;
    if (c >= 25) return 2;
    if (c >= 10) return 1.5;
    return 1;
  }

  function runDropOrb(x, y, amount) {
    const run = game.run;
    const pieces = Math.min(6, Math.max(1, Math.ceil(amount / 4)));
    for (let i = 0; i < pieces; i++) {
      const a = rnd(0, TAU);
      run.orbs.push({
        x,
        y,
        vx: Math.cos(a) * rnd(30, 140),
        vy: Math.sin(a) * rnd(30, 140),
        value: Math.ceil(amount / pieces),
        r: amount > 10 ? 6 : 4,
        life: 25,
        phase: rnd(0, TAU)
      });
    }
  }

  function addExplosion(x, y, radius, damage) {
    const run = game.run;
    run.telegraphs.push({ kind: 'explosion', x, y, r: radius, life: 0.55, max: 0.55, damage, armed: true });
  }

  function updateBoss(dt) {
    const run = game.run;
    const boss = run.boss;
    if (!boss) return;
	    const p = run.player;
	    boss.entry -= dt;
	    boss.invuln = Math.max(0, boss.invuln - dt);
	    boss.attackAnim = Math.max(0, (boss.attackAnim || 0) - dt);
	    boss.phaseAnim = Math.max(0, (boss.phaseAnim || 0) - dt);
	    if (boss.entry > 0) {
      boss.y = lerp(130, -110, boss.entry / 2.1);
      return;
    }
    boss.rot += dt * 0.55;
    boss.patternT += dt;
    if (boss.id === 'obelisco') {
      boss.x = W / 2 + Math.sin(run.time * 0.28) * 60;
      boss.y = 360 + Math.cos(run.time * 0.32) * 18;
    } else if (boss.id === 'mente') {
      boss.x = W / 2 + Math.sin(run.time * 0.22) * 105;
      boss.y = 352 + Math.cos(run.time * 0.25) * 22;
    } else if (boss.id === 'serafim') {
      boss.x = W / 2 + Math.sin(run.time * 0.48) * 250;
      boss.y = 350 + Math.cos(run.time * 0.38) * 30;
    } else if (boss.id === 'cronofago') {
      boss.x = W / 2 + Math.sin(run.time * 0.18) * 70 + Math.sin(run.time * 0.71) * 34;
      boss.y = 360 + Math.cos(run.time * 0.21) * 24;
    } else {
      boss.x = W / 2 + Math.sin(run.time * (boss.id === 'hidra' ? 0.55 : 0.8)) * 210;
      boss.y = 350 + Math.cos(run.time * 0.55) * 28;
    }
    const hpPct = boss.hp / boss.maxHp;
    const newPhase = hpPct < 0.34 ? 3 : hpPct < 0.67 ? 2 : 1;
	    if (newPhase !== boss.phase) {
	      boss.phase = newPhase;
	      boss.invuln = 0.7;
	      boss.phaseAnim = 0.95;
	      game.screenShake = 9;
      audioEvent('boss_phase');
      floater('FASE ' + boss.phase, boss.x, boss.y + boss.r + 28, C.enemy, 24);
      spawnParticle(boss.x, boss.y, C.enemy, 44, 220, 4);
    }
	    boss.fire -= dt;
	    if (boss.fire <= 0) {
	      boss.attackAnim = Math.max(boss.attackAnim || 0, 0.34);
	      fireBoss(boss);
	      boss.fire = bossFireDelay(boss);
	    }
	    boss.special -= dt;
	    if (boss.special <= 0) {
	      boss.attackAnim = Math.max(boss.attackAnim || 0, 0.68);
	      fireBossSpecial(boss);
      boss.special = bossSpecialDelay(boss);
    }
    if (dist2(boss.x, boss.y, p.x, p.y) < (boss.r * 0.8 + p.r) * (boss.r * 0.8 + p.r)) {
      damagePlayer(28);
    }
    if (boss.hp <= 0 && !boss.dead) {
      killBoss();
    }
  }

  function bossFireDelay(boss) {
    if (boss.id === 'devorador') return boss.phase === 1 ? 1.4 : 1.0;
    if (boss.id === 'hidra') return boss.phase === 1 ? 1.1 : 0.75;
    if (boss.id === 'obelisco') return boss.phase === 1 ? 1.2 : 0.9;
    if (boss.id === 'serafim') return boss.phase === 1 ? 0.92 : 0.56;
    if (boss.id === 'cronofago') return boss.phase === 1 ? 0.84 : 0.48;
    return boss.phase === 1 ? 1.0 : 0.62;
  }

  function bossSpecialDelay(boss) {
    if (boss.id === 'devorador') return boss.phase === 1 ? 4.4 : 3.2;
    if (boss.id === 'hidra') return boss.phase === 1 ? 3.6 : 2.7;
    if (boss.id === 'obelisco') return boss.phase === 1 ? 4.2 : 3.0;
    if (boss.id === 'serafim') return boss.phase === 1 ? 3.0 : 2.25;
    if (boss.id === 'cronofago') return boss.phase === 1 ? 2.8 : 2.05;
    return boss.phase === 1 ? 3.4 : 2.45;
  }

  function fireBoss(boss) {
    const run = game.run;
    const p = run.player;
    audioEvent('boss_fire');
    if (boss.id === 'devorador') {
      const base = angleTo(boss.x, boss.y, p.x, p.y);
      const count = boss.phase === 3 ? 18 : boss.phase === 2 ? 12 : 8;
      for (let i = 0; i < count; i++) {
        const a = base + (i - (count - 1) / 2) * 0.13;
        addBullet(boss.x, boss.y + 12, Math.cos(a) * 210, Math.sin(a) * 210, 13, 6, 'enemy', C.enemy, 'orb', 0, 4.5);
      }
    } else if (boss.id === 'hidra') {
      for (let h = 0; h < boss.heads; h++) {
        const a0 = angleTo(boss.x + (h - 1) * 70, boss.y + 35, p.x, p.y);
        const fan = boss.phase === 3 ? 2 : 1;
        for (let i = -fan; i <= fan; i++) {
          const a = a0 + i * 0.18 + Math.sin(run.time * 2 + h) * 0.07;
          addBullet(boss.x + (h - 1) * 70, boss.y + 40, Math.cos(a) * 235, Math.sin(a) * 235, 12, 5, 'enemy', C.enemy, 'needle', 0, 4);
        }
      }
    } else if (boss.id === 'obelisco') {
      const spokes = boss.phase === 3 ? 12 : boss.phase === 2 ? 10 : 8;
      const off = run.time * 0.65;
      for (let i = 0; i < spokes; i++) {
        const a = off + i * TAU / spokes;
        addBullet(boss.x, boss.y, Math.cos(a) * 185, Math.sin(a) * 185, 14, 6, 'enemy', C.elite, 'orb', 0, 4.8);
      }
      run.telegraphs.push({ kind: 'laser', x: boss.x, y: boss.y, a: angleTo(boss.x, boss.y, p.x, p.y), life: 0.85, max: 0.85, damage: 18, fired: false });
    } else if (boss.id === 'serafim') {
      const base = angleTo(boss.x, boss.y, p.x, p.y);
      const wings = boss.phase === 3 ? 8 : boss.phase === 2 ? 6 : 4;
      for (let i = 0; i < wings; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const spread = Math.ceil(i / 2) * 0.19 * side;
        const a = base + spread + Math.sin(run.time * 2.8 + i) * 0.04;
        addBullet(boss.x + side * 44, boss.y + 18, Math.cos(a) * 270, Math.sin(a) * 270, 13, 5, 'enemy', C.elite, 'needle', 0, 4.2);
      }
      if (boss.phase >= 2) run.telegraphs.push({ kind: 'laser', x: boss.x, y: boss.y, a: base + Math.sin(run.time) * 0.22, life: 0.68, max: 0.68, damage: 16, fired: false });
    } else if (boss.id === 'cronofago') {
      const count = boss.phase === 3 ? 18 : boss.phase === 2 ? 14 : 10;
      const spin = run.time * (boss.phase === 3 ? 1.35 : 0.95);
      for (let i = 0; i < count; i++) {
        const a = spin + i * TAU / count;
        const speed = 145 + (i % 3) * 32 + boss.phase * 18;
        addBullet(boss.x, boss.y, Math.cos(a) * speed, Math.sin(a) * speed, 14, 6, 'enemy', i % 2 ? C.elite : C.enemy, 'orb', 0, 5.6);
      }
      const aim = angleTo(boss.x, boss.y, p.x, p.y);
      addBullet(boss.x, boss.y, Math.cos(aim) * 315, Math.sin(aim) * 315, 18, 7, 'enemy', C.danger, 'orb', 0, 3.6);
    } else {
      const count = boss.phase === 3 ? 32 : boss.phase === 2 ? 24 : 18;
      const gap = angleTo(boss.x, boss.y, p.x, p.y);
      for (let i = 0; i < count; i++) {
        const a = run.time * 0.9 + i * TAU / count;
        const diff = Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap)));
        if (diff < 0.25 && boss.phase < 3) continue;
        addBullet(boss.x, boss.y, Math.cos(a) * 220, Math.sin(a) * 220, 15, 6, 'enemy', C.enemy, 'orb', 0, 5);
      }
    }
  }

  function fireBossSpecial(boss) {
    const run = game.run;
    const p = run.player;
    audioEvent('boss_special');
    if (boss.id === 'devorador') {
      const a = angleTo(boss.x, boss.y, p.x, p.y);
      run.telegraphs.push({ kind: 'bite', x: boss.x, y: boss.y + 8, a, w: 180, h: 70, life: 0.72, max: 0.72, damage: 24, fired: false });
      return;
    }
    if (boss.id === 'hidra') {
      const rings = boss.phase === 3 ? 2 : 1;
      for (let ring = 0; ring < rings; ring++) {
        const count = boss.phase === 1 ? 16 : boss.phase === 2 ? 22 : 28;
        const offset = run.time * 0.75 + ring * Math.PI / count;
        for (let i = 0; i < count; i++) {
          const a = offset + i * TAU / count;
          const speed = 165 + boss.phase * 28 + ring * 32;
          addBullet(boss.x, boss.y + 30, Math.cos(a) * speed, Math.sin(a) * speed, 12, 5, 'enemy', C.elite, 'orb', 0, 4.6);
        }
      }
      if (boss.phase >= 2 && run.enemies.length < 34) {
        for (let i = 0; i < boss.phase; i++) {
          spawnEnemy('hunter', boss.x + rnd(-90, 90), boss.y + 80 + rnd(0, 50), { hpMult: 0.8, speedMult: 1.15 });
        }
      }
      return;
    }
    if (boss.id === 'obelisco') {
      const beams = boss.phase === 3 ? 6 : boss.phase === 2 ? 4 : 3;
      const base = run.time * 0.62;
      for (let i = 0; i < beams; i++) {
        const a = base + i * TAU / beams;
        run.telegraphs.push({ kind: 'laser', x: boss.x, y: boss.y, a, life: 0.82, max: 0.82, damage: 20, fired: false });
      }
      run.telegraphs.push({ kind: 'gravity', x: boss.x, y: boss.y, r: 170 + boss.phase * 34, life: 0.95, max: 0.95, damage: 12, armed: true });
      return;
    }
    if (boss.id === 'serafim') {
      const spokes = boss.phase === 3 ? 14 : boss.phase === 2 ? 11 : 8;
      const base = angleTo(boss.x, boss.y, p.x, p.y) - 0.52;
      for (let i = 0; i < spokes; i++) {
        const a = base + i * 1.04 / Math.max(1, spokes - 1);
        addBullet(boss.x, boss.y + 18, Math.cos(a) * (250 + boss.phase * 24), Math.sin(a) * (250 + boss.phase * 24), 15, 5, 'enemy', C.elite, 'needle', 0, 4.4);
      }
      for (let i = 0; i < boss.phase; i++) {
        run.telegraphs.push({ kind: 'laser', x: boss.x, y: boss.y, a: run.time * 0.7 + i * TAU / boss.phase, life: 0.72, max: 0.72, damage: 18, fired: false });
      }
      return;
    }
    if (boss.id === 'cronofago') {
      const r = 150 + boss.phase * 44;
      run.telegraphs.push({ kind: 'gravity', x: boss.x, y: boss.y, r, life: 1.05, max: 1.05, damage: 14 + boss.phase * 2, armed: true });
      run.telegraphs.push({ kind: 'void', x: p.x, y: p.y, r: 72 + boss.phase * 20, life: 0.78, max: 0.78, damage: 16 + boss.phase * 2, armed: true });
      const count = boss.phase === 3 ? 36 : 26;
      for (let i = 0; i < count; i++) {
        const a = run.time * -1.1 + i * TAU / count;
        const speed = 175 + Math.sin(i * 2.1) * 45;
        addBullet(boss.x + Math.cos(a) * 26, boss.y + Math.sin(a) * 26, Math.cos(a) * speed, Math.sin(a) * speed, 13, 6, 'enemy', C.enemy, 'orb', 0, 5.4);
      }
      return;
    }
    const count = boss.phase === 3 ? 44 : boss.phase === 2 ? 34 : 26;
    const gap = angleTo(boss.x, boss.y, p.x, p.y);
    for (let i = 0; i < count; i++) {
      const a = run.time * 1.15 + i * TAU / count;
      const diff = Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap)));
      if (diff < 0.22 && boss.phase < 3) continue;
      addBullet(boss.x, boss.y, Math.cos(a) * (205 + boss.phase * 26), Math.sin(a) * (205 + boss.phase * 26), 16, 6, 'enemy', C.enemy, 'orb', 0, 5.2);
    }
    run.telegraphs.push({ kind: 'void', x: boss.x, y: boss.y, r: 120 + boss.phase * 42, life: 0.9, max: 0.9, damage: 18, armed: true });
  }

  function killBoss() {
    const run = game.run;
    const boss = run.boss;
    boss.dead = true;
    run.score += boss.score * comboMult();
    run.bossKills++;
    run.player.hp = Math.min(run.player.hpMax, run.player.hp + Math.floor(run.player.hpMax * 0.25));
    addOverdrive(35);
    for (let i = 0; i < 18; i++) runDropOrb(boss.x + rnd(-60, 60), boss.y + rnd(-50, 50), 6);
    spawnParticle(boss.x, boss.y, C.enemy, 90, 320, 5);
    game.screenShake = 18;
    audioEvent('boss_explosion');
    window.PokiBridge.happyTime(0.85);
    missionProgress('boss', 1);
    run.boss = null;
    run.phase = 'wave';
    run.wave++;
    run.waveTimer = 0;
    run.minibossSpawned = false;
    spawnWaveMessage('ONDA ' + run.wave);
    if (run.wave === 6 || run.wave === 11 || run.wave === 16 || run.wave === 21 || run.wave === 26) spawnSectorMessage();
    if (run.wave > 30) finishRun(true, 'cronofago destruido');
  }

  function updateProjectiles(dt) {
    const run = game.run;
    for (let i = run.bullets.length - 1; i >= 0; i--) {
      const b = run.bullets[i];
      b.life -= dt;
	      if (b.homing) {
	        const target = nearestEnemy(b.x, b.y, 520);
	        if (target) {
	          const desired = angleTo(b.x, b.y, target.x, target.y);
	          let da = Math.atan2(Math.sin(desired - b.rot), Math.cos(desired - b.rot));
          b.rot += clamp(da, -b.homing * dt, b.homing * dt);
          const sp = Math.hypot(b.vx, b.vy) + 90 * dt;
          b.vx = Math.cos(b.rot) * sp;
	          b.vy = Math.sin(b.rot) * sp;
	        }
	      }
	      if (b.kind === 'boomerang') {
	        b.rot += (b.spin || 12) * dt;
	        if (b.life < b.maxLife * 0.52) {
	          const p = run.player;
	          const desired = angleTo(b.x, b.y, p.x, p.y);
	          const sp = Math.max(280, Math.hypot(b.vx, b.vy) * 0.985);
	          b.vx = lerp(b.vx, Math.cos(desired) * sp, 0.12);
	          b.vy = lerp(b.vy, Math.sin(desired) * sp, 0.12);
	        }
	      }
	      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (hitPlayerBullet(b)) {
        if (b.pierce > 0) b.pierce--;
        else run.bullets.splice(i, 1);
      } else if (b.life <= 0 || b.x < -80 || b.x > W + 80 || b.y < -80 || b.y > H + 80) {
        run.bullets.splice(i, 1);
      }
    }
    for (let i = run.enemyBullets.length - 1; i >= 0; i--) {
      const b = run.enemyBullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (hitEnemyBullet(b)) {
        run.enemyBullets.splice(i, 1);
      } else if (b.life <= 0 || b.x < -100 || b.x > W + 100 || b.y < -100 || b.y > H + 100) {
        if (b.near) creditNearMiss(b);
        run.enemyBullets.splice(i, 1);
      }
    }
    if (run.comboTimer > 0) run.comboTimer -= dt;
    else if (run.combo > 0) run.combo = Math.floor(run.combo * 0.5);
  }

  function hitPlayerBullet(b) {
    const run = game.run;
    for (const e of run.enemies) {
      if (dist2(b.x, b.y, e.x, e.y) <= (b.r + e.r) * (b.r + e.r)) {
        e.hp -= b.dmg;
        e.hitFlash = 0.06;
        audioEvent('hit');
        spawnParticle(b.x, b.y, C.player, 3, 60, 2);
        return true;
      }
    }
    const boss = run.boss;
    if (boss && boss.entry <= 0 && boss.invuln <= 0 && dist2(b.x, b.y, boss.x, boss.y) <= (b.r + boss.r) * (b.r + boss.r)) {
      boss.hp -= b.dmg;
      audioEvent('hit', 1.2);
      spawnParticle(b.x, b.y, C.player, 3, 70, 2);
      return true;
    }
    return false;
  }

  function hitEnemyBullet(b) {
    const p = game.run.player;
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    const surface = d - b.r - p.r;
    if (d <= b.r + p.r) {
      if (p.invuln <= 0 && p.dashTime <= 0) damagePlayer(b.dmg);
      return true;
    }
    if (surface <= 18 && surface > 0) {
      b.near = true;
      b.nearMin = Math.min(b.nearMin, surface);
    } else if (b.near && surface > b.nearMin + 6) {
      creditNearMiss(b);
      return false;
    }
    return false;
  }

  function creditNearMiss(b) {
    if (b.credited) return;
    b.credited = true;
    const run = game.run;
    run.nearMisses++;
    game.save.totalNearMisses++;
    run.score += Math.floor(25 * comboMult() * (run.player.overdriveTime > 0 ? 2 : 1));
    addOverdrive(5);
    run.player.dashCd = Math.max(0, run.player.dashCd - 0.2);
    spawnParticle(b.x, b.y, C.white, 7, 110, 2);
    audioEvent('near_miss');
    if (run.nearMissTextCd <= 0) {
      floater('NA RISCA', b.x, b.y - 10, C.pickup, 15);
      run.nearMissTextCd = 0.35;
    }
    missionProgress('near', 1);
  }

  function damagePlayer(dmg) {
    const run = game.run;
    const p = run.player;
    if (p.invuln > 0) return;
    p.hp -= dmg;
    p.invuln = 0.65;
    p.noDamageTime = 0;
    p.overdrive = Math.max(0, p.overdrive - 15);
    run.combo = 0;
    game.screenShake = 8;
    audioEvent('player_hit');
    spawnParticle(p.x, p.y, C.danger, 24, 160, 4);
    floater('-' + Math.floor(dmg), p.x, p.y - 26, C.danger, 20);
    if (run.ship.id === 'tita') {
      addShockwave(p.x, p.y, 120, 32);
    }
  }

  function addShockwave(x, y, radius, damage) {
    const run = game.run;
    run.telegraphs.push({ kind: 'shock', x, y, r: radius, life: 0.26, max: 0.26, damage, armed: true });
    for (const e of run.enemies) {
      if (dist2(x, y, e.x, e.y) <= radius * radius) e.hp -= damage;
    }
  }

  function addOverdrive(v) {
    const p = game.run.player;
    if (p.overdriveTime > 0) return;
    p.overdrive = clamp(p.overdrive + v * (1 + game.save.upgrades.systems * 0.06), 0, 100);
    if (p.overdrive >= 100 && !p.overdriveReadyToast) {
      p.overdriveReadyToast = true;
      floater('OVERDRIVE PRONTO', p.x, p.y - 50, C.pickup, 18);
    }
  }

  function updateOrbs(dt) {
    const run = game.run;
    const p = run.player;
    const magnet = 88 + run.passives.magnet * 35 + (p.overdriveTime > 0 ? 60 : 0) + game.save.upgrades.fortune * 8;
    for (let i = run.orbs.length - 1; i >= 0; i--) {
      const o = run.orbs[i];
      o.life -= dt;
      o.vx *= 0.97;
      o.vy *= 0.97;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < magnet) {
        const a = angleTo(o.x, o.y, p.x, p.y);
        const pull = lerp(120, 640, 1 - d / magnet);
        o.vx += Math.cos(a) * pull * dt;
        o.vy += Math.sin(a) * pull * dt;
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (d < p.r + o.r + 8) {
        collectOrb(i);
      } else if (o.life <= 0) {
        run.orbs.splice(i, 1);
      }
    }
  }

  function collectOrb(index) {
    const run = game.run;
    const o = run.orbs[index];
    run.orbs.splice(index, 1);
    const xpGain = o.value * (run.ship.id === 'falcao' ? 1.1 : 1);
    run.player.xp += xpGain;
    game.save.totalPlasmaCollected = (game.save.totalPlasmaCollected || 0) + xpGain;
    audioEvent('pickup', Math.min(1.4, 0.5 + xpGain * 0.08));
    spawnParticle(o.x, o.y, C.pickup, 6, 70, 2);
    while (run.player.xp >= run.player.xpNeed) {
      run.player.xp -= run.player.xpNeed;
      run.player.level++;
      run.player.xpNeed = Math.floor(run.player.xpNeed * 1.22 + 9);
      openLevelUp();
      break;
    }
  }

  function openLevelUp() {
    const run = game.run;
    run.cards = drawCards();
    run.selectedCard = 0;
    setMode('levelup');
    window.PokiBridge.gameplayStop();
    game.pokiGameplay = false;
    audioEvent('level_up');
    floater('SUBIU DE NIVEL', W / 2, 100, C.player, 28);
    spawnParticle(W / 2, H / 2, C.player, 36, 160, 4);
  }

  function drawCards() {
    const run = game.run;
    const candidates = [];
    for (const id of Object.keys(WEAPON_META)) {
      const meta = WEAPON_META[id];
      const level = meta.kind === 'weapon' ? (run.weapons[id] || 0) : (run.passives[id] || 0);
      if (level >= meta.max) continue;
      if (meta.kind === 'weapon' && level === 0 && Object.keys(run.weapons).length >= 4) continue;
      if (meta.kind === 'pact' && run.player.level < 4) continue;
      candidates.push(id);
    }
    const cards = [];
    while (cards.length < 3 && candidates.length > 0) {
      const i = Math.floor(rnd(0, candidates.length));
      const id = candidates.splice(i, 1)[0];
      const meta = WEAPON_META[id];
      const level = meta.kind === 'weapon' ? (run.weapons[id] || 0) : (run.passives[id] || 0);
      const rarity = meta.kind === 'pact' ? 'pacto' : level >= 4 ? 'epica' : level >= 2 ? 'rara' : 'comum';
      cards.push({ id, meta, level, rarity });
    }
    return cards;
  }

  function chooseCard(index) {
    const run = game.run;
    const card = run.cards[index];
    if (!card) return;
    if (card.meta.kind === 'weapon') {
      run.weapons[card.id] = (run.weapons[card.id] || 0) + 1;
    } else if (card.meta.kind === 'pact') {
      run.passives.vex_pact = (run.passives.vex_pact || 0) + 1;
      run.pacts++;
    } else {
      run.passives[card.id] = (run.passives[card.id] || 0) + 1;
      if (card.id === 'armor') {
        run.player.hpMax += 15;
        run.player.hp = Math.min(run.player.hpMax, run.player.hp + 22);
      }
    }
    floater(card.meta.name, W / 2, H / 2, C.pickup, 22);
    audioEvent('ui_confirm');
    setMode('run');
    window.PokiBridge.commercialBreak(() => {
      if (game.mode === 'run') {
        window.PokiBridge.gameplayStart();
        game.pokiGameplay = true;
      }
    });
  }

  function updateTelegraphs(dt) {
    const run = game.run;
    for (let i = run.telegraphs.length - 1; i >= 0; i--) {
      const t = run.telegraphs[i];
      t.life -= dt;
      if (t.kind === 'explosion' && t.life <= 0.08 && t.armed) {
        t.armed = false;
        for (const e of run.enemies) {
          if (dist2(t.x, t.y, e.x, e.y) <= t.r * t.r) e.hp -= t.damage;
        }
        if (dist2(t.x, t.y, run.player.x, run.player.y) <= t.r * t.r) damagePlayer(t.damage);
        spawnParticle(t.x, t.y, C.orange, 42, 230, 5);
      }
      if (t.kind === 'echo' && t.life <= 0) {
        for (const e of run.enemies) {
          if (dist2(t.x, t.y, e.x, e.y) <= t.r * t.r) e.hp -= t.damage;
        }
        spawnParticle(t.x, t.y, C.player, 34, 160, 4);
      }
      if (t.kind === 'laser' && t.life < 0.18 && !t.fired) {
        t.fired = true;
        if (pointLineDistance(run.player.x, run.player.y, t.x, t.y, t.x + Math.cos(t.a) * 1200, t.y + Math.sin(t.a) * 1200) < 14) damagePlayer(t.damage);
      }
      if (t.kind === 'bite' && t.life < 0.12 && !t.fired) {
        t.fired = true;
        if (pointInRotatedRect(run.player.x, run.player.y, t.x, t.y, t.w, t.h, t.a)) damagePlayer(t.damage);
        spawnParticle(t.x + Math.cos(t.a) * 70, t.y + Math.sin(t.a) * 70, C.enemy, 24, 180, 4);
      }
      if (t.kind === 'gravity') {
        const dx = t.x - run.player.x;
        const dy = t.y - run.player.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        if (d < t.r && t.life > 0.16) {
          run.player.x += dx / d * 80 * dt;
          run.player.y += dy / d * 80 * dt;
        }
        if (t.life < 0.16 && t.armed) {
          t.armed = false;
          if (d < t.r) damagePlayer(t.damage);
          spawnParticle(t.x, t.y, C.elite, 34, 220, 3);
        }
      }
      if (t.kind === 'void' && t.armed && t.life < 0.16) {
        t.armed = false;
        if (dist2(t.x, t.y, run.player.x, run.player.y) < t.r * t.r) damagePlayer(t.damage);
        spawnParticle(t.x, t.y, C.enemy, 46, 260, 4);
      }
      if (t.life <= 0) run.telegraphs.splice(i, 1);
    }
  }

  function pointInRotatedRect(px, py, cx, cy, w, h, a) {
    const dx = px - cx;
    const dy = py - cy;
    const ca = Math.cos(-a);
    const sa = Math.sin(-a);
    const lx = dx * ca - dy * sa;
    const ly = dx * sa + dy * ca;
    return lx >= 0 && lx <= w && Math.abs(ly) <= h / 2;
  }

  function pointLineDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = clamp(t, 0, 1);
    const x = x1 + t * dx;
    const y = y1 + t * dy;
    return Math.hypot(px - x, py - y);
  }

  function finishRun(victory, reason) {
    const run = game.run;
    window.PokiBridge.gameplayStop();
    game.pokiGameplay = false;
    const grade = calcGrade();
    const cores = calcCores(grade);
    game.save.cores += cores;
    game.save.totalNucleosEarned = (game.save.totalNucleosEarned || 0) + cores;
    game.save.bestScore = Math.max(game.save.bestScore, run.score);
    game.save.bestWave = Math.max(game.save.bestWave, run.wave);
    if (run.wave >= 8 && !game.save.unlockedShips.includes('espectro')) game.save.unlockedShips.push('espectro');
    if (run.bossKills >= 1 && !game.save.unlockedShips.includes('tita')) game.save.unlockedShips.push('tita');
    if (run.wave >= 12 && !game.save.unlockedShips.includes('tempestade')) game.save.unlockedShips.push('tempestade');
    if (victory && !game.save.unlockedShips.includes('aurora')) game.save.unlockedShips.push('aurora');
	    run.result = { victory, reason, grade, cores, name: sanitizePlayerName(game.save.playerName), submitted: false, submitState: 'pending', localSaved: false };
	    storeSave();
	    audioEvent(victory ? 'victory' : 'gameover');
	    setMode('gameover');
	  }

  function calcGrade() {
    const run = game.run;
    const par = 1000 * run.wave * (1 + 0.05 * run.wave);
    const r = run.score / Math.max(1, par);
    if (r >= 2) return 'S';
    if (r >= 1.4) return 'A';
    if (r >= 0.9) return 'B';
    if (r >= 0.55) return 'C';
    return 'D';
  }

  function calcCores(grade) {
    const run = game.run;
    let base = 5;
    for (let i = 1; i <= run.completedWaves; i++) base += i <= 10 ? 4 : i <= 20 ? 6 : 8;
    base += run.bossKills * 18;
    for (const m of run.missions) if (m.done) base += m.reward;
    const mult = { S: 1.5, A: 1.25, B: 1, C: 0.85, D: 0.7 }[grade] || 1;
    return Math.floor(base * mult * (1 + game.save.upgrades.fortune * 0.05));
  }

  function drawRun() {
    const run = game.run;
    const p = run.player;
    drawBackground(18 + run.wave * 1.5);
    const sx = game.screenShake > 0 ? rnd(-game.screenShake, game.screenShake) : 0;
    const sy = game.screenShake > 0 ? rnd(-game.screenShake, game.screenShake) : 0;
    ctx.save();
    ctx.translate(sx, sy);
    drawTelegraphs();
    drawOrbs();
    drawEnemyBullets();
    drawEnemies();
    drawBoss();
    drawPlayer();
    drawDrones();
    drawPlayerBullets();
    drawWeaponsFx();
    drawFx();
    ctx.restore();
    drawVignette();
    drawHud();
    drawTouchControls();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 720);
    g.addColorStop(0, 'rgba(5,5,16,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = C.white;
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const run = game.run;
    const p = run.player;
    const blink = p.invuln > 0 && Math.floor(game.t * 18) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.42;
    const over = p.overdriveTime > 0;
    if (over) {
      ctx.globalCompositeOperation = 'lighter';
      glow(C.white, 22);
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28 + Math.sin(game.t * 18) * 3, 0, TAU);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    drawShipShape(p.x, p.y, p.face, run.ship.id, 1.15);
    ctx.globalAlpha = blink ? 0.42 : 0.95;
    glow(C.white, 8);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14 + Math.sin(game.t * 10) * 1.5, 0, TAU);
    ctx.stroke();
    noGlow();
    ctx.globalAlpha = 1;
  }

  function drawShipShape(x, y, a, id, scale) {
    const assetId = shipAssetId(id);
    if (hasAsset(assetId)) {
      const size = 64 * scale;
      if (drawSprite(assetId, x, y, a, size, size)) return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(scale, scale);
    const s = 1;
    glow(C.pickup, 16);
    ctx.fillStyle = C.pickup;
    ctx.beginPath();
    ctx.moveTo(-13 * s, 0);
    ctx.lineTo(-27 * s, -5 * s);
    ctx.lineTo(-34 * s, 0);
    ctx.lineTo(-27 * s, 5 * s);
    ctx.closePath();
    ctx.fill();
    glow(C.player, 18);
    ctx.fillStyle = id === 'tita' ? '#0C2030' : id === 'aurora' ? '#101226' : C.playerDark;
    ctx.strokeStyle = C.player;
    ctx.lineWidth = id === 'tita' ? 3 : 2;
    ctx.beginPath();
    if (id === 'tita') {
      ctx.moveTo(19, 0); ctx.lineTo(7, -16); ctx.lineTo(-14, -13); ctx.lineTo(-19, 0); ctx.lineTo(-14, 13); ctx.lineTo(7, 16);
    } else if (id === 'tempestade') {
      ctx.moveTo(17, 0); ctx.lineTo(0, -16); ctx.lineTo(-15, 0); ctx.lineTo(0, 16);
    } else if (id === 'aurora') {
      ctx.moveTo(24, 0); ctx.lineTo(-9, -7); ctx.lineTo(-16, 0); ctx.lineTo(-9, 7);
    } else if (id === 'espectro') {
      ctx.moveTo(21, 0); ctx.lineTo(-17, -8); ctx.lineTo(-7, 0); ctx.lineTo(-17, 8);
    } else {
      ctx.moveTo(19, 0); ctx.lineTo(-14, -12); ctx.lineTo(-7, 0); ctx.lineTo(-14, 12);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    glow(C.white, 8);
    ctx.fillStyle = id === 'aurora' ? C.white : C.player;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-1, -4);
    ctx.lineTo(-1, 4);
    ctx.closePath();
    ctx.fill();
    noGlow();
    ctx.restore();
  }

  function drawDrones() {
    const run = game.run;
    for (const d of run.drones) {
      drawDroneAlly(d.x, d.y, d.a);
    }
  }

  function drawDroneAlly(x, y, a) {
    if (drawSprite('proj_drone_aliado', x, y, a, 34, 34)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    glow(C.player, 10);
    ctx.strokeStyle = C.player;
    ctx.fillStyle = C.playerDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    noGlow();
    ctx.restore();
  }

  function drawEnemies() {
    const run = game.run;
    for (const e of run.enemies) {
      const s = e.spawn > 0 ? 1 - e.spawn / 0.25 : 1;
      ctx.globalAlpha = s;
      drawEnemyShape(e);
      if (e.elite) drawBar(e.x - 28, e.y - e.r - 14, 56, 4, e.hp / e.maxHp, C.elite, null, C.elite);
      ctx.globalAlpha = 1;
    }
  }

  function drawEnemyShape(e) {
    const assetId = enemyAssetId(e.type);
    if (hasAsset(assetId)) {
      const size = e.r * (e.type === 'miniboss' ? 3.7 : e.type === 'reaper' ? 3.5 : 3.25);
      drawSprite(assetId, e.x, e.y, e.rot || 0, size, size);
      if (e.hitFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.46;
        glow(C.white, 14);
        ctx.fillStyle = C.white;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 1.25, 0, TAU);
        ctx.fill();
        noGlow();
        ctx.restore();
      }
      return;
    }
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot || 0);
    const color = e.type === 'reaper' || e.type === 'miniboss' ? C.elite : e.color || C.enemy;
    const fill = e.type === 'reaper' || e.type === 'miniboss' ? C.eliteDark : C.enemyDark;
    glow(color, e.elite ? 18 : 10);
    ctx.fillStyle = e.hitFlash > 0 ? C.white : fill;
    ctx.strokeStyle = e.hitFlash > 0 ? C.white : color;
    ctx.lineWidth = e.elite ? 3 : 2;
    ctx.beginPath();
    if (e.type === 'swarm') {
      ctx.moveTo(e.r, 0); ctx.lineTo(-e.r * 0.85, -e.r * 0.8); ctx.lineTo(-e.r * 0.85, e.r * 0.8);
    } else if (e.type === 'hunter') {
      ctx.moveTo(e.r * 1.25, 0); ctx.lineTo(-e.r, -e.r * 0.85); ctx.lineTo(-e.r * 0.35, 0); ctx.lineTo(-e.r, e.r * 0.85);
    } else if (e.type === 'sentry') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * TAU / 5;
        i ? ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r) : ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
      }
    } else if (e.type === 'bomber') {
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6;
        i ? ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r) : ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
      }
    } else if (e.type === 'weaver') {
      ctx.moveTo(e.r, 0); ctx.lineTo(e.r * 0.25, e.r * 0.25); ctx.lineTo(0, e.r); ctx.lineTo(-e.r * 0.25, e.r * 0.25); ctx.lineTo(-e.r, 0); ctx.lineTo(-e.r * 0.25, -e.r * 0.25); ctx.lineTo(0, -e.r); ctx.lineTo(e.r * 0.25, -e.r * 0.25);
    } else if (e.type === 'reaper') {
      ctx.arc(0, 0, e.r, -2.2, 2.2);
      ctx.arc(6, 0, e.r * 0.55, 2.1, -2.1, true);
    } else if (e.type === 'miniboss') {
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + game.t * 0.35;
        i ? ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r) : ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
      }
    } else {
      ctx.moveTo(e.r, 0); ctx.lineTo(0, -e.r); ctx.lineTo(-e.r, 0); ctx.lineTo(0, e.r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (e.type === 'bomber') {
      glow(C.orange, 14);
      ctx.fillStyle = C.orange;
      ctx.beginPath();
      ctx.arc(0, 0, 6 + Math.sin(game.t * 8) * 2, 0, TAU);
      ctx.fill();
    }
    noGlow();
    ctx.restore();
  }

	  function drawBoss() {
	    const boss = game.run.boss;
	    if (!boss) return;
	    ctx.globalAlpha = boss.entry > 0 ? 1 - boss.entry / 2.1 : 1;
    if (boss.id === 'devorador') drawDevorador(boss);
    else if (boss.id === 'hidra') drawHydra(boss);
    else if (boss.id === 'obelisco') drawObelisk(boss);
    else if (boss.id === 'mente') drawMother(boss);
    else if (boss.id === 'serafim') drawSeraph(boss);
    else drawChronophage(boss);
	    ctx.globalAlpha = 1;
	  }

	  function drawBossAnimFx(b, color, radius) {
	    const attack = clamp((b.attackAnim || 0) / 0.68, 0, 1);
	    const phase = clamp((b.phaseAnim || 0) / 0.95, 0, 1);
	    if (phase > 0) {
	      ctx.save();
	      ctx.globalCompositeOperation = 'lighter';
	      ctx.globalAlpha = phase * 0.42;
	      glow(C.elite, 28);
	      ctx.strokeStyle = C.elite;
	      ctx.lineWidth = 5;
	      ctx.beginPath();
	      ctx.ellipse(b.x, b.y, radius * (1.25 + phase * 0.28), radius * 0.72, game.t * 0.45, 0, TAU);
	      ctx.stroke();
	      ctx.strokeStyle = C.white;
	      ctx.lineWidth = 1.5;
	      ctx.beginPath();
	      ctx.arc(b.x, b.y, radius * (0.68 + phase * 0.22), 0, TAU);
	      ctx.stroke();
	      noGlow();
	      ctx.restore();
	    }
	    if (attack > 0) {
	      ctx.save();
	      ctx.globalCompositeOperation = 'lighter';
	      ctx.globalAlpha = attack * 0.5;
	      glow(color, 24);
	      ctx.strokeStyle = color;
	      ctx.lineWidth = 4;
	      for (let i = 0; i < 2; i++) {
	        ctx.beginPath();
	        ctx.arc(b.x, b.y, radius * (0.55 + i * 0.32 + (1 - attack) * 0.22), 0, TAU);
	        ctx.stroke();
	      }
	      noGlow();
	      ctx.restore();
	    }
	    ctx.globalAlpha = 1;
	  }

	  function drawDevorador(b) {
	    if (hasAsset('boss_devorador')) {
	      const asset = bossAnimAssetId('boss_devorador', b);
	      const s = bossAnimScale(b);
	      drawBossAnimFx(b, C.enemy, 130);
	      drawSprite(asset, b.x, b.y, Math.sin(game.t * 0.8) * 0.08, 310 * s, 245 * s);
	      glow(C.pickup, 18);
	      ctx.fillStyle = C.pickup;
      ctx.beginPath();
      ctx.arc(b.x + 18, b.y, 16 + Math.sin(game.t * 8) * 2, 0, TAU);
      ctx.fill();
      noGlow();
      return;
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    const open = 0.42 + Math.sin(game.t * 3.2) * 0.25;
    glow(C.enemy, 26);
    ctx.fillStyle = C.enemyDark;
    ctx.strokeStyle = C.enemy;
    ctx.lineWidth = 4;
    for (const sign of [-1, 1]) {
      ctx.save();
      ctx.rotate(sign * open);
      ctx.beginPath();
      ctx.moveTo(82, 0); ctx.lineTo(18, sign * 58); ctx.lineTo(-78, sign * 48); ctx.lineTo(-58, sign * 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.white;
      for (let i = 0; i < 6; i++) {
        const tx = 18 - i * 17;
        ctx.beginPath();
        ctx.moveTo(tx, sign * 8);
        ctx.lineTo(tx - 7, sign * 24);
        ctx.lineTo(tx + 7, sign * 24);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    glow(C.pickup, 18);
    ctx.fillStyle = C.pickup;
    ctx.beginPath();
    ctx.arc(8, 0, 22 + Math.sin(game.t * 8) * 3, 0, TAU);
    ctx.fill();
    noGlow();
    ctx.restore();
  }

	  function drawHydra(b) {
	    if (hasAsset('boss_hidra')) {
	      const asset = bossAnimAssetId('boss_hidra', b);
	      const s = bossAnimScale(b);
	      drawBossAnimFx(b, C.enemy, 142);
	      drawSprite(asset, b.x, b.y + 10, Math.sin(game.t * 0.9) * 0.08, 330 * s, 300 * s);
	      return;
	    }
    ctx.save();
    ctx.translate(b.x, b.y);
    glow(C.enemy, 24);
    ctx.fillStyle = C.enemyDark;
    ctx.strokeStyle = C.enemy;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + 0.2;
      i ? ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 48) : ctx.moveTo(Math.cos(a) * 58, Math.sin(a) * 48);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let h = 0; h < b.heads; h++) {
      const off = (h - 1) * 74;
      const sway = Math.sin(game.t * 2 + h) * 22;
      ctx.strokeStyle = C.enemy;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(off * 0.35, 28);
      ctx.quadraticCurveTo(off * 0.6 + sway, 88, off, 128);
      ctx.stroke();
      ctx.save();
      ctx.translate(off, 130);
      ctx.rotate(Math.sin(game.t * 3 + h) * 0.25);
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(-20, -22); ctx.lineTo(-8, 0); ctx.lineTo(-20, 22);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(8, 0, 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    noGlow();
    ctx.restore();
  }

	  function drawObelisk(b) {
	    if (hasAsset('boss_obelisco')) {
	      const asset = bossAnimAssetId('boss_obelisco', b);
	      const s = bossAnimScale(b);
	      drawBossAnimFx(b, C.elite, 140);
	      drawSprite(asset, b.x, b.y, b.rot, 230 * s, 330 * s);
	      return;
	    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    glow(C.elite, 26);
    ctx.fillStyle = C.eliteDark;
    ctx.strokeStyle = C.enemy;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -95); ctx.lineTo(40, -62); ctx.lineTo(40, 62); ctx.lineTo(0, 95); ctx.lineTo(-40, 62); ctx.lineTo(-40, -62);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.elite;
    ctx.lineWidth = 2;
    for (let row = -48; row <= 48; row += 24) {
      for (let i = -1; i <= 1; i++) {
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(game.t * 5 + row + i);
        ctx.beginPath();
        ctx.moveTo(i * 18 - 5, row);
        ctx.lineTo(i * 18 + 5, row);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    noGlow();
    ctx.restore();
  }

	  function drawMother(b) {
	    if (hasAsset('boss_mente')) {
	      const asset = bossAnimAssetId('boss_mente', b);
	      const s = bossAnimScale(b);
	      drawBossAnimFx(b, C.enemy, 150);
	      drawSprite(asset, b.x, b.y, Math.sin(game.t * 0.45) * 0.08, 320 * s, 320 * s);
      const eyeX = clamp((game.run.player.x - b.x) / 28, -10, 10);
      const eyeY = clamp((game.run.player.y - b.y) / 28, -10, 10);
      glow(C.enemy, 18);
      ctx.fillStyle = C.white;
      ctx.globalAlpha *= 0.86;
      ctx.beginPath(); ctx.arc(b.x, b.y, 27, 0, TAU); ctx.fill();
      ctx.fillStyle = C.enemy;
      ctx.beginPath(); ctx.arc(b.x + eyeX, b.y + eyeY, 10, 0, TAU); ctx.fill();
      noGlow();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    glow(C.enemy, 28);
    const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, 86);
    grad.addColorStop(0, '#3c0a22');
    grad.addColorStop(1, C.bg);
    ctx.fillStyle = grad;
    ctx.strokeStyle = C.enemy;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 84, 0, TAU);
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < b.petals; i++) {
      const a = game.t * 0.55 + i * TAU / b.petals;
      const x = Math.cos(a) * 128;
      const y = Math.sin(a) * 128;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.strokeStyle = C.elite;
      ctx.fillStyle = C.eliteDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const aa = k * TAU / 6;
        k ? ctx.lineTo(Math.cos(aa) * 24, Math.sin(aa) * 18) : ctx.moveTo(Math.cos(aa) * 24, Math.sin(aa) * 18);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const eyeX = clamp((game.run.player.x - b.x) / 28, -10, 10);
    const eyeY = clamp((game.run.player.y - b.y) / 28, -10, 10);
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.fill();
    ctx.fillStyle = C.enemy;
    ctx.beginPath(); ctx.arc(eyeX, eyeY, 12, 0, TAU); ctx.fill();
    noGlow();
    ctx.restore();
  }

	  function drawSeraph(b) {
	    if (hasAsset('boss_serafim')) {
	      const asset = bossAnimAssetId('boss_serafim', b);
	      const s = bossAnimScale(b);
	      drawBossAnimFx(b, C.elite, 152);
	      drawSprite(asset, b.x, b.y, Math.sin(game.t * 1.1) * 0.1, 335 * s, 300 * s);
	      return;
	    }
    ctx.save();
    ctx.translate(b.x, b.y);
    glow(C.elite, 28);
    ctx.strokeStyle = C.elite;
    ctx.fillStyle = C.eliteDark;
    ctx.lineWidth = 4;
    for (let i = 0; i < b.wings; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      ctx.save();
      ctx.translate(side * (42 + row * 18), 8 + row * 28);
      ctx.rotate(side * (0.55 + row * 0.16 + Math.sin(game.t * 2 + i) * 0.08));
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(side * 70, -30); ctx.lineTo(side * 52, 10); ctx.lineTo(side * 12, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = C.enemyDark;
    ctx.strokeStyle = C.enemy;
    ctx.beginPath();
    ctx.moveTo(0, -64); ctx.lineTo(42, -8); ctx.lineTo(24, 64); ctx.lineTo(0, 86); ctx.lineTo(-24, 64); ctx.lineTo(-42, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    glow(C.white, 10);
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.arc(0, -10, 12 + Math.sin(game.t * 9) * 2, 0, TAU); ctx.fill();
    noGlow();
    ctx.restore();
  }

	  function drawChronophage(b) {
	    if (hasAsset('boss_cronofago')) {
	      const asset = bossAnimAssetId('boss_cronofago', b);
	      const s = bossAnimScale(b);
	      drawBossAnimFx(b, C.enemy, 160);
	      drawSprite(asset, b.x, b.y, -game.t * 0.18, 350 * s, 350 * s);
	      return;
	    }
    ctx.save();
    ctx.translate(b.x, b.y);
    glow(C.enemy, 30);
    for (let r = 0; r < b.rings; r++) {
      ctx.save();
      ctx.rotate((r % 2 ? -1 : 1) * game.t * (0.45 + r * 0.18));
      ctx.strokeStyle = r === 1 ? C.elite : C.enemy;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 94 + r * 22, 48 + r * 12, r * 0.55, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 70);
    grad.addColorStop(0, C.white);
    grad.addColorStop(0.28, C.enemy);
    grad.addColorStop(1, '#120010');
    ctx.fillStyle = grad;
    ctx.strokeStyle = C.elite;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * TAU / 10;
      const rr = i % 2 ? 58 : 80;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    noGlow();
    ctx.restore();
  }

  function drawPlayerBullets() {
    for (const b of game.run.bullets) drawBullet(b);
  }

  function drawEnemyBullets() {
    for (const b of game.run.enemyBullets) drawBullet(b);
  }

  function drawBullet(b) {
    const spriteId = b.owner === 'enemy'
      ? (b.kind === 'needle' ? 'proj_agulha_vex' : 'proj_orbe_vex')
	      : b.kind === 'missile' ? 'proj_missile'
	        : b.kind === 'scatter' ? 'proj_scatter'
	          : b.kind === 'boomerang' ? 'proj_orbital'
	            : b.kind === 'pulse' ? 'proj_pulse'
	              : null;
	    if (spriteId && hasAsset(spriteId)) {
	      const len = b.kind === 'boomerang' ? 30 : b.kind === 'needle' ? 26 : b.kind === 'missile' ? 32 : b.owner === 'enemy' ? 24 : 28;
	      const wid = b.kind === 'boomerang' ? 30 : b.kind === 'needle' ? 12 : b.kind === 'missile' ? 18 : b.owner === 'enemy' ? 24 : 14;
	      drawSprite(spriteId, b.x, b.y, b.kind === 'boomerang' ? b.rot : Math.atan2(b.vy, b.vx), len, wid);
	      return;
	    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    glow(b.color, b.owner === 'enemy' ? 12 : 10);
    ctx.fillStyle = b.kind === 'missile' ? C.pickup : b.color;
    if (b.kind === 'needle') {
      chamfer(-8, -2, 16, 4, 2);
      ctx.fill();
    } else if (b.kind === 'pulse') {
      chamfer(-7, -3, 16, 6, 3);
      ctx.fill();
      ctx.fillStyle = C.white;
      chamfer(-2, -1.5, 7, 3, 1.5);
      ctx.fill();
    } else if (b.kind === 'missile') {
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, -5); ctx.lineTo(-4, 0); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.orange; ctx.fillRect(-13, -2, 7, 4);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.white;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(0, 0, b.r * 0.45, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    noGlow();
    ctx.restore();
  }

  function drawOrbs() {
    for (const o of game.run.orbs) {
      if (hasAsset('pickup_plasma')) {
        const size = o.r * 5.2;
        drawSprite('pickup_plasma', o.x, o.y + Math.sin(game.t * 4 + o.phase) * 2, game.t * 1.4 + o.phase, size, size);
        continue;
      }
      glow(C.pickup, 12);
      ctx.fillStyle = C.pickup;
      ctx.globalAlpha = 0.75 + Math.sin(game.t * 5 + o.phase) * 0.2;
      ctx.beginPath();
      ctx.arc(o.x, o.y + Math.sin(game.t * 4 + o.phase) * 2, o.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * 0.35, 0, TAU);
      ctx.fill();
      noGlow();
      ctx.globalAlpha = 1;
    }
  }

  function drawTelegraphs() {
    const run = game.run;
    for (const t of run.telegraphs) {
      const k = 1 - t.life / t.max;
      if (t.kind === 'explosion') {
        ctx.globalAlpha = 0.25 + Math.sin(game.t * 26) * 0.08;
        ctx.strokeStyle = C.danger;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * k, 0, TAU);
        ctx.stroke();
      } else if (t.kind === 'echo') {
        ctx.globalAlpha = t.life / t.max * 0.45;
        drawShipShape(t.x, t.y, -Math.PI / 2, 'espectro', 1.0);
        ctx.strokeStyle = C.player;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, TAU);
        ctx.stroke();
      } else if (t.kind === 'shock') {
        ctx.globalAlpha = t.life / t.max * 0.5;
        ctx.strokeStyle = C.player;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * k, 0, TAU);
        ctx.stroke();
      } else if (t.kind === 'laser') {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = t.fired ? C.white : C.danger;
        ctx.lineWidth = t.fired ? 12 : 3;
        glow(t.fired ? C.enemy : C.danger, t.fired ? 24 : 10);
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + Math.cos(t.a) * 1400, t.y + Math.sin(t.a) * 1400);
        ctx.stroke();
        noGlow();
      } else if (t.kind === 'bite') {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.a);
        ctx.globalAlpha = t.fired ? 0.62 : 0.28 + Math.sin(game.t * 28) * 0.08;
        ctx.fillStyle = t.fired ? C.white : C.danger;
        ctx.strokeStyle = t.fired ? C.white : C.enemy;
        ctx.lineWidth = t.fired ? 4 : 2;
        glow(t.fired ? C.white : C.enemy, t.fired ? 24 : 12);
        chamfer(0, -t.h / 2, t.w, t.h, 10);
        ctx.fill();
        ctx.stroke();
        noGlow();
        ctx.restore();
      } else if (t.kind === 'gravity') {
        const pulse = 0.75 + Math.sin(game.t * 18) * 0.08;
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = C.elite;
        ctx.lineWidth = 3;
        glow(C.elite, 16);
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * pulse, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = game.t * 2 + i * TAU / 8;
          ctx.beginPath();
          ctx.moveTo(t.x + Math.cos(a) * t.r * 0.35, t.y + Math.sin(a) * t.r * 0.35);
          ctx.lineTo(t.x + Math.cos(a) * t.r * 0.92, t.y + Math.sin(a) * t.r * 0.92);
          ctx.stroke();
        }
        noGlow();
      } else if (t.kind === 'void') {
        const k2 = clamp(1 - t.life / t.max, 0, 1);
        ctx.globalAlpha = 0.22 + k2 * 0.18;
        ctx.fillStyle = C.enemy;
        glow(C.enemy, 18);
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * k2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = C.white;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, TAU);
        ctx.stroke();
        noGlow();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawWeaponsFx() {
    const run = game.run;
    if (run.weapons.orbital) {
      const p = run.player;
      const lv = run.weapons.orbital;
      const count = Math.min(6, 2 + Math.floor(lv / 2));
      const radius = 58 + lv * 6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(0,240,255,0.22)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < count; i++) {
        const a = (run.orbitalAngle || 0) + i * TAU / count;
        const x = p.x + Math.cos(a) * radius;
        const y = p.y + Math.sin(a) * radius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + game.t * 6);
        glow(C.player, 12);
        ctx.strokeStyle = C.player;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath();
        ctx.stroke();
        noGlow();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (run.prismBeam && run.prismBeam.life > 0) {
      run.prismBeam.life -= FIXED_DT;
      ctx.globalCompositeOperation = 'lighter';
      glow(C.player, 20);
      ctx.strokeStyle = C.player;
      ctx.lineWidth = 8 + Math.sin(game.t * 40) * 2;
      ctx.globalAlpha = clamp(run.prismBeam.life / 0.08, 0, 1) * 0.55;
      ctx.beginPath();
      ctx.moveTo(run.prismBeam.x1, run.prismBeam.y1);
      ctx.lineTo(run.prismBeam.x2, run.prismBeam.y2);
      ctx.stroke();
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(run.prismBeam.x1, run.prismBeam.y1);
      ctx.lineTo(run.prismBeam.x2, run.prismBeam.y2);
      ctx.stroke();
      noGlow();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

	  function drawHud() {
	    const run = game.run;
	    const p = run.player;
	    if (isPortraitLayout()) {
	      drawBar(0, 0, W, 8, p.xp / p.xpNeed, C.player);
	      drawMono('NV ' + p.level, 18, 28, 20, C.player, 'left', '800');
	      drawBar(18, 50, 210, 22, p.hp / p.hpMax, p.hp < p.hpMax * 0.25 ? C.danger : C.heal, Math.ceil(p.hp) + '/' + p.hpMax);
	      drawBar(18, 82, 210, 8, 1 - clamp(p.dashCd / p.dashBase, 0, 1), C.white);
	      drawText('ONDA ' + run.wave, W / 2, 34, 30, C.white, 'center', '900');
	      drawMono(timeFmt(run.time), W / 2, 70, 20, C.steel, 'center');
	      if (!run.boss) {
	        const sector = currentSector();
	        drawMono('SETOR ' + sector.id + ' / ' + sector.name, W / 2, 100, 14, C.pickup, 'center', '800');
	      }
	      drawMono('SCORE ' + fmt(run.score), W - 18, 30, 22, C.white, 'right', '900');
	      if (run.combo >= 5) drawMono('COMBO x' + comboMult().toFixed(1), W - 18, 62, 18, C.pickup, 'right', '800');
	      if (run.boss) {
	        drawText(run.boss.name, W / 2, 126, 22, C.enemy, 'center', '900');
	        drawBar(60, 144, W - 120, 20, run.boss.hp / run.boss.maxHp, C.enemy, null, C.enemy);
	      } else {
	        drawMissionsPortrait();
	      }
	      const odColor = p.overdrive >= 100 || p.overdriveTime > 0 ? C.pickup : C.player;
	      drawBar(W / 2 - 180, H - 56, 360, 20, p.overdrive / 100, odColor, p.overdrive >= 100 ? 'SHIFT' : 'OVERDRIVE');
	      drawBuildIcons();
	      drawAudioStatus(W - 18, H - 20, 'right');
	      return;
	    }
	    drawBar(0, 0, W, 6, p.xp / p.xpNeed, C.player);
    drawMono('NV ' + p.level, 24, 23, 18, C.player, 'left', '800');
    drawBar(24, 38, 240, 16, p.hp / p.hpMax, p.hp < p.hpMax * 0.25 ? C.danger : C.heal, Math.ceil(p.hp) + '/' + p.hpMax);
    drawBar(24, 61, 240, 6, 1 - clamp(p.dashCd / p.dashBase, 0, 1), C.white);
    drawText('ONDA ' + run.wave, W / 2, 28, 24, C.white, 'center', '800');
    drawMono(timeFmt(run.time), W / 2, 56, 18, C.steel, 'center');
    if (!run.boss) {
      const sector = currentSector();
      drawMono('SETOR ' + sector.id + ' / ' + sector.name, W / 2, 78, 12, C.pickup, 'center', '700');
    }
    drawMono('SCORE ' + fmt(run.score), W - 24, 28, 23, C.white, 'right', '800');
    if (run.combo >= 5) drawMono('COMBO x' + comboMult().toFixed(1), W - 24, 58, 18, C.pickup, 'right', '800');
    drawAudioStatus(W - 24, H - 16, 'right');
    const odColor = p.overdrive >= 100 || p.overdriveTime > 0 ? C.pickup : C.player;
    drawBar(W / 2 - 180, H - 33, 360, 14, p.overdrive / 100, odColor, p.overdrive >= 100 ? 'SHIFT' : 'OVERDRIVE');
    drawBuildIcons();
    drawMissions();
    if (run.boss) {
      drawText(run.boss.name, W / 2, 70, 20, C.enemy, 'center', '800');
      drawBar(W / 2 - 310, 84, 620, 17, run.boss.hp / run.boss.maxHp, C.enemy, null, C.enemy);
      for (let i = 1; i < 4; i++) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.moveTo(W / 2 - 310 + 620 * i / 4, 84);
        ctx.lineTo(W / 2 - 310 + 620 * i / 4, 101);
        ctx.stroke();
      }
    }
  }

	  function drawBuildIcons() {
	    const run = game.run;
	    let x = isPortraitLayout() ? 18 : 24;
	    let y = isPortraitLayout() ? H - 310 : H - 64;
	    for (const id of Object.keys(run.weapons)) {
	      drawSlot(x, y, id, run.weapons[id], C.player);
	      x += isPortraitLayout() ? 42 : 36;
	    }
	    x = isPortraitLayout() ? 18 : 24;
	    y = isPortraitLayout() ? H - 264 : H - 30;
	    for (const id of Object.keys(run.passives)) {
	      if (run.passives[id] > 0) {
	        drawSlot(x, y, id, run.passives[id], id === 'vex_pact' ? C.enemy : C.pickup);
	        x += isPortraitLayout() ? 42 : 36;
	      }
	    }
	  }

  function drawSlot(x, y, id, level, color) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(10,10,24,0.82)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    chamfer(x, y, 28, 28, 4);
    ctx.fill();
    ctx.stroke();
    drawIcon(id, x + 14, y + 14, 0.5, color);
    ctx.globalAlpha = 1;
    drawMono(String(level), x + 27, y + 27, 10, C.white, 'right', '700');
  }

  function drawIcon(id, x, y, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    glow(color, 10);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
	    if (id === 'pulse') {
	      chamfer(-14, -5, 28, 10, 5); ctx.fill();
	    } else if (id === 'boomerang') {
	      ctx.beginPath();
	      ctx.arc(0, 0, 16, -2.45, 1.15);
	      ctx.stroke();
	      ctx.beginPath();
	      ctx.moveTo(10, -13); ctx.lineTo(22, -6); ctx.lineTo(9, -1); ctx.closePath();
	      ctx.fill();
	    } else if (id === 'scatter') {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(14, i * 10); ctx.stroke();
      }
    } else if (id === 'orbital') {
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(9, -11); ctx.lineTo(-9, -11); ctx.closePath(); ctx.fill();
    } else if (id === 'missile') {
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -8); ctx.lineTo(-4, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill();
    } else if (id === 'prism') {
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    } else if (id === 'vex_pact') {
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(18, 12); ctx.lineTo(-18, 12); ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
    }
    noGlow();
    ctx.restore();
  }

	  function drawMissions() {
	    const run = game.run;
	    const x = W - 320;
    let y = 105;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = 'rgba(10,10,24,0.58)';
    chamfer(x - 8, y - 22, 296, 128, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawText('MISSOES', x, y - 8, 14, C.player, 'left', '800');
    for (const m of run.missions) {
      const color = m.done ? C.pickup : C.steel;
      drawMono((m.done ? 'OK ' : '') + m.desc, x, y + 18, 12, color, 'left', '600');
      drawBar(x + 174, y + 12, 90, 7, m.value / m.target, m.done ? C.pickup : C.player);
	      y += 26;
	    }
	  }

	  function drawMissionsPortrait() {
	    const run = game.run;
	    const x = W - 262;
	    let y = 124;
	    ctx.globalAlpha = 0.78;
	    ctx.fillStyle = 'rgba(10,10,24,0.58)';
	    chamfer(x - 10, y - 24, 254, 132, 8);
	    ctx.fill();
	    ctx.globalAlpha = 1;
	    drawText('MISSOES', x, y - 9, 15, C.player, 'left', '900');
	    for (const m of run.missions.slice(0, 4)) {
	      const color = m.done ? C.pickup : C.steel;
	      drawFittedText((m.done ? 'OK ' : '') + m.desc, x, y + 20, 142, 12, color, 'left', '700');
	      drawBar(x + 154, y + 14, 74, 8, m.value / m.target, m.done ? C.pickup : C.player);
	      y += 27;
	    }
	  }

	  function drawTouchControls() {
	    const mobile = isMobileLike();
	    if (!game.input.touchMove.active && !mobile) return;
	    const controls = touchControlLayout();
	    ctx.globalAlpha = mobile ? 0.52 : 0.34;
	    glow(C.player, 10);
	    ctx.strokeStyle = C.player;
	    ctx.lineWidth = 2;
	    ctx.beginPath(); ctx.arc(controls.joyX, controls.joyY, controls.joyR, 0, TAU); ctx.stroke();
	    ctx.beginPath(); ctx.arc(controls.joyX + game.input.touchMove.vx * controls.joyR * 0.64, controls.joyY + game.input.touchMove.vy * controls.joyR * 0.64, controls.knobR, 0, TAU); ctx.stroke();
	    ctx.strokeStyle = C.pickup;
	    ctx.fillStyle = 'rgba(255,211,0,0.08)';
	    ctx.beginPath(); ctx.arc(controls.dashX, controls.dashY, controls.dashR, 0, TAU); ctx.stroke();
	    ctx.fill();
	    drawText('DASH', controls.dashX, controls.dashY, controls.portrait ? 18 : 16, C.pickup, 'center', '800');
	    ctx.strokeStyle = C.player;
	    ctx.fillStyle = 'rgba(0,240,255,0.08)';
	    ctx.beginPath(); ctx.arc(controls.odX, controls.odY, controls.odR, 0, TAU); ctx.stroke();
	    ctx.fill();
	    drawText('OVER', controls.odX, controls.odY - 9, controls.portrait ? 15 : 13, C.player, 'center', '800');
	    drawText('DRIVE', controls.odX, controls.odY + 11, controls.portrait ? 15 : 13, C.player, 'center', '800');
	    noGlow();
	    ctx.globalAlpha = 1;
	  }

  function drawMenuLikeTitle(subtitle) {
    if (hasAsset('ui_logo')) {
      drawSprite('ui_logo', W / 2, 136 + Math.sin(game.t * 1.7) * 3, 0, 520, 220);
      drawText(subtitle || 'A ultima frota. A ultima chance.', W / 2, 218, 19, C.steel, 'center', '500');
      return;
    }
    glow(C.player, 24);
    drawText('STARSHIP 2050', W / 2, 132 + Math.sin(game.t * 1.7) * 4, 58, C.player, 'center', '900');
    noGlow();
    drawText(subtitle || 'A ultima frota. A ultima chance.', W / 2, 190, 19, C.steel, 'center', '500');
  }

	  function drawSplash() {
	    drawCinematicBackdrop(8, 0.78, 1.02);
	    drawMenuLikeTitle('A ameaca Vex acordou.');
	    const a = 0.45 + Math.sin(game.t * TAU) * 0.28;
	    ctx.globalAlpha = a;
	    drawText('PRESSIONE QUALQUER TECLA OU CLIQUE', W / 2, 430, 24, C.white, 'center', '800');
	    ctx.globalAlpha = 1;
    drawText('WASD mover  |  ESPACO dash  |  SHIFT overdrive  |  F tela cheia  |  M som', W / 2, 675, 15, C.steel, 'center', '500');
  }

  function menuNameRect() {
    const w = isPortraitLayout() ? Math.min(W - 80, 420) : 360;
    return { x: W / 2 - w / 2, y: isPortraitLayout() ? 604 : 586, w, h: 44 };
  }

	  function drawMenu() {
	    drawCinematicBackdrop(10, 0.72, 1.04);
	    drawShipShape(180 + (game.t * 70) % 1100, 360 + Math.sin(game.t * 1.2) * 82, -0.12, game.save.selectedShip, 2.2);
	    drawMenuLikeTitle();
	    drawAudioStatus(28, 34, 'left');
	    drawMono('RECORDE ' + fmt(game.save.bestScore), W - 28, 34, 20, C.pickup, 'right', '800');
	    const items = menuItems();
	    for (let i = 0; i < items.length; i++) {
	      const y = 338 + i * 58;
	      const selected = i === game.menuIndex;
	      drawMenuButton(items[i], W / 2 - 190, y - 24, 380, 48, selected);
	    }
	    const name = menuNameRect();
	    drawPanel(name.x, name.y, name.w, name.h, C.player, 0.54);
	    drawText('PILOTO: ' + sanitizePlayerName(game.save.playerName), W / 2, name.y + 27, 18, C.white, 'center', '900');
	    drawText('Escolha a rota. Evolua a frota. Quebre os chefes Vex.', W / 2, isPortraitLayout() ? H - 92 : 650, 16, C.steel, 'center', '600');
	    drawText(isPortraitLayout() ? 'TOQUE NO PILOTO PARA EDITAR' : 'N editar piloto  |  M som', W / 2, isPortraitLayout() ? H - 58 : 678, 14, C.steel, 'center', '500');
	  }

  function hangarShipRect(i) {
    if (!isPortraitLayout()) return { x: 48, y: 144 + i * 78 - 22, w: 230, h: 54 };
    const w = (W - 96) / 2;
    return { x: 36 + (i % 2) * (w + 24), y: 444 + Math.floor(i / 2) * 76, w, h: 62 };
  }

  function hangarUpgradeRect(i) {
    if (!isPortraitLayout()) {
      return { x: 906 + (i % 2) * 166, y: 154 + Math.floor(i / 2) * 94, w: 146, h: 68 };
    }
    const w = (W - 96) / 2;
    return { x: 36 + (i % 2) * (w + 24), y: 680 + Math.floor(i / 2) * 78, w, h: 68 };
  }

  function hangarActionRect() {
    if (!isPortraitLayout()) return { x: 520, y: 648, w: 240, h: 44 };
    return { x: 52, y: Math.min(H - 132, 980), w: W - 104, h: 58 };
  }

  function hangarBackRect() {
    if (!isPortraitLayout()) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: 36, y: 82, w: 148, h: 44 };
  }

  function drawHangarPortrait(shipIds, selected) {
    drawText('HANGAR', 28, 42, 34, C.player, 'left', '900');
    drawMono('NUCLEOS ' + fmt(game.save.cores), W - 28, 42, 20, C.pickup, 'right', '800');
    drawAudioStatus(W - 28, 74, 'right');
    const back = hangarBackRect();
    drawMenuButton('MENU', back.x, back.y, back.w, back.h, false);
    drawShipShape(W / 2, 190, -Math.PI / 2 + Math.sin(game.t * 1.4) * 0.12, selected.id, 3.7);
    drawText(selected.name, W / 2, 326, 30, C.white, 'center', '900');
    drawText(selected.tag, W / 2, 360, 16, C.steel, 'center', '700');
    wrapText(selected.ability, 62, 382, W - 124, 19, C.pickup);
    drawText('NAVES', 36, 424, 17, C.player, 'left', '900');
    for (let i = 0; i < shipIds.length; i++) {
      const s = SHIPS[shipIds[i]];
      const unlocked = game.save.unlockedShips.includes(s.id);
      const active = i === game.selectedShipIndex;
      const r = hangarShipRect(i);
      ctx.fillStyle = active ? 'rgba(255,211,0,0.13)' : 'rgba(0,240,255,0.06)';
      ctx.strokeStyle = active ? C.pickup : 'rgba(0,240,255,0.28)';
      chamfer(r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.stroke();
      drawShipShape(r.x + 34, r.y + 34, -Math.PI / 2, s.id, 0.7);
      drawFittedText(s.name, r.x + 70, r.y + 24, r.w - 98, 17, active ? C.pickup : unlocked ? C.white : C.steel, 'left', '900');
      drawText(unlocked ? s.tag : s.cost + ' N', r.x + 70, r.y + 47, 11, unlocked ? C.steel : C.enemy, 'left', '800');
    }
    drawText('MELHORIAS', 36, 660, 17, C.player, 'left', '900');
    const ups = [
      ['hull', 'CASCO'], ['weapons', 'DANO'], ['engines', 'MOTORES'], ['systems', 'SISTEMAS'], ['fortune', 'FORTUNA']
    ];
    for (let i = 0; i < ups.length; i++) {
      const r = hangarUpgradeRect(i);
      const lv = game.save.upgrades[ups[i][0]];
      ctx.strokeStyle = lv >= 5 ? C.pickup : C.player;
      ctx.fillStyle = 'rgba(0,240,255,0.08)';
      chamfer(r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.stroke();
      drawText(ups[i][1], r.x + 14, r.y + 24, 14, C.white, 'left', '900');
      drawMono(lv + '/5', r.x + r.w - 14, r.y + 24, 14, C.pickup, 'right', '900');
      drawBar(r.x + 14, r.y + 48, r.w - 28, 9, lv / 5, C.player);
    }
    const action = hangarActionRect();
    drawMenuButton(game.save.unlockedShips.includes(selected.id) ? 'DECOLAR' : 'COMPRAR NAVE', action.x, action.y, action.w, action.h, true);
    drawText('TOQUE NA NAVE, MELHORIA, DECOLAR OU MENU', W / 2, H - 46, 14, C.steel, 'center', '800');
  }

	  function drawHangar() {
	    drawBackground(8);
	    const shipIds = Object.keys(SHIPS);
	    const selected = SHIPS[shipIds[game.selectedShipIndex]];
	    if (isPortraitLayout()) {
	      drawHangarPortrait(shipIds, selected);
	      return;
	    }
	    drawText('HANGAR', 32, 38, 34, C.player, 'left', '900');
	    drawMono('NUCLEOS VEX ' + fmt(game.save.cores), W - 32, 38, 21, C.pickup, 'right', '800');
	    drawAudioStatus(W - 32, 68, 'right');
	    drawPanel(26, 78, 278, 560, C.player, 0.76);
	    drawPanel(330, 78, 520, 560, C.player, 0.72);
	    drawPanel(878, 78, 374, 560, C.player, 0.76);
	    drawText('NAVES', 52, 112, 18, C.player, 'left', '800');
	    for (let i = 0; i < shipIds.length; i++) {
	      const s = SHIPS[shipIds[i]];
	      const unlocked = game.save.unlockedShips.includes(s.id);
	      const y = 144 + i * 78;
	      const active = i === game.selectedShipIndex;
	      ctx.fillStyle = active ? 'rgba(255,211,0,0.12)' : 'rgba(0,240,255,0.05)';
	      ctx.strokeStyle = active ? C.pickup : 'rgba(0,240,255,0.28)';
	      chamfer(48, y - 22, 230, 54, 8); ctx.fill(); ctx.stroke();
	      drawShipShape(76, y + 5, -Math.PI / 2, s.id, 0.72);
	      drawFittedText(s.name, 112, y - 1, 118, 18, active ? C.pickup : unlocked ? C.white : C.steel, 'left', '900');
	      drawText(unlocked ? s.tag : 'BLOQUEADA', 112, y + 21, 11, unlocked ? C.steel : C.enemy, 'left', '700');
	      if (!unlocked) drawMono(s.cost + ' N', 262, y + 20, 12, C.pickup, 'right', '700');
	    }
	    drawShipShape(590, 230, -Math.PI / 2 + Math.sin(game.t * 1.4) * 0.12, selected.id, 4.3);
	    drawText(selected.name, 590, 378, 32, C.white, 'center', '900');
	    drawText(selected.tag, 590, 410, 17, C.steel, 'center', '600');
    drawStatBar('CASCO', selected.hp / 180, 390, 456);
    drawStatBar('VELOCIDADE', selected.speed / 330, 390, 494);
    drawStatBar('DASH', selected.dashDist / 260, 390, 532);
	    wrapText(selected.ability, 410, 586, 360, 19, C.pickup);
	    drawText('MELHORIAS', 904, 112, 18, C.player, 'left', '800');
    const ups = [
      ['hull', 'CASCO'], ['weapons', 'DANO'], ['engines', 'MOTORES'], ['systems', 'SISTEMAS'], ['fortune', 'FORTUNA']
    ];
    for (let i = 0; i < ups.length; i++) {
      const ux = 906 + (i % 2) * 166;
      const uy = 154 + Math.floor(i / 2) * 94;
      const lv = game.save.upgrades[ups[i][0]];
      ctx.strokeStyle = lv >= 5 ? C.pickup : C.player;
      ctx.fillStyle = 'rgba(0,240,255,0.08)';
      chamfer(ux, uy, 146, 68, 8); ctx.fill(); ctx.stroke();
      drawText(ups[i][1], ux + 12, uy + 22, 14, C.white, 'left', '800');
      drawMono(lv + '/5', ux + 130, uy + 22, 14, C.pickup, 'right', '800');
      drawBar(ux + 12, uy + 44, 116, 8, lv / 5, C.player);
    }
	    drawMenuButton(game.save.unlockedShips.includes(selected.id) ? 'DECOLAR' : 'COMPRAR NAVE', 520, 648, 240, 44, true);
	    drawText('Toque nos cards para selecionar/comprar. ESC volta.', W / 2, 704, 14, C.steel, 'center', '600');
	  }

  function drawStatBar(label, value, x, y) {
    drawText(label, x, y, 14, C.steel, 'left', '700');
    drawBar(x + 135, y - 7, 260, 14, value, C.player);
  }

	  function drawLevelUp() {
	    drawRun();
	    ctx.fillStyle = 'rgba(2,3,12,0.84)';
	    ctx.fillRect(0, 0, W, H);
	    drawText('UPGRADE DE COMBATE', W / 2, 82, 34, C.player, 'center', '900');
	    drawText('Escolha um sistema para evoluir', W / 2, 118, 18, C.steel, 'center', '600');
	    for (let i = 0; i < game.run.cards.length; i++) {
	      drawCard(game.run.cards[i], i, i === game.run.selectedCard);
	    }
	  }

	  function drawCard(card, i, selected) {
	    const portrait = isPortraitLayout();
	    const x = portrait ? 54 : 180 + i * 320;
	    const y = portrait ? 160 + i * 300 : 164;
	    const w = portrait ? W - 108 : 280;
	    const h = portrait ? 270 : 400;
	    const cx = x + w / 2;
	    const colors = { comum: C.player, rara: C.pickup, epica: C.elite, pacto: C.enemy };
	    const color = colors[card.rarity] || C.player;
	    const fill = ctx.createLinearGradient(x, y, x + w, y + h);
	    fill.addColorStop(0, card.rarity === 'pacto' ? 'rgba(42,5,22,0.98)' : 'rgba(8,18,36,0.98)');
	    fill.addColorStop(1, 'rgba(4,5,16,0.98)');
	    ctx.fillStyle = fill;
	    ctx.strokeStyle = selected ? C.pickup : color;
	    ctx.lineWidth = selected ? 4 : 2;
	    glow(selected ? C.pickup : color, selected ? 20 : 12);
	    chamfer(x, y, w, h, 14);
	    ctx.fill();
	    ctx.stroke();
	    noGlow();
	    ctx.globalAlpha = 0.2;
	    ctx.fillStyle = color;
	    chamfer(x + 16, y + (portrait ? 54 : 58), portrait ? 140 : 248, portrait ? 152 : 146, 12);
	    ctx.fill();
	    ctx.globalAlpha = 1;
	    drawText('[' + (i + 1) + '] ' + card.rarity.toUpperCase(), cx, y + 34, 14, color, 'center', '800');
	    const asset = cardAssetId(card.id);
	    if (asset && hasAsset(asset)) {
	      const spin = card.id === 'orbital' || card.id === 'boomerang' ? game.t * 2.4 : 0;
	      drawSprite(asset, x + (portrait ? 86 : 140), y + (portrait ? 130 : 132), spin, 106, 106);
	    } else {
	      drawIcon(card.id, x + (portrait ? 86 : 140), y + (portrait ? 130 : 122), 2.1, color);
	    }
	    drawFittedText(card.meta.name, portrait ? x + 220 : cx, y + (portrait ? 96 : 224), portrait ? w - 260 : 228, portrait ? 23 : 21, C.white, portrait ? 'left' : 'center', '900');
	    const levelText = card.level === 0 ? 'NOVO' : 'NV ' + card.level + ' > ' + (card.level + 1);
	    drawText(levelText, portrait ? x + 220 : cx, y + (portrait ? 130 : 258), 16, C.pickup, portrait ? 'left' : 'center', '800');
	    wrapText(card.meta.desc, portrait ? x + 220 : x + 28, y + (portrait ? 176 : 312), portrait ? w - 260 : 224, 18, C.steel);
	    if (selected) drawText('TOQUE / ENTER', cx, y + h - 24, 13, C.pickup, 'center', '800');
	  }

  function wrapText(text, x, y, width, lineH, color) {
    ctx.font = '600 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > width && line) {
        ctx.fillText(line, x, y);
        y += lineH;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, y);
  }

  function drawPause() {
    drawRun();
    ctx.fillStyle = 'rgba(5,5,16,0.82)';
    ctx.fillRect(0, 0, W, H);
    drawText('PAUSA', W / 2, 256, 42, C.player, 'center', '900');
    drawText('ENTER continuar', W / 2, 330, 24, C.white, 'center', '700');
    drawText('R reiniciar  |  M menu  |  ESC voltar', W / 2, 374, 18, C.steel, 'center', '600');
    drawAudioStatus(W / 2, 420, 'center');
  }

  function gameOverLayout() {
    if (isPortraitLayout()) {
      const panelW = W - 64;
      const panelX = 32;
      const panelY = 170;
      return {
        titleY: 84,
        reasonY: 128,
        panel: { x: panelX, y: panelY, w: panelW, h: 520 },
        name: { x: panelX + 34, y: panelY + 344, w: panelW - 68, h: 58 },
        submit: { x: panelX + 34, y: panelY + 430, w: panelW - 68, h: 56 },
        replay: { x: 52, y: panelY + 610, w: W - 104, h: 58 },
        ranking: { x: 52, y: panelY + 682, w: W - 104, h: 58 },
        hangar: { x: 52, y: panelY + 754, w: W - 104, h: 58 },
        helpY: Math.min(H - 56, panelY + 858)
      };
    }
    return {
      titleY: 110,
      reasonY: 155,
      panel: { x: W / 2 - 360, y: 210, w: 720, h: 330 },
      name: { x: W / 2 - 140, y: 458, w: 230, h: 48 },
      submit: { x: W / 2 + 120, y: 458, w: 200, h: 48 },
      replay: { x: W / 2 - 410, y: 584, w: 250, h: 46 },
      ranking: { x: W / 2 - 125, y: 584, w: 250, h: 46 },
      hangar: { x: W / 2 + 160, y: 584, w: 250, h: 46 },
      helpY: 660
    };
  }

  function submitStatusText(result) {
    if (result.submitState === 'sent') return 'ENVIADO';
    if (result.submitState === 'sending') return 'ENVIANDO...';
    if (result.submitState === 'local') return 'SALVO LOCAL';
    if (result.submitState === 'needsName') return 'INFORME SEU NOME';
    return 'PENDENTE';
  }

	  function drawGameOver() {
	    drawBackground(8);
	    const r = game.run.result;
	    const layout = gameOverLayout();
	    const p = layout.panel;
	    drawText(r.victory ? 'VITORIA' : 'RUN ENCERRADA', W / 2, layout.titleY, isPortraitLayout() ? 40 : 46, r.victory ? C.pickup : C.enemy, 'center', '900');
	    drawText(r.reason.toUpperCase(), W / 2, layout.reasonY, 18, C.steel, 'center', '600');
	    drawPanel(p.x, p.y, p.w, p.h, C.player, 0.84);
	    const right = p.x + p.w - 42;
	    drawMono('SCORE', p.x + 42, p.y + 55, 18, C.steel);
	    drawMono(fmt(game.run.score), right, p.y + 55, 28, C.white, 'right', '900');
	    drawMono('ONDA', p.x + 42, p.y + 106, 18, C.steel);
	    drawMono(String(game.run.wave), right, p.y + 106, 28, C.white, 'right', '900');
	    drawMono('GRADE', p.x + 42, p.y + 157, 18, C.steel);
	    drawMono(r.grade, right, p.y + 157, 40, r.grade === 'S' ? C.pickup : C.player, 'right', '900');
	    drawMono('NUCLEOS VEX', p.x + 42, p.y + 216, 18, C.steel);
	    drawMono('+' + r.cores, right, p.y + 216, 30, C.pickup, 'right', '900');
	    drawText('NOME NO RANKING', p.x + 42, p.y + 292, 14, C.steel, 'left', '800');
	    drawPanel(layout.name.x, layout.name.y, layout.name.w, layout.name.h, r.submitState === 'sent' ? C.pickup : C.player, 0.6);
	    drawText(sanitizePlayerName(game.save.playerName), layout.name.x + layout.name.w / 2, layout.name.y + layout.name.h / 2 + 1, isPortraitLayout() ? 24 : 22, C.white, 'center', '900');
	    drawMenuButton(r.submitState === 'sent' ? 'SCORE ENVIADO' : r.submitState === 'needsName' ? 'INFORMAR NOME' : 'ENVIAR SCORE', layout.submit.x, layout.submit.y, layout.submit.w, layout.submit.h, r.submitState !== 'sent');
	    drawText(submitStatusText(r), p.x + p.w / 2, p.y + p.h - 24, 15, r.submitState === 'sent' ? C.pickup : C.steel, 'center', '800');
	    drawMenuButton('JOGAR NOVAMENTE', layout.replay.x, layout.replay.y, layout.replay.w, layout.replay.h, true);
	    drawMenuButton('RANKING', layout.ranking.x, layout.ranking.y, layout.ranking.w, layout.ranking.h, false);
	    drawMenuButton('HANGAR', layout.hangar.x, layout.hangar.y, layout.hangar.w, layout.hangar.h, false);
	    drawText(isPortraitLayout() ? 'TOQUE NO NOME PARA EDITAR' : 'Digite o nome, Backspace apaga, Enter envia', W / 2, layout.helpY, 15, C.steel, 'center', '600');
	    drawAudioStatus(W / 2, Math.min(H - 22, layout.helpY + 30), 'center');
	  }

  function rankingLayout() {
    if (isPortraitLayout()) {
      return {
        titleY: 82,
        panel: { x: 28, y: 130, w: W - 56, h: Math.min(680, H - 270) },
        back: { x: 70, y: Math.min(H - 116, 850), w: W - 140, h: 56 }
      };
    }
    return {
      titleY: 92,
      panel: { x: 190, y: 132, w: 900, h: 458 },
      back: { x: W / 2 - 125, y: 640, w: 250, h: 46 }
    };
  }

	  function drawRanking() {
	    drawCinematicBackdrop(7, 0.62, 1.04);
	    const layout = rankingLayout();
	    const p = layout.panel;
	    drawText('RANKING GALACTICO', W / 2, layout.titleY, isPortraitLayout() ? 32 : 38, C.pickup, 'center', '900');
	    drawAudioStatus(W - 32, 34, 'right');
	    drawPanel(p.x, p.y, p.w, p.h, C.player, 0.82);
	    const entries = game.leaderboard.length ? game.leaderboard : localLeaderboard();
	    if (game.leaderboardState === 'loading') {
	      drawText('CARREGANDO RANKING...', W / 2, p.y + p.h / 2, 22, C.steel, 'center', '800');
	    } else if (!entries.length) {
	      drawText('NENHUM SCORE REGISTRADO AINDA', W / 2, p.y + p.h / 2, 22, C.steel, 'center', '800');
	    } else {
	      const compact = isPortraitLayout();
	      const rowX = p.x + 28;
	      const pilotX = p.x + (compact ? 76 : 102);
	      const scoreX = p.x + p.w - (compact ? 132 : 370);
	      const waveX = p.x + p.w - (compact ? 34 : 264);
	      const shipX = p.x + p.w - 100;
	      const headerY = p.y + 44;
	      const rowH = compact ? 48 : 34;
	      drawMono('#', rowX, headerY, 15, C.steel, 'left', '800');
	      drawMono('PILOTO', pilotX, headerY, 15, C.steel, 'left', '800');
	      drawMono('SCORE', scoreX, headerY, 15, C.steel, 'right', '800');
	      drawMono('ONDA', waveX, headerY, 15, C.steel, 'right', '800');
	      if (!compact) drawMono('NAVE', shipX, headerY, 15, C.steel, 'right', '800');
	      for (let i = 0; i < Math.min(10, entries.length); i++) {
	        const e = entries[i];
	        const y = headerY + 40 + i * rowH;
	        const mine = sanitizePlayerName(e.name) === sanitizePlayerName(game.save.playerName);
	        if (mine) {
	          ctx.globalAlpha = 0.16;
	          ctx.fillStyle = C.pickup;
	          chamfer(p.x + 20, y - rowH / 2 + 4, p.w - 40, rowH - 8, 6); ctx.fill();
	          ctx.globalAlpha = 1;
	        }
	        drawMono(String(i + 1).padStart(2, '0'), rowX, y, 16, i < 3 ? C.pickup : C.steel, 'left', '900');
	        drawFittedText(e.name, pilotX, y, compact ? 170 : 310, 17, mine ? C.pickup : C.white, 'left', '800');
	        drawMono(fmt(e.score), scoreX, y, 17, C.white, 'right', '900');
	        drawMono(String(e.wave), waveX, y, 16, C.player, 'right', '800');
	        if (!compact) drawText(String(e.ship || '').toUpperCase(), shipX, y, 14, C.steel, 'right', '800');
	      }
	    }
	    if (game.leaderboardError) drawText(game.leaderboardError, W / 2, layout.back.y - 28, 15, C.steel, 'center', '600');
	    drawMenuButton('VOLTAR', layout.back.x, layout.back.y, layout.back.w, layout.back.h, true);
	  }

  function handleSplash() {
    if (Object.keys(game.input.pressed).length || game.input.mouse.clicked) {
      ensureAudio();
      audioEvent('ui_confirm');
      window.PokiBridge.init();
      setMode('menu');
    }
  }

	  function handleMenu() {
	    const items = menuItems();
	    let moved = false;
	    let clickedChoice = false;
	    if (game.input.wasPressed('ArrowDown') || game.input.wasPressed('KeyS')) {
	      game.menuIndex = (game.menuIndex + 1) % items.length;
	      moved = true;
	    }
	    if (game.input.wasPressed('ArrowUp') || game.input.wasPressed('KeyW')) {
	      game.menuIndex = (game.menuIndex + items.length - 1) % items.length;
	      moved = true;
	    }
	    if (game.input.mouse.clicked) {
	      const name = menuNameRect();
	      if (hitRect(name.x, name.y, name.w, name.h)) {
	        openPlayerNameEditor(name);
	        return;
	      }
	      for (let i = 0; i < items.length; i++) {
	        if (hitRect(W / 2 - 190, 338 + i * 58 - 24, 380, 48)) {
	          game.menuIndex = i;
	          moved = true;
	          clickedChoice = true;
	        }
	      }
	    }
	    if (moved) audioEvent('ui_nav');
	    if (game.input.wasPressed('KeyN')) {
	      openPlayerNameEditor(menuNameRect());
	      return;
	    }
	    if (game.input.wasPressed('Enter') || game.input.wasPressed('Space') || clickedChoice) {
	      audioEvent('ui_confirm');
	      if (game.menuIndex === 0) {
	        window.PokiBridge.commercialBreak(() => startRun({}));
      } else if (game.menuIndex === 1) {
        setMode('hangar');
	      } else if (game.menuIndex === 2) {
	        window.PokiBridge.commercialBreak(() => startRun({ daily: true }));
	      } else {
	        setMode('ranking');
	      }
	    }
	  }

	  function handleHangar() {
	    const ids = Object.keys(SHIPS);
	    const activateShip = () => {
	      const ship = SHIPS[ids[game.selectedShipIndex]];
	      if (game.save.unlockedShips.includes(ship.id)) {
	        audioEvent('ui_confirm');
	        game.save.selectedShip = ship.id;
	        storeSave();
	        window.PokiBridge.commercialBreak(() => startRun({}));
	      } else if (game.save.cores >= ship.cost) {
	        audioEvent('purchase');
	        game.save.cores -= ship.cost;
	        game.save.unlockedShips.push(ship.id);
	        game.save.selectedShip = ship.id;
	        storeSave();
	      } else {
	        audioEvent('error');
	      }
	    };
	    if (game.input.wasPressed('Escape')) {
	      audioEvent('ui_confirm');
	      setMode('menu');
	    }
	    if (isPortraitLayout()) {
	      const back = hangarBackRect();
	      if (hitRect(back.x, back.y, back.w, back.h)) {
	        audioEvent('ui_confirm');
	        setMode('menu');
	        return;
	      }
	    }
    let moved = false;
    if (game.input.wasPressed('ArrowDown') || game.input.wasPressed('KeyS')) {
      game.selectedShipIndex = (game.selectedShipIndex + 1) % ids.length;
      moved = true;
    }
	    if (game.input.wasPressed('ArrowUp') || game.input.wasPressed('KeyW')) {
	      game.selectedShipIndex = (game.selectedShipIndex + ids.length - 1) % ids.length;
	      moved = true;
	    }
	    if (game.input.mouse.clicked) {
	      for (let i = 0; i < ids.length; i++) {
	        const r = hangarShipRect(i);
	        if (hitRect(r.x, r.y, r.w, r.h)) {
	          game.selectedShipIndex = i;
	          moved = true;
	        }
	      }
	    }
	    if (moved) audioEvent('ui_nav');
	    const action = hangarActionRect();
	    if (game.input.wasPressed('Enter') || game.input.wasPressed('Space') || hitRect(action.x, action.y, action.w, action.h)) activateShip();
	    if (game.input.wasPressed('Digit1')) buyUpgrade('hull');
	    if (game.input.wasPressed('Digit2')) buyUpgrade('weapons');
	    if (game.input.wasPressed('Digit3')) buyUpgrade('engines');
	    if (game.input.wasPressed('Digit4')) buyUpgrade('systems');
	    if (game.input.wasPressed('Digit5')) buyUpgrade('fortune');
	    if (game.input.mouse.clicked) {
	      const ups = ['hull', 'weapons', 'engines', 'systems', 'fortune'];
	      for (let i = 0; i < ups.length; i++) {
	        const r = hangarUpgradeRect(i);
	        if (hitRect(r.x, r.y, r.w, r.h)) buyUpgrade(ups[i]);
	      }
	    }
	  }

  function buyUpgrade(id) {
    const costs = [10, 25, 60, 140, 320];
    const lv = game.save.upgrades[id] || 0;
    if (lv >= 5) return;
    const cost = costs[lv];
    if (game.save.cores >= cost) {
      game.save.cores -= cost;
      game.save.upgrades[id] = lv + 1;
      game.save.totalNucleosSpent = (game.save.totalNucleosSpent || 0) + cost;
      audioEvent('purchase');
      storeSave();
    } else {
      audioEvent('error');
    }
  }

  function handleLevelUp() {
    let moved = false;
    if (game.input.wasPressed('ArrowRight') || game.input.wasPressed('KeyD') || (isPortraitLayout() && (game.input.wasPressed('ArrowDown') || game.input.wasPressed('KeyS')))) {
      game.run.selectedCard = (game.run.selectedCard + 1) % game.run.cards.length;
      moved = true;
    }
    if (game.input.wasPressed('ArrowLeft') || game.input.wasPressed('KeyA') || (isPortraitLayout() && (game.input.wasPressed('ArrowUp') || game.input.wasPressed('KeyW')))) {
      game.run.selectedCard = (game.run.selectedCard + game.run.cards.length - 1) % game.run.cards.length;
      moved = true;
    }
	    if (moved) audioEvent('ui_nav');
	    if (game.input.wasPressed('Digit1')) chooseCard(0);
	    if (game.input.wasPressed('Digit2')) chooseCard(1);
	    if (game.input.wasPressed('Digit3')) chooseCard(2);
	    if (game.input.mouse.clicked) {
	      for (let i = 0; i < game.run.cards.length; i++) {
	        const portrait = isPortraitLayout();
	        const x = portrait ? 54 : 180 + i * 320;
	        const y = portrait ? 160 + i * 300 : 164;
	        const w = portrait ? W - 108 : 280;
	        const h = portrait ? 270 : 400;
	        if (hitRect(x, y, w, h)) chooseCard(i);
	      }
	    }
	    if (game.input.wasPressed('Enter') || game.input.wasPressed('Space')) chooseCard(game.run.selectedCard);
	  }

  function handlePause() {
    if (game.input.wasPressed('Escape') || game.input.wasPressed('Enter') || game.input.wasPressed('KeyP')) {
      audioEvent('ui_confirm');
      setMode('run');
      window.PokiBridge.gameplayStart();
      game.pokiGameplay = true;
    }
    if (game.input.wasPressed('KeyR')) {
      audioEvent('ui_confirm');
      window.PokiBridge.commercialBreak(() => startRun({}));
    }
    if (game.input.wasPressed('KeyM')) {
      audioEvent('ui_confirm');
      setMode('menu');
    }
  }

  function submitPendingScore() {
    const result = game.run && game.run.result;
    if (result && !result.submitted && result.submitState !== 'sending' && result.submitState !== 'sent') {
      submitLeaderboardScore(result);
    }
  }

	  function handleGameOver() {
	    const r = game.run.result;
	    const layout = gameOverLayout();
	    if (game.input.mouse.clicked && hitRect(layout.name.x, layout.name.y, layout.name.w, layout.name.h) && r.submitState !== 'sent') {
	      openPlayerNameEditor(layout.name);
	      return;
	    }
	    if (r.submitState !== 'sent' && game.input.text) appendPlayerNameText(game.input.text);
	    if (r.submitState !== 'sent' && game.input.wasPressed('Backspace')) removePlayerNameChar();
	    if ((game.input.wasPressed('Enter') && r.submitState !== 'sent') || hitRect(layout.submit.x, layout.submit.y, layout.submit.w, layout.submit.h)) {
	      if (sanitizePlayerName(game.save.playerName) === 'PILOTO' && !r.nameDirty) {
	        openPlayerNameEditor(layout.name, () => submitLeaderboardScore(r));
	        return;
	      }
	      submitLeaderboardScore(r);
	      audioEvent('ui_confirm');
	      return;
	    }
	    if (hitRect(layout.replay.x, layout.replay.y, layout.replay.w, layout.replay.h) || (game.input.wasPressed('Enter') && r.submitState === 'sent')) {
	      submitPendingScore();
	      audioEvent('ui_confirm');
	      window.PokiBridge.commercialBreak(() => startRun({}));
	    }
	    if (hitRect(layout.hangar.x, layout.hangar.y, layout.hangar.w, layout.hangar.h)) {
	      submitPendingScore();
	      audioEvent('ui_confirm');
	      setMode('hangar');
	    }
	    if (hitRect(layout.ranking.x, layout.ranking.y, layout.ranking.w, layout.ranking.h)) {
	      submitPendingScore();
	      audioEvent('ui_confirm');
	      setMode('ranking');
	    }
	    if (game.input.wasPressed('Escape')) {
	      submitPendingScore();
	      audioEvent('ui_confirm');
	      setMode('menu');
	    }
	  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen && canvas.requestFullscreen();
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  }

  function update(dt) {
    game.t += dt;
    handleAudioShortcut();
    if (game.mode === 'splash') handleSplash();
    else if (game.mode === 'menu') handleMenu();
    else if (game.mode === 'hangar') handleHangar();
    else if (game.mode === 'run') updateRun(dt);
    else if (game.mode === 'levelup') {
      updateFx(dt);
      handleLevelUp();
    } else if (game.mode === 'pause') {
      updateFx(dt);
      handlePause();
	    } else if (game.mode === 'gameover') {
	      updateFx(dt);
	      handleGameOver();
	    } else if (game.mode === 'ranking') {
	      if (game.input.wasPressed('KeyR')) refreshLeaderboard(true);
	      const back = rankingLayout().back;
	      if (game.input.wasPressed('Escape') || game.input.wasPressed('Enter') || hitRect(back.x, back.y, back.w, back.h)) setMode('menu');
	    }
    updateAudio();
  }

  function render() {
    if (game.mode === 'splash') drawSplash();
    else if (game.mode === 'menu') drawMenu();
    else if (game.mode === 'hangar') drawHangar();
    else if (game.mode === 'run') drawRun();
    else if (game.mode === 'levelup') drawLevelUp();
	    else if (game.mode === 'pause') drawPause();
	    else if (game.mode === 'gameover') drawGameOver();
	    else if (game.mode === 'ranking') drawRanking();
	  }

  function frame(now) {
    const frameDt = Math.min((now - game.lastMs) / 1000, 0.1);
    game.lastMs = now;
    game.accum += frameDt;
    let steps = 0;
    while (game.accum >= FIXED_DT && steps < 5) {
      update(FIXED_DT);
      game.accum -= FIXED_DT;
      steps++;
    }
    if (steps === 5) game.accum = 0;
    render();
    game.input.endFrame();
    requestAnimationFrame(frame);
  }

  function renderGameToText() {
    const run = game.run;
    const payload = {
      note: 'Canvas uses 1280x720 landscape or a portrait mobile layout; origin top-left; x right; y down.',
      mode: game.mode,
      assets: {
        ready: Assets.ready,
        loaded: Assets.loaded,
        total: Assets.total,
        sprites: Object.keys(Assets.images).length
      },
      audio: game.audio ? {
        muted: game.audio.muted,
        unlocked: game.audio.unlocked,
        track: game.audio.track,
        available: !game.audio.disabled
      } : { muted: !!game.save.muted, unlocked: false, track: null, available: null },
      save: { cores: game.save.cores, bestScore: game.save.bestScore, bestWave: game.save.bestWave },
      run: run ? {
        time: Number(run.time.toFixed(2)),
        wave: run.wave,
        waveDuration: run.waveDuration,
        phase: run.phase,
        score: Math.floor(run.score),
        combo: run.combo,
        nearMisses: run.nearMisses,
        player: {
          x: Math.round(run.player.x),
          y: Math.round(run.player.y),
          hp: Math.ceil(run.player.hp),
          hpMax: run.player.hpMax,
          level: run.player.level,
          xp: Math.floor(run.player.xp),
          overdrive: Math.floor(run.player.overdrive),
          dashCd: Number(run.player.dashCd.toFixed(2))
        },
        enemies: run.enemies.slice(0, 12).map((e) => ({ type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.ceil(e.hp) })),
        boss: run.boss ? { name: run.boss.name, hp: Math.ceil(run.boss.hp), maxHp: run.boss.maxHp, phase: run.boss.phase, specialCd: Number(run.boss.special.toFixed(2)) } : null,
        bullets: run.enemyBullets.length,
        cards: run.cards.map((c) => c.meta.name),
        missions: run.missions.map((m) => ({ id: m.id, value: m.value, target: m.target, done: m.done }))
      } : null
    };
    return JSON.stringify(payload);
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = function (ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(FIXED_DT);
    render();
    game.input.endFrame();
  };
  window.starshipStartRun = function () { startRun({}); };
  window.starshipSetMode = function (mode) { setMode(mode); };
  window.starshipDebugSpawnBoss = function (index) {
    if (!game.run) startRun({});
    game.run.enemies.length = 0;
    game.run.enemyBullets.length = 0;
    game.run.bullets.length = 0;
    game.run.wave = BOSSES[index] ? BOSSES[index].wave : 5;
    spawnBoss(index || 0);
    setMode('run');
  };
	  window.starshipDebugLevelUp = function () {
	    if (!game.run) startRun({});
	    openLevelUp();
	  };
	  window.starshipDebugBossAttack = function () {
	    if (game.run && game.run.boss) game.run.boss.attackAnim = 0.68;
	  };
	  window.starshipDebugBossPhase = function () {
	    if (game.run && game.run.boss) game.run.boss.phaseAnim = 0.95;
	  };
	  window.starshipDebugChooseCard = function (index) { chooseCard(index || 0); };
  window.starshipToggleMute = function () { return toggleMute(); };
  window.starshipAudioUnlock = function () { return ensureAudio(); };

  game.audio = new AudioEngine();
  game.input = new Input();
  initVisuals();
  Promise.all([
    window.PokiBridge.init(),
    loadAssets()
  ]).then(() => {
    window.PokiBridge.loadingFinished();
    if (game.debugDemo) startRun({});
  }).catch(() => window.PokiBridge.loadingFinished());
  requestAnimationFrame(frame);
})();
