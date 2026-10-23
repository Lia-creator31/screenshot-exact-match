import {
  type GuestRecord,
  type DecodedGuestTicket,
  decodeGuestToken,
  encodeGuestToken,
} from "./guests";

const STORAGE_KEY = "wedding_guests_v1";
const WA_TEMPLATE_KEY = "wedding_wa_template_v1";

function readLocalGuests(): GuestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalGuests(guests: GuestRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
  } catch {
    // ignore storage quota errors
  }
}

export function mergeGuestLists(localList: GuestRecord[], serverList: GuestRecord[]): GuestRecord[] {
  const map = new Map<string, GuestRecord>();
  for (const g of serverList) {
    map.set(g.id, { ...g });
  }
  for (const g of localList) {
    const existing = map.get(g.id);
    if (!existing) {
      map.set(g.id, { ...g });
    } else {
      map.set(g.id, {
        ...existing,
        ...g,
        waSentAt: existing.waSentAt || g.waSentAt || null,
        checkedInAt: existing.checkedInAt || g.checkedInAt || null,
      });
    }
  }
  return Array.from(map.values());
}

export async function fetchGuests(): Promise<GuestRecord[]> {
  const local = readLocalGuests();
  try {
    const res = await fetch("/api/guests", { method: "GET" });
    if (res.ok) {
      const data = (await res.json()) as { guests?: GuestRecord[] };
      if (Array.isArray(data.guests)) {
        const merged = mergeGuestLists(local, data.guests);
        writeLocalGuests(merged);
        return merged;
      }
    }
  } catch {
    // fallback to localStorage
  }
  return local;
}

export async function saveAllGuests(guests: GuestRecord[], mode: "replace" | "merge" = "merge"): Promise<GuestRecord[]> {
  const current = mode === "replace" ? [] : readLocalGuests();
  const next = mode === "replace" ? guests : mergeGuestLists(guests, current);
  writeLocalGuests(next);
  try {
    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guests: next, mode }),
    });
    if (res.ok) {
      const data = (await res.json()) as { guests?: GuestRecord[] };
      if (Array.isArray(data.guests)) {
        writeLocalGuests(data.guests);
        return data.guests;
      }
    }
  } catch {
    // fallback to local
  }
  return next;
}

export async function updateGuestStatus(
  id: string,
  patch: Partial<Pick<GuestRecord, "waSentAt" | "checkedInAt" | "name" | "category" | "phone" | "phoneRaw">>,
): Promise<GuestRecord[]> {
  const local = readLocalGuests();
  const updated = local.map((g) => (g.id === id ? { ...g, ...patch } : g));
  writeLocalGuests(updated);

  try {
    const res = await fetch("/api/guests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
    if (res.ok) {
      const data = (await res.json()) as { guests?: GuestRecord[] };
      if (Array.isArray(data.guests)) {
        const merged = mergeGuestLists(updated, data.guests);
        writeLocalGuests(merged);
        return merged;
      }
    }
  } catch {
    // ignore network error
  }
  return updated;
}

export async function deleteGuestById(id: string): Promise<GuestRecord[]> {
  const local = readLocalGuests().filter((g) => g.id !== id);
  writeLocalGuests(local);
  try {
    await fetch("/api/guests", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    // ignore
  }
  return local;
}

export async function clearAllGuests(): Promise<GuestRecord[]> {
  writeLocalGuests([]);
  try {
    await fetch("/api/guests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guests: [], mode: "replace" }),
    });
  } catch {
    // ignore
  }
  return [];
}

export interface CheckInResult {
  status: "success" | "already_checked_in" | "invalid";
  guest?: GuestRecord;
  previousCheckInAt?: string | null;
  guests: GuestRecord[];
}

/**
 * Processes a QR code scan or manual token/ID check-in.
 * Works both when the guest is already in the database AND when scanning a self-contained QR token on a new device.
 */
export async function processQrCheckIn(rawScan: string): Promise<CheckInResult> {
  const current = await fetchGuests();
  const clean = rawScan.trim();

  // 1. Try matching by exact ID or token in current list
  let found = current.find(
    (g) => g.id.toLowerCase() === clean.toLowerCase() || g.token === clean,
  );

  // 2. Also try decoding self-contained token (NB1.xxx or full URL ?g=NB1.xxx)
  const decoded: DecodedGuestTicket | null = decodeGuestToken(clean);
  if (!found && decoded) {
    found = current.find(
      (g) =>
        g.id.toLowerCase() === decoded.id.toLowerCase() ||
        g.name.toLowerCase() === decoded.name.toLowerCase(),
    );
  }

  const nowISO = new Date().toISOString();

  if (found) {
    if (found.checkedInAt) {
      return {
        status: "already_checked_in",
        guest: found,
        previousCheckInAt: found.checkedInAt,
        guests: current,
      };
    }
    const updatedGuests = await updateGuestStatus(found.id, { checkedInAt: nowISO });
    const updatedGuest = updatedGuests.find((g) => g.id === found!.id) ?? {
      ...found,
      checkedInAt: nowISO,
    };
    return {
      status: "success",
      guest: updatedGuest,
      guests: updatedGuests,
    };
  }

  // 3. If not in current device's list, but the QR code has a valid encoded ticket (e.g. committee scanning on a separate phone)
  if (decoded) {
    const newGuest: GuestRecord = {
      id: decoded.id,
      name: decoded.name,
      category: decoded.category,
      phoneRaw: "-",
      phone: "",
      token: encodeGuestToken(decoded),
      waSentAt: null,
      checkedInAt: nowISO,
    };
    const nextGuests = await saveAllGuests([newGuest], "merge");
    return {
      status: "success",
      guest: newGuest,
      guests: nextGuests,
    };
  }

  return {
    status: "invalid",
    guests: current,
  };
}

export function getSavedWaTemplate(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(WA_TEMPLATE_KEY) || fallback;
}

export function saveWaTemplate(template: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WA_TEMPLATE_KEY, template);
}

