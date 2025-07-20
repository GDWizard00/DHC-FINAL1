/**
 * Effects Data for Dungeonites Heroes Challenge
 * Based on RULES.txt specifications
 */

export const effects = {
    // Positive Effects
    healing: {
        id: 'healing',
        name: 'Healing',
        emoji: '❤️',
        type: 'positive',
        description: 'Restores health over time',
        healthPerTurn: 4,
        duration: 1,
        stackable: false
    },

    healing_rain: {
        id: 'healing_rain',
        name: 'Healing Rain',
        emoji: '🌦️',
        type: 'positive',
        description: 'Restores health over time from nature\'s blessing',
        healthPerTurn: 4,
        duration: 2,
        stackable: false
    },

    mana_rain: {
        id: 'mana_rain',
        name: 'Mana Rain',
        emoji: '🌧️',
        type: 'positive',
        description: 'Restores mana over time',
        manaPerTurn: 4,
        duration: 2,
        stackable: false
    },

    enraged: {
        id: 'enraged',
        name: 'Enraged',
        emoji: '😡',
        type: 'positive',
        description: 'Increased damage from rage',
        damageBonus: 2,
        duration: 2,
        stackable: false
    },

    empowered: {
        id: 'empowered',
        name: 'Empowered',
        emoji: '⚡',
        type: 'positive',
        description: 'Deal 25% more damage',
        damageMultiplier: 1.25,
        duration: 3,
        stackable: false
    },

    invisible: {
        id: 'invisible',
        name: 'Invisible',
        emoji: '🥷',
        type: 'positive',
        description: 'Cannot be targeted by attacks',
        untargetable: true,
        duration: 2,
        stackable: false
    },

    shielded: {
        id: 'shielded',
        name: 'Shielded',
        emoji: '🛡️',
        type: 'positive',
        description: 'Reduce damage taken by 50% and immunity to effects',
        damageReduction: 0.5,
        effectImmunity: true,
        duration: 3,
        stackable: false
    },

    drunk_whiskey: {
        id: 'drunk_whiskey',
        name: 'Drunk on Whiskey',
        emoji: '🥃',
        type: 'positive',
        description: 'Significantly increased critical hit chance',
        critBonus: 50,
        duration: 1,
        stackable: false
    },

    regenerating: {
        id: 'regenerating',
        name: 'Regenerating',
        emoji: '💚',
        type: 'positive',
        description: 'Slowly regenerates health and mana',
        healthPerTurn: 1, // Base amount, modified by equipment rarity
        manaPerTurn: 1,   // Base amount, modified by equipment rarity
        duration: -1,     // Permanent while equipped
        stackable: false
    },

    lucky: {
        id: 'lucky',
        name: 'Lucky',
        emoji: '🍀',
        type: 'positive',
        description: 'Increased chance to find rare loot',
        lootBonus: 5,     // Base 5%, modified by equipment rarity
        duration: -1,     // Permanent while equipped
        stackable: false
    },

    fate_accepted: {
        id: 'fate_accepted',
        name: 'Fate Accepted',
        emoji: '🕊️',
        type: 'positive',
        description: 'Successfully cheated death',
        healthRestore: 4,
        manaRestore: 4,
        duration: 0,      // Instant effect
        oncePerBattle: true,
        stackable: false
    },

    // Negative Effects
    poisoned: {
        id: 'poisoned',
        name: 'Poisoned',
        emoji: '🧪',
        type: 'negative',
        description: 'Takes poison damage over time',
        damagePerTurn: 1,
        duration: 3,
        stackable: false
    },

    burning: {
        id: 'burning',
        name: 'Burning',
        emoji: '🔥',
        type: 'negative',
        description: 'Takes fire damage over time',
        damagePerTurn: 1,
        duration: 2,
        stackable: false
    },

    bleeding: {
        id: 'bleeding',
        name: 'Bleeding',
        emoji: '🩸',
        type: 'negative',
        description: 'Loses blood over time',
        damagePerTurn: 1,
        duration: 6,
        stackable: false
    },

    decay: {
        id: 'decay',
        name: 'Decay',
        emoji: '☠️',
        type: 'negative',
        description: 'Slowly withers away',
        damagePerTurn: 1,
        duration: 10,
        stackable: false
    },

    frozen: {
        id: 'frozen',
        name: 'Frozen',
        emoji: '❄️',
        type: 'negative',
        description: 'Cannot use weapons or magic',
        disableWeapons: true,
        disableMagic: true,
        duration: 2,
        stackable: false
    },

    paralyzed: {
        id: 'paralyzed',
        name: 'Paralyzed',
        emoji: '⚡',
        type: 'negative',
        description: 'Cannot use weapons',
        disableWeapons: true,
        duration: 2,
        stackable: false
    },

    stunned: {
        id: 'stunned',
        name: 'Stunned',
        emoji: '👊',
        type: 'negative',
        description: 'Cannot use primary weapon',
        disablePrimaryWeapon: true,
        duration: 1,
        stackable: false
    },

    petrified: {
        id: 'petrified',
        name: 'Petrified',
        emoji: '🗿',
        type: 'negative',
        description: 'Cannot make any moves, health doubled but halved when effect ends',
        disableAllActions: true,
        healthMultiplier: 2,
        duration: 3,
        stackable: false
    },

    silenced: {
        id: 'silenced',
        name: 'Silenced',
        emoji: '🤐',
        type: 'negative',
        description: 'Spells and magic fail to cast, punishes caster with damage',
        disableMagic: true,
        magicPunishDamage: 3,
        duration: 3,
        stackable: false
    },

    weakened: {
        id: 'weakened',
        name: 'Weakened',
        emoji: '💤',
        type: 'negative',
        description: 'Deal 25% less damage',
        damageMultiplier: 0.75,
        duration: 3,
        stackable: false
    },

    broken_armor: {
        id: 'broken_armor',
        name: 'Broken Armor',
        emoji: '💔',
        type: 'negative',
        description: 'Armor reduced by 100%',
        armorReduction: 1.0,
        duration: 3,
        stackable: false
    },

    cursed: {
        id: 'cursed',
        name: 'Cursed',
        emoji: '😈',
        type: 'negative',
        description: 'Take damage each turn but deal extra damage',
        damagePerTurn: 1,
        damageMultiplier: 1.2,
        duration: 5,
        stackable: false
    },

    berserking: {
        id: 'berserking',
        name: 'Berserking',
        emoji: '🤬',
        type: 'neutral',
        description: 'Deal and take 25% more damage',
        damageMultiplier: 1.25,
        damageVulnerability: 1.25,
        duration: 3,
        stackable: false
    },

    // Special Effects
    health_drain: {
        id: 'health_drain',
        name: 'Health Drain',
        emoji: '💉',
        type: 'special',
        description: 'Drains health from target to attacker',
        drainAmount: 1,
        duration: 1,
        stackable: false
    },

    pierce: {
        id: 'pierce',
        name: 'Pierce',
        emoji: '📌',
        type: 'special',
        description: 'Damage ignores armor',
        ignoreArmor: true,
        duration: 1,
        stackable: false
    }
};

/**
 * Get effect by ID
 */
export function getEffect(effectId) {
    return effects[effectId] || null;
}

/**
 * Get all positive effects
 */
export function getPositiveEffects() {
    return Object.values(effects).filter(effect => effect.type === 'positive');
}

/**
 * Get all negative effects
 */
export function getNegativeEffects() {
    return Object.values(effects).filter(effect => effect.type === 'negative');
}

/**
 * Create effect instance with custom duration
 */
export function createEffectInstance(effectId, customDuration = null, customData = {}) {
    const baseEffect = getEffect(effectId);
    if (!baseEffect) return null;

    return {
        ...baseEffect,
        duration: customDuration !== null ? customDuration : baseEffect.duration,
        turnsRemaining: customDuration !== null ? customDuration : baseEffect.duration,
        appliedAt: Date.now(),
        ...customData
    };
}

/**
 * Check if effect stacks with existing effects
 */
export function canStackEffect(existingEffects, newEffectId) {
    const newEffect = getEffect(newEffectId);
    if (!newEffect) return false;

    if (newEffect.stackable) return true;

    // Check if same effect already exists
    return !existingEffects.some(effect => effect.id === newEffectId);
}

/**
 * Apply effect duration rules (same type effects don't stack, but duration can be extended)
 */
export function applyEffectDuration(existingEffects, newEffect) {
    const existingIndex = existingEffects.findIndex(effect => effect.id === newEffect.id);
    
    if (existingIndex !== -1) {
        // Effect already exists, extend duration if new duration is longer
        const existing = existingEffects[existingIndex];
        if (newEffect.duration > existing.turnsRemaining) {
            existing.duration = newEffect.duration;
            existing.turnsRemaining = newEffect.duration;
            existing.appliedAt = Date.now();
        }
        return existingEffects;
    } else {
        // New effect, add to list
        return [...existingEffects, createEffectInstance(newEffect.id, newEffect.duration)];
    }
}

/**
 * Process effect for one turn
 */
export function processEffectTurn(effect, target) {
    const results = {
        damage: 0,
        healing: 0,
        mana: 0,
        messages: [],
        effectExpired: false
    };

    // Damage over time effects
    if (effect.damagePerTurn) {
        results.damage = effect.damagePerTurn;
        results.messages.push(`${target.name} takes ${effect.damagePerTurn} damage from ${effect.name}`);
    }

    // Healing over time effects
    if (effect.healthPerTurn) {
        results.healing = effect.healthPerTurn;
        results.messages.push(`${target.name} heals ${effect.healthPerTurn} health from ${effect.name}`);
    }

    // Mana restoration effects
    if (effect.manaPerTurn) {
        results.mana = effect.manaPerTurn;
        results.messages.push(`${target.name} restores ${effect.manaPerTurn} mana from ${effect.name}`);
    }

    // Reduce duration
    if (effect.duration > 0) {
        effect.turnsRemaining--;
        if (effect.turnsRemaining <= 0) {
            results.effectExpired = true;
            results.messages.push(`${effect.name} effect has worn off`);
        }
    }

    return results;
}

/**
 * Get effect display string for UI
 */
export function getEffectDisplayString(effects) {
    if (!effects || effects.length === 0) return 'None';
    
    return effects.map(effect => {
        const duration = effect.duration > 0 ? ` (${effect.turnsRemaining})` : '';
        return `${effect.emoji} ${effect.name}${duration}`;
    }).join(', ');
}

export default effects; 