# Titine

Le carnet de ta voiture : pleins, consommation, entretiens, et le carburant le moins cher autour de toi.
PWA Nuxt 4, **local-first** : le carnet vit dans le navigateur (IndexedDB), sans compte.

Le nom, le slogan et les couleurs sont centralisés dans `shared/app.ts`.

## Ce que fait le MVP

- **Un véhicule**, saisi à la main (marque, modèle, carburant, kilométrage, date de mise en circulation).
- **Plein en 10 secondes** : litres, prix, kilométrage. Consommation (L/100 km) et coût au kilomètre calculés de plein complet à plein complet, avec une courbe par plein.
- **Entretiens et rappels** par date ou par kilométrage (le premier des deux). Vidange, pneus et contrôle technique sont créés d'office ; le premier contrôle technique est placé 4 ans après la mise en circulation, puis tous les 2 ans.
- **Carburant le moins cher autour de moi**, à partir du flux open data des prix des carburants.
- **Pages publiques** `/prix-carburant` et `/prix-carburant/[ville]`, rendues côté serveur pour le référencement, avec `sitemap.xml` et `robots.txt`.

Hors MVP : OCR des tickets, export PDF, multi-véhicules, partage familial, Crit'Air, suivi de trajets, notifications push.

## Démarrage

```bash
pnpm install
pnpm db:up        # Postgres dans Docker, port 5435
pnpm dev          # http://localhost:3000
pnpm ingest       # premier import des prix (serveur de dev lancé)
pnpm test         # tests unitaires
pnpm typecheck
pnpm build && node .output/server/index.mjs
```

Variables (voir `.env.example`) : `NUXT_DATABASE_URL`, `NUXT_PUBLIC_SITE_URL` (origine publique, pour les URL canoniques et le sitemap), `NUXT_MIGRATIONS_DIR`.
Les migrations sont appliquées à la première requête. Après une modification de `server/database/schema.ts` : `pnpm db:generate`.

## Organisation

- `shared/` : logique pure, testée, commune au navigateur et au serveur (`consumption.ts`, `reminders.ts`, `dates.ts`, `geo.ts`).
- `app/utils/db.ts` : base locale Dexie (`vehicles`, `fillUps`, `reminders`, `services`). `vehicleId` est déjà indexé partout : le multi-véhicules ne demandera pas de migration.
- `app/utils/garage.ts` : toutes les écritures du carnet. `app/composables/useGarage.ts` : lectures réactives (`liveQuery`).
- `server/` : uniquement les prix des carburants. Aucune donnée d'utilisateur ne quitte l'appareil.

## Prix des carburants

- La tâche Nitro `fuel:ingest` télécharge le [flux instantané](https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/) (environ 9 800 stations) et remplace le relevé dans une seule transaction. Un flux tronqué (moins de 5 000 stations) est rejeté et l'ancien relevé est conservé.
- Planification : toutes les 30 minutes. Le serveur doit tourner en continu (process Node, pas de serverless). À la main : `pnpm ingest` ou `curl -X POST localhost:3000/_nitro/tasks/fuel:ingest`.
- `GET /api/stations?lat=…&lon=…&fuel=gazole&radius=10` : les 30 stations les moins chères dans le rayon (50 km maximum). Les prix relevés il y a plus de 30 jours sont écartés.
- Les pages ville sont mises en cache 30 minutes (`swr`). Les communes homonymes sont distinguées par le département dans l'URL (`saint-denis-93`, `saint-denis-974`).

## Carte des stations

- La page Carburant affiche les stations sur une carte **MapLibre GL** (fork open source de mapbox-gl) avec les tuiles **OpenFreeMap**, style *Liberty*, le plus proche de Google Maps : **aucune clé d'API, aucun compte, aucun quota**. Prix en bulles, le moins cher en vert, ta position en point bleu ; toucher une bulle ou un nom dans la liste ouvre la fiche de la station et recentre la carte.
- Style : `NUXT_PUBLIC_MAP_STYLE` (par défaut `https://tiles.openfreemap.org/styles/liberty`, variantes `…/bright` et `…/positron`). Tout style compatible MapLibre fonctionne.
- L'attribution OpenStreetMap est obligatoire : elle est repliée derrière le bouton ⓘ de la carte, ne pas la retirer.
- La bibliothèque (~1 Mo) et son worker (~500 Ko) sont chargés à la demande et exclus du précache du service worker (les avertissements « won't be precached » au build sont voulus). Le worker est compilé à part via `?worker&url` : MapLibre le désigne par un chemin calculé à l'exécution que Vite ne verrait pas.

## Référencement

- **Pages indexées** : `/` (présentation de l'appli), `/carburant`, `/prix-carburant` et les pages ville. Elles sont rendues côté serveur ; en production, mises en cache (`swr`) une heure (accueil, carburant) ou 30 minutes (prix).
- **Écrans personnels** (`/plein`, `/entretien`, `/vehicule`) et coquille hors ligne (`/200`) : en-tête `X-Robots-Tag: noindex` et balise robots.
- **Chaque page** : titre, description, URL canonique (sans slash final ni paramètres), Open Graph et Twitter avec `public/og-image.png` (source `scripts/og-image.svg`, régénérée par `pnpm icons`).
- **Données structurées** : `WebSite` + `WebApplication` sur l'accueil, `BreadcrumbList` sur les pages publiques, `ItemList` de `GasStation` sur les pages ville.
- **Pages ville** : texte propre à chaque commune (prix moyen par carburant comparé à la moyenne nationale), liens vers les communes voisines dans un rayon de 25 km (toutes les communes sont atteignables de proche en proche), `noindex` si aucune station n'a de prix récent, 404 si la commune est inconnue.
- **Sitemap** (`/sitemap.xml`) : pages publiques et communes ayant des prix récents, avec la date du dernier relevé en `lastmod`.
- **`NUXT_PUBLIC_SITE_URL` doit être l'origine publique en production** : canoniques, Open Graph, sitemap et robots.txt en dépendent.
- L'accueil public est dans le HTML pour les moteurs ; un navigateur qui a déjà un véhicule le masque avant le premier rendu (drapeau `titine:garage` en localStorage) pour afficher directement le tableau de bord.

## Installation et hors ligne

- Le service worker précache la coquille de l'appli : le carnet s'ouvre et se remplit sans réseau. Seule la recherche de stations a besoin d'une connexion. Il n'existe que sur le build de production, pas en `pnpm dev`. Hors ligne, toute navigation est servie par la coquille SPA `/200` générée par Nuxt.
- L'accueil pousse à l'installation. Sur iPhone c'est plus qu'un confort : Safari peut effacer les données d'un site non installé après une semaine sans visite.
- Les rappels sont visibles à l'ouverture de l'appli ; il n'y a pas de notification push. En envoyer demanderait de confier les échéances au serveur, ce que le MVP évite.
- Icônes : modifier les SVG de `public/` puis `pnpm icons` (ImageMagick).
