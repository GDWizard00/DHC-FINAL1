/**
 * EmbedHistory - Manages Discord embed history to preserve player action history
 * Creates new embeds instead of editing old ones, disables old interaction components
 */

import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { logger } from './logger.js';

class EmbedHistory {
    constructor() {
        // Track active interactions by user ID
        this.activeInteractions = new Map();
        // Track disabled interactions by user ID
        this.disabledInteractions = new Map();
    }

    /**
     * Send a new embed while preserving history
     * @param {Object} interaction - Discord interaction
     * @param {Object} embedData - Embed and component data
     * @param {String} userId - User ID
     * @returns {Promise<void>}
     */
    async sendWithHistory(interaction, embedData, userId) {
        try {
            // Disable previous interaction components for this user
            await this.disablePreviousInteraction(userId);

            // Send new embed
            const response = await interaction.reply({
                embeds: embedData.embeds || [],
                components: embedData.components || [],
                ephemeral: false
            });

            // Track this interaction
            this.activeInteractions.set(userId, {
                interaction: response,
                timestamp: Date.now(),
                components: embedData.components || []
            });

            logger.info(`Sent new embed with history preservation for user ${userId}`);
        } catch (error) {
            logger.error('Error sending embed with history:', error);
            throw error;
        }
    }

    /**
     * Update interaction with new embed (creates new message)
     * @param {Object} interaction - Discord interaction
     * @param {Object} embedData - Embed and component data
     * @param {String} userId - User ID
     * @returns {Promise<void>}
     */
    async updateWithHistory(interaction, embedData, userId) {
        try {
            // Disable previous interaction components for this user
            await this.disablePreviousInteraction(userId);

            // Check if this interaction can be replied to
            if (!interaction.replied && !interaction.deferred) {
                // First interaction - reply normally
                const response = await interaction.reply({
                    embeds: embedData.embeds || [],
                    components: embedData.components || [],
                    ephemeral: false
                });

                // Track this interaction
                this.activeInteractions.set(userId, {
                    interaction: response,
                    timestamp: Date.now(),
                    components: embedData.components || []
                });
            } else {
                // Follow up with new message to preserve history
                const response = await interaction.followUp({
                    embeds: embedData.embeds || [],
                    components: embedData.components || [],
                    ephemeral: false
                });

                // Track this interaction
                this.activeInteractions.set(userId, {
                    interaction: response,
                    timestamp: Date.now(),
                    components: embedData.components || []
                });
            }

            logger.info(`Updated interaction with history preservation for user ${userId}`);
        } catch (error) {
            logger.error('Error updating interaction with history:', error);
            
            // Fallback to regular followUp
            try {
                await interaction.followUp({
                    embeds: embedData.embeds || [],
                    components: embedData.components || [],
                    ephemeral: false
                });
            } catch (fallbackError) {
                logger.error('Fallback followUp also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }

    /**
     * Disable components in the previous interaction for a user
     * @param {String} userId - User ID
     * @returns {Promise<void>}
     */
    async disablePreviousInteraction(userId) {
        try {
            const previousInteraction = this.activeInteractions.get(userId);
            
            if (previousInteraction && previousInteraction.components.length > 0) {
                // Create disabled versions of components
                const disabledComponents = this.createDisabledComponents(previousInteraction.components);
                
                // Update the previous message with disabled components
                if (previousInteraction.interaction && previousInteraction.interaction.edit) {
                    await previousInteraction.interaction.edit({
                        components: disabledComponents
                    });
                }

                // Move to disabled interactions
                this.disabledInteractions.set(`${userId}_${previousInteraction.timestamp}`, previousInteraction);
                
                logger.info(`Disabled previous interaction components for user ${userId}`);
            }
        } catch (error) {
            // Don't throw - this is a best-effort operation
            logger.warn(`Could not disable previous interaction for user ${userId}:`, error.message);
        }
    }

    /**
     * Create disabled versions of interaction components
     * @param {Array} components - Original components
     * @returns {Array} Disabled components
     */
    createDisabledComponents(components) {
        return components.map(row => {
            const newRow = new ActionRowBuilder();
            
            row.components.forEach(component => {
                if (component.data.type === 3) { // StringSelectMenu
                    try {
                        // Validate that the component has valid options
                        if (!component.data.options || component.data.options.length === 0) {
                            logger.warn('StringSelectMenu has no options, skipping disable operation');
                            return;
                        }

                        // Validate each option has required fields
                        const validOptions = component.data.options.filter(option => {
                            const hasLabel = option.label && option.label.trim().length > 0 && option.label.length <= 100;
                            const hasValue = option.value && option.value.trim().length > 0 && option.value.length <= 100;
                            
                            if (!hasLabel || !hasValue) {
                                logger.warn('Invalid option found in select menu:', { label: option.label, value: option.value });
                                return false;
                            }
                            return true;
                        });

                        if (validOptions.length === 0) {
                            logger.warn('No valid options found in select menu, skipping disable operation');
                            return;
                        }

                        // Create disabled menu with validated options
                        const disabledMenu = new StringSelectMenuBuilder()
                            .setCustomId(component.data.custom_id || 'disabled_menu')
                            .setPlaceholder('❌ This action is no longer available')
                            .setDisabled(true)
                            .addOptions(validOptions);

                        newRow.addComponents(disabledMenu);
                    } catch (error) {
                        logger.error('Error creating disabled select menu:', error);
                        // Skip this component if it can't be disabled
                    }
                } else if (component.data.type === 2) { // Button (deprecated - should not be used per RULES.txt)
                    logger.warn('Button component found in embed history - buttons should not be used per RULES.txt');
                    // Skip buttons as they violate the string menus only rule
                }
            });
            
            return newRow;
        });
    }

    /**
     * Clean up old disabled interactions (older than 1 hour)
     * @returns {void}
     */
    cleanup() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const [key, interaction] of this.disabledInteractions.entries()) {
            if (interaction.timestamp < oneHourAgo) {
                this.disabledInteractions.delete(key);
            }
        }
        
        for (const [userId, interaction] of this.activeInteractions.entries()) {
            if (interaction.timestamp < oneHourAgo) {
                this.activeInteractions.delete(userId);
            }
        }
        
        logger.debug('Cleaned up old interaction history');
    }

    /**
     * Check if an interaction is still valid (not disabled)
     * @param {String} userId - User ID
     * @param {String} customId - Custom ID of the interaction
     * @returns {Boolean} True if interaction is valid
     */
    isInteractionValid(userId, customId) {
        const activeInteraction = this.activeInteractions.get(userId);
        
        if (!activeInteraction) {
            return false;
        }

        // Check if this custom ID exists in the active components
        return activeInteraction.components.some(row => 
            row.components.some(component => 
                component.data.custom_id === customId
            )
        );
    }
}

// Create singleton instance
const embedHistory = new EmbedHistory();

// Set up cleanup interval (every 30 minutes)
setInterval(() => {
    embedHistory.cleanup();
}, 30 * 60 * 1000);

export { embedHistory }; 