import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from './logger.js';
import { InteractionHelper } from './interactionHelper.js';

/**
 * MenuUtils - Utility for creating standardized select menus with timeouts
 * Automatically applies 30-minute timeouts and consistent properties
 */
export class MenuUtils {
    
    /**
     * Default timeout for all menus (30 minutes)
     */
    static DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    /**
     * Create a standardized string select menu with timeout
     */
    static createSelectMenu(customId, placeholder, options, maxValues = 1, minValues = 1) {
        try {
            const menu = new StringSelectMenuBuilder()
                .setCustomId(customId)
                .setPlaceholder(placeholder)
                .setMaxValues(maxValues)
                .setMinValues(minValues)
                .addOptions(options);

            return menu;
        } catch (error) {
            logger.error('Error creating select menu:', error);
            throw error;
        }
    }

    /**
     * Create a select menu option with validation
     */
    static createOption(label, value, description = null, emoji = null) {
        try {
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setValue(value);

            if (description) {
                option.setDescription(description.substring(0, 100)); // Discord limit
            }

            if (emoji) {
                option.setEmoji(emoji);
            }

            return option;
        } catch (error) {
            logger.error('Error creating select menu option:', error);
            throw error;
        }
    }

    /**
     * Create action row with select menu
     */
    static createActionRow(selectMenu) {
        try {
            return new ActionRowBuilder().addComponents(selectMenu);
        } catch (error) {
            logger.error('Error creating action row:', error);
            throw error;
        }
    }

    /**
     * Create a complete menu setup with timeout collector
     */
    static async createMenuWithCollector(interaction, embed, options, customId, placeholder, userId) {
        try {
            const selectMenu = this.createSelectMenu(customId, placeholder, options);
            const row = this.createActionRow(selectMenu);

            // Send the menu
            const response = await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: false
            });

            // Create collector with 30-minute timeout
            const collector = response.createMessageComponentCollector({
                time: this.DEFAULT_TIMEOUT
            });

            // Handle timeout
            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    try {
                        // Disable the menu on timeout
                        const disabledMenu = StringSelectMenuBuilder.from(selectMenu.data)
                            .setDisabled(true)
                            .setPlaceholder('⏰ This menu has expired');
                        
                        const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);

                        await response.edit({
                            components: [disabledRow]
                        });

                        logger.info(`Menu ${customId} timed out for user ${userId}`);
                    } catch (error) {
                        logger.error('Error handling menu timeout:', error);
                    }
                }
            });

            return { response, collector };
        } catch (error) {
            logger.error('Error creating menu with collector:', error);
            throw error;
        }
    }

    /**
     * Standard menu options for common actions
     */
    static getStandardOptions() {
        return {
            back: this.createOption('🔙 Back', 'back', 'Return to previous screen'),
            cancel: this.createOption('❌ Cancel', 'cancel', 'Cancel current action'),
            confirm: this.createOption('✅ Confirm', 'confirm', 'Confirm current action'),
            inventory: this.createOption('🎒 Inventory', 'inventory', 'Open your inventory'),
            shop: this.createOption('🏪 Shop', 'shop', 'Visit the shop'),
            profile: this.createOption('👤 Profile', 'profile', 'View your profile'),
            return: this.createOption('🔙 Return', 'return', 'Return to previous location')
        };
    }

    /**
     * Create battle action options
     */
    static createBattleOptions(hero, availableWeapons, availableAbilities) {
        const options = [];

        // Add weapon options
        if (availableWeapons && availableWeapons.length > 0) {
            availableWeapons.forEach(weapon => {
                const weaponName = weapon.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                options.push(this.createOption(
                    `⚔️ ${weaponName}`,
                    `weapon_${weapon}`,
                    'Use your weapon to attack',
                    '⚔️'
                ));
            });
        }

        // Add ability options
        if (availableAbilities && availableAbilities.length > 0) {
            availableAbilities.forEach(ability => {
                const abilityName = ability.name || ability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                const manaCost = ability.manaCost || 0;
                const description = manaCost > 0 ? `${ability.description} (${manaCost} mana)` : ability.description;
                
                options.push(this.createOption(
                    `✨ ${abilityName}`,
                    `ability_${ability.id || ability}`,
                    description?.substring(0, 100),
                    '✨'
                ));
            });
        }

        // Add inventory option
        options.push(this.createOption(
            '🎒 Inventory',
            'inventory',
            'Use items or change equipment',
            '🎒'
        ));

        return options;
    }

    /**
     * Create exploration options
     */
    static createExplorationOptions(currentFloor, explorationsRemaining) {
        const options = [];

        if (explorationsRemaining > 0) {
            options.push(this.createOption(
                '🔍 Explore',
                'explore',
                `Search for secrets and treasures (${explorationsRemaining} remaining)`,
                '🔍'
            ));
        }

        options.push(
            this.createOption('🎒 Inventory', 'inventory', 'Manage your items', '🎒'),
            this.createOption('🏪 Shop', 'shop', 'Visit the shop', '🏪'),
            this.createOption('⬆️ Head to Stairs', 'stairs', 'Face the floor boss', '⬆️')
        );

        if (currentFloor > 1) {
            options.push(this.createOption(
                '⬇️ Return to Entrance',
                'return_entrance',
                'Go back to dungeon entrance',
                '⬇️'
            ));
        }

        return options;
    }

    /**
     * Create shop category options
     */
    static createShopOptions() {
        return [
            this.createOption('⚔️ Weapons', 'weapons', 'Browse weapons for sale', '⚔️'),
            this.createOption('🛡️ Armor', 'armor', 'Browse armor for sale', '🛡️'),
            this.createOption('🧪 Consumables', 'consumables', 'Browse potions and consumables', '🧪'),
            this.createOption('💰 Currency Exchange', 'exchange', 'Exchange between currencies', '💰'),
            this.createOption('🔙 Return', 'return', 'Return to previous screen', '🔙')
        ];
    }

    /**
     * Create inventory category options
     */
    static createInventoryOptions(inventoryCounts) {
        return [
            this.createOption(
                '⚔️ Weapons',
                'weapons',
                `Manage weapons (${inventoryCounts.weapons || 0}/20)`,
                '⚔️'
            ),
            this.createOption(
                '🛡️ Armor',
                'armor',
                `Manage armor (${inventoryCounts.armor || 0}/20)`,
                '🛡️'
            ),
            this.createOption(
                '🧪 Consumables',
                'consumables',
                `Use consumables (${inventoryCounts.consumables || 0}/20)`,
                '🧪'
            ),
            this.createOption(
                '💎 Enhancers',
                'enhancers',
                `Use enhancers (${inventoryCounts.enhancers || 0}/20)`,
                '💎'
            ),
            this.createOption('🔙 Return', 'return', 'Return to previous screen', '🔙')
        ];
    }

    /**
     * Validate menu options before creation
     */
    static validateOptions(options) {
        if (!Array.isArray(options) || options.length === 0) {
            throw new Error('Options must be a non-empty array');
        }

        if (options.length > 25) {
            throw new Error('Discord select menus support maximum 25 options');
        }

        // Check for duplicate values
        const values = options.map(opt => opt.data.value);
        const uniqueValues = new Set(values);
        if (values.length !== uniqueValues.size) {
            throw new Error('Duplicate option values detected');
        }

        return true;
    }

    /**
     * Handle menu timeout gracefully
     */
    static async handleTimeout(interaction, customId, userId) {
        try {
            await InteractionHelper.replyWarning(
                interaction,
                InteractionHelper.getTimeoutMessage(),
                true
            );
            
            logger.info(`Menu ${customId} timed out for user ${userId}`);
        } catch (error) {
            logger.error('Error handling menu timeout:', error);
        }
    }
} 