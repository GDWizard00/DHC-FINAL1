import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { embedHistory } from '../../utils/embedHistory.js';

/**
 * DungeonEntranceHandler - Handles the dungeon entrance area
 * Provides options: Look around, Inventory, Store, Enter the Dungeon
 */
class DungeonEntranceHandler {
    
    /**
     * Show the dungeon entrance screen
     */
    static async showDungeonEntrance(interaction, gameState) {
        try {
            // Determine if player has already looked around
            const hasLookedAround = gameState.progress.dungeonEntranceExplored || false;
            
            // Debug logging to see what's happening with the look around flag
            logger.info(`[DUNGEON_ENTRANCE] User ${gameState.session.userId} - hasLookedAround: ${hasLookedAround}, dungeonEntranceExplored: ${gameState.progress.dungeonEntranceExplored}`);
            
            // Get player info
            const playerHero = gameState.selectedHero;
            const playerInventory = gameState.player.inventory;
            
            const embed = new EmbedBuilder()
                .setTitle('🏰 **DUNGEON ENTRANCE** 🏰')
                .setDescription(`You stand before the ancient dungeon entrance. Dark stone walls tower above you, and mysterious shadows dance beyond the threshold.\n\n**${playerHero.name}** prepares for the adventure ahead.\n\n**Health:** ${playerHero.currentHealth || playerHero.health}/${playerHero.health}\n**Mana:** ${playerHero.currentMana || playerHero.mana}/${playerHero.mana}\n**Gold:** ${playerInventory.gold || 0}`)
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1353999603896156200/image.png?ex=67e3b1e5&is=67e26065&hm=2a7e5a31379b1f67c0db80bc6034b2ae6116dc6a6ed65c3d4010b3585c6e440e&=&format=webp&quality=lossless&width=411&height=315')
                .setColor(0x8B4513)
                .setFooter({ text: 'Choose your action at the dungeon entrance' })
                .setTimestamp();

            // Create menu options
            const options = [];

            // Look around option (only if not already explored)
            if (!hasLookedAround) {
                options.push({
                    label: '🔍 Look Around',
                    description: 'Search the entrance area for items or secrets',
                    value: 'look_around',
                    emoji: '🔍'
                });
            }

            // Always available options
            options.push(
                {
                    label: '🎒 Inventory',
                    description: 'Manage your items, equipment, and consumables',
                    value: 'inventory',
                    emoji: '🎒'
                },
                {
                    label: '🛒 Store',
                    description: 'Buy and sell items with the dungeon merchant',
                    value: 'store',
                    emoji: '🛒'
                },
                {
                    label: '⬇️ Enter the Dungeon',
                    description: 'Descend into the depths - Floor 1 awaits!',
                    value: 'enter_dungeon',
                    emoji: '⬇️'
                }
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('dungeon_entrance')
                .setPlaceholder('Choose your action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            gameState.currentScreen = 'dungeon_entrance';
            gameState.currentFloor = 0; // Dungeon entrance
            gameState.updateActivity();

            logger.info(`Dungeon entrance displayed for user ${gameState.playerId}`);

        } catch (error) {
            logger.error('Error showing dungeon entrance:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Error loading dungeon entrance. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle dungeon entrance selections (main entry point from CommandHandler)
     */
    static async handleDungeonEntranceSelection(interaction, gameState, selectedValue) {
        try {
            logger.info(`[DUNGEON_ENTRANCE] User ${gameState.session.userId} selected: ${selectedValue}`);
            await this.handleSelection(interaction, gameState, selectedValue);
        } catch (error) {
            logger.logError(gameState.session.userId, interaction.user.username, error, {
                action: 'dungeon_entrance_selection',
                selectedValue,
                screen: gameState.currentScreen,
                floor: gameState.currentFloor
            });
            // Use CommandHandler's safe interaction response instead of embedHistory
            const { CommandHandler } = await import('../../commands/CommandHandler.js');
            await CommandHandler.safeInteractionResponse(interaction, {
                content: 'An error occurred. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle dungeon entrance selections
     */
    static async handleSelection(interaction, gameState, selectedValue) {
        try {
            switch (selectedValue) {
                case 'look_around':
                    await this.handleLookAround(interaction, gameState);
                    break;
                
                case 'inventory':
                    await this.handleInventory(interaction, gameState);
                    break;
                
                case 'store':
                    await this.handleStore(interaction, gameState);
                    break;
                
                case 'enter_dungeon':
                    await this.handleEnterDungeon(interaction, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown dungeon entrance selection: ${selectedValue}`);
                    await embedHistory.updateWithHistory(interaction, {
                        content: 'Unknown option selected. Please try again.',
                        embeds: [],
                        components: []
                    }, gameState.session.userId);
            }
        } catch (error) {
            logger.error('Error handling dungeon entrance selection:', error);
            throw error;
        }
    }

    /**
     * Handle "Look Around" action - one-time exploration at entrance
     */
    static async handleLookAround(interaction, gameState) {
        try {
            // Check if already explored
            if (gameState.progress.dungeonEntranceExplored) {
                await embedHistory.updateWithHistory(interaction, {
                    content: 'You have already thoroughly searched this area.',
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Mark as explored
            gameState.progress.dungeonEntranceExplored = true;

            // Generate random outcome based on RULES.txt probabilities
            const roll = Math.random() * 100;
            let outcome, rewardText, embed;

            if (roll < 40) {
                // 40% chance of finding nothing
                outcome = 'nothing';
                embed = new EmbedBuilder()
                    .setTitle('🔍 **SEARCH RESULTS** 🔍')
                    .setDescription('You carefully search around the dungeon entrance, checking behind rocks and examining the ancient stonework...\n\n**You found nothing of value.**\n\nPerhaps all the useful items were taken by previous adventurers.')
                    .setImage('https://media.discordapp.net/attachments/1351696887165616169/1356511792045752381/image.png?ex=67ee270d&is=67ecd58d&hm=38754b2fe36861b42f6e827627a146efe9a54e730714e35cfc2c7fce1c7beb6e&=&format=webp&quality=lossless&width=813&height=589')
                    .setColor(0x808080)
                    .setFooter({ text: 'Better luck deeper in the dungeon!' });
                    
                rewardText = 'Nothing found';
                
            } else if (roll < 60) {
                // 20% chance of finding common weapon/consumable/item
                const commonRewards = ['sword', 'health_potion', 'mana_potion', 'leather_armor'];
                const reward = commonRewards[Math.floor(Math.random() * commonRewards.length)];
                
                // Add to inventory
                if (!gameState.player.inventory.consumables) gameState.player.inventory.consumables = [];
                gameState.player.inventory.consumables.push(reward);
                
                outcome = 'item';
                embed = new EmbedBuilder()
                    .setTitle('🔍 **SEARCH RESULTS** 🔍')
                    .setDescription(`You search around the dungeon entrance and discover something useful!\n\n**Found:** ${reward.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\nThis item has been added to your inventory.`)
                    .setColor(0x32CD32)
                    .setFooter({ text: 'A useful discovery!' });
                    
                rewardText = `Found: ${reward}`;
                
            } else {
                // 40% chance of finding keys (1-2) or gold
                const goldOrKeys = Math.random() < 0.5;
                
                if (goldOrKeys) {
                    // Give gold (10-50)
                    const goldAmount = Math.floor(Math.random() * 41) + 10;
                    gameState.player.inventory.gold = (gameState.player.inventory.gold || 0) + goldAmount;
                    
                    outcome = 'gold';
                    embed = new EmbedBuilder()
                        .setTitle('🔍 **SEARCH RESULTS** 🔍')
                        .setDescription(`You search around the dungeon entrance and find a small pouch hidden in a crack!\n\n**Found:** ${goldAmount} Gold\n\nYour total gold: ${gameState.player.inventory.gold}`)
                        .setColor(0xFFD700)
                        .setFooter({ text: 'A valuable discovery!' });
                        
                    rewardText = `Found: ${goldAmount} gold`;
                    
                } else {
                    // Give keys (1-2)
                    const keyAmount = Math.floor(Math.random() * 2) + 1;
                    gameState.player.inventory.keys = (gameState.player.inventory.keys || 0) + keyAmount;
                    
                    outcome = 'keys';
                    embed = new EmbedBuilder()
                        .setTitle('🔍 **SEARCH RESULTS** 🔍')
                        .setDescription(`You search around the dungeon entrance and find some old keys hidden under a loose stone!\n\n**Found:** ${keyAmount} Key${keyAmount > 1 ? 's' : ''}\n\nYour total keys: ${gameState.player.inventory.keys}`)
                        .setColor(0xC0C0C0)
                        .setFooter({ text: 'These might unlock something useful!' });
                        
                    rewardText = `Found: ${keyAmount} keys`;
                }
            }

            // Create return option
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('look_around_result')
                .setPlaceholder('Choose your next action...')
                .addOptions([
                    {
                        label: '🔙 Return to Entrance',
                        description: 'Go back to the dungeon entrance',
                        value: 'return_to_entrance',
                        emoji: '🔙'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            // Log the search result
            logger.logGameOutcome(gameState.session.userId, interaction.user.username, 'entrance_search', {
                outcome,
                reward: rewardText,
                roll: Math.floor(roll)
            });
            
        } catch (error) {
            logger.error('Error handling look around:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to search the area. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle inventory access
     */
    static async handleInventory(interaction, gameState) {
        try {
            const { InventoryHandler } = await import('../inventory/InventoryHandler.js');
            await InventoryHandler.showInventory(interaction, gameState);
            
            logger.info(`User ${gameState.session.userId} accessed inventory from dungeon entrance`);
            
        } catch (error) {
            logger.error('Error showing inventory:', error);
            // Use CommandHandler's safe interaction response instead of embedHistory
            const { CommandHandler } = await import('../../commands/CommandHandler.js');
            await CommandHandler.safeInteractionResponse(interaction, {
                content: 'Failed to access inventory. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle store access
     */
    static async handleStore(interaction, gameState) {
        try {
            const { ShopHandler } = await import('../inventory/ShopHandler.js');
            await ShopHandler.showShop(interaction, gameState);
            
            logger.info(`User ${gameState.session.userId} accessed store from dungeon entrance`);
            
        } catch (error) {
            logger.error('Error showing store:', error);
            // Use CommandHandler's safe interaction response instead of embedHistory
            const { CommandHandler } = await import('../../commands/CommandHandler.js');
            await CommandHandler.safeInteractionResponse(interaction, {
                content: 'Failed to access store. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle entering the dungeon (go to Floor 1)
     */
    static async handleEnterDungeon(interaction, gameState) {
        try {
            // Update game state to Floor 1
            gameState.currentFloor = 1;
            gameState.currentScreen = 'floor';
            gameState.updateActivity();
            
            // Initialize floor exploration count
            gameState.currentFloorExplorations = 0;
            
            const { FloorHandler } = await import('./FloorHandler.js');
            await FloorHandler.showFloor(interaction, gameState);
            
            logger.logGameOutcome(gameState.session.userId, interaction.user.username, 'dungeon_entered', {
                floor: 1,
                hero: gameState.selectedHero?.name
            });
            
        } catch (error) {
            logger.error('Error entering dungeon:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to enter the dungeon. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }
}

export { DungeonEntranceHandler }; 