import { BgmTrackId } from '../types/game';

interface BgmTrackDefinition {
  intervalMs: number;
  melody: number[];
  leadType: OscillatorType;
  leadGain: number;
  leadDuration: number;
  bassType: OscillatorType;
  bassGain: number;
  shimmerRatio?: number;
  shimmerGain?: number;
}

const BGM_PATTERNS: Record<BgmTrackId, BgmTrackDefinition> = {
  meadow: {
    intervalMs: 1750,
    melody: [261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66],
    leadType: 'sine',
    leadGain: 0.028,
    leadDuration: 1.4,
    bassType: 'triangle',
    bassGain: 0.018,
  },
  brook: {
    intervalMs: 1150,
    melody: [293.66, 349.23, 440.0, 523.25, 659.25, 523.25, 440.0, 392.0],
    leadType: 'sine',
    leadGain: 0.025,
    leadDuration: 1.05,
    bassType: 'sine',
    bassGain: 0.016,
    shimmerRatio: 2,
    shimmerGain: 0.008,
  },
  starlight: {
    intervalMs: 2150,
    melody: [220.0, 329.63, 440.0, 493.88, 659.25, 587.33, 493.88, 392.0],
    leadType: 'triangle',
    leadGain: 0.022,
    leadDuration: 1.95,
    bassType: 'sine',
    bassGain: 0.02,
    shimmerRatio: 1.498,
    shimmerGain: 0.011,
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = false;
  private volume = 0.75;
  private bgmTrack: BgmTrackId = 'meadow';
  private musicActive = false;
  private musicTimer: number | null = null;
  private transitionTimer: number | null = null;
  private musicStep = 0;

  private applyMasterGain() {
    if (!this.ctx || !this.masterGain) return;
    const targetGain = this.muted ? 0 : this.volume;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.015);
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMasterGain();
    if (muted) {
      this.stopMusic();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyMasterGain();
    if (this.volume <= 0.005) {
      this.stopMusic();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getBgmTrack(): BgmTrackId {
    return this.bgmTrack;
  }

  public setBgmTrack(track: BgmTrackId, preview = false) {
    const changed = this.bgmTrack !== track;
    this.bgmTrack = track;

    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (!changed && !preview) {
      return;
    }

    this.clearMusicInterval();
    this.musicStep = 0;

    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06);
    }

    if (this.muted || this.volume <= 0.005) {
      return;
    }

    this.transitionTimer = window.setTimeout(() => {
      this.transitionTimer = null;
      const audio = this.ensureContext();
      if (audio && this.musicGain) {
        this.musicGain.gain.setTargetAtTime(1, audio.ctx.currentTime, 0.09);
      }

      if (this.musicActive) {
        this.playMusicStep();
        this.scheduleMusicInterval();
      } else if (preview) {
        this.playTrackPreviewPhrase(track);
      }
    }, 140);
  }

  public unlock() {
    if (this.muted || this.volume <= 0.005) return;
    try {
      const audio = this.ensureContext();
      if (audio && audio.ctx.state === 'suspended') {
        void audio.ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore mobile WebAudio unlock restrictions
    }
  }

  private ensureContext(): {
    ctx: AudioContext;
    sfxDestination: AudioNode;
    musicDestination: AudioNode;
  } | null {
    if (this.muted || this.volume <= 0.005) return null;
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(1, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      this.applyMasterGain();
      return {
        ctx: this.ctx,
        sfxDestination: this.masterGain ?? this.ctx.destination,
        musicDestination: this.musicGain ?? this.masterGain ?? this.ctx.destination,
      };
    } catch {
      return null;
    }
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.14,
    delay = 0,
    slideTo?: number,
    bus: 'sfx' | 'music' = 'sfx'
  ) {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, sfxDestination, musicDestination } = audio;
    const destination = bus === 'music' ? musicDestination : sfxDestination;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playMusicStep() {
    if (this.muted || this.volume <= 0.005 || !this.ctx || this.ctx.state !== 'running') {
      return;
    }
    const pattern = BGM_PATTERNS[this.bgmTrack];
    const note = pattern.melody[this.musicStep % pattern.melody.length];
    const stepIndex = this.musicStep;
    this.musicStep += 1;

    this.tone(note, pattern.leadDuration, pattern.leadType, pattern.leadGain, 0, undefined, 'music');

    if (stepIndex % 2 === 0) {
      this.tone(
        note * 0.5,
        pattern.leadDuration * 1.25,
        pattern.bassType,
        pattern.bassGain,
        0.08,
        undefined,
        'music'
      );
    }

    if (pattern.shimmerRatio && pattern.shimmerGain) {
      this.tone(
        note * pattern.shimmerRatio,
        pattern.leadDuration * 0.75,
        'sine',
        pattern.shimmerGain,
        0.16,
        undefined,
        'music'
      );
    }
  }

  private playTrackPreviewPhrase(track: BgmTrackId) {
    if (this.muted || this.volume <= 0.005) return;
    const pattern = BGM_PATTERNS[track];
    const n1 = pattern.melody[0];
    const n2 = pattern.melody[2];
    this.tone(n1, 0.7, pattern.leadType, pattern.leadGain * 1.2, 0, undefined, 'music');
    this.tone(n1 * 0.5, 0.9, pattern.bassType, pattern.bassGain * 1.1, 0.04, undefined, 'music');
    this.tone(n2, 0.85, pattern.leadType, pattern.leadGain * 1.1, 0.24, undefined, 'music');
    if (pattern.shimmerRatio && pattern.shimmerGain) {
      this.tone(
        n2 * pattern.shimmerRatio,
        0.75,
        'sine',
        pattern.shimmerGain * 1.3,
        0.32,
        undefined,
        'music'
      );
    }
  }

  private clearMusicInterval() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusicInterval() {
    this.clearMusicInterval();
    const pattern = BGM_PATTERNS[this.bgmTrack];
    this.musicTimer = window.setInterval(() => {
      this.playMusicStep();
    }, pattern.intervalMs);
  }

  public startMusic() {
    if (typeof window === 'undefined') return;
    this.musicActive = true;
    if (this.transitionTimer !== null || this.musicTimer !== null) return;
    const audio = this.ensureContext();
    if (audio && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(1, audio.ctx.currentTime, 0.1);
    }
    this.scheduleMusicInterval();
  }

  public stopMusic() {
    this.musicActive = false;
    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.clearMusicInterval();
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
  }

  public playPickup() {
    this.tone(360, 0.07, 'triangle', 0.09, 0, 480);
  }

  public playDrop() {
    this.tone(240, 0.08, 'sine', 0.08, 0, 180);
  }

  public playSpawn() {
    this.tone(330, 0.09, 'triangle', 0.1, 0, 520);
    this.tone(587, 0.11, 'sine', 0.08, 0.04);
  }

  public playMerge(resultLevel: number) {
    const pentatonic = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0, 1046.5];
    const idx = Math.min(pentatonic.length - 1, Math.max(0, (resultLevel - 2) % pentatonic.length));
    const base = pentatonic[idx];
    this.tone(base, 0.16, 'triangle', 0.14, 0);
    this.tone(base * 1.25, 0.18, 'sine', 0.11, 0.045);
    if (resultLevel >= 6) {
      this.tone(base * 1.5, 0.22, 'sine', 0.09, 0.09);
    }
  }

  public playCoin() {
    this.tone(987.8, 0.07, 'sine', 0.09, 0);
    this.tone(1318.5, 0.14, 'sine', 0.1, 0.055);
  }

  public playDiscovery() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, 0.22, 'triangle', 0.12, i * 0.07);
    });
  }

  public playUnlock() {
    const notes = [392.0, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((n, i) => {
      this.tone(n, 0.24, 'triangle', 0.13, i * 0.065);
    });
  }

  public playMissionClaim() {
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((n, i) => {
      this.tone(n, 0.2, 'sine', 0.12, i * 0.06);
    });
  }

  public playError() {
    this.tone(190, 0.11, 'sawtooth', 0.06, 0, 140);
  }
}

export const soundEngine = new SoundEngine();
