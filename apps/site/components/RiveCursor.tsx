"use client";

import { useEffect, useRef } from "react";
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from "@rive-app/react-canvas";

/* ──────────────────────────────────────────────────────────────
   Rive cursor — replaces the OS pointer on fine-pointer devices.
   State machine "State Machine 1" exposes:
     • Click      (trigger) — fired on pointerdown
     • IsHovering (bool)    — true over interactive elements
     • isDark     (bool)    — true when the surface under the
                               pointer is dark (cursor inverts)
     • isIdle     (bool)    — true after the pointer sits still
   On first load the cursor rests at screen centre (we never move
   the OS pointer); it begins tracking on the first real move.
   ────────────────────────────────────────────────────────────── */

const SM = "State Machine 1";
const ARTBOARD = "Hand Face Mouse Cursor";
const SIZE = 84;
// fingertip hotspot as a fraction of the box (tuned to sit under the pointer)
const HOTSPOT_X = 0.5;
const HOTSPOT_Y = 0.42;
const IDLE_MS = 3500;

export default function RiveCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);

  const { rive, RiveComponent } = useRive({
    src: "/cursor.riv",
    artboard: ARTBOARD,
    stateMachines: SM,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  const click = useStateMachineInput(rive, SM, "Click");
  const hovering = useStateMachineInput(rive, SM, "IsHovering");
  const dark = useStateMachineInput(rive, SM, "isDark");
  const idle = useStateMachineInput(rive, SM, "isIdle");

  // keep the latest input handles visible to the long-lived listeners
  const inputs = useRef({ click, hovering, dark, idle });
  inputs.current = { click, hovering, dark, idle };

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return; // leave the native cursor in place

    document.documentElement.classList.add("has-rive-cursor");
    const wrap = wrapRef.current;
    if (wrap) wrap.style.display = "block";

    let idleTimer = 0;
    let rafPending = false;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let lastDarkCheck = 0;
    let lastDark = false;

    const place = () => {
      if (!wrap) return;
      wrap.style.transform = `translate3d(${x - SIZE * HOTSPOT_X}px, ${
        y - SIZE * HOTSPOT_Y
      }px, 0)`;
    };
    place(); // rest at centre until the first move

    const luminanceFrom = (start: Element | null): number | null => {
      let el = start as HTMLElement | null;
      let hops = 0;
      while (el && hops < 12) {
        const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const p = m[1].split(",").map((s) => parseFloat(s));
          const a = p[3] === undefined ? 1 : p[3];
          if (a > 0.35) return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
        }
        el = el.parentElement;
        hops++;
      }
      return null;
    };

    const goIdle = () => {
      if (inputs.current.idle) inputs.current.idle.value = true;
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          place();
        });
      }

      if (inputs.current.idle) inputs.current.idle.value = false;
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(goIdle, IDLE_MS);

      const under = document.elementFromPoint(x, y);
      const interactive = !!under?.closest?.(
        'a,button,[role="button"],input,textarea,select,label,summary,[data-hover]'
      );
      if (inputs.current.hovering && inputs.current.hovering.value !== interactive)
        inputs.current.hovering.value = interactive;

      if (e.timeStamp - lastDarkCheck > 120) {
        lastDarkCheck = e.timeStamp;
        const L = luminanceFrom(under);
        const isDark = L !== null && L < 0.5;
        if (isDark !== lastDark) {
          lastDark = isDark;
          if (inputs.current.dark) inputs.current.dark.value = isDark;
        }
      }
    };

    const onDown = () => {
      inputs.current.click?.fire();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    idleTimer = window.setTimeout(goIdle, IDLE_MS);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      clearTimeout(idleTimer);
      document.documentElement.classList.remove("has-rive-cursor");
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
        zIndex: 9999,
        pointerEvents: "none",
        display: "none",
        willChange: "transform",
      }}
    >
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
