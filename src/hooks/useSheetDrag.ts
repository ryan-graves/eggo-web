'use client';

import { useCallback, useRef, useState } from 'react';

const DRAG_CLOSE_THRESHOLD = 100;

interface SheetDragResult {
  /** Props to spread on the drag handle area element */
  handleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Style to apply to the sheet element for drag offset */
  sheetStyle: {
    transform?: string;
    transition?: string;
  };
  /** Current drag offset in pixels */
  dragOffset: number;
}

/**
 * Hook for drag-to-close behavior on bottom sheet modals.
 * Returns touch handlers for the handle area and a transform style for the sheet.
 */
export function useSheetDrag(onClose: () => void): SheetDragResult {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const currentY = e.touches[0].clientY;
      const offset = Math.max(0, currentY - dragStartY.current);
      setDragOffset(offset);
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragOffset > DRAG_CLOSE_THRESHOLD) {
      onClose();
    } else {
      setDragOffset(0);
    }
  }, [dragOffset, onClose]);

  const sheetStyle = {
    transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
    transition: isDragging ? 'none' : undefined,
  };

  return {
    handleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    sheetStyle,
    dragOffset,
  };
}
