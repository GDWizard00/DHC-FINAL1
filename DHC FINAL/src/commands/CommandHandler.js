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
import { getServiceRegistry } from '../utils/serviceRegistry.js';
import { logger } from '../utils/logger.js';
import { auditLogger } from '../utils/auditLogger.js';
import { MessageFlags } from 'discord.js';

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
            if (!interaction || interaction.replied || interaction.deferred) {
                auditLogger.log('ERROR', 'Interaction already handled or invalid', 'interaction_error');
                return false;
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

            // Execute the appropriate response method
            if (method === 'reply') {
                await interaction.reply(response);
            } else if (method === 'update') {
                await interaction.update(response);
            } else if (method === 'followUp') {
                await interaction.followUp(response);
            } else if (method === 'editReply') {
                await interaction.editReply(response);
            }

            auditLogger.log('SUCCESS', `Interaction ${method} successful`, 'interaction_response');
            return true;

        } catch (error) {
            auditLogger.log('ERROR', `Interaction ${method} failed: ${error.message}`, 'interaction_error');
            logger.error(`Failed to ${method} interaction:`, error);
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
     * Handle string select menu interactions
     */
    static async handleInteraction(interaction) {
        if (!interaction.isStringSelectMenu()) return;

        const userId = interaction.user.id;
        const customId = interaction.customId;
        const selectedValue = interaction.values[0];

        auditLogger.log('INTERACTION', `User ${userId} selected ${selectedValue} from ${customId}`, 'interaction_received');
        logger.info(`User ${userId} selected ${selectedValue} from ${customId}`);

        try {
            // Check interaction validity first
            if (interaction.replied || interaction.deferred) {
                auditLogger.log('ERROR', 'Interaction already handled before processing', 'interaction_already_handled');
                return;
            }

            // Get game state using StateService
            const serviceRegistry = getServiceRegistry();
            const stateService = serviceRegistry.getStateService();
            const gameState = stateService.getUserState(userId);

            if (!gameState) {
                await this.safeInteractionResponse(interaction, { 
                    content: '❌ No active game session found. Start a game with `!ch` first.', 
                    flags: MessageFlags.Ephemeral
                }, 'reply');
                return;
            }

            // Update activity
            gameState.updateActivity();

            // Route interaction based on custom ID
            switch (customId) {
                // Start menu handler
                case 'start_menu':
                    try {
                        const action = interaction.values[0];
                        
                        switch (action) {
                            case 'start_game':
                                await this.handleStartGameFromMenu(interaction, gameState);
                                break;
                            case 'tutorial':
                                await this.handleTutorial(interaction, gameState);
                                break;
                            case 'daily_quests':
                                await this.handleDailyQuests(interaction, gameState);
                                break;
                            case 'profile':
                                await this.handleProfile(interaction, gameState);
                                break;
                            case 'leaderboard':
                                await this.handleLeaderboard(interaction, gameState);
                                break;
                            case 'exchange_menu':
                                await this.handleExchangeMenu(interaction, gameState);
                                break;
                            case 'wallet_loader':
                                await this.handleWalletLoader(interaction, gameState);
                                break;
                            default:
                                await this.safeInteractionResponse(interaction, 'Invalid option selected.');
                        }
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
                        await HeroSelectionHandler.handleHeroSelection(interaction, gameState, selectedValue);
                    } catch (error) {
                        logger.error('Error handling hero selection:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Hero confirmation handler
                case 'hero_confirmation':
                    try {
                        await HeroSelectionHandler.handleHeroConfirmation(interaction, gameState, selectedValue);
                    } catch (error) {
                        logger.error('Error handling hero confirmation:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                // Dungeon entrance handler
                case 'dungeon_entrance':
                    try {
                        await DungeonEntranceHandler.handleSelection(interaction, gameState, selectedValue);
                    } catch (error) {
                        logger.error('Error handling dungeon entrance:', error);
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
                        await FloorHandler.handleSelection(interaction, gameState, selectedValue);
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
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;
                
                case 'look_around_result':
                    await this.handleLookAroundResult(interaction, selectedValue, gameState);
                    break;
                
                case 'exploration_result':
                    await this.handleExplorationResult(interaction, selectedValue, gameState);
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
                    await this.handleChestAction(interaction, selectedValue, gameState);
                    break;
                
                case 'mimic_battle':
                    await this.handleMimicBattle(interaction, selectedValue, gameState);
                    break;

                case 'quest_menu':
                    try {
                        await QuestHandler.handleQuestMenuSelection(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling quest menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'exchange_menu':
                    try {
                        await DivisionHandler.handleExchangeAction(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling exchange menu:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;

                case 'wallet_loader':
                    try {
                        await DivisionHandler.handleWalletAction(interaction, selectedValue, gameState);
                    } catch (error) {
                        logger.error('Error handling wallet loader:', error);
                        await this.safeInteractionResponse(interaction, 'An error occurred. Please try again.');
                    }
                    break;
                
                default:
                    auditLogger.log('ERROR', `Unknown interaction custom ID: ${customId}`, 'unknown_interaction');
                    logger.warn(`Unknown interaction custom ID: ${customId}`);
                    await this.safeInteractionResponse(interaction, { 
                        content: '❌ Unknown action. Please try again.', 
                        flags: MessageFlags.Ephemeral
                    }, 'reply');
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
     * Handle start game command (!ch)
     */
    static async handleStartGame(message) {
        try {
            const userId = message.author.id;
            const userName = message.author.username;
            const channelId = message.channel.id;

            auditLogger.log('COMMAND', `User ${userId} (${userName}) used !ch command`, 'start_game');
            logger.info(`Starting new game for user ${userId} (${userName})`);

            // Get or create game state using StateService
            const serviceRegistry = getServiceRegistry();
            const stateService = serviceRegistry.getStateService();
            let gameState = stateService.getUserState(userId);

            if (gameState) {
                auditLogger.log('GAME_STATE', `Resuming existing game for user ${userId}`, 'resume_game');
                logger.info(`Resuming existing game for user ${userId}`);
                gameState.session.channelId = channelId;
                gameState.updateActivity();
            } else {
                auditLogger.log('GAME_STATE', `Creating new game state for user ${userId}`, 'new_game');
                logger.info(`Creating new game state for user ${userId}`);
                
                // Create new game state with correct constructor
                gameState = new GameState(userId);
                gameState.playerName = userName;
                gameState.session.channelId = channelId;

                // Store in state service
                stateService.setUserState(userId, gameState);
            }

            // Show start menu instead of division selection per updated flow
            await StartMenuHandler.showStartMenu(message, gameState);

            auditLogger.log('SCREEN', `Start menu displayed for user ${userId}`, 'start_menu');
            logger.info(`Start menu displayed for user ${userId}`);

        } catch (error) {
            auditLogger.log('ERROR', `Error starting game for ${message.author.id}: ${error.message}`, 'start_game_error');
            logger.error(`Error starting game for ${message.author.id}:`, error);
            await message.reply({
                content: '❌ Failed to start the game. Please try again.',
                allowedMentions: { repliedUser: false }
            });
        }
    }

    /**
     * Handle start game selection from start menu
     */
    static async handleStartGameFromMenu(interaction, gameState) {
        try {
            // Show hero selection screen
            await HeroSelectionHandler.showHeroSelection(interaction, gameState);
            
        } catch (error) {
            logger.error('Error starting game:', error);
            await this.safeInteractionResponse(interaction, 'Error starting game. Please try again.');
        }
    }

    /**
     * Handle tutorial selection
     */
    static async handleTutorial(interaction, gameState) {
        try {
            // Show tutorial
            await StartMenuHandler.showTutorial(interaction, gameState);
            
        } catch (error) {
            logger.error('Error showing tutorial:', error);
            await this.safeInteractionResponse(interaction, 'Error loading tutorial. Please try again.');
        }
    }

    /**
     * Handle daily quests selection
     */
    static async handleDailyQuests(interaction, gameState) {
        try {
            // Show daily quests
            await QuestHandler.showDailyQuests(interaction, gameState);
            
        } catch (error) {
            logger.error('Error showing daily quests:', error);
            await this.safeInteractionResponse(interaction, 'Error loading daily quests. Please try again.');
        }
    }

    /**
     * Handle profile selection
     */
    static async handleProfile(interaction, gameState) {
        try {
            // Import ProfileHandler - need to handle this differently since it's not imported at top
            const { ProfileHandler } = await import('../handlers/core/ProfileHandler.js');
            
            // Show profile
            await ProfileHandler.showProfile(interaction, gameState);
            
        } catch (error) {
            logger.error('Error showing profile:', error);
            await this.safeInteractionResponse(interaction, 'Error loading profile. Please try again.');
        }
    }

    /**
     * Handle leaderboard selection
     */
    static async handleLeaderboard(interaction, gameState) {
        try {
            // Show leaderboard
            await StartMenuHandler.showLeaderboard(interaction, gameState);
            
        } catch (error) {
            logger.error('Error showing leaderboard:', error);
            await this.safeInteractionResponse(interaction, 'Error loading leaderboard. Please try again.');
        }
    }

    /**
     * Handle exchange menu selection
     */
    static async handleExchangeMenu(interaction, gameState) {
        try {
            // Show exchange menu
            await DivisionHandler.showExchangeMenu(interaction, gameState);
            
        } catch (error) {
            logger.error('Error showing exchange menu:', error);
            await this.safeInteractionResponse(interaction, 'Error loading exchange menu. Please try again.');
        }
    }

    /**
     * Handle wallet loader selection
     */
    static async handleWalletLoader(interaction, gameState) {
        try {
            // Show wallet loader
            await DivisionHandler.showWalletLoader(interaction, gameState);
            
        } catch (error) {
            logger.error('Error showing wallet loader:', error);
            await this.safeInteractionResponse(interaction, 'Error loading wallet loader. Please try again.');
        }
    }

    /**
     * Show division selection menu
     */
    static async showDivisionSelection(message, gameState) {
        await DivisionHandler.showDivisionSelection(message, gameState);
    }

    /**
     * Handle division selection
     */
    static async handleDivisionSelection(interaction, selectedValue, gameState) {
        try {
            await DivisionHandler.handleDivisionSelection(interaction, selectedValue, gameState);
        } catch (error) {
            logger.error('Error handling division selection:', error);
            await this.safeInteractionResponse(interaction, { 
                content: '❌ Error selecting division. Please try again.', 
                flags: MessageFlags.Ephemeral
            }, 'reply');
        }
    }

    /**
     * Handle save game command
     */
    static async handleSaveGame(message) {
        try {
            const userId = message.author.id;
            const serviceRegistry = getServiceRegistry();
            const stateService = serviceRegistry.getStateService();
            const gameState = stateService.getUserState(userId);

            if (!gameState) {
                await message.reply({
                    content: '❌ No active game session found. Start a game with `!ch` first.',
                    allowedMentions: { repliedUser: false }
                });
                return;
            }

            // Save to database
            await DatabaseManager.saveGameState(userId, gameState);
            gameState.session.lastSaved = new Date();

            await message.reply({
                content: '✅ Game saved successfully!',
                allowedMentions: { repliedUser: false }
            });

            logger.info(`Game saved for user ${userId}`);

        } catch (error) {
            logger.error(`Error saving game for ${message.author.id}:`, error);
            await message.reply({
                content: '❌ Failed to save the game. Please try again.',
                allowedMentions: { repliedUser: false }
            });
        }
    }

    /**
     * Handle load game command
     */
    static async handleLoadGame(message) {
        try {
            const userId = message.author.id;
            
            // Load from database
            const gameStateData = await DatabaseManager.getGameState(userId);
            
            if (!gameStateData) {
                await message.reply({
                    content: '❌ No saved game found. Start a new game with `!ch` first.',
                    allowedMentions: { repliedUser: false }
                });
                return;
            }

            // Create game state from saved data
            const gameState = GameState.fromJSON(gameStateData);
            gameState.session.channelId = message.channel.id;
            gameState.updateActivity();

            // Store in state service
            const serviceRegistry = getServiceRegistry();
            const stateService = serviceRegistry.getStateService();
            stateService.setUserState(userId, gameState);

            await message.reply({
                content: '✅ Game loaded successfully!',
                allowedMentions: { repliedUser: false }
            });

            // Resume from the saved screen
            await this.resumeGameFromState(message, gameState);

            logger.info(`Game loaded for user ${userId}`);

        } catch (error) {
            logger.error(`Error loading game for ${message.author.id}:`, error);
            await message.reply({
                content: '❌ Failed to load the game. Please try again.',
                allowedMentions: { repliedUser: false }
            });
        }
    }

    /**
     * Resume game from saved state
     */
    static async resumeGameFromState(message, gameState) {
        try {
            const currentScreen = gameState.currentScreen;
            
            switch (currentScreen) {
                case 'start_menu':
                    await StartMenuHandler.showStartMenu(message, gameState);
                    break;
                
                case 'division_selection':
                    await this.showDivisionSelection(message, gameState);
                    break;
                
                case 'hero_selection':
                    await HeroSelectionHandler.showHeroSelection(message, gameState);
                    break;
                
                case 'hero_confirmation':
                    await HeroSelectionHandler.showHeroConfirmation(message, gameState);
                    break;
                
                case 'dungeon_entrance':
                    await DungeonEntranceHandler.showDungeonEntrance(message, gameState);
                    break;
                
                case 'floor':
                    await FloorHandler.showFloor(message, gameState);
                    break;
                
                case 'exploration':
                    await ExplorationHandler.showExploration(message, gameState);
                    break;
                
                case 'battle':
                    await BattleHandler.showBattleScreen(message, gameState);
                    break;
                
                case 'inventory':
                    await InventoryHandler.showInventory(message, gameState);
                    break;
                
                case 'shop':
                    await ShopHandler.showShop(message, gameState);
                    break;

                case 'quest_menu':
                    await QuestHandler.showQuestMenu(message, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown screen: ${currentScreen}, showing start menu`);
                    await StartMenuHandler.showStartMenu(message, gameState);
                    break;
            }
        } catch (error) {
            logger.error('Error resuming game from state:', error);
            await StartMenuHandler.showStartMenu(message, gameState);
        }
    }

    /**
     * Handle start menu selections
     */
    static async handleStartMenuSelection(interaction, selectedValue, gameState) {
        await StartMenuHandler.handleStartMenuSelection(interaction, selectedValue, gameState);
    }

    /**
     * Handle hero selection
     */
    static async handleHeroSelection(interaction, selectedValue, gameState) {
        await HeroSelectionHandler.handleHeroSelection(interaction, selectedValue, gameState);
    }

    /**
     * Handle hero confirmation
     */
    static async handleHeroConfirmation(interaction, selectedValue, gameState) {
        await HeroSelectionHandler.handleHeroConfirmation(interaction, selectedValue, gameState);
    }

    /**
     * Handle dungeon entrance selections
     */
    static async handleDungeonEntranceSelection(interaction, selectedValue, gameState) {
        await DungeonEntranceHandler.handleDungeonEntranceSelection(interaction, selectedValue, gameState);
    }

    /**
     * Handle look around result
     */
    static async handleLookAroundResult(interaction, selectedValue, gameState) {
        if (selectedValue === 'continue') {
            await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
        } else {
            logger.warn(`Unknown look around result: ${selectedValue}`);
            await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
        }
    }

    /**
     * Handle floor action selections
     */
    static async handleFloorActionSelection(interaction, selectedValue, gameState) {
        await FloorHandler.handleFloorAction(interaction, selectedValue, gameState);
    }

    /**
     * Handle exploration result
     */
    static async handleExplorationResult(interaction, selectedValue, gameState) {
        await ExplorationHandler.handleExplorationResult(interaction, selectedValue, gameState);
    }

    /**
     * Handle battle actions with improved error handling
     */
    static async handleBattleAction(interaction, selectedValue, gameState) {
        try {
            // Special handling for continue_battle action
            if (selectedValue === 'continue_battle') {
                await BattleHandler.showBattleScreen(interaction, gameState);
            } else {
                await BattleHandler.handleBattleAction(interaction, gameState, selectedValue);
            }
        } catch (error) {
            logger.error('Error handling battle action:', error);
            await this.safeInteractionResponse(interaction, { 
                content: '❌ Battle action failed. Please try again.', 
                flags: MessageFlags.Ephemeral
            }, 'reply');
        }
    }

    /**
     * Handle victory actions
     */
    static async handleVictoryAction(interaction, selectedValue, gameState) {
        await BattleHandler.handleVictoryAction(interaction, gameState, selectedValue);
    }

    /**
     * Handle death actions
     */
    static async handleDeathAction(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'start_new_game':
                    // Reset game state for new game
                    const serviceRegistry = getServiceRegistry();
                    const stateService = serviceRegistry.getStateService();
                    const newGameState = new GameState(interaction.user.id);
                    stateService.setUserState(interaction.user.id, newGameState);
                    
                    await StartMenuHandler.showStartMenu(interaction, newGameState);
                    break;
                
                case 'load_save':
                    await this.handleLoadGame(interaction);
                    break;
                
                default:
                    logger.warn(`Unknown death action: ${selectedValue}`);
                    await StartMenuHandler.showStartMenu(interaction, gameState);
                    break;
            }
        } catch (error) {
            logger.error('Error handling death action:', error);
            await this.safeInteractionResponse(interaction, { 
                content: '❌ Action failed. Please try again.', 
                flags: MessageFlags.Ephemeral
            }, 'reply');
        }
    }

    /**
     * Handle inventory actions
     */
    static async handleInventoryAction(interaction, selectedValue, gameState) {
        await InventoryHandler.handleInventoryAction(interaction, selectedValue, gameState);
    }

    /**
     * Handle shop actions
     */
    static async handleShopAction(interaction, selectedValue, gameState) {
        await ShopHandler.handleShopAction(interaction, selectedValue, gameState);
    }

    /**
     * Handle chest actions
     */
    static async handleChestAction(interaction, selectedValue, gameState) {
        await ChestHandler.handleChestAction(interaction, selectedValue, gameState);
    }

    /**
     * Handle mimic battle
     */
    static async handleMimicBattle(interaction, selectedValue, gameState) {
        await BattleHandler.handleMimicBattle(interaction, selectedValue, gameState);
    }

    /**
     * Handle quest actions
     */
    static async handleQuestAction(interaction, selectedValue, gameState) {
        await QuestHandler.handleQuestSelection(interaction, selectedValue, gameState);
    }

    /**
     * Handle exchange actions
     */
    static async handleExchangeAction(interaction, selectedValue, gameState) {
        try {
            if (selectedValue === 'back_to_division') {
                await DivisionHandler.showDivisionSelection(interaction, gameState);
            } else {
                await DivisionHandler.handleExchange(interaction, selectedValue, gameState);
            }
        } catch (error) {
            logger.error('Error handling exchange action:', error);
            await this.safeInteractionResponse(interaction, { 
                content: '❌ Error handling exchange. Please try again.', 
                flags: MessageFlags.Ephemeral
            }, 'reply');
        }
    }

    /**
     * Handle wallet actions
     */
    static async handleWalletAction(interaction, selectedValue, gameState) {
        try {
            if (selectedValue === 'back_to_division') {
                await DivisionHandler.showDivisionSelection(interaction, gameState);
            } else {
                await DivisionHandler.handleWalletLoading(interaction, selectedValue, gameState);
            }
        } catch (error) {
            logger.error('Error handling wallet action:', error);
            await this.safeInteractionResponse(interaction, { 
                content: '❌ Error handling wallet action. Please try again.', 
                flags: MessageFlags.Ephemeral
            }, 'reply');
        }
    }
} 