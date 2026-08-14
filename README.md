# Tarkov Optibuild <a href="https://ko-fi.com/T1P023QR7T" target="_blank" rel="noopener noreferrer"><img height="36" style="border:0px;height:36px;" src="https://storage.ko-fi.com/cdn/kofi2.png?v=6" alt="Soutenir sur Ko-fi" /></a>

Site web d’optimisation **automatique** de builds d’armes pour Escape from Tarkov.

Tu choisis une arme, tes niveaux de traders, le flea et un objectif (recul, ergo, ou équilibré). L’outil explore les combinaisons **compatibles** et renvoie le meilleur build — ce n’est pas un builder manuel.

Site : [tarkov-optibuild.vercel.app](https://tarkov-optibuild.vercel.app). Données : [json.tarkov.dev](https://json.tarkov.dev) (même source que [tarkov.dev](https://tarkov.dev)). **Non affilié à Battlestate Games.**

Soutenir : [Ko-fi](https://ko-fi.com/T1P023QR7T). Bugs et idées : bouton **Bug / idée** sur le site, ou [issues GitHub](https://github.com/Mbappinho/tarkov-optibuild/issues) (review avant merge). Langue : anglais par défaut, petit bouton **FR** / **EN** à côté du titre (mémorisé dans le navigateur). Un lien de build collé sur Discord affiche un embed (titre, objectif, image).

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

Le premier chargement du catalogue peut prendre quelques secondes (`/regular/items` ~17 Mo). Ensuite il est mis en cache 1 h (mémoire serveur + cache `fetch` Next, `revalidate` 3600 s).

L’API GraphQL `api.tarkov.dev/graphql` est down depuis juillet 2026. On n’en dépend plus. Les dumps JSON sont l’usage prévu par tarkov.dev ; on s’identifie (`User-Agent`) et on ne refetch pas plus d’une fois par heure.

Avant une mise en ligne : le repo public est `Mbappinho/tarkov-optibuild`. Hébergeur : Vercel Inc. Quota : `/api/optimize` 12 req/min/IP, `/api/weapons` 30 req/min/IP. Détail : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## MVP actuel

- Optimisation auto (slots imbriqués, conflits, pièces manquantes)
- Viseurs optiques et lance-grenades exclus ; crans de mire inclus
- Chargeur joueur : classique 30–40 ou drum ~60 (ergo, puis chargement, puis vérif. ; pas d’arbre mag ; pas de 100)
- Pièces loot (sans trader/flea, ex. GRIDLOK) optionnelles — Ref/GP n’est pas dans le dump
- Filtres traders LL1–4, flea, budget optionnel, pièces de quête on/off
- Objectifs : recul min, ergo max (plafond 100), équilibré (recul + poids + ergo, sans seuil)
- Bouton silencieux : impose un silencieux compatible, puis optimise le reste
- Lien partageable : réglages + **pièces figées** dans l’URL
- Liste d’achat groupée par trader / flea / loot
- Panneau **Modding** (grille Edit Preset : cases 64px, slots vides visibles)
- Boîtiers carry handle (M16A1E1 / M16A2) exclus s’il existe un upper picatinny achetable
- Interface FR / EN (anglais par défaut, petit bouton à côté du titre, préférence `localStorage`)
- Embed Discord / Open Graph sur les liens de build (`/og`)
- Pied de page + `/legal` (avertissement, source, vie privée)
- Bouton **Bug / idée** (issue GitHub préremplie) et lien **Ko-fi**

Hors ce lot : import stash. Détail : [docs/PLAN.md](docs/PLAN.md).

## Tests

```bash
npm run test:optimizer
npm run test:live
npm run test:profile
```

`test:profile` : Model 1 + M4, 4 s puis oracle 30 s (long). `SKIP_ORACLE=1` pour les runs 4 s seulement.

## Architecture

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
