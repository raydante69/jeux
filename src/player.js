import { gameState } from './state.js';

export class Player {
  constructor(x, y, tileSize) {
    this.x = x;
    this.y = y;
    this.tileSize = tileSize;
    this.speed = 140;
    this.width = tileSize * 0.6;
    this.height = tileSize * 0.8;
    this.facing = { x: 0, y: 1 };
  }

  get bounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height + 4,
      bottom: this.y
    };
  }

  getTilePosition() {
    return {
      tx: Math.floor(this.x / this.tileSize),
      ty: Math.floor((this.y - this.tileSize / 2) / this.tileSize)
    };
  }

  getFacingTile() {
    const { tx, ty } = this.getTilePosition();
    return { tx: tx + this.facing.x, ty: ty + this.facing.y };
  }

  update(dt, input, tilemap) {
    let dirX = 0;
    let dirY = 0;
    if (input.isKeyDown('w') || input.isKeyDown('z')) dirY -= 1;
    if (input.isKeyDown('s')) dirY += 1;
    if (input.isKeyDown('a') || input.isKeyDown('q')) dirX -= 1;
    if (input.isKeyDown('d')) dirX += 1;

    const length = Math.hypot(dirX, dirY);
    if (length > 0) {
      dirX /= length;
      dirY /= length;
      this.facing.x = Math.round(dirX);
      this.facing.y = Math.round(dirY);
    }

    const nextX = this.x + dirX * this.speed * dt;
    const nextY = this.y + dirY * this.speed * dt;

    const halfWidth = this.width / 2;
    const nextBoundsX = {
      left: nextX - halfWidth,
      right: nextX + halfWidth,
      top: this.bounds.top,
      bottom: this.bounds.bottom
    };
    const nextBoundsY = {
      left: nextX - halfWidth,
      right: nextX + halfWidth,
      top: nextY - this.height + 4,
      bottom: nextY
    };

    if (tilemap.isAreaWalkable(nextBoundsX)) {
      this.x = nextX;
    }
    if (tilemap.isAreaWalkable(nextBoundsY)) {
      this.y = nextY;
    }
  }

  draw(ctx) {
    const color = '#f4d35e';
    ctx.fillStyle = color;
    ctx.fillRect(
      this.x - this.width / 2,
      this.y - this.height,
      this.width,
      this.height
    );
    ctx.fillStyle = '#ee964b';
    ctx.fillRect(
      this.x - this.width / 2,
      this.y - this.height,
      this.width,
      this.height * 0.3
    );
  }
}
