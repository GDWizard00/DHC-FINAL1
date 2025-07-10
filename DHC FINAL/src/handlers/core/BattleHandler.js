import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { monstersData, getMonsterForFloor } from '../../data/monstersData.js';
import { abilitiesData } from '../../data/abilitiesData.js';
import { weaponsData } from '../../data/weaponsData.js';

/**
 * BattleHandler - Handles turn-based simultaneous combat system
 * Manages floor boss battles, exploration encounters, victory/death outcomes
 */
export class BattleHandler {
    
    /**
     * Start floor boss battle
     */
    static async startFloorBossBattle(interaction, gameState, floor) {
        try {
            // Get the specific monster for this floor
            const floorMonster = getMonsterForFloor(floor);
            
            if (!floorMonster) {
                throw new Error(`No monster found for floor ${floor}`);
            }

            // Scale monster for looping floors (after floor 20)
            const scaledMonster = this.scaleMonsterForFloor(floorMonster, floor);
            
            // Initialize battle state
            gameState.battle = {
                active: true,
                currentMonster: scaledMonster,
                battleType: 'floor_boss',
                turnNumber: 1,
                playerLastAction: null,
                monsterLastAction: null,
                playerEffects: [],
                monsterEffects: []
            };

            // Set current screen to battle
            gameState.currentScreen = 'battle';
            gameState.updateActivity();

            await this.showBattleScreen(interaction, gameState);

            logger.info(`User ${gameState.session.userId} started floor ${floor} boss battle with ${scaledMonster.name}`);

        } catch (error) {
            logger.error('Error starting floor boss battle:', error);
            throw error;
        }
    }

    /**
     * Start exploration encounter battle
     */
    static async startExploreBattle(interaction, gameState, monster, battleType) {
        try {
            // Initialize battle state
            gameState.battle = {
                active: true,
                currentMonster: monster,
                battleType: battleType,
                turnNumber: 1,
                playerLastAction: null,
                monsterLastAction: null,
                playerEffects: [],
                monsterEffects: []
            };

            // Set current screen to battle
            gameState.currentScreen = 'battle';
            gameState.updateActivity();

            await this.showBattleScreen(interaction, gameState);

            logger.info(`User ${gameState.session.userId} started ${battleType} battle with ${monster.name}`);

        } catch (error) {
            logger.error('Error starting exploration battle:', error);
            throw error;
        }
    }

    /**
     * Show the main battle screen
     */
    static async showBattleScreen(interaction, gameState) {
        try {
            // Check if interaction has already been acknowledged
            if (interaction.replied || interaction.deferred) {
                logger.warn('Interaction already acknowledged, skipping battle screen display');
                return;
            }

            const playerHero = gameState.player.hero;
            const monster = gameState.battle.currentMonster;
            const turnNumber = gameState.battle.turnNumber;
            const currentFloor = gameState.progress.currentFloor || 1;

            // Build battle status description
            let battleDescription = `**Floor ${currentFloor}** - **Turn ${turnNumber}** - Choose your action!\n\n`;
            
            // Hero status
            battleDescription += `**${playerHero.name}** ${this.getHealthBar(gameState.player.currentHealth, playerHero.health)}\n`;
            battleDescription += `❤️ Health: ${gameState.player.currentHealth}/${playerHero.health}\n`;
            battleDescription += `💙 Mana: ${gameState.player.currentMana}/${playerHero.mana}\n`;
            battleDescription += `🛡️ Armor: ${gameState.player.armor || 0}\n`;
            
            // Player's equipped weapons
            if (playerHero.weapons && playerHero.weapons.length > 0) {
                battleDescription += `⚔️ Weapons: ${playerHero.weapons.map(w => w.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')}\n`;
            }
            
            // Player effects
            if (gameState.player.effects && gameState.player.effects.length > 0) {
                battleDescription += `🌟 Effects: ${gameState.player.effects.map(e => e.type).join(', ')}\n`;
            }
            
            battleDescription += `\n**VS**\n\n`;
            
            // Monster status
            battleDescription += `**${monster.name}** ${this.getHealthBar(monster.currentHealth || monster.health, monster.health)}\n`;
            battleDescription += `❤️ Health: ${monster.currentHealth || monster.health}/${monster.health}\n`;
            battleDescription += `💙 Mana: ${monster.currentMana || monster.mana}/${monster.mana}\n`;
            battleDescription += `🛡️ Armor: ${monster.armor || 0}\n`;
            
            // Monster's primary weapon
            if (monster.weapons && monster.weapons.length > 0) {
                const primaryWeapon = monster.weapons[0];
                battleDescription += `⚔️ Primary Weapon: ${primaryWeapon.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                
                // Secondary weapon if available
                if (monster.weapons.length > 1) {
                    const secondaryWeapon = monster.weapons[1];
                    battleDescription += `🗡️ Secondary Weapon: ${secondaryWeapon.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                }
            }
            
            // Monster effects
            if (monster.effects && monster.effects.length > 0) {
                battleDescription += `🌟 Effects: ${monster.effects.map(e => e.type).join(', ')}\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **BATTLE** ⚔️')
                .setDescription(battleDescription)
                .setImage(monster.imageUrl || 'https://media.discordapp.net/attachments/1351696887165616169/1351697027209367562/Screenshot_2025-03-19_092009.png')
                .setColor(0xFF0000)
                .setFooter({ text: 'Choose your action - both fighters will act simultaneously!' })
                .setTimestamp();

            // Create battle action options
            const options = [];

            // Hero weapons
            if (playerHero.weapons && playerHero.weapons.length > 0) {
                playerHero.weapons.forEach(weaponId => {
                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`⚔️ ${weaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
                            .setDescription('Use your weapon to attack')
                            .setValue(`weapon_${weaponId}`)
                    );
                });
            }

            // Hero abilities
            if (playerHero.abilities && playerHero.abilities.length > 0) {
                playerHero.abilities.forEach(abilityId => {
                    const ability = abilitiesData.find(a => a.id === abilityId);
                    if (ability) {
                        const canUse = gameState.player.currentMana >= (ability.manaCost || 0);
                        if (canUse) {
                            options.push(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`✨ ${ability.name}`)
                                    .setDescription(`${ability.description.substring(0, 97)}...`)
                                    .setValue(`ability_${abilityId}`)
                            );
                        }
                    }
                });
            }

            // Inventory access
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎒 Inventory')
                    .setDescription('Use items or change equipment')
                    .setValue('inventory')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('battle_actions')
                .setPlaceholder('Choose your battle action...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing battle screen:', error);
            throw error;
        }
    }

    /**
     * Handle battle action selections
     */
    static async handleBattleAction(interaction, gameState, selectedValue) {
        try {
            // Check if interaction has already been acknowledged
            if (interaction.replied || interaction.deferred) {
                logger.warn('Interaction already acknowledged, skipping battle action handling');
                return;
            }

            // Handle continue_battle specifically
            if (selectedValue === 'continue_battle') {
                // Show battle screen again for next turn
                await this.showBattleScreen(interaction, gameState);
                return;
            }

            // Parse action
            let actionType = '';
            let actionValue = '';
            
            if (selectedValue.startsWith('weapon_')) {
                actionType = 'weapon';
                actionValue = selectedValue.replace('weapon_', '');
            } else if (selectedValue.startsWith('ability_')) {
                actionType = 'ability';
                actionValue = selectedValue.replace('ability_', '');
            } else if (selectedValue === 'inventory') {
                await this.handleBattleInventory(interaction, gameState);
                return;
            } else {
                logger.warn(`Unknown battle action: ${selectedValue}`);
                await interaction.update({
                    content: '❌ Unknown battle action. Please try again.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Store player action
            gameState.battle.playerLastAction = {
                type: actionType,
                value: actionValue
            };

            // Execute combat turn
            await this.executeCombatTurn(interaction, gameState);

        } catch (error) {
            logger.error('Error handling battle action:', error);
            throw error;
        }
    }

    /**
     * Execute simultaneous combat turn
     */
    static async executeCombatTurn(interaction, gameState) {
        try {
            const playerAction = gameState.battle.playerLastAction;
            const monster = gameState.battle.currentMonster;
            
            // Select monster action
            const monsterAction = this.selectMonsterAction(monster);
            gameState.battle.monsterLastAction = monsterAction;

            // Calculate combat outcome
            const combatResult = this.calculateCombatOutcome(gameState, playerAction, monsterAction);

            // Apply results
            gameState.player.currentHealth = Math.max(0, gameState.player.currentHealth - combatResult.playerDamage);
            gameState.player.currentMana = Math.max(0, gameState.player.currentMana - combatResult.playerManaCost);
            
            if (!monster.currentHealth) monster.currentHealth = monster.health;
            if (!monster.currentMana) monster.currentMana = monster.mana;
            
            monster.currentHealth = Math.max(0, monster.currentHealth - combatResult.monsterDamage);
            monster.currentMana = Math.max(0, monster.currentMana - combatResult.monsterManaCost);

            // Check for battle end
            if (gameState.player.currentHealth <= 0) {
                await this.handlePlayerDeath(interaction, gameState);
                return;
            }
            
            if (monster.currentHealth <= 0) {
                await this.handleMonsterDeath(interaction, gameState);
                return;
            }

            // Show turn results and continue battle
            gameState.battle.turnNumber++;
            await this.showTurnResult(interaction, gameState, combatResult);

        } catch (error) {
            logger.error('Error executing combat turn:', error);
            throw error;
        }
    }

    /**
     * Show turn results
     */
    static async showTurnResult(interaction, gameState, combatResult) {
        try {
            // Check if interaction has already been acknowledged
            if (interaction.replied || interaction.deferred) {
                logger.warn('Interaction already acknowledged, skipping turn result display');
                return;
            }

            const playerAction = gameState.battle.playerLastAction;
            const monsterAction = gameState.battle.monsterLastAction;

            let resultText = `**Turn ${gameState.battle.turnNumber - 1} Results:**\n\n`;
            
            // Player action result
            resultText += `**${gameState.player.hero.name}** used ${playerAction.type} ${playerAction.value}\n`;
            if (combatResult.monsterDamage > 0) {
                resultText += `Dealt ${combatResult.monsterDamage} damage to ${gameState.battle.currentMonster.name}\n`;
            }
            if (combatResult.playerDamage > 0) {
                resultText += `Took ${combatResult.playerDamage} damage\n`;
            }
            
            resultText += `\n**${gameState.battle.currentMonster.name}** used ${monsterAction.type} ${monsterAction.value}\n`;
            if (combatResult.playerDamage > 0) {
                resultText += `Dealt ${combatResult.playerDamage} damage to ${gameState.player.hero.name}\n`;
            }
            if (combatResult.monsterDamage > 0) {
                resultText += `Took ${combatResult.monsterDamage} damage\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **TURN RESULT** ⚔️')
                .setDescription(resultText)
                .setColor(0xFFFF00)
                .setFooter({ text: 'Battle continues...' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('battle_actions')
                .setPlaceholder('Continue the battle...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Continue Battle')
                        .setDescription('Next turn')
                        .setValue('continue_battle')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing turn result:', error);
            throw error;
        }
    }

    /**
     * Calculate combat outcome for simultaneous combat
     */
    static calculateCombatOutcome(gameState, playerAction, monsterAction) {
        let playerDamage = 0;
        let monsterDamage = 0;
        let playerManaCost = 0;
        let monsterManaCost = 0;

        // Calculate player damage to monster
        if (playerAction.type === 'weapon') {
            // Look up weapon data from weaponsData
            const weaponData = weaponsData.find(w => w.id === playerAction.value);
            if (weaponData) {
                monsterDamage = weaponData.damage || 1;
                // Apply weapon effects if any
                if (weaponData.effects && weaponData.effects.length > 0) {
                    // TODO: Apply weapon effects to monster
                }
            } else {
                // Fallback to base damage
                monsterDamage = 1;
            }
        } else if (playerAction.type === 'ability') {
            const ability = abilitiesData.find(a => a.id === playerAction.value);
            if (ability) {
                monsterDamage = ability.damage || 1;
                playerManaCost = ability.manaCost || 0;
                // TODO: Apply ability effects
            }
        }

        // Calculate monster damage to player
        if (monsterAction.type === 'weapon') {
            // Look up weapon data for monster weapons
            const weaponData = weaponsData.find(w => w.id === monsterAction.value);
            if (weaponData) {
                playerDamage = weaponData.damage || 1;
                // Apply weapon effects if any
                if (weaponData.effects && weaponData.effects.length > 0) {
                    // TODO: Apply weapon effects to player
                }
            } else {
                // Fallback to base damage
                playerDamage = 1;
            }
        } else if (monsterAction.type === 'ability') {
            const ability = abilitiesData.find(a => a.id === monsterAction.value);
            if (ability) {
                playerDamage = ability.damage || 1;
                monsterManaCost = ability.manaCost || 0;
                // TODO: Apply ability effects
            } else {
                // Fallback for unknown abilities
                playerDamage = 1;
            }
        } else if (monsterAction.type === 'spell') {
            // TODO: Implement spell damage calculation
            playerDamage = 1;
        }

        // Apply armor reduction
        const playerArmor = gameState.player.armor || 0;
        const monsterArmor = gameState.battle.currentMonster.armor || 0;
        
        // Reduce damage by armor (minimum 0 damage)
        playerDamage = Math.max(0, playerDamage - playerArmor);
        monsterDamage = Math.max(0, monsterDamage - monsterArmor);

        return {
            playerDamage,
            monsterDamage,
            playerManaCost,
            monsterManaCost
        };
    }

    /**
     * Select monster action based on available options
     */
    static selectMonsterAction(monster) {
        const availableActions = [];

        // Add weapon actions
        if (monster.weapons && monster.weapons.length > 0) {
            monster.weapons.forEach(weapon => {
                availableActions.push({ type: 'weapon', value: weapon });
            });
        }

        // Add ability actions
        if (monster.abilities && monster.abilities.length > 0) {
            monster.abilities.forEach(ability => {
                availableActions.push({ type: 'ability', value: ability });
            });
        }

        // Add spell actions
        if (monster.spells && monster.spells.length > 0) {
            monster.spells.forEach(spell => {
                availableActions.push({ type: 'spell', value: spell });
            });
        }

        // Select random action
        if (availableActions.length > 0) {
            return availableActions[Math.floor(Math.random() * availableActions.length)];
        }

        // Default action
        return { type: 'weapon', value: 'basic_attack' };
    }

    /**
     * Handle player death
     */
    static async handlePlayerDeath(interaction, gameState) {
        try {
            // Update game state
            gameState.battle.active = false;
            gameState.currentScreen = 'death';
            gameState.stats.battlesLost++;

            const embed = new EmbedBuilder()
                .setTitle('💀 **DEFEAT** 💀')
                .setDescription(`${gameState.player.hero.name} has fallen in battle against ${gameState.battle.currentMonster.name}!\n\n**Final Stats:**\n❤️ Health: 0/${gameState.player.hero.health}\n💙 Mana: ${gameState.player.currentMana}/${gameState.player.hero.mana}\n\n**Game Over!**`)
                .setColor(0x800000)
                .setFooter({ text: 'Choose your next action...' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('death_actions')
                .setPlaceholder('What would you like to do?')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔄 New Game')
                        .setDescription('Start a new adventure')
                        .setValue('new_game'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💾 Load Save')
                        .setDescription('Load your saved game')
                        .setValue('load_save')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.info(`User ${gameState.session.userId} died in battle`);

        } catch (error) {
            logger.error('Error handling player death:', error);
            throw error;
        }
    }

    /**
     * Handle monster death (victory)
     */
    static async handleMonsterDeath(interaction, gameState) {
        try {
            // Update game state
            gameState.battle.active = false;
            gameState.currentScreen = 'victory';
            gameState.stats.battlesWon++;
            gameState.stats.monstersDefeated++;

            const monster = gameState.battle.currentMonster;
            const battleType = gameState.battle.battleType;

            // Generate rewards
            const rewards = this.generateBattleRewards(monster, gameState.currentFloor, battleType);

            // Apply rewards
            if (rewards.gold > 0) {
                gameState.player.inventory.gold += rewards.gold;
            }

            let rewardText = `**Victory Rewards:**\n`;
            if (rewards.gold > 0) {
                rewardText += `💰 Gold: ${rewards.gold}\n`;
            }
            if (rewards.items && rewards.items.length > 0) {
                rewardText += `🎁 Items: ${rewards.items.join(', ')}\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 **VICTORY** 🏆')
                .setDescription(`${gameState.player.hero.name} has defeated ${monster.name}!\n\n${rewardText}`)
                .setColor(0x00FF00)
                .setFooter({ text: 'Choose your next action...' })
                .setTimestamp();

            await this.showVictoryOptions(interaction, gameState, embed, battleType);

            logger.info(`User ${gameState.session.userId} won battle against ${monster.name}`);

        } catch (error) {
            logger.error('Error handling monster death:', error);
            throw error;
        }
    }

    /**
     * Show victory options
     */
    static async showVictoryOptions(interaction, gameState, embed, battleType) {
        try {
            const options = [];

            if (battleType === 'floor_boss') {
                // Floor boss victory - can descend or explore more
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⬇️ Descend')
                        .setDescription('Advance to the next floor')
                        .setValue('descend'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔍 Explore')
                        .setDescription('Explore this floor more')
                        .setValue('explore')
                );
            } else {
                // Exploration battle victory
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔍 Continue Exploring')
                        .setDescription('Keep exploring this floor')
                        .setValue('continue_exploring'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🗡️ Head to Stairs')
                        .setDescription('Go fight the floor boss')
                        .setValue('head_to_stairs')
                );
            }

            // Always available options
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎒 Inventory')
                    .setDescription('Manage your items')
                    .setValue('inventory'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Return to Floor')
                    .setDescription('Return to floor menu')
                    .setValue('return_to_floor')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('victory_actions')
                .setPlaceholder('Choose your next action...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing victory options:', error);
            throw error;
        }
    }

    /**
     * Handle victory actions
     */
    static async handleVictoryAction(interaction, gameState, selectedValue) {
        try {
            switch (selectedValue) {
                case 'descend':
                    await this.handleDescend(interaction, gameState);
                    break;
                case 'explore':
                case 'continue_exploring':
                    await this.handleContinueExploring(interaction, gameState);
                    break;
                case 'head_to_stairs':
                    await this.handleHeadToStairs(interaction, gameState);
                    break;
                case 'inventory':
                    await this.handleVictoryInventory(interaction, gameState);
                    break;
                case 'return_to_floor':
                    await this.handleReturnToFloor(interaction, gameState);
                    break;
                default:
                    logger.warn(`Unknown victory action: ${selectedValue}`);
                    await interaction.update({
                        content: 'Unknown option selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling victory action:', error);
            throw error;
        }
    }

    /**
     * Generate battle rewards
     */
    static generateBattleRewards(monster, floor, battleType) {
        const rewards = {
            gold: 0,
            items: []
        };

        // Base gold reward
        rewards.gold = Math.floor(monster.health * 5) + Math.floor(floor * 2);

        // Floor boss gives more rewards
        if (battleType === 'floor_boss') {
            rewards.gold *= 2;
        }

        // Random chance for items based on floor
        if (Math.random() < 0.3) {
            rewards.items.push('health_potion');
        }

        return rewards;
    }

    /**
     * Scale monster stats for looping floors
     */
    static scaleMonsterForFloor(baseMonster, currentFloor) {
        const scaledMonster = { ...baseMonster };
        
        // After floor 20, scale stats by 10% every 20 floors
        if (currentFloor > 20) {
            const loopMultiplier = Math.floor((currentFloor - 1) / 20);
            const scaleMultiplier = 1 + (loopMultiplier * 0.1);
            
            scaledMonster.health = Math.floor(baseMonster.health * scaleMultiplier);
            scaledMonster.mana = Math.floor(baseMonster.mana * scaleMultiplier);
            scaledMonster.currentHealth = scaledMonster.health;
            scaledMonster.currentMana = scaledMonster.mana;
        } else {
            scaledMonster.currentHealth = scaledMonster.health;
            scaledMonster.currentMana = scaledMonster.mana;
        }
        
        return scaledMonster;
    }

    /**
     * Get health bar visualization
     */
    static getHealthBar(current, max) {
        const percentage = Math.max(0, Math.min(100, (current / max) * 100));
        const filledBars = Math.floor(percentage / 10);
        const emptyBars = 10 - filledBars;
        
        return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    }

    /**
     * Handle battle inventory access
     */
    static async handleBattleInventory(interaction, gameState) {
        try {
            const { InventoryHandler } = await import('../inventory/InventoryHandler.js');
            await InventoryHandler.showInventory(interaction, gameState);
        } catch (error) {
            logger.error('Error handling battle inventory:', error);
            throw error;
        }
    }

    /**
     * Handle descend to next floor
     */
    static async handleDescend(interaction, gameState) {
        try {
            const { FloorHandler } = await import('./FloorHandler.js');
            await FloorHandler.advanceToNextFloor(interaction, gameState);
        } catch (error) {
            logger.error('Error handling descend:', error);
            throw error;
        }
    }

    /**
     * Handle continue exploring
     */
    static async handleContinueExploring(interaction, gameState) {
        try {
            const { FloorHandler } = await import('./FloorHandler.js');
            await FloorHandler.showFloor(interaction, gameState);
        } catch (error) {
            logger.error('Error handling continue exploring:', error);
            throw error;
        }
    }

    /**
     * Handle head to stairs
     */
    static async handleHeadToStairs(interaction, gameState) {
        try {
            const { FloorHandler } = await import('./FloorHandler.js');
            await FloorHandler.handleStairs(interaction, gameState);
        } catch (error) {
            logger.error('Error handling head to stairs:', error);
            throw error;
        }
    }

    /**
     * Handle victory inventory
     */
    static async handleVictoryInventory(interaction, gameState) {
        try {
            const { InventoryHandler } = await import('../inventory/InventoryHandler.js');
            await InventoryHandler.showInventory(interaction, gameState);
        } catch (error) {
            logger.error('Error handling victory inventory:', error);
            throw error;
        }
    }

    /**
     * Handle return to floor
     */
    static async handleReturnToFloor(interaction, gameState) {
        try {
            const { FloorHandler } = await import('./FloorHandler.js');
            await FloorHandler.showFloor(interaction, gameState);
        } catch (error) {
            logger.error('Error handling return to floor:', error);
            throw error;
        }
    }
} 