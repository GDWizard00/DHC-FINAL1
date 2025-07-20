import { SlashCommandBuilder } from 'discord.js';
import { DashboardEmbedHandler } from '../../handlers/ui/DashboardEmbedHandler.js';
import { PermanentEmbedHandler } from '../../handlers/ui/PermanentEmbedHandler.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create dashboard embeds for the new unified architecture')
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Type of dashboard embed to create')
            .setRequired(true)
            .addChoices(
                { name: '⚙️ Admin Start Here', value: 'admin_start_here' },
                { name: '🎮 Player Start Here', value: 'player_start_here' },
                { name: '⚔️ Bot Dev Dashboard', value: 'bot_dev_dashboard' },
                { name: '🏪 Legacy Marketplace', value: 'legacy_marketplace' },
                { name: '🎰 Legacy Casino', value: 'legacy_casino' }
            ));

export async function execute(interaction) {
    try {
        // Check if user has admin permissions
        const member = interaction.member;
        const hasPermission = member.permissions.has('Administrator') || 
                             member.permissions.has('ManageGuild') ||
                             interaction.guild.ownerId === interaction.user.id;

        if (!hasPermission) {
            await interaction.reply({
                content: '❌ You need Administrator or Manage Server permissions to create dashboard embeds.',
                ephemeral: true
            });
            return;
        }

        const embedType = interaction.options.getString('type');

        switch (embedType) {
            case 'admin_start_here':
                await DashboardEmbedHandler.createAdminStartHereEmbed(interaction.channel, interaction.user);
                await interaction.reply({
                    content: '✅ **Admin Start Here** dashboard embed created successfully!\n\nServer owners and administrators can now create profiles and access admin tools.',
                    ephemeral: true
                });
                break;

            case 'player_start_here':
                await DashboardEmbedHandler.createPlayerStartHereEmbed(interaction.channel, interaction.user);
                await interaction.reply({
                    content: '✅ **Player Start Here** dashboard embed created successfully!\n\nPlayers can now create profiles and begin their adventure.',
                    ephemeral: true
                });
                break;

            case 'bot_dev_dashboard':
                // Bot Dev Dashboard is restricted to Bot Developer only
                const { BotDeveloperHandler } = await import('../../handlers/admin/BotDeveloperHandler.js');
                if (!BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
                    await interaction.reply({
                        content: '❌ Bot Dev Dashboard is restricted to Bot Developer only.',
                        ephemeral: true
                    });
                    return;
                }
                await DashboardEmbedHandler.createBotDevDashboardEmbed(interaction.channel, interaction.user);
                await interaction.reply({
                    content: '✅ **Bot Dev Dashboard** embed created successfully!\n\nUltimate control interface is now available.',
                    ephemeral: true
                });
                break;

            case 'legacy_marketplace':
                // Legacy support for existing marketplace embeds
                await PermanentEmbedHandler.createMarketplaceEmbed(interaction);
                break;

            case 'legacy_casino':
                // Legacy support for existing casino embeds
                await PermanentEmbedHandler.createCasinoEmbed(interaction);
                break;

            default:
                await interaction.reply({
                    content: '❌ Unknown embed type.',
                    ephemeral: true
                });
        }

        logger.info(`Dashboard embed '${embedType}' created by ${interaction.user.username} in ${interaction.guild.name}`);
        
    } catch (error) {
        logger.error('Error executing embed command:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while creating the embed. Please try again.',
                ephemeral: true
            });
        }
    }
} 