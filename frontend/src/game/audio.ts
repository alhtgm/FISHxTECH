// ========================================
// サウンドシステム（Web Audio API）
// BGM: 和風ペンタトニック + 海の環境音
// SE: クリック・イベント・利益・損失・コイン・レベルアップ
// ========================================

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private bgmGain!: GainNode;
  private seGain!: GainNode;
  private bgmActive = false;
  private bgmTimeout: number | null = null;
  private oceanSource: AudioBufferSourceNode | null = null;
  private _muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.65;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.22;
      this.bgmGain.connect(this.masterGain);

      this.seGain = this.ctx.createGain();
      this.seGain.gain.value = 0.55;
      this.seGain.connect(this.masterGain);
    }
    return this.ctx;
  }

  resume() {
    this.getCtx().resume();
  }

  // ----------------------------------------
  // BGM
  // ----------------------------------------
  startBGM() {
    if (this.bgmActive) return;
    this.bgmActive = true;
    this.playOceanAmbience();
    this.scheduleMelody(0);
  }

  stopBGM() {
    this.bgmActive = false;
    if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
    try { this.oceanSource?.stop(); } catch { /* ignore */ }
    this.oceanSource = null;
  }

  get muted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    const vol = this._muted ? 0 : 0.65;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.getCtx().currentTime, 0.1);
    }
    return this._muted;
  }

  // 海の環境音（フィルタリングしたホワイトノイズ）
  private playOceanAmbience() {
    const ctx = this.getCtx();
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * 4, sr);
    const data = buf.getChannelData(0);
    // Pink noise approximation
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < buf.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) / 3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 280;

    // ゆっくりした波のLFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);

    const ambGain = ctx.createGain();
    ambGain.gain.value = 0.09;

    source.connect(lpf);
    lpf.connect(ambGain);
    ambGain.connect(this.bgmGain);
    source.start();
    lfo.start();
    this.oceanSource = source;
  }

  // 和風ペンタトニックメロディ (A minor pentatonic: A C D E G)
  // 音符: [周波数, 拍数, 音量]
  private readonly MELODY_PHRASES: [number, number, number][][] = [
    // フレーズ1: 静かな導入
    [
      [220.00, 2, 0.30], [261.63, 1, 0.22], [293.66, 1, 0.22],
      [329.63, 2, 0.28], [261.63, 1, 0.18], [220.00, 3, 0.25],
    ],
    // フレーズ2: 少し盛り上がる
    [
      [293.66, 1, 0.25], [329.63, 1, 0.25], [392.00, 2, 0.30],
      [329.63, 1, 0.22], [293.66, 1, 0.22], [261.63, 2, 0.28],
      [220.00, 4, 0.30],
    ],
    // フレーズ3: 高音部
    [
      [440.00, 1, 0.22], [392.00, 1, 0.20], [329.63, 2, 0.25],
      [293.66, 1, 0.20], [261.63, 1, 0.20], [220.00, 4, 0.28],
    ],
    // フレーズ4: 終止
    [
      [261.63, 1, 0.22], [293.66, 2, 0.25], [261.63, 1, 0.20],
      [220.00, 1, 0.28], [196.00, 1, 0.22], [220.00, 6, 0.30],
    ],
  ];

  private phraseIndex = 0;

  private scheduleMelody(phraseOffset: number) {
    if (!this.bgmActive) return;
    const ctx = this.getCtx();
    const BPM = 72;
    const beat = 60 / BPM;
    const phrase = this.MELODY_PHRASES[this.phraseIndex % this.MELODY_PHRASES.length];
    this.phraseIndex++;

    let time = ctx.currentTime + phraseOffset;
    let totalBeats = 0;

    for (const [freq, beats, vol] of phrase) {
      // メロディ（sine）
      this.scheduleNote(freq, 'sine', vol, time, beats * beat * 0.9);
      // ベース（オクターブ下、triangle、低音量）
      if (Math.random() < 0.35) {
        this.scheduleNote(freq / 2, 'triangle', vol * 0.28, time, beats * beat * 0.7);
      }
      time += beats * beat;
      totalBeats += beats;
    }

    const totalMs = totalBeats * beat * 1000;
    this.bgmTimeout = window.setTimeout(
      () => this.scheduleMelody(0.1),
      totalMs - 200
    );
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
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  // ----------------------------------------
  // SE
  // ----------------------------------------
  playSE(type: 'click' | 'select' | 'event' | 'profit' | 'loss' | 'coin' | 'levelup' | 'monthstart' | 'decision') {
    if (this._muted) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        this.tone(ctx, 620, 'sine', 0.13, now, 0.06);
        break;
      case 'select':
        this.tone(ctx, 880, 'sine', 0.10, now, 0.05);
        break;
      case 'decision':
        this.tone(ctx, 523.25, 'sine', 0.18, now, 0.08);
        this.tone(ctx, 659.25, 'sine', 0.15, now + 0.06, 0.10);
        break;
      case 'event':
        // 緊張感のある和音
        this.tone(ctx, 369.99, 'square', 0.08, now, 0.08);
        this.tone(ctx, 493.88, 'square', 0.08, now, 0.08);
        this.tone(ctx, 740.00, 'sine', 0.12, now + 0.08, 0.20);
        break;
      case 'profit':
        // 上昇スケール（嬉しい）
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(ctx, f, 'sine', 0.18, now + i * 0.09, 0.14);
        });
        break;
      case 'loss':
        // 下降（がっかり）
        [440, 369.99, 293.66].forEach((f, i) => {
          this.tone(ctx, f, 'triangle', 0.13, now + i * 0.13, 0.18);
        });
        break;
      case 'coin':
        this.tone(ctx, 1318.51, 'sine', 0.22, now, 0.04);
        this.tone(ctx, 1567.98, 'sine', 0.18, now + 0.04, 0.10);
        break;
      case 'levelup':
        [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(ctx, f, 'sine', 0.22, now + i * 0.07, 0.18);
        });
        // ファンファーレ和音
        setTimeout(() => {
          const t = ctx.currentTime;
          [523.25, 659.25, 783.99].forEach(f => this.tone(ctx, f, 'sine', 0.20, t, 0.4));
        }, 400);
        break;
      case 'monthstart':
        this.tone(ctx, 523.25, 'sine', 0.16, now, 0.18);
        this.tone(ctx, 659.25, 'sine', 0.12, now + 0.18, 0.15);
        this.tone(ctx, 783.99, 'sine', 0.10, now + 0.32, 0.20);
        break;
    }
  }

  private tone(ctx: AudioContext, freq: number, type: OscillatorType, vol: number, start: number, dur: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(this.seGain);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }
}

export const audioManager = new AudioManager();
