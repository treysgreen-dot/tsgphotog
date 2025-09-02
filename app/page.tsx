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
const FLIPFLOP_TRASH_URL = "/images/flipflop.png";
const GLOWSTICK_TRASH_URL = "/images/glowstick.png";
const KEYS_TRASH_URL = "/images/keys.png";
const LIGHTER_TRASH_URL = "/images/lighter.png";
const VAPE_TRASH_URL = "/images/vape.png";

/** ------------ Random helpers ------------ */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randNorm = () => {
  // Gaussian via Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

/** ------------ Layout (pixel-accurate, no-overlap, fully on-screen) ------------ */
type Spec = {
  id: string;
  radiusPx: number;
  rotRange: readonly [number, number];
  fixedWidthPx?: number;
  boundsOverride?: { marginXPct?: number; marginYPct?: number; visibleFrac?: number };
  preferCenter?: boolean;
};
type PlacedPx = { id: string; cx: number; cy: number; rot: number; radiusPx: number; widthPx: number };

/** Resolve overlaps with an iterative relaxation step. preferMap makes favored items move less. */
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

          const push = overlap + 0.25; // small extra to avoid re-colliding
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

/** Place items with visibility bounds, optional center-bias, and relax to remove overlaps. */
function generateNonOverlappingLayoutPx(
  specs: Spec[],
  vw: number,
  vh: number,
  opts?: { marginXPct?: number; marginYPct?: number; paddingPx?: number }
): PlacedPx[] {
  // Mobile-aware visibility: keep at least 60% on screen, bump to 85% on small viewports
  const smallViewport = Math.min(vw, vh) < 700;
  const defaultVisibleFrac = smallViewport ? 0.85 : 0.6;

  // Base margins (percent), but enforce zero on small viewports per your request
  const baseMarginXPx = (opts?.marginXPct ?? 6) / 100 * vw;
  const baseMarginYPx = (opts?.marginYPct ?? 8) / 100 * vh;
  const marginXPx = smallViewport ? 0 : Math.max(baseMarginXPx, 12);
  const marginYPx = smallViewport ? 0 : Math.max(baseMarginYPx, 12);

  // Separation padding
  const requestedPad = opts?.paddingPx ?? 16;
  const padPx = Math.max(requestedPad, smallViewport ? 48 : 40);

  // Prefer-center items should be placed first, then by size
  const ordered = [...specs].sort((a, b) => {
    const ac = a.preferCenter ? 1 : 0;
    const bc = b.preferCenter ? 1 : 0;
    if (ac !== bc) return bc - ac ? -1 : 1; // ensure preferCenter first
    return b.radiusPx - a.radiusPx;
  });

  // Bounds calculator allowing per-item overrides
  const calcBounds = (R: number, s: Spec) => {
    const mx = smallViewport ? 0 : (s.boundsOverride?.marginXPct != null ? (s.boundsOverride.marginXPct / 100) * vw : marginXPx);
    const my = smallViewport ? 0 : (s.boundsOverride?.marginYPct != null ? (s.boundsOverride.marginYPct / 100) * vh : marginYPx);
    const vf = s.boundsOverride?.visibleFrac ?? defaultVisibleFrac;
    return {
      minX: mx + R * vf,
      maxX: vw - mx - R * vf,
      minY: my + R * vf,
      maxY: vh - my - R * vf,
      vf,
    };
  };

  // Initial placement with optional center bias
  const placed: PlacedPx[] = ordered.map((s) => {
    const R = s.radiusPx;
    const b = calcBounds(R, s);
    let cx: number, cy: number;

    if (s.preferCenter && Math.random() < 0.8) {
      const sigmaX = (b.maxX - b.minX) * 0.2;
      const sigmaY = (b.maxY - b.minY) * 0.2;
      cx = vw / 2 + randNorm() * sigmaX;
      cy = vh / 2 + randNorm() * sigmaY;
      cx = Math.min(b.maxX, Math.max(b.minX, cx));
      cy = Math.min(b.maxY, Math.max(b.minY, cy));
    } else {
      cx = Math.min(b.maxX, Math.max(b.minX, Math.random() * (b.maxX - b.minX) + b.minX));
      cy = Math.min(b.maxY, Math.max(b.minY, Math.random() * (b.maxY - b.minY) + b.minY));
    }

    const rot = Math.random() * (s.rotRange[1] - s.rotRange[0]) + s.rotRange[0];
    return { id: s.id, cx, cy, rot, radiusPx: R, widthPx: s.fixedWidthPx ?? (R * 2) };
  });

  // Preference map for relax
  const preferMap: Record<string, boolean> = {};
  for (const s of specs) preferMap[s.id] = !!s.preferCenter;

  // Global bounds to keep relaxation within safe region
  const perBounds = ordered.map((s) => calcBounds(s.radiusPx, s));
  const globalBounds = {
    minX: Math.min(...perBounds.map(b => b.minX)),
    maxX: Math.max(...perBounds.map(b => b.maxX)),
    minY: Math.min(...perBounds.map(b => b.minY)),
    maxY: Math.max(...perBounds.map(b => b.maxY)),
  };

  // Relax to remove overlaps; center-favored items move less
  relaxLayout(placed, globalBounds, padPx, smallViewport ? 900 : 700, preferMap);

  // Final per-item clamp
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const b = calcBounds(p.radiusPx, ordered[i]);
    p.cx = Math.max(b.minX, Math.min(b.maxX, p.cx));
    p.cy = Math.max(b.minY, Math.min(b.maxY, p.cy));
  }

  return placed;
}

/** Convert PX layout to CSS style (centered) */
const toStyleCenter = (p: PlacedPx): React.CSSProperties => ({
  position: "absolute",
  left: `${p.cx}px`,
  top: `${p.cy}px`,
  width: `${p.widthPx}px`,
  transform: "translate(-50%, -50%)",
});

/** ------------ Main Page ------------ */
export default function Page() {
  React.useEffect(() => { document.title = 'Trey Green - EPK'; }, []);
  return (
    <FestivalGroundSite
      backgroundUrl={BACKGROUND_URL}
      flierImageUrl={FLIER_URL}
      flierBackUrl={FLIER_BACK_URL}
      phoneIdleImageUrl={PHONE_IDLE_URL}
      lockWallpaperUrl={LOCK_WALLPAPER_URL}
      socials={{ instagram: "https://instagram.com/tsgphotog", youtube: "https://youtube.com", website: "https://example.com" }}
    />
  );
}

function FestivalGroundSite({
  backgroundUrl,
  flierImageUrl,
  flierBackUrl,
  phoneIdleImageUrl,
  lockWallpaperUrl,
  socials,
}: {
  backgroundUrl?: string;
  flierImageUrl?: string;
  flierBackUrl?: string;
  phoneIdleImageUrl?: string;
  lockWallpaperUrl?: string;
  socials?: Partial<{
    instagram: string; facebook: string; x: string; youtube: string; spotify: string; linktree: string; tiktok: string; website: string;
  }>;
}) {
  const [focus, setFocus] = useState<Focus>({ type: "null" });
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const set = () => {
      const vv = (window as any).visualViewport;
      setViewport({ w: vv?.width ?? window.innerWidth, h: vv?.height ?? window.innerHeight });
    };
    set();
    window.addEventListener("resize", set);
    if ((window as any).visualViewport) (window as any).visualViewport.addEventListener("resize", set);
    return () => {
      window.removeEventListener("resize", set);
      if ((window as any).visualViewport) (window as any).visualViewport.removeEventListener("resize", set);
    };
  }, []);

  const bg = backgroundUrl || "https://images.unsplash.com/photo-1561998338-13b6aa2e60ef?q=80&w=1920&auto=format&fit=crop";
  const flier = flierImageUrl || FLIER_URL;
  const flierBack = flierBackUrl || FLIER_BACK_URL;
  const phoneIdle = phoneIdleImageUrl || PHONE_IDLE_URL;
  const wallpaper = lockWallpaperUrl || LOCK_WALLPAPER_URL;

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

  // ---------- UNIFIED RESPONSIVE SCALE (short edge), CLAMPED ----------
  const placed = useMemo(() => {
    if (!viewport) return null;
    const base = 1200;                     // design reference
    const ref = Math.min(viewport.w, viewport.h);
    const raw = ref / base;
    const minScale = 0.7;
    const maxScale = 1.2;
    let scale = Math.min(maxScale, Math.max(minScale, raw));  // clamp
    // Phones: shrink everything by 50%
    if (ref < 700) scale *= 0.8;
    const W = (designPx: number) => Math.max(40, Math.round(designPx * scale)); // keep a minimum

    // Design widths (keep your proportions) — current sizes as requested
    const SIZES = {
      flier: 480,               // 75% of previous doubled size
      phone: 168,               // 75% bigger than the original 96
      dino: 160,
      band: 190,
      cup: Math.round(190 * 1.25),      // 100%
      bottle: Math.round(0.18 * base),  // 75% of doubled
      flipflop: 440,
      glowstick: 160,
      keys: 180,
      lighter: 150,
      vape: 150,
    } as const;

    const specs: Spec[] = [
      { id: "flier",         radiusPx: W(SIZES.flier)  / 2, rotRange: [-60, 60], fixedWidthPx: W(SIZES.flier), boundsOverride: { marginXPct: 1.5, marginYPct: 2 }, preferCenter: true },
      { id: "phone",         radiusPx: W(SIZES.phone)  / 2, rotRange: [-75, 75], fixedWidthPx: W(SIZES.phone), preferCenter: true },
      { id: "trash-dino",    radiusPx: W(SIZES.dino)   / 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.dino) },
      { id: "trash-band",    radiusPx: W(SIZES.band)   / 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.band) },
      { id: "trash-cup",     radiusPx: W(SIZES.cup)    / 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.cup) },
      { id: "trash-bottle",  radiusPx: W(SIZES.bottle) / 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.bottle) },
      { id: "trash-flipflop",radiusPx: W(SIZES.flipflop)/ 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.flipflop) },
      { id: "trash-glowstick",radiusPx: W(SIZES.glowstick)/ 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.glowstick) },
      { id: "trash-keys",    radiusPx: W(SIZES.keys)   / 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.keys) },
      { id: "trash-lighter", radiusPx: W(SIZES.lighter)/ 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.lighter) },
      { id: "trash-vape",    radiusPx: W(SIZES.vape)   / 2, rotRange: [-25, 25], fixedWidthPx: W(SIZES.vape) },
    ];

    return generateNonOverlappingLayoutPx(specs, viewport.w, viewport.h, {
      marginXPct: 4,
      marginYPct: 6,
      paddingPx: 40,
    });
  }, [viewport]);

  const P = useMemo(() => {
    if (!placed) return {} as Record<string, PlacedPx>;
    return Object.fromEntries(placed.map(p => [p.id, p])) as Record<string, PlacedPx>;
  }, [placed]);

  if (!viewport || !placed) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-neutral-900">
        <div aria-hidden className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${bg})` }} />
        <div className="absolute inset-0 bg-black/25" />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-neutral-900 text-white">
      <div aria-hidden className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${bg})` }} />
      <div className="absolute inset-0 bg-black/25" />

      {/* TRASH — only the provided images */}
      <div className="absolute inset-0 select-none">
        {[
          { id: "trash-dino", url: DINO_TRASH_URL },
          { id: "trash-band", url: BAND_TRASH_URL },
          { id: "trash-cup", url: CUP_TRASH_URL },
          { id: "trash-bottle", url: BOTTLE_TRASH_URL },
          { id: "trash-flipflop", url: FLIPFLOP_TRASH_URL },
          { id: "trash-glowstick", url: GLOWSTICK_TRASH_URL },
          { id: "trash-keys", url: KEYS_TRASH_URL },
          { id: "trash-lighter", url: LIGHTER_TRASH_URL },
          { id: "trash-vape", url: VAPE_TRASH_URL },
        ].map(s => (
          <GroundItem
            key={s.id}
            id={s.id}
            layoutId={s.id}
            onClick={() => setFocus({ type: "trash", url: s.url, id: s.id })}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            z={15}
            style={toStyleCenter(P[s.id])}
            rotate={P[s.id].rot}
          >
            <motion.img
              layoutId={`${s.id}-img`}
              src={s.url}
              alt={s.id}
              className="block w-full h-auto rounded-sm opacity-95" /* no outline ring */
              transition={{ layout: { duration: 0.8 } }}
            />
          </GroundItem>
        ))}
      </div>

      {/* FLIER + PHONE */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Flier */}
        <GroundItem
          id="flier"
          layoutId="flier"
          z={20}
          onClick={() => setFocus({ type: "flier" })}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={toStyleCenter(P["flier"])}
          rotate={P["flier"].rot}
        >
          <motion.img
            layoutId="flier-img"
            src={flier}
            alt="Show flier"
            className="block w-full h-auto rounded-[8px]"
            transition={{ layout: { duration: 0.8 } }}
          />
        </GroundItem>

        {/* Phone */}
        <GroundItem
          id="phone"
          layoutId="phone"
          z={30}
          onClick={() => setFocus({ type: "phone" })}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={toStyleCenter(P["phone"])}
          rotate={P["phone"].rot}
        >
          <motion.div layoutId="phone-shell" className="w-full" transition={{ layout: { duration: 0.8 } }}>
            <PhoneShell>
              <PhoneImageOnly imageUrl={phoneIdle} />
            </PhoneShell>
          </motion.div>
        </GroundItem>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {(focus.type === "flier" || focus.type === "phone") && (
          <motion.button
            aria-label="Close overlay"
            onClick={() => setFocus({ type: "null" })}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* FLIER FOCUS — persistent container + true flip */}
      <AnimatePresence>
        {focus.type === "flier" && (
          <FlierFlip
            frontUrl={flier}
            backUrl={flierBack}
            onClose={() => setFocus({ type: "null" })}
          />
        )}
      </AnimatePresence>

      {/* PHONE FOCUS — NO shadow */}
      <AnimatePresence>
        {focus.type === "phone" && (
          <motion.div
            role="dialog"
            aria-modal
            className="fixed z-[90] inset-0 grid place-items-center p-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div layoutId="phone" className="relative w-[360px] sm:w-[400px]" transition={{ layout: { duration: 0.6 } }}>
              <motion.div layoutId="phone-shell" transition={{ layout: { duration: 0.6 } }}>
                <PhoneShell noShadow>
                  <AndroidLockScreen
                    links={links.slice(0, 3)}
                    wallpaperUrl={wallpaper}
                  />
                </PhoneShell>
              </motion.div>
              <CloseBtn onClick={() => setFocus({ type: "null" })} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRASH FOCUS — keep proportions, click image or off to close */}
      <AnimatePresence>
        {isTrash(focus) && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setFocus({ type: "null" })} />
            <motion.div
              role="dialog"
              aria-modal
              className="fixed z-[90] inset-0 grid place-items-center p-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.35 }}
            >
              <motion.div layoutId={focus.id} className="relative w-auto h-auto" transition={{ layout: { duration: 0.6 } }}>
                <motion.img
                  layoutId={`${focus.id}-img`}
                  src={focus.url}
                  alt="trash"
                  onClick={() => setFocus({ type: "null" })}
                  className="block w-auto h-auto max-w-[96vw] max-h-[90vh] rounded-md cursor-pointer object-contain"
                  transition={{ layout: { duration: 0.6 } }}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ------------ Flier true 3D flip, keeps layoutId mounted ------------ */
function useViewportSize() {
  const [vp, setVp] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

function useImageNaturalSize(src: string) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);
  return size;
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
