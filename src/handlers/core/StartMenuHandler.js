import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { embedHistory } from '../../utils/embedHistory.js';

/**
 * StartMenuHandler - Handles the initial game welcome screen and main menu
 * Provides options: Start, Tutorial, Profile, Leaderboard, Quests (per updated RULES.txt)
 */
export class StartMenuHandler {
    
    /**
     * Show the start menu with options for Start, Tutorial, Daily Quests, Profile, and Leaderboard
     */
    static async showStartMenu(interactionOrMessage, gameState) {
        try {
            // Determine economy display based on division
            const economyDisplay = this.buildEconomyDisplay(gameState);

            const embed = new EmbedBuilder()
                .setTitle('🏴‍☠️ **DUNGEONITES HEROES CHALLENGE** 🏴‍☠️')
                .setDescription(`Welcome to the ultimate dungeon adventure, ${gameState.playerName}!\n\n` +
                              `**Current Division:** ${gameState.economyType.toUpperCase()}\n` +
                              `**Balance:** ${economyDisplay}\n\n` +
                              `Choose your path:`)
                .setColor(0x8B4513)
                .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                .setFooter({ text: 'Choose your adventure!' })
                .setTimestamp();

            // Add start menu options
            const options = [];
            
            // Check if there's a saved game to continue
            logger.info(`[START_MENU_DEBUG] User ${gameState.session.userId} - lastSaved: ${gameState.session.lastSaved}, currentScreen: ${gameState.currentScreen}`);
            
            if (gameState.session.lastSaved && gameState.currentScreen !== 'start_menu') {
                logger.info(`[START_MENU_DEBUG] Adding Continue Saved Game option`);
                options.push({
                    label: '🔄 Continue Saved Game',
                    description: `Resume from ${gameState.currentScreen === 'battle' ? 'battle' : gameState.currentScreen === 'floor' ? `Floor ${gameState.currentFloor}` : gameState.currentScreen}`,
                    value: 'continue_saved_game',
                    emoji: '🔄'
                });
            } else {
                logger.info(`[START_MENU_DEBUG] Not adding Continue Saved Game option - conditions not met`);
            }
            
            // Always show start new game option
            options.push({
                label: '🎮 Start New Game',
                description: 'Begin a fresh dungeon adventure',
                value: 'start_game',
                emoji: '🎮'
            });
            
            options.push(
                {
                    label: '📜 Daily Quests',
                    description: 'View and complete daily quests',
                    value: 'daily_quests',
                    emoji: '📜'
                },
                {
                    label: '📚 Tutorial',
                    description: 'Learn how to play',
                    value: 'tutorial',
                    emoji: '📚'
                },
                {
                    label: '👤 Profile',
                    description: 'View your profile and statistics',
                    value: 'profile',
                    emoji: '👤'
                },
                {
                    label: '🏆 Leaderboard',
                    description: 'View top players',
                    value: 'leaderboard',
                    emoji: '🏆'
                },
                {
                    label: '💱 Currency Exchange',
                    description: 'Exchange currencies between tiers',
                    value: 'exchange_menu',
                    emoji: '💱'
                },
                {
                    label: '💼 Wallet Loader',
                    description: 'Load crypto wallets for on-chain rewards',
                    value: 'wallet_loader',
                    emoji: '💼'
                }
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('start_menu')
                .setPlaceholder('Choose your action...')
                .addOptions(options);

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            // Check if it's an interaction or a message
            if (interactionOrMessage.isStringSelectMenu && interactionOrMessage.isStringSelectMenu()) {
                // It's an interaction - use embed history system
                await embedHistory.updateWithHistory(interactionOrMessage, {
                    embeds: [embed],
                    components: [row]
                }, gameState.session.userId);
            } else {
                // It's a message - should not happen in normal flow, but handle gracefully
                await interactionOrMessage.reply({
                    embeds: [embed],
                    components: [row],
                    allowedMentions: { repliedUser: false }
                });
            }

            // Only set screen to start_menu if not showing for a loaded game
            // If there's a saved game, preserve the original currentScreen for "Continue Saved Game"
            if (!gameState.session.lastSaved || gameState.currentScreen === 'start_menu') {
                gameState.currentScreen = 'start_menu';
            }
            gameState.updateActivity();

        } catch (error) {
            logger.error('Error showing start menu:', error);
            
            // Handle error response based on type
            if (interactionOrMessage.isStringSelectMenu && interactionOrMessage.isStringSelectMenu()) {
                await embedHistory.updateWithHistory(interactionOrMessage, {
                    content: '❌ Error loading start menu. Please try again.',
                    embeds: [],
                    components: []
                }, gameState.session.userId);
            } else {
                await interactionOrMessage.reply({
                    content: '❌ Error loading start menu. Please try again.',
                    allowedMentions: { repliedUser: false }
                });
            }
        }
    }

    /**
     * Handle start menu selections
     */
    static async handleStartMenuSelection(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'start_game':
                    await this.handleStartGame(interaction, gameState);
                    break;
                
                case 'continue_saved_game':
                    await this.handleContinueSavedGame(interaction, gameState);
                    break;
                
                case 'daily_quests':
                    await this.handleQuests(interaction, gameState);
                    break;
                
                case 'tutorial':
                    await this.handleTutorial(interaction);
                    break;
                
                case 'profile':
                    await this.handleProfile(interaction, gameState);
                    break;
                
                case 'leaderboard':
                    await this.handleLeaderboard(interaction);
                    break;
                
                case 'exchange_menu':
                    const { DivisionHandler } = await import('./DivisionHandler.js');
                    await DivisionHandler.showExchangeMenu(interaction, gameState);
                    break;
                
                case 'wallet_loader':
                    const { DivisionHandler: WalletDivisionHandler } = await import('./DivisionHandler.js');
                    await WalletDivisionHandler.showWalletLoader(interaction, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown start menu selection: ${selectedValue}`);
                    await embedHistory.updateWithHistory(interaction, {
                        content: 'Unknown option selected. Please try again.',
                        embeds: [],
                        components: []
                    }, gameState.session.userId);
            }
        } catch (error) {
            logger.error('Error handling start menu selection:', error);
            throw error;
        }
    }

    /**
     * Handle "Start Game" selection - proceed to hero selection
     */
    static async handleStartGame(interaction, gameState) {
        // Import here to avoid circular dependencies
        const { HeroSelectionHandler } = await import('./HeroSelectionHandler.js');
        
        try {
            // Update current screen
            gameState.currentScreen = 'hero_selection';
            gameState.updateActivity();
            
            // Show hero selection screen
            await HeroSelectionHandler.showHeroSelection(interaction, gameState);
            
            logger.info(`User ${interaction.user.id} started game, proceeding to hero selection`);
            
        } catch (error) {
            logger.error('Error starting game:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to start the game. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle "Continue Saved Game" selection - resume from saved state
     */
    static async handleContinueSavedGame(interaction, gameState) {
        try {
            // Import CommandHandler to use the resume method
            const { CommandHandler } = await import('../../commands/CommandHandler.js');
            
            // Resume from the saved state
            await CommandHandler.resumeGameFromLoadedState(interaction, gameState);
            
            logger.info(`User ${interaction.user.id} continued saved game from ${gameState.currentScreen}`);
            
        } catch (error) {
            logger.error('Error continuing saved game:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to continue saved game. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle "Quests" selection
     */
    static async handleQuests(interaction, gameState) {
        try {
            const { QuestHandler } = await import('./QuestHandler.js');
            
            // Update current screen
            gameState.currentScreen = 'quest_menu';
            gameState.updateActivity();
            
            // Show quest menu
            await QuestHandler.showQuestMenu(interaction, gameState);
            
            logger.info(`User ${interaction.user.id} accessed quest menu`);
            
        } catch (error) {
            logger.error('Error showing quest menu:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to load quest menu. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle "Tutorial" selection
     */
    static async handleTutorial(interaction) {
        try {
            const tutorialEmbed = new EmbedBuilder()
                .setTitle('📚 **DUNGEONITES HEROES CHALLENGE - TUTORIAL** 📚')
                .setDescription('**How to Play:**\n\n' +
                    '🎮 **Commands:**\n' +
                                    '• `/ch` - Start/resume your game\n' +
                '• `/chsave` - Save your progress\n' +
                '• `/chload` - Load saved game (crash recovery)\n\n' +
                    
                    '💰 **Economy System:**\n' +
                    '• Choose your division: Gold (free), Tokens, $DNG, $HERO, $ETH\n' +
                    '• Higher divisions provide better rewards\n' +
                    '• Exchange currencies: 1000 lower = 1 higher\n' +
                    '• Division entry costs required per game\n\n' +
                    
                    '🏰 **Game Flow:**\n' +
                    '• Choose your hero and explore dungeon floors\n' +
                    '• Battle monsters to progress to deeper floors\n' +
                    '• Find treasure, weapons, and armor\n' +
                    '• Unlock new heroes as you reach higher floors\n\n' +
                    
                    '⚔️ **Combat:**\n' +
                    '• Simultaneous combat system (both you and monster act at once)\n' +
                    '• Choose weapons, abilities, or items each turn\n' +
                    '• Battle continues until one side is defeated\n\n' +
                    
                    '📜 **Quests:**\n' +
                    '• Complete daily and weekly quests for rewards\n' +
                    '• Higher divisions provide bonus quest rewards\n' +
                    '• Quest progress tracks across game sessions\n\n' +
                    
                    '🗝️ **Progression:**\n' +
                    '• Defeat floor bosses to advance to next floor\n' +
                    '• Explore floors for extra loot and encounters\n' +
                    '• Game loops infinitely after floor 20 with stronger monsters\n\n' +
                    
                    '🎒 **Inventory:**\n' +
                    '• Limited to 20 weapons, 20 armor, unlimited gold\n' +
                    '• Manage weapons, armor, and consumables\n' +
                    '• Visit shops every 10 floors to buy and sell items\n\n' +
                    
                    '📊 **Divisions & Rewards:**\n' +
                    '• Gold Division: Free play\n' +
                    '• Token Division: 1 Token entry, 2x rewards\n' +
                    '• $DNG Division: 1 $DNG entry, 5x rewards\n' +
                    '• $HERO Division: 1 $HERO entry, 10x rewards\n' +
                    '• $ETH Division: Free entry, 20x rewards\n\n' +
                    
                    '🔄 **Currency Exchange:**\n' +
                    '• 1000 Gold = 1 Token\n' +
                    '• 1000 Tokens = 1 $DNG\n' +
                    '• 1000 $DNG = 1 $HERO\n' +
                    '• 1000 $HERO = 1 $ETH\n\n' +
                    
                    '**Good luck, brave adventurer!**')
                .setColor(0x3498db)
                .setThumbnail('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                .setFooter({ text: 'Ready to start your adventure?' });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('tutorial_menu')
                .setPlaceholder('What would you like to do?')
                .addOptions([
                    {
                        label: '🔙 Back to Main Menu',
                        description: 'Return to the main menu',
                        value: 'back_to_main',
                        emoji: '🔙'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [tutorialEmbed],
                components: [row]
            }, interaction.user.id);

        } catch (error) {
            logger.error('Error showing tutorial:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to load tutorial. Please try again.',
                embeds: [],
                components: []
            }, interaction.user.id);
        }
    }

    /**
     * Handle "Profile" selection
     */
    static async handleProfile(interaction, gameState) {
        try {
            const { ProfileHandler } = await import('./ProfileHandler.js');
            
            // Show profile using ProfileHandler
            await ProfileHandler.showPlayerProfile(interaction, gameState);
            
            logger.info(`Profile displayed for user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing profile:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to load profile. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle "Leaderboard" selection
     */
    static async handleLeaderboard(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Get top 20 players
            const topPlayers = await DatabaseManager.getLeaderboard(20);
            
            const leaderboardEmbed = new EmbedBuilder()
                .setTitle('🏆 **DUNGEONITES HEROES CHALLENGE - LEADERBOARD** 🏆')
                .setDescription('Top 20 dungeon heroes ranked by highest floor reached!')
                .setColor(0xFFD700)
                .setFooter({ text: 'Keep climbing to reach the top!' })
                .setTimestamp();

            if (topPlayers && topPlayers.length > 0) {
                const medals = ['🥇', '🥈', '🥉'];
                let leaderboardText = '';
                
                for (let i = 0; i < topPlayers.length; i++) {
                    const player = topPlayers[i];
                    const medal = i < 3 ? medals[i] : `${i + 1}.`;
                    const username = player.username || 'Unknown';
                    const highestFloor = player.progress?.highestFloorReached || 0;
                    const division = player.economyType || 'gold';
                    
                    leaderboardText += `${medal} **${username}** - Floor ${highestFloor} (${division.toUpperCase()})\n`;
                }
                
                leaderboardEmbed.addFields([
                    {
                        name: '🏅 **Top Players**',
                        value: leaderboardText,
                        inline: false
                    }
                ]);
            } else {
                leaderboardEmbed.addFields([
                    {
                        name: '🏅 **No Players Yet**',
                        value: 'Be the first to complete a floor and claim your spot!',
                        inline: false
                    }
                ]);
            }

            await embedHistory.updateWithHistory(interaction, {
                embeds: [leaderboardEmbed],
                components: []
            }, interaction.user.id);

            logger.info(`Leaderboard displayed for user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing leaderboard:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Failed to load leaderboard. Please try again.',
                embeds: [],
                components: []
            }, interaction.user.id);
        }
    }

    /**
     * Show tutorial information
     */
    static async showTutorial(interaction, gameState) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📚 **DUNGEONITES HEROES CHALLENGE - TUTORIAL** 📚')
                .setDescription('Welcome to the ultimate dungeon adventure! Here\'s how to play:')
                .setColor(0x0099FF)
                .addFields([
                    {
                        name: '🎮 **Game Basics**',
                        value: '• Select a division to play in\n• Choose your hero\n• Explore dungeons and battle monsters\n• Collect loot and advance to deeper floors',
                        inline: false
                    },
                    {
                        name: '💰 **Economy System**',
                        value: '• Gold: Basic currency for starting\n• Tokens: Entry fee for most divisions\n• $DNG/$HERO/$ETH: Advanced currencies\n• Exchange rate: 1000:1 between tiers',
                        inline: false
                    },
                    {
                        name: '⚔️ **Combat System**',
                        value: '• Turn-based simultaneous combat\n• Use weapons, abilities, and items\n• Manage health and mana carefully\n• Defeat floor bosses to advance',
                        inline: false
                    },
                    {
                        name: '🏰 **Floor Progression**',
                        value: '• Explore each floor before facing the boss\n• Find treasure chests and keys\n• Encounter random monsters\n• Game loops after Floor 20',
                        inline: false
                    },
                    {
                        name: '🎯 **Tips for Success**',
                        value: '• Save your game regularly with `/chsave`\n• Use inventory items strategically\n• Upgrade your weapons and armor\n• Complete daily quests for rewards',
                        inline: false
                    }
                ])
                .setFooter({ text: 'Good luck on your adventure!' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('tutorial_menu')
                .setPlaceholder('Tutorial options...')
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
            }, interaction.user.id);

            gameState.currentScreen = 'tutorial';
            gameState.updateActivity();

        } catch (error) {
            logger.error('Error showing tutorial:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error loading tutorial. Please try again.',
                embeds: [],
                components: []
            }, interaction.user.id);
        }
    }

    /**
     * Show leaderboard
     */
    static async showLeaderboard(interaction, gameState) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            // Get leaderboard data
            const leaderboardData = await DatabaseManager.getLeaderboard();
            
            const embed = new EmbedBuilder()
                .setTitle('🏆 **DUNGEONITES HEROES CHALLENGE - LEADERBOARD** 🏆')
                .setDescription('Top adventurers in the dungeon:')
                .setColor(0xFFD700);

            if (leaderboardData && leaderboardData.length > 0) {
                let leaderboardText = '';
                
                for (let i = 0; i < Math.min(leaderboardData.length, 10); i++) {
                    const player = leaderboardData[i];
                    const rank = i + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                    
                    leaderboardText += `${medal} **${player.playerName}** - Floor ${player.currentFloor} (${player.economyType.toUpperCase()})\n`;
                }
                
                embed.addFields([
                    {
                        name: '🏅 **Top Players**',
                        value: leaderboardText,
                        inline: false
                    }
                ]);
            } else {
                embed.addFields([
                    {
                        name: '🏅 **Leaderboard**',
                        value: 'No players found. Be the first to make it to the leaderboard!',
                        inline: false
                    }
                ]);
            }

            embed.setFooter({ text: 'Rankings based on highest floor reached' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('leaderboard_menu')
                .setPlaceholder('Leaderboard options...')
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
            }, interaction.user.id);

            gameState.currentScreen = 'leaderboard';
            gameState.updateActivity();

        } catch (error) {
            logger.error('Error showing leaderboard:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Error loading leaderboard. Please try again.',
                embeds: [],
                components: []
            }, interaction.user.id);
        }
    }

    /**
     * Helper to build economy display string
     */
    static buildEconomyDisplay(gameState) {
        const economy = gameState.economy || {};
        let display = '';
        
        if (economy.gold > 0) {
            display += `${economy.gold} Gold, `;
        }
        if (economy.tokens > 0) {
            display += `${economy.tokens} Tokens, `;
        }
        if (economy.dng > 0) {
            display += `${economy.dng} $DNG, `;
        }
        if (economy.hero > 0) {
            display += `${economy.hero} $HERO, `;
        }
        if (economy.eth > 0) {
            display += `${economy.eth} $ETH, `;
        }
        
        return display.length > 0 ? display.slice(0, -2) : 'No balance'; // Remove the last comma and space
    }
} 