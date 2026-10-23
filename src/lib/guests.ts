import { WEDDING } from "@/components/wedding/data";

export type GuestCategory = "VIP" | "Reguler";

export interface GuestRecord {
  id: string;
  name: string;
  category: GuestCategory;
  phoneRaw: string;
  phone: string;
  token: string;
  waSentAt?: string | null | undefined;
  checkedInAt?: string | null | undefined;
}

export interface DecodedGuestTicket {
  id: string;
  name: string;
  category: GuestCategory;
  token: string;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeGuestToken(guest: { id: string; name: string; category: GuestCategory }): string {
  const payload = JSON.stringify({
    i: guest.id,
    n: guest.name.trim(),
    c: guest.category === "VIP" ? "V" : "R",
  });
  return `NB1.${toBase64Url(payload)}`;
}

export function decodeGuestToken(rawInput: string | null | undefined): DecodedGuestTicket | null {
  if (!rawInput) return null;
  let token = rawInput.trim();

  // If the scanned string is a full URL (e.g. https://.../?g=NB1.xxx), extract ?g=
  if (token.startsWith("http://") || token.startsWith("https://")) {
    try {
      const url = new URL(token);
      const gParam = url.searchParams.get("g");
      if (gParam) token = gParam.trim();
    } catch {
      // ignore invalid URL
    }
  }

  const rawPayload = token.startsWith("NB1.") ? token.slice(4) : token;
  try {
    const json = fromBase64Url(rawPayload);
    const data = JSON.parse(json) as { i?: string; n?: string; c?: string };
    if (!data || typeof data.n !== "string" || !data.n.trim()) return null;
    const category: GuestCategory = data.c === "V" || data.c === "VIP" ? "VIP" : "Reguler";
    const id = typeof data.i === "string" && data.i ? data.i : "NB-GUEST";
    const cleanToken = encodeGuestToken({ id, name: data.n.trim(), category });
    return {
      id,
      name: data.n.trim(),
      category,
      token: cleanToken,
    };
  } catch {
    return null;
  }
}

export function normalizePhone(raw: unknown): string {
  const str = String(raw ?? "").trim();
  if (!str) return "";
  // Keep digits only
  let digits = str.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (digits.startsWith("8")) {
    digits = "62" + digits;
  }
  return digits;
}

export function normalizeCategory(raw: unknown): GuestCategory {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s.includes("vip")) return "VIP";
  return "Reguler";
}

function makeGuestId(index: number, name: string, phone: string): string {
  const clean = (name + phone).toLowerCase().replace(/[^a-z0-9]/g, "");
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
  return `NB-${String(index + 1).padStart(3, "0")}-${suffix}`;
}

/**
 * Parses 2D array rows from Excel/CSV.
 * Supports empty top rows and empty leading columns like:
 * ,,,
 * ,Nama,kategori,Nomor 
 * ,Shihab,VIP,+62 822-4474-9237
 */
export function parseGuestSheetRows(rows: unknown[][]): GuestRecord[] {
  if (!rows || rows.length === 0) return [];

  let headerRowIdx = -1;
  let nameCol = -1;
  let catCol = -1;
  let phoneCol = -1;

  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let foundName = -1;
    let foundCat = -1;
    let foundPhone = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? "").trim().toLowerCase();
      if (!cell) continue;
      if (foundName === -1 && (cell === "nama" || cell.includes("nama") || cell === "name" || cell.includes("tamu"))) {
        foundName = c;
      } else if (
        foundCat === -1 &&
        (cell.includes("kategori") || cell.includes("status") || cell.includes("ket") || cell.includes("tipe") || cell === "vip")
      ) {
        foundCat = c;
      } else if (
        foundPhone === -1 &&
        (cell.includes("nomor") || cell.includes("telepon") || cell.includes("telp") || cell.includes("hp") || cell.includes("wa") || cell.includes("whatsapp") || cell === "no")
      ) {
        foundPhone = c;
      }
    }

    if (foundName !== -1 && (foundCat !== -1 || foundPhone !== -1)) {
      headerRowIdx = r;
      nameCol = foundName;
      catCol = foundCat;
      phoneCol = foundPhone;
      break;
    }
  }

  // Fallback if no explicit header row found: find first non-empty row and infer columns
  if (headerRowIdx === -1) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const nonEmptyCols = row
        .map((val, idx) => ({ val: String(val ?? "").trim(), idx }))
        .filter((x) => x.val !== "");
      if (nonEmptyCols.length >= 2) {
        headerRowIdx = r - 1; // treat this row as data
        nameCol = nonEmptyCols[0]!.idx;
        catCol = nonEmptyCols.length >= 3 ? nonEmptyCols[1]!.idx : -1;
        phoneCol = nonEmptyCols.length >= 3 ? nonEmptyCols[2]!.idx : nonEmptyCols[1]!.idx;
        break;
      }
    }
  }

  if (nameCol === -1) return [];

  const results: GuestRecord[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const rawName = String(row[nameCol] ?? "").trim();
    if (!rawName) continue;
    // Skip accidental repeated header rows
    if (rawName.toLowerCase() === "nama" || rawName.toLowerCase() === "nama tamu") continue;

    const rawCat = catCol !== -1 ? row[catCol] : "Reguler";
    const rawPhone = phoneCol !== -1 ? String(row[phoneCol] ?? "").trim() : "";

    const category = normalizeCategory(rawCat);
    const phone = normalizePhone(rawPhone);
    const id = makeGuestId(results.length, rawName, phone);
    const token = encodeGuestToken({ id, name: rawName, category });

    results.push({
      id,
      name: rawName,
      category,
      phoneRaw: rawPhone,
      phone,
      token,
      waSentAt: null,
      checkedInAt: null,
    });
  }

  return results;
}

export function buildGuestInvitationUrl(origin: string, guest: { token: string }): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/?g=${encodeURIComponent(guest.token)}`;
}

export const DEFAULT_WA_TEMPLATE = `Kepada Yth.
Bapak/Ibu/Saudara/i *{nama}*
_({kategori})_

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:

*{mempelai}*
📅 {tanggal}
📍 {tempat}

Silakan buka tautan undangan khusus Anda berikut ini (dilengkapi *QR Code E-Ticket* untuk akses masuk gedung):
{link}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Terima kasih.`;

export function buildGuestWhatsappUrl(
  guest: GuestRecord,
  origin: string,
  customTemplate?: string,
): string {
  const link = buildGuestInvitationUrl(origin, guest);
  const tpl = customTemplate?.trim() ? customTemplate : DEFAULT_WA_TEMPLATE;
  const msg = tpl
    .replace(/\{nama\}/gi, guest.name)
    .replace(/\{kategori\}/gi, guest.category)
    .replace(/\{link\}/gi, link)
    .replace(/\{mempelai\}/gi, `${WEDDING.bride.nick} & ${WEDDING.groom.nick}`)
    .replace(/\{tanggal\}/gi, WEDDING.akad.day)
    .replace(/\{tempat\}/gi, WEDDING.akad.place);

  return `https://wa.me/${guest.phone}?text=${encodeURIComponent(msg)}`;
}
