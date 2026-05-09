"use client";

import { Edges, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useRef } from "react";
import * as THREE from "three";

const ACCENT = "#FFDA00";

function useAutoRotate(speed = 0.003) {
  const ref = useRef<THREE.Group>(null);
  const reduce = useReducedMotion();
  useFrame(() => {
    if (reduce || !ref.current) return;
    ref.current.rotation.y += speed;
  });
  return ref;
}

/// Encrypted euint64 — outer cube + 45°-tilted inner cube. The inner cube
/// reads as the ciphertext "core" hidden inside the outer handle.
export function EncryptedCube() {
  const ref = useAutoRotate(0.003);
  return (
    <group ref={ref} rotation={[0.45, 0.4, 0]}>
      <mesh>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>
      <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <boxGeometry args={[0.78, 0.78, 0.78]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>
      {/* central pin */}
      <mesh>
        <octahedronGeometry args={[0.18, 0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>
    </group>
  );
}

/// Vault — disc body + central torus handle + four spoke bars.
export function Vault() {
  const ref = useAutoRotate(0.003);
  const spokes = [0, 1, 2, 3];
  return (
    <group ref={ref} rotation={[0.25, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.42, 36, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>
      <mesh>
        <ringGeometry args={[1.18, 1.21, 64]} />
        <meshBasicMaterial color={ACCENT} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.45, 0.06, 12, 36]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>
      {spokes.map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
          <boxGeometry args={[0.06, 0.78, 0.06]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={ACCENT} threshold={1} />
        </mesh>
      ))}
      {/* center bolt */}
      <mesh>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={ACCENT} threshold={1} />
      </mesh>
    </group>
  );
}

/// Node graph — peers + edges between them. Looks like a P2P mesh.
export function NodeGraph() {
  const ref = useAutoRotate(0.003);
  const NODES: [number, number, number][] = [
    [0, 1.0, 0],
    [1.1, 0.1, 0.4],
    [-1.1, 0.1, -0.4],
    [0.55, -0.95, 0.25],
    [-0.6, -0.85, -0.2],
    [0, 0.05, 1.0],
  ];
  const EDGES: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 5],
    [1, 3],
    [1, 5],
    [2, 4],
    [2, 5],
    [3, 4],
    [3, 5],
    [4, 5],
  ];
  return (
    <group ref={ref} rotation={[0.2, 0.2, 0]}>
      {NODES.map((p, i) => (
        <mesh key={`n-${i}`} position={p}>
          <icosahedronGeometry args={[0.18, 0]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={ACCENT} threshold={1} />
        </mesh>
      ))}
      {EDGES.map(([a, b], i) => (
        <Line
          key={`e-${i}`}
          points={[NODES[a], NODES[b]]}
          color={ACCENT}
          lineWidth={1}
          transparent
          opacity={0.55}
        />
      ))}
    </group>
  );
}

/// Token stack — concentric token discs, narrowing toward the top.
export function TokenStack() {
  const ref = useAutoRotate(0.003);
  const tokens = [
    { y: -0.65, r: 0.85 },
    { y: -0.32, r: 0.78 },
    { y: 0.0, r: 0.7 },
    { y: 0.32, r: 0.6 },
    { y: 0.62, r: 0.48 },
  ];
  return (
    <group ref={ref} rotation={[0.45, 0, 0]}>
      {tokens.map((t, i) => (
        <mesh key={i} position={[0, t.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[t.r, t.r, 0.18, 36, 1, true]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={ACCENT} threshold={1} />
        </mesh>
      ))}
      {/* top + bottom rings as accent */}
      <mesh position={[0, -0.74, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 0.86, 48]} />
        <meshBasicMaterial color={ACCENT} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.71, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.49, 48]} />
        <meshBasicMaterial color={ACCENT} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
