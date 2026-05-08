# Prospect EPMP — Plan d'action stratégique

**Document de travail personnel — Benjamin Manguet**
*Dernière mise à jour : 8 mai 2026*

---

## 1. Identification du prospect

### Établissement public du Marais poitevin (EPMP)

| Champ | Valeur |
|---|---|
| Nom | Établissement public du Marais poitevin |
| Statut | Établissement public de l'État à caractère administratif |
| Tutelle | Ministères de la Transition écologique, Cohésion des territoires, Mer |
| Adresse | 1 rue Richelieu, 85400 Luçon |
| Téléphone | 02 51 56 56 30 |
| Email contact | contact@epmp-marais-poitevin.fr |
| Site web | epmp-marais-poitevin.fr |
| Application existante | siemp.epmp-marais-poitevin.fr |
| Périmètre territorial | 344 communes / 4 départements (17, 79, 85, 86) / 2 régions |
| Distance depuis Angliers | ~70 km (1h en voiture) |

### Contacts à identifier (à compléter)

- [ ] Directeur de l'EPMP : **nom à rechercher** (LinkedIn / site web)
- [ ] Chargé(e) de mission SI / numérique : **nom à rechercher**
- [ ] Responsable communication : **nom à rechercher**

---

## 2. Contexte commercial

### Marché en cours (PAS pour moi)

**Référence** : AOO_2026-02
**Objet** : AMO pour la conception et la passation de marchés de développement (Lots 1 et 2)
**Date limite offres** : 22 juin 2026 — 12h00
**Lien PLACE** : marches-publics.gouv.fr

> ⚠️ **Je ne candidate PAS à ce marché.** C'est un marché de conseil pur, hors de mon métier.

### Marché cible (POUR moi, dans 12 mois)

**Objet** : Développement du nouveau SIEMP (système d'information sur l'eau du Marais poitevin)
**Date prévisionnelle de publication** : printemps 2027
**Stack pressentie** : Application web responsive, cartographie interactive, séries temporelles, API REST, conformité RGPD/RGAA
**Prestataire actuel à remplacer** : Kisters (allemand, propriétaire) — fin de contrat 2027
**Volonté affichée** : sortir de la dépendance Kisters, privilégier solutions ouvertes et réversibles

### Calendrier détaillé

| Date | Étape | Mon action |
|---|---|---|
| 22/06/2026 | Limite dépôt offres AMO | Veille passive |
| Sept-Oct 2026 | Notification AMO (probable) | Identifier l'attributaire |
| Oct 2026 - Mars 2027 | Tranche ferme AMO (rédaction DCE dev) | Contact stratégique avec l'AMO |
| **Avril-Juin 2027** | **Publication marché de dev SIEMP** | **Candidature** |
| Été-Automne 2027 | Notification du marché de dev | — |
| 2027-2028 | Développement (12-18 mois) | — |
| Fin 2028 / début 2029 | Mise en production | — |

---

## 3. Stratégie d'ensemble

**Principe directeur** : ne pas chasser le marché AMO, construire silencieusement ma crédibilité pendant 12 mois pour être en position forte au moment du marché de développement.

**Trois axes parallèles** :
1. **Construction technique** : démo Hub'eau publique, montée en compétences carto/SIG
2. **Construction de notoriété** : article blog, présence Google, mail de présentation
3. **Construction de réseau** : contact AMO, veille PLACE, identification partenaires

**Garde-fou juridique** : pendant toute la procédure du marché AMO en cours (jusqu'à attribution), aucun contact direct avec l'EPMP sur le sujet du SIEMP. Toute communication reste générique et sans référence au marché en cours.

---

## 4. Plan d'action détaillé

### Phase 1 — Construction de la démo technique (mai-juin 2026)

**Objectif** : avoir une démo publique et fonctionnelle de visualisation hydrologique en 3-4 semaines.

#### Spécifications du projet "Hydro Explorer"

- [ ] Créer un repo GitHub public `hydro-explorer` (ou nom équivalent)
- [ ] Configurer GitHub Pages (branche `gh-pages` ou `main`/`docs`)
- [ ] Optionnel : sous-domaine custom `hydro-demo.benjamin-manguet.fr`

**Stack technique recommandée** :
- Frontend : HTML/CSS/JS vanilla ou Preact
- Cartographie : Leaflet 1.9+
- Charts : Chart.js ou Plotly
- Données : API Hub'eau directes (fetch côté client)
- Hosting : GitHub Pages (statique)

**Fonctionnalités prioritaires** :
- [ ] Carte Leaflet centrée sur le bassin Marais poitevin
- [ ] Markers stations hydrométriques avec popup (nom, code, dernière mesure)
- [ ] Couleur des markers selon état (normal / vigilance / alerte)
- [ ] Graphique temporel sur clic station (hauteur d'eau 30 derniers jours)
- [ ] Filtres : type de station, département, période
- [ ] Export CSV des données affichées
- [ ] Design responsive (mobile-first)
- [ ] Conformité RGAA niveau AA (a minima)
- [ ] README détaillé avec captures d'écran

**APIs et sources de données** :
- Hub'eau hydrométrie : `hubeau.eaufrance.fr/api/v2/hydrometrie/`
- Hub'eau piézométrie : `hubeau.eaufrance.fr/api/v1/niveaux_nappes/`
- Sandre référentiels : `sandre.eaufrance.fr`
- Tuiles IGN : `geoservices.ign.fr`

**Structure recommandée du repo** :
```
hydro-explorer/
├── README.md           ← soigné, avec captures
├── docs/
│   ├── architecture.md
│   └── api-hubeau.md
├── src/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
└── LICENSE             ← MIT ou similaire
```

#### Article de blog associé

- [ ] Rédiger un article technique sur mon site
- [ ] Titre suggéré : *"Construire un visualiseur de données hydrologiques avec Hub'eau et Leaflet — retour technique"*
- [ ] Mettre en avant les choix techniques justifiés
- [ ] Insérer 3-5 captures d'écran de la démo
- [ ] Lien vers la démo et le repo GitHub
- [ ] Optimiser le SEO (titre H1, méta-description, mots-clés "Hub'eau", "Leaflet", "hydrologie", "freelance")

---

### Phase 2 — Premier contact EPMP (juin-juillet 2026)

**Pré-requis** : démo Hub'eau publiée + article blog en ligne.

#### Trame du mail de présentation

> **Objet** : Présentation - Développeur web et audit sécurité, basé à Angliers (17)
>
> Madame, Monsieur,
>
> Je me permets de vous écrire dans le cadre d'une démarche de présentation auprès des établissements publics de mon territoire.
>
> Je suis Benjamin Manguet, développeur web freelance et consultant en audit de sécurité applicative, installé à Angliers (17). Je travaille principalement avec la stack PHP/Symfony, sur des problématiques d'applications métier, d'API REST, et de mise en conformité RGPD technique pour des PME et agences de Nouvelle-Aquitaine.
>
> Mon périmètre d'intervention couvre naturellement le territoire du Marais poitevin et ses départements limitrophes, et je souhaitais signaler ma présence à votre établissement en tant qu'acteur économique numérique local.
>
> Par curiosité et intérêt pour les enjeux de gestion de l'eau du territoire, j'ai récemment développé un démonstrateur de visualisation des données hydrologiques publiques (API Hub'eau) que vous pouvez consulter à l'adresse suivante : [URL démo]. C'est une exploration personnelle, pas une candidature à un projet précis — simplement une manière concrète de vous montrer ce que je sais faire.
>
> Je n'ai pas de demande particulière à formuler aujourd'hui. Je reste à votre disposition si vous avez besoin, à un moment ou un autre, de prestations de développement web, d'audit technique RGPD/sécurité, ou d'accompagnement numérique.
>
> Bien cordialement,
> Benjamin Manguet
> Développeur web freelance · Audit sécurité OWASP/RGPD
> [Adresse Angliers]
> [Téléphone] - [Email]
> [URL site web] - [URL démo Hydro Explorer]

#### Règles à respecter impérativement

- [ ] **NE PAS** mentionner le marché AMO en cours (AOO_2026-02)
- [ ] **NE PAS** demander de RDV pour parler du SIEMP
- [ ] **NE PAS** poser de questions techniques sur le SIEMP existant
- [ ] **NE PAS** envoyer sur l'adresse générique `contact@`
- [ ] Cibler une personne identifiée (directeur ou responsable SI)
- [ ] Ton sobre, factuel, sans pression commerciale
- [ ] Aucun document commercial joint (plaquette, tarifs)

---

### Phase 3 — Construction de crédibilité (juillet-septembre 2026)

#### Veille passive

- [ ] Configurer une alerte sur PLACE (compte EPMP)
- [ ] Configurer une alerte BOAMP avec mots-clés "Marais poitevin", "EPMP", "SIEMP"
- [ ] Configurer une alerte France Marchés sur l'acheteur EPMP
- [ ] Surveiller régulièrement la rubrique marchés publics du site EPMP

#### Enrichissement de la démo

- [ ] Ajouter une couche piézométrie (nappes phréatiques)
- [ ] Ajouter un système d'alertes visuelles sur dépassement de seuils
- [ ] Améliorer l'accessibilité RGAA (audit avec axe-core ou WAVE)
- [ ] Ajouter une PWA (manifest.json, service worker)
- [ ] Optimiser les performances (Lighthouse > 90)

#### Présence en ligne

- [ ] Article LinkedIn sur la démo Hub'eau
- [ ] Mise à jour du site benjamin-manguet.fr avec section "Cartographie & visualisation de données"
- [ ] Optionnel : présentation à un meetup local (Bordeaux Symfony, La Rochelle Tech)

---

### Phase 4 — Identification de l'AMO attribué (sept-oct 2026)

**Veille PLACE pour repérer l'attribution du marché AMO_2026-02**

- [ ] Surveiller les avis d'attribution sur PLACE et BOAMP
- [ ] Une fois l'AMO identifié, rechercher :
  - [ ] Site web du cabinet AMO
  - [ ] Profils LinkedIn des consultants probablement assignés
  - [ ] Références antérieures du cabinet (autres marchés similaires)
  - [ ] Stack et méthodologies qu'ils privilégient

**Cabinets AMO probablement candidats à surveiller** :
- SILAOS (La Rochelle, 17 rue Isaac Newton)
- Klee Group, Sopra Steria (gros groupes mais peu probables sur ce volume)
- Cabinets spécialisés data/SI environnementaux

---

### Phase 5 — Contact stratégique avec l'AMO (nov 2026 - jan 2027)

**Une fois l'AMO attribué et identifié** : prise de contact directe avec les consultants.

> ⚠️ Contact LÉGITIME : ce sont des prestataires privés, pas l'acheteur public. Aucune contrainte d'égalité de traitement.

#### Trame du mail à l'AMO

> **Objet** : Développeur web local - Marché de développement SIEMP à venir
>
> Bonjour [Nom],
>
> J'ai vu que votre cabinet a été retenu pour la mission AMO de l'EPMP sur les outils SIEMP et SI-OUGC. Félicitations.
>
> Je me présente : Benjamin Manguet, développeur web freelance basé à Angliers, spécialisé en applications métier PHP/Symfony et audit de sécurité applicative. J'ai notamment développé [URL démo Hub'eau] qui exploite les API publiques hydrologiques.
>
> Je serai très probablement candidat (en direct ou en sous-traitance) au futur marché de développement du SIEMP. Je voulais simplement me signaler à vous dès maintenant, et vous proposer un échange technique informel quand vous serez en phase de cadrage du DCE, si ça peut vous être utile pour comprendre les contraintes terrain d'un dev web local.
>
> Sans engagement de part et d'autre, évidemment.
>
> Bien à vous,
> Benjamin Manguet

#### Bénéfices attendus de ce contact

- L'AMO connaît mon nom avant la rédaction du DCE
- Possibilité d'éclairer leur cadrage technique (démarche neutre)
- Visibilité sur le calendrier réel
- Possibilité d'orienter certains critères vers ce que je sais faire (légal, dans la mesure où ça reste cohérent avec le besoin)

---

### Phase 6 — Préparation à la candidature (fév-avril 2027)

#### Décisions structurelles à prendre AVANT le marché de dev

- [ ] **Passage en société** (SASU ou EURL) ? Décision à prendre fin 2026.
  - Avantages : éligibilité aux marchés > 40k€ HT, déduction des frais réels, image professionnelle
  - Inconvénients : charges fixes, complexité administrative
  - Consulter un expert-comptable pour simulation chiffrée
- [ ] **Constitution d'un groupement** ? Identifier des partenaires potentiels :
  - [ ] Spécialiste UX/UI (designer)
  - [ ] Expert SIG / PostGIS (sous-traitance)
  - [ ] Hébergeur français (OVH, Scaleway, Outscale)

#### Préparation du mémoire technique type

- [ ] Présentation de la société
- [ ] Méthodologie projet (agile adaptée au public)
- [ ] Compréhension du contexte hydrologique
- [ ] Choix techniques justifiés (stack ouverte)
- [ ] Plan de mise en conformité RGAA + RGPD
- [ ] Plan de réversibilité et documentation
- [ ] Références projets (à compléter d'ici là)
- [ ] CV de l'équipe / sous-traitants
- [ ] Calendrier prévisionnel
- [ ] Tarifs (DPGF)

#### Documents administratifs à préparer

- [ ] Attestations sociales et fiscales à jour
- [ ] Extrait Kbis
- [ ] Attestation responsabilité civile professionnelle
- [ ] Attestation vigilance URSSAF
- [ ] DC1, DC2 ou DUME à jour

---

### Phase 7 — Candidature (printemps-été 2027)

- [ ] Téléchargement DCE dès publication
- [ ] Analyse approfondie sous 48h
- [ ] Décision GO / NO-GO selon critères de candidature
- [ ] Envoi questions via PLACE si nécessaire (10 jours avant date limite)
- [ ] Constitution dossier complet
- [ ] Dépôt sur PLACE avant date limite

---

## 5. Compétences à développer (par ordre de priorité)

### Priorité haute (essentiel pour le SIEMP)

- [ ] **API Hub'eau** : maîtriser endpoints, pagination, formats de réponse
- [ ] **Leaflet avancé** : layers, clustering, custom markers, popups, controls
- [ ] **Séries temporelles** : Chart.js / Plotly avec gros volumes
- [ ] **PostGIS** : extension PostgreSQL pour données géospatiales
- [ ] **RGAA 4.1** : référentiel d'accessibilité pour le secteur public

### Priorité moyenne (différenciateurs)

- [ ] **Sandre** : référentiels métiers de l'eau (codes stations, masses d'eau)
- [ ] **WMS / WFS** : standards OGC pour cartographie interopérable
- [ ] **PWA** : Progressive Web App pour expérience mobile
- [ ] **Performance frontend** : optimisation Lighthouse, lazy loading, tile caching

### Priorité basse (nice to have)

- [ ] **GeoServer / MapServer** : serveurs cartographiques
- [ ] **Projections géodésiques** : RGF93, Lambert 93, transformations
- [ ] **D3.js avancé** : visualisations custom complexes
- [ ] **MapLibre GL JS** : alternative moderne à Leaflet pour gros volumes

---

## 6. Ressources et liens utiles

### APIs et données publiques

- Hub'eau : https://hubeau.eaufrance.fr
- Sandre : https://sandre.eaufrance.fr
- Eaufrance : https://www.eaufrance.fr
- IGN Géoservices : https://geoservices.ign.fr
- data.gouv.fr (jeux de données) : https://www.data.gouv.fr

### Plateformes de marchés publics

- PLACE : https://www.marches-publics.gouv.fr
- BOAMP : https://www.boamp.fr
- France Marchés : https://www.francemarches.com
- TED Europe : https://ted.europa.eu

### Référentiels techniques

- RGAA 4.1 : https://accessibilite.numerique.gouv.fr
- RGPD CNIL : https://www.cnil.fr
- ANSSI guides : https://cyber.gouv.fr

### Documentation cartographie

- Leaflet : https://leafletjs.com
- MapLibre : https://maplibre.org
- PostGIS : https://postgis.net
- OpenStreetMap : https://www.openstreetmap.org

### Veille concurrentielle

- SILAOS (cabinet AMO local) : https://silaos.fr
- Sites des AMO français en numérique public : à identifier

---

## 7. Risques et points d'attention

### Risques juridiques

- ⚠️ Aucun contact privilégié avec l'EPMP pendant la procédure du marché AMO
- ⚠️ Aucune mention du marché AOO_2026-02 dans mes communications
- ⚠️ Toute question officielle uniquement via PLACE

### Risques de positionnement

- ⚠️ NE PAS me déclarer "expert cartographie" : positionnement honnête en montée en compétences
- ⚠️ NE PAS proposer de stack exotique (Flutter, Next.js custom) : rester sur du standard ouvert
- ⚠️ NE PAS sous-estimer la concurrence (cabinets data établis avec références)

### Risques structurels

- ⚠️ Plafond auto-entreprise : décision société à prendre courant 2026-début 2027
- ⚠️ Capacités financières : un marché public de ce volume demande des références CA
- ⚠️ Ressources humaines : prévoir sous-traitants ou groupement pour absorber un projet 12-18 mois

### Risques calendaires

- ⚠️ Le marché de dev pourrait être décalé (budgets, retards AMO)
- ⚠️ Possibilité d'allotissement défavorable au profil solo
- ⚠️ Critères pondérés pouvant favoriser les gros cabinets

---

## 8. Indicateurs de progression

### Trimestre 2 2026 (mai-juin)

- [ ] Démo Hub'eau en ligne
- [ ] Article blog publié
- [ ] Mail de présentation envoyé à l'EPMP

### Trimestre 3 2026 (juil-sept)

- [ ] Démo enrichie (piézométrie, alertes, PWA)
- [ ] Score Lighthouse > 90
- [ ] Audit RGAA niveau AA

### Trimestre 4 2026 (oct-déc)

- [ ] Attributaire AMO identifié
- [ ] Contact pris avec le cabinet AMO
- [ ] Décision passage société prise

### Trimestre 1 2027 (jan-mars)

- [ ] Société créée si décision GO
- [ ] Mémoire technique type rédigé
- [ ] Documents administratifs prêts

### Trimestre 2 2027 (avr-juin)

- [ ] Marché de dev publié
- [ ] Candidature déposée

---

## 9. Notes et observations

*Espace libre pour mes observations au fil de l'eau*

```
[Date]    [Note]

08/05/2026  Plan d'action initial créé après analyse du DCE de l'AMO_2026-02.
            Décision : ne pas candidater à l'AMO, se positionner pour le marché de dev.
```

---

*Ce document est un outil de travail personnel. À mettre à jour régulièrement (suggestion : revue mensuelle).*
