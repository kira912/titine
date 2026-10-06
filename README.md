# Titine

Le carnet de ta voiture : pleins, consommation, entretiens, et le carburant le moins cher autour de toi.
PWA Nuxt 4, **local-first** : le carnet vit dans le navigateur (IndexedDB), sans compte.

Le nom, le slogan et les couleurs sont centralisés dans `shared/app.ts`.

## Ce que fait le MVP

- **Un véhicule**, saisi à la main (marque, modèle, carburant, kilométrage, date de mise en circulation).
- **Plein en 10 secondes** : litres, prix, kilométrage. Consommation (L/100 km) et coût au kilomètre calculés de plein complet à plein complet, avec une courbe par plein.
- **Saisie simplifiée** : à moins de 200 m d'une station (localisation déjà autorisée), elle est choisie d'office ; avec son prix, les litres *ou* le montant suffisent ; le kilométrage est estimé d'après le rythme de roulage (`shared/estimate.ts`), il ne reste qu'à corriger la fin. « Compléter plus tard » met le plein de côté à la pompe (table locale `drafts`, un brouillon par véhicule) : il se reprend depuis l'accueil, comparé aux prix du jour où il a été commencé. Raccourcis « Ajouter un plein » et « Carburant » sur l'icône de l'appli installée.
- **Entretiens et rappels** par date ou par kilométrage (le premier des deux). Vidange, pneus et contrôle technique sont créés d'office ; le premier contrôle technique est placé 4 ans après la mise en circulation, puis tous les 2 ans.
- **Carburant le moins cher autour de moi**, à partir du flux open data des prix des carburants.
- **Économies réalisées** : un plein peut être rattaché à une station (« J'ai fait le plein ici » depuis la page Carburant, ou « Choisir la station » à moins de 3 km). Le prix payé est pré-rempli, et le plein est comparé au prix moyen dans un rayon de 10 km autour de la station (au moins 3 relevés), figé dans le plein au moment de la saisie. La comparaison ne vaut que pour un plein du jour.
- **Bilan et badges** (`/bilan`) : bilan annuel (distance, consommation, dépense, économies, station préférée, meilleure affaire, mois le plus cher) partageable en image, et 9 badges calculés à partir du carnet, sans rien stocker de plus. Un badge débloqué par un plein est annoncé à l'enregistrement. Pour qu'ils gardent leur valeur, seules les saisies vraisemblables comptent (`shared/credibility.ts`) : 2 à 150 L et 0,50 à 4 €/L, un plein par date et deux saisis par jour au plus, tronçons de 1 500 km maximum entre 2 et 30 L/100, série comptée au mois de saisie, économie comptée seulement si le prix payé est à 15 centimes près du prix affiché par la station. Le carnet restant modifiable dans le navigateur, ces règles découragent la triche par l'interface sans pouvoir l'empêcher.
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

Variables (voir `.env.example`) : `NUXT_DATABASE_URL` (à défaut `DATABASE_URL` / `POSTGRES_URL`, puis le Postgres Docker local), `NUXT_PUBLIC_SITE_URL` (origine publique, pour les URL canoniques et le sitemap), `CRON_SECRET`, `NUXT_MIGRATIONS_DIR`.
Les migrations sont appliquées à la première requête. Après une modification de `server/database/schema.ts` : `pnpm db:generate`.

## Organisation

- `shared/` : logique pure, testée, commune au navigateur et au serveur (`consumption.ts`, `savings.ts`, `achievements.ts`, `recap.ts`, `reminders.ts`, `dates.ts`, `geo.ts`).
- `app/utils/db.ts` : base locale Dexie (`vehicles`, `fillUps`, `reminders`, `services`). `vehicleId` est déjà indexé partout : le multi-véhicules ne demandera pas de migration.
- `app/utils/garage.ts` : toutes les écritures du carnet. `app/composables/useGarage.ts` : lectures réactives (`liveQuery`).
- `server/` : uniquement les prix des carburants. Aucune donnée d'utilisateur ne quitte l'appareil.

## Prix des carburants

- La tâche Nitro `fuel:ingest` télécharge le [flux instantané](https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/) (environ 9 800 stations) et remplace le relevé dans une seule transaction. Un flux tronqué (moins de 5 000 stations) est rejeté et l'ancien relevé est conservé.
- `pnpm ingest` ne fonctionne plus avec la version actuelle de nuxi (`Unknown command task`) : utiliser `curl -X POST localhost:3000/_nitro/tasks/fuel:ingest`.
- Planification : toutes les 30 minutes par le planificateur de Nitro sur un serveur Node ; sur Vercel, par les crons et GitHub Actions (voir « Déploiement sur Vercel »). À la main en dev : `pnpm ingest` ou `curl -X POST localhost:3000/_nitro/tasks/fuel:ingest`.
- `GET /api/cron/fuel-ingest` lance l'import en production, protégé par `Authorization: Bearer $CRON_SECRET` (401 sans le bon jeton, 503 si `CRON_SECRET` n'est pas défini).
- `GET /api/stations?lat=…&lon=…&fuel=gazole&radius=10` : les 30 stations les moins chères dans le rayon (50 km maximum). Les prix relevés il y a plus de 30 jours sont écartés.
- Services et ruptures : l'import retient 9 services utiles (gonflage, lavage, toilettes…, voir `shared/services.ts`) et les ruptures **temporaires** de moins de 30 jours (au-delà, le carburant a en fait été abandonné). Une station en rupture n'a plus de prix dans le flux.
- `GET /api/stations?…&services=gonflage,toilettes` : ne garde que les stations proposant tous ces services.
- `GET /api/stations/shortages?lat=…&lon=…&fuel=…&radius=…` : stations en rupture de ce carburant, de la plus proche à la plus éloignée.
- `POST /api/stations/:id/reports` (`{ kind, fuel }`) : signalement d'une station, parmi des choix fermés (`prix-incorrect`, `rupture`, `station-fermee`, voir `shared/reports.ts`), sans texte libre donc sans contenu à modérer. Les signalements des dernières 48 h sont renvoyés avec les stations (`reports`) ; ils sont supprimés après 7 jours, au moment de l'import. Anti-abus : un signalement identique par jour et 20 au total par personne. La personne est reconnue par une empreinte SHA-256 de son IP, salée avec `CRON_SECRET` (ou un sel propre au processus) et la date du jour : l'IP n'est jamais stockée et l'empreinte change chaque jour.
- `GET /api/stations/:id?fuel=gazole` : une station, son prix et le prix moyen (`localAverage`) à 10 km autour d'elle, `null` sous 3 relevés.
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

## Déploiement sur Vercel

Le preset Vercel de Nitro est choisi automatiquement au build sur Vercel ; `vercel.json` impose `pnpm vercel-build`, qui applique les migrations (`drizzle-kit migrate`) puis construit l'appli.

1. **Dépôt** : pousser le projet sur GitHub, puis *Add New → Project* sur Vercel et importer le dépôt (framework Nuxt détecté, rien à changer).
2. **Base de données** : onglet *Storage* du projet → *Neon* (Postgres serverless, offre gratuite), relié aux environnements Production et Preview. L'intégration pose `DATABASE_URL` (connexion via le pooler, utilisée par l'appli) et une connexion directe utilisée par les migrations (`POSTGRES_URL_NON_POOLING` ou `DATABASE_URL_UNPOOLED` selon la version). **Relier Neon avant le premier déploiement** : sans base, le build échoue à l'étape des migrations.
3. **Variables d'environnement** :
   - `CRON_SECRET` : une valeur aléatoire (`openssl rand -hex 32`). Vercel l'envoie lui-même à ses crons.
   - `NUXT_PUBLIC_SITE_URL` : uniquement avec un domaine personnalisé (ex. `https://titine.fr`). Par défaut, le domaine de production Vercel du projet est utilisé. **Redéployer après l'avoir changé** : la valeur est figée au build dans les pages mises en cache.
   - Facultatif : `ENABLE_EXPERIMENTAL_COREPACK=1` pour que Vercel utilise exactement le pnpm déclaré dans `packageManager`.
4. **Déployer**. Au premier déploiement, la base est vide : lancer un premier import (bouton *Run workflow* du workflow GitHub ci-dessous, ou `curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/fuel-ingest`).
5. **Import toutes les 30 minutes** : dans le dépôt GitHub, *Settings → Secrets and variables → Actions*, créer `SITE_URL` (URL de production) et `CRON_SECRET` (même valeur que sur Vercel). Le workflow `.github/workflows/fuel-ingest.yml` appelle alors la route d'import toutes les 30 minutes.

Points à connaître :

- **Web Analytics** : module `@vercel/analytics` (sans cookie). À activer dans l'onglet *Analytics* du projet Vercel ; les pages vues remontent ensuite automatiquement, navigation côté client comprise.

- **Crons Vercel** : déclarés dans `nuxt.config.ts` (`nitro.vercel.config.crons`), un par jour à 5 h UTC, car le plan Hobby n'en autorise pas plus (un cron plus fréquent fait échouer le déploiement). En plan Pro : passer le cron à `*/30 * * * *` et supprimer le workflow GitHub. Sur GitHub, les crons planifiés peuvent prendre quelques minutes de retard et sont suspendus après 60 jours sans activité sur un dépôt public.
- **Cache** : l'accueil et `/carburant` sont mis en cache 1 h sur le CDN de Vercel (ISR), les pages de prix 30 minutes.
- **Durée des fonctions** : 120 s au maximum (`nitro.vercel.functions`), pour laisser de la marge à l'import (quelques secondes en pratique).
- **Déploiements de prévisualisation** : ils partagent la base de production si Neon y est relié, et appliquent donc aussi les migrations. Pour isoler les essais, activer les branches de prévisualisation de Neon. Vercel ajoute lui-même un en-tête `noindex` aux URL de prévisualisation.
- **Migrations** : générées localement (`pnpm db:generate`) et commitées ; elles sont appliquées au build sur Vercel, au premier accès à la base sur un serveur Node.
- **Autres hébergeurs** : `pnpm build && node .output/server/index.mjs` produit un serveur Node autonome, avec import planifié intégré (process à garder en continu).

