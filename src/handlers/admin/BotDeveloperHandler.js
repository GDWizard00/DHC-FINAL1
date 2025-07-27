import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import crypto from 'crypto';

/**
 * BotDeveloperHandler - Master control system for Bot Developer (gdwizard)
 * Provides ultimate override controls across all servers with multi-factor security
 */
export class BotDeveloperHandler {
    static BOT_DEVELOPER_ID = '292854498299346945'; // gdwizard's Discord ID
    static WIFE_ACCOUNT_USERNAME = '.honeyb'; // Wife's Discord username for verification
    static DEVELOPER_WALLET = 'gdwizard.eth'; // Developer's ENS address
    static SESSION_DURATION = 60 * 60 * 1000; // 1 hour for master sessions
    
    static masterSessions = new Map(); // Per-user authenticated sessions (userId -> session)
    static emergencyMode = false; // Emergency override status
    static verificationAttempts = new Map(); // Rate limiting for security (userId -> attempts)

    /**
     * Initialize Bot Developer system
     */
    static async initialize() {
        try {
            // Check if master profile exists
            const masterProfile = await this.getMasterProfile();
            if (!masterProfile) {
                logger.warn('Bot Developer master profile not found - DM setup required');
            } else {
                logger.info('Bot Developer master profile loaded successfully');
            }
        } catch (error) {
            logger.error('Error initializing Bot Developer system:', error);
        }
    }

    /**
     * Check if user is the Bot Developer
     */
    static isBotDeveloper(userId) {
        return userId === this.BOT_DEVELOPER_ID;
    }

    /**
     * Check if Bot Developer is currently authenticated
     */
    static isAuthenticated(userId = this.BOT_DEVELOPER_ID) {
        const userSession = this.masterSessions.get(userId);
        if (!userSession) return false;
        if (Date.now() > userSession.expiresAt) {
            this.masterSessions.delete(userId);
            return false;
        }
        return true;
    }

    /**
     * Handle Bot Developer commands (cross-server)
     */
    static async handleMasterCommand(interaction) {
        try {
            if (!this.isBotDeveloper(interaction.user.id)) {
                await interaction.reply({
                    content: '❌ Access denied. This command is restricted to the Bot Developer.',
                    ephemeral: true
                });
                return;
            }

            // Check if master profile exists
            const masterProfile = await this.getMasterProfile();
            if (!masterProfile) {
                await this.initiateFirstTimeSetup(interaction);
                return;
            }

            // Check authentication
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            // Show master control panel
            await this.showMasterControlPanel(interaction);

        } catch (error) {
            logger.error('Error handling master command:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Error processing master command.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                logger.error('Failed to send error reply:', replyError);
            }
        }
    }

    /**
     * Initiate first-time setup with DM
     */
    static async initiateFirstTimeSetup(interaction) {
        try {
            // First, reply in server to acknowledge
            await interaction.reply({
                content: '📧 **Setup Required** - Check your DMs for Bot Developer setup instructions!',
                ephemeral: true
            });

            // Create DM embed
            const embed = new EmbedBuilder()
                .setTitle('🔐 **BOT DEVELOPER SETUP REQUIRED** 🔐')
                .setDescription(
                    '**Master Profile Not Found**\n\n' +
                    '⚠️ **SECURITY NOTICE**: Complete your Bot Developer security profile.\n\n' +
                    '**Setup includes:**\n' +
                    '• Master password creation (12+ characters)\n' +
                    '• Multi-factor recovery methods\n' +
                    '• Cross-server override configuration\n' +
                    '• Emergency access protocols\n\n' +
                    '*Click "Begin Setup" to continue...*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Bot Developer Security System' })
                .setTimestamp();

            const button = new ButtonBuilder()
                .setCustomId('master_setup_begin')
                .setLabel('🔧 Begin Setup')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            // Send DM to user
            try {
                const dmChannel = await interaction.user.createDM();
                await dmChannel.send({
                    embeds: [embed],
                    components: [row]
                });
                logger.info(`Bot Developer setup DM sent successfully to ${interaction.user.username}`);
            } catch (dmError) {
                logger.error('Failed to send DM, falling back to ephemeral reply:', dmError);
                // Fallback to ephemeral reply if DM fails
                await interaction.editReply({
                    content: '❌ **DM Failed** - Please enable DMs from server members.\n\n**Alternative**: Use setup in server below:',
                    embeds: [embed],
                    components: [row]
                });
            }

        } catch (error) {
            logger.error('Error initiating first-time setup:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ Error initiating setup. Please try `/master` again.',
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: '❌ Error initiating setup. Please try `/master` again.'
                    });
                }
            } catch (replyError) {
                logger.error('Failed to send error reply:', replyError);
            }
        }
    }



    /**
     * Handle secure setup button click
     */
    static async handleSetupBegin(interaction) {
        try {
            logger.info('Bot Developer setup begin - Creating comprehensive security modal for user:', interaction.user.id);
            
            const modal = new ModalBuilder()
                .setCustomId('master_security_profile_setup')
                .setTitle('Bot Developer Security Profile');

            const passwordInput = new TextInputBuilder()
                .setCustomId('master_password')
                .setLabel('Master Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(12)
                .setMaxLength(100)
                .setPlaceholder('Create a strong master password (12+ characters)...');

            const confirmPasswordInput = new TextInputBuilder()
                .setCustomId('confirm_password')
                .setLabel('Confirm Master Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(12)
                .setMaxLength(100)
                .setPlaceholder('Confirm your master password...');

            const xAccountInput = new TextInputBuilder()
                .setCustomId('x_account')
                .setLabel('X (Twitter) Username (for recovery)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(50)
                .setPlaceholder('Your X/Twitter username (without @)...');

            const walletInput = new TextInputBuilder()
                .setCustomId('evm_wallet')
                .setLabel('EVM Wallet Address (for recovery)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMinLength(42)
                .setMaxLength(42)
                .setPlaceholder('0x... (your Ethereum wallet address)...');

            const emailInput = new TextInputBuilder()
                .setCustomId('email_address')
                .setLabel('Email Address (for recovery)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(255)
                .setPlaceholder('your-email@example.com...');

            const row1 = new ActionRowBuilder().addComponents(passwordInput);
            const row2 = new ActionRowBuilder().addComponents(confirmPasswordInput);
            const row3 = new ActionRowBuilder().addComponents(xAccountInput);
            const row4 = new ActionRowBuilder().addComponents(walletInput);
            const row5 = new ActionRowBuilder().addComponents(emailInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            logger.info('Comprehensive security modal created successfully, showing to user:', interaction.user.id);
            await interaction.showModal(modal);
            logger.info('Security modal shown successfully to user:', interaction.user.id);

        } catch (error) {
            logger.error('Error showing security setup modal:', error);
            logger.error('Modal error details:', {
                message: error.message,
                stack: error.stack,
                user: interaction.user.id
            });
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Error showing security profile form. Please check console logs.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                logger.error('Error sending error reply:', replyError);
            }
        }
    }

    /**
     * Handle master security profile setup submission
     */
    static async handleSecurityProfileSetup(interaction) {
        try {
            const masterPassword = interaction.fields.getTextInputValue('master_password');
            const confirmPassword = interaction.fields.getTextInputValue('confirm_password');
            const xAccount = interaction.fields.getTextInputValue('x_account') || null;
            const evmWallet = interaction.fields.getTextInputValue('evm_wallet') || null;
            const emailAddress = interaction.fields.getTextInputValue('email_address') || null;

            // Validate password
            if (masterPassword !== confirmPassword) {
                await interaction.reply({
                    content: '❌ Passwords do not match. Please try again.',
                    ephemeral: true
                });
                return;
            }

            if (masterPassword.length < 12) {
                await interaction.reply({
                    content: '❌ Password must be at least 12 characters long.',
                    ephemeral: true
                });
                return;
            }

            // Count recovery methods provided (excluding password)
            const recoveryMethods = [];
            if (xAccount && xAccount.trim()) recoveryMethods.push('x_account');
            if (evmWallet && evmWallet.trim()) recoveryMethods.push('evm_wallet');
            if (emailAddress && emailAddress.trim()) recoveryMethods.push('email');

            // Require at least 3 of 4 recovery options (excluding password)
            if (recoveryMethods.length < 3) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ **INSUFFICIENT RECOVERY METHODS** ❌')
                    .setDescription(
                        '**Security Validation Failed**\n\n' +
                        '⚠️ **Minimum 3 recovery methods required** (excluding password)\n\n' +
                        '**Recovery Methods Provided:** ' + recoveryMethods.length + '/3\n\n' +
                        '**Required Recovery Options:**\n' +
                        '🐦 X (Twitter) account' + (xAccount && xAccount.trim() ? ' ✅' : ' ❌') + '\n' +
                        '💎 EVM wallet address' + (evmWallet && evmWallet.trim() ? ' ✅' : ' ❌') + '\n' +
                        '📧 Email address' + (emailAddress && emailAddress.trim() ? ' ✅' : ' ❌') + '\n\n' +
                        '*Please provide at least 3 recovery methods for account security.*'
                    )
                    .setColor(0xff0000)
                    .setFooter({ text: 'Security Profile Setup • Recovery Methods Required' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
                return;
            }

            // Validate EVM wallet format if provided
            if (evmWallet && evmWallet.trim() && (!evmWallet.startsWith('0x') || evmWallet.length !== 42)) {
                await interaction.reply({
                    content: '❌ Invalid EVM wallet address format. Must be 42 characters starting with 0x.',
                    ephemeral: true
                });
                return;
            }

            // Validate email format if provided
            if (emailAddress && emailAddress.trim() && !emailAddress.includes('@')) {
                await interaction.reply({
                    content: '❌ Invalid email address format.',
                    ephemeral: true
                });
                return;
            }

            // Create master profile with recovery methods
            const hashedPassword = crypto.createHash('sha256').update(masterPassword).digest('hex');
            const masterProfile = {
                userId: this.BOT_DEVELOPER_ID,
                username: interaction.user.username,
                passwordHash: hashedPassword,
                recoveryMethods: {
                    xAccount: xAccount && xAccount.trim() ? xAccount.trim() : null,
                    evmWallet: evmWallet && evmWallet.trim() ? evmWallet.trim() : null,
                    email: emailAddress && emailAddress.trim() ? emailAddress.trim() : null
                },
                verificationMethods: {
                    twitter: { 
                        enabled: !!(xAccount && xAccount.trim()), 
                        username: xAccount && xAccount.trim() ? xAccount.trim() : null,
                        verified: false 
                    },
                    crypto: { 
                        enabled: !!(evmWallet && evmWallet.trim()), 
                        wallet: evmWallet && evmWallet.trim() ? evmWallet.trim() : this.DEVELOPER_WALLET,
                        verified: false 
                    },
                    email: {
                        enabled: !!(emailAddress && emailAddress.trim()),
                        address: emailAddress && emailAddress.trim() ? emailAddress.trim() : null,
                        verified: false
                    }
                },
                permissions: {
                    crossServerAccess: true,
                    emergencyOverride: true,
                    masterCommands: true,
                    passwordReset: true,
                    userManagement: true,
                    economyControl: true,
                    serverSettings: true
                },
                createdAt: new Date().toISOString(),
                lastLogin: null
                // Note: loginHistory removed for SQLite emergency fix compatibility
            };

            // Save to database
            await this.saveMasterProfile(masterProfile);

            // Build recovery methods display
            const recoveryMethodsDisplay = [];
            if (xAccount && xAccount.trim()) recoveryMethodsDisplay.push('🐦 X Account: ' + xAccount.trim());
            if (evmWallet && evmWallet.trim()) recoveryMethodsDisplay.push('💎 EVM Wallet: ' + evmWallet.trim().substring(0, 8) + '...');
            if (emailAddress && emailAddress.trim()) recoveryMethodsDisplay.push('📧 Email: ' + emailAddress.trim());

            // Confirmation embed
            const embed = new EmbedBuilder()
                .setTitle('✅ **MASTER PROFILE CREATED** ✅')
                .setDescription(
                    '**Bot Developer Profile Successfully Created!**\n\n' +
                    '🔐 **Master Password**: Configured\n' +
                    '🌐 **Cross-Server Access**: Enabled\n' +
                    '🚨 **Emergency Override**: Enabled\n\n' +
                    '**🔄 Recovery Methods Configured (' + recoveryMethods.length + '/3):**\n' +
                    recoveryMethodsDisplay.join('\n') + '\n\n' +
                    '**⚠️ IMPORTANT SECURITY REMINDERS:**\n' +
                    '• Save your password securely - resets require 2 recovery methods\n' +
                    '• Verify your recovery information is correct\n' +
                    '• You will need these for password recovery\n\n' +
                    '**Available Commands:**\n' +
                    '• `/master` - Access master control panel\n' +
                    '• `/emergency` - Enable emergency override mode\n' +
                    '• `/override <server>` - Override server settings\n' +
                    '• `/reset-owner <server>` - Reset server owner password\n\n' +
                    '**Security Features:**\n' +
                    '✅ Multi-factor password recovery (' + recoveryMethods.length + ' methods)\n' +
                    '✅ Cross-server administrative access\n' +
                    '✅ Emergency community assistance\n' +
                    '✅ Comprehensive audit logging\n\n' +
                    '*Your master profile is now active across all servers!*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Master Profile Active • Full Bot Control Enabled' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            auditLogger.log('MASTER_PROFILE', 'Bot Developer master profile created', 'profile_creation', {
                userId: this.BOT_DEVELOPER_ID,
                features: Object.keys(masterProfile.permissions || {}),
                timestamp: new Date()
            });

            logger.info('Bot Developer master profile created successfully');

        } catch (error) {
            logger.error('Error creating master profile:', error);
            await interaction.reply({
                content: '❌ Error creating master profile. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show master authentication screen
     */
    static async showMasterAuthentication(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔐 **MASTER AUTHENTICATION** 🔐')
                .setDescription(
                    '**Bot Developer Access Control**\n\n' +
                    '🛡️ **Security Level**: Maximum\n' +
                    '⏰ **Session Duration**: 1 hour\n' +
                    '🌐 **Access Scope**: All servers\n\n' +
                    '**Available Options:**\n' +
                    '🔑 Enter master password\n' +
                    '🔄 Reset password (multi-factor)\n' +
                    '🚨 Emergency access mode\n\n' +
                    '*Select authentication method:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Master Authentication • Cross-Server Control' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔑 Enter Master Password')
                    .setDescription('Standard authentication with master password')
                    .setValue('master_password_auth'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Reset Password')
                    .setDescription('Multi-factor password reset process')
                    .setValue('master_password_reset'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚨 Emergency Access')
                    .setDescription('Emergency override with extended verification')
                    .setValue('emergency_access')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_auth_method')
                .setPlaceholder('Select authentication method...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing master authentication:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Error loading authentication.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                logger.error('Failed to send authentication error reply:', replyError);
            }
        }
    }

    /**
     * Show master control panel
     */
    static async showMasterControlPanel(interaction, isEmergencyAccess = false) {
        try {
            const userSession = this.masterSessions.get(interaction.user.id);
            const sessionTime = userSession ? Math.ceil((userSession.expiresAt - Date.now()) / (1000 * 60)) : 0;
            const serverCount = interaction.client.guilds.cache.size;
            const authMethod = userSession?.method || 'unknown';
            const emergencyStatus = isEmergencyAccess || userSession?.isEmergency;

            const embed = new EmbedBuilder()
                .setTitle(emergencyStatus ? '🚨 **EMERGENCY MASTER CONTROL** 🚨' : '⚔️ **MASTER CONTROL PANEL** ⚔️')
                .setDescription(
                    `**Welcome, Bot Developer**\n\n` +
                    `🔐 **Session Status**: ${emergencyStatus ? 'Emergency Override' : 'Authenticated'}\n` +
                    `🔑 **Auth Method**: ${emergencyStatus ? 'Emergency Access' : authMethod}\n` +
                    `⏰ **Time Remaining**: ${sessionTime} minutes\n` +
                    `🌐 **Connected Servers**: ${serverCount}\n` +
                    `🚨 **Emergency Mode**: ${this.emergencyMode ? 'ACTIVE' : 'Standby'}\n\n` +
                    (emergencyStatus ? '⚠️ **WARNING: Emergency access active - All actions logged**\n\n' : '') +
                    '**Full Administrative Control:**\n' +
                    '🛠️ **Server Management** - Setup, channels, overrides\n' +
                    '👥 **User Management** - Profiles, recovery, support\n' +
                    '💰 **Financial Operations** - Refunds, transactions\n' +
                    '🚨 **Emergency Controls** - System overrides\n' +
                    '📊 **Analytics** - Cross-server statistics\n' +
                    '🔄 **System Tools** - Maintenance and updates\n\n' +
                    '*Select operation category:*'
                )
                .setColor(emergencyStatus ? 0xff6600 : 0xff0000)
                .setFooter({ text: emergencyStatus ? 'Emergency Override • All Actions Monitored' : 'Master Control • Ultimate Authority Active' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛠️ Server Management')
                    .setDescription('Bot setup, channels, server configuration')
                    .setValue('master_server_mgmt'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👥 User Management')
                    .setDescription('Profile management, account recovery, support')
                    .setValue('master_user_mgmt'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Financial Operations')
                    .setDescription('Refunds, transactions, economy override')
                    .setValue('master_financial'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚨 Emergency Controls')
                    .setDescription('System overrides, emergency shutdown')
                    .setValue('master_emergency'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Analytics')
                    .setDescription('Cross-server statistics and reports')
                    .setValue('master_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 System Tools')
                    .setDescription('Maintenance, updates, and diagnostics')
                    .setValue('master_system')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_control_panel')
                .setPlaceholder('Select control category...')
                .addOptions(options);

            const logoutButton = new ButtonBuilder()
                .setCustomId('master_logout')
                .setLabel('🚪 End Session')
                .setStyle(ButtonStyle.Secondary);

            const emergencyButton = new ButtonBuilder()
                .setCustomId('toggle_emergency')
                .setLabel(this.emergencyMode ? '🟢 Disable Emergency' : '🚨 Enable Emergency')
                .setStyle(this.emergencyMode ? ButtonStyle.Success : ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(logoutButton, emergencyButton);

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing master control panel:', error);
            await interaction.reply({
                content: '❌ Error loading master control panel.',
                ephemeral: true
            });
        }
    }

    /**
     * Get master profile from database - EMERGENCY FIX using SQLite ProfileDatabase
     */
    static async getMasterProfile() {
        try {
            // EMERGENCY FIX: Use SQLite ProfileDatabase instead of failing MongoDB
            const { profileDB } = await import('../../database/ProfileDatabase.js');
            return await profileDB.getMasterProfile(this.BOT_DEVELOPER_ID);
        } catch (error) {
            logger.error('Error getting master profile:', error);
            return null;
        }
    }

    /**
     * Save master profile to database - EMERGENCY FIX using SQLite ProfileDatabase
     */
    static async saveMasterProfile(profile) {
        try {
            // EMERGENCY FIX: Use SQLite ProfileDatabase instead of failing MongoDB
            const { profileDB } = await import('../../database/ProfileDatabase.js');
            await profileDB.saveMasterProfile(profile);
        } catch (error) {
            logger.error('Error saving master profile:', error);
            throw error;
        }
    }

    /**
     * Authenticate with master password - EMERGENCY FIX using SQLite ProfileDatabase
     */
    static async authenticateWithPassword(password, userId = this.BOT_DEVELOPER_ID) {
        try {
            const masterProfile = await this.getMasterProfile();
            if (!masterProfile) return false;

            // EMERGENCY FIX: Use ProfileDatabase.verifyPassword method
            const { profileDB } = await import('../../database/ProfileDatabase.js');
            if (profileDB.verifyPassword(masterProfile.passwordHash, password)) {
                this.masterSessions.set(userId, {
                    userId: userId,
                    authenticatedAt: new Date(),
                    expiresAt: new Date(Date.now() + this.SESSION_DURATION),
                    permissions: masterProfile.permissions || []
                });

                // Update login history (simplified for emergency fix)
                masterProfile.lastLogin = new Date().toISOString();
                await this.saveMasterProfile(masterProfile);

                auditLogger.log('MASTER_AUTH', 'Bot Developer authenticated successfully', 'authentication', {
                    method: 'password',
                    timestamp: new Date()
                });

                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error authenticating with password:', error);
            return false;
        }
    }

    /**
     * Handle authentication method selection
     */
    static async handleAuthMethod(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'master_password_auth':
                    await this.showPasswordAuthModal(interaction);
                    break;
                
                case 'master_password_reset':
                    await this.showPasswordResetOptions(interaction);
                    break;
                
                case 'emergency_access':
                    await this.showEmergencyAccessVerification(interaction);
                    break;
                
                default:
                    await interaction.update({
                        content: '❌ Unknown authentication method.',
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling auth method:', error);
            throw error;
        }
    }

    /**
     * Show password authentication modal
     */
    static async showPasswordAuthModal(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('master_password_auth_modal')
                .setTitle('Master Password Authentication');

            const passwordInput = new TextInputBuilder()
                .setCustomId('auth_password')
                .setLabel('Master Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Enter your master password...')
                .setMaxLength(100);

            const row = new ActionRowBuilder().addComponents(passwordInput);
            modal.addComponents(row);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing password auth modal:', error);
            await interaction.update({
                content: '❌ Error showing authentication form.',
                components: []
            });
        }
    }

    /**
     * Handle password authentication modal submission
     */
    static async handlePasswordAuthentication(interaction) {
        try {
            const enteredPassword = interaction.fields.getTextInputValue('auth_password');
            
            // Load master profile
            const masterProfile = await this.getMasterProfile();
            if (!masterProfile) {
                await interaction.reply({
                    content: '❌ **Master profile not found.** Please complete setup first with `/master`.',
                    ephemeral: true
                });
                return;
            }

            // Verify password
            const enteredHash = crypto.createHash('sha256').update(enteredPassword).digest('hex');
            if (enteredHash !== masterProfile.passwordHash) {
                await interaction.reply({
                    content: '❌ **Invalid password.** Please try again or use recovery options.',
                    ephemeral: true
                });
                return;
            }

            // Create authentication session
            this.masterSessions.set(interaction.user.id, {
                userId: interaction.user.id,
                authenticatedAt: new Date(),
                expiresAt: new Date(Date.now() + this.SESSION_DURATION),
                permissions: masterProfile.permissions || {}
            });

            // Update login history (simplified for SQLite emergency fix)
            masterProfile.lastLogin = new Date().toISOString();
            // Note: loginHistory array not supported in emergency SQLite structure
            await this.saveMasterProfile(masterProfile);

            // Show master control panel
            await this.showMasterControlPanel(interaction);

        } catch (error) {
            logger.error('Error handling password authentication:', error);
            await interaction.reply({
                content: '❌ **Authentication failed.** Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle master control panel selections
     */
    static async handleControlPanelSelection(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated()) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'master_server_mgmt':
                    await this.showServerManagement(interaction);
                    break;
                
                case 'master_user_mgmt':
                    await this.showUserManagement(interaction);
                    break;
                
                case 'master_financial':
                    await this.showFinancialOperations(interaction);
                    break;
                
                case 'master_emergency':
                    await this.showEmergencyControls(interaction);
                    break;
                
                case 'master_analytics':
                    await this.showAnalytics(interaction);
                    break;
                
                case 'master_system':
                    await this.showSystemTools(interaction);
                    break;
                
                default:
                    await interaction.update({
                        content: '❌ Unknown control panel option.',
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling control panel selection:', error);
            throw error;
        }
    }

    /**
     * Handle user management action selections
     */
    static async handleUserMgmtActions(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'change_master_password':
                    await this.showPasswordChangeModal(interaction);
                    break;
                
                case 'update_security_profile':
                    await this.showSecurityProfileUpdateModal(interaction);
                    break;
                
                case 'test_recovery_methods':
                    await this.showRecoveryTest(interaction);
                    break;
                
                case 'view_security_log':
                    await this.showSecurityLog(interaction);
                    break;
                
                case 'back_to_control_panel':
                    await this.showMasterControlPanel(interaction);
                    break;
                
                default:
                    await interaction.update({
                        content: '❌ Unknown user management option.',
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling user management actions:', error);
            throw error;
        }
    }

    /**
     * Show password change modal
     */
    static async showPasswordChangeModal(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('master_password_change_modal')
                .setTitle('🔑 Change Master Password');

            const currentPasswordInput = new TextInputBuilder()
                .setCustomId('current_password')
                .setLabel('Current Master Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Enter your current password...');

            const newPasswordInput = new TextInputBuilder()
                .setCustomId('new_password')
                .setLabel('New Master Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(8)
                .setPlaceholder('Enter new secure password (min 8 chars)...');

            const confirmPasswordInput = new TextInputBuilder()
                .setCustomId('confirm_password')
                .setLabel('Confirm New Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Confirm your new password...');

            const row1 = new ActionRowBuilder().addComponents(currentPasswordInput);
            const row2 = new ActionRowBuilder().addComponents(newPasswordInput);
            const row3 = new ActionRowBuilder().addComponents(confirmPasswordInput);

            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing password change modal:', error);
            await interaction.update({
                content: '❌ Error loading password change form.',
                components: []
            });
        }
    }

    /**
     * Show security profile update modal
     */
    static async showSecurityProfileUpdateModal(interaction) {
        try {
            const masterProfile = await this.getMasterProfile();
            
            const modal = new ModalBuilder()
                .setCustomId('security_profile_update_modal')
                .setTitle('🛡️ Update Security Profile');

            const xAccountInput = new TextInputBuilder()
                .setCustomId('x_account')
                .setLabel('X/Twitter Account (@username)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(masterProfile.xAccount || '')
                .setPlaceholder('@your_twitter_handle');

            const evmWalletInput = new TextInputBuilder()
                .setCustomId('evm_wallet')
                .setLabel('EVM Wallet Address (0x...)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(masterProfile.evmWallet || '')
                .setPlaceholder('0x742d35Cc6634C0532925a3b8D4D8dcF6e6D8D8C4');

            const emailInput = new TextInputBuilder()
                .setCustomId('email_address')
                .setLabel('Recovery Email Address')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(masterProfile.email || '')
                .setPlaceholder('your@email.com');

            const row1 = new ActionRowBuilder().addComponents(xAccountInput);
            const row2 = new ActionRowBuilder().addComponents(evmWalletInput);
            const row3 = new ActionRowBuilder().addComponents(emailInput);

            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing security profile update modal:', error);
            await interaction.update({
                content: '❌ Error loading security profile form.',
                components: []
            });
        }
    }

    /**
     * Handle logout
     */
    static async handleLogout(interaction) {
        try {
            this.masterSessions.delete(interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setTitle('🚪 **SESSION ENDED** 🚪')
                .setDescription(
                    '**Bot Developer Session Terminated**\n\n' +
                    '🔐 Your master session has been securely ended.\n' +
                    '📊 Session data has been logged for security.\n\n' +
                    '*Use `/master control` to start a new session.*'
                )
                .setColor(0x666666)
                .setFooter({ text: 'Session Terminated • Security Logged' })
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });

            auditLogger.log('MASTER_LOGOUT', 'Bot Developer session ended', 'logout', {
                userId: this.BOT_DEVELOPER_ID,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('Error handling logout:', error);
            throw error;
        }
    }

    /**
     * Handle emergency mode toggle
     */
    static async handleToggleEmergency(interaction) {
        try {
            if (!this.isAuthenticated()) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            this.emergencyMode = !this.emergencyMode;

            const embed = new EmbedBuilder()
                .setTitle(`🚨 **EMERGENCY MODE ${this.emergencyMode ? 'ACTIVATED' : 'DEACTIVATED'}** 🚨`)
                .setDescription(
                    `**Emergency Override Status Changed**\n\n` +
                    `🚨 **Status**: ${this.emergencyMode ? '🟢 ACTIVE' : '🔴 STANDBY'}\n` +
                    `⏰ **Changed**: ${new Date().toLocaleString()}\n` +
                    `👤 **Authorized By**: Bot Developer\n\n` +
                    (this.emergencyMode ? 
                        '**Emergency Capabilities Enabled:**\n' +
                        '🔓 Server lockout recovery\n' +
                        '🔑 Password reset override\n' +
                        '👥 Community assistance mode\n' +
                        '📢 Emergency broadcasts\n\n' +
                        '⚠️ **CAUTION**: Use emergency powers responsibly'
                        :
                        '**Emergency Capabilities Disabled:**\n' +
                        '✅ Normal security protocols restored\n' +
                        '✅ Standard access controls active\n' +
                        '✅ Emergency session logged\n\n' +
                        '🔒 **Security**: All actions have been audited'
                    )
                )
                .setColor(this.emergencyMode ? 0xff0000 : 0x00ff00)
                .setFooter({ text: 'Emergency Override System • Status Change Logged' })
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });

            auditLogger.log('EMERGENCY_TOGGLE', `Emergency mode ${this.emergencyMode ? 'activated' : 'deactivated'}`, 'emergency_toggle', {
                userId: this.BOT_DEVELOPER_ID,
                emergencyMode: this.emergencyMode,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('Error toggling emergency mode:', error);
            throw error;
        }
    }

    /**
     * Get list of servers with master access
     */
    static async getMasterServersList(client) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Get all servers the bot is in
            const guilds = Array.from(client?.guilds?.cache.values() || []);
            
            // For now, return basic server info
            // Later can be enhanced with configuration status, etc.
            const serverList = guilds.map(guild => ({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                configured: false, // TODO: Check if server has setup completed
                owner: guild.ownerId
            }));

            return serverList;
        } catch (error) {
            logger.error('Error getting master servers list:', error);
            return [];
        }
    }

    /**
     * Show server management interface
     */
    static async showServerManagement(interaction) {
        try {
            const servers = await this.getMasterServersList(interaction.client);
            const serverCount = interaction.client.guilds.cache.size;

            const embed = new EmbedBuilder()
                .setTitle('🛠️ **SERVER MANAGEMENT** 🛠️')
                .setDescription(
                    '**Server Administration & Setup Control**\n\n' +
                    `🌐 **Total Servers**: ${serverCount}\n` +
                    `📊 **Configured Servers**: ${servers.length}\n` +
                    `📍 **Current Server**: ${interaction.guild?.name || 'DM'}\n\n` +
                    '**Primary Operations:**\n' +
                    '🚀 **Bot Setup & Configuration** - Help owners setup bot\n' +
                    '🔑 **Server Owner Support** - Password resets, profiles\n' +
                    '⚙️ **Server Settings Override** - Emergency configuration\n' +
                    '👥 **Cross-Server Management** - Multi-server operations\n\n' +
                    '*Select management operation:*'
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'Server Management • Bot Developer Control' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚀 Bot Setup & Configuration')
                    .setDescription('Setup bot in current server (Full/Quick/Custom)')
                    .setValue('bot_setup_config'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔑 Server Owner Support')
                    .setDescription('Password resets, profile help, recovery')
                    .setValue('server_owner_support'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔍 List All Servers')
                    .setDescription('View all servers where bot is present')
                    .setValue('list_servers'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚙️ Settings Override')
                    .setDescription('Emergency server configuration override')
                    .setValue('server_settings_override'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👥 Cross-Server Management')
                    .setDescription('Multi-server user and data management')
                    .setValue('cross_server_management'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Control Panel')
                    .setDescription('Return to main control panel')
                    .setValue('back_to_control_panel')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_server_mgmt_actions')
                .setPlaceholder('Select server management action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing server management:', error);
            throw error;
        }
    }

    /**
     * Handle server management action selections
     */
    static async handleServerMgmtActions(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'bot_setup_config':
                    await this.showBotSetupOptions(interaction);
                    break;
                
                case 'server_owner_support':
                    await this.showServerOwnerSupport(interaction);
                    break;
                
                case 'list_servers':
                    await this.showServersList(interaction);
                    break;
                
                case 'server_settings_override':
                    await this.showSettingsOverride(interaction);
                    break;
                
                case 'cross_server_management':
                    await this.showCrossServerManagement(interaction);
                    break;
                
                case 'back_to_control_panel':
                    await this.showMasterControlPanel(interaction);
                    break;
                
                default:
                    await interaction.update({
                        content: '❌ Unknown server management option.',
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling server management actions:', error);
            throw error;
        }
    }

    /**
     * Show bot setup options for current server
     */
    static async showBotSetupOptions(interaction) {
        try {
            if (!interaction.guild) {
                await interaction.update({
                    content: '❌ Bot setup must be run from within a server.',
                    components: []
                });
                return;
            }

            const guild = interaction.guild;
            const owner = await guild.fetchOwner();

            const embed = new EmbedBuilder()
                .setTitle('🚀 **BOT SETUP & CONFIGURATION** 🚀')
                .setDescription(
                    `**Server**: ${guild.name}\n` +
                    `**Owner**: ${owner.user.username}\n` +
                    `**Members**: ${guild.memberCount}\n\n` +
                    '**Setup Process:**\n' +
                    '1️⃣ **Verify Server Owner Profile** (password required)\n' +
                    '2️⃣ **Choose Setup Type** (Full/Quick/Custom)\n' +
                    '3️⃣ **Deploy Bot Configuration**\n\n' +
                    '**Setup Options:**\n' +
                    '🎯 **Full Setup** - All channels + all embeds automatically\n' +
                    '⚡ **Quick Setup** - Game Hall embed in chosen channel\n' +
                    '🎨 **Custom Setup** - Choose placement for each embed\n\n' +
                    '*Begin server owner verification:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Bot Setup • Server Configuration' })
                .setTimestamp();

            const button = new ButtonBuilder()
                .setCustomId('verify_server_owner')
                .setLabel('🔐 Verify Server Owner')
                .setStyle(ButtonStyle.Primary);

            const backButton = new ButtonBuilder()
                .setCustomId('back_to_server_mgmt')
                .setLabel('🔙 Back')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(button, backButton);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing bot setup options:', error);
            throw error;
        }
    }

    /**
     * Handle server owner verification for bot setup
     */
    static async handleServerOwnerVerification(interaction) {
        try {
            if (!interaction.guild) {
                await interaction.update({
                    content: '❌ Bot setup must be run from within a server.',
                    components: []
                });
                return;
            }

            const guild = interaction.guild;
            const owner = await guild.fetchOwner();
            
            // Import UserProfileHandler to check owner profile
            const { UserProfileHandler } = await import('../user/UserProfileHandler.js');
            
            // Check if server owner has a profile
            const ownerHasProfile = await UserProfileHandler.checkUserProfile(owner.user.id);
            
            if (!ownerHasProfile) {
                // Server owner needs to create profile first
                const embed = new EmbedBuilder()
                    .setTitle('👤 **SERVER OWNER PROFILE REQUIRED** 👤')
                    .setDescription(
                        `**Server Owner**: ${owner.user.username}\n` +
                        `**Server**: ${guild.name}\n\n` +
                        '🔐 **Profile Required for Setup**\n\n' +
                        'The server owner must create a secure profile before bot setup can proceed.\n\n' +
                        '**Profile includes:**\n' +
                        '• Secure password\n' +
                        '• Recovery methods (2 of 3 required)\n' +
                        '• Account protection\n\n' +
                        '*Server owner should create profile first, then return here.*'
                    )
                    .setColor(0xff6600)
                    .setFooter({ text: 'Profile Required • Bot Setup' })
                    .setTimestamp();

                const profileButton = new ButtonBuilder()
                    .setCustomId('guide_owner_profile')
                    .setLabel('📝 Guide Profile Creation')
                    .setStyle(ButtonStyle.Primary);

                const backButton = new ButtonBuilder()
                    .setCustomId('back_to_bot_setup')
                    .setLabel('🔙 Back')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(profileButton, backButton);

                await interaction.update({
                    embeds: [embed],
                    components: [row]
                });
            } else {
                // Server owner has profile - proceed to authentication
                await this.showServerOwnerAuthentication(interaction, owner);
            }

        } catch (error) {
            logger.error('Error handling server owner verification:', error);
            throw error;
        }
    }

    /**
     * Show server owner authentication for setup
     */
    static async showServerOwnerAuthentication(interaction, owner) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔐 **SERVER OWNER AUTHENTICATION** 🔐')
                .setDescription(
                    `**Server Owner**: ${owner.user.username}\n` +
                    `**Server**: ${interaction.guild.name}\n\n` +
                    '✅ **Profile Found**\n\n' +
                    'Please authenticate with your profile password to proceed with bot setup.\n\n' +
                    '*Enter your password to continue:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Authentication Required • Bot Setup' })
                .setTimestamp();

            const authButton = new ButtonBuilder()
                .setCustomId('server_owner_auth')
                .setLabel('🔑 Enter Password')
                .setStyle(ButtonStyle.Primary);

            const backButton = new ButtonBuilder()
                .setCustomId('back_to_bot_setup')
                .setLabel('🔙 Back')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(authButton, backButton);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing server owner authentication:', error);
            throw error;
        }
    }

    /**
     * Placeholder for additional management interfaces
     */
    static async showUserManagement(interaction) {
        try {
            const masterProfile = await this.getMasterProfile();
            const recoveryMethods = JSON.parse(masterProfile.recoveryMethods || '[]');
            
            const embed = new EmbedBuilder()
                .setTitle('👥 **USER MANAGEMENT** 👥')
                .setDescription(
                    '**Cross-Server User Control & Profile Security**\n\n' +
                    `🔐 **Your Master Profile:**\n` +
                    `👤 Username: ${masterProfile.username}\n` +
                    `📅 Created: ${new Date(masterProfile.createdAt).toLocaleDateString()}\n` +
                    `🔑 Last Login: ${masterProfile.lastLogin ? new Date(masterProfile.lastLogin).toLocaleDateString() : 'Never'}\n\n` +
                    `**🛡️ Security Status:**\n` +
                    `🔑 Password: ${masterProfile.passwordHash ? '✅ Set' : '❌ Not Set'}\n` +
                    `🐦 X Account: ${masterProfile.xAccount ? '✅ ' + masterProfile.xAccount : '❌ Not Set'}\n` +
                    `💎 EVM Wallet: ${masterProfile.evmWallet ? '✅ ' + masterProfile.evmWallet.substring(0,8) + '...' : '❌ Not Set'}\n` +
                    `📧 Email: ${masterProfile.email ? '✅ ' + masterProfile.email : '❌ Not Set'}\n` +
                    `🔄 Recovery Methods: ${recoveryMethods.length}/3 configured\n\n` +
                    '**Available Actions:**\n' +
                    '🔑 Change Master Password\n' +
                    '🛡️ Update Security Profile\n' +
                    '🔄 Test Recovery Methods\n' +
                    '👥 Manage Other Users (Coming Soon)\n\n' +
                    '*Select security action:*'
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'Master Profile Security • Essential P2E Protection' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔑 Change Master Password')
                    .setDescription('Update your master password with current verification')
                    .setValue('change_master_password'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Update Security Profile')
                    .setDescription('Add/update X account, EVM wallet, email for 2FA')
                    .setValue('update_security_profile'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Test Recovery Methods')
                    .setDescription('Verify your recovery methods work correctly')
                    .setValue('test_recovery_methods'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 View Security Log')
                    .setDescription('View recent login attempts and security events')
                    .setValue('view_security_log'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Control Panel')
                    .setDescription('Return to main master control panel')
                    .setValue('back_to_control_panel')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_user_mgmt_actions')
                .setPlaceholder('Select security action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing user management:', error);
            await interaction.update({
                content: '❌ Error loading user management interface.',
                components: []
            });
        }
    }

    static async showEconomyControl(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('💰 **ECONOMY CONTROL** 💰')
            .setDescription('**Global Economy Management**\n\n🚧 This feature is being implemented...')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    /**
     * Show Financial Operations (routes to Master Economy Tools)
     */
    static async showFinancialOperations(interaction) {
        try {
            // Route to Master Economy Tools - this is where the real financial power is
            await this.showMasterEconomyTools(interaction);
        } catch (error) {
            logger.error('Error showing financial operations:', error);
            await interaction.update({
                content: '❌ Error loading financial operations.',
                embeds: [],
                components: []
            });
        }
    }

    static async showBotSettings(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔧 **BOT SETTINGS** 🔧')
            .setDescription('**Core Bot Configuration**\n\n🚧 This feature is being implemented...')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    static async showEmergencyTools(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🚨 **EMERGENCY TOOLS** 🚨')
            .setDescription('**Community Assistance Tools**\n\n🚧 This feature is being implemented...')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    static async showAnalytics(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📊 **ANALYTICS** 📊')
            .setDescription('**Cross-Server Statistics**\n\n🚧 This feature is being implemented...')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    static async showSystemTools(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 **SYSTEM TOOLS** 🔄')
            .setDescription('**Maintenance & Diagnostics**\n\n🚧 This feature is being implemented...')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    /**
     * Show Emergency Controls
     */
    static async showEmergencyControls(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🚨 **EMERGENCY CONTROLS** 🚨')
                .setDescription('**System Override & Emergency Functions**\n\n🚧 This feature is being implemented...')
                .setColor(0xff0000);
            
            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            logger.error('Error showing emergency controls:', error);
            await interaction.update({
                content: '❌ Error loading emergency controls.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Analytics
     */
    static async showAnalytics(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📊 **MASTER ANALYTICS** 📊')
                .setDescription('**Cross-Server Statistics & Reports**\n\n🚧 This feature is being implemented...')
                .setColor(0x0099ff);
            
            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            logger.error('Error showing analytics:', error);
            await interaction.update({
                content: '❌ Error loading analytics.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show password reset options
     */
    static async showPasswordResetOptions(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 **PASSWORD RESET** 🔄')
            .setDescription('**Multi-Factor Password Recovery**\n\n🚧 This feature is being implemented...')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    /**
     * Reset master profile for testing (Bot Developer only)
     */
    static async resetMasterProfile() {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Delete master profile from MongoDB
            await DatabaseManager.deleteMasterProfile(this.BOT_DEVELOPER_ID);
            
            // Clear all sessions for this user (in case there are multiple)
            this.masterSessions.delete(this.BOT_DEVELOPER_ID);
            
            logger.info('Master profile reset successfully for testing');
            return true;
        } catch (error) {
            logger.error('Error resetting master profile:', error);
            return false;
        }
    }

    /**
     * Show server setup authentication for Bot Developer with existing master profile
     */
    static async showServerSetupAuthentication(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔐 **SERVER SETUP AUTHENTICATION** 🔐')
                .setDescription(
                    '**Bot Developer Server Setup**\n\n' +
                    '✅ **Master Profile**: Detected\n' +
                    '🔑 **Authentication**: Required for server setup\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name || 'Unknown'}\n\n` +
                    '**Setup Options Available After Authentication:**\n' +
                    '🚀 **Full Setup** - All channels + all embeds automatically\n' +
                    '⚡ **Quick Setup** - Game Hall embed in chosen/new channel\n' +
                    '🎛️ **Custom Setup** - Choose placement for each embed\n\n' +
                    '*Enter your master password to continue:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Bot Developer Server Setup • Authentication Required' })
                .setTimestamp();

            const passwordButton = new ButtonBuilder()
                .setCustomId('server_setup_auth_password')
                .setLabel('🔑 Enter Master Password')
                .setStyle(ButtonStyle.Primary);

            const emergencyButton = new ButtonBuilder()
                .setCustomId('server_setup_auth_emergency')
                .setLabel('🚨 Emergency Access')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('server_setup_cancel')
                .setLabel('❌ Cancel Setup')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(passwordButton, emergencyButton, cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing server setup authentication:', error);
            await interaction.update({
                content: '❌ Error showing server setup authentication. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show password modal for server setup authentication
     */
    static async showPasswordModalForServerSetup(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('server_setup_password_verify')
                .setTitle('Bot Developer Authentication');

            const passwordInput = new TextInputBuilder()
                .setCustomId('master_password')
                .setLabel('Master Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder('Enter your master password...');

            const row = new ActionRowBuilder().addComponents(passwordInput);
            modal.addComponents(row);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing password modal for server setup:', error);
            await interaction.update({
                content: '❌ Error showing password modal. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle server setup password verification
     */
    static async handleServerSetupPasswordVerification(interaction) {
        try {
            const password = interaction.fields.getTextInputValue('master_password');
            const masterProfile = await this.getMasterProfile();

            if (!masterProfile) {
                await interaction.reply({
                    content: '❌ Master profile not found. Please use `/master` to create one first.',
                    ephemeral: true
                });
                return;
            }

            // Verify password
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            if (hashedPassword !== masterProfile.passwordHash) {
                await interaction.reply({
                    content: '❌ Invalid password. Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Create authenticated session
            this.masterSessions.set(interaction.user.id, {
                authenticated: true,
                timestamp: Date.now(),
                method: 'password_auth',
                isEmergency: false
            });

            // Log successful authentication
            auditLogger.log('MASTER_AUTH', `Server setup password authentication successful for ${interaction.user.username} in ${interaction.guild?.name}`, 'server_setup_auth', {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guildId,
                guildName: interaction.guild?.name
            });

            logger.info(`Server setup password authentication successful for Bot Developer: ${interaction.user.username} in server: ${interaction.guild?.name}`);

            // Show server setup options
            await this.showBotSetupOptions(interaction);

        } catch (error) {
            logger.error('Error handling server setup password verification:', error);
            await interaction.reply({
                content: '❌ Error verifying password. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show bot setup options after authentication
     */
    static async showBotSetupOptions(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🚀 **BOT SETUP OPTIONS** 🚀')
                .setDescription(
                    '**Bot Developer Server Setup**\n\n' +
                    '✅ **Authentication**: Successful\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name || 'Unknown'}\n` +
                    `👑 **Server Owner**: <@${interaction.guild?.ownerId}>\n\n` +
                    '**Choose Your Setup Type:**\n\n' +
                    '🚀 **Full Setup**\n' +
                    '└ Creates all channels automatically\n' +
                    '└ Deploys all embeds (Game Hall, Marketplace, Casino)\n' +
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
                .setFooter({ text: 'Bot Developer Setup • Choose Your Method' })
                .setTimestamp();

            const fullSetupButton = new ButtonBuilder()
                .setCustomId('bot_setup_full')
                .setLabel('🚀 Full Setup')
                .setStyle(ButtonStyle.Success);

            const quickSetupButton = new ButtonBuilder()
                .setCustomId('bot_setup_quick')
                .setLabel('⚡ Quick Setup')
                .setStyle(ButtonStyle.Primary);

            const customSetupButton = new ButtonBuilder()
                .setCustomId('bot_setup_custom')
                .setLabel('🎛️ Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('bot_setup_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(fullSetupButton, quickSetupButton);
            const row2 = new ActionRowBuilder().addComponents(customSetupButton, cancelButton);

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    embeds: [embed],
                    components: [row1, row2]
                });
            } else {
                await interaction.reply({
                    embeds: [embed],
                    components: [row1, row2],
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error showing bot setup options:', error);
            const content = '❌ Error showing setup options. Please try again.';
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content, embeds: [], components: [] });
            } else {
                await interaction.reply({ content, ephemeral: true });
            }
        }
    }

    /**
     * Handle Full Bot Setup
     */
    static async handleBotSetupFull(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🚀 **FULL SETUP INITIATED** 🚀')
                .setDescription(
                    '**Bot Developer Full Setup**\n\n' +
                    '✅ **Authentication**: Verified\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n\n` +
                    '**Full Setup Process:**\n' +
                    '1. 📂 Creating all required channels\n' +
                    '2. 🎮 Deploying Game Hall embed\n' +
                    '3. 🛒 Deploying Marketplace embed\n' +
                    '4. 🎰 Deploying Casino embed\n' +
                    '5. ⚙️ Configuring permissions\n' +
                    '6. 🔧 Finalizing setup\n\n' +
                    '⏳ **This may take a few moments...**'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Full Setup • Creating Complete Bot Environment' })
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });

            // ACTUAL IMPLEMENTATION: Create all channels and embeds
            try {
                // Clean up existing Dungeonites channels first
                await this.cleanupExistingDungeonitesChannels(interaction.guild);
                
                // Find or create Dungeonites category AFTER cleanup
                const category = await this.findOrCreateDungeonitesCategory(interaction.guild);
                
                const channels = [];
                const { PermanentEmbedHandler } = await import('../ui/PermanentEmbedHandler.js');

                // Create Game Hall channel
                const gameHallChannel = await interaction.guild.channels.create({
                    name: '🎮│game-hall',
                    type: 0,
                    parent: category.id,
                    reason: 'Game Hall channel created via Bot Developer full setup'
                });
                channels.push({ name: 'Game Hall', channel: gameHallChannel });

                // Create Marketplace channel
                const marketplaceChannel = await interaction.guild.channels.create({
                    name: '🛒│marketplace',
                    type: 0,
                    parent: category.id,
                    reason: 'Marketplace channel created via Bot Developer full setup'
                });
                channels.push({ name: 'Marketplace', channel: marketplaceChannel });

                // Create Casino channel
                const casinoChannel = await interaction.guild.channels.create({
                    name: '🎰│casino',
                    type: 0,
                    parent: category.id,
                    reason: 'Casino channel created via Bot Developer full setup'
                });
                channels.push({ name: 'Casino', channel: casinoChannel });

                // Create embeds in each channel
                            await PermanentEmbedHandler.createGameHallEmbedForSetup(gameHallChannel, interaction.user);
            await PermanentEmbedHandler.createMarketplaceEmbedForSetup(marketplaceChannel, interaction.user);
            await PermanentEmbedHandler.createCasinoEmbedForSetup(casinoChannel, interaction.user);

                // Show actual success message
                await this.showInstallAllSuccess(interaction, channels);

                logger.info(`Full bot setup completed successfully in ${interaction.guild.name} by ${interaction.user.username}`);

            } catch (setupError) {
                logger.error('Error during full setup implementation:', setupError);
                await interaction.editReply({
                    content: '❌ Error creating channels and embeds. Please try again or use custom setup.',
                    embeds: [],
                    components: []
                });
            }

        } catch (error) {
            logger.error('Error handling bot setup full:', error);
            await interaction.update({
                content: '❌ Error starting full setup. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Quick Bot Setup
     */
    static async handleBotSetupQuick(interaction) {
        try {
            // Defer the interaction immediately to prevent timeout
            await interaction.deferReply({ ephemeral: true });

            // Show initial progress
            await interaction.editReply({
                content: '⚡ **Quick Setup Initiated**\n\n🎮 **Step 1/2:** Preparing Game Hall setup...'
            });

            // Brief delay to ensure deferReply is processed
            await new Promise(resolve => setTimeout(resolve, 500));

            // Update progress
            await interaction.editReply({
                content: '⚡ **Quick Setup Initiated**\n\n🎮 **Step 2/2:** Setting up Game Hall options...'
            });

            // ACTUAL IMPLEMENTATION: Show Game Hall channel options
            try {
                await this.handleCustomSetupGameHall(interaction);
                logger.info(`Quick bot setup initiated successfully in ${interaction.guild.name} by ${interaction.user.username}`);
            } catch (setupError) {
                logger.error('Error during quick setup implementation:', setupError);
                await interaction.editReply({
                    content: '❌ Error setting up Game Hall. Please try again or use custom setup.'
                });
            }

        } catch (error) {
            logger.error('Error handling bot setup quick:', error);
            try {
                await interaction.editReply({
                    content: '❌ Error starting quick setup. Please try again.'
                });
            } catch (replyError) {
                logger.error('Failed to send error reply:', replyError);
            }
        }
    }

    /**
     * Handle Custom Bot Setup
     */
    static async handleBotSetupCustom(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎛️ **CUSTOM SETUP INITIATED** 🎛️')
                .setDescription(
                    '**Bot Developer Custom Setup**\n\n' +
                    '✅ **Authentication**: Verified\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n\n` +
                    '**Custom Setup Options:**\n\n' +
                    '**Choose Components to Install:**\n' +
                    '🎮 Game Hall Embed\n' +
                    '🛒 Marketplace Embed\n' +
                    '🎰 Casino Embed\n\n' +
                    '**Channel Configuration:**\n' +
                    '📂 Create new channels or use existing\n' +
                    '🔧 Advanced permission settings\n' +
                    '⚙️ Custom configuration options\n\n' +
                    '*Select your preferences:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Custom Setup • Full Control Over Configuration' })
                .setTimestamp();

            const gameHallButton = new ButtonBuilder()
                .setCustomId('custom_setup_game_hall')
                .setLabel('🎮 Game Hall')
                .setStyle(ButtonStyle.Primary);

            const marketplaceButton = new ButtonBuilder()
                .setCustomId('custom_setup_marketplace')
                .setLabel('🛒 Marketplace')
                .setStyle(ButtonStyle.Primary);

            const casinoButton = new ButtonBuilder()
                .setCustomId('custom_setup_casino')
                .setLabel('🎰 Casino')
                .setStyle(ButtonStyle.Primary);

            const allButton = new ButtonBuilder()
                .setCustomId('custom_setup_all')
                .setLabel('✅ Install All')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId('custom_setup_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(gameHallButton, marketplaceButton, casinoButton);
            const row2 = new ActionRowBuilder().addComponents(allButton, cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            logger.error('Error handling bot setup custom:', error);
            await interaction.update({
                content: '❌ Error starting custom setup. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Bot Setup Cancellation
     */
    static async handleBotSetupCancel(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('❌ **BOT SETUP CANCELLED** ❌')
                .setDescription(
                    '**Setup Process Cancelled**\n\n' +
                    '✅ No changes were made to your server\n' +
                    '🔄 You can restart setup anytime:\n' +
                    '• Use `/setup` command\n' +
                    '• Or access via `/master` control panel\n\n' +
                    '*Setup has been safely terminated.*'
                )
                .setColor(0x666666)
                .setFooter({ text: 'Setup Cancelled • No Action Required' })
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });

        } catch (error) {
            logger.error('Error handling bot setup cancel:', error);
            await interaction.update({
                content: '❌ Error cancelling setup. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle server setup emergency authentication
     */
    static async handleServerSetupEmergencyAuth(interaction) {
        try {
            // Grant emergency session
            this.masterSessions.set(interaction.user.id, {
                authenticated: true,
                timestamp: Date.now(),
                method: 'emergency_override',
                isEmergency: true
            });

            // Log emergency access for server setup
            auditLogger.log('MASTER_EMERGENCY', `Emergency server setup access granted to ${interaction.user.username} in ${interaction.guild?.name}`, 'server_setup_emergency', {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guildId,
                guildName: interaction.guild?.name
            });

            logger.warn(`Emergency server setup access granted to Bot Developer: ${interaction.user.username} for server: ${interaction.guild?.name}`);

            // Show server setup options
            await this.showBotSetupOptions(interaction);

        } catch (error) {
            logger.error('Error handling server setup emergency auth:', error);
            await interaction.update({
                content: '❌ Error processing emergency authentication. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle emergency access granted
     */
    static async handleEmergencyAccessGranted(interaction) {
        try {
            // Log emergency access granted
            auditLogger.log('MASTER_EMERGENCY', `Emergency access granted to ${interaction.user.username}`, 'emergency_access_granted', {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guildId || 'DM'
            });

            // Grant emergency session
            this.masterSessions.set(interaction.user.id, {
                authenticated: true,
                timestamp: Date.now(),
                method: 'emergency_override',
                isEmergency: true
            });

            logger.warn(`Emergency access granted to Bot Developer: ${interaction.user.username}`);

            // Show master control panel with emergency status
            await this.showMasterControlPanel(interaction, true);

        } catch (error) {
            logger.error('Error handling emergency access granted:', error);
            await interaction.update({
                content: '❌ Error granting emergency access. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle emergency access cancel
     */
    static async handleEmergencyAccessCancel(interaction) {
        try {
            // Log emergency access cancelled
            auditLogger.log('MASTER_EMERGENCY', `Emergency access cancelled by ${interaction.user.username}`, 'emergency_access_cancelled', {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guildId || 'DM'
            });

            // Return to authentication menu
            await this.showMasterAuthentication(interaction);

        } catch (error) {
            logger.error('Error handling emergency access cancel:', error);
            await interaction.update({
                content: '❌ Error cancelling emergency access. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Custom Setup Game Hall
     */
    static async handleCustomSetupGameHall(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎮 **GAME HALL SETUP** 🎮')
                .setDescription(
                    '**Custom Setup: Game Hall Embed**\n\n' +
                    '✅ **Authentication**: Verified\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n` +
                    `📋 **Component**: Game Hall Interface\n\n` +
                    '**Game Hall Features:**\n' +
                    '🎮 Start Game - Creates private threads for players\n' +
                    '👤 View Profile - Display player stats and progress\n' +
                    '📚 Tutorial - Game help and instructions\n' +
                    '📜 Daily Quests - Quest access and management\n\n' +
                    '**Channel Options:**\n' +
                    '📂 Create new channel specifically for Game Hall\n' +
                    '🔄 Use existing channel for Game Hall embed\n\n' +
                    '*Choose your Game Hall setup preference:*'
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'Game Hall Setup • Choose Installation Method' })
                .setTimestamp();

            const createChannelButton = new ButtonBuilder()
                .setCustomId('game_hall_create_channel')
                .setLabel('📂 Create New Channel')
                .setStyle(ButtonStyle.Primary);

            const existingChannelButton = new ButtonBuilder()
                .setCustomId('game_hall_existing_channel')
                .setLabel('🔄 Use Existing Channel')
                .setStyle(ButtonStyle.Secondary);

            const backButton = new ButtonBuilder()
                .setCustomId('bot_setup_custom')
                .setLabel('⬅️ Back to Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('custom_setup_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(createChannelButton, existingChannelButton);
            const row2 = new ActionRowBuilder().addComponents(backButton, cancelButton);

            try {
                await interaction.editReply({
                    content: '',
                    embeds: [embed],
                    components: [row1, row2]
                });
            } catch (error) {
                logger.error('Error updating interaction in handleCustomSetupGameHall:', error);
                // Try fallback response
                try {
                    await interaction.editReply({
                        content: '🎮 **Game Hall Setup Ready**\n\nChoose how to set up your Game Hall:\n• 📂 Create New Channel\n• 🔄 Use Existing Channel'
                    });
                } catch (fallbackError) {
                    logger.error('Fallback response also failed:', fallbackError);
                }
            }

        } catch (error) {
            logger.error('Error handling custom setup game hall:', error);
            try {
                await interaction.editReply({
                    content: '❌ Error setting up Game Hall. Please try again.'
                });
            } catch (replyError) {
                logger.error('Failed to send error reply:', replyError);
            }
        }
    }

    /**
     * Handle Custom Setup Marketplace
     */
    static async handleCustomSetupMarketplace(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🛒 **MARKETPLACE SETUP** 🛒')
                .setDescription(
                    '**Custom Setup: Marketplace Embed**\n\n' +
                    '✅ **Authentication**: Verified\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n` +
                    `📋 **Component**: Marketplace Interface\n\n` +
                    '**Marketplace Features:**\n' +
                    '🛒 Store - Buy and sell items with NPCs\n' +
                    '👥 Player Market - Player-to-player trading\n' +
                    '🔄 Trading Post - Auction and bulk trading\n' +
                    '📦 My Chests - Manage Profile Chest and Adventure Chest\n\n' +
                    '**Channel Options:**\n' +
                    '📂 Create new channel specifically for Marketplace\n' +
                    '🔄 Use existing channel for Marketplace embed\n\n' +
                    '*Choose your Marketplace setup preference:*'
                )
                .setColor(0x00ff66)
                .setFooter({ text: 'Marketplace Setup • Choose Installation Method' })
                .setTimestamp();

            const createChannelButton = new ButtonBuilder()
                .setCustomId('marketplace_create_channel')
                .setLabel('📂 Create New Channel')
                .setStyle(ButtonStyle.Primary);

            const existingChannelButton = new ButtonBuilder()
                .setCustomId('marketplace_existing_channel')
                .setLabel('🔄 Use Existing Channel')
                .setStyle(ButtonStyle.Secondary);

            const backButton = new ButtonBuilder()
                .setCustomId('bot_setup_custom')
                .setLabel('⬅️ Back to Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('custom_setup_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(createChannelButton, existingChannelButton);
            const row2 = new ActionRowBuilder().addComponents(backButton, cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            logger.error('Error handling custom setup marketplace:', error);
            await interaction.update({
                content: '❌ Error setting up Marketplace. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Custom Setup Casino
     */
    static async handleCustomSetupCasino(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎰 **CASINO SETUP** 🎰')
                .setDescription(
                    '**Custom Setup: Casino Embed**\n\n' +
                    '✅ **Authentication**: Verified\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n` +
                    `📋 **Component**: Casino Interface\n\n` +
                    '**Casino Features:**\n' +
                    '🎲 Coin Flip - Heads/tails gambling game\n' +
                    '🎯 Dice Games - Various dice-based gambling\n' +
                    '🃏 Card Games - Poker, blackjack, etc.\n' +
                    '🏆 Leaderboard - Top gamblers and winnings\n\n' +
                    '**Channel Options:**\n' +
                    '📂 Create new channel specifically for Casino\n' +
                    '🔄 Use existing channel for Casino embed\n\n' +
                    '*Choose your Casino setup preference:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Casino Setup • Choose Installation Method' })
                .setTimestamp();

            const createChannelButton = new ButtonBuilder()
                .setCustomId('casino_create_channel')
                .setLabel('📂 Create New Channel')
                .setStyle(ButtonStyle.Primary);

            const existingChannelButton = new ButtonBuilder()
                .setCustomId('casino_existing_channel')
                .setLabel('🔄 Use Existing Channel')
                .setStyle(ButtonStyle.Secondary);

            const backButton = new ButtonBuilder()
                .setCustomId('bot_setup_custom')
                .setLabel('⬅️ Back to Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('custom_setup_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(createChannelButton, existingChannelButton);
            const row2 = new ActionRowBuilder().addComponents(backButton, cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            logger.error('Error handling custom setup casino:', error);
            await interaction.update({
                content: '❌ Error setting up Casino. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Custom Setup All Components
     */
    static async handleCustomSetupAll(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('✅ **INSTALL ALL COMPONENTS** ✅')
                .setDescription(
                    '**Custom Setup: Complete Installation**\n\n' +
                    '✅ **Authentication**: Verified\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n` +
                    `📋 **Components**: All Three Embeds\n\n` +
                    '**What will be installed:**\n' +
                    '🎮 Game Hall - Complete gaming interface\n' +
                    '🛒 Marketplace - Trading and store interface\n' +
                    '🎰 Casino - Gambling and entertainment interface\n\n' +
                    '**Installation Options:**\n' +
                    '📂 Create three new channels in Dungeonites category\n' +
                    '🔄 Choose existing channels for each embed\n' +
                    '⚡ Quick start with Game Hall only\n\n' +
                    '*Choose your installation method:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Complete Installation • All Components' })
                .setTimestamp();

            const createChannelsButton = new ButtonBuilder()
                .setCustomId('install_all_create_channels')
                .setLabel('📂 Create New Channels')
                .setStyle(ButtonStyle.Success);

            const existingChannelsButton = new ButtonBuilder()
                .setCustomId('install_all_existing_channels')
                .setLabel('🔄 Use Existing Channels')
                .setStyle(ButtonStyle.Primary);

            const quickInstallButton = new ButtonBuilder()
                .setCustomId('install_all_quick')
                .setLabel('⚡ Quick Start (Game Hall)')
                .setStyle(ButtonStyle.Primary);

            const backButton = new ButtonBuilder()
                .setCustomId('bot_setup_custom')
                .setLabel('⬅️ Back to Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const cancelButton = new ButtonBuilder()
                .setCustomId('custom_setup_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(createChannelsButton, existingChannelsButton, quickInstallButton);
            const row2 = new ActionRowBuilder().addComponents(backButton, cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            logger.error('Error handling custom setup all:', error);
            await interaction.update({
                content: '❌ Error setting up all components. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Custom Setup Cancel
     */
    static async handleCustomSetupCancel(interaction) {
        try {
            // Check if there are existing Dungeonites assets to clean up
            const dungeonitesAssets = await this.findDungeonitesAssets(interaction.guild);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ **CUSTOM SETUP CANCELLED** ❌')
                .setDescription(
                    '**Bot Developer Custom Setup Cancelled**\n\n' +
                    '✅ **Authentication**: Still Active\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n\n` +
                    '**Setup Status**: Custom setup cancelled\n' +
                    '**What happens next?**\n' +
                    '└ Return to master control panel\n' +
                    '└ Try a different setup method\n' +
                    '└ Remove any partial setup if needed\n\n' +
                    (dungeonitesAssets.hasAssets ? 
                        `**⚠️ Existing Dungeonites Assets Found:**\n` +
                        `└ Category: ${dungeonitesAssets.category ? dungeonitesAssets.category.name : 'None'}\n` +
                        `└ Channels: ${dungeonitesAssets.channels.length} found\n\n` +
                        '*You can remove these assets to start fresh.*' :
                        '*No Dungeonites assets found to clean up.*'
                    )
                )
                .setColor(0x999999)
                .setFooter({ text: 'Custom Setup Cancelled • Choose Next Action' })
                .setTimestamp();

            const masterPanelButton = new ButtonBuilder()
                .setCustomId('master_control_panel_return')
                .setLabel('🏠 Return to Master Panel')
                .setStyle(ButtonStyle.Primary);

            const tryAgainButton = new ButtonBuilder()
                .setCustomId('bot_setup_config')
                .setLabel('🔄 Try Different Setup')
                .setStyle(ButtonStyle.Secondary);

            const components = [masterPanelButton, tryAgainButton];

            // Add cleanup button if assets exist
            if (dungeonitesAssets.hasAssets) {
                const cleanupButton = new ButtonBuilder()
                    .setCustomId('remove_dungeonites_assets')
                    .setLabel('🗑️ Remove Dungeonites Assets')
                    .setStyle(ButtonStyle.Danger);
                components.push(cleanupButton);
            }

            const row = new ActionRowBuilder().addComponents(components);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error handling custom setup cancel:', error);
            await interaction.update({
                content: '❌ Error cancelling custom setup. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Game Hall Create Channel
     */
    static async handleGameHallCreateChannel(interaction) {
        try {
            // Find or create Dungeonites category
            const category = await this.findOrCreateDungeonitesCategory(interaction.guild);
            
            const channelName = '🎮│game-hall';
            
            // Delete existing Game Hall channel if it exists
            const existingChannel = interaction.guild.channels.cache.find(
                ch => ch.type === 0 && ch.name === channelName
            );
            if (existingChannel) {
                await existingChannel.delete('Cleanup for Game Hall refresh');
                logger.info(`Deleted existing Game Hall channel in ${interaction.guild.name}`);
            }
            
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: 0, // Text channel
                parent: category.id,
                reason: 'Game Hall channel created via Bot Developer setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });

            // Create the Game Hall embed in the new channel
            const { PermanentEmbedHandler } = await import('../ui/PermanentEmbedHandler.js');
            await PermanentEmbedHandler.createGameHallEmbedForSetup(channel, interaction.user);

            // Show success message
            await this.showSetupSuccess(interaction, 'Game Hall', channel, 'custom_setup_game_hall');

        } catch (error) {
            logger.error('Error creating Game Hall channel:', error);
            await interaction.update({
                content: '❌ Error creating Game Hall channel. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Game Hall Existing Channel  
     */
    static async handleGameHallExistingChannel(interaction) {
        try {
            await this.showChannelSelector(interaction, 'game_hall', 'Game Hall');
        } catch (error) {
            logger.error('Error showing Game Hall channel selector:', error);
            await interaction.update({
                content: '❌ Error showing channel selector. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Marketplace Create Channel
     */
    static async handleMarketplaceCreateChannel(interaction) {
        try {
            // Find or create Dungeonites category
            const category = await this.findOrCreateDungeonitesCategory(interaction.guild);
            
            const channelName = '🛒│marketplace';
            
            // Delete existing Marketplace channel if it exists
            const existingChannel = interaction.guild.channels.cache.find(
                ch => ch.type === 0 && ch.name === channelName
            );
            if (existingChannel) {
                await existingChannel.delete('Cleanup for Marketplace refresh');
                logger.info(`Deleted existing Marketplace channel in ${interaction.guild.name}`);
            }
            
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: 0, // Text channel
                parent: category.id,
                reason: 'Marketplace channel created via Bot Developer setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });

            // Create the Marketplace embed in the new channel
            const { PermanentEmbedHandler } = await import('../ui/PermanentEmbedHandler.js');
            await PermanentEmbedHandler.createMarketplaceEmbedForSetup(channel, interaction.user);

            // Show success message
            await this.showSetupSuccess(interaction, 'Marketplace', channel, 'custom_setup_marketplace');

        } catch (error) {
            logger.error('Error creating Marketplace channel:', error);
            await interaction.update({
                content: '❌ Error creating Marketplace channel. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Marketplace Existing Channel  
     */
    static async handleMarketplaceExistingChannel(interaction) {
        try {
            await this.showChannelSelector(interaction, 'marketplace', 'Marketplace');
        } catch (error) {
            logger.error('Error showing Marketplace channel selector:', error);
            await interaction.update({
                content: '❌ Error showing channel selector. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Casino Create Channel
     */
    static async handleCasinoCreateChannel(interaction) {
        try {
            // Find or create Dungeonites category
            const category = await this.findOrCreateDungeonitesCategory(interaction.guild);
            
            const channelName = '🎰│casino';
            
            // Delete existing Casino channel if it exists
            const existingChannel = interaction.guild.channels.cache.find(
                ch => ch.type === 0 && ch.name === channelName
            );
            if (existingChannel) {
                await existingChannel.delete('Cleanup for Casino refresh');
                logger.info(`Deleted existing Casino channel in ${interaction.guild.name}`);
            }
            
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: 0, // Text channel
                parent: category.id,
                reason: 'Casino channel created via Bot Developer setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });

            // Create the Casino embed in the new channel
            const { PermanentEmbedHandler } = await import('../ui/PermanentEmbedHandler.js');
            await PermanentEmbedHandler.createCasinoEmbedForSetup(channel, interaction.user);

            // Show success message
            await this.showSetupSuccess(interaction, 'Casino', channel, 'custom_setup_casino');

        } catch (error) {
            logger.error('Error creating Casino channel:', error);
            await interaction.update({
                content: '❌ Error creating Casino channel. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Casino Existing Channel  
     */
    static async handleCasinoExistingChannel(interaction) {
        try {
            await this.showChannelSelector(interaction, 'casino', 'Casino');
        } catch (error) {
            logger.error('Error showing Casino channel selector:', error);
            await interaction.update({
                content: '❌ Error showing channel selector. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Install All Create Channels
     */
    static async handleInstallAllCreateChannels(interaction) {
        try {
            // STEP 1: Defer the interaction immediately to get 15 minutes
            await interaction.deferReply({ ephemeral: true });

            // STEP 2: Send initial progress message
            await interaction.editReply({
                content: '⚡ **Starting Complete Setup...**\n\n🔍 **Step 1/6:** Checking server structure...'
            });
            
            // Clean up existing Dungeonites channels first
            await this.cleanupExistingDungeonitesChannels(interaction.guild);
            
            // Find or create Dungeonites category AFTER cleanup
            const category = await this.findOrCreateDungeonitesCategory(interaction.guild);

            // STEP 3: Update progress
            await interaction.editReply({
                content: '⚡ **Creating Channels...**\n\n📂 **Step 2/6:** Creating Game Hall, Marketplace, and Casino channels...'
            });
            
            const channels = [];

            // Create Game Hall channel
            const gameHallChannel = await interaction.guild.channels.create({
                name: '🎮│game-hall',
                type: 0,
                parent: category.id,
                reason: 'Game Hall channel created via Bot Developer setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });
            channels.push({ name: 'Game Hall', channel: gameHallChannel });

            // Create Marketplace channel
            const marketplaceChannel = await interaction.guild.channels.create({
                name: '🛒│marketplace',
                type: 0,
                parent: category.id,
                reason: 'Marketplace channel created via Bot Developer setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });
            channels.push({ name: 'Marketplace', channel: marketplaceChannel });

            // Create Casino channel
            const casinoChannel = await interaction.guild.channels.create({
                name: '🎰│casino',
                type: 0,
                parent: category.id,
                reason: 'Casino channel created via Bot Developer setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });
            channels.push({ name: 'Casino', channel: casinoChannel });

            // STEP 4: Update progress
            await interaction.editReply({
                content: '⚡ **Channels Created Successfully!**\n\n🎮 **Step 3/6:** Setting up Game Hall embed...'
            });

            // Create embeds in each channel
            const { PermanentEmbedHandler } = await import('../ui/PermanentEmbedHandler.js');
            
            await PermanentEmbedHandler.createGameHallEmbedForSetup(gameHallChannel, interaction.user);

            // STEP 5: Update progress
            await interaction.editReply({
                content: '⚡ **Game Hall Ready!**\n\n🛒 **Step 4/6:** Setting up Marketplace embed...'
            });

            await PermanentEmbedHandler.createMarketplaceEmbedForSetup(marketplaceChannel, interaction.user);

            // STEP 6: Update progress
            await interaction.editReply({
                content: '⚡ **Marketplace Ready!**\n\n🎰 **Step 5/6:** Setting up Casino embed...'
            });

            await PermanentEmbedHandler.createCasinoEmbedForSetup(casinoChannel, interaction.user);

            // STEP 7: Final success message
            await interaction.editReply({
                content: '⚡ **Final Step:** Completing setup...'
            });

            // Show success message
            await this.showInstallAllSuccess(interaction, channels);

        } catch (error) {
            logger.error('Error installing all components:', error);
            try {
                await interaction.editReply({
                    content: '❌ Error installing components. Please try again.'
                });
            } catch (replyError) {
                logger.error('Failed to send error reply:', replyError);
            }
        }
    }

    /**
     * Handle Install All Existing Channels
     */
    static async handleInstallAllExistingChannels(interaction) {
        try {
            await this.showMultiChannelSelector(interaction);
        } catch (error) {
            logger.error('Error showing multi-channel selector:', error);
            await interaction.update({
                content: '❌ Error showing channel selector. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Install All Quick - Just Game Hall Setup
     */
    static async handleInstallAllQuick(interaction) {
        try {
            await this.showChannelSelector(interaction, 'game_hall', 'Game Hall');
        } catch (error) {
            logger.error('Error showing quick install Game Hall selector:', error);
            await interaction.update({
                content: '❌ Error showing Game Hall setup. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show channel selector for existing channel setup
     */
    static async showChannelSelector(interaction, componentType, componentName) {
        const embed = new EmbedBuilder()
            .setTitle(`📂 **SELECT CHANNEL FOR ${componentName.toUpperCase()}** 📂`)
            .setDescription(
                `**Choose Channel for ${componentName} Embed**\n\n` +
                '✅ **Authentication**: Verified\n' +
                `🎯 **Target Server**: ${interaction.guild?.name}\n` +
                `📋 **Component**: ${componentName} Interface\n\n` +
                `**Select where to place the ${componentName} embed:**\n` +
                '• Choose from your server\'s text channels\n' +
                '• The embed will be created in the selected channel\n' +
                '• Buttons will be functional immediately\n\n' +
                '*Select a channel from the dropdown below:*'
            )
            .setColor(0x0099ff)
            .setFooter({ text: `${componentName} Setup • Channel Selection` })
            .setTimestamp();

        // Get text channels
        const channels = interaction.guild.channels.cache
            .filter(ch => ch.type === 0) // Text channels only
            .first(20); // Limit to 20 channels

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('setup_channel_selection')
            .setPlaceholder('Choose a channel...')
            .addOptions(
                channels.map(channel => ({
                    label: `#${channel.name}`,
                    description: `Place ${componentName} embed in this channel`,
                    value: `${componentType}:${channel.id}`
                }))
            );

        const backButton = new ButtonBuilder()
            .setCustomId(`custom_setup_${componentType}`)
            .setLabel('⬅️ Back')
            .setStyle(ButtonStyle.Secondary);

        const cancelButton = new ButtonBuilder()
            .setCustomId('custom_setup_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger);

        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder().addComponents(backButton, cancelButton);

        await interaction.update({
            embeds: [embed],
            components: [row1, row2]
        });
    }

    /**
     * Handle channel selection
     */
    static async handleChannelSelection(interaction, selectedValue) {
        try {
            const [componentType, channelId] = selectedValue.split(':');
            const channel = interaction.guild.channels.cache.get(channelId);
            
            if (!channel) {
                await interaction.update({
                    content: '❌ Selected channel not found. Please try again.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Clean up existing embeds in the channel first
            await this.cleanupChannelEmbeds(channel);

            // Create embed in selected channel
            const { PermanentEmbedHandler } = await import('../ui/PermanentEmbedHandler.js');

            switch (componentType) {
                case 'game_hall':
                    await PermanentEmbedHandler.createGameHallEmbedForSetup(channel, interaction.user);
                    await this.showSetupSuccess(interaction, 'Game Hall', channel, 'custom_setup_game_hall');
                    break;
                case 'marketplace':
                    await PermanentEmbedHandler.createMarketplaceEmbedForSetup(channel, interaction.user);
                    await this.showSetupSuccess(interaction, 'Marketplace', channel, 'custom_setup_marketplace');
                    break;
                case 'casino':
                    await PermanentEmbedHandler.createCasinoEmbedForSetup(channel, interaction.user);
                    await this.showSetupSuccess(interaction, 'Casino', channel, 'custom_setup_casino');
                    break;
            }

        } catch (error) {
            logger.error('Error handling channel selection:', error);
            await interaction.update({
                content: '❌ Error creating embed. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show setup success message
     */
    static async showSetupSuccess(interaction, componentName, channel, backAction) {
        const embed = new EmbedBuilder()
            .setTitle(`✅ **${componentName.toUpperCase()} SETUP COMPLETE** ✅`)
            .setDescription(
                `**${componentName} Successfully Installed!**\n\n` +
                '✅ **Authentication**: Verified\n' +
                `🎯 **Target Server**: ${interaction.guild?.name}\n` +
                `📋 **Component**: ${componentName} Interface\n` +
                `📍 **Channel**: ${channel}\n\n` +
                `**${componentName} Features Active:**\n` +
                '• Embed created and functional\n' +
                '• All buttons working correctly\n' +
                '• Ready for player interaction\n\n' +
                '**What\'s Next?**\n' +
                '• Set up additional components\n' +
                '• Configure permissions if needed\n' +
                '• Announce to your community\n\n' +
                '*Your server setup is progressing smoothly!*'
            )
            .setColor(0x00ff00)
            .setFooter({ text: `${componentName} Setup Complete • Continue Setup` })
            .setTimestamp();

        const continueButton = new ButtonBuilder()
            .setCustomId('bot_setup_custom')
            .setLabel('🎛️ Continue Setup')
            .setStyle(ButtonStyle.Primary);

        const masterPanelButton = new ButtonBuilder()
            .setCustomId('master_control_panel_return')
            .setLabel('🏠 Master Panel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(continueButton, masterPanelButton);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Show install all success message
     */
    static async showInstallAllSuccess(interaction, channels) {
        const channelList = channels.map(ch => `• ${ch.name}: ${ch.channel}`).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle('🎉 **COMPLETE INSTALLATION SUCCESS** 🎉')
            .setDescription(
                '**All Components Successfully Installed!**\n\n' +
                '✅ **Authentication**: Verified\n' +
                `🎯 **Target Server**: ${interaction.guild?.name}\n` +
                `📋 **Components**: All Three Embeds\n\n` +
                '**Channels Created:**\n' +
                channelList + '\n\n' +
                '**What\'s Active:**\n' +
                '🎮 Game Hall - Players can start adventures\n' +
                '🛒 Marketplace - Trading and store access\n' +
                '🎰 Casino - Gambling and entertainment\n\n' +
                '**Your server is now fully set up and ready!**\n' +
                '*Players can immediately begin using all features.*'
            )
            .setColor(0x00ff00)
            .setFooter({ text: 'Complete Setup Success • Server Ready' })
            .setTimestamp();

        const masterPanelButton = new ButtonBuilder()
            .setCustomId('master_control_panel_return')
            .setLabel('🏠 Return to Master Panel')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(masterPanelButton);

        try {
            await interaction.editReply({
                content: '',
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            logger.error('Error showing install all success:', error);
            await interaction.editReply({
                content: '✅ **Setup Complete!** All channels and embeds have been successfully created and are ready for use.'
            });
        }
    }

    /**
     * Find or create Dungeonites category
     */
    static async findOrCreateDungeonitesCategory(guild) {
        // Look for existing Dungeonites category
        let category = guild.channels.cache.find(
            channel => channel.type === 4 && channel.name.toLowerCase() === 'dungeonites'
        );

        // Create category if it doesn't exist
        if (!category) {
            category = await guild.channels.create({
                name: 'Dungeonites',
                type: 4, // Category channel
                reason: 'Dungeonites category created via Bot Developer setup'
            });
            logger.info(`Created Dungeonites category in ${guild.name}`);
        }

        return category;
    }

    /**
     * Clean up existing Dungeonites channels
     */
    static async cleanupExistingDungeonitesChannels(guild) {
        try {
            // First, delete the Dungeonites category and all its channels
            const dungeonitesCategory = guild.channels.cache.find(
                channel => channel.type === 4 && channel.name === 'Dungeonites'
            );
            
            if (dungeonitesCategory) {
                // Delete all channels in the category first
                const categoryChannels = guild.channels.cache.filter(
                    channel => channel.parentId === dungeonitesCategory.id
                );
                
                for (const channel of categoryChannels.values()) {
                    await channel.delete(`Cleanup for Bot Developer setup refresh`);
                    logger.info(`Deleted channel in Dungeonites category: ${channel.name} in ${guild.name}`);
                }
                
                // Now delete the category itself
                await dungeonitesCategory.delete(`Cleanup for Bot Developer setup refresh`);
                logger.info(`Deleted Dungeonites category in ${guild.name}`);
            }
            
            // Also check for any standalone channels with our names
            const channelNames = ['🎮│game-hall', '🛒│marketplace', '🎰│casino', '⚔️│master-dashboard'];
            const deletedChannels = [];

            for (const channelName of channelNames) {
                const existingChannel = guild.channels.cache.find(
                    channel => channel.type === 0 && channel.name === channelName
                );
                
                if (existingChannel) {
                    await existingChannel.delete(`Cleanup for Bot Developer setup refresh`);
                    deletedChannels.push(channelName);
                    logger.info(`Deleted existing standalone channel: ${channelName} in ${guild.name}`);
                }
            }

            if (deletedChannels.length > 0) {
                logger.info(`Cleaned up ${deletedChannels.length} additional standalone Dungeonites channels in ${guild.name}`);
            }
        } catch (error) {
            logger.error('Error cleaning up existing channels:', error);
            // Don't throw - continue with setup even if cleanup fails
        }
    }

    /**
     * Clean up existing embeds in a channel
     */
    static async cleanupChannelEmbeds(channel) {
        try {
            // Fetch recent messages that might contain embeds
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(msg => 
                msg.author.bot && 
                msg.embeds.length > 0 && 
                (
                    msg.embeds[0].title?.includes('DUNGEONITES') ||
                    msg.embeds[0].title?.includes('GAME HALL') ||
                    msg.embeds[0].title?.includes('MARKETPLACE') ||
                    msg.embeds[0].title?.includes('CASINO')
                )
            );

            if (botMessages.size > 0) {
                for (const message of botMessages.values()) {
                    await message.delete();
                }
                logger.info(`Cleaned up ${botMessages.size} existing embeds in channel: ${channel.name}`);
            }
        } catch (error) {
            logger.error('Error cleaning up channel embeds:', error);
            // Don't throw - continue with setup even if cleanup fails
        }
    }

    /**
     * Placeholder handlers for additional channel selection methods
     */
    static async showMultiChannelSelector(interaction) {
        await interaction.update({
            content: '🚧 Multi-channel selector coming soon! For now, please set up components individually.',
            embeds: [],
            components: []
        });
    }

    static async handleConfirmSelection(interaction) {
        await interaction.update({
            content: '✅ Selection confirmed!',
            embeds: [],
            components: []
        });
    }

    static async handleCancelSelection(interaction) {
        await this.handleBotSetupCustom(interaction);
    }

    static async handleContinueFlow(interaction) {
        await this.handleBotSetupCustom(interaction);
    }

    /**
     * Find existing Dungeonites assets in a guild
     */
    static async findDungeonitesAssets(guild) {
        try {
            const assets = {
                category: null,
                channels: [],
                hasAssets: false
            };

            // Find Dungeonites category
            const dungeonitesCategory = guild.channels.cache.find(
                channel => channel.type === 4 && // Category channel
                channel.name.toLowerCase().includes('dungeonites')
            );

            if (dungeonitesCategory) {
                assets.category = dungeonitesCategory;
                assets.hasAssets = true;
            }

            // Find Dungeonites-related channels
            const dungeonitesChannels = guild.channels.cache.filter(channel => {
                const name = channel.name.toLowerCase();
                return (
                    name.includes('game-hall') ||
                    name.includes('marketplace') ||
                    name.includes('casino') ||
                    (channel.parent && channel.parent.name && channel.parent.name.toLowerCase().includes('dungeonites'))
                );
            });

            if (dungeonitesChannels.size > 0) {
                assets.channels = Array.from(dungeonitesChannels.values());
                assets.hasAssets = true;
            }

            return assets;

        } catch (error) {
            logger.error('Error finding Dungeonites assets:', error);
            return { category: null, channels: [], hasAssets: false };
        }
    }

    /**
     * Handle Remove Dungeonites Assets request
     */
    static async handleRemoveDungeonitesAssets(interaction) {
        try {
            const assets = await this.findDungeonitesAssets(interaction.guild);

            if (!assets.hasAssets) {
                await interaction.update({
                    content: '✅ **No Dungeonites Assets Found**\n\nThere are no Dungeonites channels or categories to remove.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Show confirmation dialog
            const embed = new EmbedBuilder()
                .setTitle('⚠️ **CONFIRM ASSET REMOVAL** ⚠️')
                .setDescription(
                    '**WARNING: This will permanently delete Dungeonites assets!**\n\n' +
                    `🏰 **Server**: ${interaction.guild.name}\n\n` +
                    '**Assets to be removed:**\n' +
                    (assets.category ? `📂 **Category**: ${assets.category.name}\n` : '') +
                    (assets.channels.length > 0 ? 
                        `📺 **Channels**: ${assets.channels.length} found\n` +
                        assets.channels.map(ch => `   └ ${ch.name}`).join('\n') + '\n' : ''
                    ) +
                    '\n**⚠️ THIS ACTION CANNOT BE UNDONE!**\n' +
                    '*All messages, embeds, and channel history will be lost.*\n\n' +
                    '*Are you sure you want to proceed?*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Asset Removal Confirmation • PERMANENT ACTION' })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_remove_assets')
                .setLabel('🗑️ YES - Remove All Assets')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_remove_assets')
                .setLabel('❌ Cancel - Keep Assets')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error handling remove assets request:', error);
            await interaction.update({
                content: '❌ Error checking assets for removal. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle confirmed asset removal
     */
    static async handleConfirmRemoveAssets(interaction) {
        try {
            const assets = await this.findDungeonitesAssets(interaction.guild);

            if (!assets.hasAssets) {
                await interaction.update({
                    content: '✅ No assets found to remove.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Show progress message
            await interaction.update({
                content: '🗑️ **Removing Dungeonites Assets...**\n\nPlease wait while assets are being deleted...',
                embeds: [],
                components: []
            });

            let removedChannels = 0;
            let removedCategories = 0;

            // Remove channels first
            for (const channel of assets.channels) {
                try {
                    await channel.delete('Dungeonites assets cleanup');
                    removedChannels++;
                    logger.info(`Removed Dungeonites channel: ${channel.name} in ${interaction.guild.name}`);
                } catch (channelError) {
                    logger.error(`Failed to remove channel ${channel.name}:`, channelError);
                }
            }

            // Remove category last
            if (assets.category) {
                try {
                    await assets.category.delete('Dungeonites assets cleanup');
                    removedCategories++;
                    logger.info(`Removed Dungeonites category: ${assets.category.name} in ${interaction.guild.name}`);
                } catch (categoryError) {
                    logger.error(`Failed to remove category ${assets.category.name}:`, categoryError);
                }
            }

            // Show completion message
            const embed = new EmbedBuilder()
                .setTitle('✅ **DUNGEONITES ASSETS REMOVED** ✅')
                .setDescription(
                    '**Asset removal completed successfully!**\n\n' +
                    `🏰 **Server**: ${interaction.guild.name}\n\n` +
                    '**Removed:**\n' +
                    `📺 **Channels**: ${removedChannels} deleted\n` +
                    `📂 **Categories**: ${removedCategories} deleted\n\n` +
                    '**Your server is now clean and ready for fresh setup!**\n' +
                    '*You can run setup again anytime.*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Asset Removal Complete • Server Ready' })
                .setTimestamp();

            const setupAgainButton = new ButtonBuilder()
                .setCustomId('bot_setup_config')
                .setLabel('🚀 Setup Again')
                .setStyle(ButtonStyle.Primary);

            const masterPanelButton = new ButtonBuilder()
                .setCustomId('master_control_panel_return')
                .setLabel('🏠 Return to Master Panel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(setupAgainButton, masterPanelButton);

            await interaction.editReply({
                content: null,
                embeds: [embed],
                components: [row]
            });

            // Log the cleanup action
            auditLogger.log('ASSET_CLEANUP', `Dungeonites assets removed from ${interaction.guild.name}`, 'asset_removal', {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                channelsRemoved: removedChannels,
                categoriesRemoved: removedCategories,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('Error removing Dungeonites assets:', error);
            await interaction.editReply({
                content: '❌ Error removing assets. Some items may not have been deleted. Please check manually.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle cancel asset removal
     */
    static async handleCancelRemoveAssets(interaction) {
        try {
            await this.handleCustomSetupCancel(interaction);
        } catch (error) {
            logger.error('Error cancelling asset removal:', error);
            await interaction.update({
                content: '❌ Error returning to cancel menu. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle password change modal submission
     */
    static async handlePasswordChange(interaction) {
        try {
            const currentPassword = interaction.fields.getTextInputValue('current_password');
            const newPassword = interaction.fields.getTextInputValue('new_password');
            const confirmPassword = interaction.fields.getTextInputValue('confirm_password');

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                await interaction.reply({
                    content: '❌ **New passwords do not match.** Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Validate password strength
            if (newPassword.length < 8) {
                await interaction.reply({
                    content: '❌ **Password must be at least 8 characters long.** Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Get current profile
            const masterProfile = await this.getMasterProfile();
            if (!masterProfile) {
                await interaction.reply({
                    content: '❌ **Master profile not found.** Please contact support.',
                    ephemeral: true
                });
                return;
            }

            // Verify current password
            const { profileDB } = await import('../../database/ProfileDatabase.js');
            if (!profileDB.verifyPassword(masterProfile.passwordHash, currentPassword)) {
                await interaction.reply({
                    content: '❌ **Current password is incorrect.** Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Update password
            const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
            masterProfile.passwordHash = newPasswordHash;
            masterProfile.lastLogin = new Date().toISOString();

            await this.saveMasterProfile(masterProfile);

            // Invalidate all existing sessions for security
            this.masterSessions.clear();

            auditLogger.log('MASTER_PASSWORD_CHANGE', 'Master password changed successfully', 'password_change', {
                userId: this.BOT_DEVELOPER_ID,
                timestamp: new Date()
            });

            await interaction.reply({
                content: '✅ **Master password changed successfully!**\n\n' +
                        '🔐 **Your password has been updated securely**\n' +
                        '🚪 **All sessions have been logged out for security**\n' +
                        '📝 **Change has been logged in audit trail**\n\n' +
                        '*Please log in again with your new password.*',
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error handling password change:', error);
            await interaction.reply({
                content: '❌ **Error changing password.** Please try again or contact support.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle security profile update modal submission
     */
    static async handleSecurityProfileUpdate(interaction) {
        try {
            const xAccount = interaction.fields.getTextInputValue('x_account').trim();
            const evmWallet = interaction.fields.getTextInputValue('evm_wallet').trim();
            const email = interaction.fields.getTextInputValue('email_address').trim();

            // Validate inputs
            const errors = [];
            
            if (xAccount && !xAccount.startsWith('@')) {
                errors.push('X account must start with @');
            }
            
            if (evmWallet && !evmWallet.startsWith('0x') && !evmWallet.endsWith('.eth')) {
                errors.push('EVM wallet must be a valid address (0x...) or ENS (.eth)');
            }
            
            if (email && !email.includes('@')) {
                errors.push('Email must be a valid email address');
            }

            if (errors.length > 0) {
                await interaction.reply({
                    content: '❌ **Validation errors:**\n' + errors.map(e => `• ${e}`).join('\n'),
                    ephemeral: true
                });
                return;
            }

            // Get current profile
            const masterProfile = await this.getMasterProfile();
            if (!masterProfile) {
                await interaction.reply({
                    content: '❌ **Master profile not found.** Please contact support.',
                    ephemeral: true
                });
                return;
            }

            // Update profile
            masterProfile.xAccount = xAccount || null;
            masterProfile.evmWallet = evmWallet || null;
            masterProfile.email = email || null;
            masterProfile.lastLogin = new Date().toISOString();

            // Update recovery methods array
            const recoveryMethods = [];
            if (xAccount) recoveryMethods.push('x_account');
            if (evmWallet) recoveryMethods.push('evm_wallet');
            if (email) recoveryMethods.push('email');
            if (recoveryMethods.length === 0) recoveryMethods.push('emergency_recovery');

            masterProfile.recoveryMethods = JSON.stringify(recoveryMethods);

            await this.saveMasterProfile(masterProfile);

            auditLogger.log('MASTER_SECURITY_UPDATE', 'Security profile updated', 'security_update', {
                userId: this.BOT_DEVELOPER_ID,
                recoveryMethodsCount: recoveryMethods.length,
                timestamp: new Date()
            });

            await interaction.reply({
                content: '✅ **Security profile updated successfully!**\n\n' +
                        `🛡️ **Recovery Methods Configured: ${recoveryMethods.length}/3**\n` +
                        `🐦 **X Account**: ${xAccount || '❌ Not set'}\n` +
                        `💎 **EVM Wallet**: ${evmWallet ? '✅ ' + evmWallet.substring(0,8) + '...' : '❌ Not set'}\n` +
                        `📧 **Email**: ${email || '❌ Not set'}\n\n` +
                        '📝 **Changes logged in audit trail**\n' +
                        '*Your security profile has been updated for P2E protection.*',
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error handling security profile update:', error);
            await interaction.reply({
                content: '❌ **Error updating security profile.** Please try again or contact support.',
                ephemeral: true
            });
        }
    }

    /**
     * Show recovery test (placeholder for now)
     */
    static async showRecoveryTest(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 **RECOVERY METHOD TEST** 🔄')
            .setDescription('**Test Your Recovery Methods**\n\n🚧 This feature is being implemented...\n\n' +
                          'In the future, this will test:\n' +
                          '• X account verification\n' +
                          '• EVM wallet signature\n' +
                          '• Email verification code')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    /**
     * Show security log (placeholder for now)
     */
    static async showSecurityLog(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📊 **SECURITY LOG** 📊')
            .setDescription('**Recent Security Events**\n\n🚧 This feature is being implemented...\n\n' +
                          'In the future, this will show:\n' +
                          '• Login attempts\n' +
                          '• Password changes\n' +
                          '• Recovery attempts\n' +
                          '• Profile updates')
            .setColor(0xff6600);
        
        await interaction.update({ embeds: [embed], components: [] });
    }

    /**
     * Execute auto full setup with NEW Dashboard Structure
     */
    static async executeAutoFullSetup(interaction) {
        try {
            // Clean up existing Dungeonites channels first
            await this.cleanupExistingDungeonitesChannels(interaction.guild);
            
            // Find or create Dungeonites category AFTER cleanup
            const category = await this.findOrCreateDungeonitesCategory(interaction.guild);
            
            const channels = [];
            const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');

            // Create Admin Start Here channel
            const adminStartChannel = await interaction.guild.channels.create({
                name: '⚙️│admin-start-here',
                type: 0,
                parent: category.id,
                reason: 'Admin Start Here channel created via Master Auto-Setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });
            channels.push({ name: 'Admin Start Here', channel: adminStartChannel });

            // Create Player Start Here channel  
            const playerStartChannel = await interaction.guild.channels.create({
                name: '🎮│start-here',
                type: 0,
                parent: category.id,
                reason: 'Player Start Here channel created via Master Auto-Setup',
                permissionOverwrites: [
                    {
                        id: interaction.client.user.id, // Bot itself
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis']
                    }
                ]
            });
            channels.push({ name: 'Start Here (Players)', channel: playerStartChannel });

            // Create PRIVATE Bot Dev Dashboard channel
            let botDevDashboardChannel;
            let isPrivate = false;
            
            try {
                // Try to create private channel first with explicit bot permissions
                botDevDashboardChannel = await interaction.guild.channels.create({
                    name: '⚔️│bot-dev-dashboard',
                    type: 0,
                    parent: category.id,
                    reason: 'Bot Dev Dashboard channel created via Master Auto-Setup',
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id, // @everyone
                            deny: ['ViewChannel']
                        },
                        {
                            id: interaction.user.id, // Bot Developer
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'UseExternalEmojis']
                        },
                        {
                            id: interaction.client.user.id, // Bot itself - CRITICAL: Must be last override
                            allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis', 'ManageMessages', 'AddReactions']
                        }
                    ]
                });
                isPrivate = true;
                logger.info('Private Bot Dev Dashboard channel created successfully via auto-setup');
            } catch (permError) {
                logger.warn('Cannot create private Bot Dev Dashboard in auto-setup, falling back to public:', permError.message);
                
                // Fallback: Create regular channel with bot permissions
                botDevDashboardChannel = await interaction.guild.channels.create({
                    name: '⚔️│bot-dev-dashboard',
                    type: 0,
                    parent: category.id,
                    reason: 'Bot Dev Dashboard channel created via Master Auto-Setup (public fallback)',
                    permissionOverwrites: [
                        {
                            id: interaction.client.user.id, // Bot itself
                            allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory', 'UseExternalEmojis', 'ManageMessages', 'AddReactions']
                        }
                    ]
                });
                isPrivate = false;
            }
            
            channels.push({ 
                name: isPrivate ? 'Bot Dev Dashboard (PRIVATE)' : 'Bot Dev Dashboard (Public - Manual Privacy Setup Needed)', 
                channel: botDevDashboardChannel 
            });

            // Create dashboard embeds in each channel using the new DashboardEmbedHandler
            await DashboardEmbedHandler.createAdminStartHereEmbed(adminStartChannel, interaction.user);
            await DashboardEmbedHandler.createPlayerStartHereEmbed(playerStartChannel, interaction.user);
            
            // Create Bot Dev Dashboard embed with enhanced error handling
            try {
                await DashboardEmbedHandler.createBotDevDashboardEmbed(botDevDashboardChannel, interaction.user);
            } catch (dashboardError) {
                logger.error('Bot Dev Dashboard embed creation failed, attempting permission fix:', dashboardError);
                
                // Try to fix permissions explicitly
                try {
                    await botDevDashboardChannel.permissionOverwrites.edit(interaction.client.user.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        EmbedLinks: true,
                        AttachFiles: true,
                        ReadMessageHistory: true,
                        UseExternalEmojis: true,
                        ManageMessages: true,
                        AddReactions: true
                    });
                    
                    // Retry embed creation
                    await DashboardEmbedHandler.createBotDevDashboardEmbed(botDevDashboardChannel, interaction.user);
                    logger.info('Bot Dev Dashboard embed created successfully after permission fix');
                } catch (retryError) {
                    logger.error('Bot Dev Dashboard embed creation failed even after permission fix:', retryError);
                    // Create fallback basic dashboard
                    await this.createFallbackBotDevDashboard(botDevDashboardChannel, interaction.user);
                }
            }

            // Show success message
            await this.showDashboardSetupSuccess(interaction, channels, botDevDashboardChannel);

            logger.info(`Dashboard-based Auto-Setup completed successfully in ${interaction.guild.name} by ${interaction.user.username}`);

        } catch (error) {
            logger.error('Error during dashboard auto-setup:', error);
            await interaction.editReply({
                content: '❌ Error during dashboard auto-setup. Please try manual setup.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show dashboard setup success message
     */
    static async showDashboardSetupSuccess(interaction, channels, botDevDashboardChannel) {
        try {
            const channelList = channels.map(ch => `• ${ch.name}: ${ch.channel}`).join('\n');
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 **DASHBOARD ARCHITECTURE COMPLETE** 🎉')
                .setDescription(
                    '**🏗️ Dashboard Ecosystem Successfully Created!**\n\n' +
                    '✅ **Dashboard Auto-Setup**: Complete\n' +
                    `🎯 **Server**: ${interaction.guild?.name}\n` +
                    `👑 **Bot Developer**: Ultimate Control\n\n` +
                    '**📂 Dashboard Channels Created:**\n' +
                    channelList + '\n\n' +
                    '**🚀 Dashboard Flow:**\n' +
                    '⚙️ **Admin Start Here** - Server owners create profiles & access admin dashboard\n' +
                    '🎮 **Start Here** - Players create profiles & access their personal dashboard\n' +
                    '⚔️ **Bot Dev Dashboard** - YOUR private command center with ultimate power\n\n' +
                    '**✨ DASHBOARD ARCHITECTURE ACHIEVED!**\n' +
                    '*Clean server design with contained player interactions!*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Dashboard Architecture • Clean Server Design' })
                .setTimestamp();

            const dashboardButton = new ButtonBuilder()
                .setCustomId('goto_bot_dev_dashboard')
                .setLabel('⚔️ Access Bot Dev Dashboard')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(dashboardButton);

            await interaction.editReply({
                content: '',
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing dashboard setup success:', error);
            await interaction.editReply({
                content: '✅ Dashboard setup complete! Check the channels in the Dungeonites category.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Create fallback Bot Dev Dashboard if DashboardEmbedHandler fails
     */
    static async createFallbackBotDevDashboard(channel, user) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('⚔️ **BOT DEVELOPER DASHBOARD** ⚔️')
                .setDescription(
                    '**Ultimate Control Center**\n\n' +
                    '🛠️ **System Management** - Complete server control\n' +
                    '💰 **Economy Tools** - Unlimited currency & item sending\n' +
                    '⚔️ **Game Management** - Full game customization\n' +
                    '📊 **Analytics** - System monitoring & logs\n\n' +
                    '*Use `/master` for full dashboard access*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Bot Developer Dashboard • Ultimate Authority' })
                .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

            logger.info(`Fallback Bot Dev Dashboard created in ${channel.name} by ${user.username}`);
        } catch (error) {
            logger.error('Error creating fallback Bot Dev Dashboard:', error);
            throw error;
        }
    }

    /**
     * Show Master Economy Tools (Bot Developer unlimited powers)
     */
    static async showMasterEconomyTools(interaction, skipAuth = false) {
        try {
            // Skip authentication if already verified by Master Dashboard
            if (!skipAuth && !this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('💰 **MASTER ECONOMY TOOLS** 💰')
                .setDescription(
                    '**Bot Developer Economic Controls**\n\n' +
                    '⚡ **UNLIMITED POWERS ACTIVE** ⚡\n\n' +
                    '🪙 **Infinite Gold Generation** - Create any amount of in-game gold\n' +
                    '🎒 **Infinite Item Creation** - Generate any game items (respects item limits)\n' +
                    '💱 **Manual Credit/Debit** - Fix transaction errors, failed P2P trades\n' +
                    '👤 **Profile Economy Control** - Edit any player\'s currency values\n' +
                    '🌐 **Crypto Operations** - Send real crypto (requires wallet balance + password)\n' +
                    '🚨 **Emergency Corrections** - Instant balance fixes for support issues\n' +
                    '📊 **Master Analytics** - Cross-server economy overview\n\n' +
                    '⚠️ **SECURITY**: All actions are logged and audited\n' +
                    '🔐 **CRYPTO**: Real crypto requires password confirmation\n\n' +
                    '*Select operation:*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Master Economy Tools • Infinite Authority • All Actions Logged' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🪙 Infinite Gold Operations')
                    .setDescription('Generate/burn unlimited in-game gold')
                    .setValue('master_gold_ops'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎒 Infinite Item Operations')
                    .setDescription('Generate/remove any game items')
                    .setValue('master_item_ops'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💱 Manual Credit/Debit')
                    .setDescription('Fix transaction errors and failed trades')
                    .setValue('master_manual_ops'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👤 Profile Economy Editor')
                    .setDescription('Edit any player\'s currency values')
                    .setValue('master_profile_economy'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🌐 Crypto Operations')
                    .setDescription('Send real crypto (password protected)')
                    .setValue('master_crypto_ops'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Master Analytics')
                    .setDescription('Cross-server economy statistics')
                    .setValue('master_economy_analytics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Dashboard')
                    .setDescription('Return to Master Dashboard')
                    .setValue('back_to_master_dashboard')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_economy_tools')
                .setPlaceholder('Choose master economy operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing master economy tools:', error);
            await interaction.update({
                content: '❌ Error loading master economy tools.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Master Economy Tools selection
     */
    static async handleMasterEconomySelection(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'master_gold_ops':
                    await this.showInfiniteGoldOperations(interaction);
                    break;
                case 'master_item_ops':
                    await this.showInfiniteItemOperations(interaction);
                    break;
                case 'master_manual_ops':
                    await this.showManualCreditDebit(interaction);
                    break;
                case 'master_profile_economy':
                    await this.showProfileEconomyEditor(interaction);
                    break;
                case 'master_crypto_ops':
                    await this.showCryptoOperations(interaction);
                    break;
                case 'master_economy_analytics':
                    await this.showMasterEconomyAnalytics(interaction);
                    break;
                case 'back_to_master_dashboard':
                    // Navigate back to master dashboard
                    const masterDashboardChannel = interaction.guild.channels.cache.find(
                        ch => ch.type === 0 && (ch.name === '⚔️│master-dashboard' || ch.name === 'master-dashboard')
                    );
                    if (masterDashboardChannel) {
                        await interaction.update({
                            content: `🎯 **Returning to Master Dashboard**: ${masterDashboardChannel}\n\n⚔️ **Access your full command center there!**`,
                            embeds: [],
                            components: []
                        });
                    } else {
                        await interaction.update({
                            content: '❌ Master Dashboard channel not found.',
                            embeds: [],
                            components: []
                        });
                    }
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown master economy action.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling master economy selection:', error);
            await interaction.update({
                content: '❌ Error processing master economy action.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Infinite Gold Operations
     */
    static async showInfiniteGoldOperations(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🪙 **INFINITE GOLD OPERATIONS** 🪙')
                .setDescription(
                    '**Unlimited Gold Generation & Management**\n\n' +
                    '✨ **INFINITE POWERS**: No limits on gold amounts\n' +
                    '⚡ **INSTANT PROCESSING**: Changes apply immediately\n\n' +
                    '**Available Operations:**\n' +
                    '➕ **Generate Gold** - Create any amount of gold for any player\n' +
                    '➖ **Burn Gold** - Remove gold from any player\'s balance\n' +
                    '💰 **Set Balance** - Set exact gold amount for any player\n' +
                    '📤 **Bulk Distribution** - Send gold to multiple players at once\n' +
                    '🎁 **Reward Distribution** - Mass rewards for events/compensation\n\n' +
                    '⚠️ **Security**: All operations require user ID and are logged\n\n' +
                    '*Select operation:*'
                )
                .setColor(0xffd700)
                .setFooter({ text: 'Infinite Gold Operations • No Limits • All Actions Logged' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('➕ Generate Gold')
                    .setDescription('Create unlimited gold for a player')
                    .setValue('generate_gold'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('➖ Burn Gold')
                    .setDescription('Remove gold from a player\'s balance')
                    .setValue('burn_gold'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Set Exact Balance')
                    .setDescription('Set precise gold amount for a player')
                    .setValue('set_gold_balance'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📤 Bulk Distribution')
                    .setDescription('Send gold to multiple players')
                    .setValue('bulk_gold_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Master Economy')
                    .setDescription('Return to master economy tools')
                    .setValue('back_to_master_economy')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_gold_operations')
                .setPlaceholder('Choose gold operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing infinite gold operations:', error);
            await interaction.update({
                content: '❌ Error loading gold operations.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Manual Credit/Debit Operations
     */
    static async showManualCreditDebit(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('💱 **MANUAL CREDIT/DEBIT OPERATIONS** 💱')
                .setDescription(
                    '**Emergency Economic Corrections**\n\n' +
                    '🚨 **EMERGENCY POWERS**: Fix any transaction issues\n' +
                    '⚡ **INSTANT RESOLUTION**: Immediate problem solving\n\n' +
                    '**Common Use Cases:**\n' +
                    '❌ **Failed P2P Trades** - Restore items/currency after failed trades\n' +
                    '🔄 **Transaction Errors** - Fix blockchain transaction failures\n' +
                    '💸 **Refund Requests** - Process legitimate refund requests\n' +
                    '🎯 **Compensation** - Reward players for bugs/issues\n' +
                    '⚖️ **Balance Corrections** - Fix database/sync errors\n\n' +
                    '**Supported Currencies:**\n' +
                    '🪙 **Gold** - In-game currency (unlimited)\n' +
                    '🟡 **$HERO Tokens** - Game tokens (unlimited)\n' +
                    '🔵 **$ETH** - Real cryptocurrency (requires wallet balance)\n\n' +
                    '⚠️ **Security**: All corrections are logged with reasons\n\n' +
                    '*Select correction type:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Manual Credit/Debit • Emergency Powers • All Actions Logged' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('❌ Fix Failed P2P Trade')
                    .setDescription('Restore items/currency after failed trade')
                    .setValue('fix_failed_trade'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Fix Transaction Error')
                    .setDescription('Correct blockchain transaction failures')
                    .setValue('fix_transaction_error'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💸 Process Refund')
                    .setDescription('Issue refunds for legitimate requests')
                    .setValue('process_refund'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎯 Issue Compensation')
                    .setDescription('Compensate players for bugs/issues')
                    .setValue('issue_compensation'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚖️ Balance Correction')
                    .setDescription('Fix database synchronization errors')
                    .setValue('balance_correction'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Master Economy')
                    .setDescription('Return to master economy tools')
                    .setValue('back_to_master_economy')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_manual_operations')
                .setPlaceholder('Choose correction type...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing manual credit/debit operations:', error);
            await interaction.update({
                content: '❌ Error loading manual operations.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Gold Operations selection
     */
    static async handleGoldOperations(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'generate_gold':
                    await this.showGenerateGoldModal(interaction);
                    break;
                case 'burn_gold':
                    await this.showBurnGoldModal(interaction);
                    break;
                case 'set_gold_balance':
                    await this.showSetGoldBalanceModal(interaction);
                    break;
                case 'bulk_gold_distribution':
                    await this.showBulkGoldModal(interaction);
                    break;
                case 'back_to_master_economy':
                    await this.showMasterEconomyTools(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown gold operation.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling gold operations:', error);
            await interaction.update({
                content: '❌ Error processing gold operation.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Manual Operations selection
     */
    static async handleManualOperations(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'fix_failed_trade':
                    await this.showFailedTradeModal(interaction);
                    break;
                case 'fix_transaction_error':
                    await this.showTransactionErrorModal(interaction);
                    break;
                case 'process_refund':
                    await this.showRefundModal(interaction);
                    break;
                case 'issue_compensation':
                    await this.showCompensationModal(interaction);
                    break;
                case 'balance_correction':
                    await this.showBalanceCorrectionModal(interaction);
                    break;
                case 'back_to_master_economy':
                    await this.showMasterEconomyTools(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown manual operation.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling manual operations:', error);
            await interaction.update({
                content: '❌ Error processing manual operation.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Generate Gold Modal
     */
    static async showGenerateGoldModal(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('master_generate_gold_modal')
                .setTitle('➕ Generate Infinite Gold');

            const userIdInput = new TextInputBuilder()
                .setCustomId('target_user_id')
                .setLabel('Target User ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter Discord User ID (e.g., 292854498299346945)')
                .setRequired(true)
                .setMaxLength(20);

            const amountInput = new TextInputBuilder()
                .setCustomId('gold_amount')
                .setLabel('Gold Amount')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter amount (e.g., 1000000) - NO LIMITS')
                .setRequired(true)
                .setMaxLength(20);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Reason (Audit Log)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain why you are generating this gold...')
                .setRequired(true)
                .setMaxLength(500);

            const row1 = new ActionRowBuilder().addComponents(userIdInput);
            const row2 = new ActionRowBuilder().addComponents(amountInput);
            const row3 = new ActionRowBuilder().addComponents(reasonInput);

            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing generate gold modal:', error);
            await interaction.update({
                content: '❌ Error showing gold generation form.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Generate Gold Modal
     */
    static async showBurnGoldModal(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('master_burn_gold_modal')
                .setTitle('➖ Burn Player Gold');

            const userIdInput = new TextInputBuilder()
                .setCustomId('target_user_id')
                .setLabel('Target User ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter Discord User ID (e.g., 292854498299346945)')
                .setRequired(true)
                .setMaxLength(20);

            const amountInput = new TextInputBuilder()
                .setCustomId('gold_amount')
                .setLabel('Gold Amount to Remove')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter amount to burn (e.g., 1000)')
                .setRequired(true)
                .setMaxLength(20);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Reason (Audit Log)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain why you are burning this gold...')
                .setRequired(true)
                .setMaxLength(500);

            const row1 = new ActionRowBuilder().addComponents(userIdInput);
            const row2 = new ActionRowBuilder().addComponents(amountInput);
            const row3 = new ActionRowBuilder().addComponents(reasonInput);

            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing burn gold modal:', error);
            await interaction.update({
                content: '❌ Error showing gold burn form.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Generate Gold Modal Submission
     */
    static async handleGenerateGoldSubmission(interaction) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await interaction.reply({
                    content: '❌ Authentication required.',
                    ephemeral: true
                });
                return;
            }

            const targetUserId = interaction.fields.getTextInputValue('target_user_id');
            const goldAmount = interaction.fields.getTextInputValue('gold_amount');
            const reason = interaction.fields.getTextInputValue('reason');

            // Validate inputs
            if (!targetUserId || !/^\d{17,20}$/.test(targetUserId)) {
                await interaction.reply({
                    content: '❌ Invalid User ID. Must be a valid Discord ID (17-20 digits).',
                    ephemeral: true
                });
                return;
            }

            const amount = parseInt(goldAmount);
            if (isNaN(amount) || amount <= 0) {
                await interaction.reply({
                    content: '❌ Invalid gold amount. Must be a positive number.',
                    ephemeral: true
                });
                return;
            }

            // Attempt to find the user in the guild to get their username
            let targetUsername = 'Unknown User';
            try {
                const targetUser = await interaction.guild.members.fetch(targetUserId);
                targetUsername = targetUser.user.username;
            } catch (error) {
                // User not in guild, continue with Unknown User
                logger.warn(`User ${targetUserId} not found in guild for gold generation`);
            }

            // Execute the infinite gold generation
            const success = await this.executeInfiniteGoldGeneration(targetUserId, amount, reason, interaction.user.id);

            if (success) {
                // Log the action for audit
                auditLogger.log('MASTER_GOLD_GENERATION', 
                    `Bot Developer generated ${amount.toLocaleString()} gold for user ${targetUserId} (${targetUsername})`, 
                    'master_economy', {
                        masterUserId: interaction.user.id,
                        targetUserId: targetUserId,
                        targetUsername: targetUsername,
                        amount: amount,
                        reason: reason,
                        serverId: interaction.guild.id,
                        serverName: interaction.guild.name
                    }
                );

                const embed = new EmbedBuilder()
                    .setTitle('✅ **GOLD GENERATION SUCCESSFUL** ✅')
                    .setDescription(
                        '**Infinite Gold Generated!**\n\n' +
                        `👤 **Target**: ${targetUsername} (\`${targetUserId}\`)\n` +
                        `🪙 **Amount**: ${amount.toLocaleString()} gold\n` +
                        `📝 **Reason**: ${reason}\n` +
                        `⏰ **Time**: ${new Date().toLocaleString()}\n\n` +
                        '**✨ UNLIMITED POWERS APPLIED ✨**\n' +
                        'Gold has been instantly added to the player\'s balance.\n\n' +
                        '🔍 **Audit Trail**: All actions are logged for security'
                    )
                    .setColor(0x00ff00)
                    .setFooter({ text: 'Master Economy Tools • Gold Generation Complete' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

            } else {
                await interaction.reply({
                    content: '❌ Failed to generate gold. Check logs for details.',
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error handling generate gold submission:', error);
            await interaction.reply({
                content: '❌ Error processing gold generation.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Burn Gold Modal Submission
     */
    static async handleBurnGoldSubmission(interaction) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await interaction.reply({
                    content: '❌ Authentication required.',
                    ephemeral: true
                });
                return;
            }

            const targetUserId = interaction.fields.getTextInputValue('target_user_id');
            const goldAmount = interaction.fields.getTextInputValue('gold_amount');
            const reason = interaction.fields.getTextInputValue('reason');

            // Validate inputs
            if (!targetUserId || !/^\d{17,20}$/.test(targetUserId)) {
                await interaction.reply({
                    content: '❌ Invalid User ID. Must be a valid Discord ID (17-20 digits).',
                    ephemeral: true
                });
                return;
            }

            const amount = parseInt(goldAmount);
            if (isNaN(amount) || amount <= 0) {
                await interaction.reply({
                    content: '❌ Invalid gold amount. Must be a positive number.',
                    ephemeral: true
                });
                return;
            }

            // Attempt to find the user in the guild to get their username
            let targetUsername = 'Unknown User';
            try {
                const targetUser = await interaction.guild.members.fetch(targetUserId);
                targetUsername = targetUser.user.username;
            } catch (error) {
                // User not in guild, continue with Unknown User
                logger.warn(`User ${targetUserId} not found in guild for gold burn`);
            }

            // Execute the gold burn operation
            const result = await this.executeGoldBurn(targetUserId, amount, reason, interaction.user.id);

            if (result.success) {
                // Log the action for audit
                auditLogger.log('MASTER_GOLD_BURN', 
                    `Bot Developer burned ${amount.toLocaleString()} gold from user ${targetUserId} (${targetUsername})`, 
                    'master_economy', {
                        masterUserId: interaction.user.id,
                        targetUserId: targetUserId,
                        targetUsername: targetUsername,
                        amount: amount,
                        burnedAmount: result.actualBurned,
                        previousBalance: result.previousBalance,
                        newBalance: result.newBalance,
                        reason: reason,
                        serverId: interaction.guild.id,
                        serverName: interaction.guild.name
                    }
                );

                const embed = new EmbedBuilder()
                    .setTitle('✅ **GOLD BURN SUCCESSFUL** ✅')
                    .setDescription(
                        '**Gold Removed from Player!**\n\n' +
                        `👤 **Target**: ${targetUsername} (\`${targetUserId}\`)\n` +
                        `🔥 **Burned**: ${result.actualBurned.toLocaleString()} gold\n` +
                        `📊 **Previous Balance**: ${result.previousBalance.toLocaleString()} gold\n` +
                        `💰 **New Balance**: ${result.newBalance.toLocaleString()} gold\n` +
                        `📝 **Reason**: ${reason}\n` +
                        `⏰ **Time**: ${new Date().toLocaleString()}\n\n` +
                        '**🔥 BURN OPERATION COMPLETE 🔥**\n' +
                        'Gold has been instantly removed from the player\'s balance.\n\n' +
                        '🔍 **Audit Trail**: All actions are logged for security'
                    )
                    .setColor(0xff6600)
                    .setFooter({ text: 'Master Economy Tools • Gold Burn Complete' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

            } else {
                await interaction.reply({
                    content: `❌ Failed to burn gold: ${result.error}`,
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error handling burn gold submission:', error);
            await interaction.reply({
                content: '❌ Error processing gold burn.',
                ephemeral: true
            });
        }
    }

    /**
     * Execute Infinite Gold Generation (Bot Developer unlimited powers)
     */
    static async executeInfiniteGoldGeneration(targetUserId, amount, reason, masterUserId) {
        try {
            // Get or create player profile
            const { profileDB } = await import('../../database/ProfileDatabase.js');
            
            // First try to get existing profile
            let playerProfile = await profileDB.getUserProfile(targetUserId, 'global'); // Use 'global' as server ID for cross-server
            
            if (!playerProfile) {
                // Create new profile with starting gold
                playerProfile = {
                    userId: targetUserId,
                    serverId: 'global',
                    username: 'Unknown',
                    profileType: 'user',
                    division: 'gold',
                    balance: amount, // Start with the generated amount
                    xp: 0,
                    level: 1,
                    lastLogin: new Date().toISOString(),
                    isActive: 1
                };
                
                await profileDB.saveUserProfile(playerProfile);
                logger.info(`Created new profile for user ${targetUserId} with ${amount} gold`);
            } else {
                // Add to existing balance (infinite generation)
                playerProfile.balance = (playerProfile.balance || 0) + amount;
                await profileDB.saveUserProfile(playerProfile);
                logger.info(`Added ${amount} gold to user ${targetUserId}, new balance: ${playerProfile.balance}`);
            }

            // Also update in DatabaseManager if connected
            try {
                const { DatabaseManager } = await import('../../database/DatabaseManager.js');
                await DatabaseManager.updatePlayerEconomy(targetUserId, {
                    gold: playerProfile.balance,
                    lastUpdated: new Date(),
                    updatedBy: 'master_infinite_generation',
                    updateReason: reason
                });
            } catch (dbError) {
                logger.warn('DatabaseManager update failed, but ProfileDB succeeded:', dbError.message);
            }

            return true;
        } catch (error) {
            logger.error('Error executing infinite gold generation:', error);
            return false;
        }
    }

    /**
     * Execute Gold Burn Operation
     */
    static async executeGoldBurn(targetUserId, amount, reason, masterUserId) {
        try {
            // Get player profile
            const { profileDB } = await import('../../database/ProfileDatabase.js');
            
            let playerProfile = await profileDB.getUserProfile(targetUserId, 'global');
            
            if (!playerProfile) {
                return {
                    success: false,
                    error: 'Player profile not found. Cannot burn gold from non-existent profile.'
                };
            }

            const previousBalance = playerProfile.balance || 0;
            const actualBurned = Math.min(amount, previousBalance); // Can't burn more than they have
            const newBalance = Math.max(0, previousBalance - amount); // Don't go negative

            // Update balance
            playerProfile.balance = newBalance;
            await profileDB.saveUserProfile(playerProfile);

            // Also update in DatabaseManager if connected
            try {
                const { DatabaseManager } = await import('../../database/DatabaseManager.js');
                await DatabaseManager.updatePlayerEconomy(targetUserId, {
                    gold: newBalance,
                    lastUpdated: new Date(),
                    updatedBy: 'master_gold_burn',
                    updateReason: reason
                });
            } catch (dbError) {
                logger.warn('DatabaseManager update failed, but ProfileDB succeeded:', dbError.message);
            }

            logger.info(`Burned ${actualBurned} gold from user ${targetUserId}, balance: ${previousBalance} -> ${newBalance}`);

            return {
                success: true,
                actualBurned: actualBurned,
                previousBalance: previousBalance,
                newBalance: newBalance
            };
        } catch (error) {
            logger.error('Error executing gold burn:', error);
            return {
                success: false,
                error: 'Database error during gold burn operation.'
            };
        }
    }

    /**
     * Show Infinite Item Operations (Promo Weapons & Rewards)
     */
    static async showInfiniteItemOperations(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎒 **INFINITE ITEM OPERATIONS** 🎒')
                .setDescription(
                    '**Unlimited Item & Promo Distribution System**\n\n' +
                    '⚡ **UNLIMITED POWERS**: Generate any items (respects item limits where applicable)\n' +
                    '🎁 **PROMO DISTRIBUTION**: Perfect for promotional campaigns\n\n' +
                    '**Promo Weapons & Rewards:**\n' +
                    '⚔️ **Beta Tester Dagger** - Legendary weapon for Beta Testers\n' +
                    '🛡️ **Bug Stomper Shield** - Epic shield for Bug Stompers\n' +
                    '🏆 **Special Event Items** - Limited collection promotional items\n' +
                    '🎪 **Campaign Rewards** - Custom promotional weapons/armor\n\n' +
                    '**Regular Game Items:**\n' +
                    '⚔️ **Weapons** - All rarities from common to mythical\n' +
                    '🛡️ **Armor** - Complete armor sets and pieces\n' +
                    '🧪 **Consumables** - Potions, scrolls, and enhancers\n' +
                    '🗝️ **Special Items** - Keys, portals, and rare materials\n\n' +
                    '**Distribution Methods:**\n' +
                    '👤 **Single Player** - Send items to specific player\n' +
                    '👥 **Bulk Distribution** - Send to multiple players\n' +
                    '🎯 **Role-Based** - Distribute to users with specific Discord roles\n\n' +
                    '⚠️ **Security**: All distributions are logged with reasons\n\n' +
                    '*Select distribution type:*'
                )
                .setColor(0x9932cc)
                .setFooter({ text: 'Infinite Item Operations • Unlimited Authority • All Actions Logged' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎁 Promo Weapons & Rewards')
                    .setDescription('Distribute promotional weapons and special rewards')
                    .setValue('promo_weapons_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚔️ Regular Weapons')
                    .setDescription('Generate and distribute regular game weapons')
                    .setValue('regular_weapons_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Armor & Equipment')
                    .setDescription('Distribute armor sets and equipment')
                    .setValue('armor_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🧪 Consumables & Materials')
                    .setDescription('Send potions, scrolls, and materials')
                    .setValue('consumables_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🗝️ Special Items')
                    .setDescription('Distribute keys, portals, and rare items')
                    .setValue('special_items_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👥 Bulk Distribution')
                    .setDescription('Send items to multiple players at once')
                    .setValue('bulk_item_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎯 Role-Based Distribution')
                    .setDescription('Distribute based on Discord roles')
                    .setValue('role_based_distribution'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Master Economy')
                    .setDescription('Return to master economy tools')
                    .setValue('back_to_master_economy')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('master_item_operations')
                .setPlaceholder('Choose item operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing infinite item operations:', error);
            await interaction.update({
                content: '❌ Error loading item operations.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Item Operations selection
     */
    static async handleItemOperations(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'promo_weapons_distribution':
                    await this.showPromoWeaponsDistribution(interaction);
                    break;
                case 'regular_weapons_distribution':
                    await this.showRegularWeaponsDistribution(interaction);
                    break;
                case 'armor_distribution':
                    await this.showArmorDistribution(interaction);
                    break;
                case 'consumables_distribution':
                    await this.showConsumablesDistribution(interaction);
                    break;
                case 'special_items_distribution':
                    await this.showSpecialItemsDistribution(interaction);
                    break;
                case 'bulk_item_distribution':
                    await this.showBulkItemDistribution(interaction);
                    break;
                case 'role_based_distribution':
                    await this.showRoleBasedDistribution(interaction);
                    break;
                case 'back_to_master_economy':
                    await this.showMasterEconomyTools(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown item operation.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling item operations:', error);
            await interaction.update({
                content: '❌ Error processing item operation.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Promo Weapons Distribution (THE MAIN FEATURE!)
     */
    static async showPromoWeaponsDistribution(interaction) {
        try {
            const { weaponsData } = await import('../../data/weaponsData.js');
            
            // Find all promotional weapons
            const promoWeapons = weaponsData.filter(w => w.isPromotional);
            
            const embed = new EmbedBuilder()
                .setTitle('🎁 **PROMOTIONAL WEAPONS & REWARDS** 🎁')
                .setDescription(
                    '**Special Promotional Items Distribution**\n\n' +
                    '🎯 **Perfect for**: Promotional campaigns, beta rewards, special events\n' +
                    '⚡ **Unlimited Distribution**: No quantity limits for promotional items\n' +
                    '🎁 **Collection Tracking**: Automatic tracking of who received what\n\n' +
                    '**Available Promotional Weapons:**\n' +
                    (promoWeapons.length > 0 ? 
                        promoWeapons.map(w => `${w.emoji} **${w.name}** - ${w.rarity} (${w.description})`).join('\n') :
                        '🚧 No promotional weapons found in weapons data') +
                    '\n\n' +
                    '**Distribution Options:**\n' +
                    '👤 **Single Player** - Send to specific Discord user\n' +
                    '🎯 **Role-Based Distribution** - Auto-distribute to users with specific roles\n' +
                    '📝 **Manual Grant** - Custom promotional weapon distribution\n' +
                    '📊 **View Distribution** - See who has received promotional items\n\n' +
                    '⚠️ **Note**: All promotional distributions are permanently logged\n\n' +
                    '*Select distribution method:*'
                )
                .setColor(0xffd700)
                .setFooter({ text: 'Promotional Distribution • Unlimited Authority • All Grants Logged' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('👤 Send to Specific Player')
                    .setDescription('Grant promotional weapon to specific Discord user')
                    .setValue('promo_single_player'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎯 Role-Based Distribution')
                    .setDescription('Auto-grant to users with specific Discord roles')
                    .setValue('promo_role_based'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📝 Manual Grant Form')
                    .setDescription('Custom promotional weapon grant with full details')
                    .setValue('promo_manual_grant'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 View Distribution Log')
                    .setDescription('See who has received promotional weapons')
                    .setValue('promo_distribution_log'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 Manage Promo Weapons')
                    .setDescription('Add/remove/modify promotional weapons')
                    .setValue('manage_promo_weapons'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Item Operations')
                    .setDescription('Return to item operations menu')
                    .setValue('back_to_item_operations')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('promo_weapons_distribution')
                .setPlaceholder('Choose promotional distribution method...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing promo weapons distribution:', error);
            await interaction.update({
                content: '❌ Error loading promotional distribution.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Promo Weapons Distribution selection
     */
    static async handlePromoWeaponsDistribution(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'promo_single_player':
                    await this.showPromoSinglePlayerModal(interaction);
                    break;
                case 'promo_role_based':
                    await this.showPromoRoleBasedDistribution(interaction);
                    break;
                case 'promo_manual_grant':
                    await this.showPromoManualGrantModal(interaction);
                    break;
                case 'promo_distribution_log':
                    await this.showPromoDistributionLog(interaction);
                    break;
                case 'manage_promo_weapons':
                    await this.showManagePromoWeapons(interaction);
                    break;
                case 'back_to_item_operations':
                    await this.showInfiniteItemOperations(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown promotional action.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling promo weapons distribution:', error);
            await interaction.update({
                content: '❌ Error processing promotional action.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Promo Single Player Modal
     */
    static async showPromoSinglePlayerModal(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('promo_single_player_modal')
                .setTitle('🎁 Grant Promotional Weapon to Player');

            const userIdInput = new TextInputBuilder()
                .setCustomId('promo_user_id')
                .setLabel('Discord User ID (17-20 digits)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('292854498299346945')
                .setMaxLength(20);

            const weaponIdInput = new TextInputBuilder()
                .setCustomId('promo_weapon_id')
                .setLabel('Promotional Weapon ID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('beta_tester_dagger, bug_stomper_shield, etc.')
                .setMaxLength(100);

            const reasonInput = new TextInputBuilder()
                .setCustomId('promo_reason')
                .setLabel('Grant Reason (Required for audit)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Beta tester reward, promotional campaign, special event, etc.')
                .setMaxLength(500);

            const notesInput = new TextInputBuilder()
                .setCustomId('promo_notes')
                .setLabel('Additional Notes (Optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setPlaceholder('Any additional information about this grant...')
                .setMaxLength(500);

            const campaignInput = new TextInputBuilder()
                .setCustomId('promo_campaign')
                .setLabel('Campaign/Event Name (Optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Beta Testing Phase 1, Launch Event, etc.')
                .setMaxLength(100);

            const row1 = new ActionRowBuilder().addComponents(userIdInput);
            const row2 = new ActionRowBuilder().addComponents(weaponIdInput);
            const row3 = new ActionRowBuilder().addComponents(reasonInput);
            const row4 = new ActionRowBuilder().addComponents(notesInput);
            const row5 = new ActionRowBuilder().addComponents(campaignInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing promo single player modal:', error);
            await interaction.update({
                content: '❌ Error loading promotional grant form.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Promo Single Player Modal Submission
     */
    static async handlePromoSinglePlayerSubmission(interaction) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await interaction.reply({
                    content: '❌ Authentication required for promotional grants.',
                    ephemeral: true
                });
                return;
            }

            const userId = interaction.fields.getTextInputValue('promo_user_id').trim();
            const weaponId = interaction.fields.getTextInputValue('promo_weapon_id').trim();
            const reason = interaction.fields.getTextInputValue('promo_reason').trim();
            const notes = interaction.fields.getTextInputValue('promo_notes')?.trim() || '';
            const campaign = interaction.fields.getTextInputValue('promo_campaign')?.trim() || '';

            // Validate user ID
            if (!/^\d{17,20}$/.test(userId)) {
                await interaction.reply({
                    content: '❌ Invalid Discord User ID. Must be 17-20 digits.',
                    ephemeral: true
                });
                return;
            }

            // Defer reply for processing
            await interaction.deferReply();

            // Try to get user info
            let username = 'Unknown User';
            try {
                const user = await interaction.client.users.fetch(userId);
                username = user.username;
            } catch (error) {
                logger.warn(`Could not fetch user ${userId}:`, error.message);
            }

            // Grant promotional weapon using existing PromotionalHandler
            const grantResult = await this.executePromotionalGrant(userId, weaponId, {
                grantedBy: interaction.user.id,
                grantedByUsername: interaction.user.username,
                reason: reason,
                notes: notes,
                campaign: campaign,
                method: 'Master Dashboard Single Player Grant'
            });

            if (grantResult.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ **PROMOTIONAL WEAPON GRANTED** ✅')
                    .setDescription(
                        `**Promotional Grant Successful!**\n\n` +
                        `🎁 **Weapon**: ${grantResult.weaponName}\n` +
                        `👤 **Recipient**: ${username} (${userId})\n` +
                        `📝 **Reason**: ${reason}\n` +
                        `🎪 **Campaign**: ${campaign || 'None specified'}\n` +
                        `💬 **Notes**: ${notes || 'None'}\n` +
                        `👨‍💼 **Granted By**: ${interaction.user.username}\n` +
                        `⏰ **Granted At**: ${new Date().toLocaleString()}\n\n` +
                        `**Location**: Player's Profile Chest\n` +
                        `**Audit**: Automatically logged\n\n` +
                        `✅ **Grant completed successfully!**`
                    )
                    .setColor(0x00ff00)
                    .setFooter({ text: 'Promotional Grant • Master Dashboard • Audit Logged' })
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [embed]
                });

                // Enhanced audit logging
                await auditLogger.log({
                    category: 'PROMOTIONAL_GRANT',
                    message: `Master Dashboard promotional weapon grant by ${interaction.user.username}`,
                    eventType: 'master_promotional_grant',
                    data: {
                        adminId: interaction.user.id,
                        adminUsername: interaction.user.username,
                        recipientId: userId,
                        recipientUsername: username,
                        weaponId: weaponId,
                        weaponName: grantResult.weaponName,
                        reason: reason,
                        notes: notes,
                        campaign: campaign,
                        method: 'Master Dashboard Single Player Grant',
                        timestamp: new Date().toISOString(),
                        serverId: interaction.guild?.id,
                        serverName: interaction.guild?.name
                    }
                });

            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ **PROMOTIONAL GRANT FAILED** ❌')
                    .setDescription(
                        `**Error Granting Promotional Weapon**\n\n` +
                        `👤 **Target User**: ${username} (${userId})\n` +
                        `⚔️ **Weapon ID**: ${weaponId}\n` +
                        `❌ **Error**: ${grantResult.error}\n\n` +
                        `**Common Issues:**\n` +
                        `• Invalid weapon ID (check spelling)\n` +
                        `• Weapon not marked as promotional\n` +
                        `• User already has this weapon\n` +
                        `• Database connection error\n\n` +
                        `**Suggestion**: Check the weapon ID and try again.`
                    )
                    .setColor(0xff0000)
                    .setFooter({ text: 'Promotional Grant Failed • Master Dashboard' })
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [embed]
                });
            }

        } catch (error) {
            logger.error('Error handling promo single player submission:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ Error processing promotional grant: ${error.message}`
                });
            } else {
                await interaction.reply({
                    content: `❌ Error processing promotional grant: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Execute Promotional Grant using existing PromotionalHandler
     */
    static async executePromotionalGrant(userId, weaponId, grantDetails) {
        try {
            const { PromotionalHandler } = await import('../user/PromotionalHandler.js');
            const { weaponsData } = await import('../../data/weaponsData.js');

            // Find the promotional weapon
            const weapon = weaponsData.find(w => w.id === weaponId && w.isPromotional);
            if (!weapon) {
                return { 
                    success: false, 
                    error: `Promotional weapon '${weaponId}' not found or not marked as promotional` 
                };
            }

            // Use existing PromotionalHandler method
            const grantResult = await PromotionalHandler.grantPromotionalWeapon(
                userId, 
                weaponId, 
                `${grantDetails.grantedByUsername} (Master Dashboard)`
            );

            if (grantResult.success) {
                return {
                    success: true,
                    weaponName: weapon.name,
                    weaponId: weaponId
                };
            } else {
                return {
                    success: false,
                    error: grantResult.error
                };
            }

        } catch (error) {
            logger.error('Error executing promotional grant:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enhanced Bot Developer dashboard interfaces for Phase 2
     */

    /**
     * Show System Management dashboard interface
     */
    static async showSystemManagement(interaction) {
        try {
            // Check authentication with unified system
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            if (!AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.BOT_DEVELOPER)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🛠️ **SYSTEM MANAGEMENT** 🛠️')
                .setDescription(
                    '**Bot Developer System Control**\n\n' +
                    '🎯 **Current Server**: ' + (interaction.guild?.name || 'DM') + '\n' +
                    '🌐 **Total Servers**: ' + (interaction.client?.guilds?.cache.size || 0) + '\n' +
                    '⚔️ **Ultimate Authority**: Active\n\n' +
                    '**System Operations:**\n' +
                    '🚀 **Auto-Setup** - Deploy complete dashboard architecture\n' +
                    '📂 **Channel Management** - Create/configure server channels\n' +
                    '🔧 **Bot Configuration** - Advanced bot settings and overrides\n' +
                    '🌐 **Cross-Server Tools** - Multi-server management\n' +
                    '🚨 **Emergency Controls** - System overrides and emergency access\n' +
                    '📊 **Server Analytics** - Performance monitoring and statistics\n\n' +
                    '*Select your system operation:*'
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'System Management • Bot Developer Control' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚀 Auto-Setup Current Server')
                    .setDescription('Deploy complete dashboard architecture')
                    .setValue('system_auto_setup'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📂 Advanced Channel Management')
                    .setDescription('Create, configure, and manage channels')
                    .setValue('system_channel_mgmt'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 Bot Configuration')
                    .setDescription('Advanced bot settings and overrides')
                    .setValue('system_bot_config'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🌐 Cross-Server Management')
                    .setDescription('Multi-server operations and control')
                    .setValue('system_cross_server'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚨 Emergency Controls')
                    .setDescription('System overrides and emergency access')
                    .setValue('system_emergency'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Server Analytics')
                    .setDescription('Performance monitoring and statistics')
                    .setValue('system_analytics')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bot_dev_system_mgmt')
                .setPlaceholder('Choose system operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing system management:', error);
            await interaction.reply({
                content: '❌ Error loading system management interface.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Economy Tools dashboard interface
     */
    static async showEconomyTools(interaction) {
        try {
            // Check authentication
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            if (!AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.BOT_DEVELOPER)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('💰 **ECONOMY TOOLS** 💰')
                .setDescription(
                    '**Bot Developer Economic Control**\n\n' +
                    '⚔️ **Authority Level**: Ultimate (Unlimited)\n' +
                    '🎯 **Current Server**: ' + (interaction.guild?.name || 'DM') + '\n' +
                    '💎 **Economy Status**: All divisions accessible\n\n' +
                    '**Economic Operations:**\n' +
                    '🪙 **Currency Operations** - Generate/send unlimited currency\n' +
                    '🎁 **Item Distribution** - Grant any items, weapons, or gear\n' +
                    '👤 **Player Management** - Modify individual player economies\n' +
                    '🏆 **Hero Management** - Unlock heroes, manage progression\n' +
                    '🎊 **Promotional Tools** - Beta tester rewards and special items\n' +
                    '📊 **Economy Analytics** - Cross-server economic monitoring\n\n' +
                    '**🔥 Ready for beta testing: Unlimited power for player setup!**\n\n' +
                    '*Select your economic operation:*'
                )
                .setColor(0xffd700)
                .setFooter({ text: 'Economy Tools • Unlimited Authority' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🪙 Currency Operations')
                    .setDescription('Send unlimited gold, tokens, crypto to players')
                    .setValue('economy_currency'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎁 Item Distribution')
                    .setDescription('Grant weapons, armor, consumables to players')
                    .setValue('economy_items'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👤 Player Economy Editor')
                    .setDescription('Modify individual player economic profiles')
                    .setValue('economy_players'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Hero Management')
                    .setDescription('Unlock heroes, manage progression systems')
                    .setValue('economy_heroes'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎊 Promotional Tools')
                    .setDescription('Beta tester rewards and special distributions')
                    .setValue('economy_promo'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Economy Analytics')
                    .setDescription('Cross-server economic monitoring and reports')
                    .setValue('economy_analytics')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bot_dev_economy_tools')
                .setPlaceholder('Choose economic operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing economy tools:', error);
            await interaction.reply({
                content: '❌ Error loading economy tools interface.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Game Management dashboard interface
     */
    static async showGameManagement(interaction) {
        try {
            // Check authentication
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            if (!AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.BOT_DEVELOPER)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **GAME MANAGEMENT** ⚔️')
                .setDescription(
                    '**Bot Developer Game Control**\n\n' +
                    '🎮 **Game Authority**: Complete control over all game systems\n' +
                    '🎯 **Current Server**: ' + (interaction.guild?.name || 'DM') + '\n' +
                    '⚔️ **Beta Testing**: Ready for promotional weapon distribution\n\n' +
                    '**Game Operations:**\n' +
                    '🏆 **Hero Systems** - Unlock heroes, modify stats, progression\n' +
                    '⚔️ **Weapon Management** - Create, modify, distribute weapons\n' +
                    '🛡️ **Equipment Systems** - Armor, consumables, special items\n' +
                    '📜 **Quest Management** - Create custom quests and rewards\n' +
                    '🎊 **Promotional Systems** - Beta rewards, special distributions\n' +
                    '🎮 **Game Customization** - Modify game rules and mechanics\n\n' +
                    '**🔥 Perfect for setting up beta testers with gear and currency!**\n\n' +
                    '*Select your game operation:*'
                )
                .setColor(0x8B4513)
                .setFooter({ text: 'Game Management • Complete Game Control' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Hero Systems')
                    .setDescription('Unlock heroes, modify stats and progression')
                    .setValue('game_heroes'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚔️ Weapon Management')
                    .setDescription('Create, modify, and distribute weapons')
                    .setValue('game_weapons'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Equipment Systems')
                    .setDescription('Manage armor, consumables, special items')
                    .setValue('game_equipment'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📜 Quest Management')
                    .setDescription('Create custom quests and reward systems')
                    .setValue('game_quests'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎊 Promotional Systems')
                    .setDescription('Beta rewards and special distributions')
                    .setValue('game_promo'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Game Customization')
                    .setDescription('Modify game rules and core mechanics')
                    .setValue('game_customize')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bot_dev_game_mgmt')
                .setPlaceholder('Choose game operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing game management:', error);
            await interaction.reply({
                content: '❌ Error loading game management interface.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Analytics dashboard interface
     */
    static async showAnalytics(interaction) {
        try {
            // Check authentication
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            if (!AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.BOT_DEVELOPER)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            const serverCount = interaction.client?.guilds?.cache.size || 0;
            const userCount = interaction.client?.users?.cache.size || 0;

            const embed = new EmbedBuilder()
                .setTitle('📊 **ANALYTICS & MONITORING** 📊')
                .setDescription(
                    '**Bot Developer Analytics Dashboard**\n\n' +
                    '🌐 **Cross-Server Monitoring**\n' +
                    `📊 **Total Servers**: ${serverCount}\n` +
                    `👥 **Total Users**: ${userCount}\n` +
                    `🎯 **Current Server**: ${interaction.guild?.name || 'DM'}\n\n` +
                    '**Analytics Categories:**\n' +
                    '📈 **Performance Metrics** - System performance and response times\n' +
                    '👥 **User Analytics** - Player statistics and engagement\n' +
                    '💰 **Economic Reports** - Currency flows and transaction data\n' +
                    '🎮 **Game Statistics** - Gameplay metrics and progression\n' +
                    '🔒 **Security Logs** - Authentication and security events\n' +
                    '⚠️ **Error Monitoring** - System errors and diagnostics\n\n' +
                    '*Select your analytics category:*'
                )
                .setColor(0x9932cc)
                .setFooter({ text: 'Analytics & Monitoring • Real-time Data' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('📈 Performance Metrics')
                    .setDescription('System performance and response times')
                    .setValue('analytics_performance'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👥 User Analytics')
                    .setDescription('Player statistics and engagement data')
                    .setValue('analytics_users'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economic Reports')
                    .setDescription('Currency flows and transaction analytics')
                    .setValue('analytics_economy'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Game Statistics')
                    .setDescription('Gameplay metrics and progression data')
                    .setValue('analytics_game'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔒 Security Logs')
                    .setDescription('Authentication and security event logs')
                    .setValue('analytics_security'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚠️ Error Monitoring')
                    .setDescription('System errors and diagnostic reports')
                    .setValue('analytics_errors')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bot_dev_analytics')
                .setPlaceholder('Choose analytics category...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing analytics:', error);
            await interaction.reply({
                content: '❌ Error loading analytics interface.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Developer Tools dashboard interface
     */
    static async showDeveloperTools(interaction) {
        try {
            // Check authentication
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            if (!AuthenticationManager.hasMinimumLevel(interaction.user.id, AuthenticationManager.PERMISSION_LEVELS.BOT_DEVELOPER)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🔧 **DEVELOPER TOOLS** 🔧')
                .setDescription(
                    '**Bot Developer Advanced Tools**\n\n' +
                    '⚔️ **Developer Authority**: Maximum level access\n' +
                    '🎯 **Current Server**: ' + (interaction.guild?.name || 'DM') + '\n' +
                    '🧪 **Testing Mode**: Production environment\n\n' +
                    '**Developer Operations:**\n' +
                    '🧪 **Testing Tools** - Beta testing shortcuts and diagnostics\n' +
                    '🔍 **Debug Interface** - Advanced debugging and troubleshooting\n' +
                    '🚀 **Deployment Tools** - Code deployment and version management\n' +
                    '📝 **Database Tools** - Direct database access and management\n' +
                    '⚡ **Performance Tools** - Optimization and performance tuning\n' +
                    '🆘 **Emergency Functions** - System recovery and emergency controls\n\n' +
                    '**⚠️ Warning: These are advanced developer tools - use with caution!**\n\n' +
                    '*Select your developer operation:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Developer Tools • Advanced Operations' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🧪 Testing Tools')
                    .setDescription('Beta testing shortcuts and diagnostic tools')
                    .setValue('dev_testing'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔍 Debug Interface')
                    .setDescription('Advanced debugging and troubleshooting')
                    .setValue('dev_debug'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚀 Deployment Tools')
                    .setDescription('Code deployment and version management')
                    .setValue('dev_deployment'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📝 Database Tools')
                    .setDescription('Direct database access and management')
                    .setValue('dev_database'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚡ Performance Tools')
                    .setDescription('System optimization and performance tuning')
                    .setValue('dev_performance'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🆘 Emergency Functions')
                    .setDescription('System recovery and emergency controls')
                    .setValue('dev_emergency')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bot_dev_developer_tools')
                .setPlaceholder('Choose developer operation...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing developer tools:', error);
            await interaction.reply({
                content: '❌ Error loading developer tools interface.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle System Management selections
     */
    static async handleSystemMgmtSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'system_auto_setup':
                    await this.executeAutoFullSetup(interaction);
                    break;
                case 'system_channel_mgmt':
                    await interaction.reply({
                        content: '📂 **Advanced Channel Management** - Coming Soon!\n\nThis will provide detailed channel creation and management tools.',
                        ephemeral: true
                    });
                    break;
                case 'system_bot_config':
                    await interaction.reply({
                        content: '🔧 **Bot Configuration** - Coming Soon!\n\nThis will provide advanced bot settings and configuration options.',
                        ephemeral: true
                    });
                    break;
                case 'system_cross_server':
                    await this.showServersList(interaction);
                    break;
                case 'system_emergency':
                    await this.showEmergencyControls(interaction);
                    break;
                case 'system_analytics':
                    await this.showAnalytics(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown system management option.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling system management selection:', error);
            throw error;
        }
    }

    /**
     * Handle Economy Tools selections
     */
    static async handleEconomyToolsSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'economy_currency':
                    await this.showInfiniteGoldOperations(interaction);
                    break;
                case 'economy_items':
                    await this.showInfiniteItemOperations(interaction);
                    break;
                case 'economy_players':
                    await this.showProfileEconomyEditor(interaction);
                    break;
                case 'economy_heroes':
                    await interaction.reply({
                        content: '🏆 **Hero Management** - Coming Soon!\n\nThis will provide hero unlocking and progression management tools.',
                        ephemeral: true
                    });
                    break;
                case 'economy_promo':
                    await this.showPromoWeaponsDistribution(interaction);
                    break;
                case 'economy_analytics':
                    await this.showMasterEconomyAnalytics(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown economy tools option.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling economy tools selection:', error);
            throw error;
        }
    }

    /**
     * Handle Game Management selections
     */
    static async handleGameMgmtSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'game_heroes':
                    await interaction.reply({
                        content: '🏆 **Hero Systems** - Coming Soon!\n\nThis will provide comprehensive hero management and stat modification tools.',
                        ephemeral: true
                    });
                    break;
                case 'game_weapons':
                    await this.showInfiniteItemOperations(interaction);
                    break;
                case 'game_equipment':
                    await this.showInfiniteItemOperations(interaction);
                    break;
                case 'game_quests':
                    await interaction.reply({
                        content: '📜 **Quest Management** - Coming Soon!\n\nThis will provide custom quest creation and management tools.',
                        ephemeral: true
                    });
                    break;
                case 'game_promo':
                    await this.showPromoWeaponsDistribution(interaction);
                    break;
                case 'game_customize':
                    await interaction.reply({
                        content: '🎮 **Game Customization** - Coming Soon!\n\nThis will provide game rule modification and mechanic customization tools.',
                        ephemeral: true
                    });
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown game management option.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling game management selection:', error);
            throw error;
        }
    }

    /**
     * Handle Analytics selections
     */
    static async handleAnalyticsSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'analytics_performance':
                    await interaction.reply({
                        content: '📈 **Performance Metrics** - Coming Soon!\n\nThis will provide system performance monitoring and response time analytics.',
                        ephemeral: true
                    });
                    break;
                case 'analytics_users':
                    await interaction.reply({
                        content: '👥 **User Analytics** - Coming Soon!\n\nThis will provide player statistics and engagement analytics.',
                        ephemeral: true
                    });
                    break;
                case 'analytics_economy':
                    await this.showMasterEconomyAnalytics(interaction);
                    break;
                case 'analytics_game':
                    await interaction.reply({
                        content: '🎮 **Game Statistics** - Coming Soon!\n\nThis will provide gameplay metrics and progression analytics.',
                        ephemeral: true
                    });
                    break;
                case 'analytics_security':
                    await interaction.reply({
                        content: '🔒 **Security Logs** - Coming Soon!\n\nThis will provide authentication and security event monitoring.',
                        ephemeral: true
                    });
                    break;
                case 'analytics_errors':
                    await interaction.reply({
                        content: '⚠️ **Error Monitoring** - Coming Soon!\n\nThis will provide system error tracking and diagnostic reports.',
                        ephemeral: true
                    });
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown analytics option.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling analytics selection:', error);
            throw error;
        }
    }

    /**
     * Handle Developer Tools selections
     */
    static async handleDeveloperToolsSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'dev_testing':
                    await interaction.reply({
                        content: '🧪 **Testing Tools** - Coming Soon!\n\nThis will provide beta testing shortcuts and diagnostic tools.',
                        ephemeral: true
                    });
                    break;
                case 'dev_debug':
                    await interaction.reply({
                        content: '🔍 **Debug Interface** - Coming Soon!\n\nThis will provide advanced debugging and troubleshooting tools.',
                        ephemeral: true
                    });
                    break;
                case 'dev_deployment':
                    await interaction.reply({
                        content: '🚀 **Deployment Tools** - Coming Soon!\n\nThis will provide code deployment and version management tools.',
                        ephemeral: true
                    });
                    break;
                case 'dev_database':
                    await interaction.reply({
                        content: '📝 **Database Tools** - Coming Soon!\n\nThis will provide direct database access and management tools.',
                        ephemeral: true
                    });
                    break;
                case 'dev_performance':
                    await interaction.reply({
                        content: '⚡ **Performance Tools** - Coming Soon!\n\nThis will provide system optimization and performance tuning tools.',
                        ephemeral: true
                    });
                    break;
                case 'dev_emergency':
                    await this.showEmergencyControls(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown developer tools option.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Error handling developer tools selection:', error);
            throw error;
        }
    }

    // ============================================================================
    // COMPREHENSIVE ITEM BROWSER & REMOVAL SYSTEM - HIGHWAY GRADE IMPLEMENTATION
    // ============================================================================

    /**
     * Handle Enhanced Item Browser Selection - COMPREHENSIVE ROUTING FIX
     */
    static async handleEnhancedItemBrowserSelection(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            if (selectedValue.startsWith('add_to_sendlist_')) {
                // Extract item category and ID from the selectedValue
                const parts = selectedValue.replace('add_to_sendlist_', '').split('_');
                const category = parts[0];
                const itemId = parts.slice(1).join('_');
                
                await this.showAmountSelectionModal(interaction, category, itemId);
            } else if (selectedValue === 'back_to_item_categories') {
                await this.showStreamlinedItemOperations(interaction);
            } else if (selectedValue === 'view_send_list') {
                await this.showSendListManagement(interaction);
            } else if (selectedValue.startsWith('page_')) {
                // Handle pagination
                const pageNum = parseInt(selectedValue.replace('page_', ''));
                const currentCategory = interaction.message.embeds[0]?.title?.toLowerCase().includes('weapons') ? 'weapons' :
                                       interaction.message.embeds[0]?.title?.toLowerCase().includes('armor') ? 'armor' :
                                       interaction.message.embeds[0]?.title?.toLowerCase().includes('consumables') ? 'consumables' :
                                       interaction.message.embeds[0]?.title?.toLowerCase().includes('promotional') ? 'promotional' :
                                       interaction.message.embeds[0]?.title?.toLowerCase().includes('special') ? 'special' :
                                       interaction.message.embeds[0]?.title?.toLowerCase().includes('currency') ? 'currency' : 'weapons';
                
                await this.showEnhancedItemBrowserPage(interaction, currentCategory, pageNum);
            } else {
                logger.warn(`Unknown enhanced browser selection: ${selectedValue}`);
                await interaction.update({
                    content: '❌ Unknown browser option.',
                    embeds: [],
                    components: []
                });
            }
        } catch (error) {
            logger.error('Error handling enhanced item browser selection:', error);
            await interaction.update({
                content: '❌ Error processing browser selection.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Amount Selection Modal - COMPREHENSIVE FIX
     */
    static async showAmountSelectionModal(interaction, category, itemId) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('amount_selection_modal')
                .setTitle('🎯 Select Item Amount & Details');

            const amountInput = new TextInputBuilder()
                .setCustomId('item_amount')
                .setLabel('Amount to Send (1-999)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('1')
                .setMinLength(1)
                .setMaxLength(3);

            const reasonInput = new TextInputBuilder()
                .setCustomId('send_reason')
                .setLabel('Reason for Sending (Required for audit)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Beta testing, promotional campaign, bug fix compensation, etc.')
                .setMaxLength(500);

            const notesInput = new TextInputBuilder()
                .setCustomId('send_notes')
                .setLabel('Additional Notes (Optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setPlaceholder('Any additional information...')
                .setMaxLength(500);

            // Hidden fields to store context
            const categoryInput = new TextInputBuilder()
                .setCustomId('item_category')
                .setLabel('Item Category (DO NOT MODIFY)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(category)
                .setMaxLength(50);

            const itemIdInput = new TextInputBuilder()
                .setCustomId('item_id')
                .setLabel('Item ID (DO NOT MODIFY)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(itemId)
                .setMaxLength(100);

            const row1 = new ActionRowBuilder().addComponents(amountInput);
            const row2 = new ActionRowBuilder().addComponents(reasonInput);
            const row3 = new ActionRowBuilder().addComponents(notesInput);
            const row4 = new ActionRowBuilder().addComponents(categoryInput);
            const row5 = new ActionRowBuilder().addComponents(itemIdInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing amount selection modal:', error);
            await interaction.update({
                content: '❌ Error loading amount selection form.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Amount Selection Modal Submission - COMPREHENSIVE FIX
     */
    static async handleAmountSelectionModal(interaction) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await interaction.reply({
                    content: '❌ Authentication required.',
                    ephemeral: true
                });
                return;
            }

            const amount = parseInt(interaction.fields.getTextInputValue('item_amount'));
            const reason = interaction.fields.getTextInputValue('send_reason').trim();
            const notes = interaction.fields.getTextInputValue('send_notes')?.trim() || '';
            const category = interaction.fields.getTextInputValue('item_category').trim();
            const itemId = interaction.fields.getTextInputValue('item_id').trim();

            // Validate inputs
            if (isNaN(amount) || amount <= 0 || amount > 999) {
                await interaction.reply({
                    content: '❌ Invalid amount. Must be between 1 and 999.',
                    ephemeral: true
                });
                return;
            }

            if (!reason || reason.length < 5) {
                await interaction.reply({
                    content: '❌ Reason must be at least 5 characters long.',
                    ephemeral: true
                });
                return;
            }

            // Get item data
            let itemData;
            try {
                if (category === 'currency') {
                    const currencies = [
                        { id: 'gold', name: 'Gold', emoji: '💰', rarity: 'currency' },
                        { id: 'tokens', name: 'Tokens', emoji: '🎫', rarity: 'currency' },
                        { id: 'dng', name: '$DNG', emoji: '🔸', rarity: 'currency' },
                        { id: 'hero', name: '$HERO', emoji: '🦸', rarity: 'currency' },
                        { id: 'eth', name: '$ETH', emoji: '💎', rarity: 'currency' }
                    ];
                    itemData = currencies.find(c => c.id === itemId);
                } else {
                    const { weaponsData } = await import('../../data/weaponsData.js');
                    itemData = weaponsData.find(item => item.id === itemId);
                }

                if (!itemData) {
                    await interaction.reply({
                        content: '❌ Item not found. Please try again.',
                        ephemeral: true
                    });
                    return;
                }
            } catch (error) {
                logger.error('Error loading item data:', error);
                await interaction.reply({
                    content: '❌ Error loading item data.',
                    ephemeral: true
                });
                return;
            }

            // Add to send list
            const sendListItem = {
                itemId: itemId,
                name: itemData.name,
                emoji: itemData.emoji || '📦',
                category: category,
                amount: amount,
                reason: reason,
                notes: notes,
                addedBy: interaction.user.id,
                addedAt: new Date().toISOString()
            };

            const updatedSendList = this.addToSendList(interaction.user.id, sendListItem);

            // Success response
            await interaction.reply({
                content: `✅ **Added to Send List**\n\n${itemData.emoji || '📦'} **${itemData.name}** x${amount}\nReason: ${reason}\n\n📋 **Send List**: ${updatedSendList.length} items\n\n*Continue adding items or review your send list.*`,
                ephemeral: true
            });

            // Return to enhanced browser after short delay
            setTimeout(async () => {
                try {
                    await this.showEnhancedItemBrowserPage(interaction, category, 0);
                } catch (error) {
                    logger.error('Error returning to browser:', error);
                }
            }, 2000);

        } catch (error) {
            logger.error('Error handling amount selection modal:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Error processing amount selection. Please try again.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    logger.error('Could not send error reply:', replyError.message);
                }
            }
        }
    }

    /**
     * Show Item Removal Interface - COMPREHENSIVE FIX
     */
    static async showItemRemovalInterface(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🗑️ **ITEM REMOVAL SYSTEM** 🗑️')
                .setDescription(
                    '**Remove items sent by mistake**\n\n' +
                    '⚠️ **CAUTION**: This permanently removes items from player inventories\n\n' +
                    '**Smart Player Selection System:**\n' +
                    '🔍 **Search by Username** - Type part of their name\n' +
                    '🆔 **Search by User ID** - Enter Discord ID directly\n' +
                    '🎯 **Recent Players** - Quick access to recently active players\n\n' +
                    '**Steps:**\n' +
                    '1. Search for the player\n' +
                    '2. Choose items to remove\n' +
                    '3. Confirm removal with password\n\n' +
                    '**Use Cases:**\n' +
                    '• Items sent to wrong player\n' +
                    '• Duplicate promotional items\n' +
                    '• Testing corrections\n' +
                    '• Economy rebalancing\n\n' +
                    '*Choose player selection method:*'
                )
                .setColor(0xff6600)
                .setFooter({ text: 'Item Removal System • Master Authority Required' })
                .setTimestamp();

            const buttons = [
                new ButtonBuilder()
                    .setCustomId('search_player_username')
                    .setLabel('🔍 Search by Username')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('search_player_id')
                    .setLabel('🆔 Search by User ID')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('show_recent_players')
                    .setLabel('🎯 Recent Players')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_streamlined_items')
                    .setLabel('🔙 Back to Item Categories')
                    .setStyle(ButtonStyle.Danger)
            ];

            const row = new ActionRowBuilder().addComponents(buttons);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing item removal interface:', error);
            await interaction.update({
                content: '❌ Error loading item removal interface.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Send List Management - COMPREHENSIVE FIX
     */
    static async handleSendListManagement(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            switch (selectedValue) {
                case 'send_to_players':
                    await this.showSendListModal(interaction);
                    break;
                case 'clear_send_list':
                    this.clearSendList(interaction.user.id);
                    await interaction.update({
                        content: '✅ **Send List Cleared**\n\nAll items have been removed from your send list.',
                        embeds: [],
                        components: []
                    });
                    break;
                case 'edit_send_list':
                    await this.showStreamlinedItemOperations(interaction);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Unknown send list action.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling send list management:', error);
            await interaction.update({
                content: '❌ Error processing send list action.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Player Selection for Removal - SCALABLE SOLUTION
     */
    static async handlePlayerSelectionForRemoval(interaction, selectedValue) {
        try {
            if (!this.isAuthenticated(interaction.user.id)) {
                await this.showMasterAuthentication(interaction);
                return;
            }

            const playerId = selectedValue;
            
            // Get player's items
            const { ProfileDatabase } = await import('../../database/ProfileDatabase.js');
            const profileDB = new ProfileDatabase();
            const playerData = profileDB.getPlayerInventory(playerId);
            
            if (!playerData || !playerData.profileChest) {
                await interaction.update({
                    content: '❌ **No Items Found**\n\nThis player has no items to remove.',
                    embeds: [],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_item_removal')
                            .setLabel('🔙 Back to Player Search')
                            .setStyle(ButtonStyle.Secondary)
                    )]
                });
                return;
            }

            // Show player's items for removal
            await this.showPlayerItemsForRemoval(interaction, playerId, playerData);

        } catch (error) {
            logger.error('Error handling player selection for removal:', error);
            await interaction.update({
                content: '❌ Error loading player items.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show Player Items for Removal - COMPREHENSIVE INTERFACE
     */
    static async showPlayerItemsForRemoval(interaction, playerId, playerData) {
        try {
            let username = 'Unknown User';
            try {
                const user = await interaction.client.users.fetch(playerId);
                username = user.username;
            } catch (error) {
                logger.warn(`Could not fetch user ${playerId}:`, error.message);
            }

            const chest = playerData.profileChest;
            const totalItems = (chest.weapons?.length || 0) + 
                             (chest.armor?.length || 0) + 
                             (chest.consumables?.length || 0) + 
                             (chest.promotional?.length || 0) + 
                             (chest.special?.length || 0);

            if (totalItems === 0) {
                await interaction.update({
                    content: `❌ **No Items to Remove**\n\n**Player**: ${username}\n**User ID**: ${playerId}\n\nThis player's Profile Chest is empty.`,
                    embeds: [],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_item_removal')
                            .setLabel('🔙 Back to Player Search')
                            .setStyle(ButtonStyle.Secondary)
                    )]
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🗑️ **ITEM REMOVAL INTERFACE** 🗑️')
                .setDescription(
                    `**Target Player**: ${username}\n` +
                    `**User ID**: ${playerId}\n` +
                    `**Total Items**: ${totalItems}\n\n` +
                    '**⚠️ WARNING: Item removal is permanent!**\n\n' +
                    '**Available Items by Category:**\n' +
                    `⚔️ **Weapons**: ${chest.weapons?.length || 0} items\n` +
                    `🛡️ **Armor**: ${chest.armor?.length || 0} items\n` +
                    `🧪 **Consumables**: ${chest.consumables?.length || 0} items\n` +
                    `🎁 **Promotional**: ${chest.promotional?.length || 0} items\n` +
                    `🗝️ **Special**: ${chest.special?.length || 0} items\n\n` +
                    '*Select item category to remove:*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Item Removal • Permanent Action • Requires Password' })
                .setTimestamp();

            const options = [];
            
            if (chest.weapons?.length > 0) {
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`⚔️ Remove Weapons (${chest.weapons.length})`)
                    .setDescription('Remove weapons from player inventory')
                    .setValue(`remove_weapons_${playerId}`));
            }
            
            if (chest.armor?.length > 0) {
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`🛡️ Remove Armor (${chest.armor.length})`)
                    .setDescription('Remove armor from player inventory')
                    .setValue(`remove_armor_${playerId}`));
            }
            
            if (chest.consumables?.length > 0) {
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`🧪 Remove Consumables (${chest.consumables.length})`)
                    .setDescription('Remove consumables from player inventory')
                    .setValue(`remove_consumables_${playerId}`));
            }
            
            if (chest.promotional?.length > 0) {
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`🎁 Remove Promotional (${chest.promotional.length})`)
                    .setDescription('Remove promotional items from player inventory')
                    .setValue(`remove_promotional_${playerId}`));
            }
            
            if (chest.special?.length > 0) {
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`🗝️ Remove Special (${chest.special.length})`)
                    .setDescription('Remove special items from player inventory')
                    .setValue(`remove_special_${playerId}`));
            }

            options.push(new StringSelectMenuOptionBuilder()
                .setLabel('🔙 Back to Player Search')
                .setDescription('Search for a different player')
                .setValue('back_to_item_removal'));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('player_item_removal_category')
                .setPlaceholder('Choose item category to remove...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing player items for removal:', error);
            await interaction.update({
                content: '❌ Error loading player items.',
                embeds: [],
                components: []
            });
        }
    }
} 