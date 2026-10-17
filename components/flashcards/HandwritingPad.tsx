import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, Trash2, Undo2 } from 'lucide-react';
import { Segmented } from '../ui/Segmented';

type Tool = 'pen' | 'eraser';
type Width = 'thin' | 'thick';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: Tool;
  width: number;
  points: Point[];
}

const WIDTHS: Record<Width, number> = { thin: 2.5, thick: 5 };

const toolButton = (active: boolean) =>
  `inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg transition-colors disabled:opacity-35 ${
    active
      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

/**
 * A canvas to practise writing a word by hand. Strokes are kept as point
 * lists and redrawn, which makes undo trivial and keeps lines sharp at any
 * device-pixel ratio. Mouse, pen and touch all go through pointer events.
 */
export const HandwritingPad: React.FC<{ onStroke?: () => void }> = ({ onStroke }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [width, setWidth] = useState<Width>('thin');

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ink = getComputedStyle(canvas).color;
    const all = drawingRef.current ? [...strokesRef.current, drawingRef.current] : strokesRef.current;
    for (const s of all) {
      ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = ink;
      ctx.lineWidth = s.tool === 'eraser' ? s.width * 4 : s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.01, s.points[0].y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  // Match the backing store to the element size × DPR, now and on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = { tool, width: WIDTHS[width], points: [pointFrom(e)] };
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current.points.push(pointFrom(e));
    redraw();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    strokesRef.current = [...strokesRef.current, drawingRef.current];
    drawingRef.current = null;
    setStrokeCount(strokesRef.current.length);
    onStroke?.();
  };

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redraw();
  };

  const clear = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        aria-label="Bảng viết tay"
        className="block h-40 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:h-48"
        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => setTool('pen')} aria-pressed={tool === 'pen'} aria-label="Bút" title="Bút" className={toolButton(tool === 'pen')}>
          <PenLine className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setTool('eraser')} aria-pressed={tool === 'eraser'} aria-label="Tẩy" title="Tẩy" className={toolButton(tool === 'eraser')}>
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>
        <Segmented<Width>
          label="Độ dày nét"
          value={width}
          onChange={setWidth}
          options={[
            { value: 'thin', label: 'Mảnh' },
            { value: 'thick', label: 'Đậm' },
          ]}
          className="ml-1"
        />
        <span className="flex-1" />
        <button type="button" onClick={undo} disabled={strokeCount === 0} aria-label="Hoàn tác nét cuối" title="Hoàn tác" className={toolButton(false)}>
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={clear} disabled={strokeCount === 0} aria-label="Xoá hết" title="Xoá hết" className={toolButton(false)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default HandwritingPad;
