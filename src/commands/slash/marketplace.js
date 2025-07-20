import { SlashCommandBuilder } from 'discord.js';
import { MarketplaceHandler } from '../../handlers/marketplace/MarketplaceHandler.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('marketplace')
    .setDescription('Open the Dungeonites Marketplace - Trade, buy, and sell items');

export async function execute(interaction) {
    try {
        logger.info(`Marketplace command executed by ${interaction.user.tag} (${interaction.user.id})`);
        
        // Check if user has admin permissions to create permanent storefront
        const member = interaction.member;
        const hasPermission = member.permissions.has('Administrator') || 
                             member.permissions.has('ManageGuild') ||
                             interaction.guild.ownerId === interaction.user.id;

        if (!hasPermission) {
            await interaction.reply({
                content: '❌ You need Administrator or Manage Server permissions to create the marketplace embed.\n\n*Regular users should use the permanent marketplace embed buttons to access marketplace features.*',
                ephemeral: true
            });
            return;
        }

        await MarketplaceHandler.showMarketplace(interaction);
        
        logger.info(`Marketplace opened by ${interaction.user.tag} in guild ${interaction.guild.name}`);
        
    } catch (error) {
        logger.error('Error executing marketplace command:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while opening the marketplace. Please try again.',
                ephemeral: true
            });
        }
    }
} 