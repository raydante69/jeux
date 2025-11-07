import { gameState } from './state.js';
import { tillPlot, plantCrop, waterPlot, harvestPlot, getPlotState, isPlot, advanceDay as advanceMapDay, drawCrops } from './crops.js';

const MINUTES_PER_SECOND = (24 * 60) / (gameState.dayLengthMinutes * 60);

export class GameEngine {
  constructor(canvas, player, input, ui, { onDayEnded, onNotification, onWarp }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = player;
    this.input = input;
    this.ui = ui;
    this.onDayEnded = onDayEnded;
    this.onNotification = onNotification;
    this.onWarp = onWarp;
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
    this.currentDay = gameState.day;
  }

  start() {
    this.running = true;
    requestAnimationFrame(this.loop.bind(this));
  }

  loop(timestamp) {
    if (!this.running) return;
    if (!this.lastTime) this.lastTime = timestamp;
    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (!gameState.paused) {
      this.update(delta);
      this.draw();
    }
    if (this.ui && typeof this.ui.update === 'function') {
      this.ui.update();
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    const map = gameState.currentMap;
    if (!map) return;

    this.player.update(dt, this.input, map);
    gameState.playerPosition = { mapId: gameState.currentMapId, x: this.player.x, y: this.player.y };

    const minutes = dt * MINUTES_PER_SECOND;
    gameState.advanceTime(minutes);

    if (this.input.consumeAction('primary')) {
      this.handlePrimaryAction(map);
    }

    const warp = map.getWarpAt(this.player.getTilePosition().tx, this.player.getTilePosition().ty);
    if (warp && this.onWarp) {
      this.onWarp(warp);
    }

    if (gameState.day !== this.currentDay) {
      this.currentDay = gameState.day;
      this.handleNewDay();
    }
  }

  handleNewDay() {
    gameState.maps.forEach((map, id) => {
      advanceMapDay(id);
    });
    if (this.onDayEnded) {
      this.onDayEnded();
    }
  }

  handlePrimaryAction(map) {
    const { tx, ty } = this.player.getFacingTile();
    const tool = gameState.toolbar[gameState.selectedToolIndex]?.id;
    const feature = map.getFeatureAt(tx, ty);
    if (feature) {
      this.handleFeatureInteraction(feature);
      return;
    }

    if (tool === 'hoe') {
      const plotState = getPlotState(map, tx, ty);
      if (plotState?.tilled && !plotState.cropId) {
        if (this.tryPlantSeed(map, tx, ty)) {
          return;
        }
      }
      if (tillPlot(map, tx, ty)) {
        gameState.consumeEnergy(2);
        if (this.onNotification) this.onNotification('Terre labourée');
      } else if (this.onNotification) {
        this.onNotification("Impossible ici");
      }
      return;
    }

    if (tool === 'watering_can') {
      if (waterPlot(map, tx, ty)) {
        gameState.consumeEnergy(1);
        if (this.onNotification) this.onNotification('Arrosé');
      }
      return;
    }

    if (tool === 'scythe') {
      const harvest = harvestPlot(map, tx, ty);
      if (harvest) {
        harvest.forEach(item => {
          gameState.addItemToInventory(item.id, item.qty);
        });
        if (this.ui?.inventoryController) {
          this.ui.inventoryController.renderAll();
        }
        if (this.onNotification) this.onNotification('Récolté');
        return;
      }
    }

    if (tool === 'axe' || tool === 'pickaxe' || tool === 'scythe') {
      const resource = map.gatherResource(tx, ty, tool);
      if (resource) {
        gameState.addItemToInventory(resource, 1);
        gameState.consumeEnergy(1);
        if (this.ui?.inventoryController) {
          this.ui.inventoryController.renderAll();
        }
        if (this.onNotification) this.onNotification(`${resource} +1`);
        return;
      }
    }
  }

  tryPlantSeed(map, tx, ty) {
    if (!isPlot(map, tx, ty)) return false;
    const plots = getPlotState(map, tx, ty);
    if (!plots || plots.cropId) return false;
    const seedSlotIndex = gameState.inventory.findIndex(slot => slot && gameState.items.get(slot.id)?.type === 'seed');
    if (seedSlotIndex === -1) return false;
    const seedSlot = gameState.inventory[seedSlotIndex];
    const cropId = gameState.items.get(seedSlot.id)?.crop;
    if (!cropId) return false;
    if (plantCrop(map, tx, ty, cropId)) {
      seedSlot.qty -= 1;
      if (seedSlot.qty <= 0) {
        gameState.inventory[seedSlotIndex] = null;
      }
      if (this.onNotification) this.onNotification('Graine plantée');
      if (this.ui?.inventoryController) {
        this.ui.inventoryController.renderAll();
      }
      gameState.consumeEnergy(1);
      return true;
    }
    return false;
  }

  handleFeatureInteraction(feature) {
    if (!feature) return;
    if (feature.type === 'chest') {
      this.ui.toggleInventory(true);
    }
    if (feature.type === 'shop') {
      this.ui.openShop();
    }
    if (feature.type === 'shipping') {
      const sold = this.sellAllCrops();
      if (sold > 0 && this.onNotification) {
        this.onNotification(`Vente : +${sold}g`);
      }
      if (this.ui?.inventoryController) {
        this.ui.inventoryController.renderAll();
      }
    }
    if (feature.type === 'ladder') {
      if (this.onWarp) {
        this.onWarp({ target: 'mine_1', tx: 5, ty: 14 });
      }
    }
  }

  sellAllCrops() {
    let total = 0;
    for (let i = 0; i < gameState.inventory.length; i++) {
      const slot = gameState.inventory[i];
      if (!slot) continue;
      const item = gameState.items.get(slot.id);
      if (item && item.sell) {
        total += item.sell * slot.qty;
        gameState.inventory[i] = null;
      }
    }
    gameState.gold += total;
    return total;
  }

  draw() {
    const ctx = this.ctx;
    const map = gameState.currentMap;
    if (!map) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    map.draw(ctx);
    this.drawFeatures(ctx, map);
    drawCrops(ctx, map);
    this.player.draw(ctx);
  }

  drawFeatures(ctx, map) {
    const tile = map.tileSize;
    if (map.features.chest) {
      const { x, y } = map.features.chest;
      ctx.fillStyle = '#b08968';
      ctx.fillRect(x * tile + 8, y * tile + 8, tile - 16, tile - 16);
    }
    if (map.features.shop) {
      const { x, y } = map.features.shop;
      ctx.fillStyle = '#ffba08';
      ctx.fillRect(x * tile + 4, y * tile + 4, tile - 8, tile - 8);
    }
    if (map.features.shipping) {
      const { x, y } = map.features.shipping;
      ctx.strokeStyle = '#f77f00';
      ctx.strokeRect(x * tile + 4, y * tile + 4, tile - 8, tile - 8);
    }
    if (map.features.ladder) {
      const { x, y } = map.features.ladder;
      ctx.strokeStyle = '#f4f1de';
      ctx.beginPath();
      ctx.rect(x * tile + 6, y * tile + 6, tile - 12, tile - 12);
      ctx.stroke();
    }
  }
}
