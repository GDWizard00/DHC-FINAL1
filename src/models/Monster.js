/**
 * Monster Model for Dungeonites Heroes Challenge
 * Represents a monster with stats, abilities, weapons, and spells
 */

import { calculateMonsterScalingFactor } from '../utils/floorScaling.js';

export class Monster {
    constructor(data, currentFloor = 1) {
        this.id = data.id;
        this.name = data.name;
        this.floorNumber = data.floorNumber;
        this.emoji = data.emoji;
        this.imageUrl = data.imageUrl;
        
        // Base stats (scaled based on current floor)
        this.baseHealth = data.health;
        this.baseMana = data.mana;
        this.baseArmor = data.armor;
        this.baseCritChance = data.critChance;
        
        // Calculate scaled stats based on floor progression
        const scalingFactor = this.calculateScalingFactor(currentFloor);
        this.health = Math.ceil(this.baseHealth * scalingFactor);
        this.maxHealth = this.health;
        this.mana = Math.ceil(this.baseMana * scalingFactor);
        this.maxMana = this.mana;
        this.armor = Math.ceil(this.baseArmor * scalingFactor);
        this.critChance = this.baseCritChance; // Crit chance doesn't scale
        
        // Combat options
        this.weapons = data.weapons || [];
        this.abilities = data.abilities || [];
        this.spells = data.spells || [];
        this.specialMoves = data.specialMoves || [];
        
        // Current battle state
        this.activeEffects = [];
        this.currentFloor = currentFloor;
    }

    /**
     * Calculate scaling factor based on floor progression
     * Monster stats increase by 10% every 20 floors after floor 20
     * Capped at floor 500 for balanced progression
     */
    calculateScalingFactor(currentFloor) {
        return calculateMonsterScalingFactor(currentFloor);
    }

    /**
     * Get monster for specific floor (handles looping after floor 20)
     */
    static getMonsterForFloor(monsters, floorNumber) {
        // After floor 20, loop back to floor 1-20 monsters but with scaling
        const baseFloor = ((floorNumber - 1) % 20) + 1;
        const baseMonster = monsters.find(m => m.floorNumber === baseFloor);
        
        if (baseMonster) {
            return new Monster(baseMonster, floorNumber);
        }
        
        return null;
    }

    /**
     * Get all possible combat moves for this monster
     */
    getAllMoves() {
        const moves = [];
        
        // Add weapons
        this.weapons.forEach(weapon => {
            moves.push({
                type: 'weapon',
                id: weapon.id || weapon,
                name: weapon.name || weapon,
                category: 'weapon'
            });
        });
        
        // Add abilities
        this.abilities.forEach(ability => {
            moves.push({
                type: 'ability',
                id: ability.id || ability,
                name: ability.name || ability,
                category: 'ability'
            });
        });
        
        // Add spells
        this.spells.forEach(spell => {
            moves.push({
                type: 'spell',
                id: spell.id || spell,
                name: spell.name || spell,
                category: 'spell'
            });
        });
        
        // Add special moves
        this.specialMoves.forEach(move => {
            moves.push({
                type: 'special',
                id: move.id || move,
                name: move.name || move,
                category: 'special'
            });
        });
        
        return moves;
    }

    /**
     * Apply damage to monster
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0;
    }

    /**
     * Apply healing to monster
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Use mana
     */
    useMana(amount) {
        this.mana = Math.max(0, this.mana - amount);
        return this.mana >= amount;
    }

    /**
     * Apply status effect to monster
     */
    applyEffect(effect) {
        // Check if effect already exists
        const existingEffect = this.activeEffects.find(e => e.type === effect.type);
        
        if (existingEffect) {
            // Don't stack same type effects, but update duration if new one is longer
            if (effect.duration > existingEffect.duration) {
                existingEffect.duration = effect.duration;
            }
        } else {
            this.activeEffects.push({ ...effect });
        }
    }

    /**
     * Process all active effects (called each turn)
     */
    processEffects() {
        const effectResults = [];
        
        this.activeEffects = this.activeEffects.filter(effect => {
            const result = this.processEffect(effect);
            if (result) effectResults.push(result);
            
            effect.duration--;
            return effect.duration > 0;
        });

        return effectResults;
    }

    /**
     * Process a single effect
     */
    processEffect(effect) {
        switch (effect.type) {
            case 'poisoned':
                this.health = Math.max(0, this.health - 1);
                return { type: 'damage', amount: 1, source: 'poison' };
            
            case 'burning':
                this.health = Math.max(0, this.health - 1);
                return { type: 'damage', amount: 1, source: 'burning' };
            
            case 'healing':
                const healAmount = Math.min(4, this.maxHealth - this.health);
                this.health += healAmount;
                return { type: 'healing', amount: healAmount };
            
            case 'regenerating':
                const regenAmount = Math.min(effect.power || 1, this.maxHealth - this.health);
                this.health += regenAmount;
                return { type: 'healing', amount: regenAmount, source: 'regeneration' };
            
            default:
                return null;
        }
    }

    /**
     * Check if monster is alive
     */
    isAlive() {
        return this.health > 0;
    }

    /**
     * Get monster's current status summary
     */
    getStatusSummary() {
        return {
            name: this.name,
            health: this.health,
            maxHealth: this.maxHealth,
            mana: this.mana,
            maxMana: this.maxMana,
            armor: this.armor,
            critChance: this.critChance,
            activeEffects: this.activeEffects,
            floor: this.currentFloor,
            scalingFactor: this.calculateScalingFactor(this.currentFloor)
        };
    }

    /**
     * Convert to JSON for database storage
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            floorNumber: this.floorNumber,
            emoji: this.emoji,
            imageUrl: this.imageUrl,
            baseHealth: this.baseHealth,
            baseMana: this.baseMana,
            baseArmor: this.baseArmor,
            baseCritChance: this.baseCritChance,
            health: this.health,
            maxHealth: this.maxHealth,
            mana: this.mana,
            maxMana: this.maxMana,
            armor: this.armor,
            critChance: this.critChance,
            weapons: this.weapons,
            abilities: this.abilities,
            spells: this.spells,
            specialMoves: this.specialMoves,
            activeEffects: this.activeEffects,
            currentFloor: this.currentFloor
        };
    }

    /**
     * Create Monster from JSON data
     */
    static fromJSON(data) {
        const monster = Object.assign(new Monster({
            id: data.id,
            name: data.name,
            floorNumber: data.floorNumber,
            emoji: data.emoji,
            imageUrl: data.imageUrl,
            health: data.baseHealth,
            mana: data.baseMana,
            armor: data.baseArmor,
            critChance: data.baseCritChance,
            weapons: data.weapons,
            abilities: data.abilities,
            spells: data.spells,
            specialMoves: data.specialMoves
        }, data.currentFloor), data);
        
        return monster;
    }
} 