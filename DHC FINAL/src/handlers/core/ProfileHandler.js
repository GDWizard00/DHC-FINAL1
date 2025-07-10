import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';

/**
 * Handles player profile functionality
 */
class ProfileHandler {
    /**
     * Show player profile
     */
    static async showProfile(interaction, gameState) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const { ProfileService } = await import('../../services/ProfileService.js');
            
            // Get player profile
            const playerData = await ProfileService.getProfile(gameState.playerId);
            
            const embed = new EmbedBuilder()
                .setTitle('👤 **PLAYER PROFILE** 👤')
                .setDescription(`Profile for **${gameState.playerName}**`)
                .setColor(0x9370DB)
                .addFields([
                    {
                        name: '🏰 **Progress**',
                        value: `**Current Floor:** ${gameState.currentFloor}\n**Highest Floor:** ${playerData?.highestFloor || gameState.currentFloor}\n**Division:** ${gameState.economyType.toUpperCase()}`,
                        inline: true
                    },
                    {
                        name: '💰 **Economy**',
                        value: `🪙 **Gold:** ${gameState.economy.gold}\n🎫 **Tokens:** ${gameState.economy.tokens}\n🔸 **$DNG:** ${gameState.economy.dng}\n🦸 **$HERO:** ${gameState.economy.hero}\n💎 **$ETH:** ${gameState.economy.eth}`,
                        inline: true
                    },
                    {
                        name: '🦸 **Hero**',
                        value: gameState.selectedHero ? `**${gameState.selectedHero.name}**\n❤️ Health: ${gameState.selectedHero.health}/${gameState.selectedHero.maxHealth}\n🔵 Mana: ${gameState.selectedHero.mana}/${gameState.selectedHero.maxMana}` : 'No hero selected',
                        inline: true
                    },
                    {
                        name: '📊 **Statistics**',
                        value: `**Battles Won:** ${playerData?.stats?.battlesWon || 0}\n**Monsters Defeated:** ${playerData?.stats?.monstersDefeated || 0}\n**Chests Opened:** ${playerData?.stats?.chestsOpened || 0}\n**Items Found:** ${playerData?.stats?.itemsFound || 0}`,
                        inline: true
                    },
                    {
                        name: '🔓 **Unlocked Heroes**',
                        value: this.buildUnlockedHeroesText(playerData?.unlockedHeroes || ['Grim Stonebeard']),
                        inline: true
                    },
                    {
                        name: '🎮 **Game Session**',
                        value: `**Started:** ${new Date(gameState.session.startTime).toLocaleString()}\n**Screen:** ${gameState.currentScreen}\n**Last Activity:** ${new Date(gameState.session.lastActivity).toLocaleString()}`,
                        inline: true
                    }
                ])
                .setFooter({ text: 'Your adventure statistics' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('profile_menu')
                .setPlaceholder('Profile options...')
                .addOptions([
                    {
                        label: 'Back to Main Menu',
                        description: 'Return to the main menu',
                        value: 'back_to_main',
                        emoji: '🔙'
                    }
                ]);

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            gameState.currentScreen = 'profile';
            gameState.updateActivity();

        } catch (error) {
            logger.error('Error showing profile:', error);
            await interaction.update({
                content: '❌ Error loading profile. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Build unlocked heroes text
     */
    static buildUnlockedHeroesText(unlockedHeroes) {
        if (!unlockedHeroes || unlockedHeroes.length === 0) {
            return 'Grim Stonebeard';
        }
        
        return unlockedHeroes.map(hero => `• ${hero}`).join('\n');
    }
}

export { ProfileHandler }; 