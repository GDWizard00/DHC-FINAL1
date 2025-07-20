import { DatabaseManager } from '../database/DatabaseManager.js';
import { GameState } from '../models/GameState.js';
import { StartMenuHandler } from '../handlers/core/StartMenuHandler.js';
import { HeroSelectionHandler } from '../handlers/core/HeroSelectionHandler.js';
import { DungeonEntranceHandler } from '../handlers/core/DungeonEntranceHandler.js';
import { ExplorationHandler } from '../handlers/core/ExplorationHandler.js';
import { BattleHandler } from '../handlers/core/BattleHandler.js';
import { InventoryHandler } from '../handlers/inventory/InventoryHandler.js';
import { ShopHandler } from '../handlers/inventory/ShopHandler.js';
import { FloorHandler } from '../handlers/core/FloorHandler.js';
import { ChestHandler } from '../handlers/core/ChestHandler.js';
import { QuestHandler } from '../handlers/core/QuestHandler.js';
import { DivisionHandler } from '../handlers/core/DivisionHandler.js';
import { MarketplaceHandler } from '../handlers/marketplace/MarketplaceHandler.js';
import { AdminHandler } from '../handlers/admin/AdminHandler.js';
import { BotDeveloperHandler } from '../handlers/admin/BotDeveloperHandler.js';
import { ServerOwnerHandler } from '../handlers/admin/ServerOwnerHandler.js';
import { getServiceRegistry } from '../utils/serviceRegistry.js';
import { logger } from '../utils/logger.js';
import { auditLogger } from '../utils/auditLogger.js';
import { MessageFlags, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { InputValidation } from '../utils/inputValidation.js';

/**
 * Main Command Handler for Dungeonites Heroes Challenge
 * Processes all game commands and routes interactions
 */
export class CommandHandler {
    
    /**
     * Safe interaction response method to prevent double-acknowledgment errors
     */
    static async safeInteractionResponse(interaction, response, method = 'update') {
        try {
            // Check if interaction is still valid and not already handled
            if (!interaction) {
                auditLogger.log('ERROR', 'Interaction is null or undefined', 'interaction_error');
                return false;
            }

            if (interaction.replied || interaction.deferred) {
                // Interaction already handled, try followUp instead
                try {
                    if (typeof response === 'string') {
                        await interaction.followUp({ content: response, ephemeral: true });
                    } else {
                        await interaction.followUp({ ...response, ephemeral: true });
                    }
                    logger.info('Used followUp for already handled interaction');
                    return true;
                } catch (followUpError) {
                    logger.warn('FollowUp also failed:', followUpError.message);
                    return false;
                }
            }

            // Check if interaction token is still valid (interactions expire after 15 minutes)
            const now = Date.now();
            const interactionAge = now - interaction.createdTimestamp;
            const maxAge = 14 * 60 * 1000; // 14 minutes to be safe

            if (interactionAge > maxAge) {
                auditLogger.log('ERROR', 'Interaction token expired', 'interaction_expired');
                logger.warn('Interaction token expired, cannot respond');
                return false;
            }

            // Add timeout for interaction responses
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Interaction response timeout')), 10000)
            );

            // Execute the appropriate response method with timeout
            const responsePromise = (async () => {
            if (method === 'reply') {
                    return await interaction.reply(response);
            } else if (method === 'update') {
                    return await interaction.update(response);
            } else if (method === 'followUp') {
                    return await interaction.followUp(response);
            } else if (method === 'editReply') {
                    return await interaction.editReply(response);
                } else {
                    throw new Error(`Unknown interaction method: ${method}`);
            }
            })();

            await Promise.race([responsePromise, timeout]);

            auditLogger.log('SUCCESS', `Interaction ${method} successful`, 'interaction_response');
            return true;

        } catch (error) {
            auditLogger.log('ERROR', `Interaction ${method} failed: ${error.message}`, 'interaction_error');
            logger.error(`Failed to ${method} interaction:`, error);
            
            // Final fallback - try to send a simple ephemeral message
            try {
                if (!interaction.replied && !interaction.deferred && method !== 'update') {
                    await interaction.reply({ 
                        content: '⚠️ An error occurred processing your request. Please try again.', 
                        ephemeral: true 
                    });
                    logger.info('Used emergency fallback reply');
                }
            } catch (fallbackError) {
                logger.error('Even emergency fallback failed:', fallbackError);
            }
            
            return false;
        }
    }

    /**
     * Handle incoming messages (commands)
     */
    static async handleMessage(message) {
        const content = message.content.toLowerCase().trim();
        const userId = message.author.id;
        const channelId = message.channel.id;

        // Check for game commands
        if (content === '!ch') {
            await this.handleStartGame(message);
        } else if (content === '!chsave') {
            await this.handleSaveGame(message);
        } else if (content === '!chload') {
            await this.handleLoadGame(message);
        }
        // Note: Other commands can be added here if needed
    }

    /**
     * Handle Discord interactions
     */
    static async handleInteraction(interaction) {
        try {
            if (!interaction.isStringSelectMenu() && !interaction.isModalSubmit() && !interaction.isButton()) {
                return;
            }

            const userId = interaction.user.id;
            const customId = interaction.customId;
            
            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                await this.handleModalSubmission(interaction);
                return;
            }

            // Handle button interactions (no selectedValue)
            let selectedValue = null;
            if (interaction.isStringSelectMenu()) {
                selectedValue = interaction.values[0];
            }

            // Debug logging to see what we're actually getting
            logger.info(`[COMMAND_HANDLER] handleInteraction - customId: ${customId}, selectedValue: ${selectedValue}, type: ${typeof selectedValue}`);
            logger.info(`[COMMAND_HANDLER] handleInteraction - interaction.values: ${JSON.stringify(interaction.values)}`);

            // Validate inputs (only for select menus)
            let validatedValue = selectedValue;
            if (interaction.isStringSelectMenu()) {
                validatedValue = InputValidation.validateSelectedValue(selectedValue, customId);
            logger.info(`[COMMAND_HANDLER] handleInteraction - validatedValue: ${validatedValue}, type: ${typeof validatedValue}`);
            
            if (!validatedValue) {
                logger.error(`[INTERACTION] Invalid selectedValue for ${customId}:`, selectedValue);
                await InputValidation.safeInteractionResponse(interaction, '❌ Invalid selection. Please try again.', 'reply');
                return;
                }
            } else {
                // For button interactions, use customId as the "value"
                logger.info(`[COMMAND_HANDLER] handleInteraction - Button interaction, customId: ${customId}`);
            }

            let gameState = null;
            
            // CLEAN APPROACH: Only require game state for actual gameplay interactions
            // Everything else (auth, dashboards, admin, marketplace, social, etc.) works without game state
            const gameplayInteractions = [
                // Combat & Battle Actions (during active combat)
                'attack_monster', 'use_item_combat', 'cast_spell', 'flee_battle', 'defend_action',
                'battle_menu', 'combat_turn', 'use_ability_combat', 'combat_action', 'battle_actions',
                
                // Dungeon Navigation (during active adventure)
                'move_to_floor', 'enter_portal', 'dungeon_navigation', 'floor_navigation',
                'explore_room', 'dungeon_entrance', 'portal_menu', 'floor_actions',
                
                // Adventure-Specific Actions (during active exploration)
                'open_chest_adventure', 'pick_up_item', 'adventure_chest_actions', 'adventure_action',
                'exploration_action', 'dungeon_action', 'exploration_result', 'chest_actions',
                
                // Game Start & Setup (requires game state for player info)
                'start_menu', 'hero_selection', 'hero_confirmation', 'division_selection',
                'tutorial_menu', 'leaderboard_menu', 'profile_menu', 'exchange_menu', 'wallet_menu',
                
                // Inventory & Equipment (requires game state for inventory data)
                'inventory_actions', 'shop_actions', 'profile_chest_actions',
                
                // Active Game Session Actions (requires current game state)
                'game_turn', 'adventure_turn', 'active_game_action', 'victory_actions', 'death_actions',
                'flee_result', 'floor_cleared_actions', 'mimic_battle', 'quest_menu'
            ];
            
            const needsGameState = gameplayInteractions.includes(customId) || customId.startsWith('combat_') || customId.startsWith('battle_') || customId.startsWith('dungeon_active_');

            // Log when we require game state (should be rare now)
            if (needsGameState) {
                logger.info(`[GAME_STATE] Requiring game state for gameplay interaction: ${customId}`);
            }
            
            if (needsGameState) {
                // PERFORMANCE FIX: Defer long-running gameplay interactions immediately
                if (interaction.isStringSelectMenu() && 
                    ['floor_actions', 'battle_actions', 'exploration_result', 'inventory_actions'].includes(customId)) {
                    await interaction.deferUpdate();
                }
                
                // Get user's game state for actual gameplay interactions only
                const serviceRegistry = getServiceRegistry();
                const stateService = serviceRegistry.getStateService();
                gameState = stateService.getUserState(userId);

                // Only error if we actually need game state and don't have it
                if (!gameState && needsGameState) {
                    logger.error(`[INTERACTION] No game state found for user ${userId}, customId: ${customId}, skipGameState: ${skipGameState}, needsGameState: ${needsGameState}`);
                    if (interaction.deferred) {
                        await interaction.editReply({ content: 'No active game session found. Please use /ch to start or /chload to recover your saved game.' });
                    } else {
                        await this.safeInteractionResponse(interaction, 'No active game session found. Please use /ch to start or /chload to recover your saved game.');
                    }
                    return;
                }

                // Validate game state only if we have it and need it
                if (gameState && needsGameState && !InputValidation.validateGameState(gameState, customId)) {
                    logger.error(`[INTERACTION] Invalid game state for user ${userId}`);
                    if (interaction.deferred) {
                        await interaction.editReply({ content: '❌ Game state error. Please use /ch to restart or /chload to recover.' });
                    } else {
                        await InputValidation.safeInteractionResponse(interaction, '❌ Game state error. Please use /ch to restart or /chload to recover.', 'reply');
                    }
                    return;
                }
            }

            // Enhanced logging for user interactions
            const logData = {
                customId,
                needsGameState
            };
            
            if (gameState) {
                logData.screen = gameState.currentScreen;
                logData.floor = gameState.currentFloor;
                logData.hero = gameState.selectedHero?.name;
            }
            
            logger.logInteraction(userId, interaction.user.username, validatedValue, logData);

            // Pre-check for division-specific store actions (e.g., store_actions_eth, store_actions_dng)
            if (customId.startsWith('store_actions_')) {
                try {
                    const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                    await MarketplaceHandler.handleStoreSelection(interaction, validatedValue);
                    return;
                } catch (error) {
                    logger.error('Error handling division-specific store actions:', error);
                    await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    return;
                }
            }

            // Handle channel creation/selection buttons with dynamic category IDs FIRST
            if (customId.startsWith('admin_create_channel_') || 
                customId.startsWith('master_create_channel_') ||
                customId.startsWith('admin_custom_create_channel_') ||
                customId.startsWith('master_custom_create_channel_') ||
                customId.startsWith('admin_existing_channel_') ||
                customId.startsWith('master_existing_channel_')) {
                try {
                    const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                    
                    if (customId.includes('_create_channel_')) {
                        await DashboardEmbedHandler.handleCreateChannel(interaction, customId);
                    } else if (customId.includes('_existing_channel_')) {
                        await DashboardEmbedHandler.handleExistingChannel(interaction, customId);
                    }
                    return; // Exit after handling
                } catch (error) {
                    logger.error('Error handling channel operation:', error);
                    await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    return;
                }
            }

            // Handle select menu interactions based on customId
            switch (customId) {
                // Bot Developer Master System handlers
                case 'master_setup_begin':
                    try {
                        await BotDeveloperHandler.handleSetupBegin(interaction);
                    } catch (error) {
                        logger.error('Error handling master setup begin:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_password_setup':
                    try {
                        await BotDeveloperHandler.handlePasswordSetup(interaction);
                    } catch (error) {
                        logger.error('Error handling master password setup:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_auth_method':
                    try {
                        await BotDeveloperHandler.handleAuthMethod(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master auth method:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_control_panel':
                    try {
                        await BotDeveloperHandler.handleControlPanelSelection(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master control panel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_logout':
                    try {
                        await BotDeveloperHandler.handleLogout(interaction);
                    } catch (error) {
                        logger.error('Error handling master logout:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'toggle_emergency':
                    try {
                        await BotDeveloperHandler.handleToggleEmergency(interaction);
                    } catch (error) {
                        logger.error('Error handling toggle emergency:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_user_mgmt_actions':
                    try {
                        await BotDeveloperHandler.handleUserMgmtActions(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master user mgmt actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_server_mgmt_actions':
                    try {
                        await BotDeveloperHandler.handleServerMgmtActions(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling server management actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'verify_server_owner':
                    try {
                        await BotDeveloperHandler.handleServerOwnerVerification(interaction);
                    } catch (error) {
                        logger.error('Error handling server owner verification:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'back_to_server_mgmt':
                    try {
                        await BotDeveloperHandler.showServerManagement(interaction);
                    } catch (error) {
                        logger.error('Error returning to server management:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'emergency_access_granted':
                    try {
                        await BotDeveloperHandler.handleEmergencyAccessGranted(interaction);
                    } catch (error) {
                        logger.error('Error handling emergency access granted:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'emergency_access_cancel':
                    try {
                        await BotDeveloperHandler.handleEmergencyAccessCancel(interaction);
                    } catch (error) {
                        logger.error('Error handling emergency access cancel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'server_setup_auth_password':
                    try {
                        await BotDeveloperHandler.showPasswordModalForServerSetup(interaction);
                    } catch (error) {
                        logger.error('Error showing password modal for server setup:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'server_setup_auth_emergency':
                    try {
                        await BotDeveloperHandler.handleServerSetupEmergencyAuth(interaction);
                    } catch (error) {
                        logger.error('Error handling server setup emergency auth:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'server_setup_cancel':
                    try {
                        await BotDeveloperHandler.handleServerSetupCancel(interaction);
                    } catch (error) {
                        logger.error('Error handling server setup cancel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'bot_setup_full':
                    try {
                        // NEW DASHBOARD SYSTEM: Bot Dev Master Dashboard setup
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showCategorySelection(interaction, 'master');
                    } catch (error) {
                        logger.error('Error handling bot setup full:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'bot_setup_quick':
                    try {
                        // NEW DASHBOARD SYSTEM: Quick Master Dashboard setup
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showCategorySelection(interaction, 'master_quick');
                    } catch (error) {
                        logger.error('Error handling bot setup quick:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'bot_setup_custom':
                    try {
                        // NEW DASHBOARD SYSTEM: Custom Master Dashboard setup
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showCategorySelection(interaction, 'master_custom');
                    } catch (error) {
                        logger.error('Error handling bot setup custom:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'bot_setup_cancel':
                    try {
                        await BotDeveloperHandler.handleBotSetupCancel(interaction);
                    } catch (error) {
                        logger.error('Error handling bot setup cancel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'custom_setup_game_hall':
                    try {
                        await BotDeveloperHandler.handleCustomSetupGameHall(interaction);
                    } catch (error) {
                        logger.error('Error handling custom setup game hall:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'custom_setup_marketplace':
                    try {
                        await BotDeveloperHandler.handleCustomSetupMarketplace(interaction);
                    } catch (error) {
                        logger.error('Error handling custom setup marketplace:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'custom_setup_casino':
                    try {
                        await BotDeveloperHandler.handleCustomSetupCasino(interaction);
                    } catch (error) {
                        logger.error('Error handling custom setup casino:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'custom_setup_all':
                    try {
                        await BotDeveloperHandler.handleCustomSetupAll(interaction);
                    } catch (error) {
                        logger.error('Error handling custom setup all:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'custom_setup_cancel':
                    try {
                        // Route to appropriate handler based on user type
                        if (BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
                            await BotDeveloperHandler.handleCustomSetupCancel(interaction);
                        } else {
                            await ServerOwnerHandler.handleCustomSetupCancel(interaction);
                        }
                    } catch (error) {
                        logger.error('Error handling custom setup cancel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Game Hall Setup Handlers
                case 'game_hall_create_channel':
                    try {
                        await BotDeveloperHandler.handleGameHallCreateChannel(interaction);
                    } catch (error) {
                        logger.error('Error handling game hall create channel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'game_hall_existing_channel':
                    try {
                        await BotDeveloperHandler.handleGameHallExistingChannel(interaction);
                    } catch (error) {
                        logger.error('Error handling game hall existing channel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Marketplace Setup Handlers
                case 'marketplace_create_channel':
                    try {
                        await BotDeveloperHandler.handleMarketplaceCreateChannel(interaction);
                    } catch (error) {
                        logger.error('Error handling marketplace create channel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'marketplace_existing_channel':
                    try {
                        await BotDeveloperHandler.handleMarketplaceExistingChannel(interaction);
                    } catch (error) {
                        logger.error('Error handling marketplace existing channel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Casino Setup Handlers
                case 'casino_create_channel':
                    try {
                        await BotDeveloperHandler.handleCasinoCreateChannel(interaction);
                    } catch (error) {
                        logger.error('Error handling casino create channel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'casino_existing_channel':
                    try {
                        await BotDeveloperHandler.handleCasinoExistingChannel(interaction);
                    } catch (error) {
                        logger.error('Error handling casino existing channel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Install All Handlers
                case 'install_all_create_channels':
                    try {
                        await BotDeveloperHandler.handleInstallAllCreateChannels(interaction);
                    } catch (error) {
                        logger.error('Error handling install all create channels:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'install_all_existing_channels':
                    try {
                        await BotDeveloperHandler.handleInstallAllExistingChannels(interaction);
                    } catch (error) {
                        logger.error('Error handling install all existing channels:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'install_all_quick':
                    try {
                        await BotDeveloperHandler.handleInstallAllQuick(interaction);
                    } catch (error) {
                        logger.error('Error handling install all quick:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_control_panel_return':
                    try {
                        await BotDeveloperHandler.showMasterControlPanel(interaction);
                    } catch (error) {
                        logger.error('Error returning to master control panel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Channel Selection Handlers
                case 'setup_channel_selection':
                    try {
                        await BotDeveloperHandler.handleChannelSelection(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling channel selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'setup_confirm_selection':
                    try {
                        await BotDeveloperHandler.handleConfirmSelection(interaction);
                    } catch (error) {
                        logger.error('Error handling confirm selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'setup_cancel_selection':
                    try {
                        await BotDeveloperHandler.handleCancelSelection(interaction);
                    } catch (error) {
                        logger.error('Error handling cancel selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'setup_continue_flow':
                    try {
                        await BotDeveloperHandler.handleContinueFlow(interaction);
                    } catch (error) {
                        logger.error('Error handling continue flow:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Dungeonites Asset Management
                case 'remove_dungeonites_assets':
                    try {
                        await BotDeveloperHandler.handleRemoveDungeonitesAssets(interaction);
                    } catch (error) {
                        logger.error('Error handling remove Dungeonites assets:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'confirm_remove_assets':
                    try {
                        await BotDeveloperHandler.handleConfirmRemoveAssets(interaction);
                    } catch (error) {
                        logger.error('Error handling confirm remove assets:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'cancel_remove_assets':
                    try {
                        await BotDeveloperHandler.handleCancelRemoveAssets(interaction);
                    } catch (error) {
                        logger.error('Error handling cancel remove assets:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Server Owner Setup handlers
                case 'server_owner_setup_begin':
                    try {
                        // Check if this is the Bot Developer with existing master profile
                        if (BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
                            const masterProfile = await BotDeveloperHandler.getMasterProfile();
                            if (masterProfile) {
                                // Bot Developer already has master profile - go to server setup auth
                                await BotDeveloperHandler.showServerSetupAuthentication(interaction);
                                break;
                            }
                        }
                        
                        // Regular server owner setup
                        await ServerOwnerHandler.handleSetupBegin(interaction);
                    } catch (error) {
                        logger.error('Error handling server owner setup begin:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'server_owner_setup_help':
                    try {
                        await ServerOwnerHandler.showSetupHelp(interaction);
                    } catch (error) {
                        logger.error('Error showing server owner setup help:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'server_setup_emergency_help':
                    try {
                        await ServerOwnerHandler.handleEmergencyHelp(interaction);
                    } catch (error) {
                        logger.error('Error handling server setup emergency help:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Server setup button handlers (after profile creation)
                case 'server_setup_quick_start':
                    try {
                        await ServerOwnerHandler.handleQuickStart(interaction);
                    } catch (error) {
                        logger.error('Error handling server setup quick start:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'server_setup_custom':
                    try {
                        await ServerOwnerHandler.handleCustomSetup(interaction);
                    } catch (error) {
                        logger.error('Error handling server setup custom:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // User Profile Creation handlers
                case 'user_profile_create_begin':
                    try {
                        const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await UserProfileHandler.handleProfileCreationBegin(interaction);
                    } catch (error) {
                        logger.error('Error handling user profile creation begin:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'user_profile_help':
                    try {
                        const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await UserProfileHandler.showProfileHelp(interaction);
                    } catch (error) {
                        logger.error('Error showing user profile help:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'user_login_password':
                    try {
                        const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await UserProfileHandler.showPasswordAuthModal(interaction, 'login');
                    } catch (error) {
                        logger.error('Error handling user login password:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'user_smart_login':
                    try {
                        const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await UserProfileHandler.handleSmartLogin(interaction);
                    } catch (error) {
                        logger.error('Error handling smart login:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'user_smart_password_entry':
                    try {
                        const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await UserProfileHandler.showPasswordAuthModal(interaction, 'smart_login');
                    } catch (error) {
                        logger.error('Error showing smart password entry:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'user_forgot_password':
                    try {
                        await interaction.reply({
                            content: '🆘 **Password Recovery** - Coming Soon!\n\nThis feature will allow you to recover your password using your backup methods (X account, wallet, email).\n\nFor now, contact server administrators for help.',
                            ephemeral: true
                        });
                    } catch (error) {
                        logger.error('Error handling forgot password:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'user_login_help':
                    try {
                        const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await UserProfileHandler.showProfileHelp(interaction);
                    } catch (error) {
                        logger.error('Error showing login help:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Admin debug commands for promotional weapons
                case 'debug_promotional_check':
                    try {
                        const { PromotionalHandler } = await import('../handlers/user/PromotionalHandler.js');
                        await PromotionalHandler.manualPromotionalCheck(interaction);
                    } catch (error) {
                        logger.error('Error in debug promotional check:', error);
                        await this.safeInteractionResponse(interaction, 'Debug command failed. Check logs.');
                    }
                    break;

                case 'debug_clear_promotional':
                    try {
                        const { PromotionalHandler } = await import('../handlers/user/PromotionalHandler.js');
                        await PromotionalHandler.clearPromotionalWeapons(interaction);
                    } catch (error) {
                        logger.error('Error in debug clear promotional:', error);
                        await this.safeInteractionResponse(interaction, 'Debug command failed. Check logs.');
                    }
                    break;

                case 'user_casino_login':
                    try {
                        const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await UserProfileHandler.showPasswordAuthModal(interaction, 'casino');
                    } catch (error) {
                        logger.error('Error handling casino login:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Post-login game menu handlers
                case 'post_login_enter_dungeon':
                    try {
                        // Initialize game state and show division selection
                        const userId = interaction.user.id;
                        const userName = interaction.user.username;
                        
                        // Get or create game state
                        const serviceRegistry = getServiceRegistry();
                        const stateService = serviceRegistry.getStateService();
                        let gameState = stateService.getUserState(userId);
                        
                        if (!gameState) {
                            const { GameState } = await import('../models/GameState.js');
                            gameState = new GameState(userId);
                            gameState.playerName = userName;
                            gameState.session.channelId = interaction.channel.id;
                            stateService.setUserState(userId, gameState);
                        }
                        
                        gameState.updateActivity();
                        
                        // Show division selection to start the game
                        const { DivisionHandler } = await import('../handlers/core/DivisionHandler.js');
                        await DivisionHandler.showDivisionSelection(interaction, gameState);
                        
                    } catch (error) {
                        logger.error('Error handling enter dungeon:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred starting the game. Please try again.');
                    }
                    break;

                case 'post_login_my_chests':
                    try {
                        // Send new message that auto-deletes instead of replacing the persistent menu
                        const chestMessage = await interaction.reply({
                            embeds: [{
                                title: '📦 **MY CHESTS - MARKETPLACE ACCESS** 📦',
                                description: 
                                    `**${interaction.user.username}, to access your chests:**\n\n` +
                                    '🏪 **Go to the Marketplace Channel**\n' +
                                    '📦 **Click "My Chests" in the permanent marketplace menu**\n' +
                                    '✅ **You\'re already authenticated** - Direct access available\n\n' +
                                    '**Your Chests:**\n' +
                                    '🏛️ **Profile Chest** - Permanent storage (safe from death)\n' +
                                    '⚔️ **Adventure Chest** - Current session loot (lost on death)\n\n' +
                                    '*Head to the marketplace channel to manage your items!*\n\n' +
                                    '⏰ *This message will disappear in 10 seconds to keep your game menu clean.*',
                                color: 0x9932cc,
                                footer: { text: 'Marketplace Access • Chest Management' },
                                timestamp: new Date().toISOString()
                            }],
                            ephemeral: false
                        });
                        
                        // Auto-delete the message after 10 seconds to keep thread clean
                        setTimeout(async () => {
                            try {
                                await chestMessage.delete();
                            } catch (error) {
                                logger.warn('Could not delete chest access message:', error.message);
                            }
                        }, 10000);
                        
                    } catch (error) {
                        logger.error('Error handling my chests:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred accessing chests. Please visit the marketplace channel directly.');
                    }
                    break;

                case 'post_login_return_game_hall':
                    try {
                        // Send new message that auto-deletes instead of replacing the persistent menu
                        const gameHallMessage = await interaction.reply({
                            embeds: [{
                                title: '🏛️ **RETURNING TO GAME HALL** 🏛️',
                                description: 
                                    `**${interaction.user.username}, you're all set!**\n\n` +
                                    '✅ **Authenticated** - Your session is active\n' +
                                    '🎮 **Ready to Play** - Return to the Game Hall to start your adventure\n\n' +
                                    '**Game Hall Features:**\n' +
                                    '🎯 **Start Game** - Begin a new adventure in a private thread\n' +
                                    '📦 **My Chests** - Access your stored items\n' +
                                    '⚡ **Quick Access** - All authenticated features ready\n\n' +
                                    '💡 *Click the "Game Hall" channel to continue your adventure!*\n\n' +
                                    '⏰ *This message will disappear in 10 seconds to keep your game menu clean.*',
                                color: 0x00FF00
                            }],
                            ephemeral: false
                        });
                        
                        // Auto-delete the message after 10 seconds to keep thread clean
                        setTimeout(async () => {
                            try {
                                await gameHallMessage.delete();
                            } catch (error) {
                                logger.warn('Could not delete game hall message:', error.message);
                            }
                        }, 10000);
                    } catch (error) {
                        logger.error('Error handling return to game hall:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Handle coinflip game controls
                case 'coinflip_leave_game':
                    try {
                        await interaction.update({
                            embeds: [{
                                title: '🚪 **LEFT COINFLIP GAME** 🚪',
                                description: 
                                    `**${interaction.user.username}, you have left the coinflip game.**\n\n` +
                                    '🎰 **Return to Casino** - Access other casino games\n' +
                                    '🎮 **Game Hall** - Start dungeon adventures\n' +
                                    '🏪 **Marketplace** - Trade items with players\n\n' +
                                    '💡 *Your thread will remain active for future games.*',
                                color: 0xFF4444
                            }],
                            components: []
                        });
                    } catch (error) {
                        logger.error('Error handling leave coinflip:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred leaving game.');
                    }
                    break;

                case 'coinflip_return_casino':
                    try {
                        await interaction.update({
                            embeds: [{
                                title: '🎰 **RETURNING TO CASINO** 🎰',
                                description: 
                                    `**${interaction.user.username}, returning to casino!**\n\n` +
                                    '🎯 **Next Steps:**\n' +
                                    '• Go to the Casino channel\n' +
                                    '• Use the permanent casino menu\n' +
                                    '• All games available with your authentication\n\n' +
                                    '💡 *Your thread will remain active for future games.*',
                                color: 0xFFD700
                            }],
                            components: []
                        });
                    } catch (error) {
                        logger.error('Error handling return to casino:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred returning to casino.');
                    }
                    break;

                // Permanent Embed Button handlers - Updated to use PersistentEmbedManager
                case 'permanent_start_game':
                    try {
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleStartGame(interaction);
                    } catch (error) {
                        logger.error('Error handling permanent start game:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'permanent_view_profile':
                    try {
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleViewProfile(interaction);
                    } catch (error) {
                        logger.error('Error handling permanent view profile:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'permanent_tutorial':
                    try {
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleTutorial(interaction);
                    } catch (error) {
                        logger.error('Error handling permanent tutorial:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'permanent_quests':
                    try {
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleDailyQuests(interaction);
                    } catch (error) {
                        logger.error('Error handling permanent quests:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'permanent_coin_flip':
                    try {
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleCasino(interaction, 'coin_flip');
                    } catch (error) {
                        logger.error('Error handling permanent coin flip:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'permanent_casino_leaderboard':
                    try {
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleCasino(interaction, 'casino_leaderboard');
                    } catch (error) {
                        logger.error('Error handling permanent casino leaderboard:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Marketplace permanent embed handlers - Now using PersistentEmbedManager
                case 'permanent_store':
                case 'permanent_player_market':
                case 'permanent_trading_post':
                case 'permanent_chests':
                    try {
                        // Map interaction IDs to marketplace values
                        const marketplaceMap = {
                            'permanent_store': 'store',
                            'permanent_player_market': 'player_market',
                            'permanent_trading_post': 'trading_post',
                            'permanent_chests': 'player_chests'
                        };

                        const selectedValue = marketplaceMap[customId];
                        
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleMarketplace(interaction, selectedValue);
                        
                    } catch (error) {
                        logger.error('Error handling permanent marketplace interaction:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Dashboard embed handlers - NEW Phase 2
                case 'admin_create_profile':
                case 'admin_login':
                case 'admin_help':
                case 'admin_auth_password':
                case 'admin_forgot_password':
                case 'admin_profile_create_begin':
                case 'admin_profile_create_cancel':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleAdminStartHere(interaction, customId);
                    } catch (error) {
                        logger.error('Error handling admin start here interaction:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'player_create_profile':
                case 'player_login':
                case 'player_tutorial':
                case 'player_help':
                case 'player_profile_create_begin':
                case 'player_profile_create_cancel':
                case 'player_tutorial_first':
                case 'player_auth_password':
                case 'player_smart_login':
                case 'player_forgot_password':
                case 'player_logout':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handlePlayerStartHere(interaction, customId);
                    } catch (error) {
                        logger.error('Error handling player start here interaction:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'bot_dev_authenticate':
                    try {
                        const { BotDeveloperHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDeveloperHandler.showMasterAuthentication(interaction);
                    } catch (error) {
                        logger.error('Error handling bot dev authentication:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'goto_bot_dev_dashboard':
                    try {
                        // Navigate to Bot Dev Dashboard channel
                        await interaction.reply({
                            content: '⚔️ **Navigate to your Bot Dev Dashboard channel** to access ultimate controls.\n\n*Look for the channel called `⚔️│bot-dev-dashboard` in the Dungeonites category.*',
                            ephemeral: true
                        });
                    } catch (error) {
                        logger.error('Error handling goto bot dev dashboard:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Start menu handler
                case 'start_menu':
                    try {
                        await StartMenuHandler.handleStartMenuSelection(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling start menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'tutorial_menu':
                    try {
                        if (interaction.values[0] === 'back_to_main') {
                            await StartMenuHandler.showStartMenu(interaction, gameState);
                        }
                    } catch (error) {
                        logger.error('Error handling tutorial menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'leaderboard_menu':
                    try {
                        if (interaction.values[0] === 'back_to_main') {
                            await StartMenuHandler.showStartMenu(interaction, gameState);
                        }
                    } catch (error) {
                        logger.error('Error handling leaderboard menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;
                
                case 'profile_menu':
                    try {
                        if (interaction.values[0] === 'back_to_main') {
                            await StartMenuHandler.showStartMenu(interaction, gameState);
                        }
                    } catch (error) {
                        logger.error('Error handling profile menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Hero selection handler
                case 'hero_selection':
                    try {
                        await HeroSelectionHandler.handleHeroSelection(interaction, gameState, validatedValue);
                    } catch (error) {
                        logger.error('Error handling hero selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Hero confirmation handler
                case 'hero_confirmation':
                    try {
                        await HeroSelectionHandler.handleHeroConfirmation(interaction, gameState, validatedValue);
                    } catch (error) {
                        logger.error('Error handling hero confirmation:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Dungeon entrance handler
                case 'dungeon_entrance':
                    try {
                        await DungeonEntranceHandler.handleDungeonEntranceSelection(interaction, gameState, validatedValue);
                    } catch (error) {
                        logger.error('Error handling dungeon entrance:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Look around result handler (return to entrance after searching)
                case 'look_around_result':
                    try {
                        if (validatedValue === 'return_to_entrance') {
                            await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
                        } else {
                            logger.warn(`Unknown look around result selection: ${validatedValue}`);
                            await this.safeInteractionResponse(interaction, 'Unknown option selected. Please try again.');
                        }
                    } catch (error) {
                        logger.error('Error handling look around result:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Inventory actions handler
                case 'inventory_actions':
                    try {
                        await InventoryHandler.handleAction(interaction, gameState, selectedValue);
                    } catch (error) {
                        logger.error('Error handling inventory actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Floor actions handler
                case 'floor_actions':
                    try {
                        await FloorHandler.handleFloorAction(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling floor actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;
                
                case 'division_selection':
                    try {
                        await DivisionHandler.handleDivisionSelection(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling division selection:', error);
                        await this.safeInteractionResponse(interaction, { 
                            content: '❌ Error selecting division. Please try again.', 
                            flags: MessageFlags.Ephemeral
                        }, 'reply');
                    }
                    break;

                // Exploration result handler
                case 'exploration_result':
                    try {
                        await ExplorationHandler.handleExplorationChoice(interaction, gameState, selectedValue);
                    } catch (error) {
                        logger.error('Error handling exploration result:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Quest menu handler
                case 'quest_menu':
                    try {
                        await QuestHandler.handleQuestMenuSelection(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling quest menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Exchange menu handler
                case 'exchange_menu':
                    try {
                        await DivisionHandler.handleExchangeAction(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling exchange menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Wallet menu handler
                case 'wallet_menu':
                    try {
                        await DivisionHandler.handleWalletAction(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling wallet menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;
                
                case 'battle_actions':
                    await this.handleBattleAction(interaction, selectedValue, gameState);
                    break;
                
                case 'victory_actions':
                    await this.handleVictoryAction(interaction, selectedValue, gameState);
                    break;
                
                case 'death_actions':
                    await this.handleDeathAction(interaction, selectedValue, gameState);
                    break;
                
                case 'shop_actions':
                    await this.handleShopAction(interaction, selectedValue, gameState);
                    break;
                
                case 'chest_actions':
                    try {
                        await ChestHandler.handleChestAction(interaction, gameState, selectedValue);
                    } catch (error) {
                        logger.error('Error handling chest action:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;
                
                case 'mimic_battle':
                    await this.handleMimicBattle(interaction, selectedValue, gameState);
                    break;
                
                case 'flee_result':
                    try {
                        if (selectedValue === 'return_to_floor') {
                            await FloorHandler.showFloor(interaction, gameState);
                        }
                    } catch (error) {
                        logger.error('Error handling flee result:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'floor_cleared_actions':
                    try {
                        if (selectedValue === 'advance_floor') {
                            await FloorHandler.advanceToNextFloor(interaction, gameState);
                        } else if (selectedValue === 'continue_exploring') {
                            await FloorHandler.showFloor(interaction, gameState);
                        } else if (selectedValue === 'return_to_floor') {
                            await FloorHandler.showFloor(interaction, gameState);
                        }
                    } catch (error) {
                        logger.error('Error handling floor cleared actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'profile_menu':
                    try {
                        await ProfileHandler.handleProfileMenuSelection(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling profile menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Marketplace handlers (separate from game state) - Updated to use PersistentEmbedManager
                case 'marketplace_main':
                    try {
                        const { PermanentEmbedHandler } = await import('../handlers/ui/PermanentEmbedHandler.js');
                        await PermanentEmbedHandler.handleMarketplace(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling marketplace main selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Bot Dev Dashboard handlers - NEW Phase 2
                case 'bot_dev_dashboard_main':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleBotDevDashboard(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling bot dev dashboard selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;



                // Admin Dashboard handlers - NEW Phase 2.2
                case 'admin_dashboard_main':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleAdminDashboard(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin dashboard selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Admin Setup button handlers - NEW
                case 'admin_setup_full':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleAdminSetupFull(interaction);
                    } catch (error) {
                        logger.error('Error handling admin setup full:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_setup_quick':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleAdminSetupQuick(interaction);
                    } catch (error) {
                        logger.error('Error handling admin setup quick:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_setup_custom':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleAdminSetupCustom(interaction);
                    } catch (error) {
                        logger.error('Error handling admin setup custom:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_setup_cancel':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleAdminSetupCancel(interaction);
                    } catch (error) {
                        logger.error('Error handling admin setup cancel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Admin Dashboard Setup Flow Handlers - NEW SYSTEM
                case 'admin_create_category':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleCreateCategory(interaction, 'admin');
                    } catch (error) {
                        logger.error('Error handling admin create category:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_existing_category':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleExistingCategory(interaction, 'admin');
                    } catch (error) {
                        logger.error('Error handling admin existing category:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_custom_admin_only':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showCategorySelection(interaction, 'admin_dashboard_only');
                    } catch (error) {
                        logger.error('Error handling admin dashboard only setup:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_custom_start_here_only':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showCategorySelection(interaction, 'start_here_only');
                    } catch (error) {
                        logger.error('Error handling start here only setup:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_custom_both':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showCategorySelection(interaction, 'admin');
                    } catch (error) {
                        logger.error('Error handling admin both dashboards setup:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Category/Channel selection dropdown handlers
                case 'select_existing_category':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleCategorySelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling category selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'select_existing_channel':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleChannelSelectionDropdown(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling channel selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_setup_start_here_next':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showChannelSelection(interaction, 'admin', 'stored', 'start_here');
                    } catch (error) {
                        logger.error('Error handling start here next:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Custom setup handlers - missing buttons
                case 'start_here_only_existing_category':
                case 'start_here_only_create_category':
                case 'admin_dashboard_only_existing_category':
                case 'admin_dashboard_only_create_category':
                case 'master_custom_existing_category':
                case 'master_custom_create_category':
                case 'master_custom_setup_cancel':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleCustomSetupButton(interaction, customId);
                    } catch (error) {
                        logger.error('Error handling custom setup button:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'setup_complete':
                    try {
                        await interaction.update({
                            content: '🎉 **Setup Complete!** Your dashboard system is ready to use.',
                            embeds: [],
                            components: []
                        });
                    } catch (error) {
                        logger.error('Error handling setup complete:', error);
                        await this.safeInteractionResponse(interaction, 'Setup completed successfully!');
                    }
                    break;

                // Bot Dev (Master) Dashboard Setup Flow Handlers - NEW SYSTEM
                case 'master_create_category':
                case 'master_quick_create_category':
                case 'master_custom_create_category':
                    try {
                        const setupType = customId.replace('_create_category', '');
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleCreateCategory(interaction, setupType);
                    } catch (error) {
                        logger.error('Error handling master create category:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_existing_category':
                case 'master_quick_existing_category':
                case 'master_custom_existing_category':
                    try {
                        const setupType = customId.replace('_existing_category', '');
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handleExistingCategory(interaction, setupType);
                    } catch (error) {
                        logger.error('Error handling master existing category:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;



                // Back button handlers
                case 'admin_back_to_category':
                case 'master_back_to_category':
                    try {
                        const setupType = customId.replace('_back_to_category', '');
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.showCategorySelection(interaction, setupType);
                    } catch (error) {
                        logger.error('Error handling back to category:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // REMOVED: Old admin dashboard routing - migrated to unified DashboardEmbedHandler
                // Phase 3 Cleanup: All admin interactions now route through admin_dashboard_main to DashboardEmbedHandler

                // Player Dashboard handlers - NEW Phase 2.3
                case 'player_dashboard_main':
                    try {
                        const { DashboardEmbedHandler } = await import('../handlers/ui/DashboardEmbedHandler.js');
                        await DashboardEmbedHandler.handlePlayerDashboard(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling player dashboard selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Player Tutorial & Help handlers - Phase 2.3
                case 'player_tutorial_main':
                case 'player_help_main':
                    try {
                        if (selectedValue) {
                            await interaction.reply({
                                content: `📚 **${selectedValue.toUpperCase()}** - Coming Soon!\n\nThis tutorial/help feature will be implemented in the next phase.`,
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        logger.error('Error handling player tutorial/help selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'store_menu':
                    try {
                        if (selectedValue === 'back_to_main') {
                            await MarketplaceHandler.handleBackToMain(interaction);
                        } else {
                            // Handle store actions (will be implemented in Phase 2)
                            await interaction.followUp({
                                content: `🚧 Store feature "${selectedValue}" coming soon!`,
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        logger.error('Error handling store menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Store action handlers
                case 'store_actions':
                    try {
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        await MarketplaceHandler.handleStoreSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling store actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Store purchase handler (Phase 2)
                case 'store_purchase':
                    try {
                        await MarketplaceHandler.handleStorePurchase(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling store purchase:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Division browsing handler
                case 'division_browsing':
                    try {
                        await MarketplaceHandler.handleDivisionBrowsing(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling division browsing:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Coin flip wager handler (Phase 2)
                case 'coin_flip_wager':
                    try {
                        const division = customId.replace('coinflip_wager_', '');
                        const wagerAmount = interaction.values[0];
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        
                        if (wagerAmount === 'back_to_division_select') {
                            await MarketplaceHandler.handleCoinflipStart(interaction);
                        } else if (wagerAmount === 'custom_wager') {
                            await MarketplaceHandler.showCustomWagerModal(interaction, division);
                        } else {
                            await MarketplaceHandler.processCoinflip(interaction, division, parseInt(wagerAmount));
                        }
                    } catch (error) {
                        logger.error('Error handling coinflip wager:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Sell items handler (Phase 2)
                case 'sell_items':
                    try {
                        await MarketplaceHandler.handleSellItems(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling sell items:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Coin flip choice handler (Phase 2)
                case 'coin_flip_choice':
                    try {
                        await MarketplaceHandler.handleCoinFlipChoice(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling coin flip choice:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Coin flip result handler (Phase 2)
                case 'coin_flip_result':
                    try {
                        await MarketplaceHandler.handleCoinFlipResult(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling coin flip result:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Player chests menu handler
                case 'player_chests_menu':
                    try {
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        await MarketplaceHandler.handlePlayerChestsSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling player chests menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'marketplace_profile_chest':
                    try {
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        if (selectedValue === 'back_to_player_chests') {
                            await MarketplaceHandler.showPlayerChests(interaction);
                        } else if (selectedValue === 'back_to_marketplace') {
                            await MarketplaceHandler.handleBackToMain(interaction);
                        } else if (selectedValue === 'debug_promotional_check') {
                            // Handle debug promotional check
                            const { PromotionalHandler } = await import('../handlers/user/PromotionalHandler.js');
                            await PromotionalHandler.manualPromotionalCheck(interaction);
                        } else if (selectedValue === 'debug_clear_promotional') {
                            // Handle debug clear promotional
                            const { PromotionalHandler } = await import('../handlers/user/PromotionalHandler.js');
                            await PromotionalHandler.clearPromotionalWeapons(interaction);
                        } else {
                            // Handle other profile chest actions
                            await this.safeInteractionResponse(interaction, {
                                content: '🚧 This feature is being developed. More profile chest management options coming soon!',
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    } catch (error) {
                        logger.error('Error handling marketplace profile chest:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'player_market_menu':
                    try {
                        if (selectedValue === 'back_to_main') {
                            await MarketplaceHandler.handleBackToMain(interaction);
                        } else {
                            // Handle player market actions (will be implemented in Phase 3)
                            await interaction.followUp({
                                content: `🚧 Player market feature "${selectedValue}" coming soon!`,
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        logger.error('Error handling player market menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'trading_post_menu':
                    try {
                        if (selectedValue === 'back_to_main') {
                            await MarketplaceHandler.handleBackToMain(interaction);
                        } else {
                            // Handle trading post actions (will be implemented in Phase 4)
                            await interaction.followUp({
                                content: `🚧 Trading post feature "${selectedValue}" coming soon!`,
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        logger.error('Error handling trading post menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'crafting_menu':
                    try {
                        if (selectedValue === 'back_to_main') {
                            await MarketplaceHandler.handleBackToMain(interaction);
                        } else {
                            await interaction.followUp({
                                content: '🔨 Crafting system is under development!',
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        logger.error('Error handling crafting menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Portal system handlers
                case 'portal_menu':
                    try {
                        const { PortalHandler } = await import('../handlers/core/PortalHandler.js');
                        await PortalHandler.handlePortalSelection(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling portal menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'profile_chest_actions':
                    try {
                        const { PortalHandler } = await import('../handlers/core/PortalHandler.js');
                        await PortalHandler.handleProfileChestAction(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling profile chest actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'adventure_chest_actions':
                    try {
                        const { PortalHandler } = await import('../handlers/core/PortalHandler.js');
                        await PortalHandler.handleAdventureChestAction(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling adventure chest actions:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // REMOVED: Old admin system handlers - migrated to unified DashboardEmbedHandler system
                // Phase 3 Cleanup: All dashboard interactions now route through DashboardEmbedHandler

                // Master Dashboard handlers
                case 'master_dashboard_create_private':
                    try {
                        const { BotDeveloperHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDeveloperHandler.createPrivateMasterDashboard(interaction);
                    } catch (error) {
                        logger.error('Error creating private Master Dashboard:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred creating private dashboard.');
                    }
                    break;

                case 'master_dashboard_use_current':
                    try {
                        const { BotDeveloperHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDeveloperHandler.createCurrentChannelMasterDashboard(interaction);
                    } catch (error) {
                        logger.error('Error creating Master Dashboard in current channel:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred creating dashboard.');
                    }
                    break;

                case 'goto_master_dashboard':
                    try {
                        // Find the Master Dashboard channel
                        const masterDashboardChannel = interaction.guild.channels.cache.find(
                            ch => ch.type === 0 && (ch.name === '⚔️│master-dashboard' || ch.name === 'master-dashboard')
                        );
                        
                        if (masterDashboardChannel) {
                            await interaction.update({
                                content: `🎯 **Redirecting to Master Dashboard**: ${masterDashboardChannel}\n\n⚔️ **Access your command center there!**`,
                                embeds: [],
                                components: []
                            });
                        } else {
                            await interaction.update({
                                content: '❌ Master Dashboard channel not found. Use `/master dashboard` to create one.',
                                embeds: [],
                                components: []
                            });
                        }
                    } catch (error) {
                        logger.error('Error navigating to Master Dashboard:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred navigating to dashboard.');
                    }
                    break;

                // Admin Item Management handlers
                case 'admin_item_management':
                    try {
                        await AdminHandler.handleItemManagementSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin item management selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Master Dashboard main menu handler (CRITICAL: Must be in main interaction handler, not modal handler)
                case 'master_dashboard_main':
                    try {
                        await this.handleMasterDashboardSelection(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master dashboard selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Master Economy Tools handlers
                case 'master_economy_tools':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handleMasterEconomySelection(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master economy tools selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_gold_operations':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handleGoldOperations(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master gold operations:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_manual_operations':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handleManualOperations(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master manual operations:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'master_item_operations':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handleItemOperations(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling master item operations:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'promo_weapons_distribution':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handlePromoWeaponsDistribution(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling promo weapons distribution:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_item_creator':
                    try {
                        await AdminHandler.handleItemCreatorSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin item creator selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_inventory_manager':
                    try {
                        await AdminHandler.handleInventoryManagerSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin inventory manager selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_item_viewer':
                    try {
                        await AdminHandler.handleItemViewerSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin item viewer selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_item_remover':
                    try {
                        await AdminHandler.handleItemRemoverSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin item remover selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_item_statistics':
                    try {
                        await AdminHandler.handleItemStatisticsSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin item statistics selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_item_backup':
                    try {
                        await AdminHandler.handleItemBackupSelection(interaction, selectedValue);
                    } catch (error) {
                        logger.error('Error handling admin item backup selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Modal submissions for item creation
                case 'admin_weapon_creation_modal':
                    try {
                        await AdminHandler.handleWeaponCreationModal(interaction);
                    } catch (error) {
                        logger.error('Error handling weapon creation modal:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_armor_creation_modal':
                    try {
                        await AdminHandler.handleArmorCreationModal(interaction);
                    } catch (error) {
                        logger.error('Error handling armor creation modal:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_consumable_creation_modal':
                    try {
                        await AdminHandler.handleConsumableCreationModal(interaction);
                    } catch (error) {
                        logger.error('Error handling consumable creation modal:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_special_creation_modal':
                    try {
                        await AdminHandler.handleSpecialCreationModal(interaction);
                    } catch (error) {
                        logger.error('Error handling special creation modal:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_player_search_modal':
                    try {
                        await AdminHandler.handlePlayerSearchModal(interaction);
                    } catch (error) {
                        logger.error('Error handling player search modal:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'user_security_profile_setup':
                    try {
                        const { UserProfileHandler: SecurityHandler } = await import('../handlers/user/UserProfileHandler.js');
                        await SecurityHandler.handleSecurityProfileSetup(interaction);
        } catch (error) {
                        logger.error('Error handling security profile setup:', error);
                        await interaction.reply({
                            content: '❌ Error setting up security profile.',
                            ephemeral: true
            });
        }
                    break;

                case 'custom_wager_modal':
                    try {
                        const wagerAmount = parseInt(interaction.fields.getTextInputValue('custom_wager_amount'));
                        
                        // Extract division from customId (format: custom_wager_modal_division)
                        let division = 'gold'; // default
                        if (interaction.customId.includes('_')) {
                            const parts = interaction.customId.split('_');
                            division = parts[parts.length - 1]; // Get last part as division
                        }
                        
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        await MarketplaceHandler.processCoinflip(interaction, division, wagerAmount);
        } catch (error) {
                        logger.error('Error handling custom wager:', error);
                        await interaction.reply({
                            content: '❌ Error processing custom wager. Please enter a valid number.',
                            ephemeral: true
                        });
        }
                    break;

                // Handle marketplace-related select menus
                case 'marketplace_main_menu':
                case 'store_division_select':
                case 'store_category_select':
                case 'my_chests_main':
                case 'player_market_main':
                    try {
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        await MarketplaceHandler.handleSelectMenu(interaction);
        } catch (error) {
                        logger.error('Error handling marketplace select menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
        }
                    break;

                // Handle coinflip division selection
                case 'coinflip_division_select':
                    try {
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        const selectedDivision = interaction.values[0];
                        await MarketplaceHandler.handleCoinflipDivisionSelect(interaction, selectedDivision);
        } catch (error) {
                        logger.error('Error handling coinflip division selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
        }
                    break;

                // Handle casino game selection
                case 'casino_game_select':
                    try {
                        const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                        const selectedValue = interaction.values[0];
                        
                        if (selectedValue === 'coin_flip') {
                            await MarketplaceHandler.handleCoinflipStart(interaction);
                        } else if (selectedValue === 'back_to_game_hall') {
                            // Handle back to game hall - could show game hall embed or close casino
            await this.safeInteractionResponse(interaction, { 
                                content: '🏠 **Returned to Game Hall**\n\nUse the Game Hall embed below to start a new adventure!',
                                embeds: [],
                                components: []
                            });
                        } else {
                            await this.safeInteractionResponse(interaction, 'This game is coming soon! Please try Coin Flip.');
                        }
        } catch (error) {
                        logger.error('Error handling casino game selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;
                
                // Handle coinflip call (heads/tails)
                default:
                    if (customId.startsWith('coinflip_wager_')) {
        try {
                            const division = customId.replace('coinflip_wager_', '');
                            const wagerAmount = interaction.values[0];
                            const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                            
                            if (wagerAmount === 'back_to_division_select') {
                                await MarketplaceHandler.handleCoinflipStart(interaction);
                            } else if (wagerAmount === 'custom_wager') {
                                await MarketplaceHandler.showCustomWagerModal(interaction, division);
            } else {
                                await MarketplaceHandler.processCoinflip(interaction, division, parseInt(wagerAmount));
            }
        } catch (error) {
                            logger.error('Error handling coinflip wager:', error);
                            await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                        }
                        return;
    }

                    // Handle coinflip call (heads/tails)
                    if (customId.startsWith('coinflip_call_')) {
                        try {
                            const [, , division, wagerAmount] = customId.split('_');
                            const playerCall = interaction.values[0];
                            const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                            await MarketplaceHandler.executeCoinflip(interaction, division, parseInt(wagerAmount), playerCall);
        } catch (error) {
                            logger.error('Error handling coinflip call:', error);
                            await this.safeInteractionResponse(interaction, 'An error occurred processing your coinflip. Please try again.');
                        }
                        return;
                    }

                    logger.warn(`Unhandled select menu interaction: ${customId}`);
            }
        } catch (error) {
            auditLogger.log('ERROR', `Error handling interaction ${customId}: ${error.message}`, 'interaction_handler_error');
            logger.error(`Error handling interaction ${customId}:`, error);
            
            // Try to respond with error message
            await this.safeInteractionResponse(interaction, { 
                content: '❌ An error occurred while processing your action. Please try again.', 
                flags: MessageFlags.Ephemeral
            }, 'reply');
        }
    }

    /**
     * Handle user password authentication for smart login
     */
    static async handleUserPasswordAuthSmartLogin(interaction, gameState) {
        try {
            const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
            await UserProfileHandler.handlePasswordAuth(interaction, 'smart_login');
        } catch (error) {
            logger.error('Error handling smart login password auth:', error);
            await this.safeInteractionResponse(interaction, 'An error occurred during authentication. Please try again.');
        }
    }

    /**
     * Handle user password authentication for casino
     */
    static async handleUserPasswordAuthCasino(interaction, gameState) {
        try {
            const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
            const authenticated = await UserProfileHandler.handlePasswordAuth(interaction, 'casino');
            
            if (authenticated) {
                // After successful authentication, start coinflip
                const { MarketplaceHandler } = await import('../handlers/marketplace/MarketplaceHandler.js');
                await MarketplaceHandler.handleCoinflipStart(interaction);
            }
        } catch (error) {
            logger.error('Error handling casino password auth:', error);
            await this.safeInteractionResponse(interaction, 'An error occurred during authentication. Please try again.');
        }
    }

    /**
     * Handle modal submissions
     */
    static async handleModalSubmission(interaction) {
        try {
            const customId = interaction.customId;
            
            // Route to appropriate handlers based on modal ID
            switch (customId) {
                case 'admin_password_modal':
                    const { AdminHandler } = await import('../handlers/admin/AdminHandler.js');
                    await AdminHandler.handlePasswordSubmission(interaction);
                    break;
                    
                case 'player_password_modal':
                    const { UserProfileHandler } = await import('../handlers/user/UserProfileHandler.js');
                    await UserProfileHandler.handlePasswordSubmission(interaction);
                    break;
                    
                case 'server_owner_security_profile':
                    const { ServerOwnerHandler } = await import('../handlers/admin/ServerOwnerHandler.js');
                    await ServerOwnerHandler.handleSecurityProfileSubmission(interaction);
                    break;
                    
                case 'master_password_modal':
                case 'master_password_auth_modal':
                    const { BotDeveloperHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                    await BotDeveloperHandler.handlePasswordAuthentication(interaction);
                    break;
                    
                case 'master_security_profile':
                    const { BotDeveloperHandler: DevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                    await DevHandler.handleSecurityProfileSetup(interaction);
                    break;
                    
                case 'user_password_modal':
                    await this.handleUserPasswordAuth(interaction);
                    break;
                    
                case 'casino_password_modal':
                    await this.handleCasinoPasswordAuth(interaction);
                    break;
                    
                case 'master_password_change_modal':
                    const { BotDeveloperHandler: DevHandlerPassword } = await import('../handlers/admin/BotDeveloperHandler.js');
                    await DevHandlerPassword.handlePasswordChange(interaction);
                    break;
                    
                case 'security_profile_update_modal':
                    try {
                        const modalData = {
                            x_account: interaction.fields.getTextInputValue('x_account'),
                            evm_wallet: interaction.fields.getTextInputValue('evm_wallet'),
                            email: interaction.fields.getTextInputValue('email')
                        };
                        await BotDeveloperHandler.processSecurityProfileUpdate(interaction, modalData);
                    } catch (error) {
                        logger.error('Error handling security profile update modal:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred processing your security update.');
                    }
                    break;

                case 'admin_send_currency_modal':
                    try {
                        const modalData = {
                            target_user_id: interaction.fields.getTextInputValue('target_user_id'),
                            currency_type: interaction.fields.getTextInputValue('currency_type'),
                            amount: interaction.fields.getTextInputValue('amount'),
                            reason: interaction.fields.getTextInputValue('reason'),
                            admin_password: interaction.fields.getTextInputValue('admin_password')
                        };
                        await AdminHandler.processSendCurrency(interaction, modalData);
                    } catch (error) {
                        logger.error('Error handling admin send currency modal:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred processing the currency transfer.');
                    }
                    break;
                    
                case 'admin_items':
                    try {
                        await AdminHandler.showItemManagement(interaction);
                    } catch (error) {
                        logger.error('Error handling admin items:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_economy':
                    try {
                        await AdminHandler.showEconomyTools(interaction);
                    } catch (error) {
                        logger.error('Error handling admin economy:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'admin_economy_tools':
                    try {
                        await AdminHandler.handleEconomyToolsSelection(interaction, validatedValue);
                    } catch (error) {
                        logger.error('Error handling admin economy tools:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Master Economy Tools Modal Submissions
                case 'master_generate_gold_modal':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handleGenerateGoldSubmission(interaction);
                    } catch (error) {
                        logger.error('Error handling generate gold submission:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred processing gold generation.');
                    }
                    break;

                case 'master_burn_gold_modal':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handleBurnGoldSubmission(interaction);
                    } catch (error) {
                        logger.error('Error handling burn gold submission:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred processing gold burn.');
                    }
                    break;

                case 'promo_single_player_modal':
                    try {
                        const { BotDeveloperHandler: BotDevHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
                        await BotDevHandler.handlePromoSinglePlayerSubmission(interaction);
                    } catch (error) {
                        logger.error('Error handling promo weapon grant submission:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred processing promotional weapon grant.');
                    }
                    break;
                    
                default:
                    logger.warn(`Unknown modal submission: ${customId}`);
                    await interaction.reply({
                        content: '❌ Unknown modal submission. Please try again.',
                        ephemeral: true
                    });
            }
            
        } catch (error) {
            logger.error('Error handling modal submission:', error);
            await interaction.reply({
                content: '❌ Error processing form submission. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Master Dashboard menu selections
     */
    static async handleMasterDashboardSelection(interaction, selectedValue) {
        try {
            // Verify Bot Developer access
            const { BotDeveloperHandler } = await import('../handlers/admin/BotDeveloperHandler.js');
            if (!BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
                await interaction.update({
                    content: '❌ Access denied. Master Dashboard is restricted to Bot Developer only.',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
                return;
            }

            switch (selectedValue) {
                case 'system_management':
                    // Route to master control panel server management
                    await BotDeveloperHandler.handleControlPanelSelection(interaction, 'master_server_mgmt');
                    break;
                    
                case 'user_management':
                    // Route to master control panel user management
                    await BotDeveloperHandler.handleControlPanelSelection(interaction, 'master_user_mgmt');
                    break;
                    
                case 'economy_tools':
                    // Route to Master Economy Tools (Bot Developer infinite powers)
                    // Skip auth since user is already authenticated for Master Dashboard
                    await BotDeveloperHandler.showMasterEconomyTools(interaction, true);
                    break;
                    
                case 'game_management':
                    // Route to admin item management
                    const { AdminHandler: AdminHandlerItems } = await import('../handlers/admin/AdminHandler.js');
                    await AdminHandlerItems.showItemManagement(interaction);
                    break;
                    
                case 'analytics':
                    // Route to master analytics
                    await BotDeveloperHandler.handleControlPanelSelection(interaction, 'master_analytics');
                    break;
                    
                case 'developer_tools':
                    // Route to master system tools
                    await BotDeveloperHandler.handleControlPanelSelection(interaction, 'master_system');
                    break;
                    
                default:
                    await interaction.update({
                        content: '❌ Unknown master dashboard action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling master dashboard selection:', error);
            await interaction.update({
                content: '❌ Error processing master dashboard action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }


} 