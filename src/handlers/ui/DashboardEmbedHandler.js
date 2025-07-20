import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

/**
 * DashboardEmbedHandler - Manages the new dashboard-based embed system
 * Creates embeds for Admin Start Here, Player Start Here, and Bot Dev Dashboard channels
 * Implements the user's vision of dashboard-centered navigation
 */
export class DashboardEmbedHandler {

    /**
     * Create Admin Start Here embed
     */
    static async createAdminStartHereEmbed(channel, user) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('⚙️ **ADMIN START HERE** ⚙️')
                .setDescription(
                    '**Welcome Server Owner/Administrator!**\n\n' +
                    '🏛️ **This is your admin control center**\n' +
                    'Create your admin profile and access powerful server management tools.\n\n' +
                    '**What you can do:**\n' +
                    '👥 **User Management** - Manage server members and profiles\n' +
                    '💰 **Economy Control** - Send currency and manage player economies\n' +
                    '📋 **Quest Management** - Create custom server quests\n' +
                    '🛠️ **Bot Configuration** - Setup channels and features\n' +
                    '📊 **Server Analytics** - Monitor activity and usage\n\n' +
                    '**🔐 Security Features:**\n' +
                    '• Secure password protection\n' +
                    '• Multi-factor recovery options\n' +
                    '• Session-based authentication\n\n' +
                    '**First time?** Create your admin profile below.\n' +
                    '**Returning?** Click login to access your dashboard.'
                )
                .setColor(0xff8800)
                .setFooter({ text: 'Admin Control Center • Server Management' })
                .setTimestamp();

            const createProfileButton = new ButtonBuilder()
                .setCustomId('admin_create_profile')
                .setLabel('🔐 Create Admin Profile')
                .setStyle(ButtonStyle.Primary);

            const loginButton = new ButtonBuilder()
                .setCustomId('admin_login')
                .setLabel('🔑 Login')
                .setStyle(ButtonStyle.Success);

            const helpButton = new ButtonBuilder()
                .setCustomId('admin_help')
                .setLabel('❓ Help & Tutorial')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createProfileButton, loginButton, helpButton);

            await channel.send({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Admin Start Here embed created in ${channel.name} by ${user.username}`);

        } catch (error) {
            logger.error('Error creating Admin Start Here embed:', error);
            throw error;
        }
    }

    /**
     * Create Player Start Here embed
     */
    static async createPlayerStartHereEmbed(channel, user) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎮 **WELCOME TO DUNGEONITES HEROES** 🎮')
                .setDescription(
                    '**Your Adventure Starts Here!**\n\n' +
                    '🏰 **Enter the world of dungeon exploration, epic battles, and treasure hunting!**\n\n' +
                    '**What awaits you:**\n' +
                    '⚔️ **Turn-based Combat** - Strategic battles with monsters\n' +
                    '🏛️ **Multi-tier Economy** - Progress from Gold to $HERO to $ETH\n' +
                    '🎯 **Hero Collection** - Unlock powerful heroes as you advance\n' +
                    '🏪 **Marketplace** - Trade items and build your wealth\n' +
                    '📜 **Daily Quests** - Complete challenges for rewards\n' +
                    '🎰 **Casino Games** - Try your luck with various games\n\n' +
                    '**🔐 Profile Required for Full Experience:**\n' +
                    '• Secure your progress and items\n' +
                    '• Access all game features\n' +
                    '• Trade safely with other players\n' +
                    '• Participate in the economy\n\n' +
                    '**Ready to begin?** Create your player profile or login below!'
                )
                .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                .setColor(0x8B4513)
                .setFooter({ text: 'Dungeonites Heroes Challenge • Your Adventure Awaits' })
                .setTimestamp();

            const createProfileButton = new ButtonBuilder()
                .setCustomId('player_create_profile')
                .setLabel('🔐 Create Player Profile')
                .setStyle(ButtonStyle.Primary);

            const loginButton = new ButtonBuilder()
                .setCustomId('player_login')
                .setLabel('🔑 Login')
                .setStyle(ButtonStyle.Success);

            const tutorialButton = new ButtonBuilder()
                .setCustomId('player_tutorial')
                .setLabel('📚 Game Tutorial')
                .setStyle(ButtonStyle.Secondary);

            const helpButton = new ButtonBuilder()
                .setCustomId('player_help')
                .setLabel('❓ Help & Support')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createProfileButton, loginButton, tutorialButton, helpButton);

            await channel.send({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Player Start Here embed created in ${channel.name} by ${user.username}`);

        } catch (error) {
            logger.error('Error creating Player Start Here embed:', error);
            throw error;
        }
    }

    /**
     * Create Bot Dev Dashboard embed
     */
    static async createBotDevDashboardEmbed(channel, user) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('⚔️ **BOT DEVELOPER DASHBOARD** ⚔️')
                .setDescription(
                    '**Ultimate Control Center**\n\n' +
                    '**🎯 You have unlimited power over all aspects of this bot**\n\n' +
                    '**🛠️ System Management**\n' +
                    '• Server setup and configuration\n' +
                    '• Channel and embed deployment\n' +
                    '• Cross-server overrides\n' +
                    '• Emergency controls\n\n' +
                    '**💰 Economy Tools**\n' +
                    '• Unlimited currency sending\n' +
                    '• Item granting and removal\n' +
                    '• Economy reset and backup\n' +
                    '• Value adjustments\n\n' +
                    '**⚔️ Game Management**\n' +
                    '• Hero unlocking\n' +
                    '• Promotional weapon distribution\n' +
                    '• Game customization\n' +
                    '• Testing tools\n\n' +
                    '**📊 Analytics & Monitoring**\n' +
                    '• System performance\n' +
                    '• Audit logs\n' +
                    '• User statistics\n' +
                    '• Error tracking\n\n' +
                    '**Access your tools using the menu below or `/master` command.**'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Bot Developer Dashboard • Ultimate Authority • All Actions Logged' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bot_dev_dashboard_main')
                .setPlaceholder('Choose your control category...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🛠️ System Management')
                        .setDescription('Server setup, channels, overrides, emergency controls')
                        .setValue('system_management'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💰 Economy Tools')
                        .setDescription('Currency sending, item granting, economic controls')
                        .setValue('economy_tools'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Game Management')
                        .setDescription('Heroes, weapons, promotional items, game customization')
                        .setValue('game_management'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('👥 User Management')
                        .setDescription('Profile control, admin management, permissions')
                        .setValue('user_management'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📊 Analytics & Monitoring')
                        .setDescription('Performance, logs, statistics, error tracking')
                        .setValue('analytics'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔧 Developer Tools')
                        .setDescription('Testing, diagnostics, experimental features')
                        .setValue('developer_tools')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await channel.send({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Bot Dev Dashboard embed created in ${channel.name} by ${user.username}`);

        } catch (error) {
            logger.error('Error creating Bot Dev Dashboard embed:', error);
            throw error;
        }
    }

    /**
     * Handle Admin Start Here interactions
     */
    static async handleAdminStartHere(interaction, action) {
        try {
            switch (action) {
                case 'admin_create_profile':
                    // Redirect to admin profile creation using unified system
                    const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
                    const profileInfo = await AuthenticationManager.getUserProfileInfo(interaction.user.id);
                    
                    if (profileInfo.profileType === 'admin') {
                        await interaction.reply({
                            content: '✅ **Admin Profile Already Exists**\n\nYou already have an admin profile. Use the Login button to authenticate.',
                            ephemeral: true
                        });
                        return;
                    }

                    await this.showAdminProfileCreation(interaction);
                    break;

                case 'admin_login':
                    // Redirect to admin authentication using unified system
                    await this.showAdminAuth(interaction);
                    break;

                case 'admin_help':
                    // Show admin help and tutorial
                    await this.showAdminHelp(interaction);
                    break;

                case 'admin_auth_password':
                    // Handle admin password authentication
                    await this.handleAdminPasswordAuth(interaction);
                    break;

                case 'admin_forgot_password':
                    // Handle admin forgot password
                    await this.handleAdminForgotPassword(interaction);
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Unknown admin action. Please try again.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling admin start here interaction:', error);
            await interaction.reply({
                content: '❌ Error processing admin request. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Admin Profile Creation
     */
    static async showAdminProfileCreation(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔐 **CREATE ADMIN PROFILE** 🔐')
                .setDescription(
                    '**Server Administrator Profile Setup**\n\n' +
                    '**⚠️ Admin Profile Requirements:**\n' +
                    '• Must be server owner or have administrator permissions\n' +
                    '• Secure password (12+ characters recommended)\n' +
                    '• Access to server management tools\n' +
                    '• Limited to this server only\n\n' +
                    '**What Admin Profiles Include:**\n' +
                    '💰 **Economy Tools** - Send currency to players (limited amounts)\n' +
                    '🎒 **Item Management** - Grant items to players\n' +
                    '📋 **Quest Management** - Create server-specific quests\n' +
                    '👥 **Player Management** - Manage player profiles\n' +
                    '📊 **Server Analytics** - Monitor server activity\n\n' +
                    '**🔒 Security Features:**\n' +
                    '• Password protection for all admin actions\n' +
                    '• Session timeout after 30 minutes\n' +
                    '• All actions logged and audited\n\n' +
                    '*Click below to begin profile creation:*'
                )
                .setColor(0xff8800)
                .setFooter({ text: 'Admin Profile Creation • Server Management Access' })
                .setTimestamp();

            const createButton = new ButtonBuilder()
                .setCustomId('admin_profile_create_begin')
                .setLabel('🔐 Create Admin Profile')
                .setStyle(ButtonStyle.Primary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('admin_profile_create_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createButton, cancelButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing admin profile creation:', error);
            await interaction.reply({
                content: '❌ Error loading admin profile creation.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Admin Authentication
     */
    static async showAdminAuth(interaction) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            const profileInfo = await AuthenticationManager.getUserProfileInfo(interaction.user.id);
            
            if (!profileInfo.hasProfile || profileInfo.profileType !== 'admin') {
                await interaction.reply({
                    content: '❌ **No Admin Profile Found**\n\nYou need to create an admin profile first. Click "Create Admin Profile" above.',
                    ephemeral: true
                });
                return;
            }

            // Check if already authenticated
            if (AuthenticationManager.isAuthenticated(interaction.user.id)) {
                await this.showAdminDashboard(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🔑 **ADMIN AUTHENTICATION** 🔑')
                .setDescription(
                    '**Server Administrator Login**\n\n' +
                    `✅ **Admin Profile**: Found\n` +
                    `🎯 **Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `⏰ **Session**: 30 minutes after login\n\n` +
                    '**Admin Access Includes:**\n' +
                    '💰 **Economy Tools** - Limited currency sending\n' +
                    '🎒 **Item Management** - Player item management\n' +
                    '📋 **Quest System** - Server quest creation\n' +
                    '👥 **Player Tools** - Profile management\n' +
                    '📊 **Analytics** - Server monitoring\n\n' +
                    '**🔒 Security Notice:**\n' +
                    '• All admin actions are logged\n' +
                    '• Limited to this server only\n' +
                    '• Auto-logout after inactivity\n\n' +
                    '*Enter your admin password to continue:*'
                )
                .setColor(0x00aa00)
                .setFooter({ text: 'Admin Authentication • Server Management' })
                .setTimestamp();

            const loginButton = new ButtonBuilder()
                .setCustomId('admin_auth_password')
                .setLabel('🔑 Enter Password')
                .setStyle(ButtonStyle.Success);

            const forgotButton = new ButtonBuilder()
                .setCustomId('admin_forgot_password')
                .setLabel('❓ Forgot Password')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(loginButton, forgotButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing admin auth:', error);
            await interaction.reply({
                content: '❌ Error loading admin authentication.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Admin Dashboard after successful authentication
     */
    static async showAdminDashboard(interaction) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            
            // Verify authentication
            if (!AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.ADMIN)) {
                await this.showAdminAuth(interaction);
                return;
            }

            const sessionInfo = AuthenticationManager.getSessionInfo(interaction.user.id);
            const timeRemaining = sessionInfo ? Math.ceil(sessionInfo.timeRemaining / (1000 * 60)) : 0;

            const embed = new EmbedBuilder()
                .setTitle('🚀 **ADMIN SETUP DASHBOARD** 🚀')
                .setDescription(
                    `**Welcome, ${interaction.user.username}**\n\n` +
                    `🔐 **Session Active**: ${timeRemaining} minutes remaining\n` +
                    `🎯 **Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `⚔️ **Authority Level**: Server Administrator\n\n` +
                    '**🚀 Server Setup & Configuration:**\n' +
                    '🛠️ **Bot Setup** - Deploy embeds, configure channels, complete setup\n' +
                    '📋 **Channel Management** - Create and manage dashboard channels\n' +
                    '🎨 **Embed Deployment** - Place Game Hall, Admin, Player dashboards\n' +
                    '⚙️ **Server Configuration** - Bot settings and feature toggles\n\n' +
                    '**🛠️ Daily Admin Tools:**\n' +
                    '💰 **Economy Management** - Send currency, manage player balances\n' +
                    '🎒 **Item Management** - Grant items, manage inventories\n' +
                    '📋 **Quest System** - Create server quests and rewards\n' +
                    '👥 **Player Management** - Manage player profiles and accounts\n' +
                    '📊 **Server Analytics** - Monitor activity and performance\n\n' +
                    '**🔒 Admin Scope**: Limited to this server only\n' +
                    '*All actions are logged and audited*\n\n' +
                    '*Choose your operation category:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Admin Dashboard • Setup & Management • All Actions Logged' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_dashboard_main')
                .setPlaceholder('Choose operation category...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🚀 Bot Setup & Deployment')
                        .setDescription('Deploy complete dashboard system - Full/Quick/Custom options')
                        .setValue('admin_bot_setup'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📋 Channel Management')
                        .setDescription('Create channels, configure permissions, manage layout')
                        .setValue('admin_channel_mgmt'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎨 Embed Management')
                        .setDescription('Deploy/update Game Hall, Admin, Player dashboard embeds')
                        .setValue('admin_embed_mgmt'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚙️ Server Configuration')
                        .setDescription('Bot settings, feature toggles, server preferences')
                        .setValue('admin_server_config'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💰 Economy Tools')
                        .setDescription('Send currency, manage player balances')
                        .setValue('admin_economy'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎒 Item Management')
                        .setDescription('Grant items, manage inventories')
                        .setValue('admin_items'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📋 Quest System')
                        .setDescription('Create server quests and rewards')
                        .setValue('admin_quests'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('👥 Player Management')
                        .setDescription('Manage player profiles and accounts')
                        .setValue('admin_players'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📊 Server Analytics')
                        .setDescription('Monitor activity and performance')
                        .setValue('admin_analytics')
                ]);

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

        } catch (error) {
            logger.error('Error showing admin dashboard:', error);
            await interaction.reply({
                content: '❌ Error loading admin dashboard.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Admin Dashboard interactions - Now includes setup options
     */
    static async handleAdminDashboard(interaction, selectedValue) {
        try {
            // Handle setup options first, then regular admin tools
            switch (selectedValue) {
                // Setup & Configuration Options
                case 'admin_bot_setup':
                    await this.showAdminBotSetup(interaction);
                    break;
                case 'admin_channel_mgmt':
                    await this.showAdminChannelManagement(interaction);
                    break;
                case 'admin_embed_mgmt':
                    await this.showAdminEmbedManagement(interaction);
                    break;
                case 'admin_server_config':
                    await this.showAdminServerConfiguration(interaction);
                    break;

                // Regular Admin Tools - delegate to Admin Handler
                case 'admin_economy':
                    const { AdminHandler } = await import('../admin/AdminHandler.js');
                    await AdminHandler.showEconomyTools(interaction);
                    break;
                case 'admin_items':
                    const { AdminHandler: AdminHandler2 } = await import('../admin/AdminHandler.js');
                    await AdminHandler2.showItemManagement(interaction);
                    break;
                case 'admin_quests':
                    const { AdminHandler: AdminHandler3 } = await import('../admin/AdminHandler.js');
                    await AdminHandler3.showQuestManagement(interaction);
                    break;
                case 'admin_players':
                    const { AdminHandler: AdminHandler4 } = await import('../admin/AdminHandler.js');
                    await AdminHandler4.showPlayerManagement(interaction);
                    break;
                case 'admin_analytics':
                    const { AdminHandler: AdminHandler5 } = await import('../admin/AdminHandler.js');
                    await AdminHandler5.showServerAnalytics(interaction);
                    break;
                    
                default:
                    await interaction.reply({
                        content: '❌ Unknown admin dashboard option. Please try again.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling admin dashboard interaction:', error);
            await interaction.reply({
                content: '❌ Error accessing admin feature. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Player Start Here interactions - Phase 2.3
     */
    static async handlePlayerStartHere(interaction, action) {
        try {
            switch (action) {
                case 'player_create_profile':
                    // Check if profile already exists using unified system
                    const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
                    const profileInfo = await AuthenticationManager.getUserProfileInfo(interaction.user.id);
                    
                    if (profileInfo.hasProfile) {
                        await interaction.reply({
                            content: '✅ **Profile Already Exists**\n\nYou already have a game profile. Use the Login button to access your account and enter the game.',
                            ephemeral: true
                        });
                        return;
                    }

                    await this.showPlayerProfileCreation(interaction);
                    break;

                case 'player_login':
                    // Redirect to player authentication using unified system
                    await this.showPlayerAuth(interaction);
                    break;

                case 'player_tutorial':
                    // Show comprehensive tutorial system
                    await this.showPlayerTutorial(interaction);
                    break;

                case 'player_help':
                    // Show help and support system
                    await this.showPlayerHelp(interaction);
                    break;

                case 'player_auth_password':
                    // Handle player password authentication
                    await this.handlePlayerPasswordAuth(interaction);
                    break;

                case 'player_smart_login':
                    // Handle player smart login
                    await this.handlePlayerSmartLogin(interaction);
                    break;

                case 'player_forgot_password':
                    // Handle player forgot password
                    await this.handlePlayerForgotPassword(interaction);
                    break;

                case 'player_logout':
                    // Handle player logout
                    await this.handlePlayerLogout(interaction);
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Unknown player action. Please try again.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling player start here interaction:', error);
            await interaction.reply({
                content: '❌ Error processing player request. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Player Profile Creation - Phase 2.3
     */
    static async showPlayerProfileCreation(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎮 **CREATE PLAYER PROFILE** 🎮')
                .setDescription(
                    '**Welcome to Dungeonites Heroes Challenge!**\n\n' +
                    '**🎯 What You Get:**\n' +
                    '• Complete RPG adventure with heroes, weapons, and quests\n' +
                    '• Multi-tier economy: Gold → Tokens → $DNG → $HERO → $ETH\n' +
                    '• NFT marketplace integration and trading systems\n' +
                    '• Cross-server profile with progression tracking\n' +
                    '• Access to exclusive events and promotional rewards\n\n' +
                    '**🔒 Profile Security:**\n' +
                    '• Password protection for all transactions\n' +
                    '• Auto-login sessions for 12 hours\n' +
                    '• Secure wallet integration for crypto features\n' +
                    '• Full data backup and recovery\n\n' +
                    '**🚀 Getting Started:**\n' +
                    '• Choose your starting hero and division\n' +
                    '• Complete tutorial quests for rewards\n' +
                    '• Begin your dungeon adventures\n\n' +
                    '*Click below to create your profile:*'
                )
                .setColor(0x00ff41)
                .setFooter({ text: 'Player Profile Creation • Adventure Awaits!' })
                .setTimestamp();

            const createButton = new ButtonBuilder()
                .setCustomId('player_profile_create_begin')
                .setLabel('🎮 Create Profile')
                .setStyle(ButtonStyle.Success);

            const tutorialButton = new ButtonBuilder()
                .setCustomId('player_tutorial_first')
                .setLabel('📚 View Tutorial First')
                .setStyle(ButtonStyle.Primary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('player_profile_create_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createButton, tutorialButton, cancelButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing player profile creation:', error);
            await interaction.reply({
                content: '❌ Error loading profile creation.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Player Authentication - Phase 2.3
     */
    static async showPlayerAuth(interaction) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            const profileInfo = await AuthenticationManager.getUserProfileInfo(interaction.user.id);
            
            if (!profileInfo.hasProfile) {
                await interaction.reply({
                    content: '❌ **No Player Profile Found**\n\nYou need to create a player profile first. Click "Create Profile" above to get started.',
                    ephemeral: true
                });
                return;
            }

            // Check if already authenticated
            if (AuthenticationManager.isAuthenticated(interaction.user.id)) {
                await this.showPlayerDashboard(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🔑 **PLAYER LOGIN** 🔑')
                .setDescription(
                    '**Welcome Back, Hero!**\n\n' +
                    `✅ **Profile**: Found\n` +
                    `🎮 **Hero Type**: ${profileInfo.heroType || 'Not selected'}\n` +
                    `⏰ **Session**: 12 hours after login\n\n` +
                    '**🔐 Secure Login System:**\n' +
                    '• Auto-login if used within 12 hours\n' +
                    '• Password required if session expired\n' +
                    '• All transactions password protected\n\n' +
                    '**Game Access Includes:**\n' +
                    '🗡️ **Dungeon Adventures** - Enter dungeons and battle monsters\n' +
                    '🛒 **Marketplace** - Trade items and participate in economy\n' +
                    '🎯 **Quests & Events** - Daily quests and special events\n' +
                    '👥 **Social Features** - Guilds, trading, and community\n' +
                    '💰 **Economy Systems** - Multi-tier currency progression\n\n' +
                    '**🆘 Having trouble?** Try the `/ch` command as backup\n\n' +
                    '*Click below to login and start your adventure:*'
                )
                .setColor(0x3498db)
                .setFooter({ text: 'Player Authentication • Your Adventure Continues!' })
                .setTimestamp();

            const loginButton = new ButtonBuilder()
                .setCustomId('player_smart_login')
                .setLabel('🔑 Login')
                .setStyle(ButtonStyle.Primary);

            const forgotButton = new ButtonBuilder()
                .setCustomId('player_forgot_password')
                .setLabel('❓ Forgot Password')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(loginButton, forgotButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing player auth:', error);
            await interaction.reply({
                content: '❌ Error loading player authentication.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Player Dashboard after successful authentication - Phase 2.3
     */
    static async showPlayerDashboard(interaction) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            
            // Verify authentication
            if (!AuthenticationManager.isAuthenticated(interaction.user.id)) {
                await this.showPlayerAuth(interaction);
                return;
            }

            const sessionInfo = AuthenticationManager.getSessionInfo(interaction.user.id);
            const timeRemaining = sessionInfo ? Math.ceil(sessionInfo.timeRemaining / (1000 * 60 * 60)) : 0;
            const profileInfo = await AuthenticationManager.getUserProfileInfo(interaction.user.id);

            const embed = new EmbedBuilder()
                .setTitle('🎮 **PLAYER DASHBOARD** 🎮')
                .setDescription(
                    `**Welcome back, ${interaction.user.username}!**\n\n` +
                    `🔐 **Session Active**: ${timeRemaining} hours remaining\n` +
                    `🎯 **Hero**: ${profileInfo.heroType || 'Not selected'}\n` +
                    `💎 **Division**: ${profileInfo.division || 'Gold'}\n\n` +
                    '**🎮 Game Features:**\n' +
                    '⚔️ **Enter Dungeon** - Start your adventure, battle monsters, find treasure\n' +
                    '👤 **View Profile** - Check stats, inventory, progression\n' +
                    '🎯 **Active Quests** - Daily quests and special missions\n' +
                    '🛒 **Marketplace** - Trade items, buy/sell, participate in economy\n' +
                    '🎲 **Casino & Games** - Coin flip, events, entertainment\n' +
                    '🏆 **Leaderboards** - See top players and compete\n\n' +
                    '**🎓 Learning & Help:**\n' +
                    '📚 **Tutorial** - Learn game mechanics and strategies\n' +
                    '❓ **Help Center** - FAQ, guides, and support\n' +
                    '🔧 **Settings** - Account settings and preferences\n\n' +
                    '**Ready for your next adventure?**\n\n' +
                    '*Select what you want to do:*'
                )
                .setColor(0x00ff41)
                .setFooter({ text: 'Player Dashboard • Your Adventure Awaits!' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('player_dashboard_main')
                .setPlaceholder('Choose your adventure...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Enter Dungeon')
                        .setDescription('Start your adventure - battle monsters and find treasure')
                        .setValue('player_enter_dungeon'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('👤 View Profile')
                        .setDescription('Check your stats, inventory, and progression')
                        .setValue('player_view_profile'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎯 Active Quests')
                        .setDescription('View and complete daily quests and missions')
                        .setValue('player_active_quests'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🛒 Marketplace')
                        .setDescription('Trade items, buy/sell, and participate in economy')
                        .setValue('player_marketplace'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎲 Casino & Games')
                        .setDescription('Coin flip, events, and entertainment')
                        .setValue('player_casino'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏆 Leaderboards')
                        .setDescription('See top players and compete for rankings')
                        .setValue('player_leaderboards'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📚 Tutorial')
                        .setDescription('Learn game mechanics and strategies')
                        .setValue('player_tutorial'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('❓ Help Center')
                        .setDescription('FAQ, guides, and support')
                        .setValue('player_help'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔧 Settings')
                        .setDescription('Account settings and preferences')
                        .setValue('player_settings')
                ]);

            const logoutButton = new ButtonBuilder()
                .setCustomId('player_logout')
                .setLabel('🚪 Logout')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(logoutButton);

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing player dashboard:', error);
            await interaction.reply({
                content: '❌ Error loading player dashboard.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Player Tutorial System - Phase 2.3
     */
    static async showPlayerTutorial(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📚 **DUNGEONITES HEROES CHALLENGE TUTORIAL** 📚')
                .setDescription(
                    '**Learn the Game - Step by Step**\n\n' +
                    '**🎯 Tutorial Categories:**\n' +
                    '🎮 **Basic Gameplay** - Heroes, dungeons, battles, and progression\n' +
                    '💰 **Economy System** - Multi-tier currency and trading\n' +
                    '🛒 **Marketplace** - Buying, selling, and NFT integration\n' +
                    '⚔️ **Combat & Strategy** - Battle mechanics and tactics\n' +
                    '🎯 **Quests & Events** - Daily missions and special events\n' +
                    '🏆 **Advanced Features** - Guilds, leaderboards, and competition\n\n' +
                    '**💡 Quick Start Guide:**\n' +
                    '1️⃣ Create profile and choose your hero\n' +
                    '2️⃣ Complete tutorial dungeon (rewards included!)\n' +
                    '3️⃣ Learn marketplace basics\n' +
                    '4️⃣ Start your first real adventure\n\n' +
                    '**🎁 Tutorial Rewards:**\n' +
                    '• Starter weapon and armor set\n' +
                    '• 1000 Gold to begin trading\n' +
                    '• Special tutorial achievement badge\n\n' +
                    '*Choose your learning path:*'
                )
                .setColor(0x9b59b6)
                .setFooter({ text: 'Tutorial System • Master the Game!' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('player_tutorial_main')
                .setPlaceholder('Choose tutorial topic...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🚀 Quick Start Guide')
                        .setDescription('Get started in 5 minutes - perfect for new players')
                        .setValue('tutorial_quick_start'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎮 Basic Gameplay')
                        .setDescription('Heroes, dungeons, battles, and progression')
                        .setValue('tutorial_gameplay'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💰 Economy System')
                        .setDescription('Multi-tier currency, trading, and wealth building')
                        .setValue('tutorial_economy'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🛒 Marketplace Guide')
                        .setDescription('Buying, selling, and NFT marketplace features')
                        .setValue('tutorial_marketplace'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Combat & Strategy')
                        .setDescription('Battle mechanics, tactics, and winning strategies')
                        .setValue('tutorial_combat'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎯 Quests & Events')
                        .setDescription('Daily missions, special events, and rewards')
                        .setValue('tutorial_quests'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏆 Advanced Features')
                        .setDescription('Guilds, leaderboards, and competitive play')
                        .setValue('tutorial_advanced'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎓 Interactive Tutorial')
                        .setDescription('Hands-on tutorial with rewards (Recommended!)')
                        .setValue('tutorial_interactive')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing player tutorial:', error);
            await interaction.reply({
                content: '❌ Error loading tutorial system.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Player Help Center - Phase 2.3
     */
    static async showPlayerHelp(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('❓ **HELP CENTER** ❓')
                .setDescription(
                    '**Get Help & Support**\n\n' +
                    '**🔍 Help Categories:**\n' +
                    '📖 **FAQ** - Frequently asked questions and answers\n' +
                    '🎮 **Game Guides** - Detailed guides for all game features\n' +
                    '🐛 **Troubleshooting** - Common issues and solutions\n' +
                    '💬 **Contact Support** - Get help from our team\n' +
                    '📝 **Report Bug** - Report issues or problems\n' +
                    '💡 **Feature Requests** - Suggest new features\n\n' +
                    '**⚡ Quick Solutions:**\n' +
                    '• **Lost items?** Check your inventory carefully\n' +
                    '• **Can\'t login?** Try password reset\n' +
                    '• **Game stuck?** Restart and try again\n' +
                    '• **Missing rewards?** Check transaction history\n\n' +
                    '**🎯 Popular Topics:**\n' +
                    '• How to trade items safely\n' +
                    '• Understanding the economy system\n' +
                    '• Recovering lost accounts\n' +
                    '• Marketplace trading tips\n\n' +
                    '*Choose your help topic:*'
                )
                .setColor(0xe74c3c)
                .setFooter({ text: 'Help Center • We\'re Here to Help!' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('player_help_main')
                .setPlaceholder('Choose help topic...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📖 FAQ')
                        .setDescription('Frequently asked questions and quick answers')
                        .setValue('help_faq'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎮 Game Guides')
                        .setDescription('Detailed guides for all game features')
                        .setValue('help_guides'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🐛 Troubleshooting')
                        .setDescription('Common issues and step-by-step solutions')
                        .setValue('help_troubleshooting'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💰 Economy Help')
                        .setDescription('Currency, trading, and marketplace questions')
                        .setValue('help_economy'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Gameplay Help')
                        .setDescription('Combat, dungeons, and progression questions')
                        .setValue('help_gameplay'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔒 Account & Security')
                        .setDescription('Profile, password, and security questions')
                        .setValue('help_account'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💬 Contact Support')
                        .setDescription('Get direct help from our support team')
                        .setValue('help_contact'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📝 Report Issue')
                        .setDescription('Report bugs or problems')
                        .setValue('help_report')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing player help:', error);
            await interaction.reply({
                content: '❌ Error loading help center.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Player Dashboard interactions - Phase 2.3
     */
    static async handlePlayerDashboard(interaction, selectedValue) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            
            // Verify authentication for protected features
            if (!AuthenticationManager.isAuthenticated(interaction.user.id)) {
                await this.showPlayerAuth(interaction);
                return;
            }

            switch (selectedValue) {
                case 'player_enter_dungeon':
                    // Redirect to existing game system
                    await this.redirectToGameSystem(interaction, 'dungeon');
                    break;
                    
                case 'player_view_profile':
                    // Redirect to existing profile system
                    await this.redirectToGameSystem(interaction, 'profile');
                    break;
                    
                case 'player_active_quests':
                    // Redirect to existing quest system
                    await this.redirectToGameSystem(interaction, 'quests');
                    break;
                    
                case 'player_marketplace':
                    // Redirect to existing marketplace system
                    await this.redirectToGameSystem(interaction, 'marketplace');
                    break;
                    
                case 'player_casino':
                    // Redirect to existing casino system
                    await this.redirectToGameSystem(interaction, 'casino');
                    break;
                    
                case 'player_leaderboards':
                    await this.showPlayerLeaderboards(interaction);
                    break;
                    
                case 'player_tutorial':
                    await this.showPlayerTutorial(interaction);
                    break;
                    
                case 'player_help':
                    await this.showPlayerHelp(interaction);
                    break;
                    
                case 'player_settings':
                    await this.showPlayerSettings(interaction);
                    break;
                    
                default:
                    await interaction.reply({
                        content: '❌ Unknown player dashboard option. Please try again.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling player dashboard interaction:', error);
            await interaction.reply({
                content: '❌ Error accessing player feature. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Redirect to existing game systems - Phase 2.3 Integration
     */
    static async redirectToGameSystem(interaction, systemType) {
        try {
            switch (systemType) {
                case 'dungeon':
                    // Use PersistentEmbedManager's thread redirection system
                    const { PersistentEmbedManager } = await import('../../utils/persistentEmbedManager.js');
                    
                    const gameStartEmbed = new EmbedBuilder()
                        .setTitle('🎮 **Adventure Starting!**')
                        .setDescription('⚔️ **Ready to enter the dungeon!**\n\nYour adventure will begin in your private thread.')
                        .setColor(0x00ff00);

                    await PersistentEmbedManager.redirectToPrivateThread(
                        interaction,
                        {
                            embeds: [gameStartEmbed],
                            content: '🎮 **Welcome, brave adventurer!**'
                        },
                        `🎮 ${interaction.user.username}'s Adventure`
                    );
                    
                    // FIXED: Actually start the game in the thread
                    const threadData = PersistentEmbedManager.userThreads.get(interaction.user.id);
                    if (threadData) {
                        try {
                            const thread = await interaction.guild.channels.fetch(threadData.threadId);
                            await this.initializeGameInThread(thread, interaction.user);
                        } catch (threadError) {
                            logger.warn('Could not initialize game in thread:', threadError.message);
                        }
                    }
                    break;
                    
                case 'profile':
                    const { ProfileHandler } = await import('../core/ProfileHandler.js');
                    await ProfileHandler.showProfile(interaction);
                    break;
                    
                case 'quests':
                    const { QuestHandler } = await import('../core/QuestHandler.js');
                    await QuestHandler.showQuestMenu(interaction);
                    break;
                    
                case 'marketplace':
                    const { MarketplaceHandler } = await import('../marketplace/MarketplaceHandler.js');
                    await MarketplaceHandler.showMarketplace(interaction);
                    break;
                    
                case 'casino':
                    const { MarketplaceHandler: CasinoHandler } = await import('../marketplace/MarketplaceHandler.js');
                    await CasinoHandler.handleCoinflipStart(interaction);
                    break;
                    
                default:
                    await interaction.reply({
                        content: `🚧 **${systemType} Integration** - Coming Soon!\n\nThis feature will be connected to the existing game system.`,
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error(`Error redirecting to ${systemType}:`, error);
            await interaction.reply({
                content: `❌ Error accessing ${systemType}. Please try again or use the direct game commands.`,
                ephemeral: true
            });
        }
    }

    /**
     * Initialize game state in user's private thread - CRITICAL FIX
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
                update: async (options) => {
                    return await thread.send(options);
                },
                author: user,
                channel: thread,
                user: user,
                guild: thread.guild
            };

            // Show start menu in the thread
            await StartMenuHandler.showStartMenu(threadMessage, gameState);

            logger.info(`Game initialized in thread ${thread.id} for user ${user.id}`);

        } catch (error) {
            logger.error('Error initializing game in thread:', error);
            await thread.send('❌ Error initializing game. Please use the `/ch` command to start manually.');
        }
    }

    /**
     * Show Player Settings - Phase 2.3
     */
    static async showPlayerSettings(interaction) {
        try {
            await interaction.reply({
                content: '🔧 **Player Settings** - Coming Soon!\n\nThis will include account settings, preferences, and configuration options.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error showing player settings:', error);
            await interaction.reply({
                content: '❌ Error loading player settings.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Player Leaderboards - Phase 2.3
     */
    static async showPlayerLeaderboards(interaction) {
        try {
            await interaction.reply({
                content: '🏆 **Leaderboards** - Coming Soon!\n\nThis will show top players, rankings, and competitive statistics.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error showing player leaderboards:', error);
            await interaction.reply({
                content: '❌ Error loading leaderboards.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Bot Dev Dashboard interactions
     */
    static async handleBotDevDashboard(interaction, selectedValue) {
        try {
            // Import and delegate to Bot Developer Handler
            const { BotDeveloperHandler } = await import('../admin/BotDeveloperHandler.js');
            
            // Map dashboard values to Bot Developer Handler methods
            switch (selectedValue) {
                case 'system_management':
                    await BotDeveloperHandler.showSystemManagement(interaction);
                    break;
                case 'economy_tools':
                    await BotDeveloperHandler.showEconomyTools(interaction);
                    break;
                case 'game_management':
                    await BotDeveloperHandler.showGameManagement(interaction);
                    break;
                case 'user_management':
                    await BotDeveloperHandler.showUserManagement(interaction);
                    break;
                case 'analytics':
                    await BotDeveloperHandler.showAnalytics(interaction);
                    break;
                case 'developer_tools':
                    await BotDeveloperHandler.showDeveloperTools(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown dashboard option. Please try again.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling bot dev dashboard interaction:', error);
            await interaction.reply({
                content: '❌ Error accessing dashboard feature. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show admin help information
     */
    static async showAdminHelp(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('❓ **ADMIN HELP & TUTORIAL** ❓')
                .setDescription(
                    '**Getting Started as Server Admin**\n\n' +
                    '**1. Create Your Admin Profile**\n' +
                    '• Secure password (12+ characters)\n' +
                    '• Recovery methods (X account, EVM wallet, email)\n' +
                    '• 2-factor authentication setup\n\n' +
                    '**2. Access Admin Dashboard**\n' +
                    '• Login with your password\n' +
                    '• 12-hour auto-login feature\n' +
                    '• Comprehensive admin tools\n\n' +
                    '**3. Server Management**\n' +
                    '• Add/remove bot features\n' +
                    '• Manage user profiles\n' +
                    '• Control server economy\n' +
                    '• Create custom quests\n\n' +
                    '**Need More Help?**\n' +
                    'Contact the Bot Developer for advanced setup assistance.'
                )
                .setColor(0xff8800)
                .setFooter({ text: 'Admin Tutorial • Server Management Guide' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error showing admin help:', error);
            await interaction.reply({
                content: '❌ Error loading admin help. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Admin Bot Setup options - similar to Bot Dev interface
     */
    static async showAdminBotSetup(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🚀 **BOT SETUP OPTIONS** 🚀')
                .setDescription(
                    '**Server Administrator Setup**\n\n' +
                    `✅ **Authentication**: Successful\n` +
                    `🎯 **Target Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `👑 **Server Owner**: <@${interaction.guild?.ownerId}>\n\n` +
                    '**Choose Your Setup Type:**\n\n' +
                    '🚀 **Full Setup**\n' +
                    '└ Creates all channels automatically\n' +
                    '└ Deploys all embeds (Game Hall, Admin Start Here, Player Start Here)\n' +
                    '└ Complete configuration in one step\n\n' +
                    '⚡ **Quick Setup**\n' +
                    '└ Minimal setup with Game Hall embed only\n' +
                    '└ Choose existing channel or create new one\n' +
                    '└ Perfect for getting started quickly\n\n' +
                    '🎛️ **Custom Setup**\n' +
                    '└ Choose placement for each embed individually\n' +
                    '└ Full control over configuration\n' +
                    '└ Advanced options available\n\n' +
                    '*Select your preferred setup method:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Admin Setup • Choose Your Method' })
                .setTimestamp();

            const fullSetupButton = new ButtonBuilder()
                .setCustomId('admin_setup_full')
                .setLabel('🚀 Full Setup')
                .setStyle(ButtonStyle.Success);

            const quickSetupButton = new ButtonBuilder()
                .setCustomId('admin_setup_quick')
                .setLabel('⚡ Quick Setup')
                .setStyle(ButtonStyle.Primary);

            const customSetupButton = new ButtonBuilder()
                .setCustomId('admin_setup_custom')
                .setLabel('🎛️ Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('admin_setup_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(fullSetupButton, quickSetupButton, customSetupButton, cancelButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing admin bot setup:', error);
            await interaction.reply({
                content: '❌ Error loading bot setup options.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Admin Channel Management
     */
    static async showAdminChannelManagement(interaction) {
        try {
            await interaction.reply({
                content: '📋 **Channel Management** - Coming Soon!\n\nThis will provide channel creation and management tools.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error showing channel management:', error);
            await interaction.reply({
                content: '❌ Error loading channel management.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Admin Embed Management
     */
    static async showAdminEmbedManagement(interaction) {
        try {
            await interaction.reply({
                content: '🎨 **Embed Management** - Coming Soon!\n\nThis will provide embed deployment and management tools.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error showing embed management:', error);
            await interaction.reply({
                content: '❌ Error loading embed management.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Admin Server Configuration
     */
    static async showAdminServerConfiguration(interaction) {
        try {
            await interaction.reply({
                content: '⚙️ **Server Configuration** - Coming Soon!\n\nThis will provide bot settings and server configuration options.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error showing server configuration:', error);
            await interaction.reply({
                content: '❌ Error loading server configuration.',
                ephemeral: true
            });
        }
    }

    /**
     * Create Admin Dashboard Embed (for setuphero command compatibility)
     */
    static async createAdminDashboardEmbed(channel, user) {
        try {
            return await this.createAdminStartHereEmbed(channel, user);
        } catch (error) {
            logger.error('Error creating admin dashboard embed:', error);
            throw error;
        }
    }

    /**
     * Create Admin Start Here Embed
     */
    static async createAdminStartHereEmbed(channel, user) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('⚙️ **ADMIN START HERE** ⚙️')
                .setDescription(
                    '**Server Administrator Dashboard**\n\n' +
                    '**Welcome to your Admin Control Center!**\n' +
                    'This is where server admins manage the Dungeonites Heroes Challenge experience.\n\n' +
                    '**Getting Started:**\n' +
                    '• **New Admin?** Create your secure admin profile\n' +
                    '• **Returning Admin?** Login with your password\n' +
                    '• **Need Help?** Access tutorials and support\n\n' +
                    '**Admin Features:**\n' +
                    '⚙️ **Server Management** - Configure bot settings\n' +
                    '📊 **Analytics** - Monitor server activity\n' +
                    '👥 **Player Management** - Manage user accounts\n' +
                    '🚨 **Emergency Controls** - Server security tools\n\n' +
                    '*Select an option below to begin:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Admin Dashboard • Server Management' })
                .setTimestamp();

            const createProfileButton = new ButtonBuilder()
                .setCustomId('admin_create_profile')
                .setLabel('👤 Create Admin Profile')
                .setStyle(ButtonStyle.Success);

            const loginButton = new ButtonBuilder()
                .setCustomId('admin_login')
                .setLabel('🔐 Login')
                .setStyle(ButtonStyle.Primary);

            const tutorialButton = new ButtonBuilder()
                .setCustomId('admin_tutorial')
                .setLabel('📚 Tutorial')
                .setStyle(ButtonStyle.Secondary);

            const helpButton = new ButtonBuilder()
                .setCustomId('admin_help')
                .setLabel('❓ Help')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createProfileButton, loginButton, tutorialButton, helpButton);

            const message = await channel.send({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Admin Start Here embed created in ${channel.name} by ${user.username}`);
            return message;

        } catch (error) {
            logger.error('Error creating admin start here embed:', error);
            throw error;
        }
    }

    /**
     * Create Player Start Here Embed
     */
    static async createPlayerStartHereEmbed(channel, user) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎮 **START HERE** 🎮')
                .setDescription(
                    '**Welcome to Dungeonites Heroes Challenge!**\n\n' +
                    '🗡️ **Epic Adventures Await!** ⚔️\n' +
                    'Embark on thrilling dungeon expeditions, battle fearsome monsters, and discover legendary treasures!\n\n' +
                    '**Getting Started:**\n' +
                    '• **New Player?** Create your hero profile and begin your journey\n' +
                    '• **Returning Hero?** Login to continue your adventures\n' +
                    '• **Need Guidance?** Check out tutorials and help\n\n' +
                    '**Game Features:**\n' +
                    '⚔️ **The Dungeon** - Epic adventures and combat\n' +
                    '🎰 **Casino** - Games of chance and rewards\n' +
                    '🛒 **Marketplace** - Trading and commerce\n' +
                    '🏆 **Achievements** - Compete and earn rewards\n\n' +
                    '*Choose your path below:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Dungeonites Heroes Challenge • Adventure Begins Here' })
                .setTimestamp();

            const createProfileButton = new ButtonBuilder()
                .setCustomId('player_create_profile')
                .setLabel('🆕 Create Profile')
                .setStyle(ButtonStyle.Success);

            const loginButton = new ButtonBuilder()
                .setCustomId('player_login')
                .setLabel('🔐 Login')
                .setStyle(ButtonStyle.Primary);

            const tutorialButton = new ButtonBuilder()
                .setCustomId('player_tutorial')
                .setLabel('📚 Tutorial')
                .setStyle(ButtonStyle.Secondary);

            const helpButton = new ButtonBuilder()
                .setCustomId('player_help')
                .setLabel('❓ Help')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createProfileButton, loginButton, tutorialButton, helpButton);

            const message = await channel.send({
                embeds: [embed],
                components: [row]
            });

            logger.info(`Player Start Here embed created in ${channel.name} by ${user.username}`);
            return message;

        } catch (error) {
            logger.error('Error creating player start here embed:', error);
            throw error;
        }
    }



    /**
     * Handle create new category
     */
    static async handleCreateCategory(interaction, setupType) {
        try {
            // EMERGENCY FIX: Clean up any wrong "Bot Management" category first
            const wrongCategory = interaction.guild.channels.cache.find(
                channel => channel.type === 4 && channel.name === 'Bot Management'
            );
            if (wrongCategory) {
                await wrongCategory.delete('Removing incorrectly created Bot Management category');
                logger.info(`Cleaned up wrong Bot Management category in ${interaction.guild.name}`);
            }
            
            // Create new category - FIXED: Always use 'Dungeonites' for game-related setups
            const categoryName = 'Dungeonites';
            
            const category = await interaction.guild.channels.create({
                name: categoryName,
                type: 4, // Category channel
                reason: `${setupType} dashboard setup - New category created`
            });

            logger.info(`Created ${categoryName} category for ${setupType} setup in ${interaction.guild.name}`);

            // Proceed to channel selection based on setup type
            if (setupType === 'admin') {
                // Full admin setup - needs both Admin Dashboard and Start Here
                await this.showChannelSelection(interaction, setupType, category.id, 'admin_dashboard');
            } else if (setupType === 'admin_dashboard_only') {
                await this.showChannelSelection(interaction, setupType, category.id, 'admin_dashboard');
            } else if (setupType === 'start_here_only') {
                await this.showChannelSelection(interaction, setupType, category.id, 'start_here');
            } else if (setupType === 'admin_quick') {
                await this.showChannelSelection(interaction, setupType, category.id, 'start_here');
            } else if (setupType === 'master' || setupType === 'master_quick' || setupType === 'master_custom') {
                // Bot Dev Master Dashboard setup
                await this.showChannelSelection(interaction, setupType, category.id, 'master_dashboard');
            }

        } catch (error) {
            logger.error('Error creating category:', error);
            await interaction.update({
                content: '❌ Error creating category. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle existing category selection
     */
    static async handleExistingCategory(interaction, setupType) {
        try {
            // Get all categories in the server
            const categories = interaction.guild.channels.cache.filter(channel => channel.type === 4);
            
            if (categories.size === 0) {
                await interaction.update({
                    content: '❌ No categories found in this server. Please create a new category instead.',
                    embeds: [],
                    components: []
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📁 **SELECT EXISTING CATEGORY** 📁')
                .setDescription(
                    '**Choose Category for Dashboard Channels**\n\n' +
                    'Select which category should contain your dashboard channels:\n\n' +
                    '*Use the dropdown below to select a category:*'
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'Dashboard Setup • Category Selection' })
                .setTimestamp();

            // Create dropdown with categories
            const categoryOptions = categories.map(category => ({
                label: category.name,
                value: `category:${category.id}:${setupType}`,
                description: `Use ${category.name} category`
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_existing_category')
                .setPlaceholder('Choose a category...')
                .addOptions(categoryOptions.slice(0, 25)); // Discord limit

            const backButton = new ButtonBuilder()
                .setCustomId(`${setupType}_back_to_category`)
                .setLabel('🔙 Back')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(backButton);

            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            logger.error('Error showing existing categories:', error);
            await interaction.update({
                content: '❌ Error loading categories. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Admin Setup Full button - NEW DASHBOARD SYSTEM
     */
    static async handleAdminSetupFull(interaction) {
        try {
            // Step 1: Category Selection
            await this.showCategorySelection(interaction, 'admin');
        } catch (error) {
            logger.error('Error handling admin setup full:', error);
            await interaction.reply({
                content: '❌ Error starting admin setup.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Admin Setup Quick button - Start Here Only
     */
    static async handleAdminSetupQuick(interaction) {
        try {
            // Quick setup = Just Start Here embed for players
            await this.showCategorySelection(interaction, 'admin_quick');
        } catch (error) {
            logger.error('Error handling admin setup quick:', error);
            await interaction.reply({
                content: '❌ Error starting quick setup.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Admin Setup Custom button - Choose Individual Components
     */
    static async handleAdminSetupCustom(interaction) {
        try {
            // Custom setup = Choose which embeds to install
            await this.showCustomSetupOptions(interaction);
        } catch (error) {
            logger.error('Error handling admin setup custom:', error);
            await interaction.reply({
                content: '❌ Error starting custom setup.',
                ephemeral: true
            });
        }
    }

    /**
     * Show custom setup component selection
     */
    static async showCustomSetupOptions(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎛️ **CUSTOM SETUP OPTIONS** 🎛️')
                .setDescription(
                    '**Choose Components to Install**\n\n' +
                    '**Available Dashboard Embeds:**\n' +
                    '⚙️ **Admin Dashboard** - Admin management and controls\n' +
                    '🎮 **Start Here** - Player entry point and registration\n\n' +
                    '**Installation Options:**\n' +
                    '🔧 **Admin Dashboard Only** - Management interface only\n' +
                    '🎮 **Start Here Only** - Player entry point only\n' +
                    '✅ **Both Dashboards** - Complete admin setup\n\n' +
                    '*Select what you want to install:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Custom Setup • Component Selection' })
                .setTimestamp();

            const adminOnlyButton = new ButtonBuilder()
                .setCustomId('admin_custom_admin_only')
                .setLabel('⚙️ Admin Dashboard Only')
                .setStyle(ButtonStyle.Primary);

            const startHereOnlyButton = new ButtonBuilder()
                .setCustomId('admin_custom_start_here_only')
                .setLabel('🎮 Start Here Only')
                .setStyle(ButtonStyle.Primary);

            const bothButton = new ButtonBuilder()
                .setCustomId('admin_custom_both')
                .setLabel('✅ Both Dashboards')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId('admin_setup_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(adminOnlyButton, startHereOnlyButton, bothButton);
            const row2 = new ActionRowBuilder().addComponents(cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            logger.error('Error showing custom setup options:', error);
            await interaction.reply({
                content: '❌ Error showing custom options.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Admin Setup Cancel button
     */
    static async handleAdminSetupCancel(interaction) {
        try {
            await interaction.reply({
                content: '❌ **Setup Cancelled**\n\nReturning to admin dashboard...',
                ephemeral: true
            });
            
            // Optionally redirect back to admin dashboard
            setTimeout(async () => {
                await this.showAdminDashboard(interaction);
            }, 2000);
        } catch (error) {
            logger.error('Error handling admin setup cancel:', error);
            await interaction.reply({
                content: '❌ Error cancelling setup.',
                ephemeral: true
            });
        }
    }

    /**
     * Show category selection for dashboard setup
     */
    static async showCategorySelection(interaction, setupType) {
        try {
            const embed = new EmbedBuilder()
                .setTitle(`📂 **CATEGORY SETUP** 📂`)
                .setDescription(
                    `**${setupType === 'admin' ? 'Admin' : 'Bot Developer'} Dashboard Setup**\n\n` +
                    '**Step 1: Choose Category**\n\n' +
                    '**Options:**\n' +
                    '🆕 **Create New Category** - Create a fresh category for dashboards\n' +
                    '📁 **Use Existing Category** - Select from your server\'s existing categories\n\n' +
                    '*Choose how you want to organize your dashboard channels:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Dashboard Setup • Category Selection' })
                .setTimestamp();

            const createButton = new ButtonBuilder()
                .setCustomId(`${setupType}_create_category`)
                .setLabel('🆕 Create New Category')
                .setStyle(ButtonStyle.Success);

            const existingButton = new ButtonBuilder()
                .setCustomId(`${setupType}_existing_category`)
                .setLabel('📁 Use Existing Category')
                .setStyle(ButtonStyle.Primary);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`${setupType}_setup_cancel`)
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(createButton, existingButton, cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing category selection:', error);
            await interaction.reply({
                content: '❌ Error showing category options.',
                ephemeral: true
            });
        }
    }

    /**
     * Show channel selection for specific embed type
     */
    static async showChannelSelection(interaction, setupType, categoryId, embedType) {
        try {
            const embedNames = {
                'admin_dashboard': 'Admin Dashboard',
                'start_here': 'Start Here (Player Entry)',
                'master_dashboard': 'Master Dashboard'
            };

            const embed = new EmbedBuilder()
                .setTitle(`📺 **CHANNEL SETUP** 📺`)
                .setDescription(
                    `**${embedNames[embedType]} Setup**\n\n` +
                    '**Step 2: Choose Channel**\n\n' +
                    '**Options:**\n' +
                    `🆕 **Create New Channel** - Create fresh channel for ${embedNames[embedType]}\n` +
                    `📺 **Use Existing Channel** - Select from existing channels\n\n` +
                    `*Choose where to place your ${embedNames[embedType]} embed:*`
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Dashboard Setup • Channel Selection' })
                .setTimestamp();

            const createButton = new ButtonBuilder()
                .setCustomId(`${setupType}_create_channel_${embedType}_${categoryId}`)
                .setLabel('🆕 Create New Channel')
                .setStyle(ButtonStyle.Success);

            const existingButton = new ButtonBuilder()
                .setCustomId(`${setupType}_existing_channel_${embedType}_${categoryId}`)
                .setLabel('📺 Use Existing Channel')
                .setStyle(ButtonStyle.Primary);

            const backButton = new ButtonBuilder()
                .setCustomId(`${setupType}_back_to_category`)
                .setLabel('🔙 Back to Category')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createButton, existingButton, backButton);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing channel selection:', error);
            await interaction.reply({
                content: '❌ Error showing channel options.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle category selection from dropdown
     */
    static async handleCategorySelection(interaction, selectedValue) {
        try {
            // Parse selected value: "category:categoryId:setupType"
            const [type, categoryId, setupType] = selectedValue.split(':');
            
            if (type !== 'category') {
                throw new Error('Invalid selection format');
            }

            // Proceed to channel selection based on setup type
            if (setupType === 'admin') {
                // Full admin setup - needs both Admin Dashboard and Start Here
                await this.showChannelSelection(interaction, setupType, categoryId, 'admin_dashboard');
            } else if (setupType === 'admin_dashboard_only') {
                await this.showChannelSelection(interaction, setupType, categoryId, 'admin_dashboard');
            } else if (setupType === 'start_here_only') {
                await this.showChannelSelection(interaction, setupType, categoryId, 'start_here');
            } else if (setupType === 'admin_quick') {
                await this.showChannelSelection(interaction, setupType, categoryId, 'start_here');
            } else if (setupType === 'master' || setupType === 'master_quick' || setupType === 'master_custom') {
                // Bot Dev Master Dashboard setup
                await this.showChannelSelection(interaction, setupType, categoryId, 'master_dashboard');
            }

        } catch (error) {
            logger.error('Error handling category selection:', error);
            await interaction.update({
                content: '❌ Error processing category selection. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle channel selection from dropdown
     */
    static async handleChannelSelectionDropdown(interaction, selectedValue) {
        try {
            // Parse selected value: "channel:channelId:setupType:embedType"
            const [type, channelId, setupType, embedType] = selectedValue.split(':');
            
            if (type !== 'channel') {
                throw new Error('Invalid selection format');
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                await interaction.update({
                    content: '❌ Selected channel not found. Please try again.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Create the appropriate embed in the selected channel
            await this.createEmbedInChannel(channel, embedType, interaction.user);

            // Show success and next steps
            await this.showSetupProgress(interaction, setupType, embedType, channel);

        } catch (error) {
            logger.error('Error handling channel selection dropdown:', error);
            await interaction.update({
                content: '❌ Error processing channel selection. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Clean up existing channels of the same type to prevent duplicates
     */
    static async cleanupExistingChannels(guild, categoryId, embedType) {
        try {
            const channelPatternsToClean = {
                'admin_dashboard': ['⚙️│admin-start-here', 'admin-start-here'],
                'start_here': ['🎮│start-here', 'start-here'],
                'master_dashboard': ['🔧│master-dashboard', 'master-dashboard']
            };

            const patterns = channelPatternsToClean[embedType];
            if (!patterns) return;

            const category = await guild.channels.fetch(categoryId);
            if (!category) return;

            // Find and delete existing channels with matching names
            const channelsToDelete = guild.channels.cache.filter(channel => 
                channel.parentId === categoryId && 
                patterns.some(pattern => channel.name.includes(pattern.replace(/[⚙️🎮🔧│]/g, '').toLowerCase()))
            );

            for (const [channelId, channel] of channelsToDelete) {
                try {
                    await channel.delete(`Cleanup: Replacing with new ${embedType} channel`);
                    logger.info(`Cleaned up old ${embedType} channel: ${channel.name}`);
                } catch (error) {
                    logger.warn(`Could not delete old channel ${channel.name}:`, error.message);
                }
            }

        } catch (error) {
            logger.warn('Error during channel cleanup:', error);
            // Don't throw - continue with channel creation even if cleanup fails
        }
    }

    /**
     * Handle custom setup buttons (Admin Dashboard Only, Start Here Only, etc.)
     */
    static async handleCustomSetupButton(interaction, customId) {
        try {
            // Parse the button customId to determine setup type
            const setupTypeMap = {
                'start_here_only_existing_category': { setupType: 'start_here_only', action: 'existing_category' },
                'start_here_only_create_category': { setupType: 'start_here_only', action: 'create_category' },
                'admin_dashboard_only_existing_category': { setupType: 'admin_dashboard_only', action: 'existing_category' },
                'admin_dashboard_only_create_category': { setupType: 'admin_dashboard_only', action: 'create_category' },
                'master_custom_existing_category': { setupType: 'master_custom', action: 'existing_category' },
                'master_custom_create_category': { setupType: 'master_custom', action: 'create_category' },
                'master_custom_setup_cancel': { setupType: 'master_custom', action: 'cancel' }
            };

            const config = setupTypeMap[customId];
            if (!config) {
                throw new Error(`Unknown custom setup button: ${customId}`);
            }

            const { setupType, action } = config;

            if (action === 'create_category') {
                // Create new category
                await this.handleCreateCategory(interaction, setupType);
            } else if (action === 'existing_category') {
                // Show existing category selection
                await this.showCategorySelection(interaction, setupType);
            } else if (action === 'cancel') {
                // Cancel setup and return to previous menu
                await interaction.update({
                    content: '❌ Setup cancelled. Returning to dashboard...',
                    embeds: [],
                    components: []
                });
                // Could redirect back to the main dashboard here if needed
            }

        } catch (error) {
            logger.error('Error handling custom setup button:', error);
            await interaction.update({
                content: '❌ Error processing setup option. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle channel creation
     */
    static async handleCreateChannel(interaction, customId) {
        try {
            // Parse customId to get setupType, embedType, and categoryId
            // Format: "admin_create_channel_admin_dashboard_categoryId" or "master_create_channel_master_dashboard_categoryId"
            const parts = customId.split('_');
            const setupType = parts[0]; // admin or master
            const categoryId = parts[parts.length - 1]; // Last part is category ID
            
            // Reconstruct embedType (everything between setupType and categoryId)
            const embedTypeParts = parts.slice(3, -1);
            const embedType = embedTypeParts.join('_'); // admin_dashboard, start_here, master_dashboard
            
            if (!categoryId || categoryId === setupType) {
                await interaction.update({
                    content: '❌ Category information lost. Please start setup again.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Create channel names based on embed type
            const channelNames = {
                'admin_dashboard': '⚙️│admin-start-here',
                'start_here': '🎮│start-here',
                'master_dashboard': '⚔️│master-dashboard'
            };

            const channelName = channelNames[embedType];
            if (!channelName) {
                throw new Error(`Unknown embed type: ${embedType}`);
            }

            // Clean up existing channels of the same type in this category before creating new one
            await this.cleanupExistingChannels(interaction.guild, categoryId, embedType);

            // Create the channel
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: 0, // Text channel
                parent: categoryId,
                reason: `Dashboard setup - ${embedType} channel created`,
                permissionOverwrites: embedType === 'master_dashboard' ? [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.user.id, // Bot Developer
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    },
                    {
                        id: interaction.client.user.id, // Bot
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory']
                    }
                ] : [
                    {
                        id: interaction.client.user.id, // Bot
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory']
                    }
                ]
            });

            // Create the appropriate embed in the channel
            await this.createEmbedInChannel(channel, embedType, interaction.user);

            // Show success and next steps
            await this.showSetupProgress(interaction, setupType, embedType, channel);

        } catch (error) {
            logger.error('Error creating channel:', error);
            await interaction.update({
                content: '❌ Error creating channel. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle existing channel selection
     */
    static async handleExistingChannel(interaction, customId) {
        try {
            // Show channel selection dropdown
            const parts = customId.split('_');
            const setupType = parts[0]; // admin or master
            const categoryId = parts[parts.length - 1]; // Last part is category ID
            
            // Reconstruct embedType (everything between setupType and categoryId)
            const embedTypeParts = parts.slice(3, -1);
            const embedType = embedTypeParts.join('_'); // admin_dashboard, start_here, master_dashboard
            
            // Get all text channels
            const textChannels = interaction.guild.channels.cache.filter(channel => channel.type === 0);
            
            if (textChannels.size === 0) {
                await interaction.update({
                    content: '❌ No text channels found. Please create a new channel instead.',
                    embeds: [],
                    components: []
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📺 **SELECT EXISTING CHANNEL** 📺')
                .setDescription(
                    `**Choose Channel for ${embedType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}**\n\n` +
                    'Select which channel should contain your dashboard embed:\n\n' +
                    '*Use the dropdown below to select a channel:*'
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'Dashboard Setup • Channel Selection' })
                .setTimestamp();

            // Create dropdown with channels
            const channelOptions = textChannels.map(channel => ({
                label: `#${channel.name}`,
                value: `channel:${channel.id}:${setupType}:${embedType}`,
                description: `Use #${channel.name} channel`
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_existing_channel')
                .setPlaceholder('Choose a channel...')
                .addOptions(channelOptions.slice(0, 25)); // Discord limit

            const backButton = new ButtonBuilder()
                .setCustomId(`${setupType}_back_to_category`)
                .setLabel('🔙 Back')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(backButton);

            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            logger.error('Error showing existing channels:', error);
            await interaction.update({
                content: '❌ Error loading channels. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Create embed in specified channel
     */
    static async createEmbedInChannel(channel, embedType, user) {
        try {
            switch (embedType) {
                case 'admin_dashboard':
                    await this.createAdminStartHereEmbed(channel, user);
                    break;
                case 'start_here':
                    await this.createPlayerStartHereEmbed(channel, user);
                    break;
                case 'master_dashboard':
                    await this.createBotDevDashboardEmbed(channel, user);
                    break;
                default:
                    throw new Error(`Unknown embed type: ${embedType}`);
            }
        } catch (error) {
            logger.error(`Error creating ${embedType} embed:`, error);
            throw error;
        }
    }

    /**
     * Show setup progress and next steps
     */
    static async showSetupProgress(interaction, setupType, embedType, channel) {
        try {
            const embedNames = {
                'admin_dashboard': 'Admin Dashboard',
                'start_here': 'Start Here (Player Entry)',
                'master_dashboard': 'Master Dashboard'
            };

            // For FULL admin setup, automatically create the Start Here channel too
            if (setupType === 'admin' && embedType === 'admin_dashboard') {
                try {
                    // Get the category from the admin channel we just created
                    const categoryId = channel.parentId;
                    
                    // Create the Start Here channel
                    const startHereChannel = await interaction.guild.channels.create({
                        name: '🎮│start-here',
                        type: 0, // Text channel
                        parent: categoryId,
                        reason: 'Full admin setup - Start Here channel created',
                        permissionOverwrites: [
                            {
                                id: interaction.client.user.id, // Bot
                                allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory']
                            }
                        ]
                    });

                    // Create the Start Here embed
                    await this.createPlayerStartHereEmbed(startHereChannel, interaction.user);

                    const embed = new EmbedBuilder()
                        .setTitle('🎉 **FULL SETUP COMPLETE** 🎉')
                        .setDescription(
                            `**Both Dashboards Successfully Deployed!**\n\n` +
                            `✅ **Admin Dashboard**: ${channel}\n` +
                            `✅ **Player Start Here**: ${startHereChannel}\n\n` +
                            `**Setup Summary:**\n` +
                            `⚙️ **Admin Dashboard** - Server management and controls\n` +
                            `🎮 **Start Here** - Player entry point and gameplay\n\n` +
                            `🎉 **Your server is now ready for players!**\n\n` +
                            `**Admin Access:** Use ${channel} for server management\n` +
                            `**Player Access:** Direct players to ${startHereChannel}`
                        )
                        .setColor(0x00ff00)
                        .setFooter({ text: 'Full Setup Complete • Ready for Adventure!' })
                        .setTimestamp();

                    const finishButton = new ButtonBuilder()
                        .setCustomId('setup_complete')
                        .setLabel('🎉 Setup Complete')
                        .setStyle(ButtonStyle.Success);

                    const row = new ActionRowBuilder().addComponents(finishButton);

                    await interaction.update({
                        embeds: [embed],
                        components: [row]
                    });

                    logger.info(`Full admin setup complete: Admin channel ${channel.name} and Start Here channel ${startHereChannel.name} created`);
                    return;

                } catch (error) {
                    logger.error('Error creating Start Here channel during full setup:', error);
                    // Fall through to single channel success message
                }
            }

            // Single channel success message (for other setup types or if Start Here creation failed)
            const embed = new EmbedBuilder()
                .setTitle('✅ **CHANNEL CREATED SUCCESSFULLY** ✅')
                .setDescription(
                    `**${embedNames[embedType]} Setup Complete!**\n\n` +
                    `✅ **Channel Created**: ${channel}\n` +
                    `✅ **Embed Deployed**: ${embedNames[embedType]}\n` +
                    `✅ **Status**: Ready for use\n\n` +
                    `**Next Steps:**\n` +
                    (setupType === 'admin' && embedType === 'admin_dashboard' 
                        ? '📋 Now set up the **Start Here** channel for players' 
                        : '🎉 **Setup Complete!** Your dashboard is ready to use.') +
                    `\n\n**Dashboard Location:** ${channel}`
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Dashboard Setup • Success' })
                .setTimestamp();

            const buttons = [];
            
            if (setupType === 'admin' && embedType === 'admin_dashboard') {
                // Admin setup needs Start Here next
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('admin_setup_start_here_next')
                        .setLabel('🎮 Set Up Start Here')
                        .setStyle(ButtonStyle.Primary)
                );
            }
            
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('setup_complete')
                    .setLabel('🎉 Finish Setup')
                    .setStyle(ButtonStyle.Success)
            );

            const row = new ActionRowBuilder().addComponents(...buttons);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing setup progress:', error);
            await interaction.update({
                content: '✅ Channel created successfully! Setup complete.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show player tutorial information
     */
    static async showPlayerTutorial(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📚 **GAME TUTORIAL** 📚')
                .setDescription(
                    '**Welcome to Dungeonites Heroes Challenge!**\n\n' +
                    '**Getting Started:**\n' +
                    '1. **Create Profile** - Secure your progress\n' +
                    '2. **Choose Division** - Start with Gold (free)\n' +
                    '3. **Select Hero** - Each has unique abilities\n' +
                    '4. **Enter Dungeon** - Begin your adventure\n\n' +
                    '**Game Features:**\n' +
                    '⚔️ **Combat** - Turn-based strategic battles\n' +
                    '🎒 **Inventory** - Collect weapons, armor, items\n' +
                    '🏪 **Marketplace** - Trade with other players\n' +
                    '📜 **Quests** - Complete daily challenges\n' +
                    '🎰 **Casino** - Try your luck for rewards\n\n' +
                    '**Economy Tiers:**\n' +
                    '🪙 Gold → 🎫 Tokens → 💎 $DNG → 🏆 $HERO → ⚡ $ETH\n\n' +
                    '**Ready to start? Create your profile above!**'
                )
                .setColor(0x8B4513)
                .setFooter({ text: 'Game Tutorial • Learn the Basics' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error showing player tutorial:', error);
            await interaction.reply({
                content: '❌ Error loading tutorial. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle admin password authentication
     */
    static async handleAdminPasswordAuth(interaction) {
        try {
            // Delegate to existing authentication system
            const { AdminHandler } = await import('../admin/AdminHandler.js');
            await AdminHandler.showPasswordModal(interaction, 'admin');
        } catch (error) {
            logger.error('Error handling admin password auth:', error);
            await interaction.reply({
                content: '❌ Error showing password authentication. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle admin forgot password
     */
    static async handleAdminForgotPassword(interaction) {
        try {
            await interaction.reply({
                content: '🔐 **Password Recovery**\n\nPassword recovery functionality is coming soon. Please contact an administrator for assistance.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error handling admin forgot password:', error);
            await interaction.reply({
                content: '❌ Error accessing password recovery. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle player password authentication
     */
    static async handlePlayerPasswordAuth(interaction) {
        try {
            // Delegate to existing authentication system
            const { UserProfileHandler } = await import('../user/UserProfileHandler.js');
            await UserProfileHandler.showPasswordModal(interaction, 'player');
        } catch (error) {
            logger.error('Error handling player password auth:', error);
            await interaction.reply({
                content: '❌ Error showing password authentication. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle player smart login - FIXED: Use working smart login from UserProfileHandler
     */
    static async handlePlayerSmartLogin(interaction) {
        try {
            const { UserProfileHandler } = await import('../user/UserProfileHandler.js');
            await UserProfileHandler.handleSmartLogin(interaction);
        } catch (error) {
            logger.error('Error handling player smart login:', error);
            await interaction.reply({
                content: '❌ Error accessing smart login. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle player forgot password
     */
    static async handlePlayerForgotPassword(interaction) {
        try {
            await interaction.reply({
                content: '🔐 **Password Recovery**\n\nPassword recovery functionality is coming soon. Please contact an administrator for assistance.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error handling player forgot password:', error);
            await interaction.reply({
                content: '❌ Error accessing password recovery. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle player logout
     */
    static async handlePlayerLogout(interaction) {
        try {
            // Delegate to existing authentication system
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            await AuthenticationManager.logout(interaction.user.id);
            await interaction.reply({
                content: '🚪 **Logged Out Successfully**\n\nYou have been logged out of your player account. Use the login button to access your account again.',
                ephemeral: true
            });
        } catch (error) {
            logger.error('Error handling player logout:', error);
            await interaction.reply({
                content: '❌ Error logging out. Please try again.',
                ephemeral: true
            });
        }
    }
} 