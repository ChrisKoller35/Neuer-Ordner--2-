// ============================================================
// City UI Templates - HTML-Strukturen für Stadt-UI-Elemente
// ============================================================
"use strict";

export const INVENTORY_TEMPLATE = `
	<div class="city-inventory-title">Inventar <span class="city-inventory-sub">I</span></div>
	<div class="city-inventory-section">
		<div class="city-inventory-sub">Ausrüstung</div>
		<div class="city-equip-grid">
			<div class="city-slot" data-slot="weapon">Waffe</div>
			<div class="city-slot" data-slot="armor">Rüstung</div>
			<div class="city-slot" data-slot="armor2">Rüstung II</div>
		</div>
	</div>
	<div class="city-inventory-section">
		<div class="city-inv-tabs" id="cityInvTabs">
			<button class="city-inv-tab active" data-inv-tab="all">Alle</button>
			<button class="city-inv-tab" data-inv-tab="equipment">Ausrüstung</button>
			<button class="city-inv-tab" data-inv-tab="consumable">Verbrauch</button>
			<button class="city-inv-tab" data-inv-tab="material">Material</button>
		</div>
		<div class="city-inv-slot-info" id="cityInvSlotInfo"></div>
		<div class="city-inventory-grid" id="cityInvGrid"></div>
	</div>
`;

export const MERCHANT_TEMPLATE = `
	<div class="city-merchant-title">
		<span>Händler</span>
		<span class="city-merchant-actions">
			<button class="btn" data-action="close-merchant">Schließen</button>
		</span>
	</div>
	<div class="city-merchant-grid" id="cityMerchantGrid"></div>
	<div class="city-merchant-confirm" id="cityMerchantConfirm">
		<div class="city-merchant-confirm-text" id="cityMerchantConfirmText">Item kaufen?</div>
		<div class="city-merchant-confirm-preview" id="cityMerchantConfirmPreview"></div>
		<div class="city-merchant-confirm-effect" id="cityMerchantConfirmEffect"></div>
		<div class="city-merchant-confirm-actions">
			<button class="btn primary" data-action="buy-item">Kaufen</button>
			<button class="btn" data-action="cancel-buy">Abbrechen</button>
		</div>
	</div>
`;

export const MISSION_TEMPLATE = `
	<div class="city-mission-title">
		<span>Missionen</span>
		<span class="city-mission-actions">
			<button class="btn" data-action="close-mission">Schließen</button>
		</span>
	</div>
	<div class="city-mission-list" id="cityMissionList"></div>
	<div class="city-mission-confirm" id="cityMissionConfirm">
		<div class="city-mission-confirm-text" id="cityMissionConfirmText">Mission starten?</div>
		<div class="city-mission-confirm-actions">
			<button class="btn primary" data-action="start-mission">Ja</button>
			<button class="btn" data-action="cancel-mission">Nein</button>
		</div>
	</div>
`;

/**
 * Erstellt oder holt ein UI-Element aus dem DOM
 * @param {string} id - Element-ID
 * @param {Object} config - Konfiguration
 * @returns {HTMLElement}
 */
export function getOrCreateUIElement(id, config) {
	let el = document.getElementById(id);
	if (!el) {
		el = document.createElement(config.tag || "aside");
		el.id = id;
		el.className = config.className || "";
		if (config.ariaLabel) {
			el.setAttribute("aria-label", config.ariaLabel);
		}
		el.innerHTML = config.template || "";
		document.body.appendChild(el);
	}
	return el;
}

/**
 * Erstellt alle Stadt-UI-Elemente
 * @returns {Object} Referenzen zu den UI-Elementen
 */
export function createCityUIElements() {
	const inventoryEl = getOrCreateUIElement("cityInventory", {
		tag: "aside",
		className: "city-inventory",
		ariaLabel: "Inventar",
		template: INVENTORY_TEMPLATE
	});
	
	const merchantEl = getOrCreateUIElement("cityMerchant", {
		tag: "aside",
		className: "city-merchant",
		ariaLabel: "Händler",
		template: MERCHANT_TEMPLATE
	});
	
	const missionEl = getOrCreateUIElement("cityMission", {
		tag: "aside",
		className: "city-mission",
		ariaLabel: "Missionen",
		template: MISSION_TEMPLATE
	});
	
	return { inventoryEl, merchantEl, missionEl };
}
