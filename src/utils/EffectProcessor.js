import { logger } from './logger.js';
import { abilitiesData, calculateAbilityEffect } from '../data/abilitiesData.js';
import { weaponsData } from '../data/weaponsData.js';
import { effects } from '../data/effectsData.js';
import { calculateWeaponDamageScaling, calculateMonsterScalingFactor } from './floorScaling.js';

/**
 * EffectProcessor - Centralized combat and effect processing system
 * Handles damage calculations, status effects, crit chances, and combat outcomes
 */
export class EffectProcessor {
    
    /**
     * Process a complete combat turn with both player and monster actions
     */
    static processCombatTurn(gameState, playerAction, monsterAction) {
        const result = {
            playerDamage: 0,
            monsterDamage: 0,
            playerManaCost: 0,
            monsterManaCost: 0,
            playerHealing: 0,
            monsterHealing: 0,
            playerManaRestore: 0,
            monsterManaRestore: 0,
            playerEffects: [],
            monsterEffects: [],
            criticalHits: [],
            messages: []
        };

        // Clear combat modifiers at the start of each turn
        this.clearCombatModifiers(gameState.player);
        this.clearCombatModifiers(gameState.battle.currentMonster);

        // Process player action effects
        const playerEffects = this.processAction(
            playerAction, 
            gameState.player, 
            gameState.battle.currentMonster, 
            gameState.currentFloor || 1
        );

        // Process monster action effects
        const monsterEffects = this.processAction(
            monsterAction, 
            gameState.battle.currentMonster, 
            gameState.player, 
            gameState.currentFloor || 1
        );

        // Apply simultaneous effects with counters and negations
        this.applySimultaneousEffects(result, playerEffects, monsterEffects, gameState);

        // Check for death prevention abilities and apply them if needed
        this.checkDeathPrevention(result, playerEffects, monsterEffects, gameState);

        // Apply any new status effects from the combat turn
        this.applyNewStatusEffects(playerEffects, monsterEffects, gameState);

        // Process existing status effects
        this.processStatusEffects(result, gameState);

        return result;
    }

    /**
     * Process a single action (weapon, ability, spell) and return effects
     */
    static processAction(action, attacker, target, currentFloor) {
        const effects = [];
        
        switch (action.type) {
            case 'weapon':
                effects.push(...this.processWeaponAction(action, attacker, target, currentFloor));
                break;
            case 'ability':
                effects.push(...this.processAbilityAction(action, attacker, target, currentFloor));
                break;
            case 'spell':
                effects.push(...this.processSpellAction(action, attacker, target, currentFloor));
                break;
        }

        return effects;
    }

    /**
     * Process weapon action and return damage/effects
     */
    static processWeaponAction(action, attacker, target, currentFloor) {
        const effects = [];
        const weaponData = weaponsData.find(w => w.id === action.value);
        
        // Debug logging
        logger.info(`[WEAPON_DEBUG] Processing weapon action: ${action.value}, found weapon: ${weaponData ? weaponData.name : 'NOT FOUND'}`);
        
        if (weaponData) {
            let damage = this.calculateWeaponDamage(weaponData, currentFloor);
            
            // Debug logging
            logger.info(`[WEAPON_DEBUG] Weapon ${weaponData.name} base damage: ${weaponData.damage}, calculated damage: ${damage}, floor: ${currentFloor}`);
            
            // Apply crit chance
            const critRoll = Math.random() * 100;
            const critChance = attacker.critChance || 0;
            
            if (critRoll < critChance) {
                damage *= 2;
                effects.push({
                    type: 'critical_hit',
                    attacker: attacker,
                    weapon: weaponData.name || action.value
                });
            }

            effects.push({
                type: 'damage',
                amount: damage,
                source: 'weapon',
                weaponId: action.value,
                weaponType: weaponData.weaponType || 'melee', // Add weapon type for counter checking
                attacker: attacker,
                target: target
            });

            // Apply weapon health cost (for weapons like body_boulder)
            if (weaponData.healthCost && weaponData.healthCost > 0) {
                effects.push({
                    type: 'self_damage',
                    amount: weaponData.healthCost,
                    attacker: attacker,
                    source: 'weapon_health_cost'
                });
            }

            // Apply weapon effects
            if (weaponData.effects && weaponData.effects.length > 0) {
                weaponData.effects.forEach(effectId => {
                    const effectData = effects[effectId];
                    if (effectData) {
                        effects.push({
                            type: 'status_effect',
                            effect: effectData,
                            attacker: attacker,
                            target: target
                        });
                    }
                });
            }
        } else {
            // Fallback basic attack
            logger.warn(`[WEAPON_DEBUG] Weapon not found: ${action.value}, using fallback attack`);
            effects.push({
                type: 'damage',
                amount: 1,
                source: 'weapon',
                weaponType: 'melee', // Basic attacks are melee
                attacker: attacker,
                target: target
            });
        }

        return effects;
    }

    /**
     * Process ability action and return effects
     */
    static processAbilityAction(action, attacker, target, currentFloor) {
        const effects = [];
        const ability = abilitiesData.find(a => a.id === action.value);
        
        if (ability) {
            // Add mana cost
            if (ability.manaCost > 0) {
                effects.push({
                    type: 'mana_cost',
                    amount: ability.manaCost,
                    attacker: attacker
                });
            }

            // Handle defensive abilities (Counter, Silence, Dodge) - these create defensive effects
            if (action.value === 'counter' || action.value === 'silence' || action.value === 'dodge') {
                effects.push({
                    type: 'defensive_ability',
                    source: 'ability',
                    abilityId: action.value,
                    attacker: attacker
                });
            } else if (action.value === 'accepting_fate') {
                // Accepting Fate is a special death-prevention ability
                effects.push({
                    type: 'death_prevention',
                    source: 'ability',
                    abilityId: action.value,
                    attacker: attacker,
                    healthRestore: 4,
                    manaRestore: 4
                });
            } else {
                // Use the existing calculateAbilityEffect function for other abilities
                const abilityEffects = calculateAbilityEffect(ability, target, attacker);
                
                // Add self-damage for certain abilities
                if (this.isSelfDamageAbility(ability.id)) {
                    const selfDamage = this.getSelfDamageAmount(ability.id);
                    effects.push({
                        type: 'self_damage',
                        amount: selfDamage,
                        attacker: attacker
                    });
                }

                // Convert ability effects to our format
                abilityEffects.forEach(effect => {
                    effects.push({
                        ...effect,
                        source: 'ability',
                        abilityId: action.value,
                        attacker: attacker
                    });
                });
            }

        } else {
            logger.warn(`Unknown ability: ${action.value}`);
        }

        return effects;
    }

    /**
     * Process spell action and return effects
     */
    static processSpellAction(action, attacker, target, currentFloor) {
        const effects = [];
        
        // Spell definitions based on RULES.txt
        const spellData = {
            // Common Spells
            'heal': { 
                damage: 0, 
                manaCost: 1, 
                healing: 2, 
                rarity: 'common',
                description: 'Heals 2 health'
            },
            
            // Uncommon Spells
            'ancient_curse': { 
                damage: 2, 
                manaCost: 2, 
                rarity: 'uncommon',
                effects: [{ type: 'decay', chance: 30 }],
                description: '30% chance of decay'
            },
            'frost_touch': { 
                damage: 2, 
                manaCost: 2, 
                rarity: 'uncommon',
                effects: [{ type: 'frozen', chance: 100 }],
                description: 'Freezes enemy'
            },
            'blizzard': { 
                damage: 2, 
                manaCost: 4, 
                rarity: 'uncommon',
                effects: [{ type: 'frozen', chance: 100 }],
                description: 'Freezes enemy'
            },
            
            // Rare Spells
            'soul_drain': { 
                damage: 3, 
                manaCost: 2, 
                rarity: 'rare',
                effects: [{ type: 'health_drain', chance: 50 }],
                description: '50% chance of health drain'
            },
            'death_bolt': { 
                damage: 3, 
                manaCost: 2, 
                rarity: 'rare',
                description: 'Pure damage spell'
            },
            'war_cry': { 
                damage: 3, 
                manaCost: 2, 
                rarity: 'rare',
                effects: [{ type: 'enraged', chance: 100 }],
                description: 'Enrages caster'
            },
            'wyverns_breath': { 
                damage: 3, 
                manaCost: 3, 
                rarity: 'rare',
                effects: [{ type: 'burning', chance: 100 }],
                description: 'Burning effect'
            },
            'ground_stomp': { 
                damage: 3, 
                manaCost: 3, 
                rarity: 'rare',
                effects: [{ type: 'stunned', chance: 50 }],
                description: '50% chance to stun'
            },
            'rage': { 
                damage: 3, 
                manaCost: 2, 
                rarity: 'rare',
                effects: [{ type: 'enraged', chance: 100 }],
                description: 'Enrages caster'
            },
            
            // Epic Spells
            'firestorm': { 
                damage: 4, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'burning', chance: 100 }],
                description: 'Burns enemy'
            },
            'healing_rain': { 
                damage: 0, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'healing_rain', chance: 100 }],
                description: 'Healing rain effect'
            },
            'mana_rain': { 
                damage: 0, 
                manaCost: 0, 
                rarity: 'epic',
                effects: [{ type: 'mana_rain', chance: 100 }],
                description: 'Single use mana rain effect'
            },
            'sacrificial_unholiness': { 
                damage: 3, 
                manaCost: 0, 
                healthCost: 3, 
                rarity: 'epic',
                description: 'Deals 3 damage to both caster and target'
            },
            'soul_harvest': { 
                damage: 4, 
                manaCost: 3, 
                rarity: 'epic',
                effects: [{ type: 'health_drain', chance: 60 }],
                description: '60% chance of health drain'
            },
            'rising_flames': { 
                damage: 4, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'burning', chance: 60 }],
                description: '60% chance to burn'
            },
            'lightning_strike': { 
                damage: 4, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'paralyzed', chance: 70 }],
                description: '70% chance to paralyze'
            },
            'death_ray': { 
                damage: 5, 
                manaCost: 5, 
                rarity: 'epic',
                description: 'Pure damage spell'
            },
            'mind_blast': { 
                damage: 4, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'stunned', chance: 60 }],
                description: '60% chance to stun'
            },
            'poison_cloud': { 
                damage: 4, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'poison', chance: 100 }],
                description: 'Poisons enemy'
            },
            'acid_breath': { 
                damage: 4, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'poison', chance: 60 }],
                description: '60% chance to poison'
            },
            'regeneration': { 
                damage: 0, 
                manaCost: 3, 
                rarity: 'epic',
                effects: [{ type: 'regeneration', chance: 100 }],
                description: 'Healing effect'
            },
            'stone_gaze': { 
                damage: 5, 
                manaCost: 5, 
                rarity: 'epic',
                effects: [{ type: 'petrified', chance: 40 }],
                description: '40% chance to petrify'
            },
            'petrifying_scream': { 
                damage: 4, 
                manaCost: 4, 
                rarity: 'epic',
                effects: [{ type: 'petrified', chance: 70 }],
                description: '70% chance to petrify'
            },
            
            // Legendary Spells
            'black_dragons_breath': { 
                damage: 5, 
                manaCost: 10, 
                rarity: 'legendary',
                effects: [{ type: 'burning', chance: 100 }],
                description: 'Burns enemy'
            },
            'infernal_breath': { 
                damage: 5, 
                manaCost: 7, 
                rarity: 'legendary',
                effects: [{ type: 'burning', chance: 80 }],
                description: '80% chance to burn'
            },
            'whirlpool': { 
                damage: 5, 
                manaCost: 7, 
                rarity: 'legendary',
                effects: [{ type: 'paralyzed', chance: 40 }],
                description: '40% chance to paralyze'
            },
            'ancient_flame': { 
                damage: 5, 
                manaCost: 8, 
                rarity: 'legendary',
                effects: [{ type: 'burning', chance: 70 }],
                description: '70% chance to burn'
            },
            'dragons_roar': { 
                damage: 5, 
                manaCost: 7, 
                rarity: 'legendary',
                effects: [{ type: 'burning', chance: 60 }],
                description: '60% chance to burn'
            },
            'fire_breath': { 
                damage: 5, 
                manaCost: 8, 
                rarity: 'legendary',
                effects: [{ type: 'burning', chance: 70 }],
                description: '70% chance to burn'
            },
            'inferno': { 
                damage: 8, 
                manaCost: 9, 
                rarity: 'legendary',
                effects: [{ type: 'burning', chance: 80 }],
                description: 'Deals 8 damage with 80% chance to burn'
            },
            'meteor_strike': { 
                damage: 10, 
                manaCost: 10, 
                rarity: 'legendary',
                description: 'Deals 10 damage to all enemies'
            }
        };
        
        const spell = spellData[action.value];
        
        if (spell) {
            // Add mana cost
            if (spell.manaCost > 0) {
                effects.push({
                    type: 'mana_cost',
                    amount: spell.manaCost,
                    attacker: attacker
                });
            }
            
            // Add health cost for spells like sacrificial_unholiness
            if (spell.healthCost > 0) {
                effects.push({
                    type: 'self_damage',
                    amount: spell.healthCost,
                    attacker: attacker,
                    source: 'spell_health_cost'
                });
            }
            
            // Add damage
            if (spell.damage > 0) {
                effects.push({
                    type: 'damage',
                    amount: spell.damage,
                    source: 'spell',
                    spellId: action.value,
                    attacker: attacker,
                    target: target
                });
            }
            
            // Add healing
            if (spell.healing > 0) {
                effects.push({
                    type: 'healing',
                    amount: spell.healing,
                    source: 'spell',
                    spellId: action.value,
                    attacker: attacker,
                    target: attacker // Healing spells target the caster
                });
            }
            
            // Add status effects
            if (spell.effects && spell.effects.length > 0) {
                spell.effects.forEach(effectData => {
                    // Roll for effect chance
                    const roll = Math.random() * 100;
                    if (roll < effectData.chance) {
                        const statusEffect = effects[effectData.type];
                        if (statusEffect) {
                            effects.push({
                                type: 'status_effect',
                                effect: statusEffect,
                                attacker: attacker,
                                target: target
                            });
                        }
                    }
                });
            }
            
            logger.info(`[SPELL_DEBUG] Processed spell ${action.value}: damage=${spell.damage}, manaCost=${spell.manaCost}, effects=${spell.effects ? spell.effects.length : 0}`);
        } else {
            // Fallback for unknown spells
            logger.warn(`[SPELL_DEBUG] Unknown spell: ${action.value}, using fallback`);
            effects.push({
                type: 'damage',
                amount: 2,
                source: 'spell',
                spellId: action.value,
                attacker: attacker,
                target: target
            });
        }

        return effects;
    }

    /**
     * Apply simultaneous effects with counters and negations
     */
    static applySimultaneousEffects(result, playerEffects, monsterEffects, gameState) {
        // Check for counter abilities that negate damage
        const playerCounters = this.getCounterEffects(playerEffects);
        const monsterCounters = this.getCounterEffects(monsterEffects);

        // Apply player effects to monster
        playerEffects.forEach(effect => {
            if (effect.type === 'damage') {
                const isNegated = this.isEffectNegated(effect, monsterCounters);
                
                // Debug logging
                logger.info(`[DAMAGE_DEBUG] Player damage effect: amount=${effect.amount}, source=${effect.source}, weaponType=${effect.weaponType}, weaponId=${effect.weaponId}, negated=${isNegated}`);
                
                if (!isNegated) {
                    let damage = effect.amount;
                    
                    // Apply armor reduction
                    const armor = gameState.battle.currentMonster.armor || 0;
                    if (!effect.ignoreArmor) {
                        damage = Math.max(0, damage - armor);
                    }
                    
                    logger.info(`[DAMAGE_DEBUG] Final damage to monster: ${damage} (after armor reduction from ${armor})`);
                    result.monsterDamage += damage;
                } else {
                    logger.info(`[DAMAGE_DEBUG] Player attack was negated by monster counter ability`);
                }
            } else if (effect.type === 'mana_cost') {
                result.playerManaCost += effect.amount;
            } else if (effect.type === 'self_damage') {
                result.playerDamage += effect.amount;
            } else if (effect.type === 'healing') {
                result.playerHealing += effect.amount;
            } else if (effect.type === 'critical_hit') {
                result.criticalHits.push(`${effect.attacker.name || 'Player'} scored a critical hit with ${effect.weapon}!`);
            }
        });

        // Apply monster effects to player
        monsterEffects.forEach(effect => {
            if (effect.type === 'damage') {
                const isNegated = this.isEffectNegated(effect, playerCounters);
                
                // Debug logging
                logger.info(`[DAMAGE_DEBUG] Monster damage effect: amount=${effect.amount}, source=${effect.source}, weaponType=${effect.weaponType}, weaponId=${effect.weaponId}, negated=${isNegated}`);
                
                if (!isNegated) {
                    let damage = effect.amount;
                    
                    // Apply armor reduction
                    const armor = gameState.player.currentArmor || gameState.player.armor || 0;
                    if (!effect.ignoreArmor) {
                        damage = Math.max(0, damage - armor);
                    }
                    
                    result.playerDamage += damage;
                } else {
                    logger.info(`[DAMAGE_DEBUG] Monster attack was negated by player counter ability`);
                }
            } else if (effect.type === 'mana_cost') {
                result.monsterManaCost += effect.amount;
            } else if (effect.type === 'healing') {
                result.monsterHealing += effect.amount;
            } else if (effect.type === 'critical_hit') {
                result.criticalHits.push(`${effect.attacker.name || 'Monster'} scored a critical hit with ${effect.weapon}!`);
            }
        });

        // Apply counter damage and messages
        playerCounters.forEach(counter => {
            if (counter.counterDamage > 0) {
                result.monsterDamage += counter.counterDamage;
                const abilityName = counter.type === 'silence' ? 'Silence' : 
                                   counter.type === 'counter' ? 'Counter' : 
                                   counter.type === 'dodge' ? 'Dodge' : 'Counter';
                result.messages.push(`${gameState.player.hero.name} used ${abilityName} and dealt ${counter.counterDamage} damage!`);
            } else if (counter.type === 'dodge') {
                // Dodge healing: 2 vs melee, 3 vs ranged
                const dodgeHealing = this.calculateDodgeHealing(counter, monsterEffects);
                result.playerHealing += dodgeHealing;
                result.messages.push(`${gameState.player.hero.name} used Dodge and healed ${dodgeHealing} health!`);
            }
        });

        monsterCounters.forEach(counter => {
            if (counter.counterDamage > 0) {
                result.playerDamage += counter.counterDamage;
                const abilityName = counter.type === 'silence' ? 'Silence' : 
                                   counter.type === 'counter' ? 'Counter' : 
                                   counter.type === 'dodge' ? 'Dodge' : 'Counter';
                result.messages.push(`${gameState.battle.currentMonster.name} used ${abilityName} and dealt ${counter.counterDamage} damage!`);
            } else if (counter.type === 'dodge') {
                // Dodge healing: 2 vs melee, 3 vs ranged
                const dodgeHealing = this.calculateDodgeHealing(counter, playerEffects);
                result.monsterHealing += dodgeHealing;
                result.messages.push(`${gameState.battle.currentMonster.name} used Dodge and healed ${dodgeHealing} health!`);
            }
        });
    }

    /**
     * Get counter effects from action effects
     */
    static getCounterEffects(effects) {
        const counters = [];
        
        // Debug logging
        logger.info(`[COUNTER_DEBUG] Checking effects for counter abilities: ${JSON.stringify(effects.map(e => ({ type: e.type, abilityId: e.abilityId, source: e.source })))}`);
        
        effects.forEach(effect => {
            if (effect.type === 'defensive_ability' && effect.abilityId === 'counter') {
                logger.info(`[COUNTER_DEBUG] Found Counter ability, adding counter effect`);
                counters.push({
                    type: 'counter',
                    negates: ['weapon'], // Counter negates ALL weapon attacks (physical)
                    counterDamage: 2
                });
            } else if (effect.type === 'defensive_ability' && effect.abilityId === 'silence') {
                logger.info(`[COUNTER_DEBUG] Found Silence ability, adding silence effect`);
                counters.push({
                    type: 'silence',
                    negates: ['spell'], // Silence only negates magic spells that consume mana
                    counterDamage: 3
                });
            } else if (effect.type === 'defensive_ability' && effect.abilityId === 'dodge') {
                logger.info(`[COUNTER_DEBUG] Found Dodge ability, adding dodge effect`);
                counters.push({
                    type: 'dodge',
                    negates: ['weapon'], // Dodge negates ALL weapon attacks (physical)
                    counterDamage: 0,
                    healing: 2 // Base healing, will be adjusted based on weapon type
                });
            }
        });

        logger.info(`[COUNTER_DEBUG] Generated ${counters.length} counter effects: ${JSON.stringify(counters)}`);
        return counters;
    }

    /**
     * Check if an effect is negated by counters
     */
    static isEffectNegated(effect, counters) {
        return counters.some(counter => 
            counter.negates.includes(effect.source)
        );
    }

    /**
     * Check for death prevention abilities and apply them if the target would die
     */
    static checkDeathPrevention(result, playerEffects, monsterEffects, gameState) {
        // Check if player would die from incoming damage
        const playerCurrentHealth = gameState.player.currentHealth;
        const playerTotalDamage = result.playerDamage;
        const playerWouldDie = (playerCurrentHealth - playerTotalDamage) <= 0;

        // Check if monster would die from incoming damage
        const monsterCurrentHealth = gameState.battle.currentMonster.currentHealth || gameState.battle.currentMonster.health;
        const monsterTotalDamage = result.monsterDamage;
        const monsterWouldDie = (monsterCurrentHealth - monsterTotalDamage) <= 0;

        // Check for player death prevention abilities
        if (playerWouldDie) {
            const playerDeathPrevention = playerEffects.find(effect => effect.type === 'death_prevention');
            if (playerDeathPrevention) {
                // Check if this ability has already been used this battle
                if (!gameState.battle.playerDeathPreventionUsed) {
                    // Activate death prevention
                    result.playerDamage = Math.max(0, playerCurrentHealth - 1); // Reduce damage to leave player with 1 HP
                    result.playerHealing += playerDeathPrevention.healthRestore;
                    result.playerManaRestore += playerDeathPrevention.manaRestore;
                    
                    // Mark as used for this battle
                    gameState.battle.playerDeathPreventionUsed = true;
                    
                    result.messages.push(`💀 ${gameState.player.hero.name} was about to die, but Accepting Fate activated!`);
                    result.messages.push(`🕊️ ${gameState.player.hero.name} cheated death and restored ${playerDeathPrevention.healthRestore} health and ${playerDeathPrevention.manaRestore} mana!`);
                    
                    logger.info(`[DEATH_PREVENTION] Player death prevented by Accepting Fate`);
                } else {
                    logger.info(`[DEATH_PREVENTION] Player death prevention already used this battle`);
                }
            }
        }

        // Check for monster death prevention abilities
        if (monsterWouldDie) {
            const monsterDeathPrevention = monsterEffects.find(effect => effect.type === 'death_prevention');
            if (monsterDeathPrevention) {
                // Check if this ability has already been used this battle
                if (!gameState.battle.monsterDeathPreventionUsed) {
                    // Activate death prevention
                    result.monsterDamage = Math.max(0, monsterCurrentHealth - 1); // Reduce damage to leave monster with 1 HP
                    result.monsterHealing += monsterDeathPrevention.healthRestore;
                    result.monsterManaRestore += monsterDeathPrevention.manaRestore;
                    
                    // Mark as used for this battle
                    gameState.battle.monsterDeathPreventionUsed = true;
                    
                    result.messages.push(`💀 ${gameState.battle.currentMonster.name} was about to die, but Accepting Fate activated!`);
                    result.messages.push(`🕊️ ${gameState.battle.currentMonster.name} cheated death and restored ${monsterDeathPrevention.healthRestore} health and ${monsterDeathPrevention.manaRestore} mana!`);
                    
                    logger.info(`[DEATH_PREVENTION] Monster death prevented by Accepting Fate`);
                } else {
                    logger.info(`[DEATH_PREVENTION] Monster death prevention already used this battle`);
                }
            }
        }
    }

    /**
     * Apply new status effects from combat actions
     */
    static applyNewStatusEffects(playerEffects, monsterEffects, gameState) {
        // Apply status effects from player actions to monster
        playerEffects.forEach(effect => {
            if (effect.type === 'status_effect') {
                this.applyStatusEffectToTarget(effect.effect, gameState.battle.currentMonster);
            }
        });

        // Apply status effects from monster actions to player
        monsterEffects.forEach(effect => {
            if (effect.type === 'status_effect') {
                this.applyStatusEffectToTarget(effect.effect, gameState.player);
            }
        });
    }

    /**
     * Apply a status effect to a target
     */
    static applyStatusEffectToTarget(effectData, target) {
        if (!target.effects) {
            target.effects = [];
        }

        // Check if effect already exists
        const existingEffect = target.effects.find(e => e.type === effectData.id);
        
        if (existingEffect) {
            // Effect already exists - handle stacking rules
            if (effectData.stackable) {
                // Stackable effects: add duration and increase power
                existingEffect.duration += effectData.duration;
                existingEffect.power = (existingEffect.power || 1) + (effectData.power || 1);
            } else {
                // Non-stackable effects: use longer duration
                if (effectData.duration > existingEffect.duration) {
                    existingEffect.duration = effectData.duration;
                    existingEffect.power = effectData.power || 1;
                }
            }
        } else {
            // New effect - add to target
            target.effects.push({
                type: effectData.id,
                duration: effectData.duration,
                power: effectData.power || 1,
                appliedAt: Date.now()
            });
        }

        logger.info(`[EFFECT_DEBUG] Applied ${effectData.id} to ${target.name || 'target'} for ${effectData.duration} turns`);
    }

    /**
     * Process existing status effects on both player and monster
     */
    static processStatusEffects(result, gameState) {
        // Initialize effects arrays if they don't exist
        if (!gameState.player.effects) {
            gameState.player.effects = [];
        }
        if (!gameState.battle.currentMonster.effects) {
            gameState.battle.currentMonster.effects = [];
        }

        // Process player status effects and remove expired ones
        if (gameState.player.effects && gameState.player.effects.length > 0) {
            const activeEffects = [];
            
            gameState.player.effects.forEach(effect => {
                const effectResult = this.processStatusEffect(effect, gameState.player);
                if (effectResult) {
                    // Apply damage/healing
                    if (effectResult.type === 'damage') {
                        result.playerDamage += effectResult.amount;
                    } else if (effectResult.type === 'healing') {
                        result.playerHealing += effectResult.amount;
                    }
                    
                    // Apply mana restoration
                    if (effectResult.manaAmount > 0) {
                        result.playerManaRestore = (result.playerManaRestore || 0) + effectResult.manaAmount;
                    }
                    
                    // Handle special effects
                    if (effectResult.specialEffects && effectResult.specialEffects.length > 0) {
                        effectResult.specialEffects.forEach(specialEffect => {
                            this.applySpecialEffect(specialEffect, gameState.player, gameState);
                        });
                    }
                    
                    if (effectResult.message) {
                        result.messages.push(effectResult.message);
                    }
                }
                
                // Keep effect if it still has duration remaining (or is permanent with duration -1)
                if (effect.duration > 0 || effect.duration === -1) {
                    activeEffects.push(effect);
                }
            });
            
            // Update player effects array with only active effects
            gameState.player.effects = activeEffects;
        }

        // Process monster status effects and remove expired ones
        if (gameState.battle.currentMonster.effects && gameState.battle.currentMonster.effects.length > 0) {
            const activeEffects = [];
            
            gameState.battle.currentMonster.effects.forEach(effect => {
                const effectResult = this.processStatusEffect(effect, gameState.battle.currentMonster);
                if (effectResult) {
                    // Apply damage/healing
                    if (effectResult.type === 'damage') {
                        result.monsterDamage += effectResult.amount;
                    } else if (effectResult.type === 'healing') {
                        result.monsterHealing += effectResult.amount;
                    }
                    
                    // Apply mana restoration
                    if (effectResult.manaAmount > 0) {
                        result.monsterManaRestore = (result.monsterManaRestore || 0) + effectResult.manaAmount;
                    }
                    
                    // Handle special effects
                    if (effectResult.specialEffects && effectResult.specialEffects.length > 0) {
                        effectResult.specialEffects.forEach(specialEffect => {
                            this.applySpecialEffect(specialEffect, gameState.battle.currentMonster, gameState);
                        });
                    }
                    
                    if (effectResult.message) {
                        result.messages.push(effectResult.message);
                    }
                }
                
                // Keep effect if it still has duration remaining (or is permanent with duration -1)
                if (effect.duration > 0 || effect.duration === -1) {
                    activeEffects.push(effect);
                }
            });
            
            // Update monster effects array with only active effects
            gameState.battle.currentMonster.effects = activeEffects;
        }
    }

    /**
     * Process a single status effect
     */
    static processStatusEffect(effect, target) {
        const effectData = effects[effect.type];
        if (!effectData) return null;

        const result = {
            type: null,
            amount: 0,
            message: '',
            manaAmount: 0,
            specialEffects: []
        };

        // Apply damage over time effects
        if (effectData.damagePerTurn) {
            let damage = effectData.damagePerTurn;
            
            // Apply effect power multiplier if exists
            if (effect.power && effect.power > 1) {
                damage *= effect.power;
            }
            
            result.type = 'damage';
            result.amount = damage;
            result.message = `${target.name || 'Target'} takes ${damage} damage from ${effectData.name}`;
        }

        // Apply healing over time effects
        if (effectData.healthPerTurn) {
            let healing = effectData.healthPerTurn;
            
            // Apply effect power multiplier if exists
            if (effect.power && effect.power > 1) {
                healing *= effect.power;
            }
            
            result.type = 'healing';
            result.amount = healing;
            result.message = `${target.name || 'Target'} heals ${healing} health from ${effectData.name}`;
        }

        // Apply mana restoration effects
        if (effectData.manaPerTurn) {
            let manaRestore = effectData.manaPerTurn;
            
            // Apply effect power multiplier if exists
            if (effect.power && effect.power > 1) {
                manaRestore *= effect.power;
            }
            
            result.manaAmount = manaRestore;
            if (result.message) {
                result.message += ` and restores ${manaRestore} mana`;
            } else {
                result.message = `${target.name || 'Target'} restores ${manaRestore} mana from ${effectData.name}`;
            }
        }

        // Handle special instant effects
        if (effectData.healthRestore && effectData.duration === 0) {
            // Instant healing effect like Fate Accepted
            result.type = 'healing';
            result.amount = effectData.healthRestore;
            result.message = `${target.name || 'Target'} is instantly healed for ${effectData.healthRestore} health by ${effectData.name}`;
            
            if (effectData.manaRestore) {
                result.manaAmount = effectData.manaRestore;
                result.message += ` and ${effectData.manaRestore} mana`;
            }
        }

        // Handle special ongoing effects that modify combat behavior
        if (effectData.damageMultiplier && effectData.damageMultiplier !== 1.0) {
            result.specialEffects.push({
                type: 'damage_modifier',
                multiplier: effectData.damageMultiplier,
                description: `${effectData.name} modifies damage output`
            });
        }

        if (effectData.damageVulnerability && effectData.damageVulnerability !== 1.0) {
            result.specialEffects.push({
                type: 'damage_vulnerability',
                multiplier: effectData.damageVulnerability,
                description: `${effectData.name} modifies damage taken`
            });
        }

        if (effectData.armorReduction && effectData.armorReduction > 0) {
            result.specialEffects.push({
                type: 'armor_reduction',
                amount: effectData.armorReduction,
                description: `${effectData.name} reduces armor effectiveness`
            });
        }

        if (effectData.critBonus && effectData.critBonus > 0) {
            result.specialEffects.push({
                type: 'crit_bonus',
                amount: effectData.critBonus,
                description: `${effectData.name} increases critical hit chance`
            });
        }

        // Handle disabling effects
        if (effectData.disableWeapons || effectData.disableMagic || effectData.disableAllActions || effectData.disablePrimaryWeapon) {
            result.specialEffects.push({
                type: 'disable_actions',
                disableWeapons: effectData.disableWeapons,
                disableMagic: effectData.disableMagic,
                disableAllActions: effectData.disableAllActions,
                disablePrimaryWeapon: effectData.disablePrimaryWeapon,
                description: `${effectData.name} restricts available actions`
            });
        }

        // Handle special status effects
        if (effectData.untargetable) {
            result.specialEffects.push({
                type: 'untargetable',
                description: `${effectData.name} makes target untargetable`
            });
        }

        if (effectData.effectImmunity) {
            result.specialEffects.push({
                type: 'effect_immunity',
                description: `${effectData.name} provides immunity to new effects`
            });
        }

        if (effectData.damageReduction && effectData.damageReduction > 0) {
            result.specialEffects.push({
                type: 'damage_reduction',
                amount: effectData.damageReduction,
                description: `${effectData.name} reduces incoming damage`
            });
        }

        // Decrease effect duration (skip for permanent effects with duration -1)
        if (effect.duration > 0) {
            effect.duration--;
            if (effect.duration <= 0) {
                result.message += ` (${effectData.name} effect ends)`;
                
                // Handle special end-of-effect actions
                if (effectData.id === 'petrified' && effectData.healthMultiplier === 2) {
                    // Petrified effect ends - halve health
                    result.specialEffects.push({
                        type: 'health_halve',
                        description: 'Petrification ends, health returns to normal'
                    });
                }
            }
        } else if (effect.duration === -1) {
            // Permanent effect - no duration decrease
            if (result.message && !result.message.includes('(permanent)')) {
                result.message += ' (permanent)';
            }
        }

        return result;
    }

    /**
     * Clear combat modifiers at the start of each turn
     */
    static clearCombatModifiers(target) {
        if (target.combatModifiers) {
            target.combatModifiers = {};
        }
    }

    /**
     * Apply special effects that modify combat behavior
     */
    static applySpecialEffect(specialEffect, target, gameState) {
        switch (specialEffect.type) {
            case 'health_halve':
                // Petrification ending - halve current health
                if (target.currentHealth) {
                    target.currentHealth = Math.ceil(target.currentHealth / 2);
                    logger.info(`[EFFECT_DEBUG] ${target.name || 'Target'} health halved due to petrification ending`);
                }
                break;
                
            case 'damage_modifier':
                // Store damage modifier for use in combat calculations
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.damageMultiplier = specialEffect.multiplier;
                break;
                
            case 'damage_vulnerability':
                // Store damage vulnerability for use in combat calculations
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.damageVulnerability = specialEffect.multiplier;
                break;
                
            case 'armor_reduction':
                // Store armor reduction for use in combat calculations
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.armorReduction = specialEffect.amount;
                break;
                
            case 'crit_bonus':
                // Store crit bonus for use in combat calculations
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.critBonus = specialEffect.amount;
                break;
                
            case 'damage_reduction':
                // Store damage reduction for use in combat calculations
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.damageReduction = specialEffect.amount;
                break;
                
            case 'disable_actions':
                // Store action restrictions for use in battle UI
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.disableWeapons = specialEffect.disableWeapons;
                target.combatModifiers.disableMagic = specialEffect.disableMagic;
                target.combatModifiers.disableAllActions = specialEffect.disableAllActions;
                target.combatModifiers.disablePrimaryWeapon = specialEffect.disablePrimaryWeapon;
                break;
                
            case 'untargetable':
                // Store untargetable status
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.untargetable = true;
                break;
                
            case 'effect_immunity':
                // Store effect immunity status
                if (!target.combatModifiers) target.combatModifiers = {};
                target.combatModifiers.effectImmunity = true;
                break;
                
            default:
                logger.warn(`[EFFECT_DEBUG] Unknown special effect type: ${specialEffect.type}`);
                break;
        }
    }

    /**
     * Calculate weapon damage with floor scaling
     * Capped at floor 500 for balanced progression
     */
    static calculateWeaponDamage(weapon, currentFloor) {
        const baseDamage = weapon.damage || 1;
        return calculateWeaponDamageScaling(baseDamage, currentFloor);
    }

    /**
     * Calculate dodge healing based on weapon type
     * 2 health vs melee, 3 health vs ranged
     */
    static calculateDodgeHealing(counter, opponentEffects) {
        // Find the weapon effect that was dodged
        const weaponEffect = opponentEffects.find(effect => 
            effect.type === 'damage' && effect.source === 'weapon'
        );
        
        if (weaponEffect && weaponEffect.weaponType === 'ranged') {
            return 3; // Heal 3 vs ranged attacks
        } else {
            return 2; // Heal 2 vs melee attacks (default)
        }
    }

    /**
     * Check if ability causes self-damage
     */
    static isSelfDamageAbility(abilityId) {
        const selfDamageAbilities = [
            'body_boulder',
            'sacrificial_unholiness',
            'blood_magic',
            'demonic_pact',
            'soul_burn'
        ];
        return selfDamageAbilities.includes(abilityId);
    }

    /**
     * Get self-damage amount for ability
     */
    static getSelfDamageAmount(abilityId) {
        const selfDamageAmounts = {
            'body_boulder': 2,
            'sacrificial_unholiness': 3,
            'blood_magic': 1,
            'demonic_pact': 2,
            'soul_burn': 2
        };
        return selfDamageAmounts[abilityId] || 0;
    }

    /**
     * Scale monster stats for floor progression
     * Capped at floor 500 for balanced progression
     */
    static scaleMonsterForFloor(baseMonster, currentFloor) {
        const scalingFactor = calculateMonsterScalingFactor(currentFloor);
        
        if (scalingFactor === 1.0) {
            return { ...baseMonster };
        }

        const scaledMonster = { ...baseMonster };

        scaledMonster.health = Math.ceil(baseMonster.health * scalingFactor);
        scaledMonster.mana = Math.ceil(baseMonster.mana * scalingFactor);
        scaledMonster.armor = Math.ceil(baseMonster.armor * scalingFactor);
        scaledMonster.currentHealth = scaledMonster.health;
        scaledMonster.currentMana = scaledMonster.mana;

        return scaledMonster;
    }
} 