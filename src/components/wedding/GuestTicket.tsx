import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Crown, Sparkles, Maximize2, Download } from "lucide-react";
import QRCode from "qrcode";
import { WEDDING } from "./data";
import { Filigree, Garland } from "./Garden";
import type { DecodedGuestTicket } from "@/lib/guests";

const ease = [0.22, 1, 0.36, 1] as const;

export function GuestTicket({ ticket }: { ticket: DecodedGuestTicket }) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(ticket.token, {
      width: 480,
      margin: 2,
      color: {
        dark: "#1e2336",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ticket.token]);

  const isVip = ticket.category === "VIP";

  const downloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `QR-Undangan-${ticket.name.replace(/\s+/g, "-")}-${ticket.category}.png`;
    a.click();
  };

  return (
    <section className="paper relative isolate overflow-hidden bg-cream px-6 pb-24 pt-12 text-center">
      <Filigree corner="tl" />
      <Filigree corner="tr" />
      <Garland flip className="-bottom-4 -z-10 w-[96%] opacity-90" delay={0.2} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1, ease }}
      >
        <h2 className="font-script text-5xl text-burgundy">Access Card</h2>
        <div className="divider-gold mx-auto mt-3 w-32" />
        <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Tunjukkan QR Code E-Ticket ini kepada petugas penerima tamu di pintu masuk gedung acara.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1, delay: 0.15, ease }}
        className="relative mx-auto mt-8 max-w-xs overflow-hidden rounded-3xl border-2 border-gold/60 bg-card shadow-soft"
      >
        {/* Top Ticket Header */}
        <div className={`px-6 py-4 text-cream ${isVip ? "bg-band" : "bg-navy"}`}>
          <p className="font-serif text-[10px] uppercase tracking-[0.3em] text-lilac">
            E-Ticket Undangan Pernikahan
          </p>
          <p className="mt-0.5 font-script text-3xl text-cream">
            {WEDDING.bride.nick} & {WEDDING.groom.nick}
          </p>
        </div>

        {/* Guest Info & Badge */}
        <div className="px-6 pt-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Nama Tamu</p>
          <p className="mt-1 font-serif text-2xl font-bold text-navy">{ticket.name}</p>

          <div className="mt-3 flex justify-center">
            {isVip ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-burgundy px-4 py-1 font-serif text-xs font-bold uppercase tracking-[0.22em] text-cream shadow-sm">
                <Crown className="h-3.5 w-3.5 text-gold" /> VIP Guest
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lilac bg-lilac-soft px-4 py-1 font-serif text-xs font-semibold uppercase tracking-[0.2em] text-navy">
                <Sparkles className="h-3.5 w-3.5 text-burgundy" /> Reguler
              </span>
            )}
          </div>
        </div>

        {/* Dashed Ticket Cutout Divider */}
        <div className="relative my-5 flex items-center justify-between">
          <span className="-ml-3 h-6 w-6 rounded-full border border-gold/50 bg-cream" />
          <div className="w-full border-t-2 border-dashed border-lilac/60" />
          <span className="-mr-3 h-6 w-6 rounded-full border border-gold/50 bg-cream" />
        </div>

        {/* QR Code Box */}
        <div className="px-6 pb-6">
          <div
            onClick={() => setZoom(true)}
            className="group relative mx-auto aspect-square w-48 cursor-pointer overflow-hidden rounded-2xl border border-lilac/60 bg-white p-3 shadow-inner transition hover:scale-[1.02]"
          >
            {qrUrl ? (
              <img src={qrUrl} alt={`QR Code ${ticket.name}`} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <QrCode className="h-10 w-10 animate-pulse" />
              </div>
            )}
          </div>

          <p className="mt-3 font-mono text-xs tracking-widest text-muted-foreground">{ticket.id}</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-burgundy px-3.5 py-1.5 text-xs text-burgundy transition hover:bg-burgundy hover:text-primary-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Perbesar QR
            </button>
            <button
              type="button"
              onClick={downloadQr}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-1.5 text-xs text-primary-foreground transition hover:bg-burgundy"
            >
              <Download className="h-3.5 w-3.5" /> Simpan QR
            </button>
          </div>
        </div>
      </motion.div>

      {/* Fullscreen QR Modal for easy scanning at the gate */}
      <AnimatePresence>
        {zoom && qrUrl && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/90 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(false)}
          >
            <motion.div
              className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-serif text-lg font-bold text-navy">{ticket.name}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-burgundy">
                Kategori: {ticket.category}
              </p>
              <img src={qrUrl} alt="QR Code Full" className="mx-auto my-4 aspect-square w-64 object-contain" />
              <p className="font-mono text-xs tracking-widest text-muted-foreground">{ticket.id}</p>
              <button
                type="button"
                onClick={() => setZoom(false)}
                className="mt-5 w-full rounded-xl bg-navy py-2.5 text-xs font-medium text-white"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

