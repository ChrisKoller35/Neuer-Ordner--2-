// ============================================================
// CITY UI MODULE - Verwaltung der Stadt-UI-Elemente
// ============================================================
"use strict";

export function mapItemToInventoryTab(itemData) {
	if (!itemData) return "material";
	if (itemData.itemType === "consumable") return "consumable";
	const newCategory = itemData.category;
	if (newCategory === "weapon" || newCategory === "armor") return "equipment";
	if (newCategory === "utility" || newCategory === "economy" || newCategory === "companion") return "material";
	if (newCategory === "dungeon") {
		return itemData.itemType === "consumable" ? "consumable" : "material";
	}
	if (itemData.category) return itemData.category;
	if (itemData.type === "weapon" || itemData.type === "armor") return "equipment";
	if (itemData.type === "consumable") return "consumable";
	return "material";
}

/**
 * Erstellt ein City-UI Controller-Objekt
 * @param {Object} ctx - Kontext-Objekt mit allen Abhängigkeiten
 * @param {Object} ctx.elements - DOM-Elemente { inventoryEl, merchantEl, missionEl, bannerEl }
 * @param {Function} ctx.getState - Funktion die den aktuellen State zurückgibt
 * @param {Function} ctx.getInventory - Funktion die das Inventar zurückgibt
 * @param {Function} ctx.getItemData - Funktion zum Abrufen von Item-Daten
 * @param {Array} ctx.shopItems - Liste der Shop-Items
 * @param {Array} ctx.missions - Liste der Missionen
 * @param {Function} ctx.onResetGame - Callback für Mission-Start
 * @param {Function} ctx.onUpdateHUD - Callback für HUD-Update
 * @param {string} ctx.armorItemName - Name des Rüstungs-Items
 * @returns {Object} City-UI Controller
 */
export function createCityUI(ctx) {
	const {
		elements,
		getState,
		getInventory,
		getItemData,
		shopItems,
		missions,
		onResetGame,
		onStartMission,
		onUpdateHUD,
		armorItemName
	} = ctx;

	// UI-State (lokal)
	let inventoryOpen = false;
	let shopOpen = false;
	let shopSelection = null;
	let missionOpen = false;
	let missionSelection = null;
	let dragState = null;
	let dragGhost = null;
	let activeInvTab = "all";

	// ============================================================
	// VISIBILITY SYNC
	// ============================================================

	const syncInventoryVisibility = () => {
		if (!elements.inventoryEl) return;
		const state = getState();
		elements.inventoryEl.style.display = (state.mode === "city" && inventoryOpen) ? "block" : "none";
	};

	const syncShopVisibility = () => {
		if (!elements.merchantEl) return;
		const state = getState();
		elements.merchantEl.style.display = (state.mode === "city" && shopOpen) ? "block" : "none";
	};

	const syncMissionVisibility = () => {
		if (!elements.missionEl) return;
		const state = getState();
		elements.missionEl.style.display = (state.mode === "city" && missionOpen) ? "block" : "none";
	};

	const syncAllVisibility = () => {
		syncInventoryVisibility();
		syncShopVisibility();
		syncMissionVisibility();
	};

	// ============================================================
	// INVENTORY HELPERS
	// ============================================================

	/** Leitet die Inventar-Kategorie aus Item-Daten ab */
	const getItemCategory = (itemData) => {
		return mapItemToInventoryTab(itemData);
	};

	// ============================================================
	// INVENTORY UI
	// ============================================================

	const updateInventoryUI = () => {
		if (!elements.inventoryEl) return;
		const inventory = getInventory();

		const renderSlot = (slotName, label, value) => {
			const el = elements.inventoryEl.querySelector(`[data-slot="${slotName}"]`);
			if (!el) return;
			const data = value ? getItemData(value) : null;
			el.classList.toggle("filled", !!value);
			el.dataset.item = value || "";
			if (!value) {
				el.innerHTML = `<span class="city-slot-label">${label}</span>`;
				el.title = "";
				return;
			}
			const iconHtml = data && data.icon ? `<span class="city-item-icon" style="background-image:url('${data.icon}')"></span>` : "";
			el.innerHTML = `${iconHtml}<span class="city-slot-name">${data ? data.label : value}</span>`;
			el.title = data ? data.label : value;
		};

		// Equip-Slots (immer sichtbar)
		renderSlot("weapon", "Waffe", inventory.equipment.weapon);
		renderSlot("armor", "Rüstung", inventory.equipment.armor);
		renderSlot("armor2", "Rüstung II", inventory.equipment.armor2);

		// Inventar-Grid dynamisch erzeugen/aktualisieren
		const grid = elements.inventoryEl.querySelector("#cityInvGrid");
		if (!grid) return;

		// Slots dynamisch erzeugen falls noch nicht vorhanden oder Anzahl geändert
		const existingSlots = grid.querySelectorAll(".city-slot");
		if (existingSlots.length !== inventory.items.length) {
			grid.innerHTML = "";
			for (let i = 0; i < inventory.items.length; i++) {
				const slotDiv = document.createElement("div");
				slotDiv.className = "city-slot";
				slotDiv.dataset.slot = `inv-${i + 1}`;
				slotDiv.innerHTML = `<span class="city-slot-label">Slot ${i + 1}</span>`;
				grid.appendChild(slotDiv);
			}
		}

		// Alle Inventar-Slots rendern und nach Tab filtern
		let totalItems = 0;
		let filteredCount = 0;
		for (let i = 0; i < inventory.items.length; i++) {
			const slotName = `inv-${i + 1}`;
			const value = inventory.items[i];
			const data = value ? getItemData(value) : null;
			const category = data ? getItemCategory(data) : null;

			if (value) totalItems++;

			// Tab-Filter: "all" zeigt alles, sonst nur passende Kategorie + leere Slots
			const slotEl = grid.querySelector(`[data-slot="${slotName}"]`);
			if (slotEl) {
				let visible = true;
				if (activeInvTab !== "all") {
					visible = !value || category === activeInvTab;
				}
				slotEl.style.display = visible ? "" : "none";
				if (visible && value) filteredCount++;
			}

			renderSlot(slotName, `Slot ${i + 1}`, value);
		}

		// Tab-Buttons aktualisieren
		const tabBar = elements.inventoryEl.querySelector("#cityInvTabs");
		if (tabBar) {
			for (const btn of tabBar.querySelectorAll(".city-inv-tab")) {
				btn.classList.toggle("active", btn.dataset.invTab === activeInvTab);
			}
		}

		// Slot-Info anzeigen
		const infoEl = elements.inventoryEl.querySelector("#cityInvSlotInfo");
		if (infoEl) {
			infoEl.textContent = `${totalItems} / ${inventory.items.length} Slots belegt`;
		}
	};

	// ============================================================
	// SHOP UI
	// ============================================================

	const updateShopUI = () => {
		if (!elements.merchantEl) return;
		const grid = elements.merchantEl.querySelector("#cityMerchantGrid");

		if (grid && grid.childElementCount === 0) {
			shopItems.forEach(item => {
				const data = getItemData(item);
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "city-merchant-item";
				if (data && data.icon) {
					btn.classList.add("has-icon");
					btn.innerHTML = `<span class="city-item-name">${data.label}</span><span class="city-item-icon" style="background-image:url('${data.icon}')"></span>`;
					btn.title = data.label;
					btn.setAttribute("aria-label", data.label);
				} else {
					btn.textContent = data ? data.label : item;
				}
				btn.dataset.item = item;
				grid.appendChild(btn);
			});
		}

		const confirm = elements.merchantEl.querySelector("#cityMerchantConfirm");
		const confirmText = elements.merchantEl.querySelector("#cityMerchantConfirmText");
		const confirmPreview = elements.merchantEl.querySelector("#cityMerchantConfirmPreview");
		const confirmEffect = elements.merchantEl.querySelector("#cityMerchantConfirmEffect");

		if (confirm && confirmText) {
			if (shopSelection) {
				const data = getItemData(shopSelection);
				confirm.classList.add("active");
				confirmText.textContent = data ? data.label : shopSelection;
				if (confirmPreview) {
					const typeLabel = data && data.type === "armor" ? "Rüstung" : "Item";
					const iconHtml = data && data.icon ? `<span class="city-item-icon" style="background-image:url('${data.icon}')"></span>` : "";
					confirmPreview.innerHTML = `
						<div class="city-merchant-type">${typeLabel}</div>
						<div class="city-merchant-image">${iconHtml}</div>
					`;
				}
				if (confirmEffect) {
					confirmEffect.textContent = data && data.effect ? data.effect : "";
				}
			} else {
				confirm.classList.remove("active");
				confirmText.textContent = "Item kaufen?";
				if (confirmPreview) confirmPreview.textContent = "";
				if (confirmEffect) confirmEffect.textContent = "";
			}
		}
	};

	// ============================================================
	// MISSION UI
	// ============================================================

	const updateMissionUI = () => {
		if (!elements.missionEl) return;
		const list = elements.missionEl.querySelector("#cityMissionList");

		if (list && list.childElementCount === 0) {
			missions.forEach(mission => {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "city-mission-item";
				btn.textContent = `${mission.label} · ${mission.description}`;
				btn.dataset.mission = mission.id;
				list.appendChild(btn);
			});
		}

		const confirm = elements.missionEl.querySelector("#cityMissionConfirm");
		const confirmText = elements.missionEl.querySelector("#cityMissionConfirmText");

		if (confirm && confirmText) {
			if (missionSelection) {
				confirm.classList.add("active");
				confirmText.textContent = "Möchten Sie die Mission starten?";
			} else {
				confirm.classList.remove("active");
				confirmText.textContent = "Mission starten?";
			}
		}
	};

	// ============================================================
	// SLOT HELPERS
	// ============================================================

	const getSlotItem = slotName => {
		if (!slotName) return null;
		const inventory = getInventory();
		if (slotName.startsWith("inv-")) {
			const index = Math.max(0, Number.parseInt(slotName.split("-")[1], 10) - 1);
			return inventory.items[index] || null;
		}
		return inventory.equipment[slotName] || null;
	};

	const setSlotItem = (slotName, value) => {
		if (!slotName) return;
		const inventory = getInventory();
		if (slotName.startsWith("inv-")) {
			const index = Math.max(0, Number.parseInt(slotName.split("-")[1], 10) - 1);
			inventory.items[index] = value || null;
			return;
		}
		inventory.equipment[slotName] = value || null;
	};

	const canEquipItem = (slotName, itemName) => {
		if (!itemName) return false;
		const data = getItemData(itemName);
		if (slotName === "armor") return data && data.type === "armor";
		return slotName === "weapon" || slotName === "armor2";
	};

	const refreshArmorCharge = () => {
		const inventory = getInventory();
		const state = getState();
		const armorEquipped = inventory.equipment.armor === armorItemName;
		state.armorShieldCharges = armorEquipped ? 1 : 0;
		if (onUpdateHUD) onUpdateHUD();
	};

	// ============================================================
	// DRAG & DROP
	// ============================================================

	const cleanupDrag = () => {
		if (dragGhost && dragGhost.parentElement) {
			dragGhost.parentElement.removeChild(dragGhost);
		}
		dragGhost = null;
		dragState = null;
	};

	const beginDrag = (slotEl, slotName, itemName, startEvent) => {
		if (!slotEl || !slotName || !itemName) return;
		const data = getItemData(itemName);
		dragState = { item: itemName, from: slotName };

		dragGhost = document.createElement("div");
		dragGhost.className = "city-drag-ghost";
		const iconHtml = data && data.icon ? `<span class="city-item-icon" style="background-image:url('${data.icon}')"></span>` : "";
		dragGhost.innerHTML = `${iconHtml}<span>${data ? data.label : itemName}</span>`;
		document.body.appendChild(dragGhost);

		const moveGhost = e => {
			if (!dragGhost) return;
			dragGhost.style.left = `${e.clientX + 12}px`;
			dragGhost.style.top = `${e.clientY + 12}px`;
		};
		moveGhost(startEvent);

		const handleMove = e => moveGhost(e);
		const handleUp = e => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUp);

			const target = document.elementFromPoint(e.clientX, e.clientY);
			const slotTarget = target ? target.closest(".city-slot") : null;
			const toSlot = slotTarget ? slotTarget.dataset.slot : null;

			if (toSlot && toSlot !== slotName) {
				const targetItem = getSlotItem(toSlot);
				if (toSlot.startsWith("inv-") || canEquipItem(toSlot, itemName)) {
					setSlotItem(toSlot, itemName);
					setSlotItem(slotName, targetItem);
					if (toSlot === "armor" || slotName === "armor") refreshArmorCharge();
					updateInventoryUI();
				}
			}
			cleanupDrag();
		};

		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUp, { once: true });
	};

	// ============================================================
	// ITEM KAUFEN
	// ============================================================

	const tryAddItem = itemName => {
		const inventory = getInventory();
		const slotIndex = inventory.items.findIndex(item => !item);
		if (slotIndex === -1) {
			if (elements.bannerEl) elements.bannerEl.textContent = "Inventar voll";
			return false;
		}
		inventory.items[slotIndex] = itemName;
		updateInventoryUI();
		if (elements.bannerEl) elements.bannerEl.textContent = `Gekauft: ${itemName}`;
		return true;
	};

	// ============================================================
	// EVENT HANDLERS SETUP
	// ============================================================

	const setupEventListeners = () => {
		// Inventory Tab Clicks
		if (elements.inventoryEl) {
			elements.inventoryEl.addEventListener("click", event => {
				// Dungeon-Schutz
				const state = getState();
				if (state.mode === 'dungeon' || state.mode === 'dungeon_menu') return;
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const tab = target.closest(".city-inv-tab");
				if (tab && tab.dataset.invTab) {
					activeInvTab = tab.dataset.invTab;
					updateInventoryUI();
				}
			});
		}

		// Inventory Drag & Drop
		if (elements.inventoryEl) {
			elements.inventoryEl.addEventListener("pointerdown", event => {
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const slot = target.closest(".city-slot");
				if (!slot) return;
				const slotName = slot.dataset.slot;
				const item = getSlotItem(slotName);
				if (!item) return;
				event.preventDefault();
				beginDrag(slot, slotName, item, event);
			});
		}

		// Shop Click Handler
		if (elements.merchantEl) {
			elements.merchantEl.addEventListener("click", event => {
				// Dungeon-Schutz
				const state = getState();
				if (state.mode === 'dungeon' || state.mode === 'dungeon_menu') return;
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const action = target.dataset.action;

				if (action === "close-merchant") {
					shopOpen = false;
					shopSelection = null;
					updateShopUI();
					syncShopVisibility();
					return;
				}
				if (action === "cancel-buy") {
					shopSelection = null;
					updateShopUI();
					return;
				}
				if (action === "buy-item") {
					if (!shopSelection) return;
					if (tryAddItem(shopSelection)) {
						shopSelection = null;
						updateShopUI();
					}
					return;
				}

				const itemBtn = target.closest(".city-merchant-item");
				const item = itemBtn ? itemBtn.dataset.item : null;
				if (item) {
					shopSelection = item;
					updateShopUI();
				}
			});
		}

		// Mission Click Handler
		if (elements.missionEl) {
			elements.missionEl.addEventListener("click", event => {
				// Dungeon-Schutz: Missions-Panel darf im Dungeon nichts auslösen
				const state = getState();
				if (state.mode === 'dungeon' || state.mode === 'dungeon_menu') return;
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const action = target.dataset.action;

				if (action === "close-mission") {
					missionOpen = false;
					missionSelection = null;
					updateMissionUI();
					syncMissionVisibility();
					return;
				}
				if (action === "cancel-mission") {
					missionSelection = null;
					updateMissionUI();
					return;
				}
				if (action === "start-mission") {
					if (!missionSelection) return;
					const selectedMissionId = missionSelection;
					missionOpen = false;
					missionSelection = null;
					syncMissionVisibility();
					// Pass missionId to game for proper level handling
					if (onStartMission) {
						onStartMission(selectedMissionId);
					} else if (onResetGame) {
						onResetGame();
					}
					if (elements.bannerEl) elements.bannerEl.textContent = "Mission gestartet";
					return;
				}

				const missionBtn = target.closest(".city-mission-item");
				const mission = missionBtn ? missionBtn.dataset.mission : null;
				if (mission) {
					missionSelection = mission;
					updateMissionUI();
				}
			});
		}
	};

	// ============================================================
	// PUBLIC API
	// ============================================================

	return {
		// State Getters/Setters
		isInventoryOpen: () => inventoryOpen,
		isShopOpen: () => shopOpen,
		isMissionOpen: () => missionOpen,

		setInventoryOpen: (open) => {
			inventoryOpen = open;
			syncInventoryVisibility();
		},
		setShopOpen: (open) => {
			shopOpen = open;
			if (!open) shopSelection = null;
			syncShopVisibility();
		},
		setMissionOpen: (open) => {
			missionOpen = open;
			if (!open) missionSelection = null;
			syncMissionVisibility();
		},

		// UI Updates
		updateInventoryUI,
		updateShopUI,
		updateMissionUI,
		updateAllUI: () => {
			updateInventoryUI();
			updateShopUI();
			updateMissionUI();
		},

		// Visibility
		syncInventoryVisibility,
		syncShopVisibility,
		syncMissionVisibility,
		syncAllVisibility,

		// Actions
		tryAddItem,
		refreshArmorCharge,

		// Setup
		setupEventListeners,

		// Reset (für enterCity/resetGame)
		reset: () => {
			inventoryOpen = false;
			shopOpen = false;
			shopSelection = null;
			missionOpen = false;
			missionSelection = null;
			syncAllVisibility();
		}
	};
}
