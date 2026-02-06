// ============================================================
// UPGRADE UI - Interface für Spieler-Upgrades beim NPC
// ============================================================
"use strict";

/**
 * Erstellt das Upgrade-UI
 * @param {Object} ctx - Context mit canvas, state, upgradeSystem
 * @returns {Object} UI-Controller
 */
export function createUpgradeUI(ctx) {
    const { canvas, state, upgradeSystem } = ctx;
    
    let container = null;
    let visible = false;
    
    /**
     * Erstellt das UI-DOM
     */
    function createDOM() {
        if (container) return;
        
        container = document.createElement('div');
        container.id = 'upgrade-ui';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 3px solid #e94560;
            border-radius: 16px;
            padding: 24px;
            min-width: 420px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10001;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #fff;
            box-shadow: 0 0 40px rgba(233, 69, 96, 0.4);
            display: none;
        `;
        
        document.body.appendChild(container);
    }
    
    /**
     * Rendert den UI-Inhalt
     */
    function render() {
        if (!container) createDOM();
        
        const currentLevel = upgradeSystem.getCurrentLevel();
        const upgrades = upgradeSystem.getUpgradeLevels();
        const coins = state.coins || 0;
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #e94560; font-size: 24px;">⚡ Upgrade-Schmiede</h2>
                <button id="upgrade-close" style="
                    background: #e94560;
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    font-weight: bold;
                ">✕</button>
            </div>
            
            <div style="
                background: rgba(255,255,255,0.1);
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
            ">
                <span>Aktuelle Stufe: <strong style="color: #ffd700;">${currentLevel > 0 ? upgrades[currentLevel - 1].name : 'Keine'}</strong></span>
                <span>💰 ${coins.toLocaleString('de-DE')} Münzen</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
        `;
        
        for (const upgrade of upgrades) {
            const isPurchased = currentLevel >= upgrade.level;
            const isNext = upgrade.level === currentLevel + 1;
            const canAfford = coins >= upgrade.cost;
            const isLocked = upgrade.level > currentLevel + 1;
            
            let borderColor = '#444';
            let bgColor = 'rgba(0,0,0,0.3)';
            let statusText = '';
            let buttonHTML = '';
            
            if (isPurchased) {
                borderColor = '#4ade80';
                bgColor = 'rgba(74, 222, 128, 0.15)';
                statusText = '<span style="color: #4ade80;">✓ Gekauft</span>';
            } else if (isNext) {
                borderColor = canAfford ? '#ffd700' : '#e94560';
                bgColor = 'rgba(255, 215, 0, 0.1)';
                if (canAfford) {
                    buttonHTML = `<button class="upgrade-buy-btn" data-level="${upgrade.level}" style="
                        background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
                        border: none;
                        color: #1a1a2e;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">Kaufen</button>`;
                } else {
                    statusText = `<span style="color: #e94560;">Zu wenig Münzen</span>`;
                }
            } else if (isLocked) {
                statusText = '<span style="color: #666;">🔒 Gesperrt</span>';
            }
            
            // Farbe basierend auf Level
            const levelColors = {
                1: '#cd7f32', // Bronze
                2: '#c0c0c0', // Silber
                3: '#ffd700', // Gold
                4: '#e5e4e2', // Platin
                5: '#b9f2ff', // Diamant
                6: '#e0115f', // Rubin
                7: '#9b59b6'  // Legendär
            };
            
            html += `
                <div style="
                    background: ${bgColor};
                    border: 2px solid ${borderColor};
                    border-radius: 10px;
                    padding: 14px;
                    opacity: ${isLocked ? '0.5' : '1'};
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 36px;
                                height: 36px;
                                border-radius: 50%;
                                background: ${levelColors[upgrade.level]};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                color: ${upgrade.level === 7 ? '#fff' : '#1a1a2e'};
                                font-size: 16px;
                            ">${upgrade.level}</div>
                            <div>
                                <div style="font-weight: bold; font-size: 16px;">${upgrade.name}</div>
                                <div style="color: #aaa; font-size: 12px;">${upgrade.description}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            ${statusText}
                            ${buttonHTML}
                        </div>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        font-size: 13px;
                        color: #ccc;
                        padding-top: 8px;
                        border-top: 1px solid rgba(255,255,255,0.1);
                    ">
                        <span>${upgrade.statEffect.description}</span>
                        <span style="color: #ffd700;">💰 ${upgrade.cost.toLocaleString('de-DE')}</span>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Event Listener
        const closeBtn = container.querySelector('#upgrade-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', hide);
        }
        
        const buyButtons = container.querySelectorAll('.upgrade-buy-btn');
        buyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level);
                if (upgradeSystem.purchaseUpgrade(level)) {
                    render(); // UI aktualisieren
                }
            });
        });
    }
    
    /**
     * Zeigt das UI an
     */
    function show() {
        if (!container) createDOM();
        render();
        container.style.display = 'block';
        visible = true;
    }
    
    /**
     * Versteckt das UI
     */
    function hide() {
        if (container) {
            container.style.display = 'none';
        }
        visible = false;
    }
    
    /**
     * Toggled Sichtbarkeit
     */
    function toggle() {
        if (visible) {
            hide();
        } else {
            show();
        }
    }
    
    /**
     * Gibt zurück ob UI sichtbar ist
     */
    function isVisible() {
        return visible;
    }
    
    /**
     * Aktualisiert das UI
     */
    function update() {
        if (visible) {
            render();
        }
    }
    
    /**
     * Entfernt das UI aus dem DOM
     */
    function destroy() {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        container = null;
        visible = false;
    }
    
    return {
        show,
        hide,
        toggle,
        isVisible,
        update,
        render,
        destroy
    };
}
