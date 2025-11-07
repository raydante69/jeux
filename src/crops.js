import { gameState } from './state.js';

function getPlotKey(x, y) {
  return `${x},${y}`;
}

export function ensureFarmland(mapId) {
  if (!gameState.farmland.has(mapId)) {
    gameState.farmland.set(mapId, new Map());
  }
  if (!gameState.cropGrowth.has(mapId)) {
    gameState.cropGrowth.set(mapId, new Map());
  }
  return gameState.farmland.get(mapId);
}

export function isPlot(map, tx, ty) {
  let result = false;
  map.forEachPlot((x, y) => {
    if (x === tx && y === ty) {
      result = true;
    }
  });
  return result;
}

export function tillPlot(map, tx, ty) {
  if (!isPlot(map, tx, ty)) {
    return false;
  }
  const plots = ensureFarmland(map.id);
  const key = getPlotKey(tx, ty);
  const state = plots.get(key) || {};
  state.tilled = true;
  state.watered = false;
  if (!state.cropId) {
    state.stage = 0;
  }
  plots.set(key, state);
  return true;
}

export function plantCrop(map, tx, ty, cropId) {
  const crop = gameState.crops.get(cropId);
  if (!crop) return false;
  const plots = ensureFarmland(map.id);
  const key = getPlotKey(tx, ty);
  const state = plots.get(key);
  if (!state || !state.tilled || state.cropId) return false;
  state.cropId = cropId;
  state.stage = 0;
  state.harvestable = false;
  state.watered = false;
  plots.set(key, state);
  return true;
}

export function waterPlot(map, tx, ty) {
  const plots = ensureFarmland(map.id);
  const key = getPlotKey(tx, ty);
  const state = plots.get(key);
  if (!state || !state.tilled) return false;
  state.watered = true;
  plots.set(key, state);
  return true;
}

export function harvestPlot(map, tx, ty) {
  const plots = ensureFarmland(map.id);
  const key = getPlotKey(tx, ty);
  const state = plots.get(key);
  if (!state || !state.cropId || !state.harvestable) {
    return null;
  }
  const crop = gameState.crops.get(state.cropId);
  if (!crop) return null;
  const items = [{ id: state.cropId, qty: 1, sell: crop.sell }];
  if (crop.regrow) {
    state.harvestable = false;
    state.stage = Math.max(0, crop.days.length - 1);
    state.watered = false;
    plots.set(key, state);
  } else {
    plots.delete(key);
  }
  return items;
}

export function advanceDay(mapId) {
  const plots = ensureFarmland(mapId);
  plots.forEach((state, key) => {
    if (!state.cropId) {
      state.watered = false;
      plots.set(key, state);
      return;
    }
    const crop = gameState.crops.get(state.cropId);
    if (!crop) return;
    if (state.watered) {
      state.stage += 1;
      if (state.stage >= crop.days.length) {
        state.harvestable = true;
      }
    }
    state.watered = false;
    plots.set(key, state);
  });
}

export function drawCrops(ctx, map) {
  const plots = gameState.farmland.get(map.id);
  if (!plots) return;
  plots.forEach((state, key) => {
    const [x, y] = key.split(',').map(Number);
    const px = x * map.tileSize;
    const py = y * map.tileSize;
    if (state.tilled) {
      ctx.fillStyle = '#5c422b';
      ctx.fillRect(px + 2, py + 2, map.tileSize - 4, map.tileSize - 4);
    }
    if (state.cropId) {
      const crop = gameState.crops.get(state.cropId);
      const ratio = Math.min(1, state.stage / crop.days.length);
      ctx.fillStyle = state.harvestable ? '#f1fa8c' : '#4caf50';
      ctx.beginPath();
      ctx.arc(
        px + map.tileSize / 2,
        py + map.tileSize / 2,
        6 + ratio * 6,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    if (state.watered) {
      ctx.fillStyle = 'rgba(80,150,255,0.35)';
      ctx.fillRect(px + 2, py + 2, map.tileSize - 4, map.tileSize - 4);
    }
  });
}

export function getPlotState(map, tx, ty) {
  const plots = ensureFarmland(map.id);
  return plots.get(getPlotKey(tx, ty));
}
