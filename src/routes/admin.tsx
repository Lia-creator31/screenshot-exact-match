import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { toast, Toaster } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  Crown,
  Users,
  Search,
  Copy,
  ExternalLink,
  QrCode,
  Trash2,
  UserPlus,
  ScanLine,
  Download,
  MessageSquareText,
  RotateCcw,
} from "lucide-react";
import {
  type GuestCategory,
  type GuestRecord,
  DEFAULT_WA_TEMPLATE,
  buildGuestInvitationUrl,
  buildGuestWhatsappUrl,
  encodeGuestToken,
  normalizeCategory,
  normalizePhone,
  parseGuestSheetRows,
} from "@/lib/guests";
import {
  clearAllGuests,
  deleteGuestById,
  fetchGuests,
  getSavedWaTemplate,
  saveAllGuests,
  saveWaTemplate,
  updateGuestStatus,
} from "@/lib/guest-store";
import { WEDDING } from "@/components/wedding/data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: `Admin Undangan & Kirim WA — ${WEDDING.bride.nick} & ${WEDDING.groom.nick}` }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"ALL" | GuestCategory>("ALL");
  const [waFilter, setWaFilter] = useState<"ALL" | "SENT" | "UNSENT">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Manual add form
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<GuestCategory>("VIP");
  const [newPhone, setNewPhone] = useState("");

  // WhatsApp Template
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE);
  const [showTemplateBox, setShowTemplateBox] = useState(false);

  // QR Modal preview
  const [previewGuest, setPreviewGuest] = useState<GuestRecord | null>(null);
  const [previewQr, setPreviewQr] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWaTemplate(getSavedWaTemplate(DEFAULT_WA_TEMPLATE));
    fetchGuests().then((list) => {
      setGuests(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!previewGuest) {
      setPreviewQr("");
      return;
    }
    QRCode.toDataURL(previewGuest.token, { width: 420, margin: 2 })
      .then(setPreviewQr)
      .catch(() => setPreviewQr(""));
  }, [previewGuest]);

  const stats = useMemo(() => {
    const total = guests.length;
    const vip = guests.filter((g) => g.category === "VIP").length;
    const reguler = total - vip;
    const waSent = guests.filter((g) => Boolean(g.waSentAt)).length;
    const checkedIn = guests.filter((g) => Boolean(g.checkedInAt)).length;
    return { total, vip, reguler, waSent, checkedIn };
  }, [guests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (catFilter !== "ALL" && g.category !== catFilter) return false;
      if (waFilter === "SENT" && !g.waSentAt) return false;
      if (waFilter === "UNSENT" && g.waSentAt) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.phoneRaw.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q)
      );
    });
  }, [guests, search, catFilter, waFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  );

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) return;
      const sheet = wb.Sheets[firstSheetName];
      if (!sheet) return;
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      const parsed = parseGuestSheetRows(rows);
      if (parsed.length === 0) {
        toast.error("Tidak ditemukan baris data tamu yang valid. Pastikan ada kolom Nama, Kategori, dan Nomor.");
        return;
      }
      const saved = await saveAllGuests(parsed, "merge");
      setGuests(saved);
      setPage(1);
      toast.success(`Berhasil mengimpor ${parsed.length} tamu undangan!`);
    } catch (err) {
      toast.error(`Gagal membaca file Excel: ${String(err)}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadSampleExcel = () => {
    // Matches the exact structure shared by the user:
    // Row 1 empty, Column A empty, Headers in B2:D2
    const aoa = [
      ["", "", "", ""],
      ["", "Nama", "kategori", "Nomor "],
      ["", "Shihab", "VIP", "+62 822-4474-9237"],
      ["", "Budi Santoso", "Reguler", "0812-3456-7890"],
      ["", "Siti Aminah", "VIP", "+62 813-9876-5432"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 4 }, { wch: 28 }, { wch: 15 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Tamu");
    XLSX.writeFile(wb, "Template_Tamu_Undangan.xlsx");
  };

  const handleExportRekapExcel = () => {
    if (guests.length === 0) {
      toast.error("Belum ada data tamu untuk diekspor.");
      return;
    }
    const origin = window.location.origin;
    const rows = guests.map((g, idx) => ({
      No: idx + 1,
      "Kode Tiket": g.id,
      Nama: g.name,
      Kategori: g.category,
      "Nomor Telepon": g.phoneRaw || g.phone,
      "Nomor WA (Normal)": g.phone,
      "Status WA": g.waSentAt ? `Terkirim (${new Date(g.waSentAt).toLocaleString("id-ID")})` : "Belum Dikirim",
      "Status Kehadiran": g.checkedInAt ? `HADIR (${new Date(g.checkedInAt).toLocaleString("id-ID")})` : "Belum Hadir",
      "Link Undangan Unik": buildGuestInvitationUrl(origin, g),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Tamu");
    XLSX.writeFile(wb, `Rekap_Tamu_${WEDDING.bride.nick}_${WEDDING.groom.nick}.xlsx`);
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Nama tamu wajib diisi");
      return;
    }
    const name = newName.trim();
    const category = normalizeCategory(newCat);
    const phone = normalizePhone(newPhone);
    const id = `NB-${String(guests.length + 1).padStart(3, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const record: GuestRecord = {
      id,
      name,
      category,
      phoneRaw: newPhone.trim(),
      phone,
      token: encodeGuestToken({ id, name, category }),
      waSentAt: null,
      checkedInAt: null,
    };
    const next = await saveAllGuests([record], "merge");
    setGuests(next);
    setNewName("");
    setNewPhone("");
    toast.success(`Tamu "${name}" (${category}) ditambahkan`);
  };

  const handleSendWa = async (g: GuestRecord) => {
    if (!g.phone) {
      toast.error(`Nomor telepon untuk ${g.name} kosong atau tidak valid.`);
      return;
    }
    const url = buildGuestWhatsappUrl(g, window.location.origin, waTemplate);
    window.open(url, "_blank", "noopener,noreferrer");
    const updated = await updateGuestStatus(g.id, { waSentAt: new Date().toISOString() });
    setGuests(updated);
  };

  const handleToggleWaStatus = async (g: GuestRecord) => {
    const nextVal = g.waSentAt ? null : new Date().toISOString();
    const updated = await updateGuestStatus(g.id, { waSentAt: nextVal });
    setGuests(updated);
  };

  const handleCopyLink = async (g: GuestRecord) => {
    const url = buildGuestInvitationUrl(window.location.origin, g);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Link undangan ${g.name} disalin!`);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const handleDeleteGuest = async (g: GuestRecord) => {
    const next = await deleteGuestById(g.id);
    setGuests(next);
    toast.success(`Data ${g.name} dihapus`);
  };

  const handleClearAll = async () => {
    if (!window.confirm("Yakin ingin menghapus seluruh daftar tamu? Tindakan ini tidak dapat dibatalkan.")) return;
    const empty = await clearAllGuests();
    setGuests(empty);
    toast.success("Seluruh daftar tamu berhasil dikosongkan");
  };

  return (
    <div className="min-h-screen bg-lilac-soft/60 pb-20 text-navy">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-lilac/40 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <p className="font-serif text-xs uppercase tracking-[0.25em] text-burgundy">
              Panel Admin Undangan & QR Barcode
            </p>
            <h1 className="font-serif text-xl font-bold text-navy">
              The Wedding of {WEDDING.bride.nick} & {WEDDING.groom.nick}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/checkin"
              className="inline-flex items-center gap-2 rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-cream shadow-sm transition hover:bg-navy"
            >
              <ScanLine className="h-4 w-4" /> Buka Scanner Check-In Hari-H
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-navy/30 bg-white px-3.5 py-2 text-xs font-medium text-navy transition hover:bg-lilac-soft"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Lihat Website Undangan
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-lilac/50 bg-cream p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Tamu</p>
            <p className="mt-1 font-serif text-3xl font-bold text-navy">{stats.total}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Kap. target ~400 tamu</p>
          </div>
          <div className="rounded-2xl border border-gold/60 bg-cream p-4 shadow-sm">
            <p className="flex items-center gap-1 text-xs font-semibold text-burgundy">
              <Crown className="h-3.5 w-3.5" /> Tamu VIP
            </p>
            <p className="mt-1 font-serif text-3xl font-bold text-burgundy">{stats.vip}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Prioritas label VIP</p>
          </div>
          <div className="rounded-2xl border border-lilac/50 bg-cream p-4 shadow-sm">
            <p className="flex items-center gap-1 text-xs font-semibold text-navy">
              <Users className="h-3.5 w-3.5" /> Tamu Reguler
            </p>
            <p className="mt-1 font-serif text-3xl font-bold text-navy">{stats.reguler}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Kategori reguler</p>
          </div>
          <div className="rounded-2xl border border-lilac/50 bg-cream p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Undangan WA Terkirim</p>
            <p className="mt-1 font-serif text-3xl font-bold text-emerald-700">
              {stats.waSent} <span className="text-sm font-normal text-muted-foreground">/ {stats.total}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Belum dikirim: {stats.total - stats.waSent}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl border border-lilac/50 bg-cream p-4 shadow-sm md:col-span-1">
            <p className="text-xs text-muted-foreground">Hadir (Check-in QR)</p>
            <p className="mt-1 font-serif text-3xl font-bold text-navy">
              {stats.checkedIn} <span className="text-sm font-normal text-muted-foreground">/ {stats.total}</span>
            </p>
            <Link to="/checkin" className="mt-1 inline-block text-[11px] font-medium text-burgundy underline">
              Lihat rekap kehadiran →
            </Link>
          </div>
        </div>

        {/* Excel Import + Manual Add Row */}
        <div className="grid gap-4 md:grid-cols-12">
          {/* Excel Import Box */}
          <div className="rounded-3xl border border-lilac/60 bg-cream p-5 shadow-sm md:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className=" flex items-center gap-2 font-serif text-lg font-bold text-navy">
                  <FileSpreadsheet className="h-5 w-5 text-burgundy" /> 1. Import File Excel Daftar Tamu
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mendukung file <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> dengan kolom{" "}
                  <strong>Nama</strong>, <strong>kategori</strong> (VIP / Reguler), dan <strong>Nomor</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-burgundy/40 bg-white px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white"
              >
                <Download className="h-3.5 w-3.5" /> Contoh Excel
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
                id="excel-upload-input"
              />
              <label
                htmlFor="excel-upload-input"
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-navy px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-burgundy"
              >
                <Upload className="h-4 w-4" /> Pilih & Import File Excel (.xlsx / .csv)
              </label>

              <button
                type="button"
                onClick={handleExportRekapExcel}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-navy/30 bg-white px-4 py-3 text-xs font-semibold text-navy transition hover:bg-lilac-soft"
              >
                <Download className="h-4 w-4" /> Export Rekap (.xlsx)
              </button>

              <button
                type="button"
                onClick={() => setShowTemplateBox((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-lilac bg-lilac-soft/60 px-4 py-3 text-xs font-medium text-navy transition hover:bg-lilac-soft"
              >
                <MessageSquareText className="h-4 w-4 text-burgundy" /> Atur Pesan WA
              </button>
            </div>

            {showTemplateBox && (
              <div className="mt-4 rounded-2xl border border-lilac/60 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-navy">
                    Template Pesan WhatsApp (Gunakan <code>{"{nama}"}</code>, <code>{"{kategori}"}</code>,{" "}
                    <code>{"{link}"}</code>)
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWaTemplate(DEFAULT_WA_TEMPLATE);
                      saveWaTemplate(DEFAULT_WA_TEMPLATE);
                      toast.success("Template WA dikembalikan ke bawaan");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-burgundy hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Default
                  </button>
                </div>
                <textarea
                  value={waTemplate}
                  onChange={(e) => {
                    setWaTemplate(e.target.value);
                    saveWaTemplate(e.target.value);
                  }}
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-input bg-cream/40 p-3 text-xs leading-relaxed text-navy outline-none focus:border-burgundy"
                />
              </div>
            )}
          </div>

          {/* Manual Add Guest Box */}
          <div className="rounded-3xl border border-lilac/60 bg-cream p-5 shadow-sm md:col-span-5">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-navy">
              <UserPlus className="h-5 w-5 text-burgundy" /> Tambah Tamu Satuan
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tambahkan tamu susulan secara manual dan langsung dapatkan QR Code-nya.
            </p>
            <form onSubmit={handleAddManual} className="mt-3 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nama Tamu (mis. Shihab)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="col-span-2 rounded-xl border border-input bg-white px-3 py-2 text-xs outline-none focus:border-burgundy"
                />
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as GuestCategory)}
                  className="rounded-xl border border-input bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-burgundy"
                >
                  <option value="VIP">VIP</option>
                  <option value="Reguler">Reguler</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="No. WA (mis. +62 822-4474-9237)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-white px-3 py-2 text-xs outline-none focus:border-burgundy"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-burgundy px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy"
                >
                  + Tambah
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Guest Table & Filters */}
        <div className="rounded-3xl border border-lilac/60 bg-cream p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-navy">
                2. Daftar Tamu & Kirim Undangan WhatsApp ({filtered.length} Tamu)
              </h2>
              <p className="text-xs text-muted-foreground">
                Klik tombol <strong>Kirim WA</strong> pada baris tamu untuk membuka WhatsApp dengan link & barcode unik masing-masing.
              </p>
            </div>
            {guests.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus Semua Data
              </button>
            )}
          </div>

          {/* Search & Filter Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama tamu, nomor WA, atau kode tiket..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-input bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-burgundy"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-lilac/50 bg-white p-1 text-xs">
              {(["ALL", "VIP", "Reguler"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCatFilter(c);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1 font-medium transition ${
                    catFilter === c ? "bg-navy text-white" : "text-navy hover:bg-lilac-soft/50"
                  }`}
                >
                  {c === "ALL" ? "Semua Kategori" : c}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-lilac/50 bg-white p-1 text-xs">
              {(
                [
                  ["ALL", "Semua WA"],
                  ["UNSENT", "Belum Dikirim"],
                  ["SENT", "Sudah Dikirim"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setWaFilter(val);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1 font-medium transition ${
                    waFilter === val ? "bg-burgundy text-white" : "text-navy hover:bg-lilac-soft/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Memuat daftar tamu...</div>
          ) : filtered.length === 0 ? (
            <div className="my-6 rounded-2xl border border-dashed border-lilac bg-white/70 py-14 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-lilac" />
              <p className="mt-3 font-serif text-base font-semibold text-navy">Belum ada daftar tamu</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Silakan klik tombol <strong>Pilih & Import File Excel</strong> di atas untuk mengunggah file daftar tamu Anda.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-lilac/40 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-lilac/40 bg-lilac-soft/40 text-[11px] uppercase tracking-wider text-navy/80">
                  <tr>
                    <th className="px-3 py-3">No</th>
                    <th className="px-3 py-3">Nama Tamu</th>
                    <th className="px-3 py-3">Kategori</th>
                    <th className="px-3 py-3">Nomor WhatsApp</th>
                    <th className="px-3 py-3">Status WA</th>
                    <th className="px-3 py-3">Kehadiran</th>
                    <th className="px-3 py-3 text-right">Aksi Kirim & Barcode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lilac/25">
                  {paginated.map((g, idx) => {
                    const rowNum = (currentPage - 1) * pageSize + idx + 1;
                    const isVip = g.category === "VIP";
                    return (
                      <tr key={g.id} className="transition hover:bg-lilac-soft/20">
                        <td className="px-3 py-3 font-mono text-muted-foreground">{rowNum}</td>
                        <td className="px-3 py-3">
                          <div className="font-serif text-sm font-semibold text-navy">{g.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{g.id}</div>
                        </td>
                        <td className="px-3 py-3">
                          {isVip ? (
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
                          <div className="font-mono text-xs text-navy">{g.phoneRaw || g.phone || "-"}</div>
                          {g.phone && g.phone !== g.phoneRaw && (
                            <div className="font-mono text-[10px] text-muted-foreground">wa.me/{g.phone}</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleWaStatus(g)}
                            title="Klik untuk mengubah status terkirim"
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                              g.waSentAt
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-amber-100/80 text-amber-800 hover:bg-amber-200/80"
                            }`}
                          >
                            {g.waSentAt ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Sudah Dikirim
                              </>
                            ) : (
                              "Belum Dikirim"
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          {g.checkedInAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              ✓ Hadir ({new Date(g.checkedInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Belum hadir</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendWa(g)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                            >
                              <Send className="h-3.5 w-3.5" /> {g.waSentAt ? "Kirim Ulang WA" : "Kirim WA"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewGuest(g)}
                              title="Lihat QR Code Tamu"
                              className="inline-flex items-center gap-1 rounded-xl border border-lilac bg-white px-2.5 py-1.5 text-xs text-navy transition hover:bg-lilac-soft"
                            >
                              <QrCode className="h-3.5 w-3.5 text-burgundy" /> QR
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(g)}
                              title="Salin Link Undangan"
                              className="inline-flex items-center gap-1 rounded-xl border border-lilac bg-white px-2.5 py-1.5 text-xs text-navy transition hover:bg-lilac-soft"
                            >
                              <Copy className="h-3.5 w-3.5" /> Link
                            </button>
                            <a
                              href={`/?g=${encodeURIComponent(g.token)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Buka Undangan Tamu Ini"
                              className="inline-flex items-center rounded-xl border border-lilac bg-white p-1.5 text-navy transition hover:bg-lilac-soft"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteGuest(g)}
                              title="Hapus Tamu"
                              className="inline-flex items-center rounded-xl border border-red-200 bg-white p-1.5 text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Menampilkan halaman {currentPage} dari {totalPages} ({filtered.length} tamu)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-lilac bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-lilac bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Preview Modal */}
      {previewGuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4"
          onClick={() => setPreviewGuest(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl border-2 border-gold bg-cream p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">QR E-Ticket Tamu</p>
            <p className="mt-1 font-serif text-xl font-bold text-navy">{previewGuest.name}</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest ${
                previewGuest.category === "VIP" ? "bg-burgundy text-cream" : "bg-lilac-soft text-navy"
              }`}
            >
              {previewGuest.category}
            </span>
            {previewQr && (
              <img
                src={previewQr}
                alt={previewGuest.name}
                className="mx-auto my-4 aspect-square w-56 rounded-2xl border border-lilac bg-white p-2"
              />
            )}
            <p className="font-mono text-xs text-muted-foreground">{previewGuest.id}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={previewQr}
                download={`QR-${previewGuest.name}-${previewGuest.category}.png`}
                className="flex-1 rounded-xl bg-burgundy py-2 text-xs font-semibold text-white"
              >
                Unduh QR
              </a>
              <button
                type="button"
                onClick={() => setPreviewGuest(null)}
                className="flex-1 rounded-xl border border-navy/20 bg-white py-2 text-xs font-semibold text-navy"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
