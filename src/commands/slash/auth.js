import { SlashCommandBuilder } from 'discord.js';
import { UserProfileHandler } from '../../handlers/user/UserProfileHandler.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('auth')
    .setDescription('Authenticate with your password to access game features');

export async function execute(interaction) {
    try {
        const userId = interaction.user.id;
        
        // Check if user has a profile
        const hasProfile = await UserProfileHandler.hasProfile(userId);
        
        if (!hasProfile) {
            await UserProfileHandler.showProfileCreationPrompt(interaction, 'authentication');
            return;
        }

        // Check if already authenticated
        const isAuthenticated = UserProfileHandler.isAuthenticated(userId);
        
        if (isAuthenticated) {
            await interaction.reply({
                content: '✅ You are already authenticated! You can now access:\n• Game (`!ch`)\n• Marketplace (`/marketplace`)\n• Casino features\n• Quest participation',
                ephemeral: true
            });
            return;
        }

        // Show password authentication modal
        await UserProfileHandler.showPasswordAuthModal(interaction, 'general');
        
        logger.info(`Authentication requested by ${interaction.user.username} (${userId})`);
        
    } catch (error) {
        logger.error('Error executing auth command:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing authentication. Please try again.',
                ephemeral: true
            });
        }
    }
} 