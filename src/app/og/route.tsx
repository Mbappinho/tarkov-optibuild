import { ImageResponse } from "next/og";
import { parseLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { buildEmbed } from "@/lib/share/embed";
import { getCatalog } from "@/lib/tarkov/catalog";

export const runtime = "nodejs";
export const contentType = "image/png";
export const alt = "Tarkov Optibuild";
export const size = { width: 1200, height: 630 };

async function iconDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const type = response.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadWeapon(weaponId: string | null, lang: string) {
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

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const weapon = await loadWeapon(params.get("w"), params.get("lang") ?? "en");
  const embed = buildEmbed(
    params,
    weapon
      ? {
          name: weapon.name,
          shortName: weapon.shortName,
          iconLink: await iconDataUrl(weapon.iconLink),
        }
      : null,
  );
  const locale = embed.locale;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d0f0d",
          color: "#e8e4d9",
          padding: "56px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Optibuild
            </span>
            <span
              style={{
                marginLeft: 16,
                background: "#3a2714",
                color: "#d08c46",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.2em",
                padding: "6px 12px",
              }}
            >
              {translate(locale, "ogFan")}
            </span>
          </div>
          <span
            style={{
              color: "#7fa653",
              fontSize: 20,
              letterSpacing: "0.16em",
            }}
          >
            TARKOV.DEV
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {embed.iconLink ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.iconLink}
              width={180}
              height={180}
              alt=""
              style={{
                width: 180,
                height: 180,
                objectFit: "contain",
                marginRight: 40,
              }}
            />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                marginRight: 40,
                border: "1px solid #2a322c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b746c",
                fontSize: 18,
                letterSpacing: "0.16em",
              }}
            >
              EFT
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div
              style={{
                fontSize: embed.weaponShortName ? 72 : 56,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#d08c46",
              }}
            >
              {embed.weaponShortName || translate(locale, "ogSite")}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 28,
                color: "#b7b3a8",
              }}
            >
              {embed.weaponName && embed.weaponName !== embed.weaponShortName
                ? embed.weaponName
                : embed.weaponShortName
                  ? translate(locale, "ogSite")
                  : translate(locale, "ogSiteDescription")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex" }}>
            {embed.weaponShortName
              ? embed.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      marginRight: 12,
                      background: "#151917",
                      border: "1px solid #2a322c",
                      color: "#e8e4d9",
                      fontSize: 22,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "10px 16px",
                    }}
                  >
                    {tag}
                  </span>
                ))
              : null}
          </div>
          <span style={{ color: "#6b746c", fontSize: 22, letterSpacing: "0.08em" }}>
            tarkov-optibuild.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
  image.headers.set("Cache-Control", "public, max-age=3600");
  return image;
}
