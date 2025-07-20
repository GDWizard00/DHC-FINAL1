import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

export const data = new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a DM to a user (Bot Developer only)')
    .addStringOption(option =>
        option.setName('user_id')
            .setDescription('The user ID to send a DM to')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('message')
            .setDescription('The message to send')
            .setRequired(true));

export async function execute(interaction) {
    try {
        // Bot Developer Only Access - Command Cleanup Phase 3
        const { BotDeveloperHandler } = await import('../../handlers/admin/BotDeveloperHandler.js');
        if (!BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('🚫 **ACCESS DENIED** 🚫')
                .setDescription(
                    '**Bot Developer Only Command**\n\n' +
                    '🔒 This command is restricted to the Bot Developer only.\n' +
                    '⚠️ **Security Notice**: This attempt has been logged.\n\n' +
                    '*Direct messaging is a Bot Developer utility.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Direct Message • Bot Developer Access Required' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return;
        }

        const userId = interaction.options.getString('user_id');
        const message = interaction.options.getString('message');

        // Validate user ID format
        if (!/^\d{17,19}$/.test(userId)) {
            await interaction.reply({
                content: '❌ Invalid user ID format. Please provide a valid Discord user ID.',
                ephemeral: true
            });
            return;
        }

        // Fetch the target user
        const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        
        if (!targetUser) {
            await interaction.reply({
                content: `❌ Could not find user with ID: ${userId}`,
                ephemeral: true
            });
            return;
        }

        // Create DM embed
        const dmEmbed = new EmbedBuilder()
            .setTitle('📨 **Message from Dungeonites Heroes Challenge Support**')
            .setDescription(message)
            .setColor(0x00ff00)
            .setFooter({ 
                text: 'This is a response to your support request. Reply here if you need further assistance.' 
            })
            .setTimestamp();

        // Send DM to target user
        try {
            await targetUser.send({ embeds: [dmEmbed] });
            
            // Log the DM
            auditLogger.log('BOT_DEVELOPER_DM', `Bot developer sent DM to ${targetUser.username}`, 'support_dm', {
                fromUserId: interaction.user.id,
                fromUsername: interaction.user.username,
                toUserId: userId,
                toUsername: targetUser.username,
                messageLength: message.length,
                timestamp: new Date()
            });

            logger.info(`Bot developer sent DM to ${targetUser.username} (${userId})`);

            // Confirm to bot developer
            await interaction.reply({
                content: `✅ **DM sent successfully!**\n\n**To:** ${targetUser.username} (${userId})\n**Message Preview:** ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                ephemeral: true
            });

        } catch (dmError) {
            logger.error(`Failed to send DM to user ${userId}:`, dmError);
            await interaction.reply({
                content: `❌ **Failed to send DM to ${targetUser.username}**\n\nThe user may have DMs disabled or blocked the bot. You may need to contact them through another method.`,
                ephemeral: true
            });
        }

    } catch (error) {
        logger.error('Error executing dm command:', error);
        await interaction.reply({
            content: '❌ Error executing DM command. Please try again.',
            ephemeral: true
        });
    }
} 