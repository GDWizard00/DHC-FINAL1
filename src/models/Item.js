/**
 * Item Model for Dungeonites Heroes Challenge
 * Represents all types of items: weapons, armor, consumables, scrolls, shards, chests
 */

export class Item {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type; // 'weapon', 'armor', 'consumable', 'scroll', 'shard', 'chest', 'enhancer'
        this.rarity = data.rarity; // 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'
        this.description = data.description;
        this.emoji = data.emoji;
        this.imageUrl = data.imageUrl;
        
        // Weapon/Armor specific properties
        this.damage = data.damage || 0;
        this.defense = data.defense || 0;
        this.weaponType = data.weaponType; // 'melee', 'ranged', 'magic'
        this.manaCost = data.manaCost || 0;
        this.healthCost = data.healthCost || 0;
        this.effects = data.effects || []; // Status effects this item can apply
        
        // Consumable specific properties
        this.consumableType = data.consumableType; // 'potion', 'scroll', 'shard', 'enhancer'
        this.healAmount = data.healAmount || 0;
        this.manaAmount = data.manaAmount || 0;
        this.statBoost = data.statBoost || {}; // For shards and enhancers
        
        // Chest specific properties
        this.keysRequired = data.keysRequired || 0;
        this.rewardTable = data.rewardTable || null;
        
        // Equipment specific properties
        this.floorRequirement = data.floorRequirement || 0;
        this.bonuses = data.bonuses || {}; // Additional stat bonuses
        this.specialAbilities = data.specialAbilities || []; // Special abilities granted by equipment
        
        // Value and trading
        this.goldValue = data.goldValue || 0;
        this.isNFT = data.isNFT || false; // For future web3 integration
        this.isTradeable = data.isTradeable !== false; // Most items are tradeable by default
        this.stackable = data.stackable || false;
        this.maxStack = data.maxStack || 1;
    }

    /**
     * Get item rarity color for embeds
     */
    getRarityColor() {
        const colors = {
            'common': 0x95a5a6,     // Gray
            'uncommon': 0x27ae60,   // Green
            'rare': 0x3498db,       // Blue
            'epic': 0x9b59b6,       // Purple
            'legendary': 0xf39c12,  // Orange
            'mythical': 0xe74c3c    // Red
        };
        return colors[this.rarity] || colors.common;
    }

    /**
     * Get item type emoji
     */
    getTypeEmoji() {
        const typeEmojis = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'consumable': '🧪',
            'scroll': '📜',
            'shard': '💎',
            'chest': '📦',
            'enhancer': '✨'
        };
        return this.emoji || typeEmojis[this.type] || '📦';
    }

    /**
     * Check if item can be used by player at current floor
     */
    canUseAtFloor(floor) {
        return floor >= this.floorRequirement;
    }

    /**
     * Check if item is a weapon
     */
    isWeapon() {
        return this.type === 'weapon';
    }

    /**
     * Check if item is armor
     */
    isArmor() {
        return this.type === 'armor';
    }

    /**
     * Check if item is consumable
     */
    isConsumable() {
        return ['consumable', 'scroll', 'shard', 'enhancer'].includes(this.type);
    }

    /**
     * Check if item is a chest
     */
    isChest() {
        return this.type === 'chest';
    }

    /**
     * Use consumable item
     */
    useConsumable(gameState) {
        if (!this.isConsumable()) {
            return { success: false, message: 'Item is not consumable' };
        }

        const result = { success: true, effects: [], message: '' };

        switch (this.consumableType) {
            case 'potion':
                if (this.healAmount > 0) {
                    const healed = Math.min(this.healAmount, gameState.hero.maxHealth - gameState.hero.health);
                    gameState.hero.health += healed;
                    result.effects.push({ type: 'heal', amount: healed });
                    result.message = `Restored ${healed} health`;
                }
                if (this.manaAmount > 0) {
                    const restored = Math.min(this.manaAmount, gameState.hero.maxMana - gameState.hero.mana);
                    gameState.hero.mana += restored;
                    result.effects.push({ type: 'mana', amount: restored });
                    result.message += (result.message ? ' and ' : '') + `${restored} mana`;
                }
                break;

            case 'shard':
                // Apply permanent stat boosts
                if (this.statBoost.health) {
                    gameState.hero.maxHealth += this.statBoost.health;
                    gameState.hero.health += this.statBoost.health;
                    result.effects.push({ type: 'permanent_health', amount: this.statBoost.health });
                }
                if (this.statBoost.mana) {
                    gameState.hero.maxMana += this.statBoost.mana;
                    gameState.hero.mana += this.statBoost.mana;
                    result.effects.push({ type: 'permanent_mana', amount: this.statBoost.mana });
                }
                result.message = 'Permanently increased stats';
                break;

            case 'scroll':
                // Apply temporary effects or spells
                if (this.effects && this.effects.length > 0) {
                    this.effects.forEach(effect => {
                        gameState.applyEffect(effect);
                        result.effects.push(effect);
                    });
                    result.message = `Applied ${this.effects.map(e => e.type).join(', ')} effects`;
                }
                break;

            case 'enhancer':
                // Enhancers are applied to weapons/armor, not used directly
                result.success = false;
                result.message = 'Enhancers must be applied to weapons or armor';
                break;
        }

        return result;
    }

    /**
     * Apply enhancer to weapon or armor
     */
    applyEnhancer(targetItem) {
        if (this.type !== 'enhancer') {
            return { success: false, message: 'Item is not an enhancer' };
        }

        if (!targetItem.isWeapon() && !targetItem.isArmor()) {
            return { success: false, message: 'Can only enhance weapons or armor' };
        }

        // Apply damage/defense bonuses
        if (this.statBoost.damage && targetItem.isWeapon()) {
            targetItem.damage += this.statBoost.damage;
        }
        if (this.statBoost.defense && targetItem.isArmor()) {
            targetItem.defense += this.statBoost.defense;
        }

        // Apply effects
        if (this.effects && this.effects.length > 0) {
            targetItem.effects = [...(targetItem.effects || []), ...this.effects];
        }

        // Apply special abilities
        if (this.specialAbilities && this.specialAbilities.length > 0) {
            targetItem.specialAbilities = [...(targetItem.specialAbilities || []), ...this.specialAbilities];
        }

        return { 
            success: true, 
            message: `Enhanced ${targetItem.name} with ${this.name}`,
            enhancedItem: targetItem 
        };
    }

    /**
     * Get detailed item description for display
     */
    getDetailedDescription() {
        let desc = this.description || '';
        
        if (this.isWeapon()) {
            desc += `\nDamage: ${this.damage}`;
            if (this.manaCost > 0) desc += ` | Mana Cost: ${this.manaCost}`;
            if (this.healthCost > 0) desc += ` | Health Cost: ${this.healthCost}`;
            desc += ` | Type: ${this.weaponType}`;
        }
        
        if (this.isArmor()) {
            desc += `\nDefense: ${this.defense}`;
            if (this.floorRequirement > 0) desc += ` | Floor Req: ${this.floorRequirement}`;
        }
        
        if (this.effects && this.effects.length > 0) {
            desc += `\nEffects: ${this.effects.map(e => `${e.type} (${e.chance || 100}%)`).join(', ')}`;
        }
        
        if (this.isChest()) {
            desc += `\nKeys Required: ${this.keysRequired}`;
        }
        
        return desc;
    }

    /**
     * Convert to JSON for database storage
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            rarity: this.rarity,
            description: this.description,
            emoji: this.emoji,
            imageUrl: this.imageUrl,
            damage: this.damage,
            defense: this.defense,
            weaponType: this.weaponType,
            manaCost: this.manaCost,
            healthCost: this.healthCost,
            effects: this.effects,
            consumableType: this.consumableType,
            healAmount: this.healAmount,
            manaAmount: this.manaAmount,
            statBoost: this.statBoost,
            keysRequired: this.keysRequired,
            rewardTable: this.rewardTable,
            floorRequirement: this.floorRequirement,
            bonuses: this.bonuses,
            specialAbilities: this.specialAbilities,
            goldValue: this.goldValue,
            isNFT: this.isNFT,
            isTradeable: this.isTradeable,
            stackable: this.stackable,
            maxStack: this.maxStack
        };
    }

    /**
     * Create Item from JSON data
     */
    static fromJSON(data) {
        return new Item(data);
    }
} 