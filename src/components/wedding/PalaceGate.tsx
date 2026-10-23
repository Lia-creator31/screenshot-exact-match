import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Mail } from "lucide-react";
import gateFrame from "@/assets/gate_frame.webp";
import doorLeft from "@/assets/gate_door_left.webp";
import doorRight from "@/assets/gate_door_right.webp";
import butterflyImg from "@/assets/butterfly.webp";
import { WEDDING } from "./data";
import type { GuestCategory } from "@/lib/guests";

const ease = [0.22, 1, 0.36, 1] as const;
const inOut = [0.65, 0, 0.35, 1] as const;

/* The single main gate: the original watercolor floral stone arch set into the
   palace garden wall, with gilded wrought-iron doors inside the arch.
   Doorway position inside the gate artwork (percent of the 1080x1920 image). */
const DOOR = { left: 31.85, seam: 50.93, right: 70.0, top: 31.98, bottom: 78.18 };
/* Camera focus point (the doorway centre) — shared with the garden behind the gate. */
export const GATE_ORIGIN = "50.9% 55%";
const ORIGIN = GATE_ORIGIN;
const maskOf = (src: string) => ({ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" });

/* Cinematic timeline (seconds after "Buka Undangan" is tapped).
   The real garden page (GardenIntro) sits behind the gate the whole time and
   follows this same timeline, so the doors open onto the actual garden. */
export const GATE_T = {
  textOut: 0.9,
  approach: 2.2, // camera glides toward the gate
  seamStart: 1.2, // light glints along the seam of the doors
  doorsStart: 2.0,
  doorsDur: 3.2,
  pushStart: 4.3, // camera passes through the doorway
  pushDur: 3.4,
  titleIn: 7.2, // names appear once we have arrived
  done: 7.8,
};
const T = GATE_T;

export function PalaceGate({
  guest,
  category,
  onOpen,
  onDone,
}: {
  guest: string | null;
  category?: GuestCategory | null;
  onOpen: () => void;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const k = reduce ? 0.3 : 1;
  const [enter, setEnter] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const start = () => {
    if (enter) return;
    setEnter(true);
    onOpen();
    timer.current = setTimeout(onDone, T.done * 1000 * k);
  };

  const dust = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ left: 8 + ((i * 53) % 84), bottom: 4 + ((i * 29) % 30), dur: 7 + (i % 5) * 1.6, delay: i * 0.7, size: 2 + (i % 3) })),
    [],
  );
  const petals = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ left: 6 + ((i * 47) % 88), dur: 13 + (i % 3) * 4, delay: i * 2.3, size: 8 + (i % 3) * 3, c: i % 3 })),
    [],
  );
  const petalColors = ["bg-burgundy/45", "bg-lilac/60", "bg-navy/30"];

  const gateTotal = T.pushStart + T.pushDur;
  const at = (s: number, total: number) => s / total;

  return (
    <motion.section
      /* The section itself is see-through: the garden page behind it is what
         shows through the lattice of the doors and, later, the open doorway. */
      className="fixed inset-0 z-50 mx-auto max-w-md overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 1.6 * k, ease }}
      aria-label="Gerbang istana"
    >
      {/* Soft cream mist that clears to reveal the garden through the gate */}
      <motion.div className="absolute inset-0 bg-cream" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 2.2, delay: 0.9, ease }} />

      <div className="stage-cover">
        {/* Gate — approach, doors open, camera passes through */}
        <motion.div
          className="gpu absolute inset-0"
          style={{ transformOrigin: ORIGIN, perspective: 1300 }}
          initial={{ scale: 1.06, opacity: 1 }}
          animate={
            enter
              ? { scale: [1, 1.15, 1.17, 5.2], opacity: [1, 1, 1, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={
            enter
              ? {
                  duration: gateTotal * k,
                  times: [0, at(T.approach, gateTotal), at(T.pushStart, gateTotal), 1],
                  ease: [ease, "linear", [0.6, 0, 0.9, 0.55]],
                  opacity: { duration: gateTotal * k, times: [0, 0.5, 0.86, 1] },
                }
              : { duration: 2.4, ease }
          }
        >
          {/* warm light pouring through the doorway */}
          <motion.div
            className="bg-doorlight absolute"
            style={{ left: `${DOOR.left}%`, top: `${DOOR.top}%`, width: `${DOOR.right - DOOR.left}%`, height: `${DOOR.bottom - DOOR.top}%` }}
            initial={{ opacity: 0 }}
            animate={enter ? { opacity: [0, 0.5, 0.25, 0] } : { opacity: 0 }}
            transition={{ delay: T.doorsStart * k, duration: (T.doorsDur + 1.6) * k, times: [0, 0.3, 0.65, 1] }}
          />

          {/* Gilded wrought-iron doors swing inward on their hinges */}
          <motion.div
            className="gpu absolute"
            style={{ left: `${DOOR.left}%`, top: `${DOOR.top}%`, width: `${DOOR.seam - DOOR.left}%`, height: `${DOOR.bottom - DOOR.top}%`, transformOrigin: "left center" }}
            animate={enter ? { rotateY: 100 } : { rotateY: 0 }}
            transition={{ delay: T.doorsStart * k, duration: T.doorsDur * k, ease: inOut }}
          >
            <img src={doorLeft} alt="" className="h-full w-full drop-shadow-[0_6px_6px_oklch(0.3_0.07_265/0.35)]" />
            <motion.div className="absolute inset-0 bg-navy" style={maskOf(doorLeft)} initial={{ opacity: 0 }} animate={{ opacity: enter ? 0.5 : 0 }} transition={{ delay: T.doorsStart * k, duration: T.doorsDur * k }} />
          </motion.div>
          <motion.div
            className="gpu absolute"
            style={{ left: `${DOOR.seam}%`, top: `${DOOR.top}%`, width: `${DOOR.right - DOOR.seam}%`, height: `${DOOR.bottom - DOOR.top}%`, transformOrigin: "right center" }}
            animate={enter ? { rotateY: -100 } : { rotateY: 0 }}
            transition={{ delay: T.doorsStart * k, duration: T.doorsDur * k, ease: inOut }}
          >
            <img src={doorRight} alt="" className="h-full w-full drop-shadow-[0_6px_6px_oklch(0.3_0.07_265/0.35)]" />
            <motion.div className="absolute inset-0 bg-navy" style={maskOf(doorRight)} initial={{ opacity: 0 }} animate={{ opacity: enter ? 0.5 : 0 }} transition={{ delay: T.doorsStart * k, duration: T.doorsDur * k }} />
          </motion.div>

          {/* Floral stone arch in the palace wall (doorway cut out so the doors sit inside it;
              the hanging ivy and plants at the threshold stay in front of the doors) */}
          <img src={gateFrame} alt="Gerbang taman istana" className="absolute inset-0 h-full w-full" width={1080} height={1920} />

          {/* Lantern glow */}
          <span className="bg-lantern animate-glow absolute h-[9%] w-[16%] rounded-full" style={{ left: "-2.8%", top: "31.4%" }} />
          <span className="bg-lantern animate-glow absolute h-[9%] w-[16%] rounded-full [animation-delay:1.3s]" style={{ left: "86.8%", top: "31.4%" }} />

          {/* Golden glint along the seam before the doors part */}
          <motion.span
            className="seam-glow absolute w-[0.45%] rounded-full"
            style={{ left: `${DOOR.seam - 0.22}%`, top: `${DOOR.top + 8}%`, height: `${DOOR.bottom - DOOR.top - 10}%`, transformOrigin: "center" }}
            initial={{ opacity: 0, scaleY: 0.2 }}
            animate={enter ? { opacity: [0, 0.9, 0.9, 0], scaleY: [0.2, 1, 1, 1] } : { opacity: 0, scaleY: 0.2 }}
            transition={{ delay: T.seamStart * k, duration: 2.4 * k, times: [0, 0.4, 0.6, 1] }}
          />

          {/* Soft sheen gliding across the gilded doors */}
          <div
            className="pointer-events-none absolute overflow-hidden"
            style={{ left: `${DOOR.left}%`, top: `${DOOR.top}%`, width: `${DOOR.right - DOOR.left}%`, height: `${DOOR.bottom - DOOR.top}%` }}
          >
            <div className="bg-sheen animate-sheen absolute inset-y-0 w-1/2" />
          </div>

          {/* A pair of butterflies drifting around the roses on the arch */}
          <motion.img
            src={butterflyImg}
            alt=""
            className="gpu pointer-events-none absolute w-[5.5%]"
            style={{ left: "24%", top: "24%" }}
            animate={{ x: [0, 18, 34, 14, 0], y: [0, -14, 6, 20, 0], rotate: [-8, 10, -6, 12, -8] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={butterflyImg}
            alt=""
            className="gpu pointer-events-none absolute w-[4.2%] -scale-x-100"
            style={{ left: "74%", top: "52%" }}
            animate={{ x: [0, -16, -28, -8, 0], y: [0, 12, -10, -18, 0], rotate: [6, -8, 10, -6, 6] }}
            transition={{ duration: 19, delay: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Floating gold dust + a few drifting rose petals */}
      <div className="pointer-events-none absolute inset-0">
        {dust.map((d, i) => (
          <span
            key={i}
            className="animate-dust absolute rounded-full bg-gold"
            style={{ left: `${d.left}%`, bottom: `${d.bottom}%`, width: d.size, height: d.size, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s`, boxShadow: "0 0 6px var(--gold)" }}
          />
        ))}
        {petals.map((p, i) => (
          <span
            key={`p${i}`}
            className={`animate-petal absolute top-0 rounded-[60%_0_60%_0] ${petalColors[p.c]}`}
            style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
          />
        ))}
      </div>

      {/* Soft bloom of light as the doors part and we step into the garden */}
      <motion.div
        className="bg-doorlight pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={enter ? { opacity: [0, 0.25, 0.15, 0] } : { opacity: 0 }}
        transition={{ delay: (T.doorsStart + 0.6) * k, duration: (T.pushStart + T.pushDur - T.doorsStart) * k, times: [0, 0.3, 0.7, 1] }}
      />

      {/* Invitation card */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={enter ? { opacity: 0, y: -14, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
        transition={enter ? { duration: T.textOut * k, ease } : { duration: 1.2, delay: 0.6, ease }}
        style={{ pointerEvents: enter ? "none" : "auto" }}
      >
        <div className="cover-veil flex flex-col items-center rounded-full px-10 py-14">
          <p className="font-serif text-sm uppercase tracking-[0.35em] text-navy">The Wedding of</p>
          <h1 className="mt-3 font-script text-6xl leading-tight text-burgundy">
            {WEDDING.bride.nick}
            <span className="block text-4xl text-lilac">&</span>
            {WEDDING.groom.nick}
          </h1>
          <p className="mt-3 font-serif text-lg tracking-[0.3em] text-navy">{WEDDING.dateShort}</p>
          {guest && (
            <div className="mt-6 flex flex-col items-center">
              <p className="text-xs text-muted-foreground">Kepada Yth. Bapak/Ibu/Saudara/i</p>
              <p className="mt-1 font-serif text-xl font-semibold text-navy">{guest}</p>
              {category && (
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-3.5 py-0.5 font-serif text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    category === "VIP"
                      ? "border border-gold bg-burgundy text-cream shadow-sm"
                      : "border border-lilac bg-lilac-soft text-navy"
                  }`}
                >
                  {category === "VIP" ? "✦ VIP ✦" : "Reguler"}
                </span>
              )}
            </div>
          )}
          <button
            onClick={start}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-burgundy px-6 py-3 text-sm tracking-wide text-primary-foreground shadow-soft transition hover:scale-105"
          >
            <Mail className="h-4 w-4" /> Buka Undangan
          </button>
        </div>
      </motion.div>
    </motion.section>
  );
}
