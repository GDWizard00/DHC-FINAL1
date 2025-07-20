import { SlashCommandBuilder, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { AdminHandler } from '../../handlers/admin/AdminHandler.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Access the admin control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Check admin system status')
            .addStringOption(option =>
                option
                    .setName('password')
                    .setDescription('Your admin password')
                    .setRequired(true)
            )
    )
            .addSubcommand(subcommand =>
        subcommand
            .setName('audit-query')
            .setDescription('Query audit logs for administrative monitoring')
            .addStringOption(option =>
                option
                    .setName('category')
                    .setDescription('Category to search (USER_AUTH, ADMIN_ACTION, etc.)')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('password')
                    .setDescription('Current admin password')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('limit')
                    .setDescription('Number of results to return (default: 10, max: 50)')
                    .setMinValue(1)
                    .setMaxValue(50)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('change-password')
            .setDescription('Change your admin password')
            .addStringOption(option =>
                option
                    .setName('current-password')
                    .setDescription('Your current admin password')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('new-password')
                    .setDescription('Your new admin password (12+ characters)')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    try {
        // Check if user has admin permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ You do not have permission to use admin commands.',
                ephemeral: true
            });
            return;
        }

        // Get the subcommand
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand) {
            // Handle subcommands through AdminHandler
            await AdminHandler.handleAdminCommand(interaction);
        } else {
            // Show admin authentication screen for base command
            await AdminHandler.showAdminAuth(interaction);
        }

    } catch (error) {
        logger.error('Error executing admin command:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Error accessing admin system.',
                ephemeral: true
            });
        }
    }
} 