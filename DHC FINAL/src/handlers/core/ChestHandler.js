import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { treasureChests, getChestByRarity, generateChestRewards } from '../../data/treasureChestsData.js';
import { monstersData, getMimic } from '../../data/monstersData.js';
import { createChestDiscoveryEmbed, createChestOpeningEmbed } from '../../utils/embedBuilder.js';
import { logger } from '../../utils/logger.js';

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

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.debug(`Chest discovery presented to user ${gameState.playerId}:`, chestData.name);

        } catch (error) {
            logger.error('Error in handleChestDiscovery:', error);
            throw error;
        }
    }

    /**
     * Handle mysterious chest interaction (50% chance of mimic)
     */
    static async handleMysteriousChest(interaction, gameState, chestData) {
        const embed = new EmbedBuilder()
            .setTitle('📦 MYSTERIOUS CHEST!')
            .setDescription(
                '**You discover a mysterious chest...**\n\n' +
                'This chest radiates an strange aura. It requires no keys to open,\n' +
                'but something feels... off about it.\n\n' +
                'Will you risk opening it? Or take it with you for later?'
            )
            .setImage(chestData.imageUrl)
            .setColor('#f39c12')
            .setFooter({ text: 'Mysterious chests can contain great rewards... or great danger!' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('mysterious_chest_action')
            .setPlaceholder('What will you do with this mysterious chest?')
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('Open Immediately')
                    .setDescription('Take the risk and open it now')
                    .setValue('open_mysterious_now')
                    .setEmoji('⚡'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Take Chest')
                    .setDescription('Add to inventory for later (still risky when opened)')
                    .setValue('take_mysterious_chest')
                    .setEmoji('🎒'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Leave It Alone')
                    .setDescription('Sometimes discretion is the better part of valor...')
                    .setValue('leave_mysterious')
                    .setEmoji('🚶')
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Handle opening a mysterious chest (mimic check)
     */
    static async handleMysteriousChestOpening(interaction, gameState) {
        const isMimic = Math.random() < 0.5; // 50% chance

        if (isMimic) {
            // It's a mimic! Start battle
            return await this.handleMimicEncounter(interaction, gameState);
        } else {
            // Real chest with random rarity rewards
            const rewardRarity = this.getRandomMysteriousChestRarity();
            const chestData = getChestByRarity(rewardRarity);
            const rewards = generateChestRewards(chestData, gameState.currentFloor);

            // Apply rewards to player
            this.applyChestRewards(gameState, rewards);

            const embed = new EmbedBuilder()
                .setTitle('✨ MYSTERIOUS CHEST OPENED!')
                .setDescription(
                    '**The mysterious chest reveals its treasures!**\n\n' +
                    'Your courage has been rewarded! The chest contained valuable items.\n\n' +
                    `**Equivalent to: ${chestData.name}**`
                )
                .setImage(chestData.imageUrl)
                .setColor('#2ecc71');

            // Add rewards to embed
            let rewardsText = '';
            if (rewards.gold > 0) rewardsText += `🪙 ${rewards.gold} Gold\n`;
            if (rewards.keys > 0) rewardsText += `🗝️ ${rewards.keys} Keys\n`;
            if (rewards.items && rewards.items.length > 0) {
                rewardsText += `📦 ${rewards.items.length} Items\n`;
            }
            if (rewards.consumables && rewards.consumables.length > 0) {
                rewardsText += `🧪 ${rewards.consumables.length} Consumables\n`;
            }

            embed.addFields([{
                name: '🎁 Rewards Gained',
                value: rewardsText || 'Nothing... that\'s unfortunate!',
                inline: false
            }]);

            // Return to exploration menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('post_chest_action')
                .setPlaceholder('What would you like to do next?')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Continue Exploring')
                        .setDescription('Look for more treasures on this floor')
                        .setValue('continue_exploring')
                        .setEmoji('🔍'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Check Inventory')
                        .setDescription('View your items and equipment')
                        .setValue('open_inventory')
                        .setEmoji('🎒'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Head to Stairs')
                        .setDescription('Seek the floor boss')
                        .setValue('head_to_stairs')
                        .setEmoji('🪜')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Player ${gameState.playerId} opened mysterious chest, received rewards:`, rewards);
        }
    }

    /**
     * Handle mimic encounter when mysterious chest is a mimic
     */
    static async handleMimicEncounter(interaction, gameState) {
        // Get mimic data
        const mimic = { ...monsters.mimic };
        
        // Set up battle state
        gameState.battle = {
            active: true,
            monster: mimic,
            playerLastMove: null,
            monsterLastMove: null,
            turnCount: 1,
            playerEffects: [...gameState.hero.activeEffects],
            monsterEffects: []
        };

        const embed = new EmbedBuilder()
            .setTitle('🎭 MIMIC ENCOUNTER!')
            .setDescription(
                '**The chest was a trap!**\n\n' +
                'As you reach for the chest, it suddenly springs open revealing rows of sharp teeth!\n' +
                'A Mimic has been lying in wait, and now you must fight for your life!\n\n' +
                '**The battle begins!**'
            )
            .setImage('https://media.discordapp.net/attachments/1351696887165616169/1354339210370220042/image.png?ex=67e4ee2e&is=67e39cae&hm=97cb02a715f7793c551160f522a4999662531d2c10fd02e93152ff89be3978b8&=&format=webp&quality=lossless&width=808&height=581')
            .setColor('#e74c3c')
            .addFields([
                {
                    name: `⚔️ ${gameState.hero.name}`,
                    value: `❤️ ${gameState.hero.health}/${gameState.hero.maxHealth} HP\n` +
                          `🔮 ${gameState.hero.mana}/${gameState.hero.maxMana} MP\n` +
                          `🛡️ ${gameState.hero.armor} Armor`,
                    inline: true
                },
                {
                    name: `🎭 ${mimic.name}`,
                    value: `❤️ ${mimic.health}/${mimic.maxHealth} HP\n` +
                          `🔮 ${mimic.mana}/${mimic.maxMana} MP\n` +
                          `🛡️ ${mimic.armor} Armor`,
                    inline: true
                }
            ]);

        // Create battle action menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('battle_action')
            .setPlaceholder('Choose your battle action');

        // Add weapon options
        if (gameState.hero.currentWeapon) {
            selectMenu.addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel(gameState.hero.currentWeapon.name)
                    .setDescription(`Use your ${gameState.hero.currentWeapon.name}`)
                    .setValue(`weapon_${gameState.hero.currentWeapon.id}`)
                    .setEmoji('⚔️')
            ]);
        }

        // Add ability options (based on hero)
        // This would be populated based on the hero's available abilities

        selectMenu.addOptions([
            new StringSelectMenuOptionBuilder()
                .setLabel('Inventory')
                .setDescription('Use an item from your inventory')
                .setValue('battle_inventory')
                .setEmoji('🎒')
        ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });

        // Update game state
        gameState.currentScreen = 'battle';

        logger.info(`Player ${gameState.playerId} encountered a mimic on floor ${gameState.currentFloor}`);
    }

    /**
     * Handle regular chest opening
     */
    static async handleRegularChestOpening(interaction, gameState, chestId) {
        try {
            const chestData = getChestByRarity(chestId.replace('_chest', ''));
            if (!chestData) {
                throw new Error(`Invalid chest ID: ${chestId}`);
            }

            // Check if player has enough keys
            if (gameState.inventory.keys < chestData.keysRequired) {
                const embed = new EmbedBuilder()
                    .setTitle('🗝️ INSUFFICIENT KEYS')
                    .setDescription(
                        `You need ${chestData.keysRequired} keys to open this ${chestData.name}.\n` +
                        `You currently have ${gameState.inventory.keys} keys.\n\n` +
                        'Find more keys by exploring or defeating monsters!'
                    )
                    .setColor('#e74c3c');

                await interaction.update({ embeds: [embed], components: [] });
                return;
            }

            // Deduct keys
            gameState.inventory.keys -= chestData.keysRequired;

            // Generate rewards
            const rewards = generateChestRewards(chestData, gameState.currentFloor);

            // Apply rewards
            this.applyChestRewards(gameState, rewards);

            // Create success embed
            const embed = createChestOpeningEmbed(chestData, rewards);

            // Create next action menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('post_chest_action')
                .setPlaceholder('What would you like to do next?')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Continue Exploring')
                        .setDescription('Look for more treasures on this floor')
                        .setValue('continue_exploring')
                        .setEmoji('🔍'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Check Inventory')
                        .setDescription('View your new items')
                        .setValue('open_inventory')
                        .setEmoji('🎒'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Head to Stairs')
                        .setDescription('Seek the floor boss')
                        .setValue('head_to_stairs')
                        .setEmoji('🪜')
                ]);

            if (gameState.currentFloor > 0) {
                selectMenu.addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Return to Previous Floor')
                        .setDescription(`Go back to Floor ${gameState.currentFloor - 1}`)
                        .setValue('return_previous_floor')
                        .setEmoji('⬆️')
                ]);
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Player ${gameState.playerId} opened ${chestData.name}, rewards:`, rewards);

        } catch (error) {
            logger.error('Error in handleRegularChestOpening:', error);
            throw error;
        }
    }

    /**
     * Handle taking a chest to inventory
     */
    static async handleTakeChest(interaction, gameState, chestId) {
        try {
            const chestData = getChestByRarity(chestId.replace('_chest', ''));
            
            // Check inventory space
            if (gameState.inventory.chests.length >= 20) {
                const embed = new EmbedBuilder()
                    .setTitle('🎒 INVENTORY FULL')
                    .setDescription(
                        'Your chest storage is full! (20/20)\n\n' +
                        'You must open or discard some chests before taking new ones.'
                    )
                    .setColor('#e74c3c');

                await interaction.update({ embeds: [embed], components: [] });
                return;
            }

            // Add chest to inventory
            gameState.inventory.chests.push({
                id: chestData.id,
                name: chestData.name,
                rarity: chestData.rarity,
                foundOnFloor: gameState.currentFloor,
                foundAt: Date.now()
            });

            const embed = new EmbedBuilder()
                .setTitle('🎒 CHEST TAKEN')
                .setDescription(
                    `**${chestData.name} added to inventory!**\n\n` +
                    'You carefully store the chest in your pack.\n' +
                    'You can open it later from your inventory when you have enough keys.\n\n' +
                    `**Chests in inventory: ${gameState.inventory.chests.length}/20**`
                )
                .setThumbnail(chestData.imageUrl)
                .setColor('#3498db');

            // Return to exploration menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('post_chest_action')
                .setPlaceholder('What would you like to do next?')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Continue Exploring')
                        .setDescription('Look for more treasures on this floor')
                        .setValue('continue_exploring')
                        .setEmoji('🔍'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Check Inventory')
                        .setDescription('View your items and chests')
                        .setValue('open_inventory')
                        .setEmoji('🎒'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Head to Stairs')
                        .setDescription('Seek the floor boss')
                        .setValue('head_to_stairs')
                        .setEmoji('🪜')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.debug(`Player ${gameState.playerId} took ${chestData.name} to inventory`);

        } catch (error) {
            logger.error('Error in handleTakeChest:', error);
            throw error;
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