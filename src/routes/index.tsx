import { createFileRoute } from "@tanstack/react-router";
import { Invitation } from "@/components/wedding/Invitation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Wedding of Nella & Broni — 15.06.2025" },
      { name: "description", content: "Dengan penuh sukacita kami mengundang Anda di hari pernikahan Nella & Broni." },
      { property: "og:title", content: "The Wedding of Nella & Broni" },
      { property: "og:description", content: "Undangan pernikahan Nella & Broni, Minggu 15 Juni 2025." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Invitation,
});
