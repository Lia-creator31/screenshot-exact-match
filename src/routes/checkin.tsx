import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import jsQR from "jsqr";
import * as XLSX from "xlsx";
import { toast, Toaster } from "sonner";
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Crown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Download,
  ArrowLeft,
  ImageUp,
  UserCheck,
  RotateCcw,
} from "lucide-react";
import type { GuestRecord } from "@/lib/guests";
import {
  type CheckInResult,
  fetchGuests,
  processQrCheckIn,
  updateGuestStatus,
} from "@/lib/guest-store";
import { WEDDING } from "@/components/wedding/data";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [{ title: `Scan Check-In & Rekap Kehadiran — ${WEDDING.bride.nick} & ${WEDDING.groom.nick}` }],
  }),
  component: CheckInPage,
});

function playBeep(type: "success" | "warning" | "error") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "warning") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // ignore audio errors
  }
}

function CheckInPage() {
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);

  // Rekap filter & search
  const [tab, setTab] = useState<"PRESENT" | "ABSENT" | "ALL">("PRESENT");
  const [search, setSearch] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchGuests().then(setGuests);
  }, []);

  const handleScanCode = useCallback(async (rawCode: string) => {
    const now = Date.now();
    // Prevent duplicate rapid triggers on the same QR code within 3.5 seconds
    if (lastScanRef.current.code === rawCode && now - lastScanRef.current.time < 3500) {
      return;
    }
    lastScanRef.current = { code: rawCode, time: now };

    const res = await processQrCheckIn(rawCode);
    setGuests(res.guests);
    setLastResult(res);

    if (res.status === "success") {
      playBeep("success");
      toast.success(`Check-in Berhasil: ${res.guest?.name} (${res.guest?.category})`);
    } else if (res.status === "already_checked_in") {
      playBeep("warning");
      toast.warning(`${res.guest?.name} sudah check-in sebelumnya!`);
    } else {
      playBeep("error");
      toast.error("QR Code tidak dikenali sebagai tiket undangan.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user" = facingMode) => {
      stopCamera();
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);

        const tick = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: "dontInvert",
              });
              if (code && code.data) {
                void handleScanCode(code.data);
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        setCameraError(
          "Kamera tidak dapat diakses. Pastikan izin kamera diaktifkan atau gunakan fitur Scan dari Gambar / Cari Nama di bawah.",
        );
        setCameraActive(false);
      }
    },
    [facingMode, handleScanCode, stopCamera],
  );

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleFlipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    if (cameraActive) {
      void startCamera(next);
    }
  };

  const handleImageScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code && code.data) {
        void handleScanCode(code.data);
      } else {
        toast.error("Tidak ditemukan QR Code pada gambar tersebut.");
      }
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  const handleManualCheckIn = async (g: GuestRecord) => {
    const res = await processQrCheckIn(g.token);
    setGuests(res.guests);
    setLastResult(res);
    if (res.status === "success") {
      playBeep("success");
      toast.success(`${g.name} (${g.category}) berhasil dicatat hadir!`);
    } else if (res.status === "already_checked_in") {
      toast.warning(`${g.name} sudah berstatus hadir.`);
    }
  };

  const handleUndoCheckIn = async (g: GuestRecord) => {
    const updated = await updateGuestStatus(g.id, { checkedInAt: null });
    setGuests(updated);
    if (lastResult?.guest?.id === g.id) setLastResult(null);
    toast.success(`Status hadir ${g.name} dibatalkan`);
  };

  const stats = useMemo(() => {
    const total = guests.length;
    const present = guests.filter((g) => Boolean(g.checkedInAt));
    const vipPresent = present.filter((g) => g.category === "VIP").length;
    const regPresent = present.length - vipPresent;
    const totalVip = guests.filter((g) => g.category === "VIP").length;
    const totalReg = total - totalVip;
    return {
      total,
      presentCount: present.length,
      absentCount: total - present.length,
      vipPresent,
      regPresent,
      totalVip,
      totalReg,
    };
  }, [guests]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = guests.filter((g) => {
      if (tab === "PRESENT" && !g.checkedInAt) return false;
      if (tab === "ABSENT" && g.checkedInAt) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    });
    // Sort PRESENT by newest check-in first
    if (tab === "PRESENT") {
      return [...list].sort(
        (a, b) => new Date(b.checkedInAt ?? 0).getTime() - new Date(a.checkedInAt ?? 0).getTime(),
      );
    }
    return list;
  }, [guests, tab, search]);

  const handleExportAttendanceExcel = () => {
    if (guests.length === 0) {
      toast.error("Belum ada data kehadiran untuk diekspor.");
      return;
    }
    const rows = guests.map((g, idx) => ({
      No: idx + 1,
      "Kode Tiket": g.id,
      "Nama Tamu": g.name,
      Kategori: g.category,
      "Nomor WA": g.phoneRaw || g.phone || "-",
      "Status Kehadiran": g.checkedInAt ? "HADIR" : "BELUM HADIR",
      "Waktu Check-In": g.checkedInAt ? new Date(g.checkedInAt).toLocaleString("id-ID") : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");
    XLSX.writeFile(wb, `Rekap_Kehadiran_Hari_H_${WEDDING.bride.nick}_${WEDDING.groom.nick}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-lilac-soft/60 pb-20 text-navy">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-lilac/40 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <p className="font-serif text-xs uppercase tracking-[0.25em] text-burgundy">
              Penerima Tamu & Pintu Masuk Hari-H
            </p>
            <h1 className="font-serif text-xl font-bold text-navy">
              Scanner QR & Rekap Kehadiran — {WEDDING.bride.nick} & {WEDDING.groom.nick}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-navy/30 bg-white px-4 py-2 text-xs font-semibold text-navy transition hover:bg-lilac-soft"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Halaman Admin & WA
            </Link>
            <button
              type="button"
              onClick={handleExportAttendanceExcel}
              className="inline-flex items-center gap-1.5 rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-navy"
            >
              <Download className="h-3.5 w-3.5" /> Export Rekap (.xlsx)
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-6">
        {/* Top Scanner & Result Grid */}
        <div className="grid gap-5 md:grid-cols-12">
          {/* Camera Box */}
          <div className="rounded-3xl border border-lilac/60 bg-cream p-5 shadow-sm md:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-navy">Kamera Scan QR Tamu</h2>
              <div className="flex items-center gap-1.5">
                {cameraActive && (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="inline-flex items-center gap-1 rounded-xl border border-lilac bg-white px-2.5 py-1.5 text-xs text-navy"
                    title="Putar Kamera"
                  >
                    <SwitchCamera className="h-4 w-4" /> Putar
                  </button>
                )}
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-burgundy px-3.5 py-1.5 text-xs font-semibold text-white"
                  >
                    <Camera className="h-4 w-4" /> Aktifkan Kamera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white"
                  >
                    <CameraOff className="h-4 w-4" /> Matikan
                  </button>
                )}
              </div>
            </div>

            <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-2xl border-2 border-gold/60 bg-navy">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {cameraActive ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-56 w-56 rounded-3xl border-2 border-gold shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-cream">
                  <Camera className="h-12 w-12 text-lilac" />
                  <p className="mt-3 font-serif text-base font-semibold">Kamera Scanner Belum Aktif</p>
                  <p className="mt-1 max-w-xs text-xs text-cream/75">
                    Klik tombol <strong>Aktifkan Kamera</strong> lalu arahkan ke QR Code pada undangan HP tamu.
                  </p>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold text-navy shadow-md transition hover:scale-105"
                  >
                    <Camera className="h-4 w-4" /> Mulai Scan Sekarang
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{cameraError}</p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Atau pindai dari file tangkapan layar QR:
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-lilac bg-white px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-lilac-soft">
                <ImageUp className="h-3.5 w-3.5 text-burgundy" /> Pilih Gambar QR
                <input type="file" accept="image/*" onChange={handleImageScan} className="hidden" />
              </label>
            </div>
          </div>

          {/* Scan Result Display (Big VIP / Reguler Status Banner) */}
          <div className="flex flex-col justify-between rounded-3xl border border-lilac/60 bg-cream p-5 shadow-sm md:col-span-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-navy">Layar Identitas Tamu (Hasil Scan)</h2>
              <p className="text-xs text-muted-foreground">
                Menampilkan nama tamu dan status kategori <strong>VIP / Reguler</strong> secara otomatis saat QR di-scan.
              </p>

              {!lastResult ? (
                <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-lilac bg-white/70 p-6 text-center">
                  <UserCheck className="h-12 w-12 text-lilac" />
                  <p className="mt-3 font-serif text-base font-semibold text-navy">
                    Menunggu Scan QR Code Tamu...
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Saat QR Code dipindai, nama tamu beserta label <strong>VIP</strong> atau{" "}
                    <strong>Reguler</strong> akan tampil besar di layar ini.
                  </p>
                </div>
              ) : lastResult.status === "success" && lastResult.guest ? (
                <div
                  className={`mt-5 rounded-3xl border-2 p-6 text-center shadow-lg ${
                    lastResult.guest.category === "VIP"
                      ? "border-gold bg-band text-cream"
                      : "border-lilac bg-white text-navy"
                  }`}
                >
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                    <CheckCircle2 className="h-4 w-4" /> Check-In Berhasil
                  </div>

                  <p className="mt-4 text-xs uppercase tracking-[0.25em] opacity-80">Selamat Datang</p>
                  <p className="mt-1 font-serif text-3xl font-bold">{lastResult.guest.name}</p>

                  <div className="my-5 flex justify-center">
                    {lastResult.guest.category === "VIP" ? (
                      <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-gold bg-burgundy px-6 py-3 font-serif text-2xl font-extrabold uppercase tracking-[0.2em] text-gold shadow-md">
                        <Crown className="h-7 w-7 fill-current" /> TAMU VIP
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-navy bg-lilac-soft px-6 py-3 font-serif text-2xl font-bold uppercase tracking-[0.2em] text-navy">
                        TAMU REGULER
                      </div>
                    )}
                  </div>

                  <p className="font-mono text-xs opacity-75">
                    Kode Tiket: {lastResult.guest.id} · Jam Masuk:{" "}
                    {new Date(lastResult.guest.checkedInAt ?? Date.now()).toLocaleTimeString("id-ID")}
                  </p>
                </div>
              ) : lastResult.status === "already_checked_in" && lastResult.guest ? (
                <div className="mt-5 rounded-3xl border-2 border-amber-400 bg-amber-50 p-6 text-center text-amber-950 shadow-md">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                    <AlertTriangle className="h-4 w-4" /> QR Sudah Pernah Check-In
                  </div>
                  <p className="mt-4 font-serif text-2xl font-bold">{lastResult.guest.name}</p>
                  <p className="mt-2 inline-block rounded-full bg-amber-200 px-4 py-1 font-serif text-sm font-bold uppercase tracking-widest">
                    Kategori: {lastResult.guest.category}
                  </p>
                  <p className="mt-3 text-xs">
                    Tamu ini sudah melakukan check-in sebelumnya pada pukul{" "}
                    <strong>
                      {lastResult.previousCheckInAt
                        ? new Date(lastResult.previousCheckInAt).toLocaleTimeString("id-ID")
                        : "-"}
                    </strong>
                    .
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border-2 border-red-400 bg-red-50 p-6 text-center text-red-900">
                  <XCircle className="mx-auto h-10 w-10 text-red-600" />
                  <p className="mt-2 font-serif text-xl font-bold">QR Code Tidak Valid</p>
                  <p className="mt-1 text-xs">
                    Kode QR yang dipindai bukan berasal dari sistem undangan ini.
                  </p>
                </div>
              )}
            </div>

            {/* Live Attendance Counters */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-3 text-center">
                <p className="text-[11px] font-medium text-emerald-900">Total Hadir</p>
                <p className="font-serif text-2xl font-bold text-emerald-800">
                  {stats.presentCount} <span className="text-xs font-normal">/ {stats.total}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-gold bg-burgundy p-3 text-center text-cream">
                <p className="text-[11px] font-medium text-gold">VIP Hadir</p>
                <p className="font-serif text-2xl font-bold">
                  {stats.vipPresent} <span className="text-xs font-normal opacity-80">/ {stats.totalVip}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-lilac bg-white p-3 text-center">
                <p className="text-[11px] font-medium text-muted-foreground">Reguler Hadir</p>
                <p className="font-serif text-2xl font-bold text-navy">
                  {stats.regPresent} <span className="text-xs font-normal text-muted-foreground">/ {stats.totalReg}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Recap Table & Manual Check-in */}
        <div className="rounded-3xl border border-lilac/60 bg-cream p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-navy">
                Rekap Kehadiran Tamu & Check-In Manual
              </h2>
              <p className="text-xs text-muted-foreground">
                Jika tamu lupa membawa HP, cari namanya di kolom pencarian lalu klik <strong>Check-In Manual</strong>.
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-lilac/60 bg-white p-1 text-xs">
              {(
                [
                  ["PRESENT", `Sudah Hadir (${stats.presentCount})`],
                  ["ABSENT", `Belum Hadir (${stats.absentCount})`],
                  ["ALL", `Semua Tamu (${stats.total})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    tab === key ? "bg-navy text-white" : "text-navy hover:bg-lilac-soft/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ketik nama tamu untuk mencari atau check-in manual..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value.trim() && tab === "PRESENT") {
                  setTab("ALL");
                }
              }}
              className="w-full rounded-xl border border-input bg-white py-2.5 pl-9 pr-4 text-xs outline-none focus:border-burgundy"
            />
          </div>

          {filteredList.length === 0 ? (
            <div className="my-6 rounded-2xl border border-dashed border-lilac bg-white/60 py-12 text-center text-xs text-muted-foreground">
              {tab === "PRESENT"
                ? "Belum ada tamu yang melakukan scan check-in."
                : "Tidak ada data tamu yang cocok dengan filter pencarian."}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-lilac/40 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-lilac/40 bg-lilac-soft/40 text-[11px] uppercase tracking-wider text-navy/80">
                  <tr>
                    <th className="px-3 py-3">No</th>
                    <th className="px-3 py-3">Nama Tamu</th>
                    <th className="px-3 py-3">Kategori</th>
                    <th className="px-3 py-3">Waktu Check-In</th>
                    <th className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lilac/25">
                  {filteredList.slice(0, 100).map((g, i) => (
                    <tr key={g.id} className="hover:bg-lilac-soft/20">
                      <td className="px-3 py-3 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-serif text-sm font-semibold text-navy">{g.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{g.id}</div>
                      </td>
                      <td className="px-3 py-3">
                        {g.category === "VIP" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gold bg-burgundy px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">
                            <Crown className="h-3 w-3 text-gold" /> VIP
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-lilac bg-lilac-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy">
                            Reguler
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {g.checkedInAt ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            ✓ Hadir · {new Date(g.checkedInAt).toLocaleTimeString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Belum hadir</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {!g.checkedInAt ? (
                          <button
                            type="button"
                            onClick={() => handleManualCheckIn(g)}
                            className="inline-flex items-center gap-1 rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-burgundy"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Check-In Manual
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUndoCheckIn(g)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1 text-[11px] text-red-600 hover:bg-red-50"
                          >
                            <RotateCcw className="h-3 w-3" /> Batalkan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Toaster position="top-center" />
    </div>
  );
}

