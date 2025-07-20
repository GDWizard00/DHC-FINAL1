import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';

/**
 * PortalHandler - Manages portal access to Profile Chest and Adventure Chest
 * Handles loot separation between permanent profile storage and temporary adventure storage
 */
export class PortalHandler {
    
    /**
     * Show portal access menu
     */
    static async showPortalMenu(interaction, gameState) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🚪 **PORTAL ACCESS** 🚪')
                .setDescription(
                    '**Welcome to the Portal System!**\n\n' +
                    '🏛️ **Profile Chest** - Permanent storage for items to sell at marketplace\n' +
                    '⚔️ **Adventure Chest** - Current session loot (lost if you die)\n' +
                    '🔄 **Return to Game** - Continue your dungeon adventure\n\n' +
                    '**Important:** Items in your Adventure Chest will be lost if you die!\n' +
                    'Transfer valuable items to your Profile Chest for safekeeping.\n\n' +
                    '*Choose an option:*'
                )
                .setColor(0x9932cc)
                .setFooter({ text: 'Portal System • Manage your loot safely' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('portal_menu')
                .setPlaceholder('Choose a portal option...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏛️ Profile Chest')
                        .setDescription('Permanent storage - safe from death')
                        .setValue('profile_chest'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Adventure Chest')
                        .setDescription('Current session loot - lost on death')
                        .setValue('adventure_chest'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔄 Return to Game')
                        .setDescription('Continue your dungeon adventure')
                        .setValue('return_to_game')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Portal menu shown to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing portal menu:', error);
            await interaction.update({
                content: '❌ Error loading portal menu. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle portal menu selections
     */
    static async handlePortalSelection(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'profile_chest':
                    await this.showProfileChest(interaction, gameState);
                    break;
                case 'adventure_chest':
                    await this.showAdventureChest(interaction, gameState);
                    break;
                case 'return_to_game':
                    await this.returnToGame(interaction, gameState);
                    break;
                default:
                    logger.warn(`Unknown portal selection: ${selectedValue}`);
                    await interaction.update({
                        content: '❌ Unknown portal option selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling portal selection:', error);
            await interaction.update({
                content: '❌ Error processing portal selection. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Profile Chest (permanent storage)
     */
    static async showProfileChest(interaction, gameState) {
        try {
            // Get player's profile chest from database
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const profileChest = playerData?.profileChest || {
                weapons: [],
                armor: [],
                consumables: [],
                scrolls: [],
                shards: [],
                enhancers: []
            };

            let description = `**🏛️ PROFILE CHEST (Permanent Storage)**\n\n`;
            description += `**Safe from death - Items here are permanent**\n\n`;

            // Count items in each category
            const weaponCount = profileChest.weapons?.length || 0;
            const armorCount = profileChest.armor?.length || 0;
            const consumableCount = profileChest.consumables?.length || 0;
            const scrollCount = profileChest.scrolls?.length || 0;
            const shardCount = profileChest.shards?.length || 0;
            const enhancerCount = profileChest.enhancers?.length || 0;

            description += `**📦 Storage Summary:**\n`;
            description += `⚔️ Weapons: ${weaponCount}\n`;
            description += `🛡️ Armor: ${armorCount}\n`;
            description += `🧪 Consumables: ${consumableCount}\n`;
            description += `📜 Scrolls: ${scrollCount}\n`;
            description += `💎 Shards: ${shardCount}\n`;
            description += `✨ Enhancers: ${enhancerCount}\n\n`;

            if (weaponCount + armorCount + consumableCount + scrollCount + shardCount + enhancerCount === 0) {
                description += `*Your Profile Chest is empty.*\n\n`;
            } else {
                description += `*Use the options below to manage your items.*\n\n`;
            }

            description += `*Choose an action:*`;

            const embed = new EmbedBuilder()
                .setTitle('🏛️ **PROFILE CHEST** 🏛️')
                .setDescription(description)
                .setColor(0x4169e1)
                .setFooter({ text: 'Profile Chest • Permanent Storage' })
                .setTimestamp();

            const options = [];

            // Add transfer options if player has items in adventure chest
            const adventureChest = gameState.player?.inventory || {};
            if (adventureChest.weapons?.length > 0 || adventureChest.armor?.length > 0) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📥 Transfer from Adventure Chest')
                        .setDescription('Move items from adventure to profile chest')
                        .setValue('transfer_to_profile')
                );
            }

            // Add view/manage options if profile chest has items
            if (weaponCount + armorCount + consumableCount + scrollCount + shardCount + enhancerCount > 0) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('👁️ View Items')
                        .setDescription('See detailed list of your items')
                        .setValue('view_profile_items'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📤 Transfer to Adventure Chest')
                        .setDescription('Move items to adventure chest for use')
                        .setValue('transfer_to_adventure')
                );
            }

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Portal')
                    .setDescription('Return to portal menu')
                    .setValue('back_to_portal')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('profile_chest_actions')
                .setPlaceholder('Choose an action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Profile chest shown to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing profile chest:', error);
            await interaction.update({
                content: '❌ Error loading profile chest. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Adventure Chest (temporary session storage)
     */
    static async showAdventureChest(interaction, gameState) {
        try {
            const adventureChest = gameState.player?.inventory || {};

            let description = `**⚔️ ADVENTURE CHEST (Current Session)**\n\n`;
            description += `**⚠️ WARNING: Lost if you die in the dungeon!**\n\n`;

            // Count items in each category
            const weaponCount = adventureChest.weapons?.length || 0;
            const armorCount = adventureChest.armor?.length || 0;
            const consumableCount = adventureChest.consumables?.length || 0;
            const scrollCount = adventureChest.scrolls?.length || 0;
            const shardCount = adventureChest.shards?.length || 0;
            const chestCount = adventureChest.chests?.length || 0;
            const keys = adventureChest.keys || 0;
            const gold = adventureChest.gold || 0;

            description += `**📦 Current Loot:**\n`;
            description += `⚔️ Weapons: ${weaponCount}\n`;
            description += `🛡️ Armor: ${armorCount}\n`;
            description += `🧪 Consumables: ${consumableCount}\n`;
            description += `📜 Scrolls: ${scrollCount}\n`;
            description += `💎 Shards: ${shardCount}\n`;
            description += `📦 Chests: ${chestCount}\n`;
            description += `🗝️ Keys: ${keys}\n`;
            description += `🪙 Gold: ${gold}\n\n`;

            if (weaponCount + armorCount + consumableCount + scrollCount + shardCount + chestCount === 0) {
                description += `*Your Adventure Chest is empty.*\n\n`;
            } else {
                description += `*Transfer valuable items to Profile Chest for safety!*\n\n`;
            }

            description += `*Choose an action:*`;

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **ADVENTURE CHEST** ⚔️')
                .setDescription(description)
                .setColor(0xff6347)
                .setFooter({ text: 'Adventure Chest • Lost on Death!' })
                .setTimestamp();

            const options = [];

            // Add transfer options if player has items
            if (weaponCount + armorCount + consumableCount + scrollCount + shardCount > 0) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📤 Transfer to Profile Chest')
                        .setDescription('Move items to permanent storage')
                        .setValue('transfer_to_profile'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('👁️ View Items')
                        .setDescription('See detailed list of your loot')
                        .setValue('view_adventure_items')
                );
            }

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Portal')
                    .setDescription('Return to portal menu')
                    .setValue('back_to_portal')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('adventure_chest_actions')
                .setPlaceholder('Choose an action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Adventure chest shown to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing adventure chest:', error);
            await interaction.update({
                content: '❌ Error loading adventure chest. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Return to game from portal
     */
    static async returnToGame(interaction, gameState) {
        try {
            // Return player to their current game state
            if (gameState.currentFloor === 0) {
                const { DungeonEntranceHandler } = await import('./DungeonEntranceHandler.js');
                await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
            } else {
                const { FloorHandler } = await import('./FloorHandler.js');
                await FloorHandler.showFloor(interaction, gameState);
            }

            logger.info(`User ${interaction.user.id} returned to game from portal`);

        } catch (error) {
            logger.error('Error returning to game:', error);
            await interaction.update({
                content: '❌ Error returning to game. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle profile chest actions
     */
    static async handleProfileChestAction(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'transfer_to_profile':
                    await this.showTransferToProfile(interaction, gameState);
                    break;
                case 'view_profile_items':
                    await this.showProfileItems(interaction, gameState);
                    break;
                case 'transfer_to_adventure':
                    await this.showTransferToAdventure(interaction, gameState);
                    break;
                case 'back_to_portal':
                    await this.showPortalMenu(interaction, gameState);
                    break;
                default:
                    logger.warn(`Unknown profile chest action: ${selectedValue}`);
                    await interaction.update({
                        content: '❌ Unknown action selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling profile chest action:', error);
            await interaction.update({
                content: '❌ Error processing action. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle adventure chest actions
     */
    static async handleAdventureChestAction(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'transfer_to_profile':
                    await this.showTransferToProfile(interaction, gameState);
                    break;
                case 'view_adventure_items':
                    await this.showAdventureItems(interaction, gameState);
                    break;
                case 'back_to_portal':
                    await this.showPortalMenu(interaction, gameState);
                    break;
                default:
                    logger.warn(`Unknown adventure chest action: ${selectedValue}`);
                    await interaction.update({
                        content: '❌ Unknown action selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling adventure chest action:', error);
            await interaction.update({
                content: '❌ Error processing action. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show transfer to profile interface
     */
    static async showTransferToProfile(interaction, gameState) {
        try {
            await interaction.update({
                content: '🚧 Transfer system coming soon! This will allow you to move items between chests.',
                embeds: [],
                components: []
            });
        } catch (error) {
            logger.error('Error showing transfer to profile:', error);
        }
    }

    /**
     * Show transfer to adventure interface
     */
    static async showTransferToAdventure(interaction, gameState) {
        try {
            await interaction.update({
                content: '🚧 Transfer system coming soon! This will allow you to move items between chests.',
                embeds: [],
                components: []
            });
        } catch (error) {
            logger.error('Error showing transfer to adventure:', error);
        }
    }

    /**
     * Show profile items detailed view
     */
    static async showProfileItems(interaction, gameState) {
        try {
            await interaction.update({
                content: '🚧 Detailed item view coming soon! This will show all your profile chest items.',
                embeds: [],
                components: []
            });
        } catch (error) {
            logger.error('Error showing profile items:', error);
        }
    }

    /**
     * Show adventure items detailed view
     */
    static async showAdventureItems(interaction, gameState) {
        try {
            await interaction.update({
                content: '🚧 Detailed item view coming soon! This will show all your adventure chest items.',
                embeds: [],
                components: []
            });
        } catch (error) {
            logger.error('Error showing adventure items:', error);
        }
    }
} 