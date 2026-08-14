import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_ORIGIN } from "@/lib/site";
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
  metadataBase: new URL(SITE_ORIGIN),
  title: "Tarkov Optibuild",
  description:
    "Fan tool for automatic Escape from Tarkov gun builds. Not affiliated with Battlestate Games. Data from tarkov.dev.",
  openGraph: {
    type: "website",
    siteName: "Tarkov Optibuild",
    title: "Tarkov Optibuild",
    description:
      "Fan tool for automatic Escape from Tarkov gun builds. Not affiliated with Battlestate Games.",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Tarkov Optibuild" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarkov Optibuild",
    description:
      "Fan tool for automatic Escape from Tarkov gun builds. Not affiliated with Battlestate Games.",
    images: ["/og"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${rajdhani.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-fog font-display">
        <I18nProvider>
          {children}
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
