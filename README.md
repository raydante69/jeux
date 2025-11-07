# Valpré - PC Edition

Valpré est un jeu de ferme en 2D jouable dans un navigateur moderne (desktop). Il s'agit d'un prototype inspiré de Stardew Valley réalisé avec HTML5 Canvas et JavaScript (ES Modules) sans dépendance externe.

## Lancement

### Option rapide

1. Téléchargez/cloner le dépôt.
2. Ouvrez `index.html` dans un navigateur moderne (Chrome, Firefox, Edge).
3. Autorisez l'accès à IndexedDB si le navigateur le demande afin de pouvoir sauvegarder.

### Option serveur local (recommandée)

1. Installez Node.js (18+) si ce n'est pas déjà fait.
2. Dans le dossier du projet, lancez `npm run serve`.
3. Ouvrez [http://localhost:4173](http://localhost:4173) dans votre navigateur.
4. Appuyez sur `Ctrl+C` dans le terminal pour arrêter le serveur local.

> **Astuce** : Le jeu fonctionne offline après le premier chargement.

## Contrôles

- ZQSD ou WASD : déplacement
- Souris : sélectionner/drag & drop
- Clic gauche : action / interaction
- I : ouvrir/fermer l'inventaire
- Échap : pause
- Barre d'espace : utiliser l'outil sélectionné

## Fonctionnalités MVP

- Trois zones jouables : Ferme, Village, Mines (niveau 1)
- Système de temps jour/nuit (15 minutes IRL par jour)
- Culture : labourage, plantation, arrosage, récolte, vente
- Inventaire avec drag & drop et coffre partagé
- Boutique pour acheter/vendre
- Récolte de ressources naturelles
- Sauvegarde automatique en fin de journée (IndexedDB)

## Structure du projet

```
/index.html
/styles/
  base.css
  ui.css
/src/
  main.js
  engine.js
  input.js
  state.js
  player.js
  tilemap.js
  crops.js
  inventory.js
  save.js
  ui.js
/data/
  crops.json
  items.json
  fish.json
  villagers.json
  quests.json
  monsters.json
  maps/
     farm.json
     village.json
     mine_1.json
```

## Extensions possibles

- Ajout d'animaux et de bâtiments dédiés
- Profondeur supplémentaire dans les mines avec combat
- Pêche et mini-jeux saisonniers
- PNJ avec routines et système d'amitié
- Système de crafting avancé
- Festivals saisonniers
