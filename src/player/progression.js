// ============================================================
// PLAYER PROGRESSION - Level, XP und Talent-System
// ============================================================

/**
 * XP-Tabelle: Wie viel XP braucht man für welches Level?
 * Level 1 = 0 XP (Start)
 * Level 2 = 200 XP (nach ca. 2 Spiel-Leveln)
 * Level 3 = 500 XP (bei Ankunft in Stadt)
 * Level 4 = 900 XP
 * usw.
 */
export function getXPForLevel(level) {
    if (level <= 1) return 0;
    // Formel: 100 * level^2 - 100 (angepasst für langsameren Fortschritt)
    // Level 2: 200, Level 3: 500, Level 4: 900, Level 5: 1400...
    return Math.floor(100 * Math.pow(level, 2) - 100 * level);
}

/**
 * Berechnet das Level basierend auf der Gesamt-XP
 */
export function getLevelFromXP(totalXP) {
    let level = 1;
    while (getXPForLevel(level + 1) <= totalXP) {
        level++;
        if (level >= 99) break; // Max Level
    }
    return level;
}

/**
 * XP-Werte für verschiedene Gegnertypen (reduziert für langsameren Fortschritt)
 * Pro Spiel-Level: ~15-20 Gegner + 1 Boss = ~100-120 XP
 * Nach Level 1-2: Level 2 erreicht
 * Nach Level 1-4: Level 3 erreicht (bei Ankunft in Stadt)
 */
export const FOE_XP_VALUES = {
    default: 5,      // Jelly (vorher 10)
    jelly: 5,
    bogenschreck: 12, // (vorher 25)
    ritterfisch: 10,  // (vorher 20)
    oktopus: 15,      // (vorher 30)
    boss: 80          // (vorher 500)
};

/**
 * Talent-Definitionen
 * Jedes Talent hat:
 * - id: Eindeutige ID
 * - name: Anzeigename
 * - description: Beschreibung
 * - maxRank: Max. Investierbare Punkte
 * - effect: Funktion die den Effekt berechnet
 */
export const TALENTS = {
    // Reihe 1: Grundlagen
    swiftFins: {
        id: 'swiftFins',
        name: 'Flinke Flossen',
        description: 'Erhöht Bewegungsgeschwindigkeit um 5% pro Rang',
        maxRank: 3,
        icon: '🏃',
        effect: (rank) => ({ speedBonus: 0.05 * rank })
    },
    
    thickScales: {
        id: 'thickScales',
        name: 'Dicke Schuppen',
        description: 'Verlängert Unverwundbarkeit nach Schaden um 15% pro Rang',
        maxRank: 3,
        icon: '🛡️',
        effect: (rank) => ({ invulnBonus: 0.15 * rank })
    },
    
    sharpShooter: {
        id: 'sharpShooter',
        name: 'Scharfschütze',
        description: 'Verringert Schuss-Cooldown um 8% pro Rang',
        maxRank: 3,
        icon: '🎯',
        effect: (rank) => ({ shotCooldownReduction: 0.08 * rank })
    },
    
    energyReserves: {
        id: 'energyReserves',
        name: 'Energiereserven',
        description: 'Erhöht maximale Energie um 10 pro Rang',
        maxRank: 3,
        icon: '⚡',
        effect: (rank) => ({ energyMaxBonus: 50 * rank })
    },
    
    quickRecovery: {
        id: 'quickRecovery',
        name: 'Schnelle Erholung',
        description: 'Erhöht Energie-Regeneration um 20% pro Rang',
        maxRank: 3,
        icon: '💫',
        effect: (rank) => ({ energyRegenBonus: 0.20 * rank })
    }
};

/**
 * Erstellt den initialen Progressions-Zustand
 */
export function createProgressionState() {
    return {
        // XP & Level
        totalXP: 0,
        level: 1,
        skillPoints: 0,
        
        // Talents: { talentId: rank }
        talents: {
            swiftFins: 0,
            thickScales: 0,
            sharpShooter: 0,
            energyReserves: 0,
            quickRecovery: 0
        },
        
        // UI State
        talentTreeOpen: false
    };
}

/**
 * Erstellt das Progressions-System
 * @param {Object} deps - Dependencies
 * @param {Object} deps.state - Game state (muss progression enthalten)
 * @param {Object} deps.player - Player state
 * @param {Function} deps.triggerEventFlash - Flash-Effekt Funktion
 * @param {Function} [deps.onLevelUp] - Callback bei Level-Up
 */
export function createProgressionSystem(deps) {
    const { state, player, triggerEventFlash, onLevelUp } = deps;
    
    /**
     * Gibt XP für einen besiegten Gegner
     */
    function awardXP(foeType) {
        const xpAmount = FOE_XP_VALUES[foeType] || FOE_XP_VALUES.default;
        addXP(xpAmount);
        return xpAmount;
    }
    
    /**
     * Fügt XP hinzu und prüft auf Level-Up
     */
    function addXP(amount) {
        const oldLevel = state.progression.level;
        state.progression.totalXP += amount;
        
        const newLevel = getLevelFromXP(state.progression.totalXP);
        
        if (newLevel > oldLevel) {
            const levelsGained = newLevel - oldLevel;
            state.progression.level = newLevel;
            state.progression.skillPoints += levelsGained;
            
            // Level-Up Effekt
            if (triggerEventFlash) {
                triggerEventFlash("levelUp", { 
                    text: `LEVEL UP! Level ${newLevel}`, 
                    duration: 2500, 
                    opacity: 1,
                    color: '#FFD700'
                });
            }
            
            if (onLevelUp) {
                onLevelUp(newLevel, levelsGained);
            }
        }
    }
    
    /**
     * Investiert einen Skillpunkt in ein Talent
     */
    function investTalent(talentId) {
        const talent = TALENTS[talentId];
        if (!talent) return false;
        
        const currentRank = state.progression.talents[talentId] || 0;
        
        // Prüfe ob max Rang erreicht
        if (currentRank >= talent.maxRank) return false;
        
        // Prüfe ob Skillpunkte verfügbar
        if (state.progression.skillPoints <= 0) return false;
        
        // Investieren
        state.progression.talents[talentId] = currentRank + 1;
        state.progression.skillPoints--;
        
        // Stats aktualisieren
        applyTalentEffects();
        
        return true;
    }
    
    /**
     * Berechnet und gibt den Gesamt-Effekt aller Talente zurück
     */
    function getTalentEffects() {
        const effects = {
            speedBonus: 0,
            invulnBonus: 0,
            shotCooldownReduction: 0,
            energyMaxBonus: 0,
            energyRegenBonus: 0
        };
        
        for (const [talentId, rank] of Object.entries(state.progression.talents)) {
            if (rank <= 0) continue;
            const talent = TALENTS[talentId];
            if (!talent) continue;
            
            const talentEffect = talent.effect(rank);
            for (const [key, value] of Object.entries(talentEffect)) {
                if (effects[key] !== undefined) {
                    effects[key] += value;
                }
            }
        }
        
        return effects;
    }
    
    /**
     * Wendet Talent-Effekte auf den Spieler an
     */
    function applyTalentEffects() {
        const effects = getTalentEffects();
        
        // Basis-Werte (falls nicht gesetzt)
        const BASE_SPEED = player.baseSpeed || 0.32;
        const BASE_ENERGY_MAX = 100;
        const BASE_ENERGY_REGEN = 0.04;
        const BASE_INVULN = 1400; // ms
        
        // Geschwindigkeit anwenden
        player.speed = BASE_SPEED * (1 + effects.speedBonus);
        
        // Energie-Maximum anwenden (IMMER, auch bei 0 Bonus)
        const newEnergyMax = BASE_ENERGY_MAX + effects.energyMaxBonus;
        // Wenn max Energie erhöht wurde, auch aktuelle Energie proportional erhöhen
        if (player.energyMax && newEnergyMax > player.energyMax) {
            const diff = newEnergyMax - player.energyMax;
            player.energy = Math.min(newEnergyMax, (player.energy || 0) + diff);
        }
        player.energyMax = newEnergyMax;
        
        // Energie-Regeneration anwenden
        player.energyRegenRate = BASE_ENERGY_REGEN * (1 + effects.energyRegenBonus);
        
        // Unverwundbarkeits-Bonus speichern (wird bei Schaden angewendet)
        player.invulnMultiplier = 1 + effects.invulnBonus;
        
        // Schuss-Cooldown-Reduktion speichern (wird beim Schießen angewendet)
        player.shotCooldownMultiplier = 1 - effects.shotCooldownReduction;
        
        console.log('[Talente] Effekte angewendet:', {
            speed: player.speed.toFixed(3),
            energyMax: player.energyMax,
            energyRegen: player.energyRegenRate.toFixed(4),
            invulnMult: player.invulnMultiplier?.toFixed(2),
            shotCDMult: player.shotCooldownMultiplier?.toFixed(2)
        });
    }
    
    /**
     * Gibt Fortschritt zum nächsten Level zurück (0-1)
     */
    function getLevelProgress() {
        const currentLevel = state.progression.level;
        const currentLevelXP = getXPForLevel(currentLevel);
        const nextLevelXP = getXPForLevel(currentLevel + 1);
        
        if (nextLevelXP <= currentLevelXP) return 1;
        
        const xpIntoLevel = state.progression.totalXP - currentLevelXP;
        const xpNeeded = nextLevelXP - currentLevelXP;
        
        return Math.min(1, xpIntoLevel / xpNeeded);
    }
    
    /**
     * Öffnet/Schließt den Talentbaum
     */
    function toggleTalentTree() {
        state.progression.talentTreeOpen = !state.progression.talentTreeOpen;
    }
    
    /**
     * Setzt Talente zurück (Respec)
     */
    function resetTalents() {
        // Zähle investierte Punkte
        let investedPoints = 0;
        for (const rank of Object.values(state.progression.talents)) {
            investedPoints += rank;
        }
        
        // Alle Talente auf 0 setzen
        for (const talentId of Object.keys(state.progression.talents)) {
            state.progression.talents[talentId] = 0;
        }
        
        // Punkte zurückgeben
        state.progression.skillPoints += investedPoints;
        
        // Stats neu berechnen
        applyTalentEffects();
    }
    
    return {
        awardXP,
        addXP,
        investTalent,
        getTalentEffects,
        applyTalentEffects,
        getLevelProgress,
        toggleTalentTree,
        resetTalents,
        getXPForLevel,
        getLevelFromXP
    };
}
