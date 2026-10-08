import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CircleAlert, FileMusic, GraduationCap } from 'lucide-react';
import { ScoreUploader } from './components/ScoreUploader';
import { ScoreViewer } from './components/ScoreViewer';
import { PlaybackControls } from './components/Controls';
import { SettingsPanel, TempoPanel, VoicePractice } from './components/PracticePanels';
import { AudioEngine, type EngineOptions } from './music/AudioEngine';
import { parseMusicXML } from './music/MusicXMLParser';
import type { PlaybackStatus, ScoreData } from './music/types';

export default function App() {
  const engine = useRef<AudioEngine | null>(null);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  const [currentMeasure, setCurrentMeasure] = useState<number | null>(null);
  const [bpm, setBpm] = useState(80);
  const [voices, setVoices] = useState<[boolean, boolean]>([true, true]);
  const [volumes, setVolumes] = useState<[number, number]>([82, 82]);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [loop, setLoop] = useState({ enabled: false, start: 1, end: 4 });

  useEffect(() => {
    engine.current = new AudioEngine();
    return () => engine.current?.dispose();
  }, []);

  const options: EngineOptions | null = useMemo(() => score ? {
    bpm,
    enabled: voices,
    volumes,
    metronome,
    countInMeasures: countIn,
    loopWhole: repeat,
    loopRange: loop,
  } : null, [score, bpm, voices, volumes, metronome, countIn, repeat, loop]);

  useEffect(() => {
    if (score && options) engine.current?.configure(score, options, setCurrentMeasure, setStatus);
  }, [score, options]);
  useEffect(() => engine.current?.setTempo(bpm), [bpm]);
  useEffect(() => engine.current?.setMix(voices, volumes), [voices, volumes]);

  const loadFile = async (file: File) => {
    setBusy(true);
    setNotice(null);
    engine.current?.stop();
    try {
      const parsed = await parseMusicXML(file);
      if (parsed.partCount < 2) {
        setScore(null);
        setNotice({ type: 'error', text: 'В партитуре найден только один голос. Для режима двухголосия необходимы две партии.' });
        return;
      }
      setScore(parsed);
      setBpm(parsed.originalBpm);
      setLoop({ enabled: false, start: 1, end: Math.min(4, parsed.measures.length) });
      setVoices([true, true]);
      if (parsed.partCount > 2) {
        setNotice({ type: 'info', text: 'В партитуре найдено несколько партий. Сейчас используются Голос 1 и Голос 2.' });
      }
    } catch {
      setScore(null);
      setNotice({ type: 'error', text: 'Не удалось открыть нотный файл. Проверьте, что это корректный MusicXML-файл.' });
    } finally {
      setBusy(false);
    }
  };

  return <div className="app-shell">
    <header className="topbar compact-topbar">
      <div className="brand-group">
        <div className="brand-mark"><GraduationCap /></div>
        <div className="brand"><h1>Тренажёр двухголосного<br />сольфеджио</h1></div>
      </div>
      <VoicePractice voices={voices} volumes={volumes} onVoices={setVoices} onVolumes={setVolumes} />
      <ScoreUploader onFile={loadFile} busy={busy} />
    </header>

    <main>
      {notice && <div className={'notice ' + notice.type}><CircleAlert size={19} />{notice.text}<button onClick={() => setNotice(null)} aria-label="Закрыть">×</button></div>}
      <section className="score-card">
        <div className="score-meta">
          {score ? <>
            <div><FileMusic size={19} /><div><span>Партитура</span><h2>{score.title}</h2></div></div>
            <div className="score-facts"><span>{score.measures.length} тактов</span><span>{score.beats}/{score.beatType}</span>{currentMeasure && <strong>Такт {currentMeasure}</strong>}</div>
          </> : <div><BookOpen size={19} /><div><span>Рабочая область</span><h2>Нотный текст</h2></div></div>}
        </div>
        <ScoreViewer xml={score?.xml ?? null} currentMeasure={currentMeasure} />
      </section>

      <div className="sticky-controls">
        <PlaybackControls status={status} disabled={!score} onPlay={() => engine.current?.play()} onPause={() => engine.current?.pause()} onStop={() => engine.current?.stop()} />
      </div>

      <div className="dashboard-grid settings-only">
        <TempoPanel bpm={bpm} originalBpm={score?.originalBpm ?? 80} onChange={setBpm} />
        <SettingsPanel
          metronome={metronome}
          countIn={countIn}
          repeat={repeat}
          loop={loop}
          measureCount={score?.measures.length ?? 1}
          onMetronome={setMetronome}
          onCountIn={setCountIn}
          onRepeat={setRepeat}
          onLoop={next => setLoop(next.start <= next.end ? next : { ...next, end: next.start })}
        />
      </div>
    </main>
    <footer>Все вычисления и звук работают локально в браузере. Нотные файлы никуда не отправляются.</footer>
  </div>;
}
