/**
 * InputValidation - Utility functions for validating interaction inputs
 * Prevents crashes from invalid selectedValue types and ensures consistent input handling
 */

import { logger } from './logger.js';
import { MessageFlags } from 'discord.js';

class InputValidation {
    /**
     * Validate selectedValue from Discord interactions
     * @param {any} selectedValue - The value from interaction
     * @param {string} context - Context for logging (e.g., 'shop_actions', 'battle_actions')
     * @returns {string|null} Validated string or null if invalid
     */
    static validateSelectedValue(selectedValue, context = 'unknown') {
        // Check if selectedValue exists
        if (selectedValue === undefined || selectedValue === null) {
            logger.warn(`[INPUT_VALIDATION] ${context}: selectedValue is undefined or null`);
            return null;
        }

        // Check if it's already a string
        if (typeof selectedValue === 'string') {
            return selectedValue.trim();
        }

        // Try to convert to string if it's a primitive
        if (typeof selectedValue === 'number' || typeof selectedValue === 'boolean') {
            const stringValue = String(selectedValue);
            logger.warn(`[INPUT_VALIDATION] ${context}: Converted ${typeof selectedValue} to string: ${stringValue}`);
            return stringValue;
        }

        // Check if it's an array (Discord sometimes sends arrays)
        if (Array.isArray(selectedValue)) {
            if (selectedValue.length > 0 && typeof selectedValue[0] === 'string') {
                logger.warn(`[INPUT_VALIDATION] ${context}: Using first element from array: ${selectedValue[0]}`);
                return selectedValue[0].trim();
            } else {
                logger.warn(`[INPUT_VALIDATION] ${context}: Array is empty or contains non-string elements`);
                return null;
            }
        }

        // Check if it's an object with a value property
        if (typeof selectedValue === 'object' && selectedValue.value) {
            if (typeof selectedValue.value === 'string') {
                logger.warn(`[INPUT_VALIDATION] ${context}: Using value property from object: ${selectedValue.value}`);
                return selectedValue.value.trim();
            }
        }

        // Unable to handle this type
        logger.error(`[INPUT_VALIDATION] ${context}: Unable to handle selectedValue type: ${typeof selectedValue}`, { selectedValue });
        return null;
    }

    /**
     * Validate interaction object
     * @param {Object} interaction - Discord interaction
     * @returns {boolean} True if valid
     */
    static validateInteraction(interaction) {
        if (!interaction) {
            logger.error('[INPUT_VALIDATION] Interaction is null or undefined');
            return false;
        }

        if (!interaction.isStringSelectMenu && !interaction.isButton && !interaction.isChatInputCommand) {
            logger.warn('[INPUT_VALIDATION] Interaction is not a select menu, button, or command');
            return false;
        }

        if (interaction.replied && interaction.deferred) {
            logger.warn('[INPUT_VALIDATION] Interaction has already been replied to and deferred');
            return false;
        }

        return true;
    }

    /**
     * Validate game state object
     * @param {Object} gameState - Game state object
     * @param {string} context - Context for logging
     * @returns {boolean} True if valid
     */
    static validateGameState(gameState, context = 'unknown') {
        if (!gameState) {
            logger.error(`[INPUT_VALIDATION] ${context}: GameState is null or undefined`);
            return false;
        }

        if (!gameState.session || !gameState.session.userId) {
            logger.error(`[INPUT_VALIDATION] ${context}: GameState missing session or userId`);
            return false;
        }

        // Initialize missing properties
        if (!gameState.player) {
            logger.warn(`[INPUT_VALIDATION] ${context}: Initializing missing player object`);
            gameState.player = {
                inventory: {
                    weapons: [],
                    armor: [],
                    consumables: [],
                    enhancers: [],
                    keys: 0,
                    gold: 100
                },
                currentHealth: 0,
                currentMana: 0,
                armor: 0
            };
        }

        if (!gameState.economy) {
            logger.warn(`[INPUT_VALIDATION] ${context}: Initializing missing economy object`);
            gameState.economy = {
                gold: 100,
                tokens: 0,
                dng: 0,
                hero: 0,
                eth: 0
            };
        }

        if (!gameState.battle) {
            logger.warn(`[INPUT_VALIDATION] ${context}: Initializing missing battle object`);
            gameState.battle = {
                active: false,
                currentMonster: null,
                battleType: null,
                turnNumber: 1,
                playerLastAction: null,
                monsterLastAction: null,
                playerEffects: [],
                monsterEffects: [],
                playerDeathPreventionUsed: false,
                monsterDeathPreventionUsed: false
            };
        }

        return true;
    }

    /**
     * Safe string operation wrapper
     * @param {any} value - Value to perform string operation on
     * @param {string} operation - Operation name ('startsWith', 'includes', 'split', etc.)
     * @param {any} args - Arguments for the operation
     * @returns {any} Result of operation or safe fallback
     */
    static safeStringOperation(value, operation, ...args) {
        try {
            // Validate input
            const validatedValue = this.validateSelectedValue(value, `safeStringOperation_${operation}`);
            if (!validatedValue) {
                return this.getOperationFallback(operation);
            }

            // Perform operation
            switch (operation) {
                case 'startsWith':
                    return validatedValue.startsWith(args[0]);
                case 'includes':
                    return validatedValue.includes(args[0]);
                case 'split':
                    return validatedValue.split(args[0], args[1]);
                case 'replace':
                    return validatedValue.replace(args[0], args[1]);
                case 'toLowerCase':
                    return validatedValue.toLowerCase();
                case 'toUpperCase':
                    return validatedValue.toUpperCase();
                case 'trim':
                    return validatedValue.trim();
                case 'substring':
                    return validatedValue.substring(args[0], args[1]);
                default:
                    logger.warn(`[INPUT_VALIDATION] Unknown string operation: ${operation}`);
                    return this.getOperationFallback(operation);
            }
        } catch (error) {
            logger.error(`[INPUT_VALIDATION] Error in safeStringOperation ${operation}:`, error);
            return this.getOperationFallback(operation);
        }
    }

    /**
     * Get safe fallback for string operations
     * @param {string} operation - Operation name
     * @returns {any} Safe fallback value
     */
    static getOperationFallback(operation) {
        switch (operation) {
            case 'startsWith':
            case 'includes':
                return false;
            case 'split':
                return [];
            case 'replace':
            case 'toLowerCase':
            case 'toUpperCase':
            case 'trim':
            case 'substring':
                return '';
            default:
                return null;
        }
    }

    /**
     * Create safe interaction response wrapper
     * @param {Object} interaction - Discord interaction
     * @param {Object|string} content - Response content
     * @param {string} method - Method to use ('reply', 'update', 'followUp')
     * @returns {Promise<void>}
     */
    static async safeInteractionResponse(interaction, content, method = 'reply') {
        try {
            if (!this.validateInteraction(interaction)) {
                logger.error('[INPUT_VALIDATION] Cannot respond to invalid interaction');
                return;
            }

            const responseData = typeof content === 'string' 
                ? { content } 
                : content;

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
                default:
                    logger.warn(`[INPUT_VALIDATION] Unknown response method: ${method}`);
                    await interaction.followUp(responseData);
            }
        } catch (error) {
            logger.error('[INPUT_VALIDATION] Error in safeInteractionResponse:', error);
            // Last resort - try basic followUp
            try {
                if (!interaction.replied) {
                    await interaction.reply({ 
                        content: '❌ An error occurred processing your request.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (fallbackError) {
                logger.error('[INPUT_VALIDATION] Even fallback response failed:', fallbackError);
            }
        }
    }
}

export { InputValidation }; 