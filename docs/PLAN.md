# Plan — Tarkov Optibuild

Hors v1 déjà livré. Les lots 1–7 ci-dessous sont **implémentés**.

## 1. Qualité de recherche — fait (profiling 2026-08-13)

Budget inchangé : **4 s / 650k nœuds**. Pas de 2e passe canon, pas d’allongement : l’oracle 30 s ne bat pas le recul 4 s.

Mesures (`npm run test:profile`, Model 1 / M4) :

- Recul min Model 1 : **44,6** en 4 s et en 30 s (ERE + PRS + 20" + CQB/CRD). L’oracle ~4,7 M nœuds ne descend pas plus bas. Le 20" n’est pas un artefact du timeout.
- Équilibré Model 1 : Hanson 13,7" en 4 s et en 30 s (même recul 51).
- M4 recul min : **47,4** à 4 s et 30 s.
- ~80 % du temps 4 s est dans `slotCandidates` / `conflictAwarePotential` (pas dans le DFS). `resolveSlotItems` sans cache serait du gaspillage ; avec cache : ~370 appels, ~1 ms.

Gardé :

- Cache `resolveSlotItems` + `slotExplosion` **par objet slot** (pas par `slot.id` : `mod_stock` est répété, ça recollait le même tube à l’infini).
- Ranking à deux étages : `computePotential` (caché) sur tout le slot, `conflictAwarePotential` seulement sur 2× le cap. ERE + PRS toujours là. ~190k nœuds / 4 s Model 1 recul (vs ~163k avant).
- Compteurs `profile: true` ou `OPTIMIZE_PROFILE=1`. Script `src/lib/optimizer/profile-live.ts`.

Pas gardé : caps plus larges, slots lourds d’abord, 5–6 s, 2e passe canon.

L’oracle 30 s n’est **pas** un optimum global : encore `truncated`, le Hanson 13,7" n’est pas visité en recul min (seulement des canons longs). C’est un plafond local. Le bandeau « recherche limitée » reste honnête.

## 2. Chargeur joueur — fait

Hors arbre d’optimisation. Deux classes :

- **Classique ~30** (30–40 coups, jamais en dessous de 30).
- **Drum ~60** (50–70, jamais ≥ 80 / 100).

Dans la classe : meilleur **ergo**, puis chargement/déchargement le plus rapide, puis vérification la plus rapide (données `loadModifier` / `ammoCheckModifier` du dump ; négatif = plus vite). Plus de « plus proche de 30 » ni de tri au poids. Le poids + ergo du chargeur choisi restent dans le score du build. Si pas de ~60, le bouton drum est masqué. URL `mag=60` sur une arme sans drum → retombe sur le 30.

## 3. Lien partageable — fait (A + B)

Le lien décrit les **réglages** *et*, après une opti, les **ids de pièces** (`p=slotId~itemId,...`).

- Sans `p` : relance l’opti (mode A).
- Avec `p` : hydrate le build figé, **sans** rechercher. Discord voit le même 20" / Hanson. Les prix se recalculent avec tes traders / flea / loot actuels.

`/?w=<id>&obj=recoil&sil=1&mag=60&p=slot~item,...`

## 4. Loot / Ref — fait (interrupteur)

Case **Inclure loot / hors trader-flea** (défaut : on). Off = seulement trader RUB / flea.

GRIDLOK reste du « loot » dans le dump : Ref existe mais ses offres GP ne sont pas dans `buyFromTrader`. Trader Ref plus tard.

## 5. Liste d’achat — fait

Sous le build : pièces groupées par vendeur (trader LL / Flea / Loot), prix, total. Bouton copier le texte.

## 6. Panneau Modding — fait

Grille type **Edit Preset** au-dessus de la fiche (pas de 3D, pas de collage photo). Les builders publics font ça : tarkov-tools = cases 64px ; TarkovBOT = 3D Unity dumpé (hors scope) ; l’autre optimiser = image de preset défaut + arbre.

L’API renvoie `modding` : arbre de tous les slots de l’arme (remplis et vides), enfants des pièces installées. Le front aplatit en DFS. Optiques / NVG / lanceurs restent vides. Chargeur rempli. Pictos BSG non copiés : label HUD + `iconLink`.

## 7. Boîtiers carry handle — fait

Les uppers dont le `mod_scope` n’accepte qu’une poignée de viseurs (M16A1E1 / M16A2 : ACOG de poignée de transport) sont exclus dès qu’un picatinny achetable est dans le pool. Sinon le slot requis reste remplissable.

Un lien figé (`p=`) qui contient encore ces boîtiers est **rejeté** : l’API relance l’opti au lieu d’hydrater, sinon le refresh du navigateur les réaffiche.

## Hors ce lot

Import stash, 4ᵉ objectif, retune des coeffs équilibré, offres Ref/GP.

## Lancement site

Livré dans le code : disclaimer, `/legal`, cache fetch 1 h, User-Agent, rate-limit, bouton Bug / idée → GitHub, Ko-fi.

Prod : [tarkov-optibuild.vercel.app](https://tarkov-optibuild.vercel.app). Repo GitHub lié à Vercel.
