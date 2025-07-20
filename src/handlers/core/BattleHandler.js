import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { monstersData, getMonsterForFloor } from '../../data/monstersData.js';
import { abilitiesData } from '../../data/abilitiesData.js';
import { weaponsData } from '../../data/weaponsData.js';
import { InputValidation } from '../../utils/inputValidation.js';
import { embedHistory } from '../../utils/embedHistory.js';
import { EffectProcessor } from '../../utils/EffectProcessor.js';
import { generatePotionRewards } from '../../utils/potionScaling.js';
import { generateWeaponReward, generateGoldReward } from '../../utils/weaponArmorDrops.js';
import { calculateGoldScaling } from '../../utils/floorScaling.js';

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
            const scaledMonster = EffectProcessor.scaleMonsterForFloor(floorMonster, floor);
            
            // Initialize battle state
            gameState.battle = {
                active: true,
                currentMonster: scaledMonster,
                battleType: 'floor_boss',
                turnNumber: 1,
                playerLastAction: null,
                monsterLastAction: null,
                playerEffects: [],
                monsterEffects: [],
                playerDeathPreventionUsed: false,
                monsterDeathPreventionUsed: false,
                // Battle statistics tracking
                battleStats: {
                    startTime: Date.now(),
                    totalTurns: 0,
                    playerDamageDealt: 0,
                    playerDamageReceived: 0,
                    playerManaUsed: 0,
                    playerHealing: 0,
                    monsterDamageDealt: 0,
                    monsterDamageReceived: 0,
                    monsterManaUsed: 0,
                    monsterHealing: 0,
                    abilitiesUsed: [],
                    spellsCast: [],
                    criticalHits: 0,
                    effectsApplied: []
                }
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
            // Scale monster for current floor
            const scaledMonster = EffectProcessor.scaleMonsterForFloor(monster, gameState.currentFloor || 1);
            
            // Initialize battle state
            gameState.battle = {
                active: true,
                currentMonster: scaledMonster,
                battleType: battleType,
                turnNumber: 1,
                playerLastAction: null,
                monsterLastAction: null,
                playerEffects: [],
                monsterEffects: [],
                playerDeathPreventionUsed: false,
                monsterDeathPreventionUsed: false,
                // Battle statistics tracking
                battleStats: {
                    startTime: Date.now(),
                    totalTurns: 0,
                    playerDamageDealt: 0,
                    playerDamageReceived: 0,
                    playerManaUsed: 0,
                    playerHealing: 0,
                    monsterDamageDealt: 0,
                    monsterDamageReceived: 0,
                    monsterManaUsed: 0,
                    monsterHealing: 0,
                    abilitiesUsed: [],
                    spellsCast: [],
                    criticalHits: 0,
                    effectsApplied: []
                }
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
            const currentFloor = gameState.currentFloor || 1;

            // Build battle status description
            let battleDescription = `**Floor ${currentFloor}** - **Turn ${turnNumber}** - Choose your action!\n\n`;
            
            // Hero status
            battleDescription += `**${playerHero.name}**\n`;
            battleDescription += `❤️ Health: ${gameState.player.currentHealth}/${playerHero.health}\n`;
            battleDescription += `💙 Mana: ${gameState.player.currentMana}/${playerHero.mana}\n`;
            battleDescription += `🛡️ Armor: ${gameState.player.currentArmor || gameState.player.armor || 0}\n`;
            
            // Player's equipped weapons (show as primary/secondary)
            const equippedWeapons = playerHero.equippedWeapons || playerHero.weapons || [];
            if (equippedWeapons && equippedWeapons.length > 0) {
                // Get weapon names from weapon data
                const primaryWeaponId = equippedWeapons[0];
                const primaryWeaponData = weaponsData.find(w => w.id === primaryWeaponId);
                const primaryWeaponName = primaryWeaponData ? primaryWeaponData.name : primaryWeaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                battleDescription += `⚔️ Primary: ${primaryWeaponName}\n`;
                
                if (equippedWeapons.length > 1) {
                    const secondaryWeaponId = equippedWeapons[1];
                    const secondaryWeaponData = weaponsData.find(w => w.id === secondaryWeaponId);
                    const secondaryWeaponName = secondaryWeaponData ? secondaryWeaponData.name : secondaryWeaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    
                    battleDescription += `🗡️ Secondary: ${secondaryWeaponName}\n`;
                }
            } else {
                battleDescription += `⚔️ No weapons equipped\n`;
            }
            
            // Player effects (show 'none' if no effects)
            if (gameState.player.effects && gameState.player.effects.length > 0) {
                const effectsText = gameState.player.effects.map(e => `${e.type}(${e.duration})`).join(', ');
                battleDescription += `🌟 Effects: ${effectsText}\n`;
            } else {
                battleDescription += `🌟 Effects: none\n`;
            }
            
            battleDescription += `\n**VS**\n\n`;
            
            // Monster status
            battleDescription += `**${monster.name}**\n`;
            battleDescription += `❤️ Health: ${monster.currentHealth || monster.health}/${monster.health}\n`;
            battleDescription += `💙 Mana: ${monster.currentMana || monster.mana}/${monster.mana}\n`;
            battleDescription += `🛡️ Armor: ${monster.armor || 0}\n`;
            
            // Monster's weapons (show as primary/secondary)
            if (monster.weapons && monster.weapons.length > 0) {
                const primaryWeapon = monster.weapons[0];
                battleDescription += `⚔️ Primary: ${primaryWeapon.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                
                // Secondary weapon if available
                if (monster.weapons.length > 1) {
                    const secondaryWeapon = monster.weapons[1];
                    battleDescription += `🗡️ Secondary: ${secondaryWeapon.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                }
            }
            
            // Monster effects (show 'none' if no effects)
            if (monster.effects && monster.effects.length > 0) {
                const effectsText = monster.effects.map(e => `${e.type}(${e.duration})`).join(', ');
                battleDescription += `🌟 Effects: ${effectsText}\n`;
            } else {
                battleDescription += `🌟 Effects: none\n`;
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

            // FIXED: Use equipped weapons instead of starting weapons
            const playerEquippedWeapons = playerHero.equippedWeapons || playerHero.weapons || [];
            if (playerEquippedWeapons && playerEquippedWeapons.length > 0) {
                playerEquippedWeapons.forEach(weaponId => {
                    // Find weapon data to get proper name and info
                    const weaponData = weaponsData.find(w => w.id === weaponId);
                    const weaponName = weaponData ? weaponData.name : weaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const damage = weaponData ? weaponData.damage : 1;
                    
                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`⚔️ ${weaponName}`)
                            .setDescription(`Use your weapon to attack (${damage} damage)`)
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

            // Flee option (only for non-floor-boss battles)
            const battleType = gameState.battle.battleType;
            if (battleType !== 'floor_boss') {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏃 Flee')
                        .setDescription('Escape from battle with penalties')
                        .setValue('flee')
                );
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('battle_actions')
                .setPlaceholder('Choose your battle action...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Use embed history system to preserve battle history
            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing battle screen:', error);
            await InputValidation.safeInteractionResponse(interaction, '❌ Battle screen failed to load. Please try again.', 'reply');
        }
    }

    /**
     * Handle battle action selections
     */
    static async handleBattleAction(interaction, gameState, selectedValue) {
        try {
            // Validate inputs
            const validatedValue = InputValidation.validateSelectedValue(selectedValue, 'battle_actions');
            if (!validatedValue) {
                logger.error('Invalid selectedValue in handleBattleAction:', selectedValue);
                await InputValidation.safeInteractionResponse(interaction, '❌ Invalid battle action. Please try again.', 'reply');
                return;
            }

            if (!InputValidation.validateGameState(gameState, 'battle_actions')) {
                await InputValidation.safeInteractionResponse(interaction, '❌ Game state error. Please restart.', 'reply');
                return;
            }

            // Check if interaction has already been acknowledged
            if (interaction.replied || interaction.deferred) {
                logger.warn('Interaction already acknowledged, skipping battle action handling');
                return;
            }

            logger.info(`[BATTLE_ACTION] User ${gameState.session.userId} selected: ${validatedValue}`);

            // Handle continue_battle specifically
            if (validatedValue === 'continue_battle') {
                // Show battle screen again for next turn
                await this.showBattleScreen(interaction, gameState);
                return;
            }

            // Parse action using safe string operations
            let actionType = '';
            let actionValue = '';
            
            if (InputValidation.safeStringOperation(validatedValue, 'startsWith', 'weapon_')) {
                actionType = 'weapon';
                actionValue = InputValidation.safeStringOperation(validatedValue, 'replace', 'weapon_', '');
            } else if (InputValidation.safeStringOperation(validatedValue, 'startsWith', 'ability_')) {
                actionType = 'ability';
                actionValue = InputValidation.safeStringOperation(validatedValue, 'replace', 'ability_', '');
            } else if (InputValidation.safeStringOperation(validatedValue, 'startsWith', 'spell_')) {
                actionType = 'spell';
                actionValue = InputValidation.safeStringOperation(validatedValue, 'replace', 'spell_', '');
            } else if (validatedValue === 'inventory') {
                await this.handleBattleInventory(interaction, gameState);
                return;
            } else if (validatedValue === 'flee') {
                await this.handleFlee(interaction, gameState);
                return;
            } else {
                logger.warn(`[BATTLE_ACTION] Unknown battle action: ${validatedValue}`);
                await InputValidation.safeInteractionResponse(interaction, '❌ Unknown battle action. Please try again.', 'update');
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
            await InputValidation.safeInteractionResponse(interaction, '❌ Battle action failed. Please try again.', 'reply');
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

            // Calculate combat outcome using new EffectProcessor
            const combatResult = EffectProcessor.processCombatTurn(gameState, playerAction, monsterAction);

            // Track battle statistics
            const battleStats = gameState.battle.battleStats;
            battleStats.totalTurns++;
            battleStats.playerDamageDealt += combatResult.monsterDamage;
            battleStats.playerDamageReceived += combatResult.playerDamage;
            battleStats.playerManaUsed += combatResult.playerManaCost;
            battleStats.playerHealing += combatResult.playerHealing;
            battleStats.monsterDamageDealt += combatResult.playerDamage;
            battleStats.monsterDamageReceived += combatResult.monsterDamage;
            battleStats.monsterManaUsed += combatResult.monsterManaCost;
            battleStats.monsterHealing += combatResult.monsterHealing;
            battleStats.criticalHits += combatResult.criticalHits.length;
            
            // Track actions used
            if (playerAction.type === 'ability') {
                const ability = abilitiesData.find(a => a.id === playerAction.value);
                if (ability) {
                    battleStats.abilitiesUsed.push(ability.name);
                }
            } else if (playerAction.type === 'spell') {
                battleStats.spellsCast.push(playerAction.value);
            }

            // Apply results
            gameState.player.currentHealth = Math.max(0, gameState.player.currentHealth - combatResult.playerDamage);
            gameState.player.currentMana = Math.max(0, gameState.player.currentMana - combatResult.playerManaCost);
            
            // Apply healing
            if (combatResult.playerHealing > 0) {
                const maxHealth = gameState.player.hero.health;
                gameState.player.currentHealth = Math.min(maxHealth, gameState.player.currentHealth + combatResult.playerHealing);
            }
            
            // Apply mana restoration from effects
            if (combatResult.playerManaRestore > 0) {
                const maxMana = gameState.player.hero.mana;
                gameState.player.currentMana = Math.min(maxMana, gameState.player.currentMana + combatResult.playerManaRestore);
            }
            
            if (!monster.currentHealth) monster.currentHealth = monster.health;
            if (!monster.currentMana) monster.currentMana = monster.mana;
            
            monster.currentHealth = Math.max(0, monster.currentHealth - combatResult.monsterDamage);
            monster.currentMana = Math.max(0, monster.currentMana - combatResult.monsterManaCost);
            
            // Apply monster healing
            if (combatResult.monsterHealing > 0) {
                const maxHealth = monster.health;
                monster.currentHealth = Math.min(maxHealth, monster.currentHealth + combatResult.monsterHealing);
            }
            
            // Apply monster mana restoration from effects
            if (combatResult.monsterManaRestore > 0) {
                const maxMana = monster.mana;
                monster.currentMana = Math.min(maxMana, monster.currentMana + combatResult.monsterManaRestore);
            }

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
     * Show turn results with detailed combat information
     */
    static async showTurnResult(interaction, gameState, combatResult) {
        try {
            const playerAction = gameState.battle.playerLastAction;
            const monsterAction = gameState.battle.monsterLastAction;
            const monster = gameState.battle.currentMonster;
            const playerHero = gameState.player.hero;
            const turnNumber = gameState.battle.turnNumber - 1; // Show the turn that just completed

            // Build turn result description
            let resultDescription = `**Turn ${turnNumber} Results:**\n\n`;
            
            // Player action description
            if (playerAction.type === 'weapon') {
                const weaponName = playerAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                resultDescription += `⚔️ **${playerHero.name}** attacked with **${weaponName}** dealing **${combatResult.monsterDamage}** damage\n`;
            } else if (playerAction.type === 'ability') {
                const ability = abilitiesData.find(a => a.id === playerAction.value);
                const abilityName = ability ? ability.name : playerAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                resultDescription += `✨ **${playerHero.name}** used **${abilityName}** dealing **${combatResult.monsterDamage}** damage\n`;
                if (combatResult.playerManaCost > 0) {
                    resultDescription += `💙 **${playerHero.name}** used **${combatResult.playerManaCost}** mana\n`;
                }
            } else if (playerAction.type === 'spell') {
                const spellName = playerAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                // Check if this is a heal spell
                if (playerAction.value === 'heal') {
                    resultDescription += `🌟 **${playerHero.name}** cast **${spellName}** healing **${combatResult.playerHealing}** health\n`;
                    if (combatResult.playerManaCost > 0) {
                        resultDescription += `💙 **${playerHero.name}** used **${combatResult.playerManaCost}** mana\n`;
                    }
                } else {
                    resultDescription += `🌟 **${playerHero.name}** cast **${spellName}** dealing **${combatResult.monsterDamage}** damage\n`;
                    if (combatResult.playerManaCost > 0) {
                        resultDescription += `💙 **${playerHero.name}** used **${combatResult.playerManaCost}** mana\n`;
                    }
                }
            }

            // Monster action description
            if (monsterAction.type === 'weapon') {
                const weaponName = monsterAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                resultDescription += `🗡️ **${monster.name}** attacked with **${weaponName}** dealing **${combatResult.playerDamage}** damage\n`;
            } else if (monsterAction.type === 'ability') {
                const ability = abilitiesData.find(a => a.id === monsterAction.value);
                const abilityName = ability ? ability.name : monsterAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                resultDescription += `🔥 **${monster.name}** used **${abilityName}** dealing **${combatResult.playerDamage}** damage\n`;
            } else if (monsterAction.type === 'spell') {
                const spellName = monsterAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                // Check if this is a heal spell
                if (monsterAction.value === 'heal') {
                    resultDescription += `🌟 **${monster.name}** cast **${spellName}** healing **${combatResult.monsterHealing}** health\n`;
                    if (combatResult.monsterManaCost > 0) {
                        resultDescription += `💙 **${monster.name}** used **${combatResult.monsterManaCost}** mana\n`;
                    }
                } else {
                resultDescription += `🌟 **${monster.name}** cast **${spellName}** dealing **${combatResult.playerDamage}** damage\n`;
                    if (combatResult.monsterManaCost > 0) {
                        resultDescription += `💙 **${monster.name}** used **${combatResult.monsterManaCost}** mana\n`;
                    }
                }
            }

            // Add critical hit messages
            if (combatResult.criticalHits && combatResult.criticalHits.length > 0) {
                resultDescription += `\n💥 **Critical Hits:**\n`;
                combatResult.criticalHits.forEach(crit => {
                    resultDescription += `${crit}\n`;
                });
            }

            // Add special combat messages
            if (combatResult.messages && combatResult.messages.length > 0) {
                resultDescription += `\n⚡ **Special Effects:**\n`;
                combatResult.messages.forEach(msg => {
                    resultDescription += `${msg}\n`;
                });
            }

            // Add mana restoration from effects
            if (combatResult.playerManaRestore > 0) {
                resultDescription += `\n💙 **${playerHero.name}** restored **${combatResult.playerManaRestore}** mana from effects\n`;
            }
            if (combatResult.monsterManaRestore > 0) {
                resultDescription += `\n💙 **${monster.name}** restored **${combatResult.monsterManaRestore}** mana from effects\n`;
            }

            // Current status after combat
            resultDescription += `\n**Current Status:**\n`;
            resultDescription += `❤️ **${playerHero.name}**: ${gameState.player.currentHealth}/${playerHero.health} HP\n`;
            resultDescription += `💙 **${playerHero.name}**: ${gameState.player.currentMana}/${playerHero.mana} MP\n`;
            resultDescription += `❤️ **${monster.name}**: ${monster.currentHealth}/${monster.health} HP\n`;
            resultDescription += `💙 **${monster.name}**: ${monster.currentMana}/${monster.mana} MP\n`;

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **COMBAT RESULTS** ⚔️')
                .setDescription(resultDescription)
                .setColor(0xFFFF00)
                .setFooter({ text: 'Continue the battle!' })
                .setTimestamp();

            // Create continue battle option
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('battle_actions')
                .setPlaceholder('Continue battle...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Continue Battle')
                        .setDescription('Proceed to next turn')
                        .setValue('continue_battle')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Use embed history system to preserve turn-by-turn combat history
            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing turn result:', error);
            // Continue to next turn even if result display fails
            await this.showBattleScreen(interaction, gameState);
        }
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

            const monster = gameState.battle.currentMonster;
            const playerAction = gameState.battle.playerLastAction;
            const monsterAction = gameState.battle.monsterLastAction;
            const battleStats = gameState.battle.battleStats;
            const battleDuration = Math.floor((Date.now() - battleStats.startTime) / 1000);

            // Build detailed defeat description
            let defeatDescription = `${gameState.player.hero.name} has fallen in battle against ${monster.name}!\n\n`;
            
            // Add final round information
            defeatDescription += `**Final Round:**\n`;
            if (playerAction) {
                if (playerAction.type === 'weapon') {
                    const weaponName = playerAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    defeatDescription += `⚔️ **${gameState.player.hero.name}** attacked with **${weaponName}**\n`;
                } else if (playerAction.type === 'ability') {
                    const ability = abilitiesData.find(a => a.id === playerAction.value);
                    const abilityName = ability ? ability.name : playerAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    defeatDescription += `✨ **${gameState.player.hero.name}** used **${abilityName}**\n`;
                } else if (playerAction.type === 'spell') {
                    const spellName = playerAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    defeatDescription += `🌟 **${gameState.player.hero.name}** cast **${spellName}**\n`;
                }
            }
            
            if (monsterAction) {
                if (monsterAction.type === 'weapon') {
                    const weaponName = monsterAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    defeatDescription += `🗡️ **${monster.name}** attacked with **${weaponName}** - **FATAL BLOW!**\n`;
                } else if (monsterAction.type === 'ability') {
                    const ability = abilitiesData.find(a => a.id === monsterAction.value);
                    const abilityName = ability ? ability.name : monsterAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    defeatDescription += `🔥 **${monster.name}** used **${abilityName}** - **FATAL BLOW!**\n`;
                } else if (monsterAction.type === 'spell') {
                    const spellName = monsterAction.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    defeatDescription += `🌟 **${monster.name}** cast **${spellName}** - **FATAL BLOW!**\n`;
                }
            }
            
            defeatDescription += `\n`;
            
            // Final player status
            defeatDescription += `**Final Hero Status:**\n`;
            defeatDescription += `❤️ Health: 0/${gameState.player.hero.health}\n`;
            defeatDescription += `💙 Mana: ${gameState.player.currentMana}/${gameState.player.hero.mana}\n`;
            defeatDescription += `🛡️ Armor: ${gameState.player.currentArmor || gameState.player.armor || 0}\n\n`;
            
            // Battle statistics
            defeatDescription += `**Battle Summary:**\n`;
            defeatDescription += `⏱️ Duration: ${battleDuration} seconds\n`;
            defeatDescription += `🔄 Turns: ${battleStats.totalTurns}\n`;
            defeatDescription += `⚔️ Damage Dealt: ${battleStats.playerDamageDealt}\n`;
            defeatDescription += `💔 Damage Received: ${battleStats.playerDamageReceived}\n`;
            defeatDescription += `💙 Mana Used: ${battleStats.playerManaUsed}\n`;
            
            if (battleStats.playerHealing > 0) {
                defeatDescription += `💚 Health Restored: ${battleStats.playerHealing}\n`;
            }
            
            if (battleStats.criticalHits > 0) {
                defeatDescription += `✨ Critical Hits: ${battleStats.criticalHits}\n`;
            }
            
            // Show abilities used
            if (battleStats.abilitiesUsed.length > 0) {
                const uniqueAbilities = [...new Set(battleStats.abilitiesUsed)];
                defeatDescription += `🎯 Abilities Used: ${uniqueAbilities.join(', ')}\n`;
            }
            
            // Show spells cast
            if (battleStats.spellsCast.length > 0) {
                const uniqueSpells = [...new Set(battleStats.spellsCast)];
                defeatDescription += `✨ Spells Cast: ${uniqueSpells.join(', ')}\n`;
            }
            
            // Final monster status
            defeatDescription += `\n**${monster.name} Status:**\n`;
            defeatDescription += `❤️ Health: ${monster.currentHealth}/${monster.health}\n`;
            defeatDescription += `💙 Mana: ${monster.currentMana}/${monster.mana}\n\n`;
            
            defeatDescription += `**Game Over!**`;

            // Use monster's image instead of hardcoded rat image
            const defeatImage = monster.imageUrl || 'https://media.discordapp.net/attachments/1351696887165616169/1351697027209367562/Screenshot_2025-03-19_092009.png';

            const embed = new EmbedBuilder()
                .setTitle('💀 **DEFEAT** 💀')
                .setDescription(defeatDescription)
                .setColor(0x800000)
                .setImage(defeatImage)
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

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.info(`User ${gameState.session.userId} died in battle after ${battleStats.totalTurns} turns`);

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

            // Track floor boss defeats to prevent respawning
            if (battleType === 'floor_boss') {
                if (!gameState.progress.floorsCompleted) {
                    gameState.progress.floorsCompleted = [];
                }
                const currentFloor = gameState.currentFloor || 1;
                if (!gameState.progress.floorsCompleted.includes(currentFloor)) {
                    gameState.progress.floorsCompleted.push(currentFloor);
                }
            }
            const battleStats = gameState.battle.battleStats;
            const battleDuration = Math.floor((Date.now() - battleStats.startTime) / 1000);

            // Calculate performance rating first
            const performanceRating = this.calculatePerformanceRating(battleStats, gameState.player.hero);

            // Generate rewards
            const rewards = this.generateBattleRewards(monster, gameState.currentFloor, battleType, battleStats, performanceRating, gameState);

            // Apply rewards
            if (rewards.gold > 0) {
                gameState.player.inventory.gold += rewards.gold;
            }

            // Add items to inventory properly categorized
            if (rewards.items && rewards.items.length > 0) {
                for (const item of rewards.items) {
                    // Categorize items properly
                    if (item.includes('Potion') || item.includes('Elixir') || item.includes('Bread')) {
                        if (!gameState.player.inventory.consumables) {
                            gameState.player.inventory.consumables = [];
                        }
                        gameState.player.inventory.consumables.push(item);
                    } else if (item.includes('Sword') || item.includes('Bow') || item.includes('Hammer') || item.includes('Blade')) {
                        if (!gameState.player.inventory.weapons) {
                            gameState.player.inventory.weapons = [];
                        }
                        gameState.player.inventory.weapons.push(item);
                    } else if (item.includes('Armor') || item.includes('Mail') || item.includes('Shield') || item.includes('Cloak')) {
                        if (!gameState.player.inventory.armor) {
                            gameState.player.inventory.armor = [];
                        }
                        gameState.player.inventory.armor.push(item);
                    } else {
                        // Default to consumables for misc items
                        if (!gameState.player.inventory.consumables) {
                            gameState.player.inventory.consumables = [];
                        }
                        gameState.player.inventory.consumables.push(item);
                    }
                }
            }

            // Add weapons to inventory from new weapon drop system
            if (rewards.weapons && rewards.weapons.length > 0) {
                if (!gameState.player.inventory.weapons) {
                    gameState.player.inventory.weapons = [];
                }
                for (const weapon of rewards.weapons) {
                    gameState.player.inventory.weapons.push(weapon);
                }
            }

            // Build detailed victory description
            let victoryDescription = `${gameState.player.hero.name} has defeated ${monster.name}!\n\n`;
            
            // Final hero status
            victoryDescription += `**Final Hero Status:**\n`;
            victoryDescription += `❤️ Health: ${gameState.player.currentHealth}/${gameState.player.hero.health}\n`;
            victoryDescription += `💙 Mana: ${gameState.player.currentMana}/${gameState.player.hero.mana}\n`;
            victoryDescription += `🛡️ Armor: ${gameState.player.currentArmor || gameState.player.armor || 0}\n\n`;
            
            // Battle statistics
            victoryDescription += `**Battle Summary:**\n`;
            victoryDescription += `⏱️ Duration: ${battleDuration} seconds\n`;
            victoryDescription += `🔄 Turns: ${battleStats.totalTurns}\n`;
            victoryDescription += `⚔️ Damage Dealt: ${battleStats.playerDamageDealt}\n`;
            victoryDescription += `💔 Damage Received: ${battleStats.playerDamageReceived}\n`;
            victoryDescription += `💙 Mana Used: ${battleStats.playerManaUsed}\n`;
            
            if (battleStats.playerHealing > 0) {
                victoryDescription += `💚 Health Restored: ${battleStats.playerHealing}\n`;
            }
            
            if (battleStats.criticalHits > 0) {
                victoryDescription += `✨ Critical Hits: ${battleStats.criticalHits}\n`;
            }
            
            // Show abilities used
            if (battleStats.abilitiesUsed.length > 0) {
                const uniqueAbilities = [...new Set(battleStats.abilitiesUsed)];
                victoryDescription += `🎯 Abilities Used: ${uniqueAbilities.join(', ')}\n`;
            }
            
            // Show spells cast
            if (battleStats.spellsCast.length > 0) {
                const uniqueSpells = [...new Set(battleStats.spellsCast)];
                victoryDescription += `✨ Spells Cast: ${uniqueSpells.join(', ')}\n`;
            }
            
            // Victory rewards
            victoryDescription += `\n**Victory Rewards:**\n`;
            if (rewards.gold > 0) {
                victoryDescription += `💰 Gold: ${rewards.gold}\n`;
            }
            if (rewards.weapons && rewards.weapons.length > 0) {
                for (const weapon of rewards.weapons) {
                    const rarityEmoji = this.getRarityEmoji(weapon.rarity);
                    victoryDescription += `${rarityEmoji} **${weapon.name}** (${weapon.rarity})\n`;
                }
            }
            if (rewards.items && rewards.items.length > 0) {
                victoryDescription += `🎁 Items: ${rewards.items.join(', ')}\n`;
            }
            if (rewards.experience > 0) {
                victoryDescription += `⭐ Experience: ${rewards.experience}\n`;
            }
            if (rewards.specialRewards && rewards.specialRewards.length > 0) {
                victoryDescription += `🏆 Special: ${rewards.specialRewards.join(', ')}\n`;
            }
            
            victoryDescription += `\n**Performance Rating:** ${performanceRating}`;

            // Select victory image based on battle type and performance
            const victoryImage = this.getVictoryImage(battleType, performanceRating, monster);

            const embed = new EmbedBuilder()
                .setTitle('🏆 **VICTORY** 🏆')
                .setDescription(victoryDescription)
                .setColor(0x00FF00)
                .setImage(victoryImage)
                .setFooter({ text: 'Choose your next action...' })
                .setTimestamp();

            await this.showVictoryOptions(interaction, gameState, embed, battleType);

            logger.info(`User ${gameState.session.userId} won battle against ${monster.name} in ${battleStats.totalTurns} turns`);

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

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

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
                    await embedHistory.updateWithHistory(interaction, {
                        content: 'Unknown option selected. Please try again.',
                        embeds: [],
                        components: []
                    }, gameState.session.userId);
            }
        } catch (error) {
            logger.error('Error handling victory action:', error);
            throw error;
        }
    }

    /**
     * Generate battle rewards based on monster, floor, battle type, and performance
     */
    static generateBattleRewards(monster, floor, battleType, battleStats, performanceRating, gameState) {
        const rewards = {
            gold: 0,
            items: [],
            weapons: [],
            experience: 0,
            specialRewards: []
        };

        // Base gold reward calculation with floor scaling (capped at floor 500)
        let baseGold = calculateGoldScaling(Math.floor(monster.health * 3), floor);

        // Performance multiplier
        const performanceMultiplier = this.getPerformanceMultiplier(performanceRating);
        baseGold = Math.floor(baseGold * performanceMultiplier);

        // Battle type multipliers
        if (battleType === 'floor_boss') {
            baseGold *= 2.5;
        } else if (battleType === 'mimic') {
            baseGold *= 1.8;
        } else if (battleType === 'detected') {
            baseGold *= 1.2; // Bonus for taking initiative
        }

        // Turn efficiency bonus
        if (battleStats.totalTurns <= 3) {
            baseGold *= 1.5;
            rewards.specialRewards.push('⚡ Speed Bonus');
        }
        
        // Critical hit bonus
        if (battleStats.criticalHits >= 3) {
            baseGold *= 1.3;
            rewards.specialRewards.push('💥 Critical Master');
        }

        // Apply division scaling to gold (get division from profile when available)
        const division = gameState?.profile?.division || 'gold';
        rewards.gold = generateGoldReward(Math.floor(baseGold), division);

        // Generate weapon rewards
        const weaponReward = generateWeaponReward(floor, battleType, performanceRating, division);
        if (weaponReward) {
            rewards.weapons.push(weaponReward);
        }

        // Item rewards based on floor and performance
        this.generateItemRewards(rewards, floor, battleType, performanceRating, monster, gameState);
        
        // Experience calculation
        rewards.experience = Math.floor(monster.health * 2) + Math.floor(floor * 1.5);
        
        // Special monster rewards
        if (monster.rewards) {
            if (monster.rewards.gold) {
                rewards.gold += monster.rewards.gold;
            }
            if (monster.rewards.description) {
                rewards.specialRewards.push(monster.rewards.description);
            }
        }

        return rewards;
    }

    /**
     * Generate item rewards based on various factors
     */
    static generateItemRewards(rewards, floor, battleType, performanceRating, monster, gameState) {
        const itemPool = this.getItemPool(floor);
        
        // Generate scaled potions first
        const battleContext = {
            playerHealthLow: (gameState?.player?.currentHealth || 0) < (gameState?.selectedHero?.maxHealth || 10) * 0.5,
            playerManaLow: (gameState?.player?.currentMana || 0) < (gameState?.selectedHero?.maxMana || 5) * 0.5
        };
        
        const potionRewards = generatePotionRewards(floor, battleType, performanceRating, battleContext);
        
        // Add potions to rewards
        for (const potion of potionRewards) {
            rewards.items.push(`${potion.emoji} ${potion.name}`);
        }
        
        // Base item chance for other items
        let itemChance = 0.3;
        
        // Floor boss guaranteed item
        if (battleType === 'floor_boss') {
            itemChance = 1.0;
        } else if (battleType === 'mimic') {
            itemChance = 0.8;
        }
        
        // Performance bonus
        if (performanceRating.includes('LEGENDARY') || performanceRating.includes('MASTERFUL')) {
            itemChance += 0.3;
        } else if (performanceRating.includes('EXCELLENT')) {
            itemChance += 0.2;
        }
        
        // Roll for other items (reduced chance if potions were already given)
        const potionPenalty = potionRewards.length > 0 ? 0.15 : 0;
        itemChance = Math.max(0.1, itemChance - potionPenalty);
        
        while (itemChance > 0) {
            if (Math.random() < Math.min(itemChance, 1.0)) {
                const item = itemPool[Math.floor(Math.random() * itemPool.length)];
                if (!rewards.items.includes(item)) {
                    rewards.items.push(item);
                }
            }
            itemChance -= 1.0;
        }
        
        // Special floor milestones
        if (floor % 5 === 0) {
            rewards.items.push('🔑 Floor Key');
        }
        
        if (floor % 10 === 0) {
            rewards.items.push('💎 Rare Gem');
        }
    }

    /**
     * Get item pool based on floor
     */
    static getItemPool(floor) {
        const commonItems = ['🧪 Health Potion', '💙 Mana Potion', '🍞 Bread', '🗡️ Iron Dagger'];
        const uncommonItems = ['⚔️ Steel Sword', '🛡️ Chain Mail', '💍 Ring of Protection', '📜 Scroll of Healing'];
        const rareItems = ['🏹 Elven Bow', '🔮 Crystal Orb', '👑 Crown of Wisdom', '🗝️ Master Key'];
        const epicItems = ['⚡ Lightning Blade', '🌟 Star Cloak', '💎 Dragon Scale', '🔥 Phoenix Feather'];
        
        let pool = [...commonItems];
        
        if (floor >= 5) pool.push(...uncommonItems);
        if (floor >= 10) pool.push(...rareItems);
        if (floor >= 15) pool.push(...epicItems);
        
        return pool;
    }

    /**
     * Get performance multiplier for rewards
     */
    static getPerformanceMultiplier(performanceRating) {
        if (performanceRating.includes('LEGENDARY')) return 2.0;
        if (performanceRating.includes('MASTERFUL')) return 1.8;
        if (performanceRating.includes('EXCELLENT')) return 1.5;
        if (performanceRating.includes('GOOD')) return 1.3;
        if (performanceRating.includes('AVERAGE')) return 1.0;
        if (performanceRating.includes('BELOW AVERAGE')) return 0.8;
        return 0.6; // BARELY SURVIVED
    }

    /**
     * Calculate performance rating based on battle statistics
     */
    static calculatePerformanceRating(battleStats, hero) {
        let score = 0;
        let maxScore = 0;
        
        // Efficiency rating (fewer turns = better)
        const turnEfficiency = Math.max(0, 10 - battleStats.totalTurns);
        score += Math.min(5, turnEfficiency);
        maxScore += 5;
        
        // Damage efficiency (more damage dealt vs received)
        const damageRatio = battleStats.playerDamageReceived > 0 ? 
            battleStats.playerDamageDealt / battleStats.playerDamageReceived : 
            battleStats.playerDamageDealt;
        score += Math.min(3, Math.floor(damageRatio));
        maxScore += 3;
        
        // Critical hit bonus
        if (battleStats.criticalHits > 0) {
            score += Math.min(2, battleStats.criticalHits);
            maxScore += 2;
        }
        maxScore += 2;
        
        // Ability usage variety
        const uniqueAbilities = new Set(battleStats.abilitiesUsed).size;
        score += Math.min(2, uniqueAbilities);
        maxScore += 2;
        
        // Spell usage variety
        const uniqueSpells = new Set(battleStats.spellsCast).size;
        score += Math.min(2, uniqueSpells);
        maxScore += 2;
        
        // Health preservation
        const healthPercent = hero.currentHealth / hero.health;
        if (healthPercent > 0.8) score += 2;
        else if (healthPercent > 0.5) score += 1;
        maxScore += 2;
        
        const percentage = Math.floor((score / maxScore) * 100);
        
        if (percentage >= 90) return '🏆 **LEGENDARY** (S+)';
        if (percentage >= 80) return '🥇 **MASTERFUL** (S)';
        if (percentage >= 70) return '🥈 **EXCELLENT** (A)';
        if (percentage >= 60) return '🥉 **GOOD** (B)';
        if (percentage >= 50) return '⭐ **AVERAGE** (C)';
        if (percentage >= 40) return '📈 **BELOW AVERAGE** (D)';
        return '💀 **BARELY SURVIVED** (F)';
    }

    /**
     * Get rarity emoji for weapon display
     */
    static getRarityEmoji(rarity) {
        const rarityEmojis = {
            common: '⚪',
            uncommon: '🟢', 
            rare: '🔵',
            epic: '🟣',
            legendary: '🟡',
            mythical: '🔴'
        };
        return rarityEmojis[rarity] || '⚪';
    }

    /**
     * Get victory image based on battle type and performance
     */
    static getVictoryImage(battleType, performanceRating, monster) {
        // High performance victory images
        if (performanceRating.includes('LEGENDARY') || performanceRating.includes('MASTERFUL')) {
            const legendaryImages = [
                'https://media.discordapp.net/attachments/1351696887165616169/1351697027209367562/Screenshot_2025-03-19_092009.png', // Legendary victory
                'https://media.discordapp.net/attachments/1351696887165616169/1353999603896156200/image.png' // Masterful victory
            ];
            return legendaryImages[Math.floor(Math.random() * legendaryImages.length)];
        }
        
        // Floor boss victory images
        if (battleType === 'floor_boss') {
            const floorBossImages = [
                'https://media.discordapp.net/attachments/1351696887165616169/1353934280622866432/image.png', // Floor boss victory
                'https://media.discordapp.net/attachments/1351696887165616169/1355065567228465152/image.png' // Epic floor victory
            ];
            return floorBossImages[Math.floor(Math.random() * floorBossImages.length)];
        }
        
        // Mimic victory images
        if (battleType === 'mimic') {
            return 'https://media.discordapp.net/attachments/1351696887165616169/1354339210370220042/image.png'; // Mimic defeated
        }
        
        // Special monster victory images
        if (monster.name === 'Black Dragon') {
            return 'https://media.discordapp.net/attachments/1351696887165616169/1351697186798305320/Screenshot_2025-03-19_094803.png';
        }
        
        // Standard victory images
        const standardVictoryImages = [
            'https://media.discordapp.net/attachments/1351696887165616169/1351697027209367562/Screenshot_2025-03-19_092009.png',
            'https://media.discordapp.net/attachments/1351696887165616169/1353999603896156200/image.png',
            'https://media.discordapp.net/attachments/1351696887165616169/1355065567228465152/image.png'
        ];
        
        return standardVictoryImages[Math.floor(Math.random() * standardVictoryImages.length)];
    }





    /**
     * Handle battle inventory access
     */
    static async handleBattleInventory(interaction, gameState) {
        try {
            const { InventoryHandler } = await import('../inventory/InventoryHandler.js');
            await InventoryHandler.showInventory(interaction, gameState, 'battle');
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

    /**
     * Handle flee from battle
     */
    static async handleFlee(interaction, gameState) {
        try {
            const monster = gameState.battle.currentMonster;
            const battleType = gameState.battle.battleType;
            const playerHero = gameState.player.hero;

            // Calculate flee penalties
            const healthPenalty = Math.floor(gameState.player.currentHealth * 0.1);
            const manaPenalty = Math.floor(gameState.player.currentMana * 0.1);
            
            // Apply base penalties
            gameState.player.currentHealth = Math.max(1, gameState.player.currentHealth - healthPenalty);
            gameState.player.currentMana = Math.max(0, gameState.player.currentMana - manaPenalty);

            let fleeDescription = `${playerHero.name} fled from battle with ${monster.name}!\n\n`;
            fleeDescription += `**Flee Penalties:**\n`;
            fleeDescription += `❤️ Health Lost: ${healthPenalty}\n`;
            fleeDescription += `💙 Mana Lost: ${manaPenalty}\n`;

            // Check if this is a stronger monster (based on floor or monster tier)
            const isStrongerMonster = this.isStrongerMonster(monster, gameState.currentFloor);
            
            if (isStrongerMonster) {
                // Additional penalties for stronger monsters
                const goldPenalty = Math.floor(gameState.player.inventory.gold * 0.1);
                gameState.player.inventory.gold = Math.max(0, gameState.player.inventory.gold - goldPenalty);
                
                fleeDescription += `💰 Gold Lost: ${goldPenalty}\n`;
                
                // Potential item loss (10% chance to lose a random item)
                const itemLossChance = Math.random();
                if (itemLossChance < 0.1) {
                    const lostItem = this.removeRandomItem(gameState);
                    if (lostItem) {
                        fleeDescription += `📦 Item Lost: ${lostItem}\n`;
                    }
                }
            }

            // Update game state
            gameState.battle.active = false;
            gameState.currentScreen = 'floor';
            gameState.stats.battlesFled = (gameState.stats.battlesFled || 0) + 1;

            // Final status
            fleeDescription += `\n**Current Status:**\n`;
            fleeDescription += `❤️ Health: ${gameState.player.currentHealth}/${playerHero.health}\n`;
            fleeDescription += `💙 Mana: ${gameState.player.currentMana}/${playerHero.mana}\n`;
            fleeDescription += `💰 Gold: ${gameState.player.inventory.gold}\n`;

            const embed = new EmbedBuilder()
                .setTitle('🏃 **FLED FROM BATTLE** 🏃')
                .setDescription(fleeDescription)
                .setColor(0xFFFF00)
                .setFooter({ text: 'You escaped, but at a cost...' })
                .setTimestamp();

            // Add return to floor option
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('flee_result')
                .setPlaceholder('Continue...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return to Floor')
                        .setDescription('Continue exploring')
                        .setValue('return_to_floor')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.info(`User ${gameState.session.userId} fled from ${battleType} battle with ${monster.name}`);

        } catch (error) {
            logger.error('Error handling flee:', error);
            await InputValidation.safeInteractionResponse(interaction, '❌ Flee failed. Please try again.', 'reply');
        }
    }

    /**
     * Check if monster is considered "stronger" for enhanced penalties
     */
    static isStrongerMonster(monster, currentFloor) {
        // Consider monsters stronger if:
        // 1. Floor 5+ monsters
        // 2. Monsters with high health (>50)
        // 3. Monsters with special abilities
        
        if (currentFloor >= 5) return true;
        if (monster.health > 50) return true;
        if (monster.abilities && monster.abilities.length > 2) return true;
        
        return false;
    }

    /**
     * Remove a random item from player inventory
     */
    static removeRandomItem(gameState) {
        const inventory = gameState.player.inventory;
        const allItems = [];
        
        // Collect all items
        if (inventory.weapons && inventory.weapons.length > 0) {
            allItems.push(...inventory.weapons.map(item => ({ type: 'weapons', item })));
        }
        if (inventory.armor && inventory.armor.length > 0) {
            allItems.push(...inventory.armor.map(item => ({ type: 'armor', item })));
        }
        if (inventory.consumables && inventory.consumables.length > 0) {
            allItems.push(...inventory.consumables.map(item => ({ type: 'consumables', item })));
        }
        if (inventory.enhancers && inventory.enhancers.length > 0) {
            allItems.push(...inventory.enhancers.map(item => ({ type: 'enhancers', item })));
        }
        
        if (allItems.length === 0) return null;
        
        // Select random item
        const randomIndex = Math.floor(Math.random() * allItems.length);
        const selectedItem = allItems[randomIndex];
        
        // Remove from inventory
        const itemArray = inventory[selectedItem.type];
        const itemIndex = itemArray.indexOf(selectedItem.item);
        if (itemIndex > -1) {
            itemArray.splice(itemIndex, 1);
            return selectedItem.item.name || selectedItem.item;
        }
        
        return null;
    }
} 