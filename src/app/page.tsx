import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeFallback } from "@/components/HomeFallback";
import { OptimizerApp } from "@/components/OptimizerApp";
import { parseLocale } from "@/lib/i18n/locale";
import {
  buildEmbed,
  ogImageQuery,
  searchParamsFromRecord,
} from "@/lib/share/embed";
import { getCatalog } from "@/lib/tarkov/catalog";

async function weaponForEmbed(weaponId: string | null, lang: string) {
  if (!weaponId) return null;
  try {
    const catalog = await getCatalog(parseLocale(lang));
    const summary = catalog.weapons.find((weapon) => weapon.id === weaponId);
    if (summary) return summary;
    const item = catalog.items.get(weaponId);
    if (!item) return null;
    return {
      name: item.name,
      shortName: item.shortName,
      iconLink: item.iconLink,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const params = searchParamsFromRecord(raw);
  const weapon = await weaponForEmbed(params.get("w"), params.get("lang") ?? "en");
  const embed = buildEmbed(params, weapon);
  const ogQuery = ogImageQuery(params);
  const image = ogQuery ? `/og?${ogQuery}` : "/og";
  const path = params.toString() ? `/?${params.toString()}` : "/";

  return {
    title: embed.title,
    description: embed.description,
    openGraph: {
      type: "website",
      siteName: "Tarkov Optibuild",
      title: embed.title,
      description: embed.description,
      url: path,
      locale: embed.locale === "fr" ? "fr_FR" : "en_US",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: embed.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: embed.title,
      description: embed.description,
      images: [image],
    },
  };
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <OptimizerApp />
    </Suspense>
  );
}
