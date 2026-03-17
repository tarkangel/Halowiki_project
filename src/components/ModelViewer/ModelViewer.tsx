import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

// ── Placeholder models (replace with useGLTF when real .glb files are available) ──

interface PlaceholderProps {
  color?: string;
}

/** Stand-in for a Warthog / ground vehicle: a box */
function WarthogPlaceholder({ color = '#4a7c59' }: PlaceholderProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5;
  });
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[2, 0.8, 3.5]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

/** Stand-in for Master Chief helmet / character: a sphere */
function HelmetPlaceholder({ color = '#1a3a5c' }: PlaceholderProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[1.2, 32, 32]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

/** Stand-in for Energy Sword / weapon: a flattened cylinder */
function SwordPlaceholder({ color = '#00B4D8' }: PlaceholderProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.6;
      ref.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
    }
  });
  return (
    <mesh ref={ref} castShadow>
      <cylinderGeometry args={[0.05, 0.2, 3, 8]} />
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.1}
        emissive={color}
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

// ── Loading fallback ──────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <Html center>
      <div className="text-[#00B4D8] text-sm animate-pulse">Loading model...</div>
    </Html>
  );
}

// ── Model registry ────────────────────────────────────────────────────────────

export type ModelId = 'warthog' | 'helmet' | 'sword';

const MODEL_COLORS: Record<ModelId, string> = {
  warthog: '#4a7c59',
  helmet: '#1a3a5c',
  sword: '#00B4D8',
};

function PlaceholderModel({ modelId }: { modelId: ModelId }) {
  const color = MODEL_COLORS[modelId];
  switch (modelId) {
    case 'warthog': return <WarthogPlaceholder color={color} />;
    case 'helmet':  return <HelmetPlaceholder  color={color} />;
    case 'sword':   return <SwordPlaceholder   color={color} />;
  }
}

// ── Main ModelViewer component ────────────────────────────────────────────────

export interface ModelViewerProps {
  /** Which placeholder model to show */
  modelId?: ModelId;
  /** Future: path to a real .glb file in public/models/ */
  modelUrl?: string;
  autoRotate?: boolean;
  backgroundColor?: string;
  height?: string;
}

export default function ModelViewer({
  modelId = 'helmet',
  autoRotate = false,
  backgroundColor = '#0f0f0f',
  height = '300px',
}: ModelViewerProps) {
  return (
    <div
      style={{ height, backgroundColor }}
      className="rounded-lg overflow-hidden border border-zinc-700"
    >
      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
        shadows
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <pointLight position={[-3, 3, -3]} intensity={0.5} color="#00B4D8" />

        <Suspense fallback={<LoadingFallback />}>
          <PlaceholderModel modelId={modelId} />
          <Environment preset="night" />
        </Suspense>

        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={1}
          enablePan={false}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}
