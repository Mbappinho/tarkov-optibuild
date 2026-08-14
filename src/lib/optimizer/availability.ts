import type { CatalogItem, ItemOffer, OptimizeConstraints } from "../tarkov/types";

export type PricedOffer = {
  priceRub: number;
  label: string;
};

export function cheapestOffer(
  item: CatalogItem,
  constraints: OptimizeConstraints,
): PricedOffer | null {
  let best: PricedOffer | null = null;

  for (const offer of item.offers) {
    if (!isOfferUnlocked(offer, constraints)) continue;
    if (!best || offer.priceRub < best.priceRub) {
      best = {
        priceRub: offer.priceRub,
        label: offerLabel(offer),
      };
    }
  }

  if (!best && constraints.flea && item.avg24hPrice && item.avg24hPrice > 0) {
    best = { priceRub: item.avg24hPrice, label: "Flea" };
  }

  // Pièces loot / hors trader-flea : comme l’éditeur « toutes les pièces ».
  if (!best && constraints.includeLoot) {
    return { priceRub: 0, label: "Loot" };
  }

  return best;
}

function isOfferUnlocked(
  offer: ItemOffer,
  constraints: OptimizeConstraints,
): boolean {
  if (offer.questLocked && !constraints.includeQuestLocked) return false;
  if (offer.isFlea) return constraints.flea;
  if (!offer.trader) return false;
  const level = constraints.traders[offer.trader] ?? 0;
  const required = offer.minTraderLevel ?? 1;
  return level >= required;
}

function offerLabel(offer: ItemOffer): string {
  if (offer.isFlea) return "Flea";
  if (offer.trader && offer.minTraderLevel) {
    return `${capitalize(offer.trader)} LL${offer.minTraderLevel}`;
  }
  return offer.vendor;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
