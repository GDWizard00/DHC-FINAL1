/**
 * Hero Model for Dungeonites Heroes Challenge
 * Represents a hero character with stats, abilities, and weapons
 */

export class Hero {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.health = data.health;
        this.mana = data.mana;
        this.armor = data.armor;
        this.critChance = data.critChance;
        this.weapons = data.weapons || [];
        this.abilities = data.abilities || [];
        this.description = data.description;
        this.unlockFloor = data.unlockFloor || 0;
        this.imageUrl = data.imageUrl;
        this.emoji = data.emoji;
    }

    /**
     * Check if hero is available for the given floor
     */
    isUnlockedAtFloor(floor) {
        return floor >= this.unlockFloor;
    }

    /**
     * Get hero's primary weapon
     */
    getPrimaryWeapon() {
        return this.weapons.length > 0 ? this.weapons[0] : null;
    }

    /**
     * Get hero's secondary weapon (if any)
     */
    getSecondaryWeapon() {
        return this.weapons.length > 1 ? this.weapons[1] : null;
    }

    /**
     * Get all hero abilities
     */
    getAbilities() {
        return this.abilities;
    }

    /**
     * Convert to JSON for database storage
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            health: this.health,
            mana: this.mana,
            armor: this.armor,
            critChance: this.critChance,
            weapons: this.weapons,
            abilities: this.abilities,
            description: this.description,
            unlockFloor: this.unlockFloor,
            imageUrl: this.imageUrl,
            emoji: this.emoji
        };
    }

    /**
     * Create Hero from JSON data
     */
    static fromJSON(data) {
        return new Hero(data);
    }
} 