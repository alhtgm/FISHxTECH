// ========================================
// サウンドシステム（Web Audio API）
// BGM: 場面別テーマ（スターデューバレー風）
//   - バイブラート付きメロディ（フルート風）
//   - ハーモニー（5度和音）
//   - コード・パッド
//   - パーカッション（キック / ハイハット / スネア）
// ========================================

export type BGMScene = 'exploration' | 'decision' | 'sailing' | 'storm' | 'result' | 'growth';

type Note = [number, number, number]; // [freq_hz, beats, vol]

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private bgmGain!: GainNode;
  private seGain!: GainNode;
  private bgmActive = false;
  private bgmTimeout: number | null = null;
  private oceanSource: AudioBufferSourceNode | null = null;
  private _muted = false;
  private currentScene: BGMScene = 'exploration';
  private phraseIndex = 0;
  private sceneSwitching = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.65;
      this.masterGain.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.20;
      this.bgmGain.connect(this.masterGain);
      this.seGain = this.ctx.createGain();
      this.seGain.gain.value = 0.55;
      this.seGain.connect(this.masterGain);
    }
    return this.ctx;
  }

  resume() { this.getCtx().resume(); }

  // ----------------------------------------
  // シーン別メロディ定義
  // Aマイナーペンタ基準: A=220/440, C=261.63, D=293.66, E=329.63, G=392.00
  // Dメジャー: D=293.66, E=329.63, F#=369.99, A=440, B=493.88, D5=587.33
  // ----------------------------------------
  private readonly BGM_SCENES: Record<BGMScene, { bpm: number; phrases: Note[][] }> = {
    // ===== 港の朝テーマ（Gメジャー 88BPM・明るく活気ある） =====
    exploration: {
      bpm: 88,
      phrases: [
        // 上昇ライン → 頂点 → 解決（海を眺める朝のイメージ）
        [[392.00,1,0.28],[440.00,1,0.26],[493.88,1,0.30],[587.33,2,0.32],[493.88,1,0.28],[440.00,1,0.26],[392.00,3,0.30]],
        // 跳躍 → 軽快な走句
        [[293.66,1,0.24],[392.00,1,0.28],[493.88,2,0.30],[440.00,1,0.26],[392.00,1,0.28],[329.63,1,0.24],[293.66,3,0.26]],
        // 中音域でゆったり歌う
        [[493.88,2,0.30],[440.00,1,0.26],[392.00,1,0.28],[329.63,2,0.24],[392.00,2,0.26],[440.00,2,0.28]],
        // まとめ → 高揚して締め
        [[392.00,1,0.28],[493.88,1,0.30],[587.33,2,0.32],[493.88,1,0.28],[392.00,1,0.26],[440.00,2,0.26],[392.00,1,0.28],[293.66,1,0.24]],
      ],
    },
    // ===== 作戦テーマ（Cメジャー 96BPM・弾むような知的さ） =====
    decision: {
      bpm: 96,
      phrases: [
        [[329.63,1,0.28],[392.00,2,0.28],[440.00,1,0.26],[523.25,2,0.30],[493.88,2,0.28],[392.00,2,0.26]],
        [[261.63,2,0.26],[293.66,1,0.24],[329.63,2,0.28],[392.00,2,0.30],[329.63,1,0.26],[293.66,2,0.24],[261.63,2,0.26]],
        [[392.00,1,0.28],[440.00,1,0.26],[493.88,1,0.28],[523.25,2,0.30],[440.00,1,0.26],[392.00,1,0.28],[329.63,3,0.26]],
        [[293.66,2,0.24],[329.63,1,0.26],[392.00,2,0.28],[440.00,1,0.26],[523.25,2,0.30],[493.88,2,0.28],[392.00,2,0.26]],
      ],
    },
    // ===== 航海テーマ（Dメジャー 122BPM・シャンティ・最高に活気！） =====
    sailing: {
      bpm: 122,
      phrases: [
        // 力強い跳躍 → 頂点 → ノリのいい下降
        [[293.66,1,0.34],[369.99,1,0.30],[440.00,1,0.36],[587.33,2,0.38],[440.00,1,0.30],[369.99,1,0.28],[293.66,2,0.32]],
        // 細かいパッセージ → 上昇
        [[369.99,1,0.30],[440.00,0.5,0.28],[493.88,0.5,0.28],[587.33,1,0.36],[440.00,1,0.30],[369.99,2,0.28],[293.66,1,0.30],[329.63,1,0.28]],
        // 反復 → 決め
        [[587.33,2,0.38],[493.88,1,0.32],[440.00,1,0.30],[369.99,0.5,0.28],[329.63,0.5,0.26],[293.66,1,0.32],[369.99,2,0.30],[440.00,1,0.32]],
        // 跳び出し → 気持ちいい解決
        [[440.00,1,0.34],[493.88,0.5,0.30],[587.33,0.5,0.34],[493.88,1,0.32],[440.00,1,0.30],[369.99,2,0.28],[293.66,1,0.30],[329.63,1,0.28],[293.66,2,0.34]],
      ],
    },
    // ===== 嵐テーマ（Dナチュラルマイナー 112BPM・緊張感ある疾走） =====
    storm: {
      bpm: 112,
      phrases: [
        [[293.66,1,0.38],[349.23,1,0.30],[293.66,1,0.36],[392.00,2,0.32],[349.23,1,0.28],[293.66,1,0.34],[220.00,2,0.36]],
        [[220.00,1,0.32],[261.63,1,0.30],[293.66,1,0.36],[349.23,2,0.32],[329.63,1,0.28],[293.66,1,0.30],[261.63,1,0.28],[293.66,1,0.32]],
        [[349.23,2,0.34],[392.00,1,0.30],[440.00,1,0.36],[392.00,1,0.30],[349.23,1,0.28],[293.66,1,0.32],[261.63,2,0.30]],
        [[293.66,1,0.36],[329.63,1,0.30],[349.23,1,0.32],[392.00,2,0.38],[440.00,1,0.32],[349.23,1,0.28],[293.66,2,0.36]],
      ],
    },
    // ===== 結果テーマ（Fメジャー 80BPM・温かく前向き） =====
    result: {
      bpm: 80,
      phrases: [
        [[349.23,2,0.27],[392.00,1,0.25],[440.00,2,0.29],[523.25,2,0.30],[440.00,1,0.25],[392.00,2,0.27]],
        [[261.63,2,0.24],[329.63,1,0.26],[349.23,2,0.27],[392.00,2,0.28],[349.23,1,0.25],[329.63,2,0.24],[261.63,2,0.26]],
        [[440.00,2,0.28],[392.00,1,0.25],[349.23,1,0.26],[392.00,2,0.28],[440.00,1,0.28],[523.25,2,0.30],[440.00,1,0.27]],
        [[349.23,1,0.26],[392.00,1,0.26],[440.00,1,0.27],[392.00,1,0.25],[349.23,2,0.26],[329.63,2,0.24],[349.23,3,0.28]],
      ],
    },
    // ===== 成長テーマ（Cメジャー 108BPM・ファンファーレ・高揚！） =====
    growth: {
      bpm: 108,
      phrases: [
        // ファンファーレ的跳躍 → 高らかに
        [[261.63,0.5,0.30],[329.63,0.5,0.30],[392.00,1,0.34],[523.25,2,0.38],[392.00,1,0.30],[329.63,0.5,0.28],[261.63,0.5,0.26],[293.66,0.5,0.28],[329.63,0.5,0.28],[392.00,1,0.30]],
        // 走り抜ける喜び
        [[329.63,1,0.28],[392.00,1,0.30],[440.00,1,0.30],[523.25,2,0.34],[440.00,1,0.28],[392.00,1,0.28],[329.63,2,0.26],[261.63,1,0.28]],
        // 上昇スケール → 頂点
        [[392.00,1,0.30],[440.00,0.5,0.28],[493.88,0.5,0.30],[523.25,1,0.34],[587.33,1,0.36],[523.25,1,0.32],[493.88,1,0.28],[440.00,1,0.26],[392.00,2,0.28]],
        // 締め：上昇してから解決
        [[261.63,0.5,0.28],[392.00,0.5,0.30],[659.26,1,0.36],[587.33,1,0.32],[523.25,1,0.30],[493.88,1,0.28],[392.00,1,0.30],[523.25,2,0.36],[261.63,1,0.32]],
      ],
    },
  };

  // ----------------------------------------
  // BGM 開始・停止・シーン切替
  // ----------------------------------------
  startBGM(scene: BGMScene = 'exploration') {
    if (this.bgmActive && this.currentScene === scene) return;
    if (!this.bgmActive) {
      this.bgmActive = true;
      this.playOceanAmbience();
    }
    this.currentScene = scene;
    this.phraseIndex = 0;
    if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
    this.scheduleMelody(0);
  }

  stopBGM() {
    this.bgmActive = false;
    if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
    try { this.oceanSource?.stop(); } catch { /* ignore */ }
    this.oceanSource = null;
  }

  switchScene(scene: BGMScene) {
    if (this.currentScene === scene || this.sceneSwitching) return;
    if (!this.bgmActive) { this.startBGM(scene); return; }
    this.sceneSwitching = true;
    const ctx = this.getCtx();
    this.bgmGain.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    setTimeout(() => {
      this.currentScene = scene;
      this.phraseIndex = 0;
      if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
      this.scheduleMelody(0);
      this.bgmGain.gain.setTargetAtTime(0.20, ctx.currentTime, 0.45);
      this.sceneSwitching = false;
    }, 900);
  }

  get muted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    const vol = this._muted ? 0 : 0.65;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(vol, this.getCtx().currentTime, 0.1);
    return this._muted;
  }

  // ----------------------------------------
  // 環境音（波）
  // ----------------------------------------
  private playOceanAmbience() {
    const ctx = this.getCtx();
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * 4, sr);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < buf.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      data[i] = (b0 + b1 + b2 + w * 0.5362) / 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 260;
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.10; lfoG.gain.value = 70;
    lfo.connect(lfoG); lfoG.connect(lpf.frequency);
    const ag = ctx.createGain(); ag.gain.value = 0.07;
    src.connect(lpf); lpf.connect(ag); ag.connect(this.bgmGain);
    src.start(); lfo.start();
    this.oceanSource = src;
  }

  // ----------------------------------------
  // メロディスケジューラ（バイブラート + ハーモニー + パーカッション）
  // ----------------------------------------
  private scheduleMelody(phraseOffset: number) {
    if (!this.bgmActive) return;
    const sceneData = this.BGM_SCENES[this.currentScene];
    const ctx = this.getCtx();
    const beat = 60 / sceneData.bpm;
    const phrase = sceneData.phrases[this.phraseIndex % sceneData.phrases.length];
    this.phraseIndex++;

    let time = ctx.currentTime + phraseOffset;
    let totalBeats = 0;
    let beatIdx = 0;

    for (const [freq, beats, vol] of phrase) {
      const dur = beats * beat;

      // 1. メロディ（バイブラート付き・フルート風）
      this.scheduleNoteVibrato(freq, vol, time, dur * 0.86);

      // 2. ハーモニー（完全5度 = ×1.498）– 嵐以外でランダムに追加
      if (this.currentScene !== 'storm' && Math.random() < 0.48) {
        this.scheduleNote(freq * 1.498, 'sine', vol * 0.20, time, dur * 0.72);
      }

      // 3. ベース（1オクターブ下）
      const addBass =
        this.currentScene === 'sailing' && totalBeats % 2 === 0 ||
        this.currentScene === 'storm' ||
        this.currentScene === 'growth' && totalBeats % 2 === 0 ||
        this.currentScene === 'decision' && totalBeats % 3 === 0;
      if (addBass) {
        this.scheduleNote(freq / 2, 'triangle', vol * 0.30, time, dur * 0.80);
      }

      // 4. パーカッション
      if (this.currentScene === 'sailing') {
        if (beatIdx % 4 === 0) this.scheduleKick(ctx, time, 0.22);
        if (beatIdx % 2 === 0) this.scheduleHihat(ctx, time);
        if (beatIdx % 4 === 2) this.scheduleSnare(ctx, time, 0.08);
      } else if (this.currentScene === 'storm') {
        if (beatIdx % 2 === 0) this.scheduleKick(ctx, time, 0.38);
        if (beatIdx % 2 === 1) this.scheduleSnare(ctx, time, 0.14);
        this.scheduleHihat(ctx, time, 0.05);
      } else if (this.currentScene === 'growth') {
        if (beatIdx % 4 === 0) this.scheduleKick(ctx, time, 0.18);
        if (beatIdx % 4 === 2) this.scheduleSnare(ctx, time, 0.06);
      }

      // 5. パッドコード（探索/結果テーマの冒頭のみ）
      if ((this.currentScene === 'exploration' || this.currentScene === 'result') && totalBeats === 0) {
        const padDur = Math.min(8 * beat, 4.0);
        [freq * 1.259, freq * 1.498].forEach(f => {
          this.scheduleNote(f, 'sine', vol * 0.10, time, padDur);
        });
      }

      time += dur;
      totalBeats += beats;
      beatIdx++;
    }

    const totalMs = totalBeats * beat * 1000;
    this.bgmTimeout = window.setTimeout(() => this.scheduleMelody(0.06), totalMs - 120);
  }

  // バイブラート付きノート（フルート風）
  private scheduleNoteVibrato(freq: number, vol: number, start: number, dur: number) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 6;

    // バイブラートは発音後0.1秒から始まる
    lfo.frequency.value = 5.2 + Math.random() * 1.2;
    lfoGain.gain.setValueAtTime(0, start);
    lfoGain.gain.linearRampToValueAtTime(5, start + 0.12);
    lfoGain.gain.setValueAtTime(5, start + dur * 0.75);
    lfoGain.gain.linearRampToValueAtTime(0, start + dur);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.04);
    gain.gain.setValueAtTime(vol * 0.72, start + dur * 0.65);
    gain.gain.linearRampToValueAtTime(0.0001, start + dur);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(start); lfo.start(start);
    osc.stop(start + dur + 0.05); lfo.stop(start + dur + 0.05);
  }

  private scheduleNote(freq: number, type: OscillatorType, vol: number, start: number, dur: number) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 4;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(vol * 0.5, start + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain); gain.connect(this.bgmGain);
    osc.start(start); osc.stop(start + dur + 0.05);
  }

  // バスドラム（低音スイープ）
  private scheduleKick(ctx: AudioContext, time: number, vol = 0.22) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.18);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(gain); gain.connect(this.bgmGain);
    osc.start(time); osc.stop(time + 0.32);
  }

  // ハイハット（フィルターノイズ）
  private scheduleHihat(ctx: AudioContext, time: number, vol = 0.038) {
    const bufSize = Math.round(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 9500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    src.connect(hpf); hpf.connect(g); g.connect(this.bgmGain);
    src.start(time); src.stop(time + 0.05);
  }

  // スネア（バンドパスノイズ）
  private scheduleSnare(ctx: AudioContext, time: number, vol = 0.10) {
    const bufSize = Math.round(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.frequency.value = 900; bpf.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    src.connect(bpf); bpf.connect(g); g.connect(this.bgmGain);
    src.start(time); src.stop(time + 0.12);
  }

  // ----------------------------------------
  // SE
  // ----------------------------------------
  playSE(type: 'click' | 'select' | 'event' | 'profit' | 'loss' | 'coin' | 'levelup' | 'monthstart' | 'decision' | 'roulette-tick' | 'roulette-success' | 'roulette-fail') {
    if (this._muted) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    switch (type) {
      case 'click':
        this.tone(ctx, 620, 'sine', 0.13, now, 0.06); break;
      case 'select':
        this.tone(ctx, 880, 'sine', 0.10, now, 0.05); break;
      case 'decision':
        this.tone(ctx, 523.25, 'sine', 0.18, now, 0.08);
        this.tone(ctx, 659.25, 'sine', 0.15, now + 0.06, 0.10); break;
      case 'event':
        this.tone(ctx, 369.99, 'square', 0.08, now, 0.08);
        this.tone(ctx, 493.88, 'square', 0.08, now, 0.08);
        this.tone(ctx, 740.00, 'sine', 0.12, now + 0.08, 0.20); break;
      case 'profit':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(ctx, f, 'sine', 0.18, now + i * 0.09, 0.14)); break;
      case 'loss':
        [440, 369.99, 293.66].forEach((f, i) =>
          this.tone(ctx, f, 'triangle', 0.13, now + i * 0.13, 0.18)); break;
      case 'coin':
        this.tone(ctx, 1318.51, 'sine', 0.22, now, 0.04);
        this.tone(ctx, 1567.98, 'sine', 0.18, now + 0.04, 0.10); break;
      case 'levelup':
        [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(ctx, f, 'sine', 0.22, now + i * 0.07, 0.18));
        setTimeout(() => {
          const t = ctx.currentTime;
          [523.25, 659.25, 783.99].forEach(f => this.tone(ctx, f, 'sine', 0.20, t, 0.4));
        }, 400); break;
      case 'monthstart':
        this.tone(ctx, 523.25, 'sine', 0.16, now, 0.18);
        this.tone(ctx, 659.25, 'sine', 0.12, now + 0.18, 0.15);
        this.tone(ctx, 783.99, 'sine', 0.10, now + 0.32, 0.20); break;
      case 'roulette-tick':
        this.tone(ctx, 1400, 'square', 0.07, now, 0.03); break;
      case 'roulette-success':
        [659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(ctx, f, 'sine', 0.22, now + i * 0.10, 0.18));
        setTimeout(() => {
          const t = ctx.currentTime;
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            this.tone(ctx, f, 'sine', 0.18, t + i * 0.06, 0.25));
        }, 350); break;
      case 'roulette-fail':
        [440, 369.99, 311.13, 261.63].forEach((f, i) =>
          this.tone(ctx, f, 'triangle', 0.15, now + i * 0.12, 0.22)); break;
    }
  }

  private tone(ctx: AudioContext, freq: number, type: OscillatorType, vol: number, start: number, dur: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain); gain.connect(this.seGain);
    osc.start(start); osc.stop(start + dur + 0.05);
  }
}

export const audioManager = new AudioManager();
