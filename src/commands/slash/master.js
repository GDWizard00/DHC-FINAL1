import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { BotDeveloperHandler } from '../../handlers/admin/BotDeveloperHandler.js';
import { DashboardEmbedHandler } from '../../handlers/ui/DashboardEmbedHandler.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('master')
    .setDescription('Bot Developer master control (unified dashboard or setup)');

export async function execute(interaction) {
    try {
        // Verify this is the Bot Developer
        if (!BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 **ACCESS DENIED** 🚫')
                .setDescription(
                    '**Unauthorized Access Attempt**\n\n' +
                    '🔒 This command is restricted to the Bot Developer only.\n' +
                    '👤 **Your ID**: `' + interaction.user.id + '`\n' +
                    '🛡️ **Required ID**: `[CLASSIFIED]`\n\n' +
                    '⚠️ **Security Notice**: This attempt has been logged.\n\n' +
                    '*If you are a server administrator, use the regular admin commands instead.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Bot Developer Security System • Unauthorized Access Blocked' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            logger.warn(`Unauthorized master command attempt by ${interaction.user.username} (${interaction.user.id}) in server ${interaction.guildId}`);
            return;
        }

        // Check unified authentication system
        const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
        const isAuthenticated = AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.BOT_DEVELOPER);

        if (!isAuthenticated) {
            // Show Bot Dev authentication flow
            await showBotDevAuthentication(interaction);
        } else {
            // Authenticated - create Master Dashboard in current channel (hidden from others)
            await createMasterDashboard(interaction);
        }

    } catch (error) {
        logger.error('Error executing master command:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Error executing master command.',
                ephemeral: true
            });
        }
    }
}

/**
 * Show Bot Developer authentication
 */
async function showBotDevAuthentication(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('🔐 **BOT DEVELOPER AUTHENTICATION** 🔐')
            .setDescription(
                '**Master Authentication Required**\n\n' +
                '✅ **Bot Developer**: Verified\n' +
                '🔑 **Session**: Authentication required\n' +
                `🎯 **Server**: ${interaction.guild?.name}\n\n` +
                '**🔒 Unified Authentication System**\n' +
                'Please authenticate with your master password to access Bot Developer controls.\n\n' +
                '**Available after authentication:**\n' +
                '• Master Dashboard (hidden from all others)\n' +
                '• Complete server setup\n' +
                '• Unlimited economy tools\n' +
                '• Cross-server overrides\n\n' +
                '*Authenticate to continue:*'
            )
            .setColor(0xff6600)
            .setFooter({ text: 'Bot Developer Authentication • Master Control' })
            .setTimestamp();

        const authButton = new ButtonBuilder()
            .setCustomId('bot_dev_authenticate')
            .setLabel('🔑 Authenticate')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(authButton);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

    } catch (error) {
        logger.error('Error showing Bot Dev authentication:', error);
        throw error;
    }
}

/**
 * Create Master Dashboard in current channel (hidden from others)
 */
async function createMasterDashboard(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Create Master Dashboard embed in current channel (visible only to Bot Dev)
        await DashboardEmbedHandler.createBotDevDashboardEmbed(interaction.channel, interaction.user);

        const embed = new EmbedBuilder()
            .setTitle('⚔️ **MASTER DASHBOARD ACTIVE** ⚔️')
            .setDescription(
                '**Bot Developer Master Control**\n\n' +
                '✅ **Bot Developer**: Authenticated\n' +
                '🎯 **Server**: ' + interaction.guild?.name + '\n' +
                '📍 **Dashboard Channel**: ' + interaction.channel + '\n\n' +
                '**🎮 Master Dashboard Deployed!**\n' +
                'Your Master Dashboard embed has been created in this channel.\n' +
                '🔒 **Hidden**: Only you can see and interact with it.\n' +
                '⚡ **Full Power**: All Bot Dev controls available.\n\n' +
                '**Master Controls Available:**\n' +
                '• Complete economy management\n' +
                '• Player/admin management\n' +
                '• Server setup and configuration\n' +
                '• Cross-server overrides\n' +
                '• System administration\n\n' +
                '*Your ultimate control center is ready!*'
            )
            .setColor(0x00ff00)
            .setFooter({ text: 'Master Dashboard • Ultimate Control' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        logger.info(`Master Dashboard created by Bot Developer in ${interaction.guild.name} - Channel: ${interaction.channel.name}`);

    } catch (error) {
        logger.error('Error creating Master Dashboard:', error);
        await interaction.editReply({
            content: '❌ Error creating Master Dashboard. Please try again.',
            embeds: []
        });
        throw error;
    }
} 