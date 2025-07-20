import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotDeveloperHandler } from '../../handlers/admin/BotDeveloperHandler.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('reset-master')
    .setDescription('Reset Bot Developer master profile for testing (gdwizard only)');

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
                    '*This is a testing command for master profile reset.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Bot Developer Security System • Unauthorized Access Blocked' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            logger.warn(`Unauthorized reset-master command attempt by ${interaction.user.username} (${interaction.user.id}) in server ${interaction.guildId}`);
            return;
        }

        // Reset the master profile
        const resetSuccess = await BotDeveloperHandler.resetMasterProfile();

        if (resetSuccess) {
            const embed = new EmbedBuilder()
                .setTitle('✅ **MASTER PROFILE RESET** ✅')
                .setDescription(
                    '**Bot Developer Profile Successfully Reset!**\n\n' +
                    '🔄 **Profile Data**: Cleared from database\n' +
                    '🔐 **Session**: Terminated\n' +
                    '🧪 **Testing Mode**: Ready for fresh setup\n\n' +
                    '**Next Steps:**\n' +
                    '1. Restart the bot\n' +
                    '2. Use `!ch` to initialize bot state\n' +
                    '3. Use `/master` to trigger fresh setup\n' +
                    '4. Check DMs for setup message\n' +
                    '5. Complete comprehensive security profile\n\n' +
                    '**New Requirements:**\n' +
                    '• Password (12+ characters)\n' +
                    '• At least 3 of 4 recovery methods:\n' +
                    '  - X (Twitter) account\n' +
                    '  - EVM wallet address\n' +
                    '  - Email address\n\n' +
                    '*Ready for comprehensive testing!*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Master Profile Reset • Testing Mode Active' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            logger.info('Master profile reset by Bot Developer for testing');
        } else {
            await interaction.reply({
                content: '❌ Error resetting master profile. Check logs for details.',
                ephemeral: true
            });
        }

    } catch (error) {
        logger.error('Error executing reset-master command:', error);
        await interaction.reply({
            content: '❌ Error executing reset command.',
            ephemeral: true
        });
    }
} 