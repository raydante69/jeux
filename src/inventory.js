import { gameState } from './state.js';

export class InventoryController {
  constructor(inventoryGrid, chestGrid, toolbarEl, itemsCatalog) {
    this.inventoryGrid = inventoryGrid;
    this.chestGrid = chestGrid;
    this.toolbarEl = toolbarEl;
    this.itemsCatalog = itemsCatalog;
    this.heldItem = null;
    this._init();
  }

  _init() {
    this.renderAll();
  }

  renderAll() {
    this.renderToolbar();
    this.renderGrid(this.inventoryGrid, gameState.inventory, 'inventory');
    this.renderGrid(this.chestGrid, gameState.chest, 'chest');
  }

  renderToolbar() {
    this.toolbarEl.innerHTML = '';
    gameState.toolbar.forEach((slot, index) => {
      const div = document.createElement('div');
      div.classList.add('tool-slot');
      if (index === gameState.selectedToolIndex) {
        div.classList.add('active');
      }
      const item = gameState.items.get(slot.id);
      div.textContent = item ? item.name.charAt(0) : '?';
      const label = document.createElement('span');
      label.textContent = index + 1;
      div.appendChild(label);
      div.addEventListener('click', () => {
        gameState.selectedToolIndex = index;
        this.renderToolbar();
      });
      this.toolbarEl.appendChild(div);
    });
  }

  renderGrid(container, data, type) {
    container.innerHTML = '';
    data.forEach((slot, index) => {
      const div = document.createElement('div');
      div.classList.add('slot');
      if (slot) {
        const item = this.itemsCatalog.get(slot.id);
        div.textContent = item ? item.name.charAt(0).toUpperCase() : slot.id;
        const count = document.createElement('span');
        count.classList.add('count');
        count.textContent = slot.qty;
        div.appendChild(count);
      }
      div.addEventListener('click', () => this.onSlotClick(type, index));
      container.appendChild(div);
    });
  }

  onSlotClick(type, index) {
    const container = type === 'inventory' ? gameState.inventory : gameState.chest;
    const slot = container[index];
    if (!this.heldItem && slot) {
      this.heldItem = { ...slot };
      container[index] = null;
    } else if (this.heldItem) {
      if (!slot) {
        container[index] = this.heldItem;
        this.heldItem = null;
      } else if (slot.id === this.heldItem.id) {
        slot.qty += this.heldItem.qty;
        this.heldItem = null;
      } else {
        container[index] = this.heldItem;
        this.heldItem = slot;
      }
    }
    this.renderAll();
  }
}
