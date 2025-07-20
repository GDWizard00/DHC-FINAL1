import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { embedHistory } from '../../utils/embedHistory.js';

/**
 * Handles player profile functionality
 */
class ProfileHandler {
    /**
     * Show profile - wrapper for showPlayerProfile to match expected interface
     */
    static async showProfile(interaction, gameState) {
        return await this.showPlayerProfile(interaction, gameState);
    }

    /**
     * Show player profile
     */
    static async showPlayerProfile(interaction, gameState) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const { ProfileService } = await import('../../services/ProfileService.js');
            
            // Get player profile
            const playerData = await ProfileService.getProfile(gameState.playerId);
            
            const embed = new EmbedBuilder()
                .setTitle('👤 **PLAYER PROFILE** 👤')
                .setDescription(`Profile for **${gameState.playerName}**`)
                .setColor(0x9370DB)
                .addFields(
                    {
                        name: '🏰 **Progress**',
                        value: `**Current Floor:** ${gameState.currentFloor || 1}\n**Highest Floor:** ${playerData?.highestFloor || gameState.progress?.highestFloorReached || gameState.currentFloor || 1}\n**Division:** ${gameState.economyType.toUpperCase()}`,
                        inline: true
                    },
                    {
                        name: '💰 **Economy**',
                        value: `🪙 **Gold:** ${gameState.economy?.gold || gameState.player?.inventory?.gold || 0}\n🎫 **Tokens:** ${gameState.economy?.tokens || 0}\n🔸 **$DNG:** ${gameState.economy?.dng || 0}\n🦸 **$HERO:** ${gameState.economy?.hero || 0}\n💎 **$ETH:** ${gameState.economy?.eth || 0}`,
                        inline: true
                    },
                    {
                        name: '🦸 **Hero**',
                        value: gameState.selectedHero ? `**${gameState.selectedHero.name}**\n❤️ Health: ${gameState.selectedHero.currentHealth || gameState.selectedHero.health}/${gameState.selectedHero.maxHealth || gameState.selectedHero.health}\n🔵 Mana: ${gameState.selectedHero.currentMana || gameState.selectedHero.mana}/${gameState.selectedHero.maxMana || gameState.selectedHero.mana}` : 'No hero selected',
                        inline: true
                    },
                    {
                        name: '📊 **Statistics**',
                        value: `**Battles Won:** ${gameState.stats?.battlesWon || 0}\n**Monsters Defeated:** ${gameState.stats?.monstersDefeated || 0}\n**Chests Opened:** ${gameState.stats?.chestsOpened || 0}\n**Items Found:** ${gameState.stats?.itemsFound || 0}`,
                        inline: true
                    },
                    {
                        name: '🔓 **Unlocked Heroes**',
                        value: this.buildUnlockedHeroesText(playerData?.unlockedHeroes || ['grim_stonebeard']),
                        inline: true
                    },
                    {
                        name: '🎮 **Game Session**',
                        value: `**Started:** ${new Date(gameState.session.startTime).toLocaleString()}\n**Screen:** ${gameState.currentScreen}\n**Last Activity:** ${new Date(gameState.session.lastActivity).toLocaleString()}`,
                        inline: true
                    }
                )
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

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            gameState.currentScreen = 'profile';
            gameState.updateActivity();

        } catch (error) {
            logger.error('Error showing profile:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error loading profile. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle profile menu selections
     */
    static async handleProfileMenuSelection(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'back_to_main':
                    const { StartMenuHandler } = await import('./StartMenuHandler.js');
                    await StartMenuHandler.showStartMenu(interaction, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown profile menu selection: ${selectedValue}`);
                    await embedHistory.updateWithHistory(interaction, {
                        content: 'Unknown option selected. Please try again.',
                        embeds: [],
                        components: []
                    }, gameState.session.userId);
            }
        } catch (error) {
            logger.error('Error handling profile menu selection:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Error processing selection. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Build unlocked heroes text
     */
    static buildUnlockedHeroesText(unlockedHeroes) {
        if (!unlockedHeroes || unlockedHeroes.length === 0) {
            return 'Grim Stonebeard';
        }
        
        // Map hero IDs to names
        const heroNameMap = {
            'grim_stonebeard': 'Grim Stonebeard',
            'grenthaia_loastrum': 'Grenthaia Loastrum',
            'gregory_saddleman': 'Gregory Saddleman',
            'alistair_darkbane': 'Alistair Darkbane',
            'arcanus_nexus': 'Arcanus Nexus'
        };
        
        const heroNames = unlockedHeroes.map(heroId => {
            return heroNameMap[heroId] || heroId;
        });
        
        return heroNames.join(', ');
    }
}

export { ProfileHandler }; 