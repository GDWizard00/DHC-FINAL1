import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { PersistentEmbedManager } from '../../utils/persistentEmbedManager.js';

/**
 * PermanentEmbedHandler - Manages permanent embed interfaces with buttons
 * Now uses PersistentEmbedManager for systematic reply() system with auto-delete and thread redirection
 * Handles Game Hall, Marketplace, Casino, and Admin embeds with enhanced thread system
 */
export class PermanentEmbedHandler {
    // Enhanced thread tracking with metadata
    static activeThreads = new Map(); // userId -> { threadId, createdAt, username, channelId }
    static threadCleanupInterval = null;

    /**
     * Initialize thread cleanup system
     */
    static initializeThreadCleanup() {
        if (!this.threadCleanupInterval) {
            // Run cleanup every 5 minutes
            this.threadCleanupInterval = setInterval(() => {
                this.cleanupInactiveThreads();
            }, 5 * 60 * 1000);
            
            logger.info('Thread cleanup system initialized');
        }
    }

    /**
     * Clean up inactive or archived threads
     */
    static async cleanupInactiveThreads() {
        try {
            const now = Date.now();
            const threadsToRemove = [];

            for (const [userId, threadData] of this.activeThreads.entries()) {
                try {
                                         // Check if thread still exists and is active
                     const guild = global.client?.guilds.cache.first() || client?.guilds.cache.first(); // Get first guild
                     if (!guild) continue;

                    const thread = await guild.channels.fetch(threadData.threadId).catch(() => null);
                    
                    if (!thread || thread.archived) {
                        threadsToRemove.push(userId);
                        logger.info(`Cleaned up inactive thread for user ${userId}`);
                    }
                } catch (error) {
                    // Thread doesn't exist, remove from tracking
                    threadsToRemove.push(userId);
                }
            }

            // Remove inactive threads from tracking
            threadsToRemove.forEach(userId => this.activeThreads.delete(userId));

            if (threadsToRemove.length > 0) {
                logger.info(`Cleaned up ${threadsToRemove.length} inactive threads`);
            }

        } catch (error) {
            logger.error('Error during thread cleanup:', error);
        }
    }

    /**
     * Archive user's existing threads before creating new ones
     */
    static async archiveUserThreads(userId, guild) {
        try {
            const existingThreadData = this.activeThreads.get(userId);
            
            if (existingThreadData) {
                try {
                    const existingThread = await guild.channels.fetch(existingThreadData.threadId);
                    
                    if (existingThread && !existingThread.archived) {
                        // Send a goodbye message before archiving
                        await existingThread.send({
                            content: '🔄 **New game session started!** This thread will be archived.\n\n*Check your new adventure thread for continued gameplay.*'
                        });
                        
                        // Archive the old thread
                        await existingThread.setArchived(true, 'User started new game session');
                        
                        logger.info(`Archived old thread ${existingThreadData.threadId} for user ${userId}`);
                        auditLogger.log('THREAD_ARCHIVED', `Old thread archived for new session`, 'thread_management', {
                            userId: userId,
                            archivedThreadId: existingThreadData.threadId
                        });
                    }
                } catch (error) {
                    logger.warn(`Could not archive old thread for user ${userId}:`, error.message);
                }
                
                // Remove from tracking regardless
                this.activeThreads.delete(userId);
            }

            // Also check for any other threads with the user's name pattern
            const channels = await guild.channels.fetch();
            const userThreads = channels.filter(channel => 
                channel.isThread() && 
                channel.name.includes(`${userId}`) || 
                channel.name.includes(`Adventure`) && 
                channel.members?.cache.has(userId)
            );

            for (const [, thread] of userThreads) {
                if (!thread.archived && thread.id !== existingThreadData?.threadId) {
                    try {
                        await thread.setArchived(true, 'Cleanup: User started new session');
                        logger.info(`Archived orphaned thread ${thread.id} for user ${userId}`);
                    } catch (error) {
                        logger.warn(`Could not archive orphaned thread ${thread.id}:`, error.message);
                    }
                }
            }

        } catch (error) {
            logger.error('Error archiving user threads:', error);
        }
    }

    /**
     * Create Game Hall permanent embed
     */
    static async createGameHallEmbed(interaction) {
        try {
            const { embed, components } = this.buildGameHallEmbed();

            await interaction.reply({
                embeds: [embed],
                components: components,
                ephemeral: false // Permanent embed
            });

            logger.info(`Game Hall embed created by ${interaction.user.username} in ${interaction.guild.name}`);

        } catch (error) {
            logger.error('Error creating Game Hall embed:', error);
            // Only reply with error if interaction hasn't been replied to yet
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error creating Game Hall embed.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Build Game Hall embed and components (reusable)
     */
    static buildGameHallEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('🎮 **DUNGEONITES HEROES CHALLENGE** 🎮')
            .setDescription(
                '**Welcome to the Game Hall!**\n\n' +
                '🏰 **Adventure awaits in the dungeons below!**\n' +
                'Explore dangerous floors, battle monsters, collect treasure, and unlock powerful heroes.\n\n' +
                '⚔️ **Combat System**: Simultaneous turn-based battles\n' +
                '💰 **Economy**: Multi-tier currency system (Gold → $HERO → $ETH)\n' +
                '🎯 **Progression**: Unlock heroes by reaching higher floors\n' +
                '📜 **Quests**: Daily and custom server quests\n\n' +
                '**🎮 Click "Start Game" to begin your adventure!**\n' +
                '*Each player gets their own private game thread.*'
            )
            .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
            .setColor(0x8B4513)
            .setFooter({ text: 'Game Hall • Adventure Awaits' })
            .setTimestamp();

        const startGameButton = new ButtonBuilder()
            .setCustomId('permanent_start_game')
            .setLabel('🎮 Start Game')
            .setStyle(ButtonStyle.Primary);

        const profileButton = new ButtonBuilder()
            .setCustomId('permanent_view_profile')
            .setLabel('👤 View Profile')
            .setStyle(ButtonStyle.Secondary);

        const tutorialButton = new ButtonBuilder()
            .setCustomId('permanent_tutorial')
            .setLabel('📚 Tutorial')
            .setStyle(ButtonStyle.Secondary);

        const questsButton = new ButtonBuilder()
            .setCustomId('permanent_quests')
            .setLabel('📜 Daily Quests')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(startGameButton, profileButton, tutorialButton, questsButton);

        return { embed, components: [row] };
    }

    /**
     * Setup-friendly Game Hall embed creator (doesn't rely on interaction.reply)
     */
    static async createGameHallEmbedForSetup(channel, user) {
        try {
            const { embed, components } = this.buildGameHallEmbed();

            const message = await channel.send({
                embeds: [embed],
                components: components
            });

            logger.info(`Game Hall embed created in ${channel.name} during setup by ${user.username}`);
            return message;

        } catch (error) {
            logger.error('Error creating Game Hall embed during setup:', error);
            throw error; // Let setup process handle the error appropriately
        }
    }

    /**
     * Create Marketplace permanent embed
     */
    static async createMarketplaceEmbed(interaction) {
        try {
            const { embed, components } = this.buildMarketplaceEmbed();

            await interaction.reply({
                embeds: [embed],
                components: components,
                ephemeral: false // Permanent embed
            });

            logger.info(`Marketplace embed created by ${interaction.user.username} in ${interaction.guild.name}`);

        } catch (error) {
            logger.error('Error creating Marketplace embed:', error);
            // Only reply with error if interaction hasn't been replied to yet
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error creating Marketplace embed.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Build Marketplace embed and components (reusable)
     */
    static buildMarketplaceEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('🏪 **DUNGEONITES MARKETPLACE** 🏪')
            .setDescription(
                '**Welcome to the Trading Hub!**\n\n' +
                '🛒 **Store**: Buy and sell items with the shopkeeper\n' +
                '• Daily rotating inventory\n' +
                '• Division-based pricing\n' +
                '• Potions, weapons, armor, scrolls\n\n' +
                '👥 **Player Market**: Trade with other adventurers\n' +
                '• List items for sale\n' +
                '• Browse player listings\n' +
                '• Secure trading system\n\n' +
                '🔄 **Trading Post**: Advanced trading features\n' +
                '• Item auctions\n' +
                '• Bulk trading\n' +
                '• Cross-server markets\n\n' +
                '**💰 All transactions are secure and Web3-ready!**\n\n' +
                '*Select an option below to begin...*'
            )
            .setColor(0x00aa00)
            .setFooter({ text: 'Marketplace • Secure Trading Platform' })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('marketplace_main')
            .setPlaceholder('Choose a marketplace section...')
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛒 Store')
                    .setDescription('Buy and sell items with the shopkeeper')
                    .setValue('store'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👥 Player Market')
                    .setDescription('Browse and list items for sale')
                    .setValue('player_market'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Trading Post')
                    .setDescription('Barter system and auctions')
                    .setValue('trading_post'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📦 My Chests')
                    .setDescription('Manage your Profile and Adventure chests')
                    .setValue('player_chests')
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return { embed, components: [row] };
    }

    /**
     * Setup-friendly Marketplace embed creator
     */
    static async createMarketplaceEmbedForSetup(channel, user) {
        try {
            const { embed, components } = this.buildMarketplaceEmbed();

            const message = await channel.send({
                embeds: [embed],
                components: components
            });

            logger.info(`Marketplace embed created in ${channel.name} during setup by ${user.username}`);
            return message;

        } catch (error) {
            logger.error('Error creating Marketplace embed during setup:', error);
            throw error;
        }
    }

    /**
     * Create Casino permanent embed
     */
    static async createCasinoEmbed(interaction) {
        try {
            const { embed, components } = this.buildCasinoEmbed();

            const casinoMessage = await interaction.reply({
                embeds: [embed],
                components: components,
                ephemeral: false // Permanent embed
            });

            logger.info(`Casino embed created by ${interaction.user.username} in ${interaction.guild.name}`);

        } catch (error) {
            logger.error('Error creating Casino embed:', error);
            // Only reply with error if interaction hasn't been replied to yet
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error creating Casino embed.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Build Casino embed and components (reusable)
     */
    static buildCasinoEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('🎰 **DUNGEONITES CASINO** 🎰')
            .setDescription(
                '**Welcome to the Casino!**\n\n' +
                '🪙 **Coin Flip**: Classic heads or tails\n' +
                '• 50/50 chance to double your bet\n' +
                '• Available in all divisions\n' +
                '• Quick and simple gambling\n\n' +
                '🎲 **Dice Games**: Coming Soon!\n' +
                '• Various dice betting options\n' +
                '• Multiple payout ratios\n' +
                '• Tournament modes\n\n' +
                '🃏 **Card Games**: Coming Soon!\n' +
                '• Blackjack variations\n' +
                '• Poker tournaments\n' +
                '• Player vs player modes\n\n' +
                '**⚠️ Gamble responsibly! Set limits and have fun!**'
            )
            .setColor(0xffd700)
            .setFooter({ text: 'Casino • Gamble Responsibly' })
            .setTimestamp();

        const coinFlipButton = new ButtonBuilder()
            .setCustomId('permanent_coin_flip')
            .setLabel('🪙 Coin Flip')
            .setStyle(ButtonStyle.Primary);

        const diceButton = new ButtonBuilder()
            .setCustomId('permanent_dice_games')
            .setLabel('🎲 Dice Games')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true); // Coming soon

        const cardButton = new ButtonBuilder()
            .setCustomId('permanent_card_games')
            .setLabel('🃏 Card Games')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const leaderboardButton = new ButtonBuilder()
            .setCustomId('permanent_casino_leaderboard')
            .setLabel('🏆 Leaderboard')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(coinFlipButton, diceButton, cardButton, leaderboardButton);

        return { embed, components: [row] };
    }

    /**
     * Setup-friendly Casino embed creator
     */
    static async createCasinoEmbedForSetup(channel, user) {
        try {
            const { embed, components } = this.buildCasinoEmbed();

            const message = await channel.send({
                embeds: [embed],
                components: components
            });

            logger.info(`Casino embed created in ${channel.name} during setup by ${user.username}`);
            return message;

        } catch (error) {
            logger.error('Error creating Casino embed during setup:', error);
            throw error;
        }
    }

    /**
     * Create Master Dashboard permanent embed (Bot Developer only)
     */
    static async createMasterDashboardEmbed(interaction) {
        try {
            const { embed, components } = this.buildMasterDashboardEmbed();

            await interaction.reply({
                embeds: [embed],
                components: components,
                ephemeral: false // Permanent embed but will be private channel
            });

            logger.info(`Master Dashboard embed created by ${interaction.user.username} in ${interaction.guild.name}`);

        } catch (error) {
            logger.error('Error creating Master Dashboard embed:', error);
            // Only reply with error if interaction hasn't been replied to yet
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error creating Master Dashboard embed.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Build Master Dashboard embed and components (reusable)
     */
    static buildMasterDashboardEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('⚔️ **MASTER DASHBOARD** ⚔️')
            .setDescription(
                '**Bot Developer Command Center**\n\n' +
                '🛠️ **System Management** - Server setup, channels, overrides\n' +
                '👥 **User Management** - Profiles, recovery, admin controls\n' +
                '💰 **Economy Tools** - Send currency, manage economies\n' +
                '⚔️ **Game Management** - Items, quests, promotional weapons\n' +
                '📊 **Analytics & Logs** - System monitoring and audit logs\n' +
                '🔧 **Developer Tools** - Testing, diagnostics, emergency controls\n\n' +
                '**🎮 Working Commands Available:**\n' +
                '• `/master` - Master control panel\n' +
                '• `/admin` - Admin functions (economy, items, quests)\n' +
                '• `/embed` - Create permanent embeds\n' +
                '• `/setup` - Server setup and configuration\n' +
                '• `/profile` - Profile management\n' +
                '• All slash commands with full override access\n\n' +
                '*Select operation category:*'
            )
            .setColor(0xff0000)
            .setFooter({ text: 'Master Dashboard • Ultimate Authority • All Actions Logged' })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('master_dashboard_main')
            .setPlaceholder('Choose command category...')
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛠️ System Management')
                    .setDescription('Server setup, channels, configuration')
                    .setValue('system_management'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👥 User Management') 
                    .setDescription('Profile control, admin management')
                    .setValue('user_management'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economy Tools')
                    .setDescription('Send currency, economic controls')
                    .setValue('economy_tools'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚔️ Game Management')
                    .setDescription('Items, quests, promotional weapons')
                    .setValue('game_management'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Analytics & Monitoring')
                    .setDescription('System stats, audit logs, performance')
                    .setValue('analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 Developer Tools')
                    .setDescription('Testing, diagnostics, emergency functions')
                    .setValue('developer_tools')
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return { embed, components: [row] };
    }

    /**
     * Setup-friendly Master Dashboard embed creator
     */
    static async createMasterDashboardEmbedForSetup(channel, user) {
        try {
            const { embed, components } = this.buildMasterDashboardEmbed();

            const message = await channel.send({
                embeds: [embed],
                components: components
            });

            logger.info(`Master Dashboard embed created in ${channel.name} during setup by ${user.username}`);
            return message;

        } catch (error) {
            logger.error('Error creating Master Dashboard embed during setup:', error);
            throw error;
        }
    }

    /**
     * Handle "Start Game" button click - Uses new PersistentEmbedManager
     */
    static async handleStartGame(interaction) {
        try {
            // Build the game start response data
            const responseData = {
                content: '🎮 **Starting your adventure...**\n\nInitializing game state and preparing your private gaming space.',
                embeds: [],
                components: []
            };

            // Use PersistentEmbedManager to handle this interaction
            await PersistentEmbedManager.handlePermanentEmbedInteraction(interaction, responseData, {
                forceThread: true,
                skipProfileCheck: false,
                threadTitle: `🎮 ${interaction.user.username}'s Adventure`
            });

            // Initialize game in the user's thread
            const threadData = PersistentEmbedManager.getUserThread(interaction.user.id);
            if (threadData) {
                try {
                    const thread = await interaction.guild.channels.fetch(threadData.threadId);
                    await this.initializeGameInThread(thread, interaction.user);
                } catch (threadError) {
                    logger.warn('Could not initialize game in thread:', threadError.message);
                }
            }

        } catch (error) {
            logger.error('Error handling start game button:', error);
            
            // Fallback error handling
            try {
                if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ Error starting game. Please try the `/start-dh` command instead.',
                        ephemeral: true
                    });
                }
            } catch (fallbackError) {
                logger.error('Fallback error response failed:', fallbackError);
            }
        }
    }

    /**
     * Handle "View Profile" button click
     */
    static async handleViewProfile(interaction) {
        try {
            const responseData = {
                content: '👤 **Loading your profile...**\n\nRetrieving your game statistics, achievements, and account information.',
                embeds: [],
                components: []
            };

            await PersistentEmbedManager.handlePermanentEmbedInteraction(interaction, responseData, {
                forceThread: true,
                skipProfileCheck: false,
                threadTitle: `👤 ${interaction.user.username}'s Profile`
            });

            // Load profile data in the thread
            const threadData = PersistentEmbedManager.getUserThread(interaction.user.id);
            if (threadData) {
                try {
                    const thread = await interaction.guild.channels.fetch(threadData.threadId);
                    await this.showProfileInThread(thread, interaction.user);
                } catch (threadError) {
                    logger.warn('Could not show profile in thread:', threadError.message);
                }
            }

        } catch (error) {
            logger.error('Error handling view profile button:', error);
        }
    }

    /**
     * Handle "Tutorial" button click
     */
    static async handleTutorial(interaction) {
        try {
            const responseData = {
                content: '📚 **Loading game tutorial...**\n\nPreparing comprehensive game guides and help resources.',
                embeds: [],
                components: []
            };

            await PersistentEmbedManager.handlePermanentEmbedInteraction(interaction, responseData, {
                forceThread: false, // Tutorial can be public
                skipProfileCheck: true, // No profile needed for tutorial
                threadTitle: null
            });

        } catch (error) {
            logger.error('Error handling tutorial button:', error);
        }
    }

    /**
     * Handle "Daily Quests" button click
     */
    static async handleDailyQuests(interaction) {
        try {
            const responseData = {
                content: '📜 **Loading daily quests...**\n\nRetrieving available quests and your progress.',
                embeds: [],
                components: []
            };

            await PersistentEmbedManager.handlePermanentEmbedInteraction(interaction, responseData, {
                forceThread: true,
                skipProfileCheck: false,
                threadTitle: `📜 ${interaction.user.username}'s Quests`
            });

            // Load quests in the thread
            const threadData = PersistentEmbedManager.getUserThread(interaction.user.id);
            if (threadData) {
                try {
                    const thread = await interaction.guild.channels.fetch(threadData.threadId);
                    await this.showQuestsInThread(thread, interaction.user);
                } catch (threadError) {
                    logger.warn('Could not show quests in thread:', threadError.message);
                }
            }

        } catch (error) {
            logger.error('Error handling daily quests button:', error);
        }
    }

    /**
     * Handle Marketplace interactions
     */
    static async handleMarketplace(interaction, selectedValue) {
        try {
            let responseData;
            let threadTitle;

            switch (selectedValue) {
                case 'store':
                    responseData = {
                        content: '🛒 **Opening the Store...**\n\nLoading daily inventory and current prices.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `🛒 ${interaction.user.username}'s Store`;
                    break;

                case 'player_market':
                    responseData = {
                        content: '👥 **Opening Player Market...**\n\nLoading player listings and trading options.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `👥 ${interaction.user.username}'s Trading`;
                    break;

                case 'trading_post':
                    responseData = {
                        content: '🔄 **Opening Trading Post...**\n\nLoading auction system and bulk trading.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `🔄 ${interaction.user.username}'s Auctions`;
                    break;

                case 'player_chests':
                    responseData = {
                        content: '📦 **Opening Your Chests...**\n\nLoading Profile Chest and Adventure Chest inventories.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `📦 ${interaction.user.username}'s Chests`;
                    break;

                default:
                    responseData = {
                        content: '🏪 **Welcome to the Marketplace!**\n\nSelect an option from the menu above.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `🏪 ${interaction.user.username}'s Marketplace`;
            }

            await PersistentEmbedManager.handlePermanentEmbedInteraction(interaction, responseData, {
                forceThread: true,
                skipProfileCheck: false,
                threadTitle: threadTitle
            });

            // Load specific marketplace feature in the thread
            const threadData = PersistentEmbedManager.getUserThread(interaction.user.id);
            if (threadData) {
                try {
                    const thread = await interaction.guild.channels.fetch(threadData.threadId);
                    await this.showMarketplaceInThread(thread, interaction.user, selectedValue);
                } catch (threadError) {
                    logger.warn('Could not show marketplace in thread:', threadError.message);
                }
            }

        } catch (error) {
            logger.error('Error handling marketplace interaction:', error);
        }
    }

    /**
     * Handle Casino interactions
     */
    static async handleCasino(interaction, selectedValue) {
        try {
            let responseData;
            let threadTitle;

            switch (selectedValue) {
                case 'coin_flip':
                    responseData = {
                        content: '🪙 **Starting Coin Flip...**\n\nPreparing heads or tails gambling interface.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `🪙 ${interaction.user.username}'s Coin Flip`;
                    break;

                case 'casino_leaderboard':
                    responseData = {
                        content: '🏆 **Loading Casino Leaderboard...**\n\nShowing top gamblers and biggest wins.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `🏆 ${interaction.user.username}'s Leaderboard`;
                    break;

                default:
                    responseData = {
                        content: '🎰 **Welcome to the Casino!**\n\nSelect a game from the menu above.',
                        embeds: [],
                        components: []
                    };
                    threadTitle = `🎰 ${interaction.user.username}'s Casino`;
            }

            await PersistentEmbedManager.handlePermanentEmbedInteraction(interaction, responseData, {
                forceThread: true,
                skipProfileCheck: false,
                threadTitle: threadTitle
            });

            // Load specific casino feature in the thread
            const threadData = PersistentEmbedManager.getUserThread(interaction.user.id);
            if (threadData) {
                try {
                    const thread = await interaction.guild.channels.fetch(threadData.threadId);
                    await this.showCasinoInThread(thread, interaction.user, selectedValue);
                } catch (threadError) {
                    logger.warn('Could not show casino in thread:', threadError.message);
                }
            }

        } catch (error) {
            logger.error('Error handling casino interaction:', error);
        }
    }

    /**
     * Initialize game state in user's private thread
     */
    static async initializeGameInThread(thread, user) {
        try {
            const { GameState } = await import('../../models/GameState.js');
            const { getServiceRegistry } = await import('../../utils/serviceRegistry.js');
            const { StartMenuHandler } = await import('../core/StartMenuHandler.js');

            // Create or get game state
            const serviceRegistry = getServiceRegistry();
            const stateService = serviceRegistry.getStateService();
            let gameState = stateService.getUserState(user.id);

            if (!gameState) {
                gameState = new GameState(user.id);
                gameState.playerName = user.username;
                stateService.setUserState(user.id, gameState);
            }

            gameState.session.channelId = thread.id;
            gameState.updateActivity();

            // Create a message wrapper for the thread
            const threadMessage = {
                reply: async (options) => {
                    return await thread.send(options);
                },
                author: user,
                channel: thread
            };

            // Show start menu in the thread
            await StartMenuHandler.showStartMenu(threadMessage, gameState);

            logger.info(`Game initialized in thread ${thread.id} for user ${user.id}`);

        } catch (error) {
            logger.error('Error initializing game in thread:', error);
            await thread.send('❌ Error initializing game. Please use `/start-dh` command to start manually.');
        }
    }

    /**
     * Show profile information in user's thread
     */
    static async showProfileInThread(thread, user) {
        try {
            const { UserProfileHandler } = await import('../user/UserProfileHandler.js');
            
            // Get user profile
            const profile = await UserProfileHandler.getUserProfile(user.id);
            
            if (!profile) {
                await thread.send({
                    content: '❌ No profile found. Please create a profile first using the Game Hall.',
                    ephemeral: false
                });
                return;
            }

            // Build profile embed
            const embed = new EmbedBuilder()
                .setTitle(`👤 ${user.username}'s Profile`)
                .setDescription(`**Profile Information**\n\nAccount created: ${profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}\nLast login: ${profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Unknown'}`)
                .setColor(0x00ff00)
                .setTimestamp();

            await thread.send({
                embeds: [embed]
            });

        } catch (error) {
            logger.error('Error showing profile in thread:', error);
            await thread.send('❌ Error loading profile information.');
        }
    }

    /**
     * Show quests in user's thread
     */
    static async showQuestsInThread(thread, user) {
        try {
            const { QuestHandler } = await import('../core/QuestHandler.js');
            
            // Create a thread wrapper for quest handler
            const threadWrapper = {
                reply: async (options) => await thread.send(options),
                update: async (options) => await thread.send(options),
                user: user,
                channel: thread
            };

            // Show quest menu
            await QuestHandler.showQuestMenu(threadWrapper, user.id);

        } catch (error) {
            logger.error('Error showing quests in thread:', error);
            await thread.send('❌ Error loading quest information.');
        }
    }

    /**
     * Show marketplace features in user's thread
     */
    static async showMarketplaceInThread(thread, user, feature) {
        try {
            const { MarketplaceHandler } = await import('../marketplace/MarketplaceHandler.js');
            
            // Create a thread wrapper for marketplace handler
            const threadWrapper = {
                reply: async (options) => await thread.send(options),
                update: async (options) => await thread.send(options),
                user: user,
                channel: thread
            };

            // Show specific marketplace feature
            switch (feature) {
                case 'store':
                    await MarketplaceHandler.showStore(threadWrapper);
                    break;
                case 'player_chests':
                    await MarketplaceHandler.showPlayerChests(threadWrapper);
                    break;
                default:
                    await thread.send('🏪 **Marketplace Feature Coming Soon!**\n\nThis feature is under development.');
            }

        } catch (error) {
            logger.error('Error showing marketplace in thread:', error);
            await thread.send('❌ Error loading marketplace feature.');
        }
    }

    /**
     * Show casino features in user's thread
     */
    static async showCasinoInThread(thread, user, feature) {
        try {
            // Load appropriate casino handler based on feature
            switch (feature) {
                case 'coin_flip':
                    const { MarketplaceHandler } = await import('../marketplace/MarketplaceHandler.js');
                    
                    const threadWrapper = {
                        reply: async (options) => await thread.send(options),
                        update: async (options) => await thread.send(options),
                        user: user,
                        channel: thread
                    };

                    await MarketplaceHandler.showCoinflipDivisionSelection(threadWrapper);
                    break;
                    
                default:
                    await thread.send('🎰 **Casino Feature Coming Soon!**\n\nThis feature is under development.');
            }

        } catch (error) {
            logger.error('Error showing casino in thread:', error);
            await thread.send('❌ Error loading casino feature.');
        }
    }

    /**
     * Get user's active thread information
     */
    static getUserThreadData(userId) {
        return this.activeThreads.get(userId);
    }

    /**
     * Remove user thread tracking (for manual cleanup)
     */
    static removeUserThread(userId) {
        const threadData = this.activeThreads.get(userId);
        this.activeThreads.delete(userId);
        
        if (threadData) {
            logger.info(`[THREAD_MANAGER] Removed thread tracking for user ${userId}`);
        }
        
        return threadData;
    }

    /**
     * Get active thread statistics
     */
    static getThreadStats() {
        const stats = {
            totalActive: this.activeThreads.size,
            threads: Array.from(this.activeThreads.entries()).map(([userId, data]) => ({
                userId,
                username: data.username,
                threadId: data.threadId,
                createdAt: new Date(data.createdAt).toISOString(),
                age: Math.round((Date.now() - data.createdAt) / 1000 / 60) // minutes
            }))
        };
        
        return stats;
    }

    /**
     * Force cleanup of all tracked threads (admin function)
     */
    static async forceCleanupAllThreads() {
        try {
            const stats = this.getThreadStats();
            this.activeThreads.clear();
            
            logger.info(`[THREAD_MANAGER] Force cleanup completed. Cleared ${stats.totalActive} thread entries.`);
            
            return stats;
        } catch (error) {
            logger.error('[THREAD_MANAGER] Error during force cleanup:', error);
            throw error;
        }
    }
} 