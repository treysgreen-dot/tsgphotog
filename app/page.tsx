'use client';

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram,
  Facebook,
  X as TwitterX,
  Youtube,
  Music2,
  ExternalLink,
  X as CloseX,
  Lock,
  Rotate3D,
} from "lucide-react";

/** ------------ Types ------------ */
type Focus =
  | { type: "null" }
  | { type: "flier" }
  | { type: "phone" }
  | { type: "trash"; url: string; id: string };

type TrashFocusType = Extract<Focus, { type: "trash" }>;
const isTrash = (f: Focus): f is TrashFocusType => f.type === "trash";

/** ------------ Image URLs (local) ------------ */
const BACKGROUND_URL = "/images/festival-ground.jpg";
const FLIER_URL = "/images/trey_flyer.webp";
const FLIER_BACK_URL = "/images/trey_flyerback.webp";
const PHONE_IDLE_URL = "/images/phone_idle.jpg";
const LOCK_WALLPAPER_URL = "/images/lock_wallpaper_1080x2400.webp";
const DINO_TRASH_URL = "/images/dinobracelet.png";
const BOTTLE_TRASH_URL = "/images/waterbottle.png";
const CUP_TRASH_URL = "/images/cup.png";
const BAND_TRASH_URL = "/images/wristband.png";

/** ------------ Random helpers ------------ */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

/** ------------ Layout (pixel-accurate, no-overlap, fully on-screen) ------------ */
type Spec = { id: string; radiusPx: number; rotRange: readonly [number, number]; fixedWidthPx?: number; boundsOverride?: { marginXPct?: number; marginYPct?: number; visibleFrac?: number }  preferCenter?: boolean; };
type PlacedPx = { id: string; cx: number; cy: number; rot: number; radiusPx: number; widthPx: number };

/** Resolve overlaps with an iterative relaxation step */
function relaxLayout(
  placed: PlacedPx[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  paddingPx: number,
  maxIters: number,
  preferMap: Record<string, boolean>
) {
  const jitter = 0.25;
  for (let iter = 0; iter < maxIters; iter++) {
    let moved = false;

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const minDist = a.radiusPx + b.radiusPx + paddingPx;

        if (dist < minDist) {
          const overlap = (minDist - dist);
          const ux = dx / dist;
          const uy = dy / dist;

          // Favor center-preferred elements (move them less)
          const aFav = !!preferMap[a.id];
          const bFav = !!preferMap[b.id];
          let moveA = 0.5;
          if (aFav && !bFav) moveA = 0.35;
          else if (!aFav && bFav) moveA = 0.65;

          const push = overlap + 0.25; // push a bit extra to avoid re-collisions
          a.cx -= ux * push * moveA;
          a.cy -= uy * push * moveA;
          b.cx += ux * push * (1 - moveA);
          b.cy += uy * push * (1 - moveA);

          // jitter to avoid stalemates
          a.cx += (Math.random() - 0.5) * jitter;
          a.cy += (Math.random() - 0.5) * jitter;
          b.cx += (Math.random() - 0.5) * jitter;
          b.cy += (Math.random() - 0.5) * jitter;

          moved = true;
        }
      }
    }

    // clamp to bounds
    for (const p of placed) {
      p.cx = Math.max(bounds.minX, Math.min(bounds.maxX, p.cx));
      p.cy = Math.max(bounds.minY, Math.min(bounds.maxY, p.cy));
    }

    if (!moved) break;
  }
}

function FlierFlip({ frontUrl, backUrl, onClose }: { frontUrl: string; backUrl: string; onClose: () => void }) {
  const [isFront, setIsFront] = useState(true);
  const { w, h } = useViewportSize();
  const natural = useImageNaturalSize(frontUrl);

  // compute container size to fit viewport while preserving image ratio
  const ratio = natural ? natural.w / natural.h : 0.707; // fallback
  const maxW = Math.min(w * 0.96, h * 0.96 * ratio);
  const width = Math.max(240, Math.floor(maxW));
  const height = Math.floor(width / ratio);

  return (
    <motion.div
      role="dialog"
      aria-modal
      className="fixed z-[90] inset-0 grid place-items-center p-3"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        layoutId="flier-img" // stays mounted so it never flies back to the ground
        className="relative [perspective:1200px]"
        style={{ width, height }}
      >
        <motion.div
          className="absolute inset-0 [transform-style:preserve-3d]"
          animate={{ rotateY: isFront ? 0 : 180 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Front */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <img src={frontUrl} alt="Flier (front)" className="w-full h-full object-contain rounded-lg" />
          </div>
          {/* Back */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <img src={backUrl} alt="Flier (back)" className="w-full h-full object-contain rounded-lg" />
          </div>
        </motion.div>

        <CloseBtn onClick={onClose} />
        <button
          onClick={() => setIsFront(f => !f)}
          className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/90 text-black text-sm"
          aria-label="Flip flier"
        >
          <Rotate3D className="h-4 w-4" />
          Flip
        </button>
      </motion.div>
    </motion.div>
  );
}

/** ------------ primitives ------------ */
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
        style={{ rotate, filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.45))" }} // default state shadow only
        transition={{ type: "spring", stiffness: 58, damping: 20 }}
      >
        {children}
      </motion.div>
    </motion.button>
  );
}

function PhoneShell({ children, noShadow = false }: { children?: React.ReactNode; noShadow?: boolean }) {
  // square corners
  return (
    <div className={`relative aspect-[9/18] w-full max-w-sm rounded-none bg-black ${noShadow ? "shadow-none" : "shadow-2xl"} ring-1 ring-white/10 overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 mt-0 h-6 bg-black/70 border-b border-white/10" />
      <div className="relative h-full w-full bg-neutral-900/90 text-white">{children}</div>
    </div>
  );
}

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
      <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${wallpaperUrl})` }} />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute top-2 left-0 right-0 px-4 flex justify-between text-[10px] opacity-90">
        <span>{`${hh}:${mm}`}</span>
        <span>5G • 100%</span>
      </div>
      <div className="absolute left-0 right-0 top-16 text-center select-none">
        <div className="text-6xl font-semibold tracking-tight">
          {hh}:{mm}
        </div>
        <div className="mt-1 text-xs opacity-90">
          {dayFmt}, {dateFmt}
        </div>
      </div>
      <div className="absolute left-3 right-3 top-40 space-y-2">
        {links.slice(0, 3).map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="block rounded-md bg-white/15 backdrop-blur border border-white/20 px-3 py-2 text-sm flex items-center gap-2">
            <l.icon className="h-4 w-4" />
            <span>{l.label}</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-80" />
          </a>
        ))}
      </div>
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
      className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-black border border-black/10"
    >
      <CloseX className="h-4 w-4" />
    </button>
  );
}
