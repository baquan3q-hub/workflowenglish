import { useState, useEffect, useRef, useCallback } from 'react';

export interface Position {
  x: number;
  y: number;
}

export interface UseDraggableOptions {
  storageKey?: string;
  defaultPosition?: Position;
  snapToEdge?: boolean;
  edgePadding?: number;
  elementWidth?: number;
  elementHeight?: number;
  onDragEnd?: (pos: Position) => void;
}

export function useDraggable({
  storageKey = 'workflow_ai_bubble_pos',
  defaultPosition,
  snapToEdge = true,
  edgePadding = 16,
  elementWidth = 56,
  elementHeight = 56,
  onDragEnd,
}: UseDraggableOptions = {}) {
  // Safe default position (bottom-right of screen)
  const computeDefaultPosition = useCallback((): Position => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    return defaultPosition ?? {
      x: Math.max(edgePadding, screenW - elementWidth - edgePadding),
      y: Math.max(edgePadding, screenH - elementHeight - edgePadding - 30),
    };
  }, [defaultPosition, edgePadding, elementWidth, elementHeight]);

  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          // Clamp to current viewport
          const clampedX = Math.min(Math.max(edgePadding, parsed.x), window.innerWidth - elementWidth - edgePadding);
          const clampedY = Math.min(Math.max(edgePadding, parsed.y), window.innerHeight - elementHeight - edgePadding);
          return { x: clampedX, y: clampedY };
        }
      }
    } catch {
      // fallback
    }
    return computeDefaultPosition();
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const hasMovedRef = useRef(false);

  // Keep inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(edgePadding, window.innerWidth - elementWidth - edgePadding);
        const maxY = Math.max(edgePadding, window.innerHeight - elementHeight - edgePadding);
        const nextX = Math.min(Math.max(edgePadding, prev.x), maxX);
        const nextY = Math.min(Math.max(edgePadding, prev.y), maxY);
        return { x: nextX, y: nextY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [edgePadding, elementWidth, elementHeight]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only primary mouse button or touch
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: position.x,
        initialY: position.y,
      };
      hasMovedRef.current = false;
      setIsDragging(false);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!dragStartRef.current) return;
        const dx = moveEvent.clientX - dragStartRef.current.startX;
        const dy = moveEvent.clientY - dragStartRef.current.startY;

        // Threshold to distinguish click vs drag
        if (!hasMovedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          hasMovedRef.current = true;
          setIsDragging(true);
        }

        if (hasMovedRef.current) {
          const rawX = dragStartRef.current.initialX + dx;
          const rawY = dragStartRef.current.initialY + dy;

          const clampedX = Math.min(Math.max(edgePadding, rawX), window.innerWidth - elementWidth - edgePadding);
          const clampedY = Math.min(Math.max(edgePadding, rawY), window.innerHeight - elementHeight - edgePadding);

          setPosition({ x: clampedX, y: clampedY });
        }
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        if (dragStartRef.current && hasMovedRef.current) {
          setPosition((curr) => {
            let finalX = curr.x;
            const finalY = curr.y;

            if (snapToEdge) {
              const screenW = window.innerWidth;
              const midScreen = screenW / 2;
              finalX = curr.x + elementWidth / 2 < midScreen
                ? edgePadding
                : screenW - elementWidth - edgePadding;
            }

            const finalPos = { x: finalX, y: finalY };
            try {
              localStorage.setItem(storageKey, JSON.stringify(finalPos));
            } catch {
              // ignore
            }
            onDragEnd?.(finalPos);
            return finalPos;
          });
        }

        dragStartRef.current = null;
        setTimeout(() => {
          setIsDragging(false);
          hasMovedRef.current = false;
        }, 50);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [position, edgePadding, elementWidth, elementHeight, snapToEdge, storageKey, onDragEnd]
  );

  return {
    position,
    setPosition,
    isDragging,
    hasMoved: hasMovedRef.current,
    handlePointerDown,
  };
}
