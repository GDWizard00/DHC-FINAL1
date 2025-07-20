import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { getServiceRegistry } from '../../utils/serviceRegistry.js';
import { GameState } from '../../models/GameState.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

export const data = new SlashCommandBuilder()
    .setName('chload')
    .setDescription('Load your saved game progress (crash recovery)');

export async function execute(interaction) {
    try {
        const userId = interaction.user.id;
        const userName = interaction.user.username;

        // Check if user already has an active game
        const serviceRegistry = getServiceRegistry();
        const stateService = serviceRegistry.getStateService();
        const existingGameState = stateService.getUserState(userId);

        if (existingGameState) {
            const embed = new EmbedBuilder()
                .setTitle('⚠️ **ACTIVE GAME FOUND** ⚠️')
                .setDescription(
                    '**You already have an active game session!**\n\n' +
                    `🏰 **Current Floor**: ${existingGameState.currentFloor || 1}\n` +
                    `⚔️ **Hero**: ${existingGameState.selectedHero?.name || 'None'}\n` +
                    `❤️ **HP**: ${existingGameState.selectedHero?.hp || 0}/${existingGameState.selectedHero?.maxHp || 0}\n\n` +
                    '**Options:**\n' +
                    '• Continue your current game\n' +
                    '• Overwrite with saved data (if available)\n\n' +
                    '*Choose how to proceed:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Active Game • Choose Action' })
                .setTimestamp();

            const continueButton = new ButtonBuilder()
                .setCustomId('continue_current_game')
                .setLabel('📱 Continue Current Game')
                .setStyle(ButtonStyle.Primary);

            const overwriteButton = new ButtonBuilder()
                .setCustomId('overwrite_with_saved')
                .setLabel('💾 Load Saved Game')
                .setStyle(ButtonStyle.Secondary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_load')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(continueButton, overwriteButton, cancelButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            return;
        }

        // Check if in appropriate channel (thread or allowed channel)
        if (interaction.channel.isThread()) {
            const thread = interaction.channel;
            const threadName = thread.name.toLowerCase();
            
            // Verify this is the user's thread
            if (!threadName.includes(userName.toLowerCase()) && !threadName.includes('game') && !threadName.includes('adventure')) {
                const embed = new EmbedBuilder()
                    .setTitle('🚫 **WRONG THREAD** 🚫')
                    .setDescription(
                        '**You can only load games in your own thread!**\n\n' +
                        'Please use this command in your private game thread.\n\n' +
                        '*Each player can only load in their own thread.*'
                    )
                    .setColor(0xff6600)
                    .setFooter({ text: 'Use Your Own Thread • Security Restriction' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
                return;
            }
        }

        // Load from database
        const gameStateData = await DatabaseManager.loadGameState(userId);
        
        if (!gameStateData) {
            const embed = new EmbedBuilder()
                .setTitle('❌ **NO SAVED GAME** ❌')
                .setDescription(
                    '**No saved game found**\n\n' +
                    'You don\'t have any saved progress yet.\n' +
                    'Start a new adventure with the Game Hall embed\n' +
                    'or use `/ch` in your thread.\n\n' +
                    '*Progress is automatically saved every floor.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'No Saved Data • Start New Game' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return;
        }

        // Create game state from saved data
        const gameState = GameState.fromJSON(gameStateData);
        gameState.session.channelId = interaction.channel.id;
        gameState.updateActivity();

        // Store in state service
        stateService.setUserState(userId, gameState);

        // Log the load
        auditLogger.log('GAME_LOAD', `User ${userId} (${userName}) loaded saved game`, 'manual_load', {
            floor: gameState.currentFloor,
            screen: gameState.currentScreen,
            saveTime: gameStateData.timestamp || 'unknown'
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ **GAME LOADED** ✅')
            .setDescription(
                '**Your saved game has been loaded successfully!**\n\n' +
                `🏰 **Loaded Floor**: ${gameState.currentFloor || 1}\n` +
                `⚔️ **Hero**: ${gameState.selectedHero?.name || 'None'}\n` +
                `❤️ **HP**: ${gameState.selectedHero?.hp || 0}/${gameState.selectedHero?.maxHp || 0}\n` +
                `📍 **Location**: ${gameState.currentScreen || 'Start Menu'}\n\n` +
                '**Crash Recovery**: Your adventure continues where you left off!\n\n' +
                '*The game will resume automatically...*'
            )
            .setColor(0x00ff00)
            .setFooter({ text: 'Game Loaded • Crash Recovery Complete' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

        // Resume from the saved screen after a brief delay
        setTimeout(async () => {
            try {
                await resumeGameFromState(interaction, gameState);
            } catch (error) {
                logger.error('Error resuming game after load:', error);
                // Fallback to start menu if resume fails
                const { StartMenuHandler } = await import('../../handlers/core/StartMenuHandler.js');
                await StartMenuHandler.showStartMenu(interaction, gameState);
            }
        }, 2000);

        logger.info(`Game loaded for user ${userId} (${userName})`);

    } catch (error) {
        logger.error(`Error loading game for ${interaction.user.id}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ **LOAD FAILED** ❌')
            .setDescription(
                '**Failed to load your saved game**\n\n' +
                'Something went wrong while loading your progress.\n' +
                'Please try again in a moment.\n\n' +
                '*You can start a new game if needed.*'
            )
            .setColor(0xff0000)
            .setFooter({ text: 'Load Error • Try Again or Start New' })
            .setTimestamp();

        await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }
}

/**
 * Resume game from loaded state
 */
async function resumeGameFromState(interaction, gameState) {
    try {
        const screen = gameState.currentScreen;
        
        // Route to appropriate handler based on saved screen
        switch (screen) {
            case 'start_menu':
                const { StartMenuHandler } = await import('../../handlers/core/StartMenuHandler.js');
                await StartMenuHandler.showStartMenu(interaction, gameState);
                break;
                
            case 'hero_selection':
                const { HeroSelectionHandler } = await import('../../handlers/core/HeroSelectionHandler.js');
                await HeroSelectionHandler.showHeroSelection(interaction, gameState);
                break;
                
            case 'exploration':
                const { ExplorationHandler } = await import('../../handlers/core/ExplorationHandler.js');
                await ExplorationHandler.showExploration(interaction, gameState);
                break;
                
            case 'battle':
                const { BattleHandler } = await import('../../handlers/core/BattleHandler.js');
                await BattleHandler.resumeBattle(interaction, gameState);
                break;
                
            case 'inventory':
                const { InventoryHandler } = await import('../../handlers/inventory/InventoryHandler.js');
                await InventoryHandler.showInventory(interaction, gameState);
                break;
                
            default:
                // Fallback to start menu for unknown screens
                const { StartMenuHandler: StartMenu } = await import('../../handlers/core/StartMenuHandler.js');
                await StartMenu.showStartMenu(interaction, gameState);
                break;
        }
    } catch (error) {
        logger.error('Error in resumeGameFromState:', error);
        throw error;
    }
} 