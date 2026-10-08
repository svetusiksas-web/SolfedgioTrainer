import { useEffect, useRef } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

export function ScoreViewer({ xml, currentMeasure }: { xml: string | null; currentMeasure: number | null }) {
  const scrollArea = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const osmd = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    if (!xml || !host.current) return;
    let active = true;
    const viewer = new OpenSheetMusicDisplay(host.current, {
      autoResize: true,
      backend: 'svg',
      drawTitle: false,
      drawingParameters: 'compacttight',
    });
    osmd.current = viewer;
    viewer.load(xml).then(() => {
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
  }, [xml]);

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
      const svg = root.querySelector('svg');
      if (!svg) return;
      const box = measure.PositionAndShape;
      const x = box.AbsolutePosition.x * 10;
      const y = box.AbsolutePosition.y * 10;
      const width = box.Size.width * 10;
      const height = box.Size.height * 10;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + width);
      bottom = Math.max(bottom, y + height);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(height));
      rect.setAttribute('rx', '8');
      rect.classList.add('measure-highlight');
      svg.insertBefore(rect, svg.firstChild);
    });

    if (Number.isFinite(left) && Number.isFinite(top)) {
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

  return <div className="score-scroll" ref={scrollArea}><div className="score-canvas" ref={host} aria-label="Нотный текст" /></div>;
}
