import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Tarkov Optibuild",
  description:
    "Outil fan d’optimisation automatique de builds d’armes pour Escape from Tarkov. Non affilié à Battlestate Games. Données tarkov.dev.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${rajdhani.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-fog font-display">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
