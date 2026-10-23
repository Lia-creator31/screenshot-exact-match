import { describe, expect, it } from "vitest";
import {
  buildGuestWhatsappUrl,
  decodeGuestToken,
  encodeGuestToken,
  normalizePhone,
  parseGuestSheetRows,
} from "@/lib/guests";

describe("Guest Excel parser & QR token", () => {
  it("parses Excel rows with empty leading rows and columns like the user sample", () => {
    const sampleRows = [
      ["", "", "", ""],
      ["", "Nama", "kategori", "Nomor "],
      ["", "Shihab", "VIP", "+62 822-4474-9237"],
      ["", "Budi", "reguler", "0812-1111-2222"],
    ];

    const guests = parseGuestSheetRows(sampleRows);
    expect(guests).toHaveLength(2);

    expect(guests[0]!.name).toBe("Shihab");
    expect(guests[0]!.category).toBe("VIP");
    expect(guests[0]!.phone).toBe("6282244749237");

    expect(guests[1]!.name).toBe("Budi");
    expect(guests[1]!.category).toBe("Reguler");
    expect(guests[1]!.phone).toBe("6281211112222");
  });

  it("encodes and decodes guest QR token and full URL", () => {
    const token = encodeGuestToken({ id: "NB-001-TEST", name: "Shihab", category: "VIP" });
    const decodedDirect = decodeGuestToken(token);
    expect(decodedDirect).toEqual({
      id: "NB-001-TEST",
      name: "Shihab",
      category: "VIP",
      token,
    });

    const decodedFromUrl = decodeGuestToken(`https://undangan.com/?g=${encodeURIComponent(token)}`);
    expect(decodedFromUrl?.name).toBe("Shihab");
    expect(decodedFromUrl?.category).toBe("VIP");
  });

  it("normalizes various Indonesian phone formats for wa.me", () => {
    expect(normalizePhone("+62 822-4474-9237")).toBe("6282244749237");
    expect(normalizePhone("0822 4474 9237")).toBe("6282244749237");
    expect(normalizePhone("822-4474-9237")).toBe("6282244749237");
  });

  it("builds valid wa.me invitation URL containing the guest token link", () => {
    const [shihab] = parseGuestSheetRows([
      ["", "Nama", "kategori", "Nomor "],
      ["", "Shihab", "VIP", "+62 822-4474-9237"],
    ]);
    const waUrl = buildGuestWhatsappUrl(shihab!, "https://nikah.com");
    expect(waUrl.startsWith("https://wa.me/6282244749237?text=")).toBe(true);
    expect(decodeURIComponent(waUrl)).toContain("Shihab");
    expect(decodeURIComponent(waUrl)).toContain("https://nikah.com/?g=");
  });
});
