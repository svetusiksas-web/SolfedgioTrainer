import { Gauge, Music2, Repeat2, SlidersHorizontal, Volume2 } from 'lucide-react';
import { Toggle } from './Controls';

type Pair = [boolean, boolean];
type Volumes = [number, number];

export function VoicePractice({ voices, volumes, onVoices, onVolumes }: {
  voices: Pair;
  volumes: Volumes;
  onVoices: (value: Pair) => void;
  onVolumes: (value: Volumes) => void;
}) {
  return <section className="card practice-card">
    <div className="card-heading"><Music2 /><div><h2>Голоса</h2><p>Слушайте оба голоса вместе или каждый отдельно</p></div></div>
    <div className="voice-grid">
      {[0, 1].map(index => <div className={'voice-strip voice-' + (index + 1)} key={index}>
        <Toggle
          checked={voices[index]}
          onChange={checked => onVoices(index === 0 ? [checked, voices[1]] : [voices[0], checked])}
          label={'Голос ' + (index + 1)}
        />
        <label className="volume">
          <Volume2 size={17} />
          <input
            aria-label={'Громкость голоса ' + (index + 1)}
            type="range"
            min="0"
            max="100"
            value={volumes[index]}
            onChange={event => onVolumes(index === 0 ? [+event.target.value, volumes[1]] : [volumes[0], +event.target.value])}
          />
          <b>{volumes[index]}%</b>
        </label>
      </div>)}
    </div>
  </section>;
}

export function TempoPanel({ bpm, originalBpm, onChange }: { bpm: number; originalBpm: number; onChange: (value: number) => void }) {
  const change = (value: number) => onChange(Math.min(180, Math.max(40, Math.round(value))));
  return <section className="card">
    <div className="card-heading compact"><Gauge /><div><h2>Темп</h2><p>Исходный темп — {originalBpm} BPM</p></div><strong className="bpm">♩ = {bpm} <small>BPM</small></strong></div>
    <input className="tempo-slider" aria-label="Темп" type="range" min="40" max="180" value={bpm} onChange={event => change(+event.target.value)} />
    <div className="tempo-actions">
      <div>{[-10, -5, 5, 10].map(value => <button key={value} onClick={() => change(bpm + value)}>{value > 0 ? '+' + value : value}</button>)}</div>
      <div>{[50, 75, 100, 125].map(percent => <button key={percent} className={bpm === Math.round(originalBpm * percent / 100) ? 'active' : ''} onClick={() => change(originalBpm * percent / 100)}>{percent}%</button>)}</div>
    </div>
  </section>;
}

type SettingsProps = {
  metronome: boolean;
  countIn: number;
  repeat: boolean;
  loop: { enabled: boolean; start: number; end: number };
  measureCount: number;
  onMetronome: (value: boolean) => void;
  onCountIn: (value: number) => void;
  onRepeat: (value: boolean) => void;
  onLoop: (value: { enabled: boolean; start: number; end: number }) => void;
};

export function SettingsPanel(props: SettingsProps) {
  const { metronome, countIn, repeat, loop, measureCount } = props;
  return <section className="card settings-card">
    <div className="card-heading"><SlidersHorizontal /><div><h2>Настройки занятия</h2><p>Отсчёт, метроном и работа над фрагментом</p></div></div>
    <div className="settings-grid">
      <div className="setting-group"><Toggle checked={metronome} onChange={props.onMetronome} label="Метроном" /><Toggle checked={repeat} onChange={props.onRepeat} label="Повтор всего произведения" /></div>
      <div className="setting-group"><label className="field-label">Отсчёт перед началом<select value={countIn} onChange={event => props.onCountIn(+event.target.value)}><option value="0">Нет</option><option value="1">1 такт</option><option value="2">2 такта</option></select></label></div>
    </div>
    <div className="loop-box">
      <div className="loop-title"><Repeat2 size={18} /><b>Повтор фрагмента</b></div>
      <div className="loop-fields">
        <label>Начальный такт<input type="number" min="1" max={measureCount} value={loop.start} onChange={event => props.onLoop({ ...loop, start: Math.max(1, Math.min(measureCount, +event.target.value)) })} /></label>
        <label>Конечный такт<input type="number" min="1" max={measureCount} value={loop.end} onChange={event => props.onLoop({ ...loop, end: Math.max(1, Math.min(measureCount, +event.target.value)) })} /></label>
        <button className={loop.enabled ? 'active' : ''} onClick={() => props.onLoop({ ...loop, enabled: !loop.enabled })}>{loop.enabled ? 'Повторяются такты ' + loop.start + '–' + loop.end : 'Повторять такты ' + loop.start + '–' + loop.end}</button>
      </div>
    </div>
  </section>;
}
