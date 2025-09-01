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
} from "lucide-react";

/** ------------ Types ------------ */
type Focus =
  | { type: "null" }
  | { type: "flier" }
  | { type: "phone" }
  | { type: "trash"; url: string; id: string };

type TrashFocusType = Extract<Focus, { type: "trash" }>;
const isTrash = (f: Focus): f is TrashFocusType => f.type === "trash";

/** ------------ Image URLs ------------ */
const BACKGROUND_URL = "/images/festival-ground.jpg";
const FLIER_URL = "/images/trey_flyer.webp";
const PHONE_IDLE_URL = "/images/phone_idle.jpg";
const LOCK_WALLPAPER_URL = "/images/lock_wallpaper_1080x2400.webp";
const DINO_TRASH_URL = "/images/dinobracelet.png";
const BOTTLE_TRASH_URL = "/images/waterbottle.png";

/** ------------ Random helpers ------------ */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

/** ------------ Layout (pixel-accurate, no-overlap, fully on-screen) ------------ */
type Spec = { id: string; radiusPx: number; rotRange: readonly [number, number]; fixedWidthPx?: number };
type PlacedPx = { id: string; cx: number; cy: number; rot: number; radiusPx: number; widthPx: number };

/** Place circles by center (cx, cy) in PX, ensuring fully inside viewport and not overlapping. */
function generateNonOverlappingLayoutPx(
  specs: Spec[],
  vw: number,
  vh: number,
  opts?: { marginXPct?: number; marginYPct?: number; paddingPx?: number }
): PlacedPx[] {
  const marginXPx = (opts?.marginXPct ?? 6) / 100 * vw;
  const marginYPx = (opts?.marginYPct ?? 8) / 100 * vh;
  const paddingPx = opts?.paddingPx ?? 14;

  const placed: PlacedPx[] = [];
  const ordered = [...specs].sort((a, b) => b.radiusPx - a.radiusPx);

  for (const s of ordered) {
    const R = s.radiusPx;
    let tries = 0;
    let placedOne: PlacedPx | null = null;
    const minX = marginXPx + R;
    const maxX = vw - marginXPx - R;
    const minY = marginYPx + R;
    const maxY = vh - marginYPx - R;

    while (tries++ < 900) {
      const cx = rand(minX, maxX);
      const cy = rand(minY, maxY);
      const rot = rand(s.rotRange[0], s.rotRange[1]);

      const ok = placed.every(p => {
        const dx = p.cx - cx;
        const dy = p.cy - cy;
        return Math.hypot(dx, dy) >= (p.radiusPx + R + paddingPx);
      });

      if (ok) {
        placedOne = { id: s.id, cx, cy, rot, radiusPx: R, widthPx: s.fixedWidthPx ?? (R * 2) };
        break;
      }
    }
    if (!placedOne) {
      // fallback: clamp to inside bounds
      const cx = Math.max(minX, Math.min(maxX, vw / 2));
      const cy = Math.max(minY, Math.min(maxY, vh / 2));
      placedOne = { id: s.id, cx, cy, rot: 0, radiusPx: R, widthPx: s.fixedWidthPx ?? (R * 2) };
    }
    placed.push(placedOne);
  }

  return placed;
}

/** Convert PX layout to CSS style with percentages (centered via translate) */
const toStyleCenter = (p: PlacedPx): React.CSSProperties => ({
  position: "absolute",
  left: `${(p.cx)}px`,
  top: `${(p.cy)}px`,
  width: `${p.widthPx}px`,
  transform: "translate(-50%, -50%)",
});

/** ------------ Main Page ------------ */
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
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const set = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

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

  // Prepare specs once viewport known
  const placed = useMemo(() => {
    if (!viewport) return null;
    const vw = viewport.w;

    // utilities to convert vw radius to px
    const vwToPx = (vwPercent: number) => (vwPercent / 100) * vw;

    // all interactive items including flier and phone
    const specs: Spec[] = [
      // flier ~20vw wide => radiusPx = 10vw
      { id: "flier", radiusPx: vwToPx(10), rotRange: [-60, 60] },
      // phone 50% of previous ~16vw => radiusPx = 4vw
      { id: "phone", radiusPx: vwToPx(4), rotRange: [-75, 75] },
      // trash: mix of vw-based and fixed px
      { id: "trash-1", radiusPx: vwToPx(4.5), rotRange: [-25, 25] },
      { id: "trash-2", radiusPx: vwToPx(4.0), rotRange: [-25, 25] },
      { id: "trash-3", radiusPx: vwToPx(5.0), rotRange: [-25, 25] },
      { id: "trash-4", radiusPx: vwToPx(5.5), rotRange: [-25, 25] },
      { id: "trash-5", radiusPx: vwToPx(3.8), rotRange: [-25, 25] },
      // bracelet fixed 80px width => radius 40px
      { id: "trash-dino", radiusPx: 40, rotRange: [-25, 25], fixedWidthPx: 80 },
      // bottle roughly bigger visual
      { id: "trash-bottle", radiusPx: vwToPx(6), rotRange: [-25, 25] },
    ];

    return generateNonOverlappingLayoutPx(specs, viewport.w, viewport.h, {
      marginXPct: 4,
      marginYPct: 6,
      paddingPx: 16,
    });
  }, [viewport]);

  const P = useMemo(() => {
    if (!placed) return {} as Record<string, PlacedPx>;
    return Object.fromEntries(placed.map(p => [p.id, p])) as Record<string, PlacedPx>;
  }, [placed]);

  if (!viewport || !placed) {
    // fill background while computing
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

      {/* TRASH */}
      <div className="absolute inset-0 select-none">
        {[
          { id: "trash-1", url: "https://images.unsplash.com/photo-1520975922215-230f53b95d2f?q=80&w=400&auto=format&fit=crop" },
          { id: "trash-2", url: "https://images.unsplash.com/photo-1543429258-5df4b1e2d2ab?q=80&w=400&auto=format&fit=crop" },
          { id: "trash-3", url: "https://images.unsplash.com/photo-1559070217-7f0a1a5a8f4b?q=80&w=400&auto=format&fit=crop" },
          { id: "trash-4", url: "https://images.unsplash.com/photo-1520975443608-5cbf39f8b5c7?q=80&w=400&auto=format&fit=crop" },
          { id: "trash-5", url: "https://images.unsplash.com/photo-1542834369-f10ebf06d3cb?q=80&w=400&auto=format&fit=crop" },
          { id: "trash-dino", url: DINO_TRASH_URL },
          { id: "trash-bottle", url: BOTTLE_TRASH_URL },
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
              className="block w-full h-auto rounded-sm opacity-95 ring-1 ring-black/30"
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
            className="block w-full h-auto rounded-[8px] shadow-xl ring-1 ring-black/30"
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

      {/* PHONE FOCUS */}
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
            <motion.div layoutId="phone" className="relative w-[360px] sm:w-[400px]" transition={{ layout: { duration: 0.8 } }}>
              <motion.div layoutId="phone-shell" transition={{ layout: { duration: 0.8 } }}>
                <PhoneShell>
                  <AndroidLockScreen
                    links={links}
                    wallpaperUrl={LOCK_WALLPAPER_URL}
                  />
                </PhoneShell>
              </motion.div>
              <CloseBtn onClick={() => setFocus({ type: null })} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRASH FOCUS — plain image, click-off closes */}
      <AnimatePresence>
        {isTrash(focus) && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setFocus({ type: null })} />
            <motion.div
              role="dialog"
              aria-modal
              className="fixed z-[90] inset-0 grid place-items-center p-4"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div layoutId={focus.id} className="relative w-full max-w-3xl" transition={{ layout: { duration: 0.8 } }}>
                <motion.img
                  layoutId={`${focus.id}-img`}
                  src={focus.url}
                  alt="trash"
                  className="w-full h-auto rounded-xl shadow-2xl"
                  style={{ aspectRatio: "16 / 10" }}
                  transition={{ layout: { duration: 0.8 } }}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
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
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="block rounded-xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2 text-sm flex items-center gap-2">
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
      className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-black shadow-2xl border border-black/10"
    >
      <CloseX className="h-4 w-4" />
    </button>
  );
}
