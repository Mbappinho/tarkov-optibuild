import type { BuildPart } from "./optimize";

export type ShoppingLine = {
  shortName: string;
  slotName: string;
  priceRub: number;
};

export type ShoppingGroup = {
  vendor: string;
  lines: ShoppingLine[];
  totalRub: number;
};

export function shoppingList(parts: BuildPart[]): ShoppingGroup[] {
  const groups = new Map<string, ShoppingGroup>();
  for (const part of parts) {
    const vendor = part.vendor || "—";
    const group = groups.get(vendor) ?? { vendor, lines: [], totalRub: 0 };
    group.lines.push({
      shortName: part.shortName,
      slotName: part.slotName,
      priceRub: part.priceRub,
    });
    group.totalRub += part.priceRub;
    groups.set(vendor, group);
  }

  const list = [...groups.values()];
  list.sort((left, right) => {
    if (left.vendor === "Loot") return 1;
    if (right.vendor === "Loot") return -1;
    if (left.vendor === "Indispo") return 1;
    if (right.vendor === "Indispo") return -1;
    return right.totalRub - left.totalRub;
  });
  for (const group of list) {
    group.lines.sort((left, right) => right.priceRub - left.priceRub);
  }
  return list;
}

export function shoppingListText(
  weaponName: string,
  parts: BuildPart[],
  totalRub: number,
  labels: {
    heading: string;
    total: string;
    locale: string;
    unavailable: string;
  },
): string {
  const lines = [labels.heading.replace("{name}", weaponName)];
  for (const group of shoppingList(parts)) {
    lines.push(
      group.vendor === "Indispo" ? labels.unavailable : group.vendor,
    );
    for (const line of group.lines) {
      lines.push(
        `  ${line.shortName} (${line.slotName}) — ${Math.round(line.priceRub).toLocaleString(labels.locale)} ₽`,
      );
    }
  }
  lines.push(
    labels.total.replace(
      "{cost}",
      `${Math.round(totalRub).toLocaleString(labels.locale)} ₽`,
    ),
  );
  return lines.join("\n");
}
