/**
 * Potion Scaling System
 * Scales potion sizes based on floor progression every 40 floors
 * Capped at floor 500 for balanced progression
 */

import { getEffectiveFloor, calculateDropRateScaling } from './floorScaling.js';

/**
 * Potion size tiers based on floor ranges
 */
const POTION_TIERS = {
    SMALL: { floors: [1, 40], suffix: 'Small', multiplier: 1.0 },
    MEDIUM: { floors: [41, 80], suffix: 'Medium', multiplier: 1.5 },
    LARGE: { floors: [81, 120], suffix: 'Large', multiplier: 2.0 },
    GREAT: { floors: [121, 160], suffix: 'Great', multiplier: 2.5 },
    SUPERIOR: { floors: [161, 200], suffix: 'Superior', multiplier: 3.0 },
    MASTER: { floors: [201, 240], suffix: 'Master', multiplier: 3.5 },
    LEGENDARY: { floors: [241, 280], suffix: 'Legendary', multiplier: 4.0 },
    MYTHICAL: { floors: [281, 320], suffix: 'Mythical', multiplier: 4.5 },
    DIVINE: { floors: [321, 360], suffix: 'Divine', multiplier: 5.0 },
    ULTIMATE: { floors: [361, Infinity], suffix: 'Ultimate', multiplier: 6.0 }
};

/**
 * Base potion definitions
 */
const BASE_POTIONS = {
    HEALTH: {
        name: 'Health Potion',
        emoji: '🧪',
        baseValue: 5,
        description: 'Restores health points'
    },
    MANA: {
        name: 'Mana Potion',
        emoji: '💙',
        baseValue: 3,
        description: 'Restores mana points'
    },
    HEALING: {
        name: 'Healing Elixir',
        emoji: '💚',
        baseValue: 8,
        description: 'Powerful healing potion'
    },
    ENERGY: {
        name: 'Energy Potion',
        emoji: '⚡',
        baseValue: 4,
        description: 'Restores both health and mana'
    }
};

/**
 * Get potion tier based on floor
 * Capped at floor 500 for balanced progression
 */
export function getPotionTier(floor) {
    const effectiveFloor = getEffectiveFloor(floor);
    
    for (const [tierName, tierData] of Object.entries(POTION_TIERS)) {
        if (effectiveFloor >= tierData.floors[0] && effectiveFloor <= tierData.floors[1]) {
            return { name: tierName, ...tierData };
        }
    }
    return POTION_TIERS.ULTIMATE; // Fallback for very high floors
}

/**
 * Generate scaled potion based on floor
 */
export function generateScaledPotion(potionType, floor) {
    const basePotion = BASE_POTIONS[potionType];
    const tier = getPotionTier(floor);
    
    if (!basePotion) {
        throw new Error(`Unknown potion type: ${potionType}`);
    }
    
    const scaledValue = Math.floor(basePotion.baseValue * tier.multiplier);
    
    return {
        id: `${potionType.toLowerCase()}_potion_${tier.name.toLowerCase()}`,
        name: `${tier.suffix} ${basePotion.name}`,
        emoji: basePotion.emoji,
        type: 'consumable',
        category: 'potion',
        tier: tier.name,
        value: scaledValue,
        description: `${basePotion.description} (+${scaledValue} points)`,
        floorRange: `${tier.floors[0]}-${tier.floors[1] === Infinity ? '∞' : tier.floors[1]}`,
        use: function(gameState) {
            if (potionType === 'HEALTH' || potionType === 'HEALING') {
                const currentHealth = gameState.player.currentHealth || gameState.selectedHero.currentHealth;
                const maxHealth = gameState.selectedHero.maxHealth || gameState.selectedHero.health;
                const newHealth = Math.min(maxHealth, currentHealth + scaledValue);
                
                if (gameState.player.currentHealth !== undefined) {
                    gameState.player.currentHealth = newHealth;
                } else {
                    gameState.selectedHero.currentHealth = newHealth;
                }
                
                return {
                    success: true,
                    message: `Restored ${newHealth - currentHealth} health points`,
                    actualHealing: newHealth - currentHealth
                };
            } else if (potionType === 'MANA') {
                const currentMana = gameState.player.currentMana || gameState.selectedHero.currentMana;
                const maxMana = gameState.selectedHero.maxMana || gameState.selectedHero.mana;
                const newMana = Math.min(maxMana, currentMana + scaledValue);
                
                if (gameState.player.currentMana !== undefined) {
                    gameState.player.currentMana = newMana;
                } else {
                    gameState.selectedHero.currentMana = newMana;
                }
                
                return {
                    success: true,
                    message: `Restored ${newMana - currentMana} mana points`,
                    actualRestore: newMana - currentMana
                };
            } else if (potionType === 'ENERGY') {
                // Restore both health and mana
                const healthResult = this.use(gameState, 'HEALTH');
                const manaResult = this.use(gameState, 'MANA');
                
                return {
                    success: true,
                    message: `Restored ${healthResult.actualHealing || 0} health and ${manaResult.actualRestore || 0} mana`,
                    healthHealing: healthResult.actualHealing || 0,
                    manaRestore: manaResult.actualRestore || 0
                };
            }
            
            return {
                success: false,
                message: 'Unknown potion effect'
            };
        }
    };
}

/**
 * Get random potion type based on floor and context
 */
export function getRandomPotionType(floor, battleContext = null) {
    const potionTypes = ['HEALTH', 'MANA'];
    
    // Add special potions at higher floors
    if (floor >= 20) {
        potionTypes.push('HEALING');
    }
    
    if (floor >= 40) {
        potionTypes.push('ENERGY');
    }
    
    // Context-based selection
    if (battleContext) {
        if (battleContext.playerHealthLow) {
            return Math.random() < 0.7 ? 'HEALTH' : 'HEALING';
        }
        if (battleContext.playerManaLow) {
            return 'MANA';
        }
    }
    
    return potionTypes[Math.floor(Math.random() * potionTypes.length)];
}

/**
 * Calculate potion drop chance based on floor and context
 * Capped at floor 500 for balanced progression
 */
export function calculatePotionDropChance(floor, battleType, performanceRating) {
    let baseChance = 0.25; // 25% base chance
    
    // Floor scaling (slightly higher chance at higher floors) - capped at floor 500
    baseChance = calculateDropRateScaling(baseChance, floor, 0.05 / 25 * 20); // +5% every 20 floors
    
    // Battle type modifiers
    if (battleType === 'floor_boss') {
        baseChance += 0.3; // 30% bonus for floor bosses
    } else if (battleType === 'mimic') {
        baseChance += 0.2; // 20% bonus for mimics
    } else if (battleType === 'detected') {
        baseChance += 0.1; // 10% bonus for detected monsters
    }
    
    // Performance bonuses
    if (performanceRating.includes('LEGENDARY') || performanceRating.includes('MASTERFUL')) {
        baseChance += 0.15;
    } else if (performanceRating.includes('EXCELLENT')) {
        baseChance += 0.1;
    } else if (performanceRating.includes('GOOD')) {
        baseChance += 0.05;
    }
    
    return Math.min(baseChance, 0.8); // Cap at 80%
}

/**
 * Generate potion rewards for battle
 */
export function generatePotionRewards(floor, battleType, performanceRating, battleContext = null) {
    const potions = [];
    const dropChance = calculatePotionDropChance(floor, battleType, performanceRating);
    
    // Roll for potion drop - single potion only to avoid clutter
    if (Math.random() < dropChance) {
        const potionType = getRandomPotionType(floor, battleContext);
        const potion = generateScaledPotion(potionType, floor);
        potions.push(potion);
    }
    
    return potions;
}

/**
 * Get all available potion tiers (for display purposes)
 */
export function getAllPotionTiers() {
    return Object.entries(POTION_TIERS).map(([name, data]) => ({
        name,
        ...data
    }));
}

/**
 * Get potion info for display
 */
export function getPotionInfo(potionId) {
    // Parse potion ID to get type and tier
    const parts = potionId.split('_');
    if (parts.length < 3) return null;
    
    const potionType = parts[0].toUpperCase();
    const tierName = parts[2].toUpperCase();
    
    const basePotion = BASE_POTIONS[potionType];
    const tier = Object.values(POTION_TIERS).find(t => t.suffix.toUpperCase() === tierName);
    
    if (!basePotion || !tier) return null;
    
    return {
        name: `${tier.suffix} ${basePotion.name}`,
        emoji: basePotion.emoji,
        value: Math.floor(basePotion.baseValue * tier.multiplier),
        description: basePotion.description,
        tier: tierName,
        floorRange: `${tier.floors[0]}-${tier.floors[1] === Infinity ? '∞' : tier.floors[1]}`
    };
} 