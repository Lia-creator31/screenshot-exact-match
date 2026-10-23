import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music, Pause, CalendarPlus, MapPin, Instagram, Copy, Gift, Home, Send, Heart, MessageCircle,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import miniCastle from "@/assets/Mini_Castle.png.asset.json";
import bottomBg from "@/assets/buttom_background.png.asset.json";
import groom from "@/assets/Grooms.jpeg.asset.json";
import bride from "@/assets/Brides.jpeg.asset.json";
import couple from "@/assets/Grooms_Bride.jpeg.asset.json";
import { WEDDING, buildWhatsappUrl, getCountdown } from "./data";
import { PalaceGate } from "./PalaceGate";
import { GuestTicket } from "./GuestTicket";
import { decodeGuestToken, encodeGuestToken, normalizeCategory, type DecodedGuestTicket } from "@/lib/guests";
import { GardenIntro, FloralCorner, Butterfly, Garland, WisteriaHang, SectionSparkles, Filigree } from "./Garden";

const ease = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, y = 30, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function ScriptTitle({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <Reveal className="text-center">
      <h2 className={`font-script text-5xl ${light ? "text-cream" : "text-burgundy"}`}>{children}</h2>
      <div className="divider-gold mx-auto mt-3 w-32" />
    </Reveal>
  );
}

function Petals() {
  const petals = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({ left: (i * 37) % 100, dur: 12 + (i % 5) * 3, delay: i * 1.7, size: 8 + (i % 3) * 4, c: i % 3 })),
    [],
  );
  const colors = ["bg-lilac/60", "bg-burgundy/40", "bg-navy/30"];
  return (
    <div className="pointer-events-none fixed inset-0 z-30 mx-auto max-w-md overflow-hidden">
      {petals.map((p, i) => (
        <span
          key={i}
          className={`animate-petal absolute top-0 rounded-[60%_0_60%_0] ${colors[p.c]}`}
          style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  );
}

/* 1. COVER — cinematic palace gate (PalaceGate.tsx)
   2. INTRO — palace garden core page (Garden.tsx) */

/* 3. SAVE THE DATE */
function SaveTheDate() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const cd = getCountdown(WEDDING.dateISO, now ?? 0);
  const items = [
    ["Hari", cd.days], ["Jam", cd.hours], ["Menit", cd.minutes], ["Detik", cd.seconds],
  ] as const;
  return (
    <section className="relative isolate overflow-hidden bg-band pb-16 text-cream">
      <SectionSparkles count={9} className="top-[45%] -z-10" />
      <WisteriaHang side="left" className="z-10 w-28" />
      <WisteriaHang side="right" className="z-10 w-28" delay={0.2} />
      <Filigree corner="bl" />
      <Filigree corner="br" />
      <motion.div
        className="overflow-hidden"
        initial={{ clipPath: "inset(0 0 100% 0)" }}
        whileInView={{ clipPath: "inset(0 0 0% 0)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.4, ease }}
      >
        <img src={couple.url} alt="Nella & Broni" className="aspect-[4/5] w-full object-cover object-top" />
      </motion.div>
      <div className="px-8 pt-10">
        <ScriptTitle light>Save The Date</ScriptTitle>
        <Reveal delay={0.2} className="mt-3 text-center font-serif text-lg">{WEDDING.akad.day}</Reveal>
        <Reveal delay={0.3} className="mt-6 grid grid-cols-4 gap-3">
          {items.map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-lilac/40 bg-cream/10 py-3 text-center backdrop-blur">
              <div className="font-serif text-3xl">{now === null ? "--" : String(v).padStart(2, "0")}</div>
              <div className="text-[10px] uppercase tracking-widest text-lilac">{l}</div>
            </div>
          ))}
        </Reveal>
        {cd.done && now !== null && (
          <p className="mt-4 text-center text-sm text-lilac">Hari bahagia telah tiba ✦</p>
        )}
        <Reveal delay={0.4} className="mt-8 flex justify-center">
          <a
            href={WEDDING.calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm text-navy transition hover:bg-lilac-soft"
          >
            <CalendarPlus className="h-4 w-4" /> Simpan di Kalender
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* 4. QURAN */
function Quote() {
  return (
    <section className="paper relative isolate overflow-hidden bg-soft px-8 pb-28 pt-20 text-center">
      <Filigree corner="tl" />
      <Filigree corner="tr" />
      <Butterfly className="right-[10%] top-[38%]" size={22} dur={14} delay={0.5} path={{ x: [0, -30, -60, -20, 0], y: [0, 20, -10, 30, 0] }} />
      <Garland flip className="-bottom-4 -z-10" delay={0.2} />
      <Reveal>
        <img src={miniCastle.url} alt="" className="animate-float mx-auto -my-10 w-56" />
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-6 font-serif text-lg italic leading-relaxed text-navy">
          “Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri,
          supaya kamu cenderung dan merasa tenteram kepadanya, dan dijadikan-Nya diantaramu rasa kasih dan sayang.
          Sesungguhnya pada yang demikian itu benar-benar terdapat tanda-tanda bagi kaum yang berfikir.”
        </p>
        <div className="divider-gold mx-auto my-5 w-24" />
        <p className="font-serif text-sm font-semibold tracking-widest text-burgundy">QS. AR-RUM : 21</p>
      </Reveal>
    </section>
  );
}

/* 5. COUPLE */
function Person({ p, img, role, from }: { p: typeof WEDDING.bride; img: string; role: string; from: "left" | "right" }) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, x: from === "left" ? -60 : 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.2, ease }}
        className="relative mx-auto w-56"
      >
        <div className="oval absolute -inset-3 border border-gold/60" />
        <div className="oval absolute -inset-1.5 border-2 border-lilac" />
        <img src={img} alt={p.nick} className="oval relative aspect-[3/4] w-full object-cover shadow-soft" />
      </motion.div>
      <Reveal delay={0.2}>
        <p className="mt-6 font-script text-5xl text-burgundy">{p.nick}</p>
        <p className="mt-1 font-serif text-xl font-semibold text-navy">{p.full}</p>
        <p className="mt-2 text-xs text-muted-foreground">{role}</p>
        <p className="text-sm text-navy">{p.parents}</p>
        <a href={p.instagram} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-burgundy">
          <Instagram className="h-3.5 w-3.5" /> {p.ig}
        </a>
      </Reveal>
    </div>
  );
}

function Couple() {
  return (
    <section className="paper relative overflow-hidden bg-cream px-8 py-20">
      <Filigree corner="tl" />
      <Filigree corner="br" />
      <FloralCorner className="-right-14 -top-2 rotate-180" />
      <FloralCorner className="-left-16 top-[46%] w-40 opacity-80" delay={0.2} />
      <Butterfly className="left-[12%] top-24" size={26} dur={15} path={{ x: [0, 40, 90, 50, 0], y: [0, -20, 20, 40, 0] }} />
      <ScriptTitle>Bride and Groom</ScriptTitle>
      <Reveal delay={0.1} className="mx-auto mt-4 max-w-xs text-center text-sm text-muted-foreground">
        Maha suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Dengan memohon rahmat-Nya, kami bermaksud menyelenggarakan pernikahan kami.
      </Reveal>
      <div className="mt-14 space-y-12">
        <Person p={WEDDING.bride} img={bride.url} role="Putri dari" from="left" />
        <Reveal className="text-center font-script text-7xl text-lilac">&</Reveal>
        <Person p={WEDDING.groom} img={groom.url} role="Putra dari" from="right" />
      </div>
    </section>
  );
}

/* 6. EVENTS */
function EventBlock({ e }: { e: typeof WEDDING.akad }) {
  return (
    <div className="text-center">
      <p className="font-script text-4xl text-burgundy">{e.title}</p>
      <p className="mt-3 font-serif text-lg font-semibold text-navy">{e.day}</p>
      <p className="text-sm text-navy">{e.time}</p>
      <p className="mt-3 font-serif text-base font-semibold text-burgundy">{e.place}</p>
      <p className="mx-auto mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">{e.address}</p>
      <a href={e.maps} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2 text-xs text-primary-foreground transition hover:bg-burgundy">
        <MapPin className="h-3.5 w-3.5" /> Google Maps
      </a>
    </div>
  );
}

function Events() {
  return (
    <section className="paper relative overflow-hidden bg-soft px-6 py-20">
      <FloralCorner className="-left-12 top-6 rotate-180" flip />
      <FloralCorner className="-bottom-2 -right-12" flip delay={0.2} />
      <Butterfly className="right-[12%] top-10 z-10" size={22} dur={15} delay={0.8} path={{ x: [0, -35, -70, -25, 0], y: [0, 15, -10, 25, 0] }} />
      <Reveal y={60}>
        <div className="arch border border-lilac/60 bg-card px-6 pb-12 pt-24 shadow-soft backdrop-blur">
          <EventBlock e={WEDDING.akad} />
          <div className="my-8 flex items-center justify-center gap-3 text-lilac">
            <span className="divider-gold w-16" /><Heart className="h-4 w-4 fill-current" /><span className="divider-gold w-16" />
          </div>
          <EventBlock e={WEDDING.resepsi} />
        </div>
      </Reveal>
    </section>
  );
}

/* 7. GALLERY */
function Gallery() {
  const imgs = [couple.url, bride.url, groom.url, couple.url, groom.url, bride.url];
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="relative isolate overflow-hidden bg-band px-4 py-20">
      <SectionSparkles count={10} className="-z-10" />
      <WisteriaHang side="left" className="-z-10" />
      <WisteriaHang side="right" className="-z-10" delay={0.2} />
      <Filigree corner="bl" />
      <Filigree corner="br" />
      <ScriptTitle light>Our Gallery</ScriptTitle>
      <Reveal delay={0.1} className="mx-auto mt-3 max-w-xs text-center font-serif italic text-cream/80">
        “Every love story is beautiful, but ours is my favorite.”
      </Reveal>
      <div className="mt-8 columns-2 gap-2 [&>*]:mb-2">
        {imgs.map((src, i) => (
          <motion.button
            key={i}
            onClick={() => setOpen(src)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: (i % 2) * 0.15, ease }}
            className="block w-full overflow-hidden rounded-xl"
          >
            <img src={src} alt="" loading="lazy" className={`w-full object-cover transition duration-700 hover:scale-105 ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/90 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.img src={open} alt="" className="max-h-[85vh] rounded-2xl" initial={{ scale: 0.9 }} animate={{ scale: 1 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* 8. GIFT */
function WeddingGift() {
  const copy = async (n: string) => {
    try { await navigator.clipboard.writeText(n); toast.success("Nomor rekening disalin!"); }
    catch { toast.error("Gagal menyalin, silakan salin manual."); }
  };
  return (
    <section className="paper relative isolate overflow-hidden bg-cream px-6 pb-28 pt-20">
      <Butterfly className="right-[14%] top-14" size={24} dur={14} delay={1} path={{ x: [0, -40, -70, -20, 0], y: [0, 20, -10, 30, 0] }} />
      <Filigree corner="tl" />
      <Filigree corner="tr" />
      <Garland flip className="-bottom-4 -z-10" delay={0.2} />
      <ScriptTitle>Wedding Gift</ScriptTitle>
      <Reveal delay={0.1} className="mx-auto mt-4 max-w-xs text-center text-sm text-muted-foreground">
        Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika memberi adalah ungkapan tanda kasih, Anda dapat memberi kado secara cashless.
      </Reveal>
      <div className="mt-8 space-y-5">
        {WEDDING.banks.map((b, i) => (
          <Reveal key={b.bank} delay={i * 0.15}>
            <div className="relative overflow-hidden rounded-2xl bg-band p-5 text-cream shadow-soft">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-lilac/25" />
              <div className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-burgundy/40" />
              <div className="relative flex items-start justify-between">
                <div className="h-8 w-11 rounded-md bg-gold/80" />
                <span className="font-serif text-2xl font-bold italic tracking-wide">{b.bank}</span>
              </div>
              <p className="relative mt-6 font-mono text-xl tracking-widest">{b.number}</p>
              <div className="relative mt-2 flex items-end justify-between">
                <p className="text-xs uppercase tracking-wider text-cream/80">a.n. {b.name}</p>
                <button onClick={() => copy(b.number)} className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-xs text-navy">
                  <Copy className="h-3 w-3" /> Salin Rekening
                </button>
              </div>
            </div>
          </Reveal>
        ))}
        <Reveal delay={0.3}>
          <div className="rounded-2xl border border-lilac/60 bg-card p-6 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lilac-soft text-burgundy"><Gift className="h-5 w-5" /></div>
            <p className="mt-3 font-serif text-lg font-semibold text-navy">Kirim Kado</p>
            <p className="mt-2 text-sm text-navy">{WEDDING.gift.name} · {WEDDING.gift.phone}</p>
            <p className="mt-1 flex items-start justify-center gap-1 text-xs text-muted-foreground"><Home className="mt-0.5 h-3 w-3 shrink-0" /> {WEDDING.gift.address}</p>
            <button onClick={() => copy(WEDDING.gift.address)} className="mt-4 inline-flex items-center gap-1 rounded-full border border-burgundy px-3 py-1.5 text-xs text-burgundy"><Copy className="h-3 w-3" /> Salin Alamat</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const inputCls = "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-navy outline-none placeholder:text-muted-foreground focus:border-lilac focus:ring-2 focus:ring-lilac/30";

/* 9. RSVP */
function Rsvp({ guest }: { guest: string | null }) {
  const [form, setForm] = useState({ name: guest ?? "", address: "", attend: "Hadir", guests: "1" });
  useEffect(() => {
    if (guest) setForm((prev) => ({ ...prev, name: prev.name || guest }));
  }, [guest]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Mohon isi nama Anda"); return; }
    window.open(buildWhatsappUrl(WEDDING.whatsapp, form), "_blank");
  };
  return (
    <section className="relative isolate overflow-hidden bg-soft px-6 py-20">
      <FloralCorner className="-right-14 -top-2 w-44 rotate-180" />
      <FloralCorner className="-bottom-3 -left-14 -z-10 w-40" flip delay={0.2} />
      <Butterfly className="left-[10%] top-20" size={22} dur={15} delay={0.6} path={{ x: [0, 40, 80, 30, 0], y: [0, -15, 20, 35, 0] }} />
      <ScriptTitle>Reservasi</ScriptTitle>
      <Reveal delay={0.1} className="mt-3 text-center text-sm text-muted-foreground">Mohon konfirmasi kehadiran Anda</Reveal>
      <Reveal delay={0.2}>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-lilac/50 bg-card p-6 shadow-soft">
          <input className={inputCls} placeholder="Nama" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Alamat" maxLength={150} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            {["Hadir", "Tidak Hadir", "Ragu-ragu"].map((o) => (
              <label key={o} className={`cursor-pointer rounded-xl border px-2 py-2.5 text-center text-xs transition ${form.attend === o ? "border-burgundy bg-burgundy text-primary-foreground" : "border-input text-navy"}`}>
                <input type="radio" name="attend" className="sr-only" checked={form.attend === o} onChange={() => setForm({ ...form, attend: o })} />
                {o}
              </label>
            ))}
          </div>
          <select className={inputCls} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} orang</option>)}
          </select>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm text-primary-foreground transition hover:bg-burgundy">
            <Send className="h-4 w-4" /> Reservasi via Whatsapp
          </button>
        </form>
      </Reveal>
    </section>
  );
}

/* 10. WISHES */
type Wish = { name: string; msg: string; time: string };
function Wishes() {
  const [wishes, setWishes] = useState<Wish[]>(WEDDING.wishes);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("wishes");
    if (saved) setWishes([...JSON.parse(saved), ...WEDDING.wishes]);
  }, []);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) { toast.error("Nama dan ucapan wajib diisi"); return; }
    const w = { name: name.trim().slice(0, 60), msg: msg.trim().slice(0, 500), time: "Baru saja" };
    const mine = [w, ...JSON.parse(localStorage.getItem("wishes") || "[]")];
    localStorage.setItem("wishes", JSON.stringify(mine));
    setWishes([w, ...wishes]);
    setName(""); setMsg("");
    toast.success("Terima kasih atas ucapannya!");
  };
  return (
    <section className="relative isolate overflow-hidden bg-band px-6 py-20">
      <SectionSparkles count={10} className="-z-10" />
      <WisteriaHang side="left" className="-z-10" />
      <WisteriaHang side="right" className="-z-10" delay={0.2} />
      <Filigree corner="bl" />
      <Filigree corner="br" />
      <ScriptTitle light>Wedding Wish</ScriptTitle>
      <Reveal delay={0.1}>
        <form onSubmit={submit} className="mt-8 space-y-3 rounded-3xl bg-cream p-5">
          <p className="flex items-center gap-2 text-sm text-navy"><MessageCircle className="h-4 w-4 text-burgundy" /> {wishes.length} Ucapan</p>
          <input className={inputCls} placeholder="Nama" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <textarea className={`${inputCls} min-h-24`} placeholder="Tulis ucapan & doa" value={msg} maxLength={500} onChange={(e) => setMsg(e.target.value)} />
          <button className="w-full rounded-xl bg-burgundy py-3 text-sm text-primary-foreground">Kirim Ucapan</button>
          <div className="max-h-80 space-y-3 overflow-y-auto pt-2">
            {wishes.map((w, i) => (
              <div key={i} className="rounded-xl bg-lilac-soft p-3">
                <p className="text-sm font-medium text-navy">{w.name} <span className="text-[10px] font-normal text-muted-foreground">· {w.time}</span></p>
                <p className="mt-1 text-sm text-navy/80">{w.msg}</p>
              </div>
            ))}
          </div>
        </form>
      </Reveal>
    </section>
  );
}

/* 11. FOOTER */
function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-cream px-6 pb-24 pt-10 text-center">
      <SectionSparkles count={7} className="-z-10" />
      <Butterfly className="left-[10%] top-[48%]" size={22} dur={16} path={{ x: [0, 50, 90, 40, 0], y: [0, -25, 10, 30, 0] }} />
      <Garland flip className="-bottom-3 w-[104%] opacity-90" delay={0.3} />
      <Reveal y={50}><img src={bottomBg.url} alt="" className="mx-auto w-full" /></Reveal>
      <Reveal delay={0.2}>
        <p className="mx-auto mt-4 max-w-xs text-sm text-muted-foreground">
          Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.
        </p>
        <p className="mt-6 font-serif text-xs uppercase tracking-[0.35em] text-navy">The Wedding of</p>
        <p className="mt-1 font-script text-5xl text-burgundy">{WEDDING.bride.nick} & {WEDDING.groom.nick}</p>
        <p className="mt-2 font-serif tracking-[0.3em] text-navy">{WEDDING.dateShort}</p>
      </Reveal>
    </footer>
  );
}

export function Invitation() {
  const [opened, setOpened] = useState(false);
  const [entering, setEntering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [guest, setGuest] = useState<string | null>(null);
  const [ticket, setTicket] = useState<DecodedGuestTicket | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gParam = params.get("g");
    const toParam = params.get("to");
    const catParam = params.get("cat") || params.get("kategori");

    const decoded = decodeGuestToken(gParam);
    if (decoded) {
      setTicket(decoded);
      setGuest(decoded.name);
    } else if (toParam && toParam.trim()) {
      const name = toParam.trim();
      const category = normalizeCategory(catParam);
      const id = "NB-GUEST";
      setGuest(name);
      setTicket({
        id,
        name,
        category,
        token: encodeGuestToken({ id, name, category }),
      });
    }
  }, []);

  const displayTicket = useMemo<DecodedGuestTicket>(
    () =>
      ticket ?? {
        id: "NB-DEMO",
        name: "Tamu Kehormatan",
        category: "VIP",
        token: encodeGuestToken({ id: "NB-DEMO", name: "Tamu Kehormatan", category: "VIP" }),
      },
    [ticket],
  );
  useEffect(() => {
    document.body.style.overflow = opened ? "" : "hidden";
  }, [opened]);

  const open = () => {
    window.scrollTo({ top: 0 });
    setEntering(true); // mount the garden behind the gate so the doors open onto it
    audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const arrive = () => {
    window.scrollTo({ top: 0 });
    setOpened(true);
  };
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  };

  return (
    <div className="min-h-screen bg-lilac-soft">
      <div className="relative mx-auto max-w-md overflow-hidden bg-cream shadow-soft">
        <AnimatePresence>{!opened && <PalaceGate guest={guest} category={ticket?.category ?? null} onOpen={open} onDone={arrive} />}</AnimatePresence>
        {/* The garden is always mounted behind the gate (seen through its doors);
            its entry timeline starts when the gate is opened. */}
        {(
          <main>
            <Petals />
            <GardenIntro play={entering || opened} />
            <SaveTheDate />
            <Quote />
            <Couple />
            <Events />
            <GuestTicket ticket={displayTicket} />
            <Gallery />
            <WeddingGift />
            <Rsvp guest={guest} />
            <Wishes />
            <Footer />
          </main>
        )}
        <audio ref={audio} src={WEDDING.music} loop preload="none" />
        {opened && (
          <button
            onClick={toggle}
            aria-label={playing ? "Jeda musik" : "Putar musik"}
            className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-lilac bg-cream text-burgundy shadow-soft md:right-[calc(50%-14rem+1.25rem)]"
          >
            {playing ? <Music className="h-5 w-5 animate-spin [animation-duration:4s]" /> : <Pause className="h-5 w-5" />}
          </button>
        )}
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
