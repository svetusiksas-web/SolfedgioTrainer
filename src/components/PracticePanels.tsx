import { Gauge, Music2, Repeat2, SlidersHorizontal, Volume2 } from 'lucide-react';
import { Toggle } from './Controls';
import type { VoiceFlags, VoiceMode, VoiceVolumes } from '../music/types';

const voiceNames = ['Голос 1', 'Голос 2', 'Голос 3', 'Голос 4'];
const modeNames = ['Одноголосие', 'Двухголосие', 'Трёхголосие', 'Четырёхголосие'];

export function VoicePractice({ mode, voices, volumes, available, onMode, onVoices, onVolumes }: { mode:VoiceMode; voices:VoiceFlags; volumes:VoiceVolumes; available:VoiceFlags; onMode:(value:VoiceMode)=>void; onVoices:(value:VoiceFlags)=>void; onVolumes:(value:VoiceVolumes)=>void }) {
  return <section className="card practice-card">
    <div className="card-heading"><Music2 /><div><h2>Режим: {modeNames[mode-1]}</h2><p>Голоса пронумерованы сверху вниз по партитуре</p></div></div>
    <div className="mode-selector" aria-label="Режим тренажёра">{([1,2,3,4] as VoiceMode[]).map(value=><button type="button" aria-label={modeNames[value-1]} title={modeNames[value-1]} className={mode===value?'active':''} onClick={()=>onMode(value)} key={value}>{value}</button>)}</div>
    <div className="voice-grid">{[0,1,2,3].slice(0,mode).map(index=><div className={'voice-strip voice-'+(index+1)+(!available[index]?' unavailable':'')} key={index}>
      <Toggle checked={voices[index]} onChange={checked=>{const next=[...voices] as VoiceFlags;next[index]=checked;onVoices(next)}} label={voiceNames[index]} />
      <label className="volume"><Volume2 size={17}/><input aria-label={'Громкость: '+voiceNames[index]} type="range" min="0" max="100" value={volumes[index]} onChange={event=>{const next=[...volumes] as VoiceVolumes;next[index]=+event.target.value;onVolumes(next)}}/><b>{volumes[index]}%</b></label>
    </div>)}</div>
  </section>;
}

export function SilentMeasures({ measureCount, muted, onChange }: { measureCount:number; muted:number[]; onChange:(value:number[])=>void }) {
  return <section className="card silent-measures"><div className="card-heading compact"><Music2/><div><h2>Отключить звук в отдельных тактах</h2><p>{measureCount?'Работает во всех режимах. Нажмите номера тихих тактов':'Сначала загрузите MusicXML — здесь появятся кнопки всех тактов'}</p></div></div>{measureCount>0&&<><div className="measure-buttons">{Array.from({length:measureCount},(_,i)=>i+1).map(number=><button type="button" key={number} className={muted.includes(number)?'muted':''} aria-label={`Такт ${number}: ${muted.includes(number)?'включить звук':'отключить звук'}`} aria-pressed={muted.includes(number)} onClick={()=>onChange(muted.includes(number)?muted.filter(n=>n!==number):[...muted,number].sort((a,b)=>a-b))}>{number}</button>)}</div><p className="measure-hint">Зачёркнутые красные номера — звук отключён.</p></>}</section>;
}

export function TempoPanel({ bpm, originalBpm, onChange }: { bpm:number; originalBpm:number; onChange:(value:number)=>void }) {
  const change=(value:number)=>onChange(Math.min(180,Math.max(40,Math.round(value))));
  return <section className="card"><div className="card-heading compact"><Gauge/><div><h2>Темп</h2><p>Исходный темп — {originalBpm} BPM</p></div><strong className="bpm">♩ = {bpm} <small>BPM</small></strong></div><input className="tempo-slider" aria-label="Темп" type="range" min="40" max="180" value={bpm} onChange={e=>change(+e.target.value)}/><div className="tempo-actions"><div>{[-10,-5,5,10].map(v=><button key={v} onClick={()=>change(bpm+v)}>{v>0?'+'+v:v}</button>)}</div><div>{[50,75,100,125].map(p=><button key={p} className={bpm===Math.round(originalBpm*p/100)?'active':''} onClick={()=>change(originalBpm*p/100)}>{p}%</button>)}</div></div></section>;
}

type SettingsProps={metronome:boolean;countIn:number;repeat:boolean;loop:{enabled:boolean;start:number;end:number};measureCount:number;onMetronome:(v:boolean)=>void;onCountIn:(v:number)=>void;onRepeat:(v:boolean)=>void;onLoop:(v:{enabled:boolean;start:number;end:number})=>void};
export function SettingsPanel(p:SettingsProps){const {metronome,countIn,repeat,loop,measureCount}=p;return <section className="card settings-card"><div className="card-heading"><SlidersHorizontal/><div><h2>Настройки занятия</h2><p>Отсчёт, метроном и работа над фрагментом</p></div></div><div className="settings-grid"><div className="setting-group"><Toggle checked={metronome} onChange={p.onMetronome} label="Метроном"/><Toggle checked={repeat} onChange={p.onRepeat} label="Повтор всего произведения"/></div><div className="setting-group"><label className="field-label">Отсчёт перед началом<select value={countIn} onChange={e=>p.onCountIn(+e.target.value)}><option value="0">Нет</option><option value="1">1 такт</option><option value="2">2 такта</option></select></label></div></div><div className="loop-box"><div className="loop-title"><Repeat2 size={18}/><b>Повтор фрагмента</b></div><div className="loop-fields"><label>Начальный такт<input type="number" min="1" max={measureCount} value={loop.start} onChange={e=>p.onLoop({...loop,start:Math.max(1,Math.min(measureCount,+e.target.value))})}/></label><label>Конечный такт<input type="number" min="1" max={measureCount} value={loop.end} onChange={e=>p.onLoop({...loop,end:Math.max(1,Math.min(measureCount,+e.target.value))})}/></label><button className={loop.enabled?'active':''} onClick={()=>p.onLoop({...loop,enabled:!loop.enabled})}>{loop.enabled?`Повторяются такты ${loop.start}–${loop.end}`:`Повторять такты ${loop.start}–${loop.end}`}</button></div></div></section>}
