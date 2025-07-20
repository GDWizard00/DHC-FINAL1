import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

/**
 * AdminHandler - Enhanced admin tools system with unified authentication
 * Phase 1 Migration: All authentication now handled by AuthenticationManager
 * NO MORE DUAL SYSTEMS - Unified architecture only
 */
export class AdminHandler {
    // Phase 1 Migration: All authentication moved to unified AuthenticationManager
    // No more static Maps - unified system handles all authentication

    /**
     * Initialize admin system with unified AuthenticationManager only
     */
    static async initialize() {
        try {
            // Initialize unified authentication only - no more dual systems
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            await AuthenticationManager.initialize();
            
            logger.info('Admin system initialized with unified authentication only - old dual system removed');
        } catch (error) {
            logger.error('Error initializing admin system:', error);
        }
    }

    /**
     * Enhanced authentication check using unified system ONLY
     */
    static async isAuthenticated(userId) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            return AuthenticationManager.hasMinimumLevel(userId, AuthenticationManager.PERMISSION_LEVELS.ADMIN);
        } catch (error) {
            logger.error('Error checking authentication:', error);
            return false;
        }
    }

    /**
     * Create admin profile using unified system ONLY
     */
    static async createAdminProfile(userId, profileData) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            
            // Create profile in unified system
            const profile = await AuthenticationManager.createProfile(userId, {
                profileType: 'admin',
                username: profileData.username,
                password: profileData.password,
                serverId: profileData.serverId,
                permissions: AuthenticationManager.PERMISSION_LEVELS.ADMIN,
                createdAt: new Date(),
                isActive: true
            });

            auditLogger.log('admin_profile_created', {
                userId: userId,
                username: profileData.username,
                action: 'profile_created',
                timestamp: new Date().toISOString()
            });

            logger.info(`Admin profile created for ${profileData.username} (${userId})`);
            return { success: true, profile };

        } catch (error) {
            logger.error('Error creating admin profile:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Authenticate admin using unified system ONLY
     */
    static async authenticateAdmin(userId, password) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            
            // Use unified authentication (returns boolean)
            const isAuthenticated = await AuthenticationManager.authenticateUser(userId, password);
            
            if (isAuthenticated) {
                auditLogger.log('admin_auth_success', {
                    userId: userId,
                    action: 'authentication_successful',
                    timestamp: new Date().toISOString()
                });
                return { success: true };
            } else {
                auditLogger.log('admin_auth_failure', {
                    userId: userId,
                    action: 'authentication_failed',
                    timestamp: new Date().toISOString()
                });
                return { success: false };
            }

        } catch (error) {
            logger.error('Error authenticating admin:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle admin slash commands and route to appropriate handlers
     */
    static async handleAdminCommand(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'status':
                    await this.handleStatusCommand(interaction);
                    break;
                
                case 'audit-query':
                    await this.handleAuditQueryCommand(interaction);
                    break;
                
                case 'change-password':
                    await this.handleChangePasswordCommand(interaction);
                    break;
                
                case 'grant-promotional-weapon':
                    await this.handleGrantPromotionalWeapon(interaction, interaction.options);
                    break;
                
                default:
                    await interaction.reply({
                        content: `❌ Unknown admin subcommand: ${subcommand}`,
                        ephemeral: true
                    });
            }
            
        } catch (error) {
            logger.error('Error handling admin command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error processing admin command.',
                    ephemeral: true
                });
            }
        }
    }

    // Phase 3 Cleanup: Removed duplicate showAdminAuth method
    // Admin authentication now handled through DashboardEmbedHandler.showAdminAuth

    // Phase 3 Cleanup: Removed duplicate handleAuthButton method
    // Authentication now handled through DashboardEmbedHandler unified system

    /**
     * Handle password submission - Phase 1 Migration: Using unified authentication
     */
    static async handlePasswordSubmission(interaction) {
        try {
            const password = interaction.fields.getTextInputValue('admin_password');
            const userId = interaction.user.id;

            // Use unified authentication system
            const authResult = await this.authenticateAdmin(userId, password);

            if (authResult.success) {
                const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');
                await DashboardEmbedHandler.showAdminDashboard(interaction);
            } else {
                await interaction.reply({
                    content: '❌ **Authentication Failed**\n\nIncorrect password. Contact `gdwizard` to reset your password.',
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error handling password submission:', error);
            await interaction.reply({
                content: '❌ Error processing authentication.',
                ephemeral: true
            });
        }
    }

    // Phase 3 Cleanup: Removed duplicate showAdminDashboard method
    // Dashboard display now handled through DashboardEmbedHandler.showAdminDashboard
    static async REMOVED_showAdminDashboard_OLD(interaction) {
        try {
            if (!await this.isAuthenticated(interaction.user.id)) {
                await this.showAdminAuth(interaction);
                return;
            }

            // Get session info from unified authentication system
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            const sessionInfo = AuthenticationManager.getSessionInfo(interaction.user.id);
            const timeRemaining = sessionInfo ? Math.ceil(sessionInfo.timeRemaining / (1000 * 60)) : 0;

            const embed = new EmbedBuilder()
                .setTitle('🛠️ **ADMIN DASHBOARD** 🛠️')
                .setDescription(
                    `**Welcome, ${interaction.user.username}**\n\n` +
                    `🔐 **Session Active**: ${timeRemaining} minutes remaining\n` +
                    `📊 **System Status**: Online\n` +
                    `📝 **Audit Logging**: Enabled\n\n` +
                    '**Available Admin Tools:**\n' +
                    '🎒 **Item Management** - Add/remove game items\n' +
                    '📋 **Quest System** - Create and manage special quests\n' +
                    '💰 **Economy Tools** - Send currency to players\n' +
                    '🏆 **Division Management** - Open/close divisions\n' +
                    '🎪 **Event Management** - Paid entry events with prizes\n' +
                    '📢 **Announcements** - Server-wide announcements\n' +
                    '🎲 **Raffles & Auctions** - Manage community events\n' +
                    '⚔️ **Mash Bash Battle** - Battle system management\n' +
                    '🌐 **Web3 Tools** - Wallet integration and monitoring\n' +
                    '🔧 **System Settings** - Core system configuration\n\n' +
                    '*Select a tool to begin:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Admin Dashboard • All actions are logged' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎒 Item Management (Basic Features)')
                    .setDescription('Basic weapon creation - Most features coming soon')
                    .setValue('admin_items'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📋 Quest System (Coming Soon)')
                    .setDescription('Server quest creation - Under development')
                    .setValue('admin_quests'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economy Tools (Limited Features)')
                    .setDescription('Send currency - Other features coming soon')
                    .setValue('admin_economy'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Division Management (Coming Soon)')
                    .setDescription('Division controls - Under development')
                    .setValue('admin_divisions'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎪 Event Management (Coming Soon)')
                    .setDescription('Event creation - Under development')
                    .setValue('admin_events'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📢 Announcements (Coming Soon)')
                    .setDescription('Server announcements - Under development')
                    .setValue('admin_announcements'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎲 Raffles & Auctions (Coming Soon)')
                    .setDescription('Community events - Under development')
                    .setValue('admin_raffles'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚔️ Mash Bash Battle (Coming Soon)')
                    .setDescription('Battle system - Under development')
                    .setValue('admin_mash_bash'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🌐 Web3 Tools (Coming Soon)')
                    .setDescription('Wallet integration - Under development')
                    .setValue('admin_web3'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 System Settings (Coming Soon)')
                    .setDescription('Core configuration - Under development')
                    .setValue('admin_settings')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_dashboard')
                .setPlaceholder('Select admin tool...')
                .addOptions(options);

            const logoutButton = new ButtonBuilder()
                .setCustomId('admin_logout')
                .setLabel('🚪 Logout')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(logoutButton);

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2],
                ephemeral: true
            });

            auditLogger.log('admin_dashboard_access', {
                userId: interaction.user.id,
                username: interaction.user.username,
                action: 'dashboard_accessed'
            });

        } catch (error) {
            logger.error('Error showing admin dashboard:', error);
            await interaction.reply({
                content: '❌ Error loading admin dashboard.',
                ephemeral: true
            });
        }
    }

    // Phase 3 Cleanup: Removed duplicate handleDashboardSelection method
    // Dashboard interactions now handled through DashboardEmbedHandler.handleAdminDashboard
    static async REMOVED_handleDashboardSelection_OLD(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showAdminAuth(interaction);
                return;
            }

            auditLogger.log('admin_tool_access', {
                userId: interaction.user.id,
                username: interaction.user.username,
                action: 'tool_accessed',
                tool: selectedValue
            });

            switch (selectedValue) {
                case 'admin_items':
                    await this.showItemManagement(interaction);
                    break;
                case 'admin_quests':
                    await this.showQuestManagement(interaction);
                    break;
                case 'admin_economy':
                    await this.showEconomyTools(interaction);
                    break;
                case 'admin_divisions':
                    await this.showDivisionManagement(interaction);
                    break;
                case 'admin_events':
                    await this.showEventManagement(interaction);
                    break;
                case 'admin_announcements':
                    await this.showAnnouncementSystem(interaction);
                    break;
                case 'admin_raffles':
                    await this.showRaffleSystem(interaction);
                    break;
                case 'admin_mash_bash':
                    await this.showMashBashSystem(interaction);
                    break;
                case 'admin_web3':
                    await this.showWeb3Tools(interaction);
                    break;
                case 'admin_settings':
                    await this.showSystemSettings(interaction);
                    break;
                default:
                    await this.showAdminDashboard(interaction);
            }

        } catch (error) {
            logger.error('Error handling dashboard selection:', error);
            await interaction.reply({
                content: '❌ Error accessing admin tool.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle logout - Phase 1 Migration: Using unified authentication
     */
    static async handleLogout(interaction) {
        try {
            const userId = interaction.user.id;
            
            // Use unified authentication system for logout
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            await AuthenticationManager.logout(userId);

            auditLogger.log('admin_logout', {
                userId: userId,
                username: interaction.user.username,
                action: 'session_ended'
            });

            await interaction.reply({
                content: '🚪 **Logged Out Successfully**\n\nYour admin session has been ended.',
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error handling logout:', error);
            await interaction.reply({
                content: '❌ Error logging out.',
                ephemeral: true
            });
        }
    }

    // Phase 1 Migration: Old authentication methods completely removed
    // verifyPassword() and loadAdminPasswords() replaced by unified AuthenticationManager
    // All password verification now handled through AuthenticationManager.authenticateUser()

    /**
     * Show item management interface
     */
    static async showItemManagement(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎒 **ADMIN ITEM MANAGEMENT** 🎒')
                .setDescription('Comprehensive item management system for administrators')
                .setColor(0xFF6B6B)
                .addFields(
                    {
                        name: '🔨 **Create Custom Items**',
                        value: 'Design and create new items with custom properties',
                        inline: true
                    },
                    {
                        name: '📦 **Manage Player Inventories**',
                        value: 'Add or remove items from player inventories',
                        inline: true
                    },
                    {
                        name: '📋 **View Existing Items**',
                        value: 'Browse all available items and custom creations',
                        inline: true
                    },
                    {
                        name: '🗑️ **Remove Custom Items**',
                        value: 'Delete custom items from the system',
                        inline: true
                    },
                    {
                        name: '📊 **Item Statistics**',
                        value: 'View item usage and distribution statistics',
                        inline: true
                    },
                    {
                        name: '💾 **Backup/Restore**',
                        value: 'Backup and restore item configurations',
                        inline: true
                    }
                )
                .setFooter({ text: 'Admin Item Management - Password Protected' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔨 Create Custom Item')
                    .setDescription('Design a new item with custom properties')
                    .setValue('create_item'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📦 Manage Player Inventory')
                    .setDescription('Add/remove items from player inventories')
                    .setValue('manage_inventory'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📋 View All Items')
                    .setDescription('Browse existing items and custom creations')
                    .setValue('view_items'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🗑️ Remove Custom Items')
                    .setDescription('Delete custom items from the system')
                    .setValue('remove_items'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Item Statistics')
                    .setDescription('View item usage and distribution data')
                    .setValue('item_stats'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💾 Backup Items')
                    .setDescription('Backup and restore item configurations')
                    .setValue('backup_items'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Dashboard')
                    .setDescription('Return to admin dashboard')
                    .setValue('back_to_dashboard')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_item_management')
                .setPlaceholder('Choose item management action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            auditLogger.log('ADMIN_ACCESS', `Item management interface accessed by ${interaction.user.id}`, 'item_management');

        } catch (error) {
            logger.error('Error showing item management interface:', error);
            await interaction.update({
                content: '❌ Error loading item management interface. Please try again.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Handle item management selections
     */
    static async handleItemManagementSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'create_item':
                    await this.showItemCreator(interaction);
                    break;
                case 'manage_inventory':
                    await this.showInventoryManager(interaction);
                    break;
                case 'view_items':
                    await this.showItemViewer(interaction);
                    break;
                case 'remove_items':
                    await this.showItemRemover(interaction);
                    break;
                case 'item_stats':
                    await this.showItemStatistics(interaction);
                    break;
                case 'backup_items':
                    await this.showItemBackup(interaction);
                    break;
                case 'back_to_dashboard':
                    await this.showAdminDashboard(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown item management action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling item management selection:', error);
            await interaction.update({
                content: '❌ Error processing item management action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Show Player Management interface - Phase 2.2
     */
    static async showPlayerManagement(interaction) {
        try {
            if (!await this.isAuthenticated(interaction.user.id)) {
                const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');
                await DashboardEmbedHandler.showAdminAuth(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('👥 **PLAYER MANAGEMENT** 👥')
                .setDescription(
                    '**Admin Player Management Tools**\n\n' +
                    `🎯 **Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `⚔️ **Authority**: Server Administrator\n\n` +
                    '**Player Management Operations:**\n' +
                    '👤 **Profile Management** - View and modify player profiles\n' +
                    '💰 **Balance Management** - Adjust player currency balances\n' +
                    '🎒 **Inventory Management** - Manage player inventories\n' +
                    '🏆 **Progress Management** - Modify player game progress\n' +
                    '🔧 **Account Recovery** - Recover lost or corrupted accounts\n' +
                    '📊 **Player Statistics** - View detailed player analytics\n\n' +
                    '**🔒 Server Scope**: Limited to this server only\n\n' +
                    '*Select player management operation:*'
                )
                .setColor(0x4CAF50)
                .setFooter({ text: 'Player Management • Server Administration' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('👤 Profile Management')
                    .setDescription('View and modify player profiles')
                    .setValue('admin_player_profiles'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Balance Management')
                    .setDescription('Adjust player currency balances')
                    .setValue('admin_player_balances'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎒 Inventory Management')
                    .setDescription('Manage player inventories')
                    .setValue('admin_player_inventories'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Progress Management')
                    .setDescription('Modify player game progress')
                    .setValue('admin_player_progress'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 Account Recovery')
                    .setDescription('Recover lost or corrupted accounts')
                    .setValue('admin_account_recovery'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Player Statistics')
                    .setDescription('View detailed player analytics')
                    .setValue('admin_player_stats'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Dashboard')
                    .setDescription('Return to admin dashboard')
                    .setValue('back_to_admin_dashboard')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_player_management')
                .setPlaceholder('Choose player management operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing player management:', error);
            await interaction.reply({
                content: '❌ Error loading player management tools.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Server Analytics interface - Phase 2.2
     */
    static async showServerAnalytics(interaction) {
        try {
            if (!await this.isAuthenticated(interaction.user.id)) {
                const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');
                await DashboardEmbedHandler.showAdminAuth(interaction);
                return;
            }

            const serverMemberCount = interaction.guild?.memberCount || 0;
            const serverCreated = interaction.guild?.createdAt ? interaction.guild.createdAt.toDateString() : 'Unknown';

            const embed = new EmbedBuilder()
                .setTitle('📊 **SERVER ANALYTICS** 📊')
                .setDescription(
                    '**Server Performance Monitoring**\n\n' +
                    `🎯 **Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `👥 **Members**: ${serverMemberCount}\n` +
                    `📅 **Created**: ${serverCreated}\n\n` +
                    '**Analytics Categories:**\n' +
                    '🎮 **Game Activity** - Player engagement and game statistics\n' +
                    '💰 **Economy Analytics** - Currency flow and economic health\n' +
                    '👥 **User Engagement** - User activity and retention metrics\n' +
                    '⚡ **Performance Metrics** - Bot response times and errors\n' +
                    '📈 **Growth Analytics** - Server growth and trends\n' +
                    '🔒 **Security Events** - Authentication and security logs\n\n' +
                    '**📊 Real-time Data**: Updated hourly\n\n' +
                    '*Select analytics category:*'
                )
                .setColor(0x2196F3)
                .setFooter({ text: 'Server Analytics • Real-time Monitoring' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Game Activity')
                    .setDescription('Player engagement and game statistics')
                    .setValue('admin_game_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economy Analytics')
                    .setDescription('Currency flow and economic health')
                    .setValue('admin_economy_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👥 User Engagement')
                    .setDescription('User activity and retention metrics')
                    .setValue('admin_user_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚡ Performance Metrics')
                    .setDescription('Bot response times and errors')
                    .setValue('admin_performance_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📈 Growth Analytics')
                    .setDescription('Server growth and trends')
                    .setValue('admin_growth_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔒 Security Events')
                    .setDescription('Authentication and security logs')
                    .setValue('admin_security_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Dashboard')
                    .setDescription('Return to admin dashboard')
                    .setValue('back_to_admin_dashboard')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_server_analytics')
                .setPlaceholder('Choose analytics category...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing server analytics:', error);
            await interaction.reply({
                content: '❌ Error loading server analytics.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Server Settings interface - Phase 2.2
     */
    static async showServerSettings(interaction) {
        try {
            if (!await this.isAuthenticated(interaction.user.id)) {
                const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');
                await DashboardEmbedHandler.showAdminAuth(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🔧 **SERVER SETTINGS** 🔧')
                .setDescription(
                    '**Bot Configuration for This Server**\n\n' +
                    `🎯 **Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `⚔️ **Authority**: Server Administrator\n\n` +
                    '**Configuration Categories:**\n' +
                    '🎮 **Game Settings** - Configure gameplay parameters\n' +
                    '💰 **Economy Settings** - Adjust currency and reward rates\n' +
                    '📢 **Channel Settings** - Manage bot channels and permissions\n' +
                    '🔔 **Notification Settings** - Configure alerts and announcements\n' +
                    '🛡️ **Security Settings** - Manage access controls and permissions\n' +
                    '🔄 **Backup Settings** - Configure data backup and recovery\n\n' +
                    '**🔒 Server Scope**: Settings apply to this server only\n\n' +
                    '*Select configuration category:*'
                )
                .setColor(0xFF9800)
                .setFooter({ text: 'Server Settings • Configuration Management' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Game Settings')
                    .setDescription('Configure gameplay parameters')
                    .setValue('admin_game_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economy Settings')
                    .setDescription('Adjust currency and reward rates')
                    .setValue('admin_economy_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📢 Channel Settings')
                    .setDescription('Manage bot channels and permissions')
                    .setValue('admin_channel_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔔 Notification Settings')
                    .setDescription('Configure alerts and announcements')
                    .setValue('admin_notification_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Security Settings')
                    .setDescription('Manage access controls and permissions')
                    .setValue('admin_security_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Backup Settings')
                    .setDescription('Configure data backup and recovery')
                    .setValue('admin_backup_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Dashboard')
                    .setDescription('Return to admin dashboard')
                    .setValue('back_to_admin_dashboard')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_server_settings')
                .setPlaceholder('Choose configuration category...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing server settings:', error);
            await interaction.reply({
                content: '❌ Error loading server settings.',
                ephemeral: true
            });
        }
    }

    /**
     * Enhanced Quest Management for server admins - Phase 2.2
     */
    static async showQuestManagement(interaction) {
        try {
            if (!await this.isAuthenticated(interaction.user.id)) {
                const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');
                await DashboardEmbedHandler.showAdminAuth(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 **QUEST MANAGEMENT** 📋')
                .setDescription(
                    '**Server Quest Administration**\n\n' +
                    `🎯 **Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `⚔️ **Authority**: Server Administrator\n\n` +
                    '**Quest Management Tools:**\n' +
                    '✨ **Create Quests** - Design custom server quests\n' +
                    '📝 **Edit Quests** - Modify existing quest parameters\n' +
                    '🎁 **Reward Management** - Configure quest rewards\n' +
                    '📊 **Quest Analytics** - View quest completion statistics\n' +
                    '🔄 **Quest Status** - Enable/disable quests\n' +
                    '🗑️ **Remove Quests** - Delete outdated quests\n\n' +
                    '**🔒 Server Scope**: Quests limited to this server only\n\n' +
                    '*Select quest management operation:*'
                )
                .setColor(0x9C27B0)
                .setFooter({ text: 'Quest Management • Server Administration' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('✨ Create Quest')
                    .setDescription('Design custom server quests')
                    .setValue('admin_create_quest'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📝 Edit Quests')
                    .setDescription('Modify existing quest parameters')
                    .setValue('admin_edit_quests'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎁 Reward Management')
                    .setDescription('Configure quest rewards')
                    .setValue('admin_quest_rewards'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Quest Analytics')
                    .setDescription('View quest completion statistics')
                    .setValue('admin_quest_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Quest Status')
                    .setDescription('Enable/disable quests')
                    .setValue('admin_quest_status'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🗑️ Remove Quests')
                    .setDescription('Delete outdated quests')
                    .setValue('admin_remove_quests'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Dashboard')
                    .setDescription('Return to admin dashboard')
                    .setValue('back_to_admin_dashboard')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_quest_management')
                .setPlaceholder('Choose quest management operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing quest management:', error);
            await interaction.reply({
                content: '❌ Error loading quest management tools.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle item creator selections
     */
    static async handleItemCreatorSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'create_weapon':
                    await this.showWeaponCreationModal(interaction);
                    break;
                case 'create_armor':
                    await this.showArmorCreationModal(interaction);
                    break;
                case 'create_consumable':
                    await this.showConsumableCreationModal(interaction);
                    break;
                case 'create_special':
                    await this.showSpecialCreationModal(interaction);
                    break;
                case 'back_to_item_management':
                    await this.showItemManagement(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown item creator action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling item creator selection:', error);
            await interaction.update({
                content: '❌ Error processing item creator action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Handle inventory manager selections
     */
    static async handleInventoryManagerSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'add_items':
                    await this.showPlayerSearchForAdd(interaction);
                    break;
                case 'remove_items':
                    await this.showPlayerSearchForRemove(interaction);
                    break;
                case 'view_inventory':
                    await this.showPlayerSearchForView(interaction);
                    break;
                case 'bulk_operations':
                    await this.showBulkOperations(interaction);
                    break;
                case 'player_search':
                    await this.showPlayerSearchModal(interaction);
                    break;
                case 'back_to_item_management':
                    await this.showItemManagement(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown inventory manager action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling inventory manager selection:', error);
            await interaction.update({
                content: '❌ Error processing inventory manager action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Handle item viewer selections
     */
    static async handleItemViewerSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'view_weapons':
                    await this.showWeaponsList(interaction);
                    break;
                case 'view_armor':
                    await this.showArmorList(interaction);
                    break;
                case 'view_consumables':
                    await this.showConsumablesList(interaction);
                    break;
                case 'view_special':
                    await this.showSpecialItemsList(interaction);
                    break;
                case 'view_custom':
                    await this.showCustomItemsList(interaction);
                    break;
                case 'back_to_item_management':
                    await this.showItemManagement(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown item viewer action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling item viewer selection:', error);
            await interaction.update({
                content: '❌ Error processing item viewer action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Handle item remover selections
     */
    static async handleItemRemoverSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'remove_specific':
                    await this.showSpecificItemRemover(interaction);
                    break;
                case 'remove_category':
                    await this.showCategoryRemover(interaction);
                    break;
                case 'remove_rarity':
                    await this.showRarityRemover(interaction);
                    break;
                case 'remove_all_custom':
                    await this.showAllCustomRemover(interaction);
                    break;
                case 'back_to_item_management':
                    await this.showItemManagement(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown item remover action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling item remover selection:', error);
            await interaction.update({
                content: '❌ Error processing item remover action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Handle item statistics selections
     */
    static async handleItemStatisticsSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'detailed_analytics':
                    await this.showDetailedAnalytics(interaction);
                    break;
                case 'item_performance':
                    await this.showItemPerformance(interaction);
                    break;
                case 'player_behavior':
                    await this.showPlayerBehavior(interaction);
                    break;
                case 'export_stats':
                    await this.exportStatistics(interaction);
                    break;
                case 'back_to_item_management':
                    await this.showItemManagement(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown statistics action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling item statistics selection:', error);
            await interaction.update({
                content: '❌ Error processing statistics action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Handle item backup selections
     */
    static async handleItemBackupSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'create_backup':
                    await this.createBackup(interaction);
                    break;
                case 'restore_backup':
                    await this.showBackupRestorer(interaction);
                    break;
                case 'view_backups':
                    await this.showBackupsList(interaction);
                    break;
                case 'backup_settings':
                    await this.showBackupSettings(interaction);
                    break;
                case 'back_to_item_management':
                    await this.showItemManagement(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown backup action.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling item backup selection:', error);
            await interaction.update({
                content: '❌ Error processing backup action.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Show weapon creation modal
     */
    static async showWeaponCreationModal(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('admin_weapon_creation_modal')
                .setTitle('Create Custom Weapon');

            const nameInput = new TextInputBuilder()
                .setCustomId('weapon_name')
                .setLabel('Weapon Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter weapon name...')
                .setRequired(true)
                .setMaxLength(50);

            const subtypeInput = new TextInputBuilder()
                .setCustomId('weapon_subtype')
                .setLabel('Weapon Type')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('sword, hammer, staff, or bow')
                .setRequired(true)
                .setMaxLength(20);

            const damageInput = new TextInputBuilder()
                .setCustomId('weapon_damage')
                .setLabel('Damage Value')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter damage (e.g., 10)')
                .setRequired(true)
                .setMaxLength(10);

            const rarityInput = new TextInputBuilder()
                .setCustomId('weapon_rarity')
                .setLabel('Rarity')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('common, uncommon, rare, epic, legendary, mythical')
                .setRequired(true)
                .setMaxLength(20);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('weapon_description')
                .setLabel('Description (Optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter weapon description...')
                .setRequired(false)
                .setMaxLength(200);

            const firstRow = new ActionRowBuilder().addComponents(nameInput);
            const secondRow = new ActionRowBuilder().addComponents(subtypeInput);
            const thirdRow = new ActionRowBuilder().addComponents(damageInput);
            const fourthRow = new ActionRowBuilder().addComponents(rarityInput);
            const fifthRow = new ActionRowBuilder().addComponents(descriptionInput);

            modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing weapon creation modal:', error);
            await interaction.update({
                content: '❌ Error loading weapon creation form.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }

    /**
     * Handle weapon creation modal submission
     */
    static async handleWeaponCreationModal(interaction) {
        try {
            const name = interaction.fields.getTextInputValue('weapon_name');
            const subtype = interaction.fields.getTextInputValue('weapon_subtype').toLowerCase();
            const damage = parseInt(interaction.fields.getTextInputValue('weapon_damage'));
            const rarity = interaction.fields.getTextInputValue('weapon_rarity').toLowerCase();
            const description = interaction.fields.getTextInputValue('weapon_description') || '';

            // Validate inputs
            if (!['sword', 'hammer', 'staff', 'bow'].includes(subtype)) {
                await interaction.reply({
                    content: '❌ Invalid weapon type. Must be: sword, hammer, staff, or bow',
                    ephemeral: true
                });
                return;
            }

            if (isNaN(damage) || damage < 0) {
                await interaction.reply({
                    content: '❌ Invalid damage value. Must be a positive number.',
                    ephemeral: true
                });
                return;
            }

            if (!['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].includes(rarity)) {
                await interaction.reply({
                    content: '❌ Invalid rarity. Must be: common, uncommon, rare, epic, legendary, or mythical',
                    ephemeral: true
                });
                return;
            }

            const { ItemDataManager } = await import('../../utils/ItemDataManager.js');
            
            const itemData = {
                name,
                description,
                type: 'weapon',
                subtype,
                damage,
                rarity,
                hasEffects: false,
                effects: [],
                customMintAmount: 'infinite'
            };

            const createdItem = await ItemDataManager.createCustomItem(itemData, interaction.user.id);

            await interaction.reply({
                content: `✅ **Weapon Created Successfully!**\n\n` +
                        `**${createdItem.name}** (${createdItem.rarity})\n` +
                        `Type: ${createdItem.subtype}\n` +
                        `Damage: ${createdItem.damage}\n` +
                        `ID: ${createdItem.id}\n\n` +
                        `The weapon has been added to the game and is ready for use!`,
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error handling weapon creation modal:', error);
            await interaction.reply({
                content: '❌ Error creating weapon. Please check your inputs and try again.',
                ephemeral: true
            });
        }
    }

    // Placeholder methods for other item creation modals
    static async showArmorCreationModal(interaction) {
        await interaction.update({
            content: '🛡️ **Armor Creation Modal** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async handleArmorCreationModal(interaction) {
        await interaction.reply({
            content: '🛡️ **Armor Creation** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async showConsumableCreationModal(interaction) {
        await interaction.update({
            content: '🧪 **Consumable Creation Modal** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async handleConsumableCreationModal(interaction) {
        await interaction.reply({
            content: '🧪 **Consumable Creation** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async showSpecialCreationModal(interaction) {
        await interaction.update({
            content: '🎁 **Special Item Creation Modal** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async handleSpecialCreationModal(interaction) {
        await interaction.reply({
            content: '🎁 **Special Item Creation** - Implementation in progress...',
            ephemeral: true
        });
    }

    // Placeholder methods for inventory management
    static async showPlayerSearchForAdd(interaction) {
        await interaction.update({
            content: '➕ **Player Search for Add Items** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showPlayerSearchForRemove(interaction) {
        await interaction.update({
            content: '➖ **Player Search for Remove Items** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showPlayerSearchForView(interaction) {
        await interaction.update({
            content: '🔍 **Player Search for View Inventory** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showBulkOperations(interaction) {
        await interaction.update({
            content: '📋 **Bulk Operations** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showPlayerSearchModal(interaction) {
        await interaction.update({
            content: '👥 **Player Search Modal** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async handlePlayerSearchModal(interaction) {
        await interaction.reply({
            content: '👥 **Player Search** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async handleItemAddModal(interaction) {
        await interaction.reply({
            content: '➕ **Item Add** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async handleItemRemoveModal(interaction) {
        await interaction.reply({
            content: '➖ **Item Remove** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async handleBulkOperationModal(interaction) {
        await interaction.reply({
            content: '📋 **Bulk Operation** - Implementation in progress...',
            ephemeral: true
        });
    }

    // Placeholder methods for item viewing
    static async showWeaponsList(interaction) {
        await interaction.update({
            content: '⚔️ **Weapons List** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showArmorList(interaction) {
        await interaction.update({
            content: '🛡️ **Armor List** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showConsumablesList(interaction) {
        await interaction.update({
            content: '🧪 **Consumables List** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showSpecialItemsList(interaction) {
        await interaction.update({
            content: '🎁 **Special Items List** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showCustomItemsList(interaction) {
        await interaction.update({
            content: '🔨 **Custom Items List** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    // Placeholder methods for item removal
    static async showSpecificItemRemover(interaction) {
        await interaction.update({
            content: '🎯 **Specific Item Remover** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showCategoryRemover(interaction) {
        await interaction.update({
            content: '🏷️ **Category Remover** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showRarityRemover(interaction) {
        await interaction.update({
            content: '⭐ **Rarity Remover** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showAllCustomRemover(interaction) {
        await interaction.update({
            content: '🧹 **All Custom Remover** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    // Placeholder methods for statistics
    static async showDetailedAnalytics(interaction) {
        await interaction.update({
            content: '📈 **Detailed Analytics** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showItemPerformance(interaction) {
        await interaction.update({
            content: '🎯 **Item Performance** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showPlayerBehavior(interaction) {
        await interaction.update({
            content: '👥 **Player Behavior** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async exportStatistics(interaction) {
        await interaction.update({
            content: '📊 **Export Statistics** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    // Placeholder methods for backup
    static async createBackup(interaction) {
        await interaction.update({
            content: '💾 **Create Backup** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showBackupRestorer(interaction) {
        await interaction.update({
            content: '📥 **Backup Restorer** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showBackupsList(interaction) {
        await interaction.update({
            content: '📋 **Backups List** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    static async showBackupSettings(interaction) {
        await interaction.update({
            content: '⚙️ **Backup Settings** - Implementation in progress...',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    /**
     * Show password modal for admin authentication
     */
    static async showPasswordModal(interaction, authType = 'admin') {
        try {
            const modal = new ModalBuilder()
                .setCustomId('admin_password_modal')
                .setTitle('🔐 Admin Authentication');

            const passwordInput = new TextInputBuilder()
                .setCustomId('admin_password')
                .setLabel('Admin Password')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your admin password...')
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(passwordInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing admin password modal:', error);
            await interaction.reply({
                content: '❌ Error displaying authentication modal.',
                ephemeral: true
            });
        }
    }

    /**
     * Show quest management interface
     */
    static async showQuestManagement(interaction) {
        try {
                await interaction.reply({
                content: '📋 **Quest Management** - Coming Soon!\n\nThis will provide quest creation and management tools.',
                    ephemeral: true
                });
        } catch (error) {
            logger.error('Error showing quest management:', error);
                await interaction.reply({
                content: '❌ Error loading quest management.',
                    ephemeral: true
                });
        }
    }

    /**
     * Show player management interface
     */
    static async showPlayerManagement(interaction) {
        try {
                await interaction.reply({
                content: '👥 **Player Management** - Coming Soon!\n\nThis will provide player profile and account management tools.',
                    ephemeral: true
                });
        } catch (error) {
            logger.error('Error showing player management:', error);
            await interaction.reply({
                content: '❌ Error loading player management.',
                ephemeral: true
            });
        }
    }

    /**
     * Show server analytics interface
     */
    static async showServerAnalytics(interaction) {
        try {
        await interaction.reply({
                content: '📊 **Server Analytics** - Coming Soon!\n\nThis will provide detailed server statistics and monitoring.',
            ephemeral: true
        });
        } catch (error) {
            logger.error('Error showing server analytics:', error);
        await interaction.reply({
                content: '❌ Error loading server analytics.',
            ephemeral: true
        });
    }
    }

    /**
     * Show server settings interface
     */
    static async showServerSettings(interaction) {
        try {
        await interaction.reply({
                content: '🔧 **Server Settings** - Coming Soon!\n\nThis will provide server configuration and settings management.',
            ephemeral: true
        });
        } catch (error) {
            logger.error('Error showing server settings:', error);
        await interaction.reply({
                content: '❌ Error loading server settings.',
            ephemeral: true
        });
    }
    }

    /**
     * Handle status subcommand - Phase 1 Migration: Using unified authentication
     */
    static async handleStatusCommand(interaction) {
        try {
            const password = interaction.options.getString('password');
            
            const authResult = await this.authenticateAdmin(interaction.user.id, password);
            if (!authResult.success) {
                await interaction.reply({
                    content: '❌ **Access Denied**\n\nIncorrect admin password.',
                    ephemeral: true
                });
                return;
            }

            await interaction.reply({
                content: '✅ **Admin System Status**\n\n🟢 System Online\n🔐 Authentication Active\n📊 Audit Logging Enabled',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error handling status command:', error);
            await interaction.reply({
                content: '❌ Error checking system status.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle audit-query subcommand - Phase 1 Migration: Using unified authentication
     */
    static async handleAuditQueryCommand(interaction) {
        try {
            const password = interaction.options.getString('password');
            const category = interaction.options.getString('category');
            const limit = interaction.options.getInteger('limit') || 10;
            
            const authResult = await this.authenticateAdmin(interaction.user.id, password);
            if (!authResult.success) {
                await interaction.reply({
                    content: '❌ **Access Denied**\n\nIncorrect admin password.',
                    ephemeral: true
                });
                return;
            }

            await interaction.reply({
                content: `📊 **Audit Query Results**\n\nCategory: ${category}\nLimit: ${limit}\n\n*Audit system active - check logs for detailed results.*`,
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error handling audit query command:', error);
            await interaction.reply({
                content: '❌ Error querying audit logs.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle change-password subcommand - Phase 1 Migration: Using unified authentication
     */
    static async handleChangePasswordCommand(interaction) {
        try {
            const currentPassword = interaction.options.getString('current-password');
            const newPassword = interaction.options.getString('new-password');
            
            const authResult = await this.authenticateAdmin(interaction.user.id, currentPassword);
            if (!authResult.success) {
                await interaction.reply({
                    content: '❌ **Access Denied**\n\nIncorrect current password.',
                    ephemeral: true
                });
                return;
            }

            if (newPassword.length < 12) {
                await interaction.reply({
                    content: '❌ **Invalid Password**\n\nNew password must be at least 12 characters long.',
                    ephemeral: true
                });
                return;
            }

            // Update password using unified system
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            await AuthenticationManager.updatePassword(interaction.user.id, newPassword);

            await interaction.reply({
                content: '✅ **Password Changed Successfully**\n\nYour admin password has been updated.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error handling change password command:', error);
            await interaction.reply({
                content: '❌ Error changing password.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle grant promotional weapon command - Phase 1 Migration: Using unified authentication
     */
    static async handleGrantPromotionalWeapon(interaction, options) {
        try {
            const targetUser = options.getUser('user');
            const weaponId = options.getString('weapon');
            const password = options.getString('password');

            // Verify admin password using unified authentication
            const authResult = await this.authenticateAdmin(interaction.user.id, password);
            if (!authResult.success) {
                await interaction.reply({
                    content: '❌ **Access Denied**\n\nIncorrect admin password.',
                    ephemeral: true
                });
                return;
            }

            // Grant promotional weapon directly to Profile Chest
            const { PromotionalHandler } = await import('../user/PromotionalHandler.js');
            const result = await PromotionalHandler.grantPromotionalWeapon(targetUser.id, weaponId, interaction.user.username);

            if (result.success) {
                await interaction.reply({
                    content: `✅ **Promotional Weapon Granted**\n\n🗡️ **Weapon**: ${result.weaponName}\n👤 **Recipient**: ${targetUser.username}\n📦 **Location**: Profile Chest\n\n*One-time promotional grant completed successfully.*`,
                    ephemeral: true
                });

                // Log the admin action
                await auditLogger.log({
                    category: 'ADMIN_ACTION',
                    message: `Admin ${interaction.user.username} granted promotional weapon to ${targetUser.username}`,
                    eventType: 'promotional_weapon_grant',
                    data: {
                        adminId: interaction.user.id,
                        adminUsername: interaction.user.username,
                        targetUserId: targetUser.id,
                        targetUsername: targetUser.username,
                        weaponId: weaponId,
                        weaponName: result.weaponName,
                        timestamp: new Date().toISOString()
                    }
                });
            } else {
                await interaction.reply({
                    content: `❌ **Grant Failed**\n\n${result.error || 'Unknown error occurred'}`,
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error granting promotional weapon:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Failed to grant promotional weapon. Check logs for details.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Safe error reply handler
     */
    static async safeErrorReply(interaction, message) {
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: message,
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: message,
                    ephemeral: true
                });
            }
        } catch (error) {
            logger.error('Error sending error reply:', error);
        }
    }

    /**
     * Enhanced showAdminDashboard method using unified authentication - Phase 2.2
     */
    static async showAdminDashboard(interaction) {
        try {
            if (!await this.isAuthenticated(interaction.user.id)) {
                const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');
                await DashboardEmbedHandler.showAdminAuth(interaction);
                return;
            }

            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            const sessionInfo = AuthenticationManager.getSessionInfo(interaction.user.id);
            const timeRemaining = sessionInfo ? Math.ceil(sessionInfo.timeRemaining / (1000 * 60)) : 0;

            const embed = new EmbedBuilder()
                .setTitle('🛠️ **ADMIN DASHBOARD** 🛠️')
                .setDescription(
                    `**Welcome, ${interaction.user.username}**\n\n` +
                    `🔐 **Session Active**: ${timeRemaining} minutes remaining\n` +
                    `🎯 **Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `⚔️ **Authority Level**: Server Administrator\n\n` +
                    '**Available Admin Tools:**\n' +
                    '🎒 **Item Management** - Add/remove game items\n' +
                    '📋 **Quest System** - Create and manage special quests\n' +
                    '💰 **Economy Tools** - Send currency to players\n' +
                    '🏆 **Division Management** - Open/close divisions\n' +
                    '🎪 **Event Management** - Paid entry events with prizes\n' +
                    '📢 **Announcements** - Server-wide announcements\n' +
                    '🎲 **Raffles & Auctions** - Manage community events\n' +
                    '⚔️ **Mash Bash Battle** - Battle system management\n' +
                    '🌐 **Web3 Tools** - Wallet integration and monitoring\n' +
                    '🔧 **System Settings** - Core system configuration\n\n' +
                    '**🔒 Admin Scope**: Limited to this server only\n' +
                    '*All actions are logged and audited*\n\n' +
                    '*Select admin tool:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Admin Dashboard • Server Management • All Actions Logged' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎒 Item Management (Basic Features)')
                    .setDescription('Basic weapon creation - Most features coming soon')
                    .setValue('admin_items'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📋 Quest System (Coming Soon)')
                    .setDescription('Server quest creation - Under development')
                    .setValue('admin_quests'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economy Tools (Limited Features)')
                    .setDescription('Send currency - Other features coming soon')
                    .setValue('admin_economy'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Division Management (Coming Soon)')
                    .setDescription('Division controls - Under development')
                    .setValue('admin_divisions'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎪 Event Management (Coming Soon)')
                    .setDescription('Event creation - Under development')
                    .setValue('admin_events'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📢 Announcements (Coming Soon)')
                    .setDescription('Server announcements - Under development')
                    .setValue('admin_announcements'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎲 Raffles & Auctions (Coming Soon)')
                    .setDescription('Community events - Under development')
                    .setValue('admin_raffles'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚔️ Mash Bash Battle (Coming Soon)')
                    .setDescription('Battle system - Under development')
                    .setValue('admin_mash_bash'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🌐 Web3 Tools (Coming Soon)')
                    .setDescription('Wallet integration - Under development')
                    .setValue('admin_web3'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 System Settings (Coming Soon)')
                    .setDescription('Core configuration - Under development')
                    .setValue('admin_settings')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_dashboard')
                .setPlaceholder('Select admin tool...')
                .addOptions(options);

            const logoutButton = new ButtonBuilder()
                .setCustomId('admin_logout')
                .setLabel('🚪 Logout')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(logoutButton);

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2],
                ephemeral: true
            });

            auditLogger.log('admin_dashboard_access', {
                userId: interaction.user.id,
                username: interaction.user.username,
                action: 'dashboard_accessed'
            });

        } catch (error) {
            logger.error('Error showing admin dashboard:', error);
            await interaction.reply({
                content: '❌ Error loading admin dashboard.',
                ephemeral: true
            });
        }
    }
} 