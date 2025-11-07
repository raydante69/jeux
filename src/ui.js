import { gameState, formatTime } from './state.js';
import { InventoryController } from './inventory.js';

export function setupUI({ onSleep, onSave, onBuy, onSell }) {
  const hudDay = document.getElementById('hud-day');
  const hudTime = document.getElementById('hud-time');
  const hudGold = document.getElementById('hud-gold');
  const hudEnergy = document.getElementById('hud-energy');
  const hudLocation = document.getElementById('hud-location');
  const toolbar = document.getElementById('toolbar');
  const inventoryPanel = document.getElementById('inventory');
  const inventoryGrid = document.getElementById('inventory-grid');
  const chestGrid = document.getElementById('chest-grid');
  const pausePanel = document.getElementById('pause');
  const pauseResume = document.getElementById('pause-resume');
  const pauseSleep = document.getElementById('pause-sleep');
  const pauseSave = document.getElementById('pause-save');
  const shopPanel = document.getElementById('shop');
  const shopBuyList = document.getElementById('shop-buy-list');
  const shopSellList = document.getElementById('shop-sell-list');
  const shopClose = document.getElementById('shop-close');
  const dialoguePanel = document.getElementById('dialogue');
  const dialogueContent = document.getElementById('dialogue-content');
  const dialogueClose = document.getElementById('dialogue-close');
  const notifications = document.getElementById('notifications');

  const inventoryController = new InventoryController(
    inventoryGrid,
    chestGrid,
    toolbar,
    gameState.items
  );

  pauseResume.addEventListener('click', () => togglePause());
  pauseSleep.addEventListener('click', () => {
    if (onSleep) onSleep();
  });
  pauseSave.addEventListener('click', () => {
    if (onSave) onSave();
  });
  shopClose.addEventListener('click', () => closeShop());
  dialogueClose.addEventListener('click', () => closeDialogue());

  function togglePause(force) {
    if (typeof force === 'boolean') {
      gameState.paused = force;
    } else {
      gameState.paused = !gameState.paused;
    }
    pausePanel.classList.toggle('hidden', !gameState.paused);
  }

  function toggleInventory(force) {
    const shouldOpen = typeof force === 'boolean' ? force : inventoryPanel.classList.contains('hidden');
    inventoryPanel.classList.toggle('hidden', !shouldOpen);
    if (!shouldOpen && inventoryController.heldItem) {
      // Drop held item back into inventory
      const emptyIndex = gameState.inventory.findIndex(slot => !slot);
      if (emptyIndex >= 0) {
        gameState.inventory[emptyIndex] = inventoryController.heldItem;
        inventoryController.heldItem = null;
      }
    }
    if (shouldOpen) {
      inventoryController.renderAll();
    }
  }

  function openShop() {
    renderShop();
    shopPanel.classList.remove('hidden');
  }

  function closeShop() {
    shopPanel.classList.add('hidden');
  }

  function showDialogue(text) {
    dialogueContent.textContent = text;
    dialoguePanel.classList.remove('hidden');
  }

  function closeDialogue() {
    dialoguePanel.classList.add('hidden');
  }

  function renderShop() {
    shopBuyList.innerHTML = '';
    shopSellList.innerHTML = '';
    gameState.shopStock.forEach(stock => {
      const item = gameState.items.get(stock.id);
      const li = document.createElement('li');
      const label = document.createElement('span');
      const name = item ? item.name : stock.id;
      label.textContent = `${name} - ${stock.price}g`;
      const button = document.createElement('button');
      button.textContent = 'Acheter';
      button.addEventListener('click', () => {
        if (onBuy) {
          onBuy(stock);
          renderShop();
        }
      });
      li.append(label, button);
      shopBuyList.appendChild(li);
    });

    gameState.inventory.forEach(slot => {
      if (!slot) return;
      const item = gameState.items.get(slot.id);
      if (!item || !item.sell) return;
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${item.name} x${slot.qty} - ${item.sell}g`;
      const button = document.createElement('button');
      button.textContent = 'Vendre 1';
      button.addEventListener('click', () => {
        if (onSell) onSell(slot.id);
        renderShop();
      });
      li.append(label, button);
      shopSellList.appendChild(li);
    });
  }



  function updateHUD() {
    hudDay.textContent = `Jour ${gameState.day}`;
    hudTime.textContent = formatTime(gameState.time);
    hudGold.textContent = gameState.gold;
    hudEnergy.textContent = `${gameState.energy}/${gameState.maxEnergy}`;
    hudLocation.textContent = gameState.currentMap?.name || '';
  }

  function updateNotifications() {
    notifications.innerHTML = '';
    const now = performance.now();
    gameState.notifications = gameState.notifications.filter(n => now - n.time < 3000);
    gameState.notifications.forEach(n => {
      const div = document.createElement('div');
      div.classList.add('notification');
      div.textContent = n.message;
      notifications.appendChild(div);
    });
  }

  function update() {
    updateHUD();
    updateNotifications();
  }

  return {
    inventoryController,
    toggleInventory,
    togglePause,
    update,
    openShop,
    closeShop,
    showDialogue,
    closeDialogue,
    refreshShop: renderShop
  };
}
