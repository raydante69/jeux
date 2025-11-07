export const gameState = {
  ready: false,
  paused: false,
  currentMap: null,
  maps: new Map(),
  items: new Map(),
  crops: new Map(),
  villagers: [],
  quests: [],
  monsters: [],
  inventory: Array(24).fill(null),
  chest: Array(24).fill(null),
  toolbar: [
    { id: 'hoe' },
    { id: 'watering_can' },
    { id: 'axe' },
    { id: 'pickaxe' },
    { id: 'scythe' }
  ],
  selectedToolIndex: 0,
  gold: 500,
  day: 1,
  season: 'printemps',
  time: 6 * 60,
  dayLengthMinutes: 15,
  weather: 'clair',
  energy: 100,
  maxEnergy: 100,
  farmland: new Map(),
  cropGrowth: new Map(),
  shopStock: [],
  notifications: [],
  pendingHarvest: 0,
  playerPosition: { mapId: 'farm', x: 0, y: 0 },
  loadData({ items, crops, villagers, quests, monsters }) {
    items.forEach(item => this.items.set(item.id, item));
    crops.forEach(crop => this.crops.set(crop.id, crop));
    this.villagers = villagers;
    this.quests = quests.map(q => ({ ...q, progress: 0, completed: false }));
    this.monsters = monsters;
    this.shopStock = crops.map(crop => ({ id: `${crop.id}_seed`, price: crop.buy }));
  },
  registerMap(map) {
    this.maps.set(map.id, map);
    if (!this.farmland.has(map.id)) {
      this.farmland.set(map.id, new Map());
    }
    if (!this.cropGrowth.has(map.id)) {
      this.cropGrowth.set(map.id, new Map());
    }
  },
  setCurrentMap(id) {
    this.currentMap = this.maps.get(id);
    this.currentMapId = id;
  },
  getCurrentFarmland() {
    return this.farmland.get(this.currentMapId);
  },
  getCurrentGrowth() {
    return this.cropGrowth.get(this.currentMapId);
  },
  addItemToInventory(itemId, quantity = 1) {
    const item = this.items.get(itemId);
    if (!item) return false;
    for (let i = 0; i < this.inventory.length; i++) {
      const slot = this.inventory[i];
      if (slot && slot.id === itemId && (!item.maxStack || slot.qty < (item.maxStack || 999))) {
        slot.qty += quantity;
        return true;
      }
    }
    for (let i = 0; i < this.inventory.length; i++) {
      if (!this.inventory[i]) {
        this.inventory[i] = { id: itemId, qty: quantity };
        return true;
      }
    }
    this.queueNotification('Inventaire plein');
    return false;
  },
  removeItemFromInventory(itemId, quantity = 1) {
    for (let i = 0; i < this.inventory.length; i++) {
      const slot = this.inventory[i];
      if (slot && slot.id === itemId) {
        if (slot.qty > quantity) {
          slot.qty -= quantity;
          return true;
        }
        if (slot.qty === quantity) {
          this.inventory[i] = null;
          return true;
        }
        quantity -= slot.qty;
        this.inventory[i] = null;
      }
    }
    return quantity <= 0;
  },
  queueNotification(message) {
    this.notifications.push({ message, time: performance.now() });
  },
  advanceTime(deltaMinutes) {
    if (this.paused) return;
    this.time += deltaMinutes;
    if (this.time >= 24 * 60) {
      this.time = 6 * 60;
      this.day += 1;
      this.energy = this.maxEnergy;
      this.queueNotification(`Jour ${this.day}`);
      this.pendingHarvest = 0;
    }
  },
  consumeEnergy(amount) {
    this.energy = Math.max(0, this.energy - amount);
    if (this.energy === 0) {
      this.queueNotification('Vous êtes épuisé...');
    }
  },
  serialize() {
    return {
      gold: this.gold,
      day: this.day,
      season: this.season,
      time: this.time,
      energy: this.energy,
      inventory: this.inventory,
      chest: this.chest,
      farmland: Array.from(this.farmland.entries()).map(([mapId, plots]) => [mapId, Array.from(plots.entries())]),
      cropGrowth: Array.from(this.cropGrowth.entries()).map(([mapId, growth]) => [mapId, Array.from(growth.entries())]),
      currentMapId: this.currentMapId,
      quests: this.quests,
      playerPosition: this.playerPosition
    };
  },
  hydrate(data) {
    if (!data) return;
    this.gold = data.gold ?? this.gold;
    this.day = data.day ?? this.day;
    this.season = data.season ?? this.season;
    this.time = data.time ?? this.time;
    this.energy = data.energy ?? this.energy;
    this.inventory = data.inventory ?? this.inventory;
    this.chest = data.chest ?? this.chest;
    if (Array.isArray(data.farmland)) {
      data.farmland.forEach(([mapId, plots]) => {
        const mapPlots = new Map(plots);
        this.farmland.set(mapId, mapPlots);
      });
    }
    if (Array.isArray(data.cropGrowth)) {
      data.cropGrowth.forEach(([mapId, growth]) => {
        const mapGrowth = new Map(growth);
        this.cropGrowth.set(mapId, mapGrowth);
      });
    }
    this.currentMapId = data.currentMapId ?? 'farm';
    this.quests = data.quests ?? this.quests;
    if (data.playerPosition) {
      this.playerPosition = data.playerPosition;
    }
  }
};

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
