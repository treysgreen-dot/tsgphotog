'use client';

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Instagram,
  Facebook,
  X as TwitterX,
  Youtube,
  Music2,
  ExternalLink,
  X as CloseX,
  Lock,
} from "lucide-react";

type Focus =
  | { type: "null" }
  | { type: "flier" }
  | { type: "phone" }
  | { type: "trash"; url: string; id: string };

type TrashFocusType = Extract<Focus, { type: "trash" }>;
function isTrash(f: Focus): f is TrashFocusType { return f.type === "trash"; }

const BACKGROUND_URL = "/images/festival-ground.jpg";
const FLIER_URL = "/images/trey_flyer.webp";
const PHONE_IDLE_URL = "/images/phone_idle.jpg"; // default image on device before click
const LOCK_WALLPAPER_URL = "/images/lock_wallpaper_1080x2400.webp"; // used on lock screen after click
const DINO_TRASH_URL = "/images/dinobracelet.png"; // <-- add this image to public/images/

/** random helpers */
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

/** Treat each item as a circle to avoid overlap. Radius is in viewport % (vw-ish). */
type LayoutSpec = { id: string; radius: number; rotRange: readonly [number, number] };
type Placed = { id: string; left: number; top: number; rot: number; radius: number };

function generateNonOverlappingLayout(specs: LayoutSpec[], opts?: { marginX?: number; marginY?: number; padding?: number }) {
  const marginX = opts?.marginX ?? 6;
  const marginY = opts?.marginY ?? 10;
  const padding = opts?.padding ?? 2; // extra spacing between circles (in %)

  const placed: Placed[] = [];

  // place largest first
  const ordered = [...specs].sort((a, b) => b.radius - a.radius);

  for (const s of ordered) {
    let tries = 0;
    while (tries++ < 500) {
      const left = rand(marginX + s.radius, 100 - marginX - s.radius);
      const top = rand(marginY + s.radius, 100 - marginY - s.radius);
      const rot = rand(s.rotRange[0], s.rotRange[1]);

      const ok = placed.every((p) => {
        const dx = p.left - left;
        const dy = p.top - top;
        const d = Math.hypot(dx, dy);
        return d >= p.radius + s.radius + padding;
      });

      if (ok) { placed.push({ id: s.id, left, top, rot, radius: s.radius }); break; }
    }
    // if failed to place after many tries, still push somewhere (fallback)
    if (!placed.find(p => p.id === s.id)) {
      placed.push({ id: s.id, left: rand(marginX, 100 - marginX), top: rand(marginY, 100 - marginY), rot: 0, radius: s.radius });
    }
  }

  return placed;
}

export default function Page() {
  return (
    <FestivalGroundSite
      backgroundUrl={BACKGROUND_URL}
      flierImageUrl={FLIER_URL}
      phoneIdleImageUrl={PHONE_IDLE_URL}
      lockWallpaperUrl={LOCK_WALLPAPER_URL}
      socials={{ instagram: "https://instagram.com/tsgphotog", youtube: "https://youtube.com", website: "https://example.com" }}
    />
  );
}

function FestivalGroundSite({
  backgroundUrl,
  flierImageUrl,
  phoneIdleImageUrl,
  lockWallpaperUrl,
  socials,
}: {
  backgroundUrl?: string;
  flierImageUrl?: string;
  phoneIdleImageUrl?: string;
  lockWallpaperUrl?: string;
  socials?: Partial<{
    instagram: string; facebook: string; x: string; youtube: string; spotify: string; linktree: string; tiktok: string; website: string;
  }>;
}) {
  const [focus, setFocus] = useState<Focus>({ type: null });
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    if (focus.type === "trash") {
      const t = setTimeout(() => setShow3D(true), 420);
      return () => clearTimeout(t);
    }
    setShow3D(false);
  }, [focus]);

  const bg = backgroundUrl || "https://images.unsplash.com/photo-1561998338-13b6aa2e60ef?q=80&w=1920&auto=format&fit=crop";
  const flier = flierImageUrl || "https://images.unsplash.com/photo-1549497538-303791108f95?q=80&w=1200&auto=format&fit=crop";
  const phoneIdle = phoneIdleImageUrl || "/images/phone_idle.jpg";
  const wallpaper = lockWallpaperUrl || "/images/lock_wallpaper_1080x2400.webp";

  const links = useMemo(() => {
    const L: { label: string; href: string; icon: React.ElementType }[] = [];
    if (socials?.instagram) L.push({ label: "Instagram", href: socials.instagram, icon: Instagram });
    if (socials?.facebook) L.push({ label: "Facebook", href: socials.facebook, icon: Facebook });
    if (socials?.x) L.push({ label: "X / Twitter", href: socials.x, icon: TwitterX });
    if (socials?.youtube) L.push({ label: "YouTube", href: socials.youtube, icon: Youtube });
    if (socials?.spotify) L.push({ label: "Spotify", href: socials.spotify, icon: Music2 });
    if (socials?.tiktok) L.push({ label: "TikTok", href: socials.tiktok, icon: ExternalLink });
    if (socials?.linktree) L.push({ label: "Linktree", href: socials.linktree, icon: ExternalLink });
    if (socials?.website) L.push({ label: "Website", href: socials.website, icon: ExternalLink });
    if (L.length === 0) L.push(
      { label: "Instagram", href: "https://instagram.com/tsgphotog", icon: Instagram },
      { label: "YouTube", href: "https://youtube.com", icon: Youtube },
      { label: "Website", href: "https://example.com", icon: ExternalLink }
    );
    return L;
  }, [socials]);

  // Trash sources (added dino bracelet)
  const trashImgs: { id: string; url: string; radius: number; widthPx?: number }[] = [
    { id: "trash-1", url: "https://images.unsplash.com/photo-1520975922215-230f53b95d2f?q=80&w=400&auto=format&fit=crop", radius: 4.5 },
    { id: "trash-2", url: "https://images.unsplash.com/photo-1543429258-5df4b1e2d2ab?q=80&w=400&auto=format&fit=crop", radius: 4.0 },
    { id: "trash-3", url: "https://images.unsplash.com/photo-1559070217-7f0a1a5a8f4b?q=80&w=400&auto=format&fit=crop", radius: 5.0 },
    { id: "trash-4", url: "https://images.unsplash.com/photo-1520975443608-5cbf39f8b5c7?q=80&w=400&auto=format&fit=crop", radius: 5.5 },
    { id: "trash-5", url: "https://images.unsplash.com/photo-1542834369-f10ebf06d3cb?q=80&w=400&auto=format&fit=crop", radius: 3.8 },
    { id: "trash-dino", url: DINO_TRASH_URL, radius: 4.0, widthPx: 80 }, // new small item
  ];

  // Rotation ranges as typed tuples
  const FLIER_ROT: readonly [number, number] = [-60, 60];
  const PHONE_ROT: readonly [number, number] = [-75, 75];
  const TRASH_ROT: readonly [number, number] = [-25, 25];

  // Generate random layout (no overlap) once per load
  const placed = useMemo(() => {
    const specs: LayoutSpec[] = [
      { id: "flier", radius: 10, rotRange: FLIER_ROT },
      { id: "phone", radius: 4, rotRange: PHONE_ROT }, // 50% smaller phone (radius halved)
      ...trashImgs.map(t => ({ id: t.id, radius: t.radius, rotRange: TRASH_ROT } as LayoutSpec)),
    ];
    return generateNonOverlappingLayout(specs, { marginX: 6, marginY: 10, padding: 1.5 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Utility to read layout by id
  const P = useMemo(() => Object.fromEntries(placed.map(p => [p.id, p])) as Record<string, Placed>, [placed]);

  const trashFocus: TrashFocusType | null = isTrash(focus) ? focus : null;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-neutral-900 text-white">
      <div aria-hidden className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${bg})` }} />
      <div className="absolute inset-0 bg-black/25" />

      {/* CLICKABLE TRASH (random, non-overlapping) */}
      <div className="absolute inset-0 select-none">
        {trashImgs.map((s) => (
          <GroundItem
            key={s.id}
            id={s.id}
            layoutId={s.id}
            onClick={() => setFocus({ type: "trash", url: s.url, id: s.id })}
            className="absolute"
            z={15}
            style={{
              position: "absolute",
              left: `${P[s.id].left}%`,
              top: `${P[s.id].top}%`,
              width: s.widthPx ? `${s.widthPx}px` : `${P[s.id].radius * 2}vw`,
              maxWidth: s.widthPx ? `${s.widthPx}px` : "220px",
              minWidth: s.widthPx ? `${s.widthPx}px` : "60px",
            }}
            rotate={P[s.id].rot}
          >
            <motion.img
              layoutId={`${s.id}-img`}
              src={s.url}
              alt={s.id}
              className="block w-full h-auto rounded-sm opacity-95 shadow-xl ring-1 ring-black/30"
              transition={{ layout: { duration: 0.8 } }}
            />
          </GroundItem>
        ))}
      </div>

      {/* FLIER + PHONE (random, non-overlapping) */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Flier */}
        <GroundItem
          id="flier"
          layoutId="flier"
          z={20}
          onClick={() => setFocus({ type: "flier" })}
          className="absolute"
          style={{
            position: "absolute",
            left: `${P["flier"].left}%`,
            top: `${P["flier"].top}%`,
            width: `${P["flier"].radius * 2}vw`, // ~20vw
            maxWidth: "480px",
            minWidth: "160px",
          }}
          rotate={P["flier"].rot}
        >
          <motion.img
            layoutId="flier-img"
            src={flier}
            alt="Show flier"
            className="block w-full h-auto rounded-[8px] shadow-xl ring-1 ring-black/30"
            transition={{ layout: { duration: 0.8 } }}
          />
        </GroundItem>

        {/* Phone — DEFAULT: idle image only; FOCUS: lock screen with wallpaper (50% smaller) */}
        <GroundItem
          id="phone"
          layoutId="phone"
          z={30}
          onClick={() => setFocus({ type: "phone" })}
          className="absolute"
          style={{
            position: "absolute",
            left: `${P["phone"].left}%`,
            top: `${P["phone"].top}%`,
            width: `${P["phone"].radius * 2}vw`, // ~8vw (half of previous 16vw)
            maxWidth: "180px",
            minWidth: "70px",
          }}
          rotate={P["phone"].rot}
        >
          <motion.div layoutId="phone-shell" className="w-full" transition={{ layout: { duration: 0.8 } }}>
            <PhoneShell>
              <PhoneImageOnly imageUrl={phoneIdle} />
            </PhoneShell>
          </motion.div>
        </GroundItem>
      </div>

      {/* BACKDROP */}
      <AnimatePresence>
        {focus.type && (
          <motion.button
            aria-label="Close overlay"
            onClick={() => setFocus({ type: null })}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* FLIER FOCUS */}
      <AnimatePresence>
        {focus.type === "flier" && (
          <motion.div
            role="dialog"
            aria-modal
            className="fixed z-[90] inset-0 grid place-items-center p-4"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              layoutId="flier"
              className="relative max-w-3xl w-full"
              transition={{ layout: { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] } }}
            >
              <motion.img
                layoutId="flier-img"
                src={flier}
                alt="Flier detail"
                className="w-full h-auto rounded-xl shadow-2xl"
                transition={{ layout: { duration: 0.8 } }}
              />
              <CloseBtn onClick={() => setFocus({ type: null })} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHONE FOCUS — Android lock screen with wallpaper */}
      <AnimatePresence>
        {focus.type === "phone" && (
          <motion.div
            role="dialog"
            aria-modal
            className="fixed z-[90] inset-0 grid place-items-center p-4"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              layoutId="phone"
              className="relative w-[360px] sm:w-[400px]"
              transition={{ layout: { duration: 0.8 } }}
            >
              <motion.div layoutId="phone-shell" transition={{ layout: { duration: 0.8 } }}>
                <PhoneShell>
                  <AndroidLockScreen links={links} wallpaperUrl={wallpaper} />
                </PhoneShell>
              </motion.div>
              <CloseBtn onClick={() => setFocus({ type: null })} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRASH FOCUS — lift, then 3D viewer */}
      <AnimatePresence>
        {isTrash(focus) && (
          <TrashFocus focus={focus} show3D={show3D} onClose={() => setFocus({ type: null })} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- primitives

function GroundItem({
  id,
  layoutId,
  children,
  onClick,
  className = "",
  z = 10,
  style,
  rotate,
}: {
  id: string;
  layoutId?: string;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  z?: number;
  style?: React.CSSProperties;
  rotate?: number;
}) {
  return (
    <motion.button
      aria-label={`Open ${id}`}
      onClick={onClick}
      className={`pointer-events-auto ${className}`}
      style={{ zIndex: z, ...(style ?? {}) }}
      initial={{ y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
    >
      <motion.div
        layoutId={layoutId}
        className="[perspective:1000px]"
        // Drive rotation via Framer's style prop & add drop shadow
        style={{ rotate, filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.45))" }}
        transition={{ type: "spring", stiffness: 58, damping: 20 }}
      >
        {children}
      </motion.div>
    </motion.button>
  );
}

function PhoneShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative aspect-[9/18] w-full max-w-sm rounded-[32px] bg-black shadow-2xl ring-1 ring-white/10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 h-6 w-32 rounded-full bg-black/70 border border-white/10" />
      <div className="relative h-full w-full bg-neutral-900/90 text-white">{children}</div>
    </div>
  );
}

/** Default phone state: show a single image (no text) */
function PhoneImageOnly({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${imageUrl})` }} />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}

function AndroidLockScreen({
  links,
  wallpaperUrl,
}: {
  links: { label: string; href: string; icon: React.ElementType }[];
  wallpaperUrl: string;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const dayFmt = now.toLocaleDateString(undefined, { weekday: "short" });
  const dateFmt = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="relative h-full w-full">
      {/* wallpaper */}
      <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${wallpaperUrl})` }} />
      <div className="absolute inset-0 bg-black/35" />
      {/* status bar */}
      <div className="absolute top-2 left-0 right-0 px-4 flex justify-between text-[10px] opacity-90">
        <span>{`${hh}:${mm}`}</span>
        <span>5G • 100%</span>
      </div>
      {/* time & date */}
      <div className="absolute left-0 right-0 top-16 text-center select-none">
        <div className="text-6xl font-semibold tracking-tight">
          {hh}:{mm}
        </div>
        <div className="mt-1 text-xs opacity-90">
          {dayFmt}, {dateFmt}
        </div>
      </div>
      {/* notifications list (links) */}
      <div className="absolute left-3 right-3 top-40 space-y-2">
        {links.slice(0, 3).map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2 text-sm flex items-center gap-2"
          >
            <l.icon className="h-4 w-4" />
            <span>{l.label}</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-80" />
          </a>
        ))}
      </div>
      {/* lock hint */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs opacity-90">
        <div className="mx-auto mb-2 w-10 h-1.5 rounded-full bg-white/60" />
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20">
          <Lock className="h-3 w-3" /> Swipe up to unlock
        </div>
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-black shadow-2xl border border-black/10"
    >
      <CloseX className="h-4 w-4" />
    </button>
  );
}

function ImageCard({ url }: { url: string }) {
  const texture = React.useMemo(() => new THREE.TextureLoader().load(url), [url]);
  return (
    <mesh castShadow receiveShadow rotation={[0, 0, 0]}>
      <planeGeometry args={[1.6, 1.0]} />
      <meshStandardMaterial map={texture} roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

function SuspenseFallback() {
  return (
    <Html center>
      <div className="text-white text-sm bg-black/50 px-3 py-2 rounded">Loading…</div>
    </Html>
  );
}

function TrashFocus({
  focus,
  show3D,
  onClose,
}: {
  focus: TrashFocusType;
  show3D: boolean;
  onClose: () => void;
}) {
  return (
    <motion.div
      role="dialog"
      aria-modal
      className="fixed z-[90] inset-0 grid place-items-center p-4"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        layoutId={focus.id}
        className="relative w-full max-w-3xl"
        transition={{ layout: { duration: 0.8 } }}
      >
        <motion.img
          layoutId={`${focus.id}-img`}
          src={focus.url}
          alt="trash"
          className="w-full h-auto rounded-xl shadow-2xl"
          style={{ aspectRatio: "16 / 10" }}
          transition={{ layout: { duration: 0.8 } }}
        />
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden ring-1 ring-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: show3D ? 1 : 0 }}
          transition={{ duration: 0.45 }}
        >
          {show3D && (
            <Canvas camera={{ position: [0, 0, 2.6], fov: 45 }}>
              <ambientLight intensity={0.9} />
              <directionalLight position={[2, 3, 4]} intensity={0.8} />
              <SuspenseFallback />
              <ImageCard url={focus.url} />
              <OrbitControls
                enableDamping
                dampingFactor={0.08}
                minDistance={1.2}
                maxDistance={6}
              />
            </Canvas>
          )}
        </motion.div>
        <div className="absolute top-2 left-2 text-xs bg-white/10 backdrop-blur px-2 py-1 rounded">
          Drag to rotate • Scroll to zoom
        </div>
        <CloseBtn onClick={onClose} />
      </motion.div>
    </motion.div>
  );
}
