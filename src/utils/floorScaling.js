/**
 * Floor Scaling Utility
 * Implements 500-floor scaling limit for balanced progression
 * Ensures all scaling systems cap at floor 500
 */

/**
 * Maximum floor for scaling calculations
 * After this floor, scaling effects are capped
 */
export const MAX_SCALING_FLOOR = 500;

/**
 * Get effective floor for scaling calculations
 * Caps at MAX_SCALING_FLOOR to prevent infinite scaling
 */
export function getEffectiveFloor(currentFloor) {
    return Math.min(currentFloor, MAX_SCALING_FLOOR);
}

/**
 * Calculate monster scaling factor with floor cap
 * Monster stats increase by 10% every 20 floors after floor 20
 * Capped at floor 500 for balanced progression
 */
export function calculateMonsterScalingFactor(currentFloor) {
    const effectiveFloor = getEffectiveFloor(currentFloor);
    
    if (effectiveFloor <= 20) {
        return 1.0; // No scaling for first 20 floors
    }
    
    // Calculate how many 20-floor cycles have passed
    const cycles = Math.floor((effectiveFloor - 1) / 20);
    
    // 10% increase per cycle
    return 1.0 + (cycles * 0.1);
}

/**
 * Calculate weapon damage scaling with floor cap
 * Weapon damage increases by 10% every 20 floors after floor 20
 * Capped at floor 500 for balanced progression
 */
export function calculateWeaponDamageScaling(baseDamage, currentFloor) {
    const effectiveFloor = getEffectiveFloor(currentFloor);
    
    if (effectiveFloor <= 20) {
        return baseDamage;
    }
    
    const scaleMultiplier = Math.floor(effectiveFloor / 20) * 0.1;
    return Math.ceil(baseDamage * (1 + scaleMultiplier));
}

/**
 * Calculate gold reward scaling with floor cap
 * Gold rewards scale with floor progression but cap at floor 500
 */
export function calculateGoldScaling(baseGold, currentFloor) {
    const effectiveFloor = getEffectiveFloor(currentFloor);
    
    // Base scaling: floor * 3
    const floorMultiplier = Math.floor(effectiveFloor * 3);
    
    return baseGold + floorMultiplier;
}

/**
 * Calculate drop rate scaling with floor cap
 * Drop rates improve with floor progression but cap at floor 500
 */
export function calculateDropRateScaling(baseChance, currentFloor, scalingFactor = 0.05) {
    const effectiveFloor = getEffectiveFloor(currentFloor);
    
    // Scale drop rates every 25 floors
    const scaleBonus = Math.floor(effectiveFloor / 25) * scalingFactor;
    
    return baseChance + scaleBonus;
}

/**
 * Get scaling information for display purposes
 */
export function getScalingInfo(currentFloor) {
    const effectiveFloor = getEffectiveFloor(currentFloor);
    const isAtCap = currentFloor >= MAX_SCALING_FLOOR;
    
    return {
        currentFloor,
        effectiveFloor,
        isAtCap,
        scalingFactor: calculateMonsterScalingFactor(currentFloor),
        message: isAtCap ? 
            `⚠️ Maximum scaling reached at floor ${MAX_SCALING_FLOOR}` : 
            `📊 Scaling active (effective floor: ${effectiveFloor})`
    };
}

/**
 * Check if floor is beyond scaling limit
 */
export function isFloorBeyondScalingLimit(currentFloor) {
    return currentFloor > MAX_SCALING_FLOOR;
} 