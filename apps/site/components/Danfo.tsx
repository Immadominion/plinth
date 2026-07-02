"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════
   Danfo — the real 3-D model (public/danfo-3d.glb) driving the
   bridge. Two instances run the two carriageways: one ONCOMING
   (front toward camera) and one DEPARTING (back, rotated 180°),
   at staggered intervals. The 3-D camera does the perspective.

   The GLB is a single fused mesh (wheels welded to the body), so
   nothing spins — the bus just glides cleanly along the road.
   ══════════════════════════════════════════════════════ */

useGLTF.preload("/danfo-3d.glb");

const FAR = -6;
const NEAR = 128;
const SCALE = 6.8; // model is ~1 unit long → ~6.8u danfo
const BASE_Y = 0.23 * SCALE; // lift so the wheels sit on the deck
const SPEED = 1.2; // overall pace multiplier

function ContactShadow() {
  return (
    <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} scale={[1.9, 3.6, 1]}>
      <circleGeometry args={[1, 28]} />
      <meshBasicMaterial color="#11171a" transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

function place(
  g: THREE.Group | null,
  t: number,
  cfg: { C: number; Tr: number; off: number; zA: number; zB: number }
) {
  if (!g) return;
  const tt = (((t + cfg.off) % cfg.C) + cfg.C) % cfg.C;
  if (tt > cfg.Tr) {
    g.visible = false;
    return;
  }
  g.visible = true;
  const k = tt / cfg.Tr;
  g.position.z = cfg.zA + k * (cfg.zB - cfg.zA);
  const fade = Math.min(1, k / 0.08, (1 - k) / 0.2);
  const fading = fade < 0.999;
  g.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m && "opacity" in m) {
      m.transparent = fading;
      (m as THREE.MeshStandardMaterial).opacity = fade;
      // Keep writing depth even while fading. Disabling depthWrite here was the
      // bug: with no self-occlusion the translucent body stopped hiding its own
      // interior, so the front "faded to X-ray" and you saw the seats through it.
      // With depthWrite on, the nearest surface always wins the depth test, so
      // the bus reads as a clean dissolve into the background instead.
      m.depthWrite = true;
    }
  });
}

export default function Danfo({ reduce = false }: { reduce?: boolean }) {
  const { scene } = useGLTF("/danfo-3d.glb");

  // One independent clone per bus — own materials (so per-bus fade can't bleed),
  // flattened so the Tripo PBR sits in the flat scene.
  const [comingScene, goingScene] = useMemo(() => {
    const make = () => {
      const c = scene.clone(true);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material) {
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.metalness = 0;
          mat.roughness = 1;
          m.material = mat;
        }
      });
      return c;
    };
    return [make(), make()];
  }, [scene]);

  const coming = useRef<THREE.Group>(null);
  const going = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = (reduce ? 7.5 : clock.elapsedTime) * SPEED;
    place(coming.current, t, { C: 16, Tr: 12.5, off: 1.5, zA: FAR, zB: NEAR });
    place(going.current, t, { C: 18.5, Tr: 12, off: 9, zA: NEAR, zB: FAR });
  });

  return (
    <>
      {/* left carriageway: oncoming — front toward the camera */}
      <group ref={coming} position={[-3.6, 0, FAR]}>
        <ContactShadow />
        <primitive object={comingScene} scale={SCALE} position={[0, BASE_Y, 0]} rotation-y={0} />
      </group>
      {/* right carriageway: departing — back toward the camera */}
      <group ref={going} position={[3.6, 0, NEAR]}>
        <ContactShadow />
        <primitive object={goingScene} scale={SCALE} position={[0, BASE_Y, 0]} rotation-y={Math.PI} />
      </group>
    </>
  );
}
