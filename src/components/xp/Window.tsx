"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

export type WindowGeometry = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WindowState = WindowGeometry & {
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  z: number;
};

type Props = {
  title: string;
  icon: string;
  state: WindowState;
  active: boolean;
  resizable?: boolean;
  menu?: string[];
  statusBar?: ReactNode;
  children: ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onGeometry: (geo: Partial<WindowGeometry>) => void;
};

const TASKBAR = 32;

export default function XPWindow({
  title,
  icon,
  state,
  active,
  resizable = true,
  menu,
  statusBar,
  children,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onGeometry,
}: Props) {
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const sizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Never capture the pointer when the press starts on a caption button:
      // pointer capture retargets pointerup to the title bar, which would
      // swallow the click on minimize / maximize / close.
      if ((event.target as HTMLElement).closest("button")) return;
      if (event.button !== 0) return;
      onFocus();
      if (state.maximized) return;
      dragRef.current = { dx: event.clientX - state.x, dy: event.clientY - state.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onFocus, state.maximized, state.x, state.y],
  );

  const onDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const maxX = window.innerWidth - 90;
      const maxY = window.innerHeight - TASKBAR - 28;
      onGeometry({
        x: Math.min(Math.max(event.clientX - drag.dx, -state.w + 120), maxX),
        y: Math.min(Math.max(event.clientY - drag.dy, 0), maxY),
      });
    },
    [onGeometry, state.w],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (state.maximized) return;
      onFocus();
      sizeRef.current = { x: event.clientX, y: event.clientY, w: state.w, h: state.h };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [onFocus, state.h, state.maximized, state.w],
  );

  const onResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = sizeRef.current;
      if (!start) return;
      onGeometry({
        w: Math.max(280, start.w + (event.clientX - start.x)),
        h: Math.max(180, start.h + (event.clientY - start.y)),
      });
    },
    [onGeometry],
  );

  const endResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    sizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const visible = state.open && !state.minimized;

  const style = state.maximized
    ? { left: 0, top: 0, width: "100vw", height: `calc(100vh - ${TASKBAR}px)`, zIndex: state.z }
    : { left: state.x, top: state.y, width: state.w, height: state.h, zIndex: state.z };

  return (
    <div
      className={`xp-window ${active ? "" : "inactive"}`}
      style={{ ...style, display: visible ? "flex" : "none" }}
      onPointerDown={onFocus}
      role="dialog"
      aria-label={title}
    >
      <div
        className="xp-titlebar"
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          onMaximize();
        }}
        style={{ touchAction: "none" }}
      >
        <span className="text-[14px] leading-none">{icon}</span>
        <span className="flex-1 truncate">{title}</span>
        <button
          className="xp-tb-btn"
          onClick={onMinimize}
          onPointerDown={(event) => event.stopPropagation()}
          title="Свернуть"
          type="button"
        >
          _
        </button>
        <button
          className="xp-tb-btn"
          onClick={onMaximize}
          onPointerDown={(event) => event.stopPropagation()}
          title="Развернуть"
          type="button"
        >
          ▫
        </button>
        <button
          className="xp-tb-btn close"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          title="Закрыть"
          type="button"
        >
          ✕
        </button>
      </div>

      {menu && menu.length > 0 ? (
        <div className="xp-menubar">
          {menu.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}

      <div className="xp-window-body">{children}</div>

      {statusBar ? <div className="xp-statusbar">{statusBar}</div> : null}

      {resizable && !state.maximized ? (
        <div
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
          onPointerDown={startResize}
          onPointerMove={onResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          style={{ zIndex: 5 }}
        >
          <svg viewBox="0 0 16 16" className="h-full w-full opacity-70">
            <g fill="#5a5a52">
              <rect x="11" y="11" width="2" height="2" />
              <rect x="8" y="11" width="2" height="2" />
              <rect x="11" y="8" width="2" height="2" />
              <rect x="5" y="11" width="2" height="2" />
              <rect x="11" y="5" width="2" height="2" />
              <rect x="8" y="8" width="2" height="2" />
            </g>
          </svg>
        </div>
      ) : null}
    </div>
  );
}
