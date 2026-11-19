"use client";

// Kirana in real 3D (three.js via react-three-fiber). Loaded lazily by
// Kirana3D; never imported on the server. Art direction from the mascot
// research: a pearl-white ceramic robot, egg head about 60% of her height,
// a black glass visor with the two interlocked gold rings of the DuaCincin
// logo as eye frames and warm glowing pupils inside, a gold swan-neck
// antenna ending in a pearl, floating mitten hands, no legs. Every part is a
// primitive, so it stays crisp at any size and needs no model file.
//
// Behaviour (all spring/damp driven in useFrame, no keyframe files):
// - idle: breathes (float), blinks at random, head and pupils follow the
//   pointer anywhere on the page;
// - listening: leans toward the composer while the visitor types;
// - thinking: the rings orbit each other, antenna wobbles, pupils look up;
// - talking: a light line under the eyes pulses with the streamed words;
// - happy: eyes turn into smiling arcs, a hop, arms up;
// - wave: the right hand waves.
// Tapping her makes her spin once and hop (a small reward for poking).
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type Kirana3DMood = "idle" | "listening" | "thinking" | "talking" | "happy" | "wave";

const PEARL = "#fbf6ec";
const GOLD = "#c9a24a";
const VISOR = "#0f0b09";
const GLOW = "#ffe2a8";
const BLUSH = "#f2a7a0";

const damp = THREE.MathUtils.damp;

function useMaterials() {
  return useMemo(
    () => ({
      pearl: new THREE.MeshPhysicalMaterial({
        color: PEARL,
        roughness: 0.28,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        sheen: 0.4,
        sheenColor: new THREE.Color("#fff6e6"),
        iridescence: 0.12,
        iridescenceIOR: 1.3,
      }),
      gold: new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
      visor: new THREE.MeshPhysicalMaterial({ color: VISOR, metalness: 0.3, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }),
      glow: new THREE.MeshBasicMaterial({ color: GLOW, toneMapped: false }),
      blush: new THREE.MeshBasicMaterial({ color: BLUSH, transparent: true, opacity: 0.55, toneMapped: false }),
    }),
    [],
  );
}

/** The swan-neck antenna curve, from the top of the head. */
function useAntenna() {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.04, 0.22, -0.06),
      new THREE.Vector3(-0.07, 0.46, -0.02),
      new THREE.Vector3(0.0, 0.62, 0.1),
      new THREE.Vector3(0.16, 0.64, 0.2),
    ]);
    return { geo: new THREE.TubeGeometry(curve, 48, 0.038, 12, false), tip: curve.getPoint(1) };
  }, []);
}

function Robot({ mood, pointer, poke }: { mood: Kirana3DMood; pointer: React.RefObject<{ x: number; y: number }>; poke: number }) {
  const m = useMaterials();
  const antenna = useAntenna();
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const pupils = useRef<THREE.Group>(null);
  const arcs = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const ant = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const blinkAt = useRef(1.5);
  const blinkUntil = useRef(0);
  const pokeStart = useRef(-10);
  const moodStart = useRef(0);
  const clockRef = useRef(0);

  useEffect(() => {
    moodStart.current = clockRef.current;
  }, [mood]);
  useEffect(() => {
    if (poke > 0) pokeStart.current = clockRef.current;
  }, [poke]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    clockRef.current = t;
    const p = pointer.current ?? { x: 0, y: 0 };
    const sincePoke = t - pokeStart.current;
    const sinceMood = t - moodStart.current;
    const happy = mood === "happy" || sincePoke < 1.1;
    const thinking = mood === "thinking";

    // Gaze target: the pointer, or the composer (down-right) while listening, or up while thinking.
    let gx = p.x;
    let gy = p.y;
    if (mood === "listening") [gx, gy] = [0.35, -0.55];
    if (thinking) [gx, gy] = [-0.35, 0.55];

    // Body float + hop.
    const hop = happy ? Math.max(0, Math.sin(Math.min(sinceMood, sincePoke) * 7)) * 0.16 * Math.max(0, 1 - Math.min(sinceMood, sincePoke) / 1.2) : 0;
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.5) * 0.06 + hop;
      const spin = sincePoke < 1.1 ? (1 - Math.pow(1 - sincePoke / 1.1, 3)) * Math.PI * 2 : 0;
      root.current.rotation.y = damp(root.current.rotation.y % (Math.PI * 2), gx * 0.25, 4, dt) + spin;
    }
    if (head.current) {
      head.current.rotation.y = damp(head.current.rotation.y, gx * 0.42, 6, dt);
      head.current.rotation.x = damp(head.current.rotation.x, -gy * 0.22, 6, dt);
      head.current.rotation.z = damp(head.current.rotation.z, thinking ? 0.14 : mood === "wave" ? -0.08 : 0, 5, dt);
    }

    // Eyes: rings orbit while thinking, settle otherwise.
    if (eyes.current) {
      if (thinking) eyes.current.rotation.z += dt * 2.6;
      else eyes.current.rotation.z = damp(eyes.current.rotation.z % (Math.PI * 2), 0, 6, dt);
    }

    // Blink.
    if (t > blinkAt.current) {
      blinkUntil.current = t + 0.13;
      blinkAt.current = t + 2.2 + Math.random() * 3;
    }
    const blinking = t < blinkUntil.current;
    if (pupils.current) {
      pupils.current.position.x = damp(pupils.current.position.x, gx * 0.06, 8, dt);
      pupils.current.position.y = damp(pupils.current.position.y, gy * 0.05, 8, dt);
      const sy = happy ? 0.001 : blinking ? 0.12 : mood === "listening" ? 1.15 : 1;
      pupils.current.scale.y = damp(pupils.current.scale.y, sy, 30, dt);
      pupils.current.scale.x = damp(pupils.current.scale.x, happy ? 0.001 : 1, 30, dt);
    }
    if (arcs.current) {
      const s = happy ? 1 : 0.001;
      arcs.current.scale.setScalar(damp(arcs.current.scale.x, s, 18, dt));
    }
    if (mouth.current) {
      const talk = mood === "talking" ? 0.55 + Math.abs(Math.sin(t * 11) * Math.sin(t * 4.3)) * 0.9 : happy ? 1.15 : 0.55;
      mouth.current.scale.x = damp(mouth.current.scale.x, talk, 20, dt);
      mouth.current.scale.y = damp(mouth.current.scale.y, mood === "talking" ? 1.3 : 1, 20, dt);
    }

    // Antenna: secondary motion, livelier while thinking.
    if (ant.current) {
      ant.current.rotation.z = Math.sin(t * (thinking ? 5 : 1.8)) * (thinking ? 0.16 : 0.06) - (head.current?.rotation.y ?? 0) * 0.15;
      ant.current.rotation.x = Math.sin(t * 1.3 + 1) * 0.05;
    }

    // Arms: rest swing; wave; up when happy.
    if (armR.current) {
      const target = mood === "wave" ? 1.95 + Math.sin(t * 9) * 0.32 : happy ? 1.1 : thinking ? 0.5 : Math.sin(t * 1.5) * 0.06;
      armR.current.rotation.z = damp(armR.current.rotation.z, target, mood === "wave" ? 14 : 6, dt);
    }
    if (armL.current) {
      const target = happy ? -1.1 : thinking ? -0.15 : -Math.sin(t * 1.5) * 0.06;
      armL.current.rotation.z = damp(armL.current.rotation.z, target, 6, dt);
    }
  });

  return (
    <group ref={root}>
      {/* Head */}
      <group ref={head} position={[0, 0.42, 0]}>
        <mesh material={m.pearl} scale={[1.08, 0.93, 0.96]}>
          <sphereGeometry args={[1, 48, 32]} />
        </mesh>
        {/* Visor */}
        <mesh material={m.visor} position={[0, -0.04, 0.5]} scale={[0.86, 0.62, 0.52]}>
          <sphereGeometry args={[1, 48, 32]} />
        </mesh>
        {/* Ear bolts */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.gold} position={[s * 1.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.2, 0.12, 32]} />
          </mesh>
        ))}
        {/* Eyes: the two interlocked rings */}
        <group position={[0, 0.02, 1.07]}>
          <group ref={eyes}>
            <mesh material={m.gold} position={[-0.17, 0, 0]} rotation={[0, 0.14, 0]}>
              <torusGeometry args={[0.2, 0.042, 16, 56]} />
            </mesh>
            <mesh material={m.gold} position={[0.17, 0, 0.012]} rotation={[0, -0.14, 0]}>
              <torusGeometry args={[0.2, 0.042, 16, 56]} />
            </mesh>
          </group>
          <group ref={pupils} position={[0, 0, -0.02]}>
            {[-0.17, 0.17].map((x) => (
              <mesh key={x} material={m.glow} position={[x, 0, 0]}>
                <capsuleGeometry args={[0.055, 0.07, 8, 16]} />
              </mesh>
            ))}
          </group>
          <group ref={arcs} position={[0, -0.03, 0.0]} scale={0.001}>
            {[-0.17, 0.17].map((x) => (
              <mesh key={x} material={m.glow} position={[x, 0, 0]}>
                <torusGeometry args={[0.1, 0.03, 12, 32, Math.PI]} />
              </mesh>
            ))}
          </group>
        </group>
        {/* Mouth light + cheeks */}
        <mesh ref={mouth} material={m.glow} position={[0, -0.32, 1.0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.022, 0.12, 6, 12]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.blush} position={[s * 0.5, -0.22, 0.92]} rotation={[0, s * 0.55, 0]}>
            <circleGeometry args={[0.075, 24]} />
          </mesh>
        ))}
        {/* Antenna: swan neck + pearl */}
        <group ref={ant} position={[0, 0.88, 0]}>
          <mesh material={m.gold} geometry={antenna.geo} />
          <mesh material={m.pearl} position={antenna.tip}>
            <sphereGeometry args={[0.085, 32, 24]} />
          </mesh>
        </group>
      </group>

      {/* Body with the ring emblem */}
      <group position={[0, -0.82, 0]}>
        <mesh material={m.pearl} scale={[0.64, 0.6, 0.56]}>
          <sphereGeometry args={[1, 40, 28]} />
        </mesh>
        <group position={[0, 0.04, 0.6]} scale={0.42}>
          <mesh material={m.gold} position={[-0.17, 0, 0]} rotation={[0, 0.1, 0]}>
            <torusGeometry args={[0.2, 0.045, 16, 48]} />
          </mesh>
          <mesh material={m.gold} position={[0.17, 0, 0.012]} rotation={[0, -0.1, 0]}>
            <torusGeometry args={[0.2, 0.045, 16, 48]} />
          </mesh>
        </group>
      </group>

      {/* Floating mitten hands (pivot at the shoulder) */}
      <group ref={armL} position={[-0.72, -0.62, 0.22]}>
        <mesh material={m.pearl} position={[-0.12, -0.24, 0.05]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.13, 0.18, 8, 24]} />
        </mesh>
      </group>
      <group ref={armR} position={[0.72, -0.62, 0.22]}>
        <mesh material={m.pearl} position={[0.12, -0.24, 0.05]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.13, 0.18, 8, 24]} />
        </mesh>
      </group>
    </group>
  );
}

export default function KiranaScene({
  mood = "idle",
  active = true,
  interactive = true,
  onReady,
}: {
  mood?: Kirana3DMood;
  /** false pauses rendering (offscreen). */
  active?: boolean;
  /** Pointer gaze and tap reactions. */
  interactive?: boolean;
  onReady?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [poke, setPoke] = useState(0);

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: PointerEvent) => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(320, window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height * 0.4)) / Math.max(320, window.innerHeight / 2);
      pointer.current.x = THREE.MathUtils.clamp(dx, -1, 1);
      pointer.current.y = THREE.MathUtils.clamp(-dy, -1, 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive]);

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={typeof window !== "undefined" && window.innerWidth < 640 ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [0, 0.25, 8], fov: 31 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power", preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.18;
          onReady?.();
        }}
        style={{ touchAction: "pan-y" }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} color="#fff3dc" />
        <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#ffd9a0" />
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.2} color="#fff4e2" position={[0, 4, 4]} scale={[8, 3, 1]} form="rect" />
          <Lightformer intensity={1.4} color="#ffd79a" position={[-5, 1, 2]} scale={[3, 6, 1]} form="rect" />
          <Lightformer intensity={1.2} color="#ffffff" position={[5, 0, 1]} scale={[2, 6, 1]} form="rect" />
          <Lightformer intensity={0.6} color="#f3dfc0" position={[0, -3, 3]} scale={[8, 2, 1]} form="rect" />
        </Environment>
        <group
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (!interactive) return;
            e.stopPropagation();
            setPoke((n) => n + 1);
          }}
          onPointerOver={() => interactive && (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <group position={[0, -0.12, 0]}>
            <Robot mood={mood} pointer={pointer} poke={poke} />
          </group>
        </group>
        <ContactShadows position={[0, -1.6, 0]} opacity={0.32} scale={5} blur={2.6} far={2.2} color="#3a2f27" frames={1} />
      </Canvas>
    </div>
  );
}
