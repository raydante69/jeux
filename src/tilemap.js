import { gameState } from './state.js';

const GROUND_COLORS = {
  '0': '#336633',
  '1': '#2f5c2f',
  '2': '#264653',
  '3': '#a47148',
  '4': '#8d5524',
  '5': '#3d405b'
};

const DETAIL_COLORS = {
  '3': '#947c5d',
  '4': '#6f4f28',
  '5': '#c0ca33',
  '6': '#8bc34a',
  'A': '#734f42',
  'B': '#5d4037',
  'P': '#d9c8b4',
  'W': '#4d72b6',
  'r': '#888',
  's': '#ddd',
  'm': '#555',
  'o': '#c49b66',
  'c': '#999999',
  'g': '#a5d6a7',
  't': '#795548'
};

const RESOURCE_TILES = {
  '6': { item: 'fiber', tool: 'scythe' },
  '5': { item: 'wood', tool: 'axe' },
  '4': { item: 'wood', tool: 'axe' },
  'r': { item: 'stone', tool: 'pickaxe' },
  's': { item: 'stone', tool: 'pickaxe' },
  'o': { item: 'stone', tool: 'pickaxe' },
  'g': { item: 'wood', tool: 'axe' }
};

export class TileMap {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.tileSize = data.tileSize;
    this.width = data.width;
    this.height = data.height;
    this.tiles = data.tiles;
    this.collisions = new Set(data.collisions || []);
    this.warps = data.warps || [];
    this.features = data.features || {};
    this.plots = data.plots || [];
  }

  getDetailTile(tx, ty) {
    return this.tiles.detail[ty]?.[tx] ?? '.';
  }

  setDetailTile(tx, ty, value) {
    const row = this.tiles.detail[ty];
    if (!row) return;
    const chars = row.split('');
    chars[tx] = value;
    this.tiles.detail[ty] = chars.join('');
  }

  draw(ctx) {
    for (let y = 0; y < this.height; y++) {
      const groundRow = this.tiles.ground[y];
      const detailRow = this.tiles.detail[y];
      for (let x = 0; x < this.width; x++) {
        const tile = groundRow?.[x] ?? '0';
        const color = GROUND_COLORS[tile] || '#2a9d8f';
        ctx.fillStyle = color;
        ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

        const detail = detailRow?.[x];
        if (detail && detail !== '.') {
          ctx.fillStyle = DETAIL_COLORS[detail] || '#ffffff55';
          ctx.fillRect(
            x * this.tileSize + 4,
            y * this.tileSize + 4,
            this.tileSize - 8,
            this.tileSize - 8
          );
        }
      }
    }
  }

  isWalkable(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return false;
    const groundTile = this.tiles.ground[ty]?.[tx];
    const detailTile = this.tiles.detail[ty]?.[tx];
    if (groundTile && this.collisions.has(groundTile)) return false;
    if (detailTile && this.collisions.has(detailTile)) return false;
    return true;
  }

  isAreaWalkable(bounds) {
    const left = Math.floor(bounds.left / this.tileSize);
    const right = Math.floor((bounds.right - 1) / this.tileSize);
    const top = Math.floor(bounds.top / this.tileSize);
    const bottom = Math.floor((bounds.bottom - 1) / this.tileSize);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (!this.isWalkable(tx, ty)) return false;
      }
    }
    return true;
  }

  getWarpAt(tx, ty) {
    return this.warps.find(w => w.x === tx && w.y === ty) || null;
  }

  getFeatureAt(tx, ty) {
    if (this.features.chest && this.features.chest.x === tx && this.features.chest.y === ty) {
      return { type: 'chest' };
    }
    if (this.features.shop && this.features.shop.x === tx && this.features.shop.y === ty) {
      return { type: 'shop' };
    }
    if (this.features.shipping && this.features.shipping.x === tx && this.features.shipping.y === ty) {
      return { type: 'shipping' };
    }
    if (this.features.ladder && this.features.ladder.x === tx && this.features.ladder.y === ty) {
      return { type: 'ladder' };
    }
    return null;
  }

  forEachPlot(callback) {
    this.plots.forEach(plot => {
      for (let y = plot.y; y < plot.y + plot.height; y++) {
        for (let x = plot.x; x < plot.x + plot.width; x++) {
          callback(x, y);
        }
      }
    });
  }

  gatherResource(tx, ty, toolId) {
    const detail = this.getDetailTile(tx, ty);
    const resource = RESOURCE_TILES[detail];
    if (!resource || (resource.tool && resource.tool !== toolId)) {
      return null;
    }
    this.setDetailTile(tx, ty, '.');
    return resource.item;
  }
}

export async function loadMaps() {
  const mapIds = ['farm', 'village', 'mine_1'];
  const maps = await Promise.all(
    mapIds.map(id => fetch(`data/maps/${id}.json`).then(r => r.json()))
  );
  maps.forEach(map => gameState.registerMap(new TileMap(map)));
}
