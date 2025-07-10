/**
 * Effect Model for Dungeonites Heroes Challenge
 * Represents status effects, buffs, and debuffs
 */

export class Effect {
    constructor(data) {
        this.id = data.id;
        this.type = data.type; // 'poisoned', 'burning', 'healing', 'frozen', etc.
        this.name = data.name;
        this.description = data.description;
        this.emoji = data.emoji;
        this.duration = data.duration; // Number of turns
        this.power = data.power || 1; // Effect strength/magnitude
        this.stackable = data.stackable || false;
        this.category = data.category; // 'debuff', 'buff', 'neutral'
        this.source = data.source; // What caused this effect
        
        // Effect behavior
        this.damagePerTurn = data.damagePerTurn || 0;
        this.healPerTurn = data.healPerTurn || 0;
        this.manaPerTurn = data.manaPerTurn || 0;
        this.statModifiers = data.statModifiers || {}; // Temporary stat changes
        this.preventActions = data.preventActions || []; // Actions blocked by this effect
        
        // Visual properties
        this.color = data.color || this.getDefaultColor();
        this.priority = data.priority || 0; // For display ordering
    }

    /**
     * Get default color based on effect category
     */
    getDefaultColor() {
        const categoryColors = {
            'debuff': 0xe74c3c,   // Red
            'buff': 0x27ae60,     // Green
            'neutral': 0x3498db   // Blue
        };
        return categoryColors[this.category] || categoryColors.neutral;
    }

    /**
     * Check if effect prevents a specific action
     */
    preventsAction(action) {
        return this.preventActions.includes(action);
    }

    /**
     * Apply effect for one turn
     */
    applyTurnEffect(target) {
        const results = [];

        // Apply damage per turn
        if (this.damagePerTurn > 0) {
            target.health = Math.max(0, target.health - this.damagePerTurn);
            results.push({
                type: 'damage',
                amount: this.damagePerTurn,
                source: this.type,
                target: target
            });
        }

        // Apply healing per turn
        if (this.healPerTurn > 0) {
            const healAmount = Math.min(this.healPerTurn, target.maxHealth - target.health);
            target.health += healAmount;
            results.push({
                type: 'healing',
                amount: healAmount,
                source: this.type,
                target: target
            });
        }

        // Apply mana restoration per turn
        if (this.manaPerTurn > 0) {
            const manaAmount = Math.min(this.manaPerTurn, target.maxMana - target.mana);
            target.mana += manaAmount;
            results.push({
                type: 'mana_restore',
                amount: manaAmount,
                source: this.type,
                target: target
            });
        }

        // Decrease duration
        this.duration--;

        return results;
    }

    /**
     * Check if effect is expired
     */
    isExpired() {
        return this.duration <= 0;
    }

    /**
     * Get effect display string
     */
    getDisplayString() {
        return `${this.emoji} ${this.name} (${this.duration})`;
    }

    /**
     * Get detailed effect description
     */
    getDetailedDescription() {
        let desc = this.description;
        
        if (this.damagePerTurn > 0) {
            desc += ` Deals ${this.damagePerTurn} damage per turn.`;
        }
        
        if (this.healPerTurn > 0) {
            desc += ` Heals ${this.healPerTurn} health per turn.`;
        }
        
        if (this.manaPerTurn > 0) {
            desc += ` Restores ${this.manaPerTurn} mana per turn.`;
        }
        
        if (this.preventActions.length > 0) {
            desc += ` Prevents: ${this.preventActions.join(', ')}.`;
        }
        
        desc += ` Duration: ${this.duration} turns.`;
        
        return desc;
    }

    /**
     * Create a copy of this effect with modified duration
     */
    copyWithDuration(newDuration) {
        const effectCopy = Effect.fromJSON(this.toJSON());
        effectCopy.duration = newDuration;
        return effectCopy;
    }

    /**
     * Merge with another effect of the same type (if stackable)
     */
    mergeWith(otherEffect) {
        if (this.type !== otherEffect.type) {
            return false; // Can't merge different effect types
        }

        if (this.stackable) {
            // Stack effects by adding duration and power
            this.duration += otherEffect.duration;
            this.power += otherEffect.power;
            return true;
        } else {
            // Non-stackable effects: use the longer duration
            if (otherEffect.duration > this.duration) {
                this.duration = otherEffect.duration;
                this.power = otherEffect.power;
            }
            return true;
        }
    }

    /**
     * Convert to JSON for database storage
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            description: this.description,
            emoji: this.emoji,
            duration: this.duration,
            power: this.power,
            stackable: this.stackable,
            category: this.category,
            source: this.source,
            damagePerTurn: this.damagePerTurn,
            healPerTurn: this.healPerTurn,
            manaPerTurn: this.manaPerTurn,
            statModifiers: this.statModifiers,
            preventActions: this.preventActions,
            color: this.color,
            priority: this.priority
        };
    }

    /**
     * Create Effect from JSON data
     */
    static fromJSON(data) {
        return new Effect(data);
    }

    /**
     * Create common status effects
     */
    static createPoisoned(duration = 3, power = 1, source = 'unknown') {
        return new Effect({
            id: 'poisoned',
            type: 'poisoned',
            name: 'Poisoned',
            description: 'Taking poison damage each turn',
            emoji: '🧪',
            duration: duration,
            power: power,
            damagePerTurn: power,
            category: 'debuff',
            source: source,
            color: 0x8e44ad
        });
    }

    static createBurning(duration = 2, power = 1, source = 'unknown') {
        return new Effect({
            id: 'burning',
            type: 'burning',
            name: 'Burning',
            description: 'Taking fire damage each turn',
            emoji: '🔥',
            duration: duration,
            power: power,
            damagePerTurn: power,
            category: 'debuff',
            source: source,
            color: 0xe67e22
        });
    }

    static createHealing(duration = 1, power = 4, source = 'unknown') {
        return new Effect({
            id: 'healing',
            type: 'healing',
            name: 'Healing',
            description: 'Restoring health each turn',
            emoji: '❤️',
            duration: duration,
            power: power,
            healPerTurn: power,
            category: 'buff',
            source: source,
            color: 0x27ae60
        });
    }

    static createFrozen(duration = 2, source = 'unknown') {
        return new Effect({
            id: 'frozen',
            type: 'frozen',
            name: 'Frozen',
            description: 'Unable to use weapons or magic',
            emoji: '❄️',
            duration: duration,
            preventActions: ['weapon', 'magic'],
            category: 'debuff',
            source: source,
            color: 0x3498db
        });
    }

    static createParalyzed(duration = 2, source = 'unknown') {
        return new Effect({
            id: 'paralyzed',
            type: 'paralyzed',
            name: 'Paralyzed',
            description: 'Unable to use weapons',
            emoji: '⚡',
            duration: duration,
            preventActions: ['weapon'],
            category: 'debuff',
            source: source,
            color: 0xf1c40f
        });
    }

    static createStunned(duration = 1, source = 'unknown') {
        return new Effect({
            id: 'stunned',
            type: 'stunned',
            name: 'Stunned',
            description: 'Unable to use primary weapon',
            emoji: '👊',
            duration: duration,
            preventActions: ['primary_weapon'],
            category: 'debuff',
            source: source,
            color: 0x95a5a6
        });
    }

    static createEnraged(duration = 2, damageBonus = 2, source = 'unknown') {
        return new Effect({
            id: 'enraged',
            type: 'enraged',
            name: 'Enraged',
            description: 'Dealing extra damage',
            emoji: '😡',
            duration: duration,
            statModifiers: { damageBonus: damageBonus },
            category: 'buff',
            source: source,
            color: 0xe74c3c
        });
    }

    static createInvisible(duration = 2, source = 'unknown') {
        return new Effect({
            id: 'invisible',
            type: 'invisible',
            name: 'Invisible',
            description: 'Cannot be targeted by attacks',
            emoji: '🥷',
            duration: duration,
            category: 'buff',
            source: source,
            color: 0x2c3e50
        });
    }
} 