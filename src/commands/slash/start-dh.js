import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GameState } from '../../models/GameState.js';
import { StartMenuHandler } from '../../handlers/core/StartMenuHandler.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('start-dh')
    .setDescription('Start your Dungeonites Heroes Challenge adventure');

export async function execute(interaction) {
    try {
        const userId = interaction.user.id;

        // Initialize game state for the user
        const gameState = new GameState(userId, interaction.user.username);
        await gameState.save();

        logger.info(`Game state initialized for ${interaction.user.username} (${userId})`);

        // Show the start menu
        await StartMenuHandler.showStartMenu(interaction, gameState);

    } catch (error) {
        logger.error('Error executing start-dh command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ **ERROR** ❌')
            .setDescription(
                '**Failed to start adventure**\n\n' +
                'Something went wrong while initializing your game.\n' +
                'Please try again in a moment.\n\n' +
                '*If the problem persists, contact an administrator.*'
            )
            .setColor(0xff0000)
            .setFooter({ text: 'Dungeonites Heroes Challenge • Error' })
            .setTimestamp();

        await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }
} 