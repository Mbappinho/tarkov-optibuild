# Architecture — Tarkov Optibuild

## Pourquoi ce découpage

Le produit est un **site**, pas un repo à lancer en local pour l’utilisateur final. L’optimisation tourne côté serveur pour :

- ne pas envoyer tout le catalogue mods au navigateur
- cacher le dump json.tarkov.dev (~17 Mo, 1× / heure : mémoire + `fetch` Next `revalidate` 3600 s)
- limiter l’abus sur les endpoints (`12` opti/min/IP, `30` armes/min/IP)
- garder un timeout maîtrisé (≈ 4 s par arme)

## Flux

1. `GET /api/weapons?lang=fr|en` — liste d’armes (id, nom, icône) depuis le catalogue caché, noms selon la langue.
2. L’utilisateur règle traders / flea / budget / objectif / chargeur / loot.
3. `POST /api/optimize` — DFS (caché 1 h, clé inclut `lang`) **ou** hydrate un snapshot `parts` sans recherche. Body `lang` pour les noms de pièces.
4. Le front affiche le **panneau Modding** (grille de slots type Edit Preset), les stats, la liste d’achat, et met les ids dans l’URL.
5. Un lien collé (Discord, Slack, etc.) lit les meta Open Graph : `generateMetadata` sur `/` + image `GET /og?w=&obj=&sil=&mag=&frozen=&lang=`.

Langue par défaut : **anglais**. `?lang=fr` dans le lien sert à l’embed, pas à forcer l’UI du visiteur.

## Données

`src/lib/tarkov/catalog.ts` télécharge [json.tarkov.dev](https://json.tarkov.dev) :

- `/regular/items` — armes + mods, slots, conflits, prix flea
- `/regular/traders` — mapping id → `prapor` / `mechanic` / …
- `/regular/items_fr` et `/regular/items_en` — noms (le dump brut a des placeholders)

On ne garde que `types: gun` et `types: mods`. Les presets sont ignorés.

GraphQL `api.tarkov.dev/graphql` n’est **pas** utilisé : down depuis juillet 2026 ([issue #474](https://github.com/the-hideout/tarkov-api/issues/474)). Tarkov.dev lit les mêmes fichiers JSON. FAQ json.tarkov.dev : pas de quota documenté hors abus ; les prix bougent toutes les 5 min, refetch plus souvent est inutile. On s’identifie (`User-Agent` `tarkov-optibuild/0.1` + repo) et on cache 1 h.

Les icônes (`iconLink`) sont affichées depuis l’URL tarkov.dev, sans copie dans `public/`.

Offres :

- `buyFromTrader` → trader + LL + quête (`taskUnlock`)
- `avg24hPrice` → offre flea virtuelle, comparée au trader si les deux sont autorisés

`recoilModifier` top-level est en **pourcents** (ex. `-12`). `properties.recoilModifier` est parfois en fraction (`-0.12`) : on normalise.

## Stats

- recul final = recul de base × (1 + somme des `recoilModifier` / 100)
- ergo finale = min(100, ergo de base + somme des mods). Au-delà de 100, l’ergo n’améliore plus ADS / stamina : l’optimiseur **ignore le surplus** et préfère recul, chauffe, refroidissement, puis prix.
- poids = somme des `weight` json.tarkov.dev (arme nue + pièces choisies, **chargeur joueur inclus**, hors optique / lanceur)
- chauffe / refroidissement = produit des multiplicateurs des mods (`heatFactor`, `coolingFactor`, défaut 1). Affiché en % vs arme nue : `(produit - 1) × 100`. Moins de chauffe et plus de refroidissement sont mieux.

À égalité sur l’objectif principal : ergo **effective** (si recul min) ou recul (si ergo max déjà à 100), puis **chauffe**, puis **refroidissement**, puis prix.

Objectif équilibré : pas de seuil d’ergo. Score  
`- reculVertical - 5 × poids × (1 - ergo/100 + 0,35)`.  
L’ergo compte plus sur une arme lourde ; le poids reste pénalisant même à 100 d’ergo (ADS / stamina, wiki). Pas de falaise du type « 64 perd contre 65 ».

Optiques (`mod_scope`, `mod_nvg`) et lance-grenades (`mod_launcher`) sont **hors calcul**. Le chargeur (`mod_magazine`) n’est pas cherché dans l’arbre : le joueur choisit **classique ~30** (30–40, **jamais < 30**) ou **drum ~60** (50–70, jamais 100). Dans la classe, on prend le meilleur **ergo**, puis le **chargement/déchargement** le plus rapide (`loadModifier` négatif), puis la **vérification** la plus rapide (`ammoCheckModifier` négatif). Le poids n’est plus un critère de choix (il reste dans le score du build). Les crans de mire (`mod_sight_front` / `mod_sight_rear`) **sont** inclus.

## Limites volontaires (v1)

- Au plus 20 candidats par slot (8 pour un upper/receiver, 2 pour rails/tactiques). Ranking à **deux étages** : potentiel cheap sur tout le slot, `conflictAwarePotential` + lookahead seulement sur 2× le cap. Sur un upper/canon, le budget de nœuds est **partagé** entre les candidats.
- Recul min : à recul égal, ergo **effective** (plafond 100) puis chauffe (plus basse) puis refroidissement (plus haut). Les slots imbriqués qui se conflictent (PRS vs appui-joue UMS/Ravage) ne sont plus additionnés comme s’ils étaient compatibles.
- Ergo max : dès que l’ergo effective atteint 100, le surplus est ignoré ; on bascule sur recul puis thermo.
- Équilibré : recul + masse de handling `poids × (1 - ergo/100 + 0,35)`, sans seuil d’ergo. Le poids du chargeur joueur compte.
- Après la recherche, les slots restants à recul 0 et ergo > 0 (crans de mire) sont remplis.
- Bouton **Silencieux** : le build doit contenir un item `types: suppressor` (direct ou via adaptateur type WAVE). Recul/ergo restent le critère principal *parmi* les builds silencieux.
- Timeout **4 s / 650k nœuds** : le résultat peut être marqué `truncated`. Profiling 2026-08-13 : ~80 % du wall clock est le ranking (`conflictAwarePotential`), pas le DFS. Cache par **objet** slot (`resolveSlotItems`, `slotExplosion`). Oracle local 30 s : même recul min Model 1 (**44,6**, 20") qu’en 4 s — ce n’est pas une preuve d’optimum global.
- Les pièces sans prix trader/flea (loot, ex. GRIDLOK) sont utilisables si l’option loot est on (`Loot`). Ref vend souvent ces pièces en GP, mais json.tarkov.dev n’expose pas ses offres.
- Les conflits (ex. poignée CQR vs crosse PRS) sont pris en compte dans le ranking, pas seulement à l’installation.
- Rails/tactiques : peu de candidats, pour ne pas exploser l’arbre AR-15.
- Lien `?w=&obj=&sil=&mag=&loot=&p=slot~item` : sans `p`, relance l’opti ; avec `p`, hydrate le build figé (mêmes pièces, prix recalculés). Exception : un `p` qui fige un boîtier carry handle (M16A1E1 / A2) est **ignoré** dès qu’un picatinny est achetable — on relance l’opti.
- Panneau **Modding** : arbre de slots (remplis + vides) aplati en cases 64px, comme l’écran Edit Preset / tarkov-tools. Pas de rendu 3D ni de collage d’images d’inspect. Optiques et lanceurs restent des cases vides.
- Boîtiers / uppers (`mod_reciever`) : si un candidat a un rail optique « complet » (≥ 15 pièces sur `mod_scope`, typiquement picatinny), les carry handle (M16A1E1 / M16A2 : ACOG TA-01, Prism, etc.) sont **sortis du pool**. S’il n’y a que ça d’achetable, on les garde (slot requis).
- Pas d’import stash. Les unlocks traders filtrent les offres ; le loot est un interrupteur à part.
- Cache 1 h : un patch Battlestate n’apparaît qu’après expiration ou redémarrage.

## Fichiers clés

| Fichier | Rôle |
| --- | --- |
| `src/lib/tarkov/json-client.ts` | Fetch JSON + retry + cache Next 1 h |
| `src/lib/tarkov/catalog.ts` | Mapping → `CatalogItem` (dump brut partagé, catalogues FR/EN) |
| `src/lib/i18n/` | Dictionnaires FR/EN, détection locale, codes d’erreur API |
| `src/components/I18nProvider.tsx` | Contexte client + `localStorage` `optibuild-lang` |
| `src/components/LanguageToggle.tsx` | Petit bouton FR/EN (à côté du titre + `/legal`) |
| `src/lib/site.ts` | Ko-fi, repo GitHub, User-Agent, URL d’issue, `SITE_ORIGIN` |
| `src/lib/share/query.ts` | Lien partageable (`w`, `obj`, `p`, `lang=fr` si besoin) |
| `src/lib/share/embed.ts` | Titre / description Open Graph d’un lien de build |
| `src/app/og/route.tsx` | Image 1200×630 pour Discord / Twitter |
| `src/lib/http/rate-limit.ts` | Quota mémoire par IP |
| `src/app/legal/page.tsx` | Avertissement, source, vie privée, mentions |
| `src/components/FeedbackDialog.tsx` | Formulaire bug / idée → lien GitHub (`<a target=_blank>`, templates `.md`) |
| `src/lib/optimizer/optimize.ts` | Recherche du build |
| `src/lib/optimizer/profile-live.ts` | Baseline 4 s + oracle 30 s |
| `src/lib/optimizer/magazine.ts` | Choix chargeur 30 / 60 (ergo, load, check) |
| `src/lib/optimizer/cache.ts` | Cache des résultats d’opti |
| `src/lib/optimizer/hydrate.ts` | Rebuild figé depuis les ids |
| `src/lib/optimizer/shopping.ts` | Liste d’achat par vendeur |
| `src/lib/optimizer/modding.ts` | Arbre de slots pour le panneau Modding |
| `src/lib/optimizer/optic-rail.ts` | Filtre uppers carry handle vs picatinny |
| `src/lib/optimizer/availability.ts` | Prix / unlocks / loot |
| `src/app/api/optimize/route.ts` | Endpoint site |
| `src/components/OptimizerApp.tsx` | UI (état, logique, layout 3 colonnes). L’état de partage est lu une fois depuis l’URL au premier rendu ; le chargeur drum sans support est dérivé vers ~30 sans `useEffect`. |
| `src/components/hud.tsx` | Primitives du design system (Panel, Toggle, SegmentedControl, PipStepper, StatBar, Tag) |
| `src/components/TopBar.tsx` | Barre de statut (wordmark, méta catalogue, langue, Bug / idée, Ko-fi) |
| `src/components/WeaponPicker.tsx` | Armurerie (recherche + liste) |
| `src/components/SettingsPanel.tsx` | Paramètres (objectif, chargeur, traders, CTA) |
| `src/components/BuildSheet.tsx` | Fiche technique du build (stats, pièces, liste d'achat) |
| `src/components/ModdingBoard.tsx` | Grille de slots type Edit Preset (64px) |

## Design

Style « HUD tactique » inspiré de l'UI in-game. Tokens dans `src/app/globals.css` (`@theme`) : fond charbon-olive `#0d0f0d`, panneaux `#151917`, accent tan-orange `#d08c46`, vert olive `#7fa653`, rouge `#c4483c`. Motif récurrent : coins chanfreinés (`.chamfer`, clip-path) et crochets de réticule (`.corner-brackets`) sur la sélection. Polices via `next/font/google` : Rajdhani (titres/labels) et JetBrains Mono (valeurs numériques). Layout desktop : 3 colonnes (armurerie / fiche technique / paramètres), pile verticale sur mobile. Au-dessus de la fiche : panneau Modding (cases 64×64). Pied de page : disclaimer + `/legal` + Ko-fi. UI bilingue FR/EN : **anglais par défaut**, FR si le visiteur clique le bouton (persisté dans `localStorage`). Les liens de build exposent un embed Open Graph.

## Lancement public

Checklist ops : site en prod sur [tarkov-optibuild.vercel.app](https://tarkov-optibuild.vercel.app) (compte Vercel `mbappinho`, repo GitHub lié). Le quota IP est par instance : sur du serverless il est faible, il limite l’abus évident, pas un botnet.
