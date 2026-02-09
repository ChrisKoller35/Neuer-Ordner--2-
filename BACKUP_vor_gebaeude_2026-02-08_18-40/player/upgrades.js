// ============================================================
// UPGRADE SYSTEM - Spieler-Upgrades (7 Stufen)
// ============================================================
"use strict";

import upgradesData from '../data/upgrades.json';

/**
 * Erstellt das Upgrade-System
 * @param {Object} ctx - Context mit state, player
 * @returns {Object} Upgrade-System API
 */
export function createUpgradeSystem(ctx) {
    const { state, player } = ctx;
    
    // Upgrade-State initialisieren falls nicht vorhanden
    if (!state.upgrades) {
        state.upgrades = {
            currentLevel: 0,  // 0 = kein Upgrade, 1-7 = Upgrade-Stufe
            purchasedLevels: []
        };
    }
    
    /**
     * Gibt alle verfügbaren Upgrade-Stufen zurück
     */
    function getUpgradeLevels() {
        return upgradesData.levels;
    }
    
    /**
     * Gibt die aktuelle Upgrade-Stufe zurück
     */
    function getCurrentLevel() {
        return state.upgrades.currentLevel;
    }
    
    /**
     * Gibt das nächste verfügbare Upgrade zurück (oder null wenn max)
     */
    function getNextUpgrade() {
        const nextLevel = state.upgrades.currentLevel + 1;
        if (nextLevel > 7) return null;
        return upgradesData.levels.find(u => u.level === nextLevel);
    }
    
    /**
     * Prüft ob ein Upgrade gekauft werden kann
     */
    function canPurchaseUpgrade(level) {
        // Muss das nächste Level sein
        if (level !== state.upgrades.currentLevel + 1) return false;
        
        const upgrade = upgradesData.levels.find(u => u.level === level);
        if (!upgrade) return false;
        
        // Genug Münzen?
        const coins = state.coins || 0;
        return coins >= upgrade.cost;
    }
    
    /**
     * Kauft ein Upgrade
     * @returns {boolean} Erfolg
     */
    function purchaseUpgrade(level) {
        if (!canPurchaseUpgrade(level)) return false;
        
        const upgrade = upgradesData.levels.find(u => u.level === level);
        if (!upgrade) return false;
        
        // Münzen abziehen
        state.coins = (state.coins || 0) - upgrade.cost;
        
        // Upgrade aktivieren
        state.upgrades.currentLevel = level;
        state.upgrades.purchasedLevels.push(level);
        
        // Effekte anwenden
        applyUpgradeEffects();
        
        console.log(`[Upgrade] Stufe ${level} gekauft: ${upgrade.name}`);
        return true;
    }
    
    /**
     * Berechnet alle aktiven Upgrade-Effekte
     */
    function getUpgradeEffects() {
        const effects = {
            damageBonus: 0,
            speedBonus: 0,
            energyRegenBonus: 0,
            defenseBonus: 0,
            critChance: 0,
            lifeSteal: 0,
            allStatsBonus: 0
        };
        
        // Alle gekauften Upgrades summieren
        for (const level of state.upgrades.purchasedLevels) {
            const upgrade = upgradesData.levels.find(u => u.level === level);
            if (upgrade && upgrade.statEffect) {
                const { type, value } = upgrade.statEffect;
                if (effects[type] !== undefined) {
                    effects[type] += value;
                }
            }
        }
        
        return effects;
    }
    
    /**
     * Wendet Upgrade-Effekte auf den Spieler an
     */
    function applyUpgradeEffects() {
        const effects = getUpgradeEffects();
        
        // Speichere Effekte am Player für Verwendung in anderen Systemen
        player.upgradeEffects = effects;
        
        // Geschwindigkeits-Bonus (kumulativ mit Talent)
        if (effects.speedBonus > 0 || effects.allStatsBonus > 0) {
            const totalSpeedBonus = effects.speedBonus + effects.allStatsBonus;
            player.upgradeSpeedMultiplier = 1 + totalSpeedBonus;
        }
        
        // Energie-Regen-Bonus
        if (effects.energyRegenBonus > 0 || effects.allStatsBonus > 0) {
            const totalRegenBonus = effects.energyRegenBonus + effects.allStatsBonus;
            player.upgradeEnergyRegenMultiplier = 1 + totalRegenBonus;
        }
        
        // Schaden-Bonus
        if (effects.damageBonus > 0 || effects.allStatsBonus > 0) {
            const totalDamageBonus = effects.damageBonus + effects.allStatsBonus;
            player.upgradeDamageMultiplier = 1 + totalDamageBonus;
        }
        
        // Verteidigung
        if (effects.defenseBonus > 0 || effects.allStatsBonus > 0) {
            player.upgradeDefenseBonus = effects.defenseBonus + effects.allStatsBonus;
        }
        
        // Crit Chance
        player.upgradeCritChance = effects.critChance + effects.allStatsBonus;
        
        // Life Steal
        player.upgradeLifeSteal = effects.lifeSteal + effects.allStatsBonus;
        
        // Visueller Effekt für Renderer
        const currentUpgrade = upgradesData.levels.find(u => u.level === state.upgrades.currentLevel);
        player.visualUpgradeEffect = currentUpgrade ? currentUpgrade.visualEffect : null;
        
        console.log('[Upgrades] Effekte angewendet:', effects);
    }
    
    /**
     * Gibt Info über ein bestimmtes Upgrade-Level zurück
     */
    function getUpgradeInfo(level) {
        return upgradesData.levels.find(u => u.level === level) || null;
    }
    
    /**
     * Gibt formatierte Kosten zurück (z.B. "15.000")
     */
    function formatCost(cost) {
        return cost.toLocaleString('de-DE');
    }
    
    return {
        getUpgradeLevels,
        getCurrentLevel,
        getNextUpgrade,
        canPurchaseUpgrade,
        purchaseUpgrade,
        getUpgradeEffects,
        applyUpgradeEffects,
        getUpgradeInfo,
        formatCost
    };
}
