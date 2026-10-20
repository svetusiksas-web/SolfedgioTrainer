import { useEffect, useRef } from 'react';
import { EyeOff } from 'lucide-react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

function xmlForDisplay(xml: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) return xml;

  document.querySelectorAll('score-partwise > part').forEach(part => {
    const soundingStaves = new Set(
      Array.from(part.querySelectorAll('note'))
        .filter(note => !note.querySelector(':scope > rest'))
        .map(note => note.querySelector(':scope > staff')?.textContent?.trim() || '1'),
    );
    if (soundingStaves.size !== 1) return;

    const keptStaff = [...soundingStaves][0];
    const declaredStaves = Math.max(
      1,
      ...Array.from(part.querySelectorAll('attributes > staves')).map(node => Number(node.textContent) || 1),
    );
    if (declaredStaves < 2) return;

    part.querySelectorAll('attributes > staves').forEach(node => { node.textContent = '1'; });
    part.querySelectorAll('attributes > clef').forEach(clef => {
      const number = clef.getAttribute('number') || '1';
      if (number !== keptStaff) clef.remove();
      else clef.removeAttribute('number');
    });
    part.querySelectorAll('attributes > staff-details').forEach(details => {
      const number = details.getAttribute('number') || '1';
      if (number !== keptStaff) details.remove();
      else details.removeAttribute('number');
    });

    part.querySelectorAll('measure').forEach(measure => {
      measure.querySelectorAll(':scope > note').forEach(note => {
        const staff = note.querySelector(':scope > staff')?.textContent?.trim() || '1';
        if (staff !== keptStaff) note.remove();
        else note.querySelector(':scope > staff')?.remove();
      });

      const remainingVoices = new Set(
        Array.from(measure.querySelectorAll(':scope > note > voice')).map(node => node.textContent?.trim() || '1'),
      );
      if (remainingVoices.size <= 1) {
        measure.querySelectorAll(':scope > backup, :scope > forward').forEach(node => node.remove());
      }
    });
  });

  return new XMLSerializer().serializeToString(document);
}

export function ScoreViewer({ xml, currentMeasure, hidden }: { xml: string | null; currentMeasure: number | null; hidden: boolean }) {
  const scrollArea = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const osmd = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (osmd.current && element.clientWidth) osmd.current.render();
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener('orientationchange', resize);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
    };
  }, []);

  useEffect(() => {
    if (!xml || hidden || !host.current) return;
    let active = true;
    const viewer = new OpenSheetMusicDisplay(host.current, {
      autoResize: true,
      backend: 'svg',
      drawTitle: false,
      drawingParameters: 'compacttight',
    });
    osmd.current = viewer;
    viewer.load(xmlForDisplay(xml)).then(() => {
      if (active) {
        viewer.EngravingRules.PageBottomMargin = 12;
        viewer.render();
        scrollArea.current?.scrollTo({ left: 0, top: 0 });
      }
    });
    return () => {
      active = false;
      osmd.current = null;
      if (host.current) host.current.innerHTML = '';
    };
  }, [xml, hidden]);

  useEffect(() => {
    const root = host.current;
    const scroller = scrollArea.current;
    if (!root || !scroller) return;
    root.querySelectorAll('.measure-highlight').forEach(element => element.remove());

    if (!currentMeasure || !osmd.current) {
      scroller.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      return;
    }

    const measures = osmd.current.GraphicSheet?.MeasureList?.[currentMeasure - 1];
    if (!measures?.length) return;

    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = 0;
    let bottom = 0;

    measures.forEach(measure => {
      const box = measure.PositionAndShape;
      const x = box.AbsolutePosition.x * 10;
      const y = box.AbsolutePosition.y * 10;
      const width = box.Size.width * 10;
      const height = box.Size.height * 10;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + width);
      bottom = Math.max(bottom, y + height);
    });

    if (Number.isFinite(left) && Number.isFinite(top)) {
      const svg = root.querySelector('svg');
      if (svg) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(left));
        rect.setAttribute('y', String(top));
        rect.setAttribute('width', String(right - left));
        rect.setAttribute('height', String(bottom - top));
        rect.setAttribute('rx', '8');
        rect.classList.add('measure-highlight');
        svg.insertBefore(rect, svg.firstChild);
      }
      const measureCenterX = (left + right) / 2;
      const measureCenterY = (top + bottom) / 2;
      scroller.scrollTo({
        left: Math.max(0, measureCenterX - scroller.clientWidth * 0.46),
        top: Math.max(0, measureCenterY - scroller.clientHeight * 0.5),
        behavior: 'smooth',
      });
    }
  }, [currentMeasure]);

  if (!xml) {
    return <div className="score-empty"><div className="empty-note">♫</div><h2>Загрузите двухголосный пример</h2><p>Подойдут файлы MusicXML из MuseScore: .musicxml, .xml или .mxl</p></div>;
  }

  if (hidden) {
    return <div className="score-hidden" role="status"><EyeOff size={42} /><h2>Нотный текст скрыт</h2><p>Пример загружен и готов к работе. Воспроизведение и настройки голосов работают как обычно.</p></div>;
  }

  return <div className="score-scroll" ref={scrollArea}><div className="score-canvas" ref={host} aria-label="Нотный текст" /></div>;
}
