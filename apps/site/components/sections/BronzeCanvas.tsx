"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  Lightformer,
  AdaptiveDpr,
  TransformControls,
} from "@react-three/drei";
import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════
   Bronze scene — floating Benin / Ife / Nok / Igbo-Ukwu
   pieces that drift, rotate and part as the user scrolls.
   • Hover a piece → name + lore tooltip (handled by parent).
   • Edit mode (Shift+E) → click a piece, drag the gizmo,
     and its placement prints to the console.
   Models are normalised to ~1u tall, centred at origin.
   ══════════════════════════════════════════════════════ */

export type BronzeCfg = {
  src: string;
  name: string;
  desc: string;
  base: [number, number, number];
  scale: number;
  rot0: [number, number, number];
  move: [number, number];
  rotDelta: [number, number, number];
  aside: [number, number];
};

export type HoverInfo = { name: string; desc: string; x: number; y: number } | null;
export type EditInfo = {
  name: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
} | null;

useGLTF.preload("/models/ife-bronze-head-3d.glb");
useGLTF.preload("/models/benin-bronze-2-3d.glb");
useGLTF.preload("/models/benin-bronze-3-3d.glb");
useGLTF.preload("/models/benin-bronze-4-3d.glb");
useGLTF.preload("/models/benin-leopard-3d.glb");
useGLTF.preload("/models/igbo-ukwu-castings-3d.glb");
useGLTF.preload("/models/nok-terracottas-3d.glb");
useGLTF.preload("/models/nok-terracottas-1-3d.glb");

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

type EditedMap = Record<number, { pos: THREE.Vector3; rot: THREE.Euler; scale: number }>;

function Bronze({
  cfg,
  index,
  progress,
  edit,
  selected,
  editedRef,
  groupRefs,
  onSelect,
  onHover,
}: {
  cfg: BronzeCfg;
  index: number;
  progress: MutableRefObject<number>;
  edit: boolean;
  selected: boolean;
  editedRef: MutableRefObject<EditedMap>;
  groupRefs: MutableRefObject<(THREE.Group | null)[]>;
  onSelect: (i: number) => void;
  onHover: (h: HoverInfo) => void;
}) {
  const { scene } = useGLTF(cfg.src);
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material) {
        (m.material as THREE.MeshStandardMaterial).envMapIntensity = 1.25;
      }
    });
    return c;
  }, [scene]);

  const group = useRef<THREE.Group>(null);
  const cur = useRef(0);
  // interaction: hover (ease + scale + gentle spin) and drag-to-spin
  const hoverRef = useRef(false);
  const hoverAmt = useRef(0);
  const spin = useRef(0); // continuous spin while hovered
  const dragRotY = useRef(0); // accumulated drag rotation — persists
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    groupRefs.current[index] = group.current;
  });

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    if (edit) {
      if (selected) return; // the transform gizmo owns the selected piece
      const ed = editedRef.current[index];
      if (ed) {
        g.position.copy(ed.pos);
        g.rotation.copy(ed.rot);
        g.scale.setScalar(ed.scale);
      } else {
        g.position.set(cfg.base[0], cfg.base[1], cfg.base[2]);
        g.rotation.set(cfg.rot0[0], cfg.rot0[1], cfg.rot0[2]);
        g.scale.setScalar(cfg.scale);
      }
      return;
    }

    cur.current += (progress.current - cur.current) * 0.09;
    const p = cur.current;
    const rev = smoothstep(0.5, 1, p);
    // an in-session edit (if any) becomes the resting base, so placements persist
    const ov = editedRef.current[index];
    const bx = ov ? ov.pos.x : cfg.base[0];
    const by = ov ? ov.pos.y : cfg.base[1];
    const bz = ov ? ov.pos.z : cfg.base[2];
    const r0x = ov ? ov.rot.x : cfg.rot0[0];
    const r0y = ov ? ov.rot.y : cfg.rot0[1];
    const r0z = ov ? ov.rot.z : cfg.rot0[2];
    const sc = ov ? ov.scale : cfg.scale;

    // hover: ease toward hovered → scale up a touch + a slow, live spin
    const hTarget = hoverRef.current ? 1 : 0;
    hoverAmt.current += (hTarget - hoverAmt.current) * 0.12;
    spin.current += hoverAmt.current * (dt || 0.016) * 0.9;
    // the parting reads as a real 3-D tumble (alternating direction per piece)
    const transSpin = (index % 2 ? 1 : -1) * p * 0.9;

    g.position.set(
      bx + cfg.move[0] * p + cfg.aside[0] * rev,
      by + cfg.move[1] * p + cfg.aside[1] * rev,
      bz
    );
    g.rotation.set(
      r0x + cfg.rotDelta[0] * p,
      r0y + cfg.rotDelta[1] * p + transSpin + spin.current + dragRotY.current,
      r0z + cfg.rotDelta[2] * p
    );
    g.scale.setScalar(sc * (1 + hoverAmt.current * 0.14));
  });

  return (
    <group
      ref={group}
      scale={cfg.scale}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (edit) return;
        e.stopPropagation();
        hoverRef.current = true;
        onHover({ name: cfg.name, desc: cfg.desc, x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (edit || dragging.current) return;
        onHover({ name: cfg.name, desc: cfg.desc, x: e.clientX, y: e.clientY });
      }}
      onPointerOut={() => {
        if (edit) return;
        hoverRef.current = false;
        if (!dragging.current) onHover(null);
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        if (edit) return;
        e.stopPropagation();
        // grab to spin the piece — persists after release, like a real 3-D model
        dragging.current = true;
        lastX.current = e.clientX;
        onHover(null);
        const move = (ev: PointerEvent) => {
          if (!dragging.current) return;
          dragRotY.current += (ev.clientX - lastX.current) * 0.012;
          lastX.current = ev.clientX;
        };
        const up = () => {
          dragging.current = false;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!edit) return;
        e.stopPropagation();
        onSelect(index);
      }}
    >
      <primitive object={model} />
    </group>
  );
}

function Scene({
  models,
  progress,
  edit,
  onHover,
  onInfo,
  apiRef,
}: {
  models: BronzeCfg[];
  progress: MutableRefObject<number>;
  edit: boolean;
  onHover: (h: HoverInfo) => void;
  onInfo: (i: EditInfo) => void;
  apiRef?: MutableRefObject<(() => void) | null>;
}) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const editedRef = useRef<EditedMap>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");

  // store an edit (no console) and reflect it in the HUD
  const applyEdit = (i: number) => {
    const g = groupRefs.current[i];
    if (!g) return;
    editedRef.current[i] = {
      pos: g.position.clone(),
      rot: g.rotation.clone(),
      scale: g.scale.x,
    };
    const f = (n: number) => Number(n.toFixed(2));
    onInfo({
      name: models[i].name,
      x: f(g.position.x),
      y: f(g.position.y),
      z: f(g.position.z),
      scale: f(g.scale.x),
      rotY: f(g.rotation.y),
    });
  };

  // print ALL eight placements once, as a single copy-paste block (the button)
  const logAll = useCallback(() => {
    const f = (n: number) => Number(n.toFixed(2));
    const lines = models.map((cfg, i) => {
      const g = groupRefs.current[i];
      if (!g) return `  // ${cfg.name}: not ready`;
      return `  { src: "${cfg.src}", base: [${f(g.position.x)}, ${f(g.position.y)}, ${f(
        g.position.z
      )}], scale: ${f(g.scale.x)}, rot0: [${f(g.rotation.x)}, ${f(g.rotation.y)}, ${f(
        g.rotation.z
      )}] },`;
    });
    // eslint-disable-next-line no-console
    console.log("%c[bronze placements]", "color:#0FA37F;font-weight:700", "\n" + lines.join("\n"));
  }, [models]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = logAll;
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, logAll]);

  useEffect(() => {
    if (!edit) {
      setSelected(null);
      onInfo(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "g") return setMode("translate");
      if (k === "r") return setMode("rotate");
      if (k === "s") return setMode("scale");
      if (selected == null) return;
      const g = groupRefs.current[selected];
      if (!g) return;
      const step = e.shiftKey ? 0.02 : 0.1;
      if (e.key === "ArrowLeft") g.position.x -= step;
      else if (e.key === "ArrowRight") g.position.x += step;
      else if (e.key === "ArrowUp") g.position.y += step;
      else if (e.key === "ArrowDown") g.position.y -= step;
      else if (e.key === "[") g.position.z -= step;
      else if (e.key === "]") g.position.z += step;
      else return;
      e.preventDefault();
      applyEdit(selected);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, selected]);

  return (
    <>
      {models.map((m, i) => (
        <Bronze
          key={m.src}
          cfg={m}
          index={i}
          progress={progress}
          edit={edit}
          selected={selected === i}
          editedRef={editedRef}
          groupRefs={groupRefs}
          onSelect={setSelected}
          onHover={onHover}
        />
      ))}
      {edit && selected != null && groupRefs.current[selected] && (
        <TransformControls
          key={selected}
          object={groupRefs.current[selected]!}
          mode={mode}
          onObjectChange={() => applyEdit(selected)}
        />
      )}
    </>
  );
}

function BronzeCanvasImpl({
  models,
  progress,
  edit = false,
  onHover,
  onInfo,
  apiRef,
  dpr = [1, 1.5],
}: {
  models: BronzeCfg[];
  progress: MutableRefObject<number>;
  edit?: boolean;
  onHover: (h: HoverInfo) => void;
  onInfo: (i: EditInfo) => void;
  apiRef?: MutableRefObject<(() => void) | null>;
  dpr?: [number, number];
}) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      dpr={dpr}
      camera={{ position: [0, 0, 9], fov: 32, near: 0.1, far: 100 }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#fff3e0", "#3a2f25", 0.6]} />
        <directionalLight position={[5, 6, 6]} intensity={2.4} color="#fff1da" />
        <directionalLight position={[-6, 2, 3]} intensity={0.7} color="#cfe0ff" />
        <directionalLight position={[0, -2, -5]} intensity={0.5} color="#ffd9a0" />
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={2} position={[0, 3, 5]} scale={[8, 8, 1]} color="#fff7ec" />
          <Lightformer intensity={1.2} position={[-5, 1, -3]} scale={[5, 5, 1]} color="#bcd4ff" />
          <Lightformer intensity={1} position={[4, -2, 2]} scale={[4, 4, 1]} color="#ffcaa0" />
        </Environment>
        <Scene
          models={models}
          progress={progress}
          edit={edit}
          onHover={onHover}
          onInfo={onInfo}
          apiRef={apiRef}
        />
      </Suspense>
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}

export default memo(BronzeCanvasImpl);
