// ============================================================
// TALENT TREE UI - Talentbaum Benutzeroberfläche
// ============================================================

import { TALENTS } from './progression.js';

/**
 * Erstellt die Talentbaum-UI
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas - Canvas Element
 * @param {Object} deps.state - Game State (muss progression enthalten)
 * @param {Object} deps.progressionSystem - Das Progression-System
 * @returns {Object} UI Controller
 */
export function createTalentTreeUI(deps) {
    const { canvas, state, progressionSystem } = deps;
    
    // UI Container erstellen
    let container = null;
    let isVisible = false;
    
    // Farben
    const COLORS = {
        background: 'rgba(10, 20, 40, 0.95)',
        border: '#3498db',
        title: '#f1c40f',
        text: '#ecf0f1',
        textMuted: '#7f8c8d',
        talentBg: 'rgba(52, 73, 94, 0.8)',
        talentBgHover: 'rgba(52, 152, 219, 0.6)',
        talentBgMaxed: 'rgba(39, 174, 96, 0.6)',
        talentBorder: '#2c3e50',
        talentBorderActive: '#f1c40f',
        xpBar: '#27ae60',
        xpBarBg: '#2c3e50',
        buttonBg: '#3498db',
        buttonHover: '#2980b9',
        closeBtn: '#e74c3c'
    };
    
    /**
     * Erstellt das DOM-Element für die UI
     */
    function createUI() {
        if (container) return;
        
        container = document.createElement('div');
        container.id = 'talent-tree-ui';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-width: 90vw;
            max-height: 85vh;
            background: ${COLORS.background};
            border: 3px solid ${COLORS.border};
            border-radius: 15px;
            padding: 20px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: ${COLORS.text};
            display: none;
            overflow-y: auto;
            box-shadow: 0 0 50px rgba(52, 152, 219, 0.5);
        `;
        
        document.body.appendChild(container);
    }
    
    /**
     * Rendert den Inhalt der UI
     */
    function renderContent() {
        if (!container) return;
        
        const prog = state.progression;
        const currentXP = prog.totalXP;
        const currentLevel = prog.level;
        const nextLevelXP = progressionSystem.getXPForLevel(currentLevel + 1);
        const currentLevelXP = progressionSystem.getXPForLevel(currentLevel);
        const xpProgress = progressionSystem.getLevelProgress();
        const xpInLevel = currentXP - currentLevelXP;
        const xpNeeded = nextLevelXP - currentLevelXP;
        
        let html = `
            <style>
                #talent-tree-ui * { box-sizing: border-box; }
                #talent-tree-ui .talent-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid ${COLORS.border};
                }
                #talent-tree-ui .talent-title {
                    color: ${COLORS.title};
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0;
                    text-shadow: 0 0 10px ${COLORS.title};
                }
                #talent-tree-ui .close-btn {
                    background: ${COLORS.closeBtn};
                    color: white;
                    border: none;
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    font-size: 20px;
                    cursor: pointer;
                    line-height: 35px;
                    text-align: center;
                }
                #talent-tree-ui .close-btn:hover {
                    background: #c0392b;
                }
                #talent-tree-ui .stats-row {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                #talent-tree-ui .stat-box {
                    background: ${COLORS.talentBg};
                    padding: 12px 20px;
                    border-radius: 8px;
                    text-align: center;
                    min-width: 120px;
                }
                #talent-tree-ui .stat-value {
                    font-size: 28px;
                    font-weight: bold;
                    color: ${COLORS.title};
                }
                #talent-tree-ui .stat-label {
                    font-size: 12px;
                    color: ${COLORS.textMuted};
                    text-transform: uppercase;
                }
                #talent-tree-ui .xp-bar-container {
                    flex: 1;
                    min-width: 200px;
                }
                #talent-tree-ui .xp-bar {
                    height: 20px;
                    background: ${COLORS.xpBarBg};
                    border-radius: 10px;
                    overflow: hidden;
                    margin-top: 5px;
                }
                #talent-tree-ui .xp-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, ${COLORS.xpBar}, #2ecc71);
                    border-radius: 10px;
                    transition: width 0.3s ease;
                }
                #talent-tree-ui .xp-text {
                    font-size: 12px;
                    color: ${COLORS.textMuted};
                    margin-top: 5px;
                }
                #talent-tree-ui .talents-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin-top: 20px;
                }
                #talent-tree-ui .talent-card {
                    background: ${COLORS.talentBg};
                    border: 2px solid ${COLORS.talentBorder};
                    border-radius: 10px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                #talent-tree-ui .talent-card:hover {
                    background: ${COLORS.talentBgHover};
                    border-color: ${COLORS.border};
                    transform: translateY(-2px);
                }
                #talent-tree-ui .talent-card.maxed {
                    background: ${COLORS.talentBgMaxed};
                    border-color: #27ae60;
                }
                #talent-tree-ui .talent-card.no-points {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                #talent-tree-ui .talent-icon {
                    font-size: 32px;
                    margin-bottom: 8px;
                }
                #talent-tree-ui .talent-name {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                #talent-tree-ui .talent-ranks {
                    font-size: 14px;
                    color: ${COLORS.title};
                    margin-bottom: 8px;
                }
                #talent-tree-ui .talent-desc {
                    font-size: 13px;
                    color: ${COLORS.textMuted};
                    line-height: 1.4;
                }
                #talent-tree-ui .reset-btn {
                    background: ${COLORS.closeBtn};
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-top: 20px;
                }
                #talent-tree-ui .reset-btn:hover {
                    background: #c0392b;
                }
                #talent-tree-ui .hint {
                    text-align: center;
                    color: ${COLORS.textMuted};
                    font-size: 12px;
                    margin-top: 15px;
                }
            </style>
            
            <div class="talent-header">
                <h2 class="talent-title">🌳 Talentbaum</h2>
                <button class="close-btn" onclick="window.closeTalentTree()">✕</button>
            </div>
            
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-value">${currentLevel}</div>
                    <div class="stat-label">Level</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${prog.skillPoints}</div>
                    <div class="stat-label">Skillpunkte</div>
                </div>
                <div class="stat-box xp-bar-container">
                    <div class="stat-label">Erfahrung</div>
                    <div class="xp-bar">
                        <div class="xp-bar-fill" style="width: ${xpProgress * 100}%"></div>
                    </div>
                    <div class="xp-text">${xpInLevel} / ${xpNeeded} XP</div>
                </div>
            </div>
            
            <div class="talents-grid">
        `;
        
        // Talente rendern
        for (const [talentId, talent] of Object.entries(TALENTS)) {
            const currentRank = prog.talents[talentId] || 0;
            const isMaxed = currentRank >= talent.maxRank;
            const noPoints = prog.skillPoints <= 0;
            const cardClass = isMaxed ? 'maxed' : (noPoints && !isMaxed ? 'no-points' : '');
            
            html += `
                <div class="talent-card ${cardClass}" onclick="window.investTalent('${talentId}')">
                    <div class="talent-icon">${talent.icon}</div>
                    <div class="talent-name">${talent.name}</div>
                    <div class="talent-ranks">${currentRank} / ${talent.maxRank}</div>
                    <div class="talent-desc">${talent.description}</div>
                </div>
            `;
        }
        
        html += `
            </div>
            <button class="reset-btn" onclick="window.resetTalents()">🔄 Talente zurücksetzen</button>
            <p class="hint">Klicke auf ein Talent um einen Skillpunkt zu investieren. Drücke U zum Schließen.</p>
        `;
        
        container.innerHTML = html;
    }
    
    /**
     * Zeigt die UI an
     */
    function show() {
        if (!container) createUI();
        renderContent();
        container.style.display = 'block';
        isVisible = true;
        
        // Globale Funktionen für Click-Handler
        window.closeTalentTree = hide;
        window.investTalent = (talentId) => {
            if (progressionSystem.investTalent(talentId)) {
                renderContent();
            }
        };
        window.resetTalents = () => {
            progressionSystem.resetTalents();
            renderContent();
        };
    }
    
    /**
     * Versteckt die UI
     */
    function hide() {
        if (container) {
            container.style.display = 'none';
        }
        isVisible = false;
    }
    
    /**
     * Toggle Sichtbarkeit
     */
    function toggle() {
        if (isVisible) {
            hide();
        } else {
            show();
        }
    }
    
    /**
     * Prüft ob UI sichtbar ist
     */
    function getIsVisible() {
        return isVisible;
    }
    
    /**
     * Aktualisiert die UI (z.B. nach Level-Up)
     */
    function update() {
        if (isVisible) {
            renderContent();
        }
    }
    
    /**
     * Cleanup
     */
    function destroy() {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        container = null;
        isVisible = false;
    }
    
    return {
        show,
        hide,
        toggle,
        update,
        destroy,
        isVisible: getIsVisible
    };
}
