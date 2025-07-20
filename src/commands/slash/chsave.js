import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { getServiceRegistry } from '../../utils/serviceRegistry.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

export const data = new SlashCommandBuilder()
    .setName('chsave')
    .setDescription('Save your current game progress');

export async function execute(interaction) {
    try {
        const userId = interaction.user.id;
        const userName = interaction.user.username;

        // Get current game state
        const serviceRegistry = getServiceRegistry();
        const stateService = serviceRegistry.getStateService();
        const gameState = stateService.getUserState(userId);

        if (!gameState) {
            const embed = new EmbedBuilder()
                .setTitle('❌ **NO ACTIVE GAME** ❌')
                .setDescription(
                    '**No active game session found**\n\n' +
                    'You need to start a game first before saving.\n' +
                    'Use the Game Hall embed or `/ch` in your thread.\n\n' +
                    '*Start your adventure to save progress.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Start Game First • Use Game Hall Embed' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
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
                        '**You can only save in your own game thread!**\n\n' +
                        'Please use this command in your private game thread.\n\n' +
                        '*Each player can only save in their own thread.*'
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

        // Save to database
        await DatabaseManager.saveGameState(userId, gameState);

        // Log the save
        auditLogger.log('GAME_SAVE', `User ${userId} (${userName}) saved game manually`, 'manual_save', {
            floor: gameState.currentFloor,
            screen: gameState.currentScreen,
            hp: gameState.selectedHero?.hp || 0
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ **GAME SAVED** ✅')
            .setDescription(
                '**Your progress has been saved successfully!**\n\n' +
                `🏰 **Current Floor**: ${gameState.currentFloor || 1}\n` +
                `⚔️ **Hero**: ${gameState.selectedHero?.name || 'None'}\n` +
                `❤️ **HP**: ${gameState.selectedHero?.hp || 0}/${gameState.selectedHero?.maxHp || 0}\n` +
                `📍 **Location**: ${gameState.currentScreen || 'Start Menu'}\n\n` +
                '*Your adventure can be continued anytime!*'
            )
            .setColor(0x00ff00)
            .setFooter({ text: 'Progress Saved • Continue Anytime' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

        logger.info(`Game saved manually for user ${userId} (${userName})`);

    } catch (error) {
        logger.error(`Error saving game for ${interaction.user.id}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ **SAVE FAILED** ❌')
            .setDescription(
                '**Failed to save your game**\n\n' +
                'Something went wrong while saving your progress.\n' +
                'Please try again in a moment.\n\n' +
                '*Your game state is still active.*'
            )
            .setColor(0xff0000)
            .setFooter({ text: 'Save Error • Try Again' })
            .setTimestamp();

        await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }
} 