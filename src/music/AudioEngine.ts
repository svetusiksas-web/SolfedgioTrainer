import * as Tone from 'tone';
import { PPQ, type PlaybackStatus, type ScoreData } from './types';

export interface EngineOptions {
  bpm: number;
  enabled: [boolean, boolean];
  volumes: [number, number];
  metronome: boolean;
  countInMeasures: number;
  loopWhole: boolean;
  loopRange: { enabled: boolean; start: number; end: number };
}

type PianoChannel = {
  sampler: Tone.Sampler;
  fallback: Tone.PolySynth;
  gain: Tone.Gain;
};

const pianoUrls = {
  A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
  A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
  A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
  A6: 'A6.mp3', C7: 'C7.mp3',
};

export class AudioEngine {
  private channels: PianoChannel[];
  private click: Tone.MembraneSynth;
  private timer: number | null = null;
  private status: PlaybackStatus = 'stopped';
  private score: ScoreData | null = null;
  private options: EngineOptions | null = null;
  private offset = 0;
  private base = 0;
  private onMeasure: (n: number | null) => void = () => {};
  private onStatus: (s: PlaybackStatus) => void = () => {};

  constructor() {
    this.channels = [0, 1].map(() => {
      const gain = new Tone.Gain(0.82).toDestination();
      const sampler = new Tone.Sampler({
        urls: pianoUrls,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
        release: 1.25,
      }).connect(gain);
      const fallback = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1.6,
        modulationIndex: 1.8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.75, sustain: 0.12, release: 1.15 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.05, release: 0.6 },
        volume: -9,
      }).connect(gain);
      return { sampler, fallback, gain };
    });
    this.click = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
    }).toDestination();
    this.click.volume.value = 4;
    Tone.getTransport().PPQ = PPQ;
  }

  configure(score: ScoreData, options: EngineOptions, onMeasure: (n: number | null) => void, onStatus: (s: PlaybackStatus) => void) {
    this.score = score;
    this.options = options;
    this.onMeasure = onMeasure;
    this.onStatus = onStatus;
    this.setTempo(options.bpm);
    this.setMix(options.enabled, options.volumes);
  }

  setTempo(bpm: number) {
    Tone.getTransport().bpm.rampTo(bpm, 0.08);
    if (this.options) this.options.bpm = bpm;
  }

  setMix(enabled: [boolean, boolean], volumes: [number, number]) {
    enabled.forEach((on, i) => this.channels[i].gain.gain.rampTo(on ? volumes[i] / 100 : 0, 0.03));
    if (this.options) {
      this.options.enabled = enabled;
      this.options.volumes = volumes;
    }
  }

  async play() {
    if (!this.score || !this.options) return;
    await Tone.start();
    const transport = Tone.getTransport();
    if (this.status === 'paused') {
      transport.start();
      this.setStatus('playing');
      this.startCursor();
      return;
    }
    await Promise.race([Tone.loaded(), new Promise<void>(resolve => window.setTimeout(resolve, 3500))]);
    this.clear();
    this.build();
    transport.position = 0;
    transport.start('+0.05');
    this.setStatus(this.offset > 0 ? 'counting' : 'playing');
    this.startCursor();
  }

  pause() {
    if (this.status === 'playing' || this.status === 'counting') {
      Tone.getTransport().pause();
      this.setStatus('paused');
      this.stopCursor();
    }
  }

  stop() {
    Tone.getTransport().stop();
    this.clear();
    this.onMeasure(null);
    this.setStatus('stopped');
  }

  private playNote(voiceId: number, pitch: string, duration: number, time: number, velocity: number) {
    const channel = this.channels[voiceId];
    if (!channel) return;
    const instrument = channel.sampler.loaded ? channel.sampler : channel.fallback;
    instrument.triggerAttackRelease(pitch, Math.max(0.04, duration * 0.92), time, velocity);
  }

  private build() {
    const score = this.score!;
    const options = this.options!;
    const transport = Tone.getTransport();
    const first = options.loopRange.enabled ? options.loopRange.start : score.measures[0]?.number ?? 1;
    const last = options.loopRange.enabled ? options.loopRange.end : score.measures.at(-1)?.number ?? 1;
    const startMeasure = score.measures.find(m => m.number === first) ?? score.measures[0];
    const endMeasure = score.measures.find(m => m.number === last) ?? score.measures.at(-1)!;
    this.base = startMeasure?.startTick ?? 0;
    this.offset = options.countInMeasures * score.beats * PPQ * (4 / score.beatType);
    const selectionEnd = endMeasure.startTick + endMeasure.durationTicks;
    const total = selectionEnd - this.base + this.offset;

    score.events
      .filter(event => event.startTick >= this.base && event.startTick < selectionEnd)
      .forEach(event => transport.schedule(time => {
        const duration = Tone.Ticks(event.durationTicks).toSeconds();
        this.playNote(event.voiceId, event.pitch, duration, time, event.velocity);
      }, String(event.startTick - this.base + this.offset) + 'i'));

    const beatTicks = PPQ * (4 / score.beatType);
    if (options.metronome || options.countInMeasures > 0) {
      for (let tick = 0; tick < total; tick += beatTicks) {
        if (tick >= this.offset && !options.metronome) continue;
        transport.schedule(time => this.click.triggerAttackRelease('C2', '32n', time, 0.82), String(tick) + 'i');
      }
    }
    if (this.offset > 0) transport.schedule(() => this.setStatus('playing'), String(this.offset) + 'i');
    if (options.loopWhole || options.loopRange.enabled) {
      transport.loop = true;
      transport.loopStart = 0;
      transport.loopEnd = String(total) + 'i';
    } else {
      transport.loop = false;
      transport.schedule(() => this.stop(), String(total) + 'i');
    }
  }

  private startCursor() {
    this.stopCursor();
    this.timer = window.setInterval(() => {
      if (!this.score) return;
      const tick = Number(Tone.getTransport().ticks) - this.offset + this.base;
      if (tick < this.base) {
        this.onMeasure(null);
        return;
      }
      const measure = this.score.measures.find(m => tick >= m.startTick && tick < m.startTick + m.durationTicks);
      this.onMeasure(measure?.number ?? null);
    }, 70);
  }

  private stopCursor() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private clear() {
    this.stopCursor();
    const transport = Tone.getTransport();
    transport.cancel();
    transport.loop = false;
    this.channels.forEach(channel => {
      channel.sampler.releaseAll();
      channel.fallback.releaseAll();
    });
  }

  private setStatus(status: PlaybackStatus) {
    this.status = status;
    this.onStatus(status);
  }

  dispose() {
    this.stop();
    this.channels.forEach(channel => {
      channel.sampler.dispose();
      channel.fallback.dispose();
      channel.gain.dispose();
    });
    this.click.dispose();
  }
}
