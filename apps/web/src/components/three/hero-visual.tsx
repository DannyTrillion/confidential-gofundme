"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";

const ACCENT = "#FFDA00";

/// Donation Jar — a wireframe glass jar that's slowly filling.
///   - 7 stacked coins at the bottom (encrypted balance, can't be counted)
///   - 3 falling coins cycling on staggered phases (donations arriving)
///   - jar body / closed bottom / top rim, all rendered as wireframe edges
function DonationJar() {
  const fallingRefs = useRef<Array<THREE.Mesh | null>>([]);
  const groupRef = useRef<THREE.Group>(null);
  const reduce = useReducedMotion();

  // Pre-placed coins inside the jar — randomized scatter, all under the rim.
  // [x, y, z, zRotationOffset]
  const STACK: Array<[number, number, number, number]> = [
    [-0.42, -1.06, 0.18, 0.30],
    [0.30, -1.0, -0.28, -0.22],
    [0.00, -0.92, 0.05, 0.50],
    [-0.28, -0.85, -0.20, -0.40],
    [0.40, -0.74, 0.28, 0.12],
    [-0.10, -0.66, 0.18, 0.72],
    [0.20, -0.56, -0.10, -0.32],
  ];

  const FALL_COUNT = 3;
  const FALL_DUR = 2.6;

  useFrame((state) => {
    if (reduce) return;
    const t = state.clock.elapsedTime;

    // Slow group spin for parallax — the whole scene drifts gently.
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(t * 0.12) * 0.18;

    for (let i = 0; i < FALL_COUNT; i++) {
      const ref = fallingRefs.current[i];
      if (!ref) continue;
      const phase = (i / FALL_COUNT) * FALL_DUR;
      const localT = (((t - phase) % FALL_DUR) + FALL_DUR) % FALL_DUR;
      const progress = localT / FALL_DUR;
      const gravity = progress * progress; // ease-in
      const yStart = 1.8;
      const yEnd = -0.45;
      ref.position.y = THREE.MathUtils.lerp(yStart, yEnd, gravity);
      ref.position.x = (i - 1) * 0.28;
      ref.position.z = i % 2 ? 0.18 : -0.2;
      ref.rotation.x = t * 1.5 + i * 0.7;
      ref.rotation.z = i * 0.4;
      // Hide the moment the coin merges with the stack to avoid stutter.
      ref.visible = progress < 0.96;
    }
  });

  return (
    <group ref={groupRef} rotation={[-0.16, 0, 0]} scale={[0.82, 0.82, 0.82]}>
      {/* Jar body — open cylinder, slightly wider at the base for a mason-jar feel */}
      <mesh>
        <cylinderGeometry args={[1.32, 1.45, 2.85, 36, 4, true]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        <Edges color={ACCENT} threshold={1} />
      </mesh>

      {/* Bottom plate */}
      <mesh position={[0, -1.43, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.06, 36, 1, false]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>

      {/* Top lip ring */}
      <mesh position={[0, 1.43, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.05, 12, 40]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>

      {/* Faint label band — purely decorative, mid-jar */}
      <mesh position={[0, 0.05, 0]}>
        <torusGeometry args={[1.4, 0.012, 6, 40]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.35} />
      </mesh>

      {/* Stacked coins inside the jar */}
      {STACK.map(([x, y, z, rot], i) => (
        <mesh
          key={`s-${i}`}
          position={[x, y, z]}
          rotation={[Math.PI / 2 + 0.08, rot, 0]}
        >
          <cylinderGeometry args={[0.3, 0.3, 0.08, 28]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={ACCENT} threshold={1} />
        </mesh>
      ))}

      {/* Falling coins (cycle continuously) */}
      {Array.from({ length: FALL_COUNT }).map((_, i) => (
        <mesh
          key={`f-${i}`}
          ref={(el) => {
            fallingRefs.current[i] = el;
          }}
        >
          <cylinderGeometry args={[0.3, 0.3, 0.08, 28]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={ACCENT} threshold={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroVisual() {
  return (
    <div className="relative h-[320px] w-full sm:h-[420px] md:h-[480px] lg:h-[560px]">
      {/* corner brackets */}
      <span className="pointer-events-none absolute -left-2 -top-2 h-4 w-4 border-l border-t border-primary" />
      <span className="pointer-events-none absolute -right-2 -top-2 h-4 w-4 border-r border-t border-primary" />
      <span className="pointer-events-none absolute -bottom-2 -left-2 h-4 w-4 border-b border-l border-primary" />
      <span className="pointer-events-none absolute -bottom-2 -right-2 h-4 w-4 border-b border-r border-primary" />

      {/* top status strip */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-border/50 bg-background/30 px-3 py-2 font-mono text-[9px] uppercase tracking-widest backdrop-blur-sm sm:text-[10px]">
        <span className="text-muted-foreground">// donation jar</span>
        <span className="flex items-center gap-2">
          <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
          <span className="text-primary"><span className="sm:hidden">private</span><span className="hidden sm:inline">amount kept private</span></span>
        </span>
      </div>

      {/* corner readout right — hidden on mobile to avoid overlapping the canvas */}
      <div className="pointer-events-none absolute right-3 top-12 z-10 hidden flex-col items-end gap-0.5 font-mono text-[9px] uppercase tracking-widest text-primary/75 sm:flex">
        <span>donations stay private</span>
        <span>recipient is shown</span>
        <span>only the total is public</span>
      </div>

      {/* corner readout left — hidden on mobile */}
      <div className="pointer-events-none absolute bottom-10 left-3 z-10 hidden flex-col gap-0.5 font-mono text-[9px] uppercase tracking-widest text-primary/75 sm:flex">
        <span>// no one sees individual donations</span>
        <span>not even us</span>
      </div>

      {/* bottom status strip */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-border/50 bg-background/30 px-3 py-2 font-mono text-[10px] uppercase tracking-widest backdrop-blur-sm">
        <span className="text-muted-foreground">running</span>
        <span className="text-primary/80">live</span>
      </div>

      {/* canvas — camera pulled back + slight up-pos for "looking into jar" angle */}
      <Canvas
        camera={{ position: [0, 0.6, 7.6], fov: 34 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <DonationJar />
      </Canvas>
    </div>
  );
}
