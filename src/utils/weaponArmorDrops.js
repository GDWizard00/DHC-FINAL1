/**
 * Weapon and Armor Drop System
 * Integrates with existing rarity system in weaponsData.js
 * Progressive drop rates based on floors with division scaling
 * Capped at floor 500 for balanced progression
 */

import { weaponsData } from '../data/weaponsData.js';
import { getEffectiveFloor, calculateDropRateScaling } from './floorScaling.js';

/**
 * Rarity drop rate configuration
 * Base chances that scale with floor progression
 */
const RARITY_DROP_RATES = {
    common: {
        baseChance: 0.45,        // 45% base chance
        floorScaling: 0.001,     // Slight increase per floor
        maxChance: 0.60          // Cap at 60%
    },
    uncommon: {
        baseChance: 0.25,        // 25% base chance
        floorScaling: 0.0015,    // Moderate increase per floor
        maxChance: 0.40          // Cap at 40%
    },
    rare: {
        baseChance: 0.15,        // 15% base chance
        floorScaling: 0.002,     // Good increase per floor
        maxChance: 0.30          // Cap at 30%
    },
    epic: {
        baseChance: 0.08,        // 8% base chance
        floorScaling: 0.0025,    // Better increase per floor
        maxChance: 0.20          // Cap at 20%
    },
    legendary: {
        baseChance: 0.00001,     // 0.001% base chance (1:100,000)
        floorScaling: 0.0000009, // Very small increase per floor
        maxChance: 0.0001        // Cap at 0.01% (1:10,000 at high floors)
    },
    mythical: {
        baseChance: 0.000001,    // 0.0001% base chance (1:1,000,000)
        floorScaling: 0.0000001, // Extremely small increase per floor
        maxChance: 0.00001       // Cap at 0.001% (1:100,000 at high floors)
    }
};

/**
 * Division scaling multipliers
 * Affects both gold and item drop rates
 */
const DIVISION_MULTIPLIERS = {
    free: 0.8,      // Free players: -20% (Gold division gets 10% less than median)
    gold: 0.9,      // Gold players: -10% (currently the "free" game)
    eth: 1.1        // ETH players: +10% more than median
};

/**
 * Calculate rarity drop chance based on floor
 * Capped at floor 500 for balanced progression
 */
export function calculateRarityChance(rarity, floor) {
    const config = RARITY_DROP_RATES[rarity];
    if (!config) return 0;
    
    const effectiveFloor = getEffectiveFloor(floor);
    const scaledChance = config.baseChance + (effectiveFloor * config.floorScaling);
    return Math.min(scaledChance, config.maxChance);
}

/**
 * Apply division scaling to drop rates
 */
export function applyDivisionScaling(baseChance, division = 'gold') {
    const multiplier = DIVISION_MULTIPLIERS[division] || DIVISION_MULTIPLIERS.gold;
    return baseChance * multiplier;
}

/**
 * Get weapons by rarity from existing weaponsData
 */
export function getWeaponsByRarity(rarity) {
    return Object.values(weaponsData).filter(weapon => weapon.rarity === rarity);
}

/**
 * Calculate overall weapon drop chance
 * Capped at floor 500 for balanced progression
 */
export function calculateWeaponDropChance(floor, battleType, performanceRating, division = 'gold') {
    let baseChance = 0.20; // 20% base chance for any weapon drop
    
    // Floor scaling (slightly higher chance at higher floors) - capped at floor 500
    baseChance = calculateDropRateScaling(baseChance, floor, 0.05); // +5% every 25 floors
    
    // Battle type modifiers
    if (battleType === 'floor_boss') {
        baseChance += 0.4; // 40% bonus for floor bosses
    } else if (battleType === 'mimic') {
        baseChance += 0.3; // 30% bonus for mimics
    } else if (battleType === 'detected') {
        baseChance += 0.15; // 15% bonus for detected monsters
    }
    
    // Performance bonuses
    if (performanceRating.includes('LEGENDARY') || performanceRating.includes('MASTERFUL')) {
        baseChance += 0.2;
    } else if (performanceRating.includes('EXCELLENT')) {
        baseChance += 0.15;
    } else if (performanceRating.includes('GOOD')) {
        baseChance += 0.1;
    }
    
    // Apply division scaling
    baseChance = applyDivisionScaling(baseChance, division);
    
    return Math.min(baseChance, 0.85); // Cap at 85%
}

/**
 * Determine weapon rarity based on floor and division
 */
export function determineWeaponRarity(floor, division = 'gold') {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
    const weights = [];
    
    // Calculate weights for each rarity
    for (const rarity of rarities) {
        let chance = calculateRarityChance(rarity, floor);
        chance = applyDivisionScaling(chance, division);
        weights.push(chance);
    }
    
    // Normalize weights to create probability distribution
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map(weight => weight / totalWeight);
    
    // Select rarity based on weighted random
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < rarities.length; i++) {
        cumulativeWeight += normalizedWeights[i];
        if (random <= cumulativeWeight) {
            return rarities[i];
        }
    }
    
    return 'common'; // Fallback
}

/**
 * Generate weapon reward
 */
export function generateWeaponReward(floor, battleType, performanceRating, division = 'gold') {
    const dropChance = calculateWeaponDropChance(floor, battleType, performanceRating, division);
    
    if (Math.random() < dropChance) {
        const rarity = determineWeaponRarity(floor, division);
        const weaponsOfRarity = getWeaponsByRarity(rarity);
        
        if (weaponsOfRarity.length > 0) {
            const randomWeapon = weaponsOfRarity[Math.floor(Math.random() * weaponsOfRarity.length)];
            return {
                ...randomWeapon,
                foundOnFloor: floor,
                dropSource: battleType
            };
        }
    }
    
    return null;
}

/**
 * Generate gold reward with division scaling
 */
export function generateGoldReward(baseAmount, division = 'gold') {
    return Math.floor(baseAmount * applyDivisionScaling(1, division));
}

/**
 * Get rarity statistics for display (admin/debug purposes)
 */
export function getRarityStatistics(floor, division = 'gold') {
    const stats = {};
    
    for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical']) {
        const baseChance = calculateRarityChance(rarity, floor);
        const scaledChance = applyDivisionScaling(baseChance, division);
        
        stats[rarity] = {
            baseChance: (baseChance * 100).toFixed(2) + '%',
            scaledChance: (scaledChance * 100).toFixed(2) + '%',
            odds: scaledChance > 0 ? `1:${Math.round(1/scaledChance)}` : 'N/A'
        };
    }
    
    return stats;
}

/**
 * Integration function for battle rewards
 */
export function generateBattleRewards(floor, battleType, performanceRating, division = 'gold') {
    const rewards = {
        weapons: [],
        gold: 0,
        items: []
    };
    
    // Generate weapon reward
    const weapon = generateWeaponReward(floor, battleType, performanceRating, division);
    if (weapon) {
        rewards.weapons.push(weapon);
    }
    
    // Generate base gold reward (can be enhanced with existing systems)
    const baseGold = Math.floor(10 + (floor * 2) + Math.random() * 20);
    rewards.gold = generateGoldReward(baseGold, division);
    
    return rewards;
} 