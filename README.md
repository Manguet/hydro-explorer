# Hydro Explorer

Carte interactive des stations hydrométriques françaises, construite avec les données open data [Hub'eau](https://hubeau.eaufrance.fr/) et les fonds de carte [IGN Géoplateforme](https://geoplateforme.fr/).

**[→ Ouvrir la démo](https://manguet.github.io/hydro-explorer/)**

---

## Fonctionnalités

- **Carte des stations** — 3 000+ stations hydrométriques actives, regroupées par cluster
- **Statut en temps réel** — marqueurs colorés selon la fraîcheur des données (normal / vigilance / inactif)
- **Graphique hauteur et débit** — courbe H et Q sur 7, 30 ou 90 jours, avec statistiques min/max/moyenne
- **Couches optionnelles** — réseau hydrographique IGN, stations piézométriques (nappes), vigilance Vigicrues
- **Filtres** — département, type de station, statut, période
- **Recherche** — par nom ou code de station
- **Géolocalisation** — centrage carte sur la position de l'utilisateur
- **Permalien** — URL partageables par station (`#code_station`)
- **Export CSV** — données des stations visibles
- **PWA** — installation sur mobile, cache offline, fonctionne sans réseau après le premier chargement

## Sources de données

| Source | Données |
|--------|---------|
| [Hub'eau Hydrométrie v2](https://hubeau.eaufrance.fr/page/api-hydrometrie) | Stations, hauteurs H, débits Q |
| [Hub'eau Piézométrie v1](https://hubeau.eaufrance.fr/page/api-niveaux-nappes-eau-souterraines) | Stations nappes souterraines |
| [Vigicrues](https://www.vigicrues.gouv.fr/) | Vigilance crues (GeoJSON) |
| [IGN Géoplateforme](https://geoplateforme.fr/) | Fonds de carte, réseau hydrographique |

## Stack technique

- **Vanilla JS** (ES modules, pas de framework)
- **[Leaflet](https://leafletjs.com/) 1.9** + MarkerCluster — carte interactive
- **[Plotly](https://plotly.com/javascript/) Basic 2.32** — graphiques
- **IndexedDB** — cache local des stations (24h) et observations (30 min)
- **Service Worker** — PWA, cache-first pour le shell et les tuiles IGN

## Lancer en local

```bash
npx serve .
# ou
python3 -m http.server 3000
```

Ouvrir `http://localhost:3000`.

> Un serveur HTTP est nécessaire pour les ES modules et le Service Worker. L'ouverture directe du fichier `index.html` ne fonctionne pas.

## Structure du projet

```
├── index.html          # Point d'entrée
├── offline.html        # Page hors-ligne (PWA)
├── manifest.json       # Web App Manifest
├── sw.js               # Service Worker
├── css/
│   ├── main.css        # Styles globaux
│   └── components.css  # Composants UI
├── js/
│   ├── app.js          # Orchestration principale
│   ├── api.js          # Appels Hub'eau
│   ├── map.js          # Carte Leaflet
│   ├── chart.js        # Graphiques Plotly
│   ├── filters.js      # Filtres UI
│   ├── search.js       # Barre de recherche
│   ├── permalink.js    # Permalien URL
│   ├── piezometry.js   # Layer piézométrie
│   ├── vigicrues.js    # Overlay Vigicrues
│   ├── export.js       # Export CSV
│   ├── db.js           # Cache IndexedDB
│   ├── pwa.js          # Installation PWA
│   ├── config.js       # Constantes
│   └── utils.js        # Utilitaires
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

## Licence

Données : open data sous licences respectives des producteurs (Hub'eau / SCHAPI, IGN, Vigicrues).  
Code : [MIT](LICENSE)

---

*Développé par [Benjamin Manguet](https://benjamin-manguet.fr) · [@manguet](https://github.com/manguet)*
