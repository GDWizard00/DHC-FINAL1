import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';

/**
 * FloorHandler - Handles floor navigation and actions
 * Manages floor display, actions, and progression
 */
class FloorHandler {
    
    /**
     * Show current floor with available actions
     */
    static async showFloor(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const explorationCount = gameState.currentFloorExplorations || 0;
            const maxExplorations = this.getMaxExplorations(currentFloor);
            
            // Build floor description
            const floorDescription = this.getFloorDescription(currentFloor);
            
            // Get player hero info
            const playerHero = gameState.selectedHero;
            
            const embed = new EmbedBuilder()
                .setTitle(`🏰 **FLOOR ${currentFloor}** 🏰`)
                .setDescription(`${floorDescription}\n\n**Explorations:** ${explorationCount}/${maxExplorations}\n\n**Hero Status:**\n❤️ Health: ${playerHero.currentHealth || playerHero.health}/${playerHero.health}\n💙 Mana: ${playerHero.currentMana || playerHero.mana}/${playerHero.mana}`)
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1355065567228465152/image.png?ex=67e792a7&is=67e64127&hm=af5ca5dc2441836e8572fcc85304099d67d7ac8278e277b3f9ced6b0879fafc0&=&format=webp&quality=lossless&width=824&height=576')
                .setColor(0x8B4513)
                .setFooter({ text: 'Choose your action carefully!' })
                .setTimestamp();

            // Create action options
            const options = [];
            
            // Explore option (if explorations remaining)
            if (explorationCount < maxExplorations) {
                options.push({
                    label: '🔍 Explore',
                    description: `Search for treasures and secrets (${maxExplorations - explorationCount} left)`,
                    value: 'explore',
                    emoji: '🔍'
                });
            }
            
            // Always available options
            options.push(
                {
                    label: '🎒 Inventory',
                    description: 'Manage your items and equipment',
                    value: 'inventory',
                    emoji: '🎒'
                },
                {
                    label: '🗡️ Head to the Stairs',
                    description: 'Face the floor boss and advance',
                    value: 'stairs',
                    emoji: '🗡️'
                },
                {
                    label: '🔙 Return to Dungeon Entrance',
                    description: 'Go back to the entrance',
                    value: 'return_to_entrance',
                    emoji: '🔙'
                }
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('floor_actions')
                .setPlaceholder('Choose your action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            gameState.currentScreen = 'floor';
            gameState.updateActivity();

            logger.info(`Floor ${currentFloor} displayed for user ${gameState.playerId}`);

        } catch (error) {
            logger.error('Error showing floor:', error);
            await interaction.update({
                content: 'Error loading floor. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle floor action selections
     */
    static async handleSelection(interaction, gameState, selectedValue) {
        try {
            switch (selectedValue) {
                case 'explore':
                    await this.handleExplore(interaction, gameState);
                    break;
                
                case 'inventory':
                    await this.handleInventory(interaction, gameState);
                    break;
                
                case 'stairs':
                    await this.handleStairs(interaction, gameState);
                    break;
                
                case 'return_to_entrance':
                    await this.handleReturnToEntrance(interaction, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown floor action: ${selectedValue}`);
                    await interaction.update({
                        content: 'Unknown option selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling floor selection:', error);
            throw error;
        }
    }

    /**
     * Handle explore action
     */
    static async handleExplore(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const explorationCount = gameState.currentFloorExplorations || 0;
            const maxExplorations = this.getMaxExplorations(currentFloor);
            
            // Check if explorations remaining
            if (explorationCount >= maxExplorations) {
                await interaction.update({
                    content: 'You have already explored all areas on this floor.',
                    embeds: [],
                    components: []
                });
                return;
            }
            
            // Increment exploration count
            gameState.currentFloorExplorations = explorationCount + 1;
            
            // Dynamic import to avoid circular dependencies under ESM
            const { ExplorationHandler } = await import('./ExplorationHandler.js');
            await ExplorationHandler.startExploration(interaction, gameState);
            
            logger.info(`User ${gameState.session.userId} started exploring floor ${currentFloor}`);
            
        } catch (error) {
            logger.error('Error handling explore:', error);
            throw error;
        }
    }

    /**
     * Handle inventory action
     */
    static async handleInventory(interaction, gameState) {
        try {
            const { InventoryHandler } = await import('../inventory/InventoryHandler.js');
            await InventoryHandler.showInventory(interaction, gameState);
            
            logger.info(`User ${gameState.session.userId} opened inventory`);
            
        } catch (error) {
            logger.error('Error handling inventory:', error);
            await interaction.update({
                content: 'Failed to open inventory. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle stairs action (floor boss battle)
     */
    static async handleStairs(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            
            const { BattleHandler } = await import('./BattleHandler.js');
            await BattleHandler.startFloorBossBattle(interaction, gameState, currentFloor);
            
            logger.info(`User ${gameState.session.userId} initiated floor boss battle on floor ${currentFloor}`);
            
        } catch (error) {
            logger.error('Error handling stairs:', error);
            await interaction.update({
                content: 'Failed to initiate floor boss battle. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle return to entrance
     */
    static async handleReturnToEntrance(interaction, gameState) {
        try {
            // Update game state
            gameState.currentScreen = 'dungeon_entrance';
            gameState.updateActivity();
            
            const { DungeonEntranceHandler } = await import('./DungeonEntranceHandler.js');
            await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
            
            logger.info(`User ${gameState.session.userId} returned to dungeon entrance`);
            
        } catch (error) {
            logger.error('Error returning to entrance:', error);
            await interaction.update({
                content: 'Failed to return to entrance. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Advance player to next floor
     */
    static async advanceToNextFloor(interaction, gameState) {
        try {
            // Increment floor
            gameState.currentFloor = (gameState.currentFloor || 1) + 1;
            
            // Update progress tracking
            if (!gameState.progress) gameState.progress = {};
            gameState.progress.highestFloorReached = Math.max(
                gameState.progress.highestFloorReached || 0,
                gameState.currentFloor
            );
            
            // Reset exploration count for new floor
            gameState.currentFloorExplorations = 0;
            
            // Update screen
            gameState.currentScreen = 'floor';
            gameState.updateActivity();
            
            // Check for hero unlocks
            await this.checkHeroUnlocks(gameState);
            
            // Show new floor
            await this.showFloor(interaction, gameState);
            
            logger.info(`User ${gameState.session.userId} advanced to floor ${gameState.currentFloor}`);
            
        } catch (error) {
            logger.error('Error advancing to next floor:', error);
            throw error;
        }
    }

    /**
     * Check if any heroes should be unlocked
     */
    static async checkHeroUnlocks(gameState) {
        try {
            const { heroesData } = await import('../../data/heroesData.js');
            const currentFloor = gameState.currentFloor;
            
            if (!gameState.progress.unlockedHeroes) {
                gameState.progress.unlockedHeroes = ['grim_stonebeard'];
            }
            
            // Check for heroes that unlock at this floor
            const heroesToUnlock = heroesData.filter(hero => 
                hero.unlockFloor === currentFloor && 
                !gameState.progress.unlockedHeroes.includes(hero.id)
            );
            
            heroesToUnlock.forEach(hero => {
                gameState.progress.unlockedHeroes.push(hero.id);
                logger.info(`Hero ${hero.name} unlocked for user ${gameState.session.userId} at floor ${currentFloor}`);
            });
            
        } catch (error) {
            logger.error('Error checking hero unlocks:', error);
        }
    }

    /**
     * Get maximum explorations for a floor
     */
    static getMaxExplorations(floor) {
        // Based on RULES.txt: Floor 1-9 have 3 explorations, 10-20 have 5, then +1 every 10 floors up to 10 max
        if (floor <= 9) {
            return 3;
        } else if (floor <= 20) {
            return 5;
        } else {
            const additionalExplorations = Math.floor((floor - 20) / 10);
            return Math.min(10, 5 + additionalExplorations);
        }
    }

    /**
     * Get floor description based on floor number
     */
    static getFloorDescription(floor) {
        // This could be expanded with more detailed descriptions per floor
        const descriptions = {
            1: 'The entrance level of the dungeon. Rats scurry in the shadows.',
            2: 'A damp corridor echoes with the flutter of bat wings.',
            3: 'Ancient bones creak and rattle in the darkness.',
            4: 'Dusty bandages drift through the stale air.',
            5: 'Dark magic permeates this cursed chamber.',
            6: 'Crude weapons and trophies litter the goblin lair.',
            7: 'War drums echo through the orc stronghold.',
            8: 'The scent of blood hangs heavy in the vampire\'s domain.',
            9: 'Necromantic energy crackles through the air.',
            10: 'Dragon scales gleam in the torchlight.',
            11: 'Acidic pools bubble and steam.',
            12: 'Stone guardians watch from the shadows.',
            13: 'Haunting melodies drift through the air.',
            14: 'Flames dance without fuel or source.',
            15: 'Shadow magic distorts reality itself.',
            16: 'The earth trembles with ancient power.',
            17: 'Winds howl through impossible spaces.',
            18: 'A thousand eyes watch from the darkness.',
            19: 'Surprisingly peaceful... almost too peaceful.',
            20: 'The final chamber radiates immense power.'
        };
        
        return descriptions[floor] || `Floor ${floor} - The dungeon grows ever more dangerous.`;
    }
}

export { FloorHandler }; 