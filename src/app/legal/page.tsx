import type { Metadata } from "next";
import { LegalContent } from "@/components/LegalContent";

export const metadata: Metadata = {
  title: "Legal notice / Mentions légales — Tarkov Optibuild",
  description:
    "Disclaimer, data source, privacy and legal notice for Tarkov Optibuild.",
};

export default function LegalPage() {
  return <LegalContent />;
}
