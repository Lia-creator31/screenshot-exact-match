export const WEDDING = {
  bride: {
    nick: "Nella",
    full: "Margareta Nariaswari",
    parents: "Bapak Antonius Sutanto & Ibu Maria Lestari",
    ig: "@nella",
    instagram: "https://instagram.com/",
  },
  groom: {
    nick: "Broni",
    full: "Bobby J Simanjuntak",
    parents: "Bapak Johannes Simanjuntak & Ibu Ruth Siregar",
    ig: "@broni",
    instagram: "https://instagram.com/",
  },
  dateISO: "2025-06-15T10:00:00+07:00",
  dateShort: "15 . 06 . 2025",
  akad: {
    title: "Akad Nikah",
    day: "Minggu, 15 Juni 2025",
    time: "10:00 WIB – Selesai",
    place: "Grand Ballroom Royal Palace",
    address: "Jl. Mawar Kencana No. 21, Kebayoran Baru, Jakarta Selatan 12110",
    maps: "https://maps.google.com/?q=Jakarta",
  },
  resepsi: {
    title: "Resepsi",
    day: "Minggu, 15 Juni 2025",
    time: "13:00 – 16:00 WIB",
    place: "Grand Ballroom Royal Palace",
    address: "Jl. Mawar Kencana No. 21, Kebayoran Baru, Jakarta Selatan 12110",
    maps: "https://maps.google.com/?q=Jakarta",
  },
  calendarUrl:
    "https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+Wedding+of+Nella+%26+Broni&dates=20250615T030000Z/20250615T090000Z&details=Akad+%26+Resepsi&location=Jakarta",
  whatsapp: "6281234567890",
  music: "https://ia800905.us.archive.org/19/items/FREE_background_music_dhalius/backsound.mp3",
  banks: [
    { bank: "BCA", number: "1234567890", name: "Margareta Nariaswari" },
    { bank: "mandiri", number: "0987654321", name: "Bobby J Simanjuntak" },
  ],
  gift: { name: "Nella", phone: "0812-3456-7890", address: "Jl. Mawar Kencana No. 21, Kebayoran Baru, Jakarta Selatan 12110" },
  wishes: [
    { name: "Sarah", msg: "Selamat menempuh hidup baru! Semoga menjadi keluarga yang penuh kasih.", time: "2 hari lalu" },
    { name: "Dimas & Ayu", msg: "Happy wedding Nella & Broni! Bahagia selalu sampai kakek nenek 🤍", time: "3 hari lalu" },
    { name: "Om Hendra", msg: "Tuhan memberkati pernikahan kalian berdua.", time: "1 minggu lalu" },
  ],
};

export function getCountdown(targetISO: string, now: number) {
  const diff = Math.max(0, new Date(targetISO).getTime() - now);
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: diff === 0,
  };
}

export function buildWhatsappUrl(phone: string, f: { name: string; address: string; attend: string; guests: string }) {
  const text = `Halo, saya ingin konfirmasi kehadiran di pernikahan Nella & Broni.\n\nNama: ${f.name}\nAlamat: ${f.address || "-"}\nKehadiran: ${f.attend}\nJumlah Tamu: ${f.guests} orang`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
