import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { DashboardEmbedHandler } from '../../handlers/ui/DashboardEmbedHandler.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

const data = new SlashCommandBuilder()
    .setName('setuphero')
    .setDescription('Setup unified dashboard system for Dungeonites Heroes Challenge')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export { data };

export async function execute(interaction) {
    try {
        // Check permissions - must be admin or server owner
        const member = interaction.member;
        const isServerOwner = interaction.guild.ownerId === interaction.user.id;
        const hasAdminPerms = member.permissions.has('Administrator') || member.permissions.has('ManageGuild');

        if (!isServerOwner && !hasAdminPerms) {
            await interaction.reply({
                content: '❌ You need Administrator permissions or be the server owner to setup the dashboard system.',
                ephemeral: true
            });
            return;
        }

        // Check unified authentication system
        const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
        const isAuthenticated = AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.ADMIN);

        if (!isAuthenticated) {
            // Show admin authentication flow
            await showAdminAuthentication(interaction);
        } else {
            // Authenticated - proceed with admin dashboard setup
            await setupAdminDashboard(interaction);
        }

        } catch (error) {
        logger.error('Error in setuphero command:', error);
        await interaction.reply({ 
            content: '❌ An error occurred during setup. Please try again.',
            ephemeral: true
        });
    }
        }

/**
 * Show admin authentication flow
 */
async function showAdminAuthentication(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('🔐 **ADMIN AUTHENTICATION** 🔐')
            .setDescription(
                '**Admin Profile Required**\n\n' +
                '✅ **Administrator**: Verified\n' +
                '🔑 **Profile**: Authentication required\n' +
                `🎯 **Server**: ${interaction.guild?.name}\n\n` +
                '**🔒 Admin Authentication System**\n' +
                'Please create a profile or login with your existing profile to access admin controls.\n\n' +
                '**Available after authentication:**\n' +
                '• Admin Dashboard setup\n' +
                '• Player "Start Here" deployment\n' +
                '• Server management tools\n' +
                '• Economy management (limited scope)\n\n' +
                '*Choose an option to continue:*'
            )
            .setColor(0x3498db)
            .setFooter({ text: 'Admin Authentication • Dashboard Setup' })
            .setTimestamp();

        const createButton = new ButtonBuilder()
            .setCustomId('admin_create_profile')
            .setLabel('Create Admin Profile')
            .setStyle(ButtonStyle.Primary);

        const loginButton = new ButtonBuilder()
            .setCustomId('admin_login')
            .setLabel('Login Existing Profile')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(createButton, loginButton);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

                } catch (error) {
        logger.error('Error showing admin authentication:', error);
        throw error;
    }
}

/**
 * Setup admin dashboard after authentication
 */
async function setupAdminDashboard(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // First, create Admin Dashboard in current channel
        await DashboardEmbedHandler.createAdminDashboardEmbed(interaction.channel, interaction.user);

        // Now ask where to place the "Start Here" dashboard for players
        const embed = new EmbedBuilder()
            .setTitle('🚀 **ADMIN DASHBOARD SETUP** 🚀')
            .setDescription(
                '**Admin Dashboard Complete!**\n\n' +
                '✅ **Admin Dashboard**: Created in this channel\n' +
                `🎯 **Server**: ${interaction.guild?.name}\n` +
                `👤 **Admin**: ${interaction.user.username}\n\n` +
                '**📍 Next Step: Player "Start Here" Placement**\n\n' +
                'Your Admin Dashboard is ready in this channel. Now you need to choose where to place the **"Start Here" Dashboard** for players.\n\n' +
                '**The "Start Here" Dashboard is:**\n' +
                '• The first point of contact for all players\n' +
                '• Where players create profiles and enter the game\n' +
                '• The main entry point to Dungeonites Heroes\n\n' +
                '**Choose where to place it:**\n' +
                '• **Current Channel**: Place it here alongside admin dashboard\n' +
                '• **Select Channel**: Choose a different channel for players\n' +
                '• **Create Channel**: Create a new channel for the Start Here dashboard\n\n' +
                '*Choose placement option:*'
            )
            .setColor(0x00ff00)
            .setFooter({ text: 'Admin Setup • Start Here Placement' })
            .setTimestamp();

        const currentButton = new ButtonBuilder()
            .setCustomId('start_here_current_channel')
            .setLabel('📍 Use Current Channel')
            .setStyle(ButtonStyle.Primary);

        const selectButton = new ButtonBuilder()
            .setCustomId('start_here_select_channel')
            .setLabel('🔍 Select Different Channel')
            .setStyle(ButtonStyle.Secondary);

        const createButton = new ButtonBuilder()
            .setCustomId('start_here_create_channel')
            .setLabel('➕ Create New Channel')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(currentButton, selectButton, createButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        // Log the admin dashboard setup
        auditLogger.log('admin_dashboard_setup', {
            userId: interaction.user.id,
            username: interaction.user.username,
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name,
            timestamp: new Date().toISOString()
        });

        logger.info(`Admin Dashboard setup initiated by ${interaction.user.username} in ${interaction.guild.name}`);

    } catch (error) {
        logger.error('Error in admin dashboard setup:', error);
        await interaction.editReply({
            content: '❌ Error setting up admin dashboard. Please try again.',
            embeds: [],
            components: []
        });
        throw error;
    }
} 