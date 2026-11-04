/**
 * ChainPlay - Web Audio API Pure Synthesizer
 *
 * Zero external .mp3 or audio asset dependencies.
 * All sound effects are generated using native Web Audio API oscillators,
 * white noise buffers, biquad filters, and custom envelope shaping.
 *
 * Safe SSR guards with automatic AudioContext unlock on first user gesture.
 */

// Global audio configuration state
let soundEnabled: boolean = true;
let masterVolume: number = 0.5; // 0.0 to 1.0
let audioContext: AudioContext | null = null;
let unlockListenerAttached: boolean = false;

/**
 * Lazily obtains or initializes the Web Audio API AudioContext singleton.
 * Safely guards against server-side rendering (Node.js).
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  // Handle suspended AudioContext due to browser autoplay policies
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {
      // AudioContext will resume on the next explicit user gesture
    });
  }

  // Attach a one-time gesture listener to unlock AudioContext if needed
  if (!unlockListenerAttached && typeof window !== "undefined") {
    unlockListenerAttached = true;
    const unlockAudio = () => {
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio, { passive: true });
  }

  return audioContext;
}

/**
 * Creates an AudioBuffer containing white noise for percussive / splash / explosion sounds.
 */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    channelData[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ==========================================
// Volume and Setting Controls
// ==========================================

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setMasterVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol));
}

export function getMasterVolume(): number {
  return masterVolume;
}

// ==========================================
// Synthesized Sound Effects
// ==========================================

/**
 * Crisp mechanical click for grid tiles, buttons, and XO placements.
 */
export function playTileClick(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(850, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.035);

  const vol = 0.25 * masterVolume;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.036);
}

/**
 * Smooth card flip whoosh for Memory Duel.
 */
export function playCardFlip(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(620, now + 0.06);
  osc.frequency.exponentialRampToValueAtTime(360, now + 0.12);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, now);

  const vol = 0.22 * masterVolume;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}

/**
 * Harmonious dual-tone chime when a memory pair is matched.
 */
export function playMatchChime(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freqs = [1046.5, 1318.51]; // C6 and E6 harmonious chord

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.03);

    const vol = 0.18 * masterVolume;
    gain.gain.setValueAtTime(vol, now + idx * 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.03);
    osc.stop(now + 0.46);
  });
}

/**
 * Frequency ramp whoosh sound for launching a Battleship torpedo.
 */
export function playTorpedo(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(540, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(160, now + 0.35);
  filter.Q.setValueAtTime(3.5, now);

  const vol = 0.28 * masterVolume;
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.36);
}

/**
 * Low-frequency thud combined with filtered noise burst for a direct ship hit.
 */
export function playExplosion(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Sub-bass punch oscillator
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(140, now);
  subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.35);

  const subVol = 0.45 * masterVolume;
  subGain.gain.setValueAtTime(subVol, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

  subOsc.connect(subGain);
  subGain.connect(ctx.destination);
  subOsc.start(now);
  subOsc.stop(now + 0.39);

  // 2. Filtered white noise blast
  const duration = 0.5;
  const noiseBuffer = createNoiseBuffer(ctx, duration);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(950, now);
  filter.frequency.exponentialRampToValueAtTime(75, now + duration);

  const noiseGain = ctx.createGain();
  const noiseVol = 0.35 * masterVolume;
  noiseGain.gain.setValueAtTime(noiseVol, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noiseSource.start(now);
  noiseSource.stop(now + duration + 0.01);
}

/**
 * Filtered watery splash when a Battleship shot misses.
 */
export function playSplash(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.32;

  // Noise filtered through bandpass
  const noiseBuffer = createNoiseBuffer(ctx, duration);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(380, now + duration);
  filter.Q.setValueAtTime(3.8, now);

  const gain = ctx.createGain();
  const vol = 0.28 * masterVolume;
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noiseSource.start(now);
  noiseSource.stop(now + duration + 0.01);

  // Subtle bubble pop tone
  const bubble = ctx.createOscillator();
  const bubbleGain = ctx.createGain();
  bubble.type = "sine";
  bubble.frequency.setValueAtTime(380, now + 0.04);
  bubble.frequency.exponentialRampToValueAtTime(680, now + 0.12);

  const bVol = 0.15 * masterVolume;
  bubbleGain.gain.setValueAtTime(bVol, now + 0.04);
  bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  bubble.connect(bubbleGain);
  bubbleGain.connect(ctx.destination);
  bubble.start(now + 0.04);
  bubble.stop(now + 0.15);
}

/**
 * Upbeat triumphant fanfare arpeggio upon match victory.
 */
export function playVictory(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // C5, E5, G5, C6 triumphant arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const step = 0.08;

  notes.forEach((freq, idx) => {
    const startTime = now + idx * step;
    const isLast = idx === notes.length - 1;
    const noteDuration = isLast ? 0.45 : 0.12;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, startTime);

    const vol = 0.25 * masterVolume;
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + noteDuration + 0.01);
  });
}

/**
 * Melancholic descending tone on match defeat.
 */
export function playDefeat(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Eb4, D4, C4, A3
  const notes = [311.13, 293.66, 261.63, 220.0];
  const step = 0.13;

  notes.forEach((freq, idx) => {
    const startTime = now + idx * step;
    const isLast = idx === notes.length - 1;
    const duration = isLast ? 0.4 : 0.16;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    const vol = 0.22 * masterVolume;
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  });
}

/**
 * Low double buzz warning for illegal move or error state.
 */
export function playError(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const pulses = [
    { start: now, duration: 0.07 },
    { start: now + 0.11, duration: 0.09 },
  ];

  pulses.forEach((pulse) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(135, pulse.start);

    const vol = 0.25 * masterVolume;
    gain.gain.setValueAtTime(vol, pulse.start);
    gain.gain.exponentialRampToValueAtTime(0.001, pulse.start + pulse.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(pulse.start);
    osc.stop(pulse.start + pulse.duration + 0.01);
  });
}

/**
 * Exported unified sound effects controller.
 */
export const soundEffects = {
  playTileClick,
  playCardFlip,
  playMatchChime,
  playTorpedo,
  playExplosion,
  playSplash,
  playVictory,
  playDefeat,
  playError,
  setSoundEnabled,
  isSoundEnabled,
  setMasterVolume,
  getMasterVolume,
};

export default soundEffects;
