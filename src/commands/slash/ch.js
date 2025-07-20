import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GameState } from '../../models/GameState.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { getServiceRegistry } from '../../utils/serviceRegistry.js';
import { StartMenuHandler } from '../../handlers/core/StartMenuHandler.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

export const data = new SlashCommandBuilder()
    .setName('ch')
    .setDescription('Start or resume your game (only works in your private thread)');

export async function execute(interaction) {
    try {
        const userId = interaction.user.id;
        const userName = interaction.user.username;
        const channelId = interaction.channel.id;

        // Check if user has a profile first
        const profile = await DatabaseManager.getProfile(userId);
        if (!profile) {
            const embed = new EmbedBuilder()
                .setTitle('❌ **PROFILE REQUIRED** ❌')
                .setDescription(
                    '**You need a profile to play!**\n\n' +
                    'Please create your profile first using `/profile`\n' +
                    'or visit the Game Hall embed in the main channels.\n\n' +
                    '*Profiles are required to save your progress.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Create Profile First • Use /profile' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return;
        }

        // Check if this is a private thread created by the bot
        if (interaction.channel.isThread()) {
            const thread = interaction.channel;
            
            // Check if this thread belongs to the user
            const threadName = thread.name.toLowerCase();
            if (!threadName.includes(userName.toLowerCase()) && !threadName.includes('game') && !threadName.includes('adventure')) {
                const embed = new EmbedBuilder()
                    .setTitle('🚫 **WRONG THREAD** 🚫')
                    .setDescription(
                        '**This command only works in your private game thread!**\n\n' +
                        'Please use the Game Hall embed in the main channels\n' +
                        'to start your adventure and create your private thread.\n\n' +
                        '*Each player gets their own private thread for gaming.*'
                    )
                    .setColor(0xff6600)
                    .setFooter({ text: 'Use Game Hall Embed • Private Threads Only' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
                return;
            }
        } else {
            // Not in a thread - redirect to Game Hall
            const embed = new EmbedBuilder()
                .setTitle('📢 **USE GAME HALL EMBED** 📢')
                .setDescription(
                    '**Please use the Game Hall embed to start your adventure!**\n\n' +
                    'The `/ch` command only works in your private game thread.\n' +
                    'Use the Game Hall embed to create your private thread first.\n\n' +
                    '*This keeps the main channels clean and organized.*'
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'Use Game Hall Embed • Private Threading System' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return;
        }

        // Log the command usage
        auditLogger.log('COMMAND', `User ${userId} (${userName}) used /ch command`, 'start_game');
        logger.info(`Starting new game for user ${userId} (${userName}) via slash command`);

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
            
            // Create new game state
            gameState = new GameState(userId);
            gameState.playerName = userName;
            gameState.session.channelId = channelId;

            // Store in state service
            stateService.setUserState(userId, gameState);
        }

        // Show the start menu
        await StartMenuHandler.showStartMenu(interaction, gameState);

    } catch (error) {
        logger.error('Error executing /ch command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ **GAME ERROR** ❌')
            .setDescription(
                '**Failed to start game**\n\n' +
                'Something went wrong while initializing your adventure.\n' +
                'Please try again in a moment.\n\n' +
                '*If the problem persists, contact an administrator.*'
            )
            .setColor(0xff0000)
            .setFooter({ text: 'Game Error • Try Again' })
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
} 