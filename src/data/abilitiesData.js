/**
 * Abilities Data for Dungeonites Heroes Challenge
 * Based on RULES.txt specifications
 */
import { effects } from './effectsData.js';

export const abilitiesData = [
    {
        id: 'silence',
        name: 'Silence',
        type: 'ability',
        manaCost: 1,
        description: 'Negates magic damage and deals 3 damage to caster if successful.',
        effect: 'Counters magic attacks, deals 3 damage if used against magic',
        emoji: '🤫',
        category: 'defensive'
    },
    {
        id: 'counter',
        name: 'Counter',
        type: 'ability',
        manaCost: 1,
        description: 'Negates melee damage and deals 2 damage back to attacker.',
        effect: 'Negates melee damage and deals 2 damage back',
        emoji: '🛡️',
        category: 'defensive'
    },
    {
        id: 'dodge',
        name: 'Dodge',
        type: 'ability',
        manaCost: 1,
        description: 'Avoids physical attacks and heals 2 vs melee, 3 vs ranged.',
        effect: 'Avoids physical attacks and provides healing',
        emoji: '💨',
        category: 'defensive'
    },
    {
        id: 'accepting_fate',
        name: 'Accepting Fate',
        type: 'ability',
        manaCost: 4,
        description: 'Prevents death, restores 4 health and 4 mana.',
        effect: 'Prevents death once per battle, heals 4 HP and restores 4 mana',
        emoji: '🕊️',
        category: 'defensive'
    },
    {
        id: 'pound',
        name: 'Pound',
        type: 'ability',
        manaCost: 3,
        damage: 3,
        description: 'Deals 3 damage with stun effect.',
        effect: 'Deals 3 damage and stuns enemy',
        emoji: '👊',
        category: 'offensive'
    },
    {
        id: 'rage_toss',
        name: 'Rage Toss',
        type: 'ability',
        manaCost: 3,
        damage: 3,
        description: 'Deals 3 damage and breaks armor.',
        effect: 'Deals 3 damage and breaks enemy armor',
        emoji: '🤬',
        category: 'offensive'
    },
    {
        id: 'dual_shot',
        name: 'Dual Shot',
        type: 'ability',
        manaCost: 4,
        damage: 4,
        description: 'Deals 4 damage that pierces armor.',
        effect: 'Deals 4 damage that ignores armor',
        emoji: '🏹',
        category: 'offensive'
    },
    {
        id: 'lucky_guy',
        name: 'Lucky Guy',
        type: 'ability',
        manaCost: 2,
        description: 'Grants invisibility for the turn.',
        effect: 'Becomes invisible, cannot be targeted',
        emoji: '🍀',
        category: 'utility'
    },
    {
        id: 'heal',
        name: 'Heal',
        type: 'ability',
        manaCost: 1,
        healAmount: 2,
        description: 'Restores 2 health.',
        effect: 'Heals 2 health',
        emoji: '❤️',
        category: 'healing'
    },
    {
        id: 'healing_rain',
        name: 'Healing Rain',
        type: 'ability',
        manaCost: 4,
        description: 'Creates healing rain for multiple turns.',
        effect: 'Applies healing rain for multiple turns',
        emoji: '🌦️',
        category: 'healing'
    },
    {
        id: 'poison_arrow',
        name: 'Poison Arrow',
        type: 'ability',
        manaCost: 3,
        description: 'Poisons enemy for 3 turns.',
        effect: 'Applies poison for 3 turns',
        emoji: '🏹',
        category: 'offensive'
    },
    {
        id: 'shadow_step',
        name: 'Shadow Step',
        type: 'ability',
        manaCost: 4,
        description: 'Becomes invisible for 1 turn.',
        effect: 'Grants invisibility for 1 turn',
        emoji: '👤',
        category: 'utility'
    },
    {
        id: 'life_drain',
        name: 'Life Drain',
        type: 'ability',
        manaCost: 4,
        damage: 3,
        healAmount: 3,
        description: 'Deals 3 damage and heals for the same amount.',
        effect: 'Deals 3 damage and heals 3 health',
        emoji: '🩸',
        category: 'offensive'
    },
    {
        id: 'mana_surge',
        name: 'Mana Surge',
        type: 'ability',
        manaCost: 3,
        description: 'Restores 5 mana immediately.',
        effect: 'Restores 5 mana',
        emoji: '💙',
        category: 'utility'
    },
    {
        id: 'elemental_fury',
        name: 'Elemental Fury',
        type: 'ability',
        manaCost: 3,
        damage: 4,
        description: 'Deals 4 damage of a random element.',
        effect: 'Deals 4 elemental damage',
        emoji: '🌟',
        category: 'offensive'
    },
    {
        id: 'stoneheart',
        name: 'Stoneheart',
        type: 'ability',
        manaCost: 4,
        description: 'Reduces incoming damage by 1 for 3 turns.',
        effect: 'Damage reduction for 3 turns',
        emoji: '🪨',
        category: 'defensive'
    },
    {
        id: 'fortunate',
        name: 'Fortunate',
        type: 'ability',
        manaCost: 0,
        description: '50% chance to find extra loot for next 2 floors.',
        effect: 'Increases loot chance for 2 floors',
        emoji: '🍀',
        category: 'utility'
    },
    {
        id: 'immortal',
        name: 'Immortal',
        type: 'ability',
        manaCost: 0,
        description: 'Once per battle, survives with 1 health when killed.',
        effect: 'Prevents death once per battle',
        emoji: '👑',
        category: 'defensive'
    },
    {
        id: 'spellmaster',
        name: 'Spellmaster',
        type: 'ability',
        manaCost: 0,
        description: 'All spell costs reduced by 1 for the battle.',
        effect: 'Reduces all spell mana costs by 1',
        emoji: '🔮',
        category: 'utility'
    },
    {
        id: 'forestborn',
        name: 'Forestborn',
        type: 'ability',
        manaCost: 6,
        description: 'Starts with +2 max health and +1 max mana.',
        effect: 'Permanent stat increase',
        emoji: '🌲',
        category: 'passive'
    },
    {
        id: 'roar',
        name: 'Roar',
        type: 'ability',
        manaCost: 4,
        description: 'Intimidates enemies, reducing damage by 25% for 2 turns.',
        effect: 'Reduces enemy damage by 25% for 2 turns',
        emoji: '🦁',
        category: 'debuff'
    },
    {
        id: 'wing_buffet',
        name: 'Wing Buffet',
        type: 'ability',
        manaCost: 5,
        damage: 3,
        description: 'Applies weakened status and deals 3 damage.',
        effect: 'Deals 3 damage and weakens enemy',
        emoji: '🪶',
        category: 'offensive'
    },

    // Spell abilities (basically spells but categorized as abilities)
    {
        id: 'blizzard',
        name: 'Blizzard',
        type: 'ability',
        manaCost: 4,
        description: 'Freezes enemy with ice magic.',
        effect: 'Applies frozen status to enemy',
        emoji: '❄️',
        category: 'offensive'
    },
    {
        id: 'firestorm',
        name: 'Firestorm',
        type: 'ability',
        manaCost: 4,
        description: 'Burns enemy with fire magic.',
        effect: 'Applies burning status to enemy',
        emoji: '🔥',
        category: 'offensive'
    }
];

/**
 * Get ability by ID
 */
export function getAbilityById(abilityId) {
    return abilitiesData.find(ability => ability.id === abilityId);
}

/**
 * Get abilities by category
 */
export function getAbilitiesByCategory(category) {
    return abilitiesData.filter(ability => ability.category === category);
}

/**
 * Get abilities for a specific hero
 */
export function getHeroAbilities(heroAbilities) {
    return heroAbilities.map(abilityId => getAbilityById(abilityId)).filter(Boolean);
}

/**
 * Check if ability can be used (mana requirements)
 */
export function canUseAbility(ability, currentMana) {
    return currentMana >= ability.manaCost;
}

/**
 * Calculate ability effects
 */
export function calculateAbilityEffect(ability, target, attacker) {
    const effectResults = [];
    
    // Damage effects
    if (ability.damage) {
        effectResults.push({
            type: 'damage',
            amount: ability.damage,
            target: target
        });
    }
    
    // Healing effects
    if (ability.healAmount) {
        effectResults.push({
            type: 'heal',
            amount: ability.healAmount,
            target: attacker
        });
    }
    
    // Status effects based on ability type
    switch (ability.id) {
        case 'pound':
            if (effects.stunned) {
                effectResults.push({
                    type: 'status_effect',
                    effect: effects.stunned,
                    target: target
                });
            }
            break;
            
        case 'rage_toss':
            if (effects.broken_armor) {
                effectResults.push({
                    type: 'status_effect',
                    effect: effects.broken_armor,
                    target: target
                });
            }
            break;
            
        case 'dual_shot':
            effectResults.push({
                type: 'pierce',
                target: target
            });
            break;
            
        case 'lucky_guy':
            if (effects.invisible) {
                effectResults.push({
                    type: 'status_effect',
                    effect: effects.invisible,
                    target: attacker
                });
            }
            break;
            
        case 'healing_rain':
            if (effects.healing_rain) {
                effectResults.push({
                    type: 'status_effect',
                    effect: effects.healing_rain,
                    target: attacker
                });
            }
            break;
            
        case 'accepting_fate':
            // Accepting Fate is now handled as a special death prevention ability
            // No status effect needed here - it's processed in EffectProcessor
            break;
            
        case 'blizzard':
            if (effects.frozen) {
                effectResults.push({
                    type: 'status_effect',
                    effect: effects.frozen,
                    target: target
                });
            }
            break;
            
        case 'firestorm':
            if (effects.burning) {
                effectResults.push({
                    type: 'status_effect',
                    effect: effects.burning,
                    target: target
                });
            }
            break;
            
        case 'wing_buffet':
            if (effects.weakened) {
                effectResults.push({
                    type: 'status_effect',
                    effect: effects.weakened,
                    target: target
                });
            }
            break;
    }
    
    return effectResults;
} 