import { useMemo, useRef, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import castle from "@/assets/Castle.png.asset.json";
import flowerBush from "@/assets/flower_bush.webp";
import wisteria from "@/assets/wisteria.webp";
import butterflyImg from "@/assets/butterfly.webp";
import garland from "@/assets/garland.webp";
import { WEDDING } from "./data";
import { GATE_ORIGIN, GATE_T as T } from "./PalaceGate";
import { Waterfall } from "./Waterfall";

const ease = [0.22, 1, 0.36, 1] as const;

/* A watercolor butterfly fluttering along a gentle looping path. */
export function Butterfly({ className, size = 34, path, dur = 14, delay = 0 }: { className?: string; size?: number; path: { x: number[]; y: number[] }; dur?: number; delay?: number }) {
  return (
    <motion.div
      className={`gpu pointer-events-none absolute ${className ?? ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 1, 0.9, 1], x: path.x, y: path.y, rotate: [-8, 10, -6, 12, -10, -8] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: size }}
    >
      <img src={butterflyImg} alt="" className="animate-flap w-full" style={{ animationDuration: `${0.28 + (size % 5) * 0.03}s` }} />
    </motion.div>
  );
}

function Sparkles({ count = 9 }: { count?: number }) {
  const s = useMemo(() => Array.from({ length: count }, (_, i) => ({ l: 6 + ((i * 41) % 88), t: 10 + ((i * 23) % 70), d: i * 0.55, z: 3 + (i % 3) * 2 })), [count]);
  return (
    <>
      {s.map((p, i) => (
        <span key={i} className="animate-twinkle pointer-events-none absolute rounded-full bg-gold" style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.z, height: p.z, animationDelay: `${p.d}s`, boxShadow: "0 0 8px var(--gold)" }} />
      ))}
    </>
  );
}

/* Decorative watercolor bouquet for section corners. */
export function FloralCorner({ className, flip, delay = 0 }: { className?: string; flip?: boolean; delay?: number }) {
  return (
    <motion.img
      src={flowerBush}
      alt=""
      loading="lazy"
      className={`pointer-events-none absolute w-48 ${className ?? ""}`}
      style={{ scaleX: flip ? -1 : 1 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 0.95, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.4, delay, ease }}
    />
  );
}

function Layer({ x, y, className, children }: { x: MotionValue<number>; y: MotionValue<string>; className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={`gpu pointer-events-none absolute inset-0 ${className ?? ""}`} style={{ x, y }}>
      {children}
    </motion.div>
  );
}

/* Core page: a calm palace garden — the castle, soft wisteria framing and the
   gate's cream / gold / burgundy palette, with only a few gentle accents.
   It sits behind the palace gate from the start (seen through the gate's
   lattice) and only starts its timeline when `play` turns on: the camera then
   dollies in with the gate (same focus point + timeline) and arrives at the
   castle, where the names appear. There is no second gate here. */
export function GardenIntro({ play = true }: { play?: boolean }) {
  const reduce = useReducedMotion();
  const k = reduce ? 0.3 : 1;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yFar = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const yNear = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"]);
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const px = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 40, damping: 16 });
  const xFar = useTransform(sx, (v) => v * -6);
  const xNear = useTransform(sx, (v) => v * -18);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
  };

  /* Camera dolly that mirrors the gate: far away while seen through the
     doorway, then glides forward until the garden fills the screen. */
  const camTotal = T.pushStart + T.pushDur;
  const at = (s: number) => s / camTotal;

  return (
    <section ref={ref} onPointerMove={onMove} onPointerLeave={() => px.set(0)} className="bg-sky relative flex h-svh flex-col items-center justify-end overflow-hidden">
      <motion.div
        className="gpu pointer-events-none absolute inset-0"
        style={{ transformOrigin: GATE_ORIGIN }}
        initial={{ scale: 0.62 }}
        animate={play ? { scale: [0.62, 0.66, 0.69, 1] } : { scale: 0.62 }}
        transition={{ duration: camTotal * k, times: [0, at(T.approach), at(T.pushStart), 1], ease: [ease, "linear", [0.25, 0.6, 0.35, 1]] }}
      >
        {/* FAR: warm glow + castle */}
        <Layer x={xFar} y={yFar}>
          <span className="animate-glow absolute left-1/2 top-[6%] h-48 w-48 -translate-x-1/2 rounded-full bg-lantern" />
          <motion.div className="absolute inset-0" initial={{ opacity: 0.85, scale: 1.12 }} animate={play ? { opacity: 1, scale: 1 } : { opacity: 0.85, scale: 1.12 }} transition={{ duration: (T.pushStart + T.pushDur) * k, ease }}>
            {/* Castle and its living waterfall share one cover box so they stay aligned */}
            <div className="stage-cover">
              <div className="animate-kenburns absolute inset-0">
                <img src={castle.url} alt="Castle" className="h-full w-full" width={1080} height={1920} />
                <Waterfall />
              </div>
            </div>
          </motion.div>
        </Layer>

        {/* Soft cream ground that gives the title calm space (the pool stays visible above it) */}
        <div className="absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-cream from-25% via-cream/60 to-transparent" />

        {/* NEAR: a light wisteria frame, echoing the blossoms on the gate */}
        <Layer x={xNear} y={yNear}>
          <motion.div className="absolute -left-[8%] -top-[4%] w-[32%]" initial={{ opacity: 0, y: -40 }} animate={play ? { opacity: 0.9, y: 0 } : { opacity: 0, y: -40 }} transition={{ duration: 1.8, delay: T.doorsStart * k, ease }}>
            <img src={wisteria} alt="" className="animate-sway w-full" />
          </motion.div>
          <motion.div className="absolute -right-[8%] -top-[4%] w-[32%] -scale-x-100" initial={{ opacity: 0, y: -40 }} animate={play ? { opacity: 0.9, y: 0 } : { opacity: 0, y: -40 }} transition={{ duration: 1.8, delay: (T.doorsStart + 0.2) * k, ease }}>
            <img src={wisteria} alt="" className="animate-sway w-full [animation-delay:-3s]" />
          </motion.div>
        </Layer>
      </motion.div>

      <motion.div className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: play ? 1 : 0 }} transition={{ duration: 1.5, delay: T.titleIn * k }}>
        <Sparkles count={5} />
        <Butterfly className="left-[20%] top-[40%]" size={28} dur={18} delay={2.5} path={{ x: [0, 60, 110, 60, 10, 0], y: [0, -40, 10, 50, 20, 0] }} />
      </motion.div>

      {/* Title — same type, colours and gold divider as the gate cover */}
      <motion.div className="relative z-10 pb-14 text-center" style={{ y: yText, opacity: fade }}>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 1.4, delay: T.titleIn * k, ease }}>
          <p className="font-serif text-xs uppercase tracking-[0.4em] text-navy">We are getting married</p>
          <h2 className="mt-2 font-script text-6xl text-burgundy drop-shadow-[0_2px_8px_var(--cream)]">{WEDDING.bride.nick} & {WEDDING.groom.nick}</h2>
          <div className="divider-gold mx-auto mt-3 w-32" />
          <p className="mt-3 font-serif text-sm tracking-[0.3em] text-navy">{WEDDING.dateShort}</p>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ---------- Light section decorations (used from the 2nd page to the end) ---------- */

/* A watercolor floral garland that drapes softly over a section edge. */
export function Garland({ className, flip, delay = 0 }: { className?: string; flip?: boolean; delay?: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute left-1/2 w-[112%] -translate-x-1/2 ${className ?? ""}`}
      style={{ scaleY: flip ? -1 : 1 }}
      initial={{ opacity: 0, y: flip ? 16 : -16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.4, delay, ease }}
    >
      <img
        src={garland}
        alt=""
        loading="lazy"
        width={900}
        height={191}
        className="animate-sway-soft w-full"
        style={{ animationDuration: "9s" }}
      />
    </motion.div>
  );
}

/* Wisteria hanging from a top corner, swaying in the breeze. */
export function WisteriaHang({ className, side = "left", delay = 0 }: { className?: string; side?: "left" | "right"; delay?: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute top-0 w-24 ${side === "left" ? "-left-5" : "-right-5"} ${className ?? ""}`}
      style={{ scaleX: side === "right" ? -1 : 1 }}
      initial={{ opacity: 0, y: -30 }}
      whileInView={{ opacity: 0.95, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 1.6, delay, ease }}
    >
      <img src={wisteria} alt="" loading="lazy" width={520} height={780} className="animate-sway w-full" style={{ animationDelay: side === "right" ? "-3.5s" : "0s" }} />
    </motion.div>
  );
}

/* Tiny gold twinkles scattered over a section. */
export function SectionSparkles({ count = 9, className }: { count?: number; className?: string }) {
  const dots = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ left: (i * 41 + 7) % 96, top: (i * 29 + 11) % 92, d: (i * 0.7) % 3, s: 3 + (i % 3) * 2 })),
    [count],
  );
  return (
    <div className={`pointer-events-none absolute inset-0 ${className ?? ""}`}>
      {dots.map((p, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full bg-gold glow-gold"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.s, height: p.s, animationDelay: `${p.d}s`, animationDuration: `${3 + (i % 4)}s` }}
        />
      ))}
    </div>
  );
}

/* Fine gold filigree flourish for section corners (inline SVG, inherits text color). */
export function Filigree({ className, corner = "tl" }: { className?: string; corner?: "tl" | "tr" | "bl" | "br" }) {
  const rot = { tl: "", tr: "-scale-x-100", bl: "-scale-y-100", br: "-scale-100" }[corner];
  const pos = { tl: "left-3 top-3", tr: "right-3 top-3", bl: "bottom-3 left-3", br: "bottom-3 right-3" }[corner];
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" className={`pointer-events-none absolute h-16 w-16 text-gold opacity-80 ${pos} ${rot} ${className ?? ""}`} aria-hidden>
      <path d="M4 96 V30 Q4 4 30 4 H96" />
      <path d="M12 96 V36 Q12 12 36 12 H96" opacity=".55" />
      <path d="M22 22 q14 4 18 18 q-14 -2 -18 -18 Z" />
      <path d="M30 4 q-2 12 8 18 M4 30 q12 -2 18 8" />
      <circle cx="22" cy="22" r="2.2" fill="currentColor" />
      <path d="M52 12 q8 -8 16 0 q-8 8 -16 0 Z M12 52 q-8 8 0 16 q8 -8 0 -16 Z" opacity=".8" />
    </svg>
  );
}
