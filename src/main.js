import { gameState } from './state.js';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { GameEngine } from './engine.js';
import { loadMaps } from './tilemap.js';
import { setupUI } from './ui.js';
import { ensureFarmland, advanceDay as advanceMapDay } from './crops.js';
import { loadGame, saveGame } from './save.js';

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Impossible de charger ${path}`);
  return response.json();
}

async function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  const [items, crops, villagers, quests, monsters] = await Promise.all([
    loadJSON('data/items.json'),
    loadJSON('data/crops.json'),
    loadJSON('data/villagers.json'),
    loadJSON('data/quests.json'),
    loadJSON('data/monsters.json')
  ]);

  gameState.loadData({ items, crops, villagers, quests, monsters });
  await loadMaps();

  const saved = await loadGame();
  gameState.hydrate(saved);

  if (!gameState.inventory.some(Boolean)) {
    gameState.inventory[0] = { id: 'parsnip_seed', qty: 5 };
    gameState.inventory[1] = { id: 'strawberry_seed', qty: 2 };
  }

  if (!gameState.maps.has(gameState.currentMapId)) {
    gameState.setCurrentMap('farm');
  } else {
    gameState.setCurrentMap(gameState.currentMapId);
  }

  const currentMap = gameState.currentMap;
  ensureFarmland(currentMap.id);

  const spawnX = gameState.playerPosition?.x || currentMap.tileSize * (currentMap.width / 2);
  const spawnY = gameState.playerPosition?.y || currentMap.tileSize * (currentMap.height / 2);
  const player = new Player(spawnX, spawnY, currentMap.tileSize);

  const input = new InputManager(canvas);
  const ui = setupUI({
    onSleep: () => sleep(engine, player, ui),
    onSave: () => persist(player),
    onBuy: stock => handleBuy(stock, ui),
    onSell: itemId => handleSell(itemId, ui)
  });

  const engine = new GameEngine(canvas, player, input, ui, {
    onDayEnded: () => persist(player),
    onNotification: message => gameState.queueNotification(message),
    onWarp: warp => switchMap(engine, player, warp)
  });

  bindInput(input, ui);
  engine.start();
  gameState.ready = true;
  gameState.queueNotification('Bienvenue à Valpré !');
}

function bindInput(input, ui) {
  input.registerKeyPress('i', () => ui.toggleInventory());
  input.registerKeyPress('escape', () => ui.togglePause());
  for (let i = 0; i < 5; i++) {
    input.registerKeyPress(String(i + 1), () => {
      gameState.selectedToolIndex = i;
      ui.inventoryController.renderToolbar();
    });
  }
}

function switchMap(engine, player, warp) {
  const targetMap = gameState.maps.get(warp.target);
  if (!targetMap) return;
  gameState.setCurrentMap(targetMap.id);
  ensureFarmland(targetMap.id);
  player.tileSize = targetMap.tileSize;
  player.x = (warp.tx ?? Math.floor(targetMap.width / 2)) * targetMap.tileSize + targetMap.tileSize / 2;
  player.y = (warp.ty ?? Math.floor(targetMap.height / 2)) * targetMap.tileSize + targetMap.tileSize;
  gameState.playerPosition = { mapId: targetMap.id, x: player.x, y: player.y };
  engine.currentDay = gameState.day;
  gameState.queueNotification(targetMap.name);
}

function handleBuy(stock, ui) {
  const item = gameState.items.get(stock.id);
  if (!item) return;
  if (gameState.gold < stock.price) {
    gameState.queueNotification('Pas assez d\'or');
    return;
  }
  if (gameState.addItemToInventory(stock.id, 1)) {
    gameState.gold -= stock.price;
    ui.inventoryController.renderAll();
    gameState.queueNotification(`Achat : ${item.name}`);
  } else {
    gameState.queueNotification('Inventaire plein');
  }
}

function handleSell(itemId, ui) {
  const item = gameState.items.get(itemId);
  if (!item || !item.sell) return;
  if (gameState.removeItemFromInventory(itemId, 1)) {
    gameState.gold += item.sell;
    ui.inventoryController.renderAll();
    gameState.queueNotification(`+${item.sell}g`);
  }
}

async function persist(player) {
  gameState.playerPosition = { mapId: gameState.currentMapId, x: player.x, y: player.y };
  await saveGame(gameState.serialize());
  gameState.queueNotification('Sauvegarde réussie');
}

function sleep(engine, player, ui) {
  gameState.day += 1;
  gameState.time = 6 * 60;
  gameState.energy = gameState.maxEnergy;
  engine.currentDay = gameState.day;
  gameState.maps.forEach((map, id) => advanceMapDay(id));
  persist(player);
  ui.togglePause(false);
}

window.addEventListener('load', bootstrap);
