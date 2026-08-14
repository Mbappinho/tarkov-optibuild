import { GUN_TRADERS, type OptimizeConstraints, type TraderLevels } from "./types";

export function defaultTraderLevels(): TraderLevels {
  return {
    prapor: 4,
    therapist: 4,
    skier: 4,
    peacekeeper: 4,
    mechanic: 4,
    ragman: 4,
    jaeger: 4,
  };
}

export function defaultConstraints(): OptimizeConstraints {
  return {
    traders: defaultTraderLevels(),
    flea: true,
    budget: null,
    includeQuestLocked: false,
    includeLoot: true,
    objective: "balanced",
    requireSuppressor: false,
    magazineClass: "std",
  };
}

export const TRADER_LABELS: Record<keyof TraderLevels, string> = {
  prapor: "Prapor",
  skier: "Skier",
  peacekeeper: "Peacekeeper",
  mechanic: "Mechanic",
  jaeger: "Jaeger",
  ragman: "Ragman",
  therapist: "Therapist",
};

export { GUN_TRADERS };
