import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { heroesData } from '../../data/heroesData.js';

/**
 * HeroSelectionHandler - Handles hero selection and confirmation
 * Manages available heroes based on player progress
 */
class HeroSelectionHandler {
    
    /**
     * Show hero selection screen
     */
    static async showHeroSelection(interaction, gameState) {
        try {
            // Get player's highest floor reached to determine available heroes
            const playerProgress = gameState.progress || {};
            const highestFloorReached = playerProgress.highestFloorReached || 0;
            
            // Filter heroes based on unlock requirements
            const availableHeroes = heroesData.filter(hero => {
                return hero.unlockFloor <= highestFloorReached;
            });
            
            if (availableHeroes.length === 0) {
                logger.error('No heroes available for selection');
                throw new Error('No heroes available');
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🦸 **CHOOSE YOUR HERO** 🦸')
                .setDescription(`Select your champion to face the dangers of the dungeon!\n\n**Current Division:** ${gameState.economyType.toUpperCase()}\n\n**Available Heroes:**`)
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1353934280622866432/image.png?ex=67e3750f&is=67e2238f&hm=e13658e07a8ff12433639a1936044ea1d05875444c29faa68b6488049d9c1276&=&format=webp&quality=lossless&width=823&height=593')
                .setColor(0x4169E1)
                .setFooter({ text: 'Each hero has unique abilities and playstyles!' })
                .setTimestamp();
            
            // Add hero information to embed
            availableHeroes.forEach((hero, index) => {
                embed.addFields({
                    name: `${index + 1}. ${hero.name}`,
                    value: `**Health:** ${hero.health} | **Mana:** ${hero.mana} | **Crit:** ${hero.critChance}%\n**Weapons:** ${hero.weapons.join(', ')}\n**Abilities:** ${hero.abilities.slice(0, 3).join(', ')}${hero.abilities.length > 3 ? '...' : ''}`,
                    inline: true
                });
            });
            
            // Create select menu options
            const selectOptions = availableHeroes.map(hero => ({
                label: hero.name,
                description: `${hero.description.substring(0, 97)}...`,
                value: hero.id,
                emoji: '🦸'
            }));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('hero_selection')
                .setPlaceholder('Choose your hero...')
                .addOptions(selectOptions);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Division selection menu (optional)
            const divisionMenu = new StringSelectMenuBuilder()
                .setCustomId('division_selection')
                .setPlaceholder('Select Division (optional)...')
                .addOptions([
                    { label: 'Gold Division (Default)', value: 'gold', description: 'Free to play', emoji: '🪙' },
                    { label: 'Token Division', value: 'tokens', description: 'Costs 1 Token - 2x rewards', emoji: '🎫' },
                    { label: '$DNG Division', value: 'dng', description: 'Costs 1 $DNG - 5x rewards', emoji: '🔸' },
                    { label: '$HERO Division', value: 'hero', description: 'Costs 1 $HERO - 10x rewards', emoji: '🦸' },
                    { label: '$ETH Division', value: 'eth', description: 'Free - 20x rewards', emoji: '💎' }
                ]);

            const divisionRow = new ActionRowBuilder().addComponents(divisionMenu);
            
            await interaction.update({
                embeds: [embed],
                components: [row, divisionRow]
            });
            
            gameState.currentScreen = 'hero_selection';
            gameState.updateActivity();
            
            logger.info(`Hero selection displayed for user ${gameState.playerId}`);
            
        } catch (error) {
            logger.error('Error showing hero selection:', error);
            
            await interaction.update({
                content: 'Failed to load hero selection. Please try again.',
                embeds: [],
                components: []
            });
        }
    }
    
    /**
     * Handle hero selection
     */
    static async handleHeroSelection(interaction, gameState, selectedHeroId) {
        try {
            // Find the selected hero
            const selectedHero = heroesData.find(hero => hero.id === selectedHeroId);
            
            if (!selectedHero) {
                logger.error(`Hero not found: ${selectedHeroId}`);
                await interaction.update({
                    content: 'Selected hero not found. Please try again.',
                    embeds: [],
                    components: []
                });
                return;
            }
            
            // Check if hero is unlocked
            const playerProgress = gameState.progress || {};
            const highestFloorReached = playerProgress.highestFloorReached || 0;
            
            if (selectedHero.unlockFloor > highestFloorReached) {
                await interaction.update({
                    content: `${selectedHero.name} is not yet unlocked. Reach floor ${selectedHero.unlockFloor} to unlock this hero.`,
                    embeds: [],
                    components: []
                });
                return;
            }
            
            // Store selected hero temporarily
            gameState.selectedHero = selectedHero;
            
            // Show confirmation screen
            await this.showHeroConfirmation(interaction, gameState);
            
            logger.info(`User ${gameState.playerId} selected hero: ${selectedHeroId}`);
            
        } catch (error) {
            logger.error('Error handling hero selection:', error);
            await interaction.update({
                content: 'Error selecting hero. Please try again.',
                embeds: [],
                components: []
            });
        }
    }
    
    /**
     * Show hero confirmation screen
     */
    static async showHeroConfirmation(interaction, gameState) {
        try {
            const selectedHero = gameState.selectedHero;
            
            if (!selectedHero) {
                logger.error('No hero selected for confirmation');
                throw new Error('No hero selected');
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`⚔️ **CONFIRM YOUR HERO** ⚔️`)
                .setDescription(`Are you sure you want to play as **${selectedHero.name}**?`)
                .setImage(selectedHero.imageUrl)
                .setColor(0x00FF00)
                .setFooter({ text: 'This choice will determine your adventure!' })
                .setTimestamp();
            
            // Add detailed hero stats
            embed.addFields([
                {
                    name: '💪 **Stats**',
                    value: `**Health:** ${selectedHero.health}\n**Mana:** ${selectedHero.mana}\n**Armor:** ${selectedHero.armor}\n**Crit Chance:** ${selectedHero.critChance}%`,
                    inline: true
                },
                {
                    name: '⚔️ **Weapons**',
                    value: selectedHero.weapons.join('\n'),
                    inline: true
                },
                {
                    name: '🎯 **Abilities**',
                    value: selectedHero.abilities.join('\n'),
                    inline: true
                },
                {
                    name: '📖 **Description**',
                    value: selectedHero.description,
                    inline: false
                }
            ]);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('hero_confirmation')
                .setPlaceholder('Confirm your choice...')
                .addOptions([
                    {
                        label: '✅ Confirm',
                        description: 'Yes, I want to play as this hero!',
                        value: 'confirm',
                        emoji: '✅'
                    },
                    {
                        label: '🔄 Choose Another',
                        description: 'Go back to hero selection',
                        value: 'back_to_selection',
                        emoji: '🔄'
                    }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            await interaction.update({
                embeds: [embed],
                components: [row]
            });
            
            gameState.currentScreen = 'hero_confirmation';
            gameState.updateActivity();
            
            logger.info(`Hero confirmation displayed for user ${gameState.playerId}`);
            
        } catch (error) {
            logger.error('Error showing hero confirmation:', error);
            await interaction.update({
                content: 'Error loading hero confirmation. Please try again.',
                embeds: [],
                components: []
            });
        }
    }
    
    /**
     * Handle hero confirmation
     */
    static async handleHeroConfirmation(interaction, gameState, selectedValue) {
        try {
            if (selectedValue === 'confirm') {
                // Confirm hero selection and start the game
                if (!gameState.selectedHero) {
                    throw new Error('No hero selected');
                }
                
                // Initialize hero stats
                const hero = { ...gameState.selectedHero };
                hero.maxHealth = hero.health;
                hero.maxMana = hero.mana;
                hero.currentHealth = hero.health;
                hero.currentMana = hero.mana;
                hero.effects = [];
                
                // Set the hero in game state
                gameState.selectedHero = hero;
                gameState.player.selectedHero = hero;
                
                // Proceed to dungeon entrance
                const { DungeonEntranceHandler } = await import('./DungeonEntranceHandler.js');
                await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
                
                logger.info(`User ${gameState.playerId} confirmed hero: ${hero.name}`);
                
            } else if (selectedValue === 'back_to_selection') {
                // Go back to hero selection
                await this.showHeroSelection(interaction, gameState);
                
            } else {
                await interaction.update({
                    content: 'Invalid option selected.',
                    embeds: [],
                    components: []
                });
            }
            
        } catch (error) {
            logger.error('Error handling hero confirmation:', error);
            await interaction.update({
                content: 'Error processing hero confirmation. Please try again.',
                embeds: [],
                components: []
            });
        }
    }
}

export { HeroSelectionHandler }; 