'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: 'left' | 'right';
  minWidth?: number;
}

export function Dropdown({ trigger, children, align = 'left', minWidth = 180 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const dropH = 320; // estimated max height
    const dropW = minWidth;

    // Vertical: flip up if not enough space below
    const spaceBelow = viewportH - rect.bottom;
    const top = spaceBelow < dropH && rect.top > dropH
      ? rect.top - dropH + window.scrollY
      : rect.bottom + window.scrollY + 4;

    // Horizontal: align right if overflows
    let left = align === 'right'
      ? rect.right - dropW + window.scrollX
      : rect.left + window.scrollX;

    if (left + dropW > viewportW) left = viewportW - dropW - 8;
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [align, minWidth]);

  useEffect(() => {
    if (!open) return;
    calcPos();
    const handleScroll = () => calcPos();
    const handleResize = () => calcPos();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={triggerRef} style={{ display: 'inline-block' }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && typeof window !== 'undefined' && createPortal(
        <div
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-light)',
            borderRadius: 10,
            padding: '4px',
            minWidth,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            animation: 'dropdownIn 0.12s ease',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
        {typeof children === 'function' ? (children as (close: () => void) => React.ReactNode)(() => setOpen(false)) : children}        </div>,
        document.body
      )}
    </div>
  );
}