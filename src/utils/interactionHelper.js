import { EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from './logger.js';
import { embedHistory } from './embedHistory.js';

/**
 * InteractionHelper - Centralized interaction response management
 * Provides consistent error handling, embed styling, and response methods
 */
export class InteractionHelper {
    
    /**
     * Standard error embed color
     */
    static ERROR_COLOR = 0xFF0000;
    
    /**
     * Standard success embed color
     */
    static SUCCESS_COLOR = 0x00FF00;
    
    /**
     * Standard info embed color
     */
    static INFO_COLOR = 0x0099FF;
    
    /**
     * Standard warning embed color
     */
    static WARNING_COLOR = 0xFFAA00;

    /**
     * Send error embed response
     */
    static async replyError(interaction, message, ephemeral = false) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(message)
                .setColor(this.ERROR_COLOR)
                .setTimestamp();

            const responseData = {
                embeds: [embed],
                ephemeral: ephemeral
            };

            return await this.safeResponse(interaction, responseData, 'reply');
        } catch (error) {
            logger.error('Error sending error response:', error);
            return false;
        }
    }

    /**
     * Send success embed response
     */
    static async replySuccess(interaction, message, ephemeral = false) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('✅ Success')
                .setDescription(message)
                .setColor(this.SUCCESS_COLOR)
                .setTimestamp();

            const responseData = {
                embeds: [embed],
                ephemeral: ephemeral
            };

            return await this.safeResponse(interaction, responseData, 'reply');
        } catch (error) {
            logger.error('Error sending success response:', error);
            return false;
        }
    }

    /**
     * Send info embed response
     */
    static async replyInfo(interaction, title, message, ephemeral = false) {
        try {
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(message)
                .setColor(this.INFO_COLOR)
                .setTimestamp();

            const responseData = {
                embeds: [embed],
                ephemeral: ephemeral
            };

            return await this.safeResponse(interaction, responseData, 'reply');
        } catch (error) {
            logger.error('Error sending info response:', error);
            return false;
        }
    }

    /**
     * Send warning embed response
     */
    static async replyWarning(interaction, message, ephemeral = false) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Warning')
                .setDescription(message)
                .setColor(this.WARNING_COLOR)
                .setTimestamp();

            const responseData = {
                embeds: [embed],
                ephemeral: ephemeral
            };

            return await this.safeResponse(interaction, responseData, 'reply');
        } catch (error) {
            logger.error('Error sending warning response:', error);
            return false;
        }
    }

    /**
     * Send custom embed response
     */
    static async replyEmbed(interaction, embed, components = [], ephemeral = false) {
        try {
            const responseData = {
                embeds: [embed],
                components: components,
                ephemeral: ephemeral
            };

            return await this.safeResponse(interaction, responseData, 'reply');
        } catch (error) {
            logger.error('Error sending embed response:', error);
            return false;
        }
    }

    /**
     * Update interaction with embed history preservation
     */
    static async updateWithHistory(interaction, responseData, userId) {
        try {
            return await embedHistory.updateWithHistory(interaction, responseData, userId);
        } catch (error) {
            logger.error('Error updating with history:', error);
            return false;
        }
    }

    /**
     * Safe interaction response with multiple fallback methods
     */
    static async safeResponse(interaction, responseData, method = 'reply') {
        try {
            // Check if interaction is still valid
            if (!interaction || !interaction.isRepliable()) {
                logger.warn('Interaction is not repliable');
                return false;
            }

            // Check if interaction token is still valid (interactions expire after 15 minutes)
            const now = Date.now();
            const interactionAge = now - interaction.createdTimestamp;
            const maxAge = 14 * 60 * 1000; // 14 minutes to be safe

            if (interactionAge > maxAge) {
                logger.warn('Interaction token expired, cannot respond');
                return false;
            }

            // Execute the appropriate response method
            switch (method) {
                case 'reply':
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply(responseData);
                    } else {
                        await interaction.followUp(responseData);
                    }
                    break;
                    
                case 'update':
                    if (!interaction.replied) {
                        await interaction.update(responseData);
                    } else {
                        await interaction.followUp(responseData);
                    }
                    break;
                    
                case 'followUp':
                    await interaction.followUp(responseData);
                    break;
                    
                case 'editReply':
                    if (interaction.replied) {
                        await interaction.editReply(responseData);
                    } else {
                        await interaction.reply(responseData);
                    }
                    break;
                    
                default:
                    logger.warn(`Unknown response method: ${method}`);
                    await interaction.followUp(responseData);
            }

            return true;

        } catch (error) {
            logger.error(`Failed to ${method} interaction:`, error);
            
            // Last resort fallback
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ An error occurred processing your request.', 
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (fallbackError) {
                logger.error('Even fallback response failed:', fallbackError);
            }
            
            return false;
        }
    }

    /**
     * Validate interaction before processing
     */
    static validateInteraction(interaction) {
        if (!interaction) {
            logger.error('Interaction is null or undefined');
            return false;
        }

        if (!interaction.isRepliable()) {
            logger.error('Interaction is not repliable');
            return false;
        }

        return true;
    }

    /**
     * Create standard "inventory full" error message
     */
    static getInventoryFullMessage(itemType) {
        return `❌ **Inventory Full!** Your ${itemType} inventory is full (20/20). Please make space before continuing.`;
    }

    /**
     * Create standard "insufficient funds" error message
     */
    static getInsufficientFundsMessage(required, available, currency = 'gold') {
        return `❌ **Insufficient ${currency.toUpperCase()}!** You need ${required} ${currency} but only have ${available}.`;
    }

    /**
     * Create standard "item not found" error message
     */
    static getItemNotFoundMessage(itemName) {
        return `❌ **Item Not Found!** ${itemName} could not be found in your inventory.`;
    }

    /**
     * Create standard "hero not unlocked" error message
     */
    static getHeroNotUnlockedMessage(heroName, requiredFloor) {
        return `🔒 **Hero Locked!** ${heroName} is not yet unlocked. Reach floor ${requiredFloor} to unlock this hero.`;
    }

    /**
     * Create standard "game state error" message
     */
    static getGameStateErrorMessage() {
        return `❌ **Game State Error!** There was an issue with your game data. Please use \`/ch\` to restart or \`/chload\` to recover your saved game.`;
    }

    /**
     * Create standard "timeout" message
     */
    static getTimeoutMessage() {
        return `⏰ **Interaction Timeout!** This menu has expired. Please use \`/ch\` to start a new session or \`/chload\` for crash recovery.`;
    }

    /**
     * Create standard "no permission" message
     */
    static getNoPermissionMessage() {
        return `🚫 **No Permission!** You don't have permission to use this command.`;
    }

    /**
     * Create standard "maintenance" message
     */
    static getMaintenanceMessage() {
        return `🔧 **Maintenance Mode!** The bot is currently under maintenance. Please try again later.`;
    }

    /**
     * Create standard "feature not implemented" message
     */
    static getFeatureNotImplementedMessage(featureName) {
        return `🚧 **Coming Soon!** ${featureName} is not yet implemented but will be available in a future update.`;
    }
} 