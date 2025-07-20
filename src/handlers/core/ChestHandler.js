import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { treasureChests, getChestByRarity, generateChestRewards } from '../../data/treasureChestsData.js';
import { monstersData, getMimic } from '../../data/monstersData.js';
import { createChestDiscoveryEmbed, createChestOpeningEmbed } from '../../utils/embedBuilder.js';
import { logger } from '../../utils/logger.js';
import { embedHistory } from '../../utils/embedHistory.js';

/**
 * ChestHandler manages all chest-related interactions
 * Including mysterious chests, mimic encounters, and regular chest opening
 */
export class ChestHandler {
    
    /**
     * Handle discovering a chest during exploration
     */
    static async handleChestDiscovery(interaction, gameState, chestRarity) {
        try {
            const chestData = getChestByRarity(chestRarity);
            if (!chestData) {
                throw new Error(`Invalid chest rarity: ${chestRarity}`);
            }

            // Special handling for mysterious chests
            if (chestRarity === 'mysterious') {
                return await this.handleMysteriousChest(interaction, gameState, chestData);
            }

            // Regular chest discovery
            const embed = createChestDiscoveryEmbed(chestData, gameState);
            
            // Check if player has enough keys
            const canOpen = gameState.inventory.keys >= chestData.keysRequired;
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`chest_action_${chestData.id}`)
                .setPlaceholder('What would you like to do with this chest?');

            if (canOpen) {
                selectMenu.addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`Open Chest (${chestData.keysRequired} keys)`)
                        .setDescription(`Open the ${chestData.name}`)
                        .setValue(`open_chest_${chestData.id}`)
                        .setEmoji('🗝️')
                ]);
            } else {
                selectMenu.addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Cannot Open - Insufficient Keys')
                        .setDescription(`Need ${chestData.keysRequired} keys, you have ${gameState.inventory.keys}`)
                        .setValue('insufficient_keys')
                        .setEmoji('❌')
                ]);
            }

            // Add to inventory option
            selectMenu.addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('Take Chest')
                    .setDescription('Add chest to inventory to open later')
                    .setValue(`take_chest_${chestData.id}`)
                    .setEmoji('🎒'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Leave Chest')
                    .setDescription('Continue exploring without taking the chest')
                    .setValue('leave_chest')
                    .setEmoji('🚶')
            ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.debug(`Chest discovery presented to user ${gameState.playerId}:`, chestData.name);

        } catch (error) {
            logger.error('Error handling chest discovery:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error discovering chest. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle mysterious chest interaction (50% chance of mimic)
     */
    static async handleMysteriousChest(interaction, gameState, chestData) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎭 **MYSTERIOUS CHEST DISCOVERED** 🎭')
                .setDescription(`You've discovered a **${chestData.name}**!\n\n*This chest radiates an otherworldly energy...*\n\n**Warning:** This chest may contain a mimic or valuable treasures. Opening it is risky but potentially rewarding.`)
                .setColor(0x800080)
                .setFooter({ text: 'Choose your action carefully...' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('mysterious_chest_action')
                .setPlaceholder('What would you like to do?')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🗝️ Open Chest')
                        .setDescription('Take the risk and open the mysterious chest')
                        .setValue('open_mysterious_chest')
                        .setEmoji('🗝️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Leave Chest')
                        .setDescription('Leave the chest and continue exploring')
                        .setValue('leave_chest')
                        .setEmoji('🔙')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.debug(`Mysterious chest presented to user ${gameState.playerId}`);

        } catch (error) {
            logger.error('Error handling mysterious chest:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error with mysterious chest. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle mysterious chest opening
     */
    static async handleMysteriousChestOpening(interaction, gameState) {
        try {
            // 60% chance of mimic, 40% chance of treasure
            const isMimic = Math.random() < 0.6;
            
            if (isMimic) {
                // It's a mimic!
                await this.handleMimicEncounter(interaction, gameState);
            } else {
                // It's a real chest with treasure
                const chestRarity = this.getRandomMysteriousChestRarity();
                const rewards = generateChestRewards(chestRarity, gameState.currentFloor);
                
                // Apply rewards
                this.applyChestRewards(gameState, rewards);
                
                const embed = new EmbedBuilder()
                    .setTitle('✨ **MYSTERIOUS CHEST OPENED** ✨')
                    .setDescription(`The mysterious chest was real! You've found valuable treasures!`)
                    .addFields([
                        {
                            name: '🎁 **Rewards Found**',
                            value: rewards.map(reward => `${reward.emoji} **${reward.name}** x${reward.quantity}`).join('\n'),
                            inline: false
                        }
                    ])
                    .setColor(0x00FF00)
                    .setFooter({ text: 'Mysterious chest successfully opened!' })
                    .setTimestamp();

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('chest_opened_action')
                    .setPlaceholder('Continue your adventure...')
                    .setMaxValues(1)
                    .setMinValues(1)
                    .addOptions([
                        new StringSelectMenuOptionBuilder()
                            .setLabel('🔙 Return to Floor')
                            .setDescription('Continue exploring the floor')
                            .setValue('return_to_floor')
                            .setEmoji('🔙')
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await embedHistory.updateWithHistory(interaction, {
                    embeds: [embed],
                    components: [row]
                }, gameState.session.userId);
            }

        } catch (error) {
            logger.error('Error opening mysterious chest:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error opening mysterious chest. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle mimic encounter
     */
    static async handleMimicEncounter(interaction, gameState) {
        try {
            const mimic = getMimic(gameState.currentFloor);
            
            const embed = new EmbedBuilder()
                .setTitle('🧌 **MIMIC ENCOUNTERED!** 🧌')
                .setDescription(`The chest suddenly springs to life! It's a **${mimic.name}**!\n\n*The mimic's teeth gnash menacingly as it prepares to attack!*`)
                .addFields([
                    {
                        name: '👹 **Mimic Stats**',
                        value: `❤️ **Health:** ${mimic.health}\n⚔️ **Attack:** ${mimic.attack}\n🛡️ **Defense:** ${mimic.defense}`,
                        inline: true
                    },
                    {
                        name: '⚡ **Your Options**',
                        value: '🗡️ **Fight:** Battle the mimic\n🏃 **Flee:** Escape from the mimic',
                        inline: true
                    }
                ])
                .setColor(0xFF0000)
                .setFooter({ text: 'Choose your action quickly!' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('mimic_action')
                .setPlaceholder('What would you like to do?')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Fight Mimic')
                        .setDescription('Battle the mimic creature')
                        .setValue('fight_mimic')
                        .setEmoji('⚔️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏃 Flee')
                        .setDescription('Escape from the mimic')
                        .setValue('flee_mimic')
                        .setEmoji('🏃')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            // Store mimic data for battle
            gameState.currentMimic = mimic;

            logger.debug(`Mimic encounter presented to user ${gameState.playerId}:`, mimic.name);

        } catch (error) {
            logger.error('Error handling mimic encounter:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error with mimic encounter. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle regular chest opening
     */
    static async handleRegularChestOpening(interaction, gameState, chestId) {
        try {
            const chestData = getChestByRarity(chestId);
            if (!chestData) {
                throw new Error(`Invalid chest ID: ${chestId}`);
            }

            // Check if player has enough keys
            if (gameState.inventory.keys < chestData.keysRequired) {
                await embedHistory.updateWithHistory(interaction, {
                    content: `❌ You need ${chestData.keysRequired} keys to open this chest, but you only have ${gameState.inventory.keys}.`,
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Deduct keys
            gameState.inventory.keys -= chestData.keysRequired;

            // Generate rewards
            const rewards = generateChestRewards(chestData.rarity, gameState.currentFloor);
            
            // Apply rewards
            this.applyChestRewards(gameState, rewards);

            const embed = createChestOpeningEmbed(chestData, rewards, gameState);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('chest_opened_action')
                .setPlaceholder('Continue your adventure...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return to Floor')
                        .setDescription('Continue exploring the floor')
                        .setValue('return_to_floor')
                        .setEmoji('🔙')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.debug(`Regular chest opened by user ${gameState.playerId}:`, chestData.name);

        } catch (error) {
            logger.error('Error opening regular chest:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error opening chest. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle taking chest without opening
     */
    static async handleTakeChest(interaction, gameState, chestId) {
        try {
            const chestData = getChestByRarity(chestId);
            if (!chestData) {
                throw new Error(`Invalid chest ID: ${chestId}`);
            }

            // Check inventory space
            if (!gameState.inventory.chests) {
                gameState.inventory.chests = [];
            }

            if (gameState.inventory.chests.length >= 10) {
                await embedHistory.updateWithHistory(interaction, {
                    content: '❌ Your chest inventory is full! You can only carry 10 chests at a time.',
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Add chest to inventory
            gameState.inventory.chests.push({
                id: chestData.id,
                name: chestData.name,
                rarity: chestData.rarity,
                keysRequired: chestData.keysRequired,
                foundFloor: gameState.currentFloor,
                foundDate: new Date()
            });

            const embed = new EmbedBuilder()
                .setTitle('📦 **CHEST TAKEN** 📦')
                .setDescription(`You've taken the **${chestData.name}** with you!\n\nYou can open it later from your inventory when you have enough keys.`)
                .addFields([
                    {
                        name: '🗝️ **Keys Required**',
                        value: `${chestData.keysRequired} keys needed to open`,
                        inline: true
                    },
                    {
                        name: '📦 **Chest Inventory**',
                        value: `${gameState.inventory.chests.length}/10 chests`,
                        inline: true
                    }
                ])
                .setColor(0x8B4513)
                .setFooter({ text: 'Chest added to inventory!' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('chest_taken_action')
                .setPlaceholder('Continue your adventure...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return to Floor')
                        .setDescription('Continue exploring the floor')
                        .setValue('return_to_floor')
                        .setEmoji('🔙')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.debug(`Chest taken by user ${gameState.playerId}:`, chestData.name);

        } catch (error) {
            logger.error('Error taking chest:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error taking chest. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Apply chest rewards to game state
     */
    static applyChestRewards(gameState, rewards) {
        // Add gold
        if (rewards.gold > 0) {
            gameState.inventory.gold += rewards.gold;
            gameState.addCurrency('gold', rewards.gold);
        }

        // Add keys
        if (rewards.keys > 0) {
            gameState.inventory.keys = Math.min(gameState.inventory.keys + rewards.keys, 100);
        }

        // Add items (would need item generation logic)
        // This would be expanded to generate actual items based on rarity

        // Add consumables
        if (rewards.consumables && rewards.consumables.length > 0) {
            for (const consumable of rewards.consumables) {
                const existingItem = gameState.inventory.consumables.find(item => item.name === consumable);
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    gameState.inventory.consumables.push({
                        name: consumable,
                        quantity: 1,
                        type: 'consumable'
                    });
                }
            }
        }

        // Update progress tracking
        gameState.progress.totalLootFound = (gameState.progress.totalLootFound || 0) + 1;
        gameState.updateActivity();
    }

    /**
     * Get random chest rarity for mysterious chest rewards
     */
    static getRandomMysteriousChestRarity() {
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
        const weights = [25, 25, 20, 15, 10, 5]; // Weighted chances
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < rarities.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return rarities[i];
            }
        }
        
        return 'common'; // Fallback
    }
}

export default ChestHandler; 