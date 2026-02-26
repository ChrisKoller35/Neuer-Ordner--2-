// ============================================================
// HUB MENU UI - Globales Schnellzugriffsmenü
// ============================================================
"use strict";

import S from '../core/sharedState.js';
import { ManifestAssets, spriteReady } from '../core/assets.js';

const HUB_CARDS = [
	{ id: 'talent', label: 'Talentbaum', hotkey: 'U', action: 'openTalentTree' },
	{ id: 'upgrade', label: 'Upgrades', hotkey: null, action: 'openUpgrade' },
	{ id: 'merchant', label: 'Händler', hotkey: null, action: 'openMerchant' },
	{ id: 'garden', label: 'Gärtner', hotkey: null, action: 'openGarden' },
	{ id: 'harbor', label: 'Hafen', hotkey: null, action: 'openHarbor' },
	{ id: 'teleporter', label: 'Teleporter', hotkey: 'E', action: 'openTeleporter' },
	{ id: 'missions', label: 'Missionen', hotkey: null, action: 'openMissions' },
	{ id: 'inventory', label: 'Inventar', hotkey: 'I', action: 'openInventory' },
	{ id: 'academy', label: 'Akademie', hotkey: null, action: 'openAcademy' }
];

export function createHubMenu(ctx) {
	const {
		getState,
		getCityUI,
		getBuildingsManager
	} = ctx;

	let overlayEl = null;
	let statusEl = null;

		function getIconKeywords(action) {
			switch (action) {
				case 'openTalentTree': return ['talent'];
				case 'openUpgrade': return ['upgrade'];
				case 'openMerchant': return ['merchant'];
				case 'openGarden': return ['garden'];
				case 'openHarbor': return ['harbor'];
				case 'openTeleporter': return ['teleporter'];
				case 'openMissions': return ['quest', 'mission'];
				case 'openInventory': return ['inventory'];
				case 'openAcademy': return ['academy'];
				default: return [];
			}
		}

		function pickHubSpriteEntry(action) {
			const all = ManifestAssets.getGeneratedSprites()
				.filter(entry => entry && entry.category === 'ui-hub')
				.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

			const keywords = getIconKeywords(action);
			if (!keywords.length) return null;

			for (const entry of all) {
				const haystack = `${entry.key || ''} ${entry.id || ''} ${entry.prompt || ''}`.toLowerCase();
				if (keywords.some(keyword => haystack.includes(keyword))) {
					return entry;
				}
			}

			return null;
		}

		function buildHubSpriteIndex() {
			const index = {};
			HUB_CARDS.forEach(card => {
				index[card.action] = pickHubSpriteEntry(card.action);
			});
			return index;
		}

		function refreshCardIcons() {
			if (!overlayEl) return;
			const spriteIndex = buildHubSpriteIndex();
			const cards = overlayEl.querySelectorAll('.hub-card');
			cards.forEach(cardEl => {
				const action = cardEl.dataset.action;
				const iconEl = cardEl.querySelector('.hub-card-icon');
				if (!iconEl) return;

				const entry = spriteIndex[action];
				if (!entry) {
					iconEl.style.backgroundImage = '';
					iconEl.classList.add('hub-card-icon-empty');
					iconEl.textContent = '◈';
					return;
				}

				const sprite = ManifestAssets.getAsset('generatedSprites', entry.key);
				if (!spriteReady(sprite)) {
					iconEl.style.backgroundImage = '';
					iconEl.classList.add('hub-card-icon-empty');
					iconEl.textContent = '◈';
					return;
				}

				iconEl.classList.remove('hub-card-icon-empty');
				iconEl.textContent = '';
				iconEl.style.backgroundImage = `url("${sprite.src}")`;
			});
		}

	function ensureDom() {
		if (overlayEl) return;

		overlayEl = document.createElement('div');
		overlayEl.id = 'hubOverlay';
		overlayEl.className = 'hub-overlay';
		overlayEl.style.display = 'none';

		overlayEl.innerHTML = `
			<div class="hub-panel" role="dialog" aria-label="Cashfish Hub">
				<div class="hub-title">◈ C A S H F I S H – H U B</div>
				<div class="hub-grid"></div>
				<div class="hub-footer">Tab / Esc: Schließen</div>
				<div class="hub-status" aria-live="polite"></div>
			</div>
		`;

		overlayEl.addEventListener('click', e => {
			if (e.target === overlayEl) {
				close();
			}
		});

		document.body.appendChild(overlayEl);

		const grid = overlayEl.querySelector('.hub-grid');
		statusEl = overlayEl.querySelector('.hub-status');
		if (!grid || !statusEl) return;

		HUB_CARDS.forEach(card => {
			const cardEl = document.createElement('button');
			cardEl.type = 'button';
			cardEl.className = 'hub-card';
			cardEl.dataset.action = card.action;
			cardEl.innerHTML = `
				<div class="hub-card-icon" aria-hidden="true"></div>
				<div class="hub-card-label">${card.label}</div>
				${card.hotkey ? `<div class="hub-card-key">${card.hotkey}</div>` : ''}
			`;
			cardEl.addEventListener('click', () => runAction(card.action));
			grid.appendChild(cardEl);
		});

		ManifestAssets.preloadGeneratedSprites()
			.then(() => refreshCardIcons())
			.catch(() => refreshCardIcons());
	}

	function setStatus(message) {
		if (!statusEl) return;
		statusEl.textContent = message || '';
	}

	function isCityLikeMode() {
		const state = getState();
		return state?.mode === 'city';
	}

	function isCityOrBuildingMode() {
		const state = getState();
		return state?.mode === 'city' || state?.mode === 'building';
	}

	function runAction(action) {
		const cityUI = getCityUI();
		const buildingsManager = getBuildingsManager ? getBuildingsManager() : null;

		const closeCityPanels = () => {
			cityUI?.setInventoryOpen(false);
			cityUI?.setShopOpen(false);
			cityUI?.setMissionOpen(false);
		};

		switch (action) {
			case 'openInventory':
				if (!isCityLikeMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				cityUI?.setInventoryOpen(true);
				setStatus('Inventar geöffnet');
				close();
				return;
			case 'openMerchant':
				if (!isCityLikeMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				cityUI?.setShopOpen(true);
				setStatus('Händler geöffnet');
				close();
				return;
			case 'openMissions':
				if (!isCityLikeMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				cityUI?.setMissionOpen(true);
				setStatus('Missionen geöffnet');
				close();
				return;
			case 'openTalentTree':
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', code: 'KeyU' }));
				setStatus('Talentbaum umgeschaltet');
				close();
				return;
			case 'openUpgrade':
				if (!isCityLikeMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				if (buildingsManager?.openHubScreen?.('upgrade')) {
					setStatus('Upgrade-Menü geöffnet');
					close();
					return;
				}
				setStatus('Upgrade-Menü nicht verfügbar');
				return;
			case 'openGarden':
				if (!isCityLikeMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				if (buildingsManager?.openHubScreen?.('garden')) {
					setStatus('Gärtnerei geöffnet');
					close();
					return;
				}
				setStatus('Gärtnerei nicht verfügbar');
				return;
			case 'openHarbor':
				if (!isCityLikeMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				if (buildingsManager?.openHubScreen?.('harbor')) {
					setStatus('Hafen geöffnet');
					close();
					return;
				}
				setStatus('Hafen nicht verfügbar');
				return;
			case 'openAcademy':
				if (!isCityLikeMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				if (buildingsManager?.openHubScreen?.('academy')) {
					setStatus('Akademie geöffnet');
					close();
					return;
				}
				setStatus('Akademie nicht verfügbar');
				return;
			case 'openTeleporter':
				if (!isCityOrBuildingMode()) return setStatus('In der Stadt verfügbar');
				closeCityPanels();
				if (buildingsManager?.openHubScreen?.('teleporter')) {
					setStatus('Teleporter-Karte geöffnet');
					close();
					return;
				}
				setStatus('Teleporter nicht verfügbar');
				return;
			default:
				setStatus('In der Stadt verfügbar');
		}
	}

	function open() {
		ensureDom();
		if (!overlayEl) return;
		refreshCardIcons();
		overlayEl.style.display = 'flex';
		S.hubOpen = true;
		setStatus('');
	}

	function close() {
		if (!overlayEl) return;
		overlayEl.style.display = 'none';
		S.hubOpen = false;
	}

	function toggle() {
		if (isOpen()) close();
		else open();
	}

	function isOpen() {
		return !!overlayEl && overlayEl.style.display !== 'none';
	}

	return {
		open,
		close,
		toggle,
		isOpen
	};
}

export default { createHubMenu };
