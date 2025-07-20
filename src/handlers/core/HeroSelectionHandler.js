import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { heroesData } from '../../data/heroesData.js';
import { logger } from '../../utils/logger.js';
import { embedHistory } from '../../utils/embedHistory.js';

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
            logger.info(`Showing hero selection for user ${gameState.playerId}`);
            
            // Get available heroes (for now, just the first one is available)
            const availableHeroes = heroesData.filter(hero => {
                const playerProgress = gameState.progress || {};
                const highestFloorReached = playerProgress.highestFloorReached || 0;
                return highestFloorReached >= hero.unlockFloor;
            });
            
            if (availableHeroes.length === 0) {
                availableHeroes.push(heroesData[0]); // Ensure at least one hero is available
            }
            
            const embed = new EmbedBuilder()
                .setTitle('⚔️ **CHOOSE YOUR HERO** ⚔️')
                .setDescription('**Select your champion for this adventure:**\n\n' +
                              'Each hero has unique abilities and starting equipment.\n' +
                              'Choose wisely - your survival depends on it!\n\n' +
                              '*Select a hero from the dropdown below...*')
                .setColor(0x00FF00)
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1353934280622866432/image.png?ex=67e3750f&is=67e2238f&hm=e13658e07a8ff12433639a1936044ea1d05875444c29faa68b6488049d9c1276&=&format=webp&quality=lossless&width=823&height=593')
                .setFooter({ text: 'Your choice will determine your adventure!' })
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
            
            // RESTORED: Division selection for beta tester visibility
            const divisionSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('division_selection')
                .setPlaceholder('🏆 Choose your division (Currently closed for setup)')
                .addOptions([
                    {
                        label: '🟨 Gold Division',
                        description: 'Free to play - Basic rewards (ACTIVE)',
                        value: 'gold',
                        emoji: '🟨'
                    },
                    {
                        label: '🎫 Token Division',
                        description: 'Costs 1 Token - 2x rewards (Coming Soon)',
                        value: 'tokens',
                        emoji: '🎫'
                    },
                    {
                        label: '🔸 $DNG Division',
                        description: 'Costs 1 $DNG - 5x rewards (Coming Soon)',
                        value: 'dng',
                        emoji: '🔸'
                    },
                    {
                        label: '🦸 $HERO Division',
                        description: 'Costs 1 $HERO - 10x rewards (Coming Soon)',
                        value: 'hero',
                        emoji: '🦸'
                    },
                    {
                        label: '💎 $ETH Division',
                        description: 'Free to play - 20x rewards (Coming Soon)',
                        value: 'eth',
                        emoji: '💎'
                    }
                ])
                .setDisabled(true); // Disabled for now but visible for beta testers
            
            const heroRow = new ActionRowBuilder().addComponents(selectMenu);
            const divisionRow = new ActionRowBuilder().addComponents(divisionSelectMenu);
            
            await interaction.update({
                embeds: [embed],
                components: [heroRow, divisionRow] // Hero selection + division preview
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
            }, gameState.session.userId);
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
                
                // Initialize hero stats properly
                const hero = { ...gameState.selectedHero };
                hero.maxHealth = hero.health;
                hero.maxMana = hero.mana;
                hero.currentHealth = hero.health;
                hero.currentMana = hero.mana;
                hero.effects = [];
                
                // FIXED: Properly initialize inventory and equip starting weapons
                if (!gameState.player.inventory) {
                    gameState.player.inventory = {
                        weapons: [],
                        armor: [],
                        consumables: [],
                        enhancers: [],
                        keys: 0
                    };
                }
                
                // Add starting weapons to inventory and equip them
                if (hero.weapons && hero.weapons.length > 0) {
                    const { weaponsData } = await import('../../data/weaponsData.js');
                    hero.equippedWeapons = []; // Track equipped weapons as IDs
                    
                    for (const weaponId of hero.weapons) {
                        // Find weapon data
                        const weaponData = weaponsData.find(w => w.id === weaponId);
                        if (weaponData) {
                            // Add to inventory
                            const inventoryWeapon = {
                                id: weaponData.id,
                                name: weaponData.name,
                                type: weaponData.type,
                                weaponType: weaponData.weaponType,
                                rarity: weaponData.rarity,
                                damage: weaponData.damage,
                                effects: weaponData.effects || [],
                                description: weaponData.description,
                                emoji: weaponData.emoji,
                                isEquipped: true,
                                isStartingWeapon: true
                            };
                            
                            gameState.player.inventory.weapons.push(inventoryWeapon);
                            // FIXED: Store weapon ID string, not object
                            hero.equippedWeapons.push(weaponData.id);
                            
                            logger.info(`Equipped starting weapon: ${weaponData.name} for hero ${hero.name}`);
                        } else {
                            // Create basic weapon if not found in data
                            const basicWeapon = {
                                id: weaponId,
                                name: weaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                type: 'weapon',
                                weaponType: 'melee',
                                rarity: 'common',
                                damage: 1,
                                effects: [],
                                description: 'Basic starting weapon',
                                emoji: '⚔️',
                                isEquipped: true,
                                isStartingWeapon: true
                            };
                            
                            gameState.player.inventory.weapons.push(basicWeapon);
                            // FIXED: Store weapon ID string, not object
                            hero.equippedWeapons.push(weaponId);
                            
                            logger.info(`Created and equipped basic weapon: ${basicWeapon.name} for hero ${hero.name}`);
                        }
                    }
                }
                
                // Set the hero in game state
                gameState.selectedHero = hero;
                gameState.player.selectedHero = hero;
                // Maintain legacy/property expected by downstream combat code
                gameState.player.hero = hero;
                
                // Initialize player combat stats for battle system compatibility
                gameState.player.currentHealth = hero.health;
                gameState.player.currentMana = hero.mana;
                gameState.player.armor = hero.armor || 0;
                
                // Proceed to dungeon entrance
                const { DungeonEntranceHandler } = await import('./DungeonEntranceHandler.js');
                await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
                
                logger.info(`User ${gameState.playerId} confirmed hero: ${hero.name} with ${hero.equippedWeapons?.length || 0} equipped weapons`);
                
            } else if (selectedValue === 'back_to_selection') {
                // Go back to hero selection
                await this.showHeroSelection(interaction, gameState);
                
                logger.info(`User ${gameState.playerId} went back to hero selection`);
                
            } else {
                logger.warn(`Unknown hero confirmation option: ${selectedValue}`);
                await interaction.update({
                    content: 'Unknown option selected. Please try again.',
                    embeds: [],
                    components: []
                });
            }
            
        } catch (error) {
            logger.error('Error handling hero confirmation:', error);
            await interaction.update({
                content: 'Error confirming hero selection. Please try again.',
                embeds: [],
                components: []
            });
        }
    }
}

export { HeroSelectionHandler }; 