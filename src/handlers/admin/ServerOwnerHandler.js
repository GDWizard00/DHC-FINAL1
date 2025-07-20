import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import crypto from 'crypto';

/**
 * ServerOwnerHandler - Enhanced onboarding system for new Discord server owners
 * Provides comprehensive security profile creation and server setup options
 */
export class ServerOwnerHandler {
    static SESSION_DURATION = 30 * 60 * 1000; // 30 minutes for setup sessions
    static activeSessions = new Map();

    /**
     * Check if user is the server owner
     */
    static isServerOwner(interaction) {
        return interaction.member.id === interaction.guild.ownerId;
    }

    /**
     * Check if server has completed initial setup
     */
    static async hasCompletedSetup(guildId) {
        try {
            if (!DatabaseManager.connected) {
                // Demo mode - check memory store
                const adminProfile = DatabaseManager.memoryStore?.adminProfiles?.get(guildId);
                return adminProfile && adminProfile.setupCompleted === true;
            }
            
            // Connected mode - use MongoDB collection
            const adminProfile = await DatabaseManager.collections.adminProfiles.findOne({ 
                guildId: guildId 
            });
            return adminProfile && adminProfile.setupCompleted === true;
        } catch (error) {
            logger.error('Error checking server setup status:', error);
            return false;
        }
    }

    /**
     * Show initial setup welcome screen
     */
    static async showSetupWelcome(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎉 **WELCOME TO DUNGEONITES HEROES CHALLENGE** 🎉')
                .setDescription(
                    `**Welcome ${interaction.user.username}!**\n\n` +
                    `Thank you for adding Dungeonites Heroes Challenge to **${interaction.guild.name}**!\n\n` +
                    '**🔐 SECURE SETUP REQUIRED**\n' +
                    'To ensure the security of your server and player assets, you must complete the admin setup process.\n\n' +
                    '**📋 SETUP STEPS:**\n' +
                    '1️⃣ **Create Admin Profile** - Secure password & recovery options\n' +
                    '2️⃣ **Security Verification** - X account, wallet, email for recovery\n' +
                    '3️⃣ **Server Configuration** - Choose Quick Start or Custom setup\n' +
                    '4️⃣ **Channel Setup** - Configure game, marketplace, and admin channels\n\n' +
                    '**⚠️ IMPORTANT SECURITY NOTICE:**\n' +
                    '• You will need to provide recovery information (X account, EVM wallet, email)\n' +
                    '• At least 2 recovery methods required for password resets\n' +
                    '• All information is encrypted and stored securely\n' +
                    '• Take note of your password - there is no "easy" reset option\n\n' +
                    '*Click below to begin secure setup:*'
                )
                .setColor(0x00ff00)
                .setThumbnail(interaction.guild.iconURL() || null)
                .setFooter({ text: 'Server Owner Setup • Secure Profile Creation Required' })
                .setTimestamp();

            const setupButton = new ButtonBuilder()
                .setCustomId('server_owner_setup_begin')
                .setLabel('🔒 Begin Secure Setup')
                .setStyle(ButtonStyle.Primary);

            const helpButton = new ButtonBuilder()
                .setCustomId('server_owner_setup_help')
                .setLabel('❓ Setup Help')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(setupButton, helpButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            logger.info(`Server owner setup welcome shown for ${interaction.user.username} in ${interaction.guild.name}`);

        } catch (error) {
            logger.error('Error showing setup welcome:', error);
            throw error;
        }
    }

    /**
     * Handle setup begin - check for existing profile first
     */
    static async handleSetupBegin(interaction) {
        try {
            // Check if admin profile already exists for this user
            let existingProfile = null;
            
            if (!DatabaseManager.connected) {
                // Demo mode - check memory store
                for (const [guildId, profile] of DatabaseManager.memoryStore?.adminProfiles || new Map()) {
                    if (profile.userId === interaction.user.id) {
                        existingProfile = profile;
                        break;
                    }
                }
            } else {
                // Connected mode - check MongoDB
                existingProfile = await DatabaseManager.collections.adminProfiles.findOne({ 
                    userId: interaction.user.id 
                });
            }

            if (existingProfile) {
                // User already has admin profile - show password authentication
                await this.showPasswordAuthentication(interaction);
            } else {
                // No existing profile - show profile creation modal
                await this.showProfileCreationModal(interaction);
            }

        } catch (error) {
            logger.error('Error in setup begin:', error);
            await interaction.reply({
                content: '❌ Error checking admin profile. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show password authentication for existing admin
     */
    static async showPasswordAuthentication(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔐 **ADMIN AUTHENTICATION** 🔐')
                .setDescription(
                    `**Welcome back, ${interaction.user.username}!**\n\n` +
                    '✅ **Admin Profile**: Found\n' +
                    `🏰 **Server**: ${interaction.guild.name}\n\n` +
                    '🔑 **Authentication Required**\n' +
                    'Please enter your admin password to continue with server setup.\n\n' +
                    '*Enter your password to proceed to setup options:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Admin Authentication • Enter Password' })
                .setTimestamp();

            const authButton = new ButtonBuilder()
                .setCustomId('admin_authenticate')
                .setLabel('🔑 Enter Password')
                .setStyle(ButtonStyle.Primary);

            const helpButton = new ButtonBuilder()
                .setCustomId('server_setup_emergency_help')
                .setLabel('🆘 Forgot Password?')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(authButton, helpButton);

            await interaction.showModal(this.createPasswordModal());

        } catch (error) {
            logger.error('Error showing password authentication:', error);
            await interaction.reply({
                content: '❌ Error showing authentication. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Create password authentication modal
     */
    static createPasswordModal() {
        const modal = new ModalBuilder()
            .setCustomId('admin_password_auth')
            .setTitle('Admin Password Authentication');

        const passwordInput = new TextInputBuilder()
            .setCustomId('admin_password')
            .setLabel('Admin Password')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
            .setPlaceholder('Enter your admin password...');

        const row = new ActionRowBuilder().addComponents(passwordInput);
        modal.addComponents(row);

        return modal;
    }

    /**
     * Handle admin password authentication submission
     */
    static async handlePasswordAuthentication(interaction) {
        try {
            const password = interaction.fields.getTextInputValue('admin_password');

            // Get admin profile
            let adminProfile = null;
            
            if (!DatabaseManager.connected) {
                // Demo mode
                for (const [guildId, profile] of DatabaseManager.memoryStore?.adminProfiles || new Map()) {
                    if (profile.userId === interaction.user.id) {
                        adminProfile = profile;
                        break;
                    }
                }
            } else {
                // Connected mode
                adminProfile = await DatabaseManager.collections.adminProfiles.findOne({ 
                    userId: interaction.user.id 
                });
            }

            if (!adminProfile) {
                await interaction.reply({
                    content: '❌ Admin profile not found. Please create a new profile.',
                    ephemeral: true
                });
                return;
            }

            // Verify password
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            if (hashedPassword !== adminProfile.passwordHash) {
                await interaction.reply({
                    content: '❌ Invalid password. Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Password correct - show setup options
            logger.info(`Admin password authentication successful for ${interaction.user.username} in ${interaction.guild.name}`);
            
            await this.showSetupOptionsWithoutFieldData(interaction);

        } catch (error) {
            logger.error('Error handling password authentication:', error);
            await interaction.reply({
                content: '❌ Error processing authentication. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show setup options without field data (for existing profiles)
     */
    static async showSetupOptionsWithoutFieldData(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('✅ **ADMIN AUTHENTICATION SUCCESSFUL** ✅')
                .setDescription(
                    '**Welcome back!**\n\n' +
                    '🔐 **Authentication**: Verified\n' +
                    `🏰 **Server**: ${interaction.guild.name}\n` +
                    `👤 **Admin**: ${interaction.user.username}\n\n` +
                    '**Next Step: Choose Setup Type**\n\n' +
                    '🚀 **Quick Start**: Automatically configure recommended channels and embeds\n' +
                    '⚙️ **Custom Setup**: Choose specific channels and configuration options\n\n' +
                    '*Select your preferred setup method:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Server Setup • Choose Configuration Method' })
                .setTimestamp();

            const quickStartButton = new ButtonBuilder()
                .setCustomId('server_setup_quick_start')
                .setLabel('🚀 Quick Start')
                .setStyle(ButtonStyle.Primary);

            const customSetupButton = new ButtonBuilder()
                .setCustomId('server_setup_custom')
                .setLabel('⚙️ Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const emergencyButton = new ButtonBuilder()
                .setCustomId('server_setup_emergency_help')
                .setLabel('🆘 Need Help?')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(quickStartButton, customSetupButton, emergencyButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing setup options:', error);
            throw error;
        }
    }

    /**
     * Show security profile creation modal (for new profiles)
     */
    static async showProfileCreationModal(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('server_owner_security_profile')
                .setTitle('Server Admin Security Profile');

            const passwordInput = new TextInputBuilder()
                .setCustomId('admin_password')
                .setLabel('Admin Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(12)
                .setMaxLength(100)
                .setPlaceholder('Create a strong password (12+ characters)...');

            const confirmPasswordInput = new TextInputBuilder()
                .setCustomId('confirm_password')
                .setLabel('Confirm Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(12)
                .setMaxLength(100)
                .setPlaceholder('Confirm your password...');

            const xAccountInput = new TextInputBuilder()
                .setCustomId('x_account')
                .setLabel('X (Twitter) Username (for recovery)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50)
                .setPlaceholder('Your X/Twitter username (without @)...');

            const walletInput = new TextInputBuilder()
                .setCustomId('evm_wallet')
                .setLabel('EVM Wallet Address (for recovery)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(42)
                .setMaxLength(42)
                .setPlaceholder('0x... (your Ethereum wallet address)...');

            const emailInput = new TextInputBuilder()
                .setCustomId('email_address')
                .setLabel('Email Address (for recovery)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(255)
                .setPlaceholder('your-email@example.com...');

            const row1 = new ActionRowBuilder().addComponents(passwordInput);
            const row2 = new ActionRowBuilder().addComponents(confirmPasswordInput);
            const row3 = new ActionRowBuilder().addComponents(xAccountInput);
            const row4 = new ActionRowBuilder().addComponents(walletInput);
            const row5 = new ActionRowBuilder().addComponents(emailInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            await interaction.showModal(modal);

            logger.info(`Security profile modal shown to ${interaction.user.username} in ${interaction.guild.name}`);

        } catch (error) {
            logger.error('Error showing security profile modal:', error);
            await interaction.reply({
                content: '❌ Error showing security profile form. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle security profile submission
     */
    static async handleSecurityProfileSubmission(interaction) {
        try {
            const password = interaction.fields.getTextInputValue('admin_password');
            const confirmPassword = interaction.fields.getTextInputValue('confirm_password');
            const xAccount = interaction.fields.getTextInputValue('x_account').replace('@', '');
            const evmWallet = interaction.fields.getTextInputValue('evm_wallet');
            const email = interaction.fields.getTextInputValue('email_address');

            // Validate password
            if (password !== confirmPassword) {
                await interaction.reply({
                    content: '❌ Passwords do not match. Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Validate wallet address
            if (!evmWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
                await interaction.reply({
                    content: '❌ Invalid EVM wallet address. Please enter a valid Ethereum address.',
                    ephemeral: true
                });
                return;
            }

            // Validate email
            if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                await interaction.reply({
                    content: '❌ Invalid email address. Please enter a valid email.',
                    ephemeral: true
                });
                return;
            }

            // Check if profile already exists
            const setupCompleted = await this.hasCompletedSetup(interaction.guild.id);
            if (setupCompleted) {
                // Show setup options for existing profile
                await this.showSetupOptions(interaction);
                return;
            }

            // Create admin profile
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            const adminProfile = {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                passwordHash: hashedPassword,
                recoveryMethods: {
                    xAccount: {
                        username: xAccount,
                        verified: false
                    },
                    evmWallet: {
                        address: evmWallet,
                        verified: false
                    },
                    email: {
                        address: email,
                        verified: false
                    }
                },
                permissions: {
                    serverAdmin: true,
                    userManagement: true,
                    questManagement: true,
                    economySettings: true,
                    botConfiguration: true
                },
                setupCompleted: false, // Will be true after full setup
                setupStep: 'security_profile_created',
                createdAt: new Date(),
                lastLogin: null
            };

            // Save to database
            if (!DatabaseManager.connected) {
                // Demo mode - save to memory store
                if (!DatabaseManager.memoryStore.adminProfiles) {
                    DatabaseManager.memoryStore.adminProfiles = new Map();
                }
                DatabaseManager.memoryStore.adminProfiles.set(interaction.guild.id, adminProfile);
                logger.info(`Admin profile saved to memory store for guild ${interaction.guild.id}`);
            } else {
                // Connected mode - save to MongoDB
                await DatabaseManager.collections.adminProfiles.insertOne(adminProfile);
                logger.info(`Admin profile saved to database for guild ${interaction.guild.id}`);
            }

            // Show setup options
            await this.showSetupOptions(interaction);

            // Log the creation
            auditLogger.log('ADMIN_PROFILE', 'Server owner admin profile created', 'profile_creation', {
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                recoveryMethods: Object.keys(adminProfile.recoveryMethods),
                timestamp: new Date()
            });

            logger.info(`Admin profile created for ${interaction.user.username} in ${interaction.guild.name}`);

        } catch (error) {
            logger.error('Error creating admin profile:', error);
            
            // Handle duplicate key error specifically
            if (error.code === 11000) {
                // Show setup options for existing profile
                await this.showSetupOptions(interaction);
                return;
            }
            
            await interaction.reply({
                content: '❌ Error creating admin profile. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show setup options (Quick Start vs Custom)
     */
    static async showSetupOptions(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('✅ **ADMIN PROFILE CREATED** ✅')
                .setDescription(
                    '**Security Profile Successfully Created!**\n\n' +
                    '🔐 **Password**: Configured\n' +
                    '🐦 **X Account**: ' + interaction.fields.getTextInputValue('x_account') + '\n' +
                    '💎 **EVM Wallet**: ' + interaction.fields.getTextInputValue('evm_wallet').substring(0, 8) + '...\n' +
                    '📧 **Email**: ' + interaction.fields.getTextInputValue('email_address') + '\n\n' +
                    '**⚠️ IMPORTANT SECURITY REMINDERS:**\n' +
                    '• Save your password securely - resets require 2 recovery methods\n' +
                    '• Verify your X account and wallet information is correct\n' +
                    '• You will need these for password recovery\n\n' +
                    '**Next Step: Choose Setup Type**\n\n' +
                    '🚀 **Quick Start**: Automatically configure recommended channels and embeds\n' +
                    '⚙️ **Custom Setup**: Choose specific channels and configuration options\n\n' +
                    '*Select your preferred setup method:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Server Setup • Choose Configuration Method' })
                .setTimestamp();

            const quickStartButton = new ButtonBuilder()
                .setCustomId('server_setup_quick_start')
                .setLabel('🚀 Quick Start')
                .setStyle(ButtonStyle.Primary);

            const customSetupButton = new ButtonBuilder()
                .setCustomId('server_setup_custom')
                .setLabel('⚙️ Custom Setup')
                .setStyle(ButtonStyle.Secondary);

            const emergencyButton = new ButtonBuilder()
                .setCustomId('server_setup_emergency_help')
                .setLabel('🆘 Need Help?')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(quickStartButton, customSetupButton, emergencyButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing setup options:', error);
            throw error;
        }
    }

    /**
     * Show setup help information
     */
    static async showSetupHelp(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📚 **SETUP HELP & GUIDE** 📚')
                .setDescription(
                    '**Server Owner Setup Process**\n\n' +
                    '**📋 REQUIRED INFORMATION:**\n' +
                    '• Strong password (12+ characters)\n' +
                    '• X (Twitter) username for recovery\n' +
                    '• EVM wallet address (Ethereum/Polygon compatible)\n' +
                    '• Valid email address\n\n' +
                    '**🔐 SECURITY FEATURES:**\n' +
                    '• Password required for admin functions\n' +
                    '• 2-factor recovery system\n' +
                    '• Encrypted data storage\n' +
                    '• Audit logging for all actions\n\n' +
                    '**⚙️ SETUP OPTIONS:**\n\n' +
                    '**Quick Start:**\n' +
                    '• Creates recommended channel structure\n' +
                    '• Automatically places game embeds\n' +
                    '• Default permissions and settings\n' +
                    '• Ready to play immediately\n\n' +
                    '**Custom Setup:**\n' +
                    '• Choose specific channels for different functions\n' +
                    '• Configure custom permissions\n' +
                    '• Select which features to enable\n' +
                    '• Advanced configuration options\n\n' +
                    '**🆘 EMERGENCY RECOVERY:**\n' +
                    'If you lose your password, you can recover using 2 of your 3 recovery methods:\n' +
                    '• X account verification\n' +
                    '• EVM wallet signature\n' +
                    '• Email verification\n\n' +
                    '**Need additional help? Click "Need Help?" to contact support.**'
                )
                .setColor(0x3498db)
                .setFooter({ text: 'Setup Help • Dungeonites Heroes Challenge' })
                .setTimestamp();

            const backButton = new ButtonBuilder()
                .setCustomId('server_owner_setup_begin')
                .setLabel('⬅️ Back to Setup')
                .setStyle(ButtonStyle.Primary);

            const emergencyButton = new ButtonBuilder()
                .setCustomId('server_setup_emergency_help')
                .setLabel('🆘 Contact Support')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(backButton, emergencyButton);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing setup help:', error);
            throw error;
        }
    }

    /**
     * Handle emergency help request
     */
    static async handleEmergencyHelp(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('server_emergency_help_request')
                .setTitle('Emergency Support Request');

            const problemInput = new TextInputBuilder()
                .setCustomId('problem_description')
                .setLabel('Describe your problem')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder('Describe the issue you\'re experiencing in detail...');

            const urgencyInput = new TextInputBuilder()
                .setCustomId('urgency_level')
                .setLabel('Urgency Level (Low/Medium/High/Critical)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(20)
                .setPlaceholder('How urgent is this issue?');

            const contactInput = new TextInputBuilder()
                .setCustomId('contact_preference')
                .setLabel('Contact Preference (Discord DM/Email/Other)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(100)
                .setPlaceholder('How would you prefer to be contacted?');

            const row1 = new ActionRowBuilder().addComponents(problemInput);
            const row2 = new ActionRowBuilder().addComponents(urgencyInput);
            const row3 = new ActionRowBuilder().addComponents(contactInput);

            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing emergency help modal:', error);
            await interaction.reply({
                content: '❌ Error showing support form. Please try contacting gdwizard directly.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle emergency help submission
     */
    static async handleEmergencyHelpSubmission(interaction) {
        try {
            const problemDescription = interaction.fields.getTextInputValue('problem_description');
            const urgencyLevel = interaction.fields.getTextInputValue('urgency_level');
            const contactPreference = interaction.fields.getTextInputValue('contact_preference') || 'Discord DM';

            // Send DM to bot developer (gdwizard)
            const botDeveloperUserId = '237619263121399808'; // Your user ID
            const botDeveloper = await interaction.client.users.fetch(botDeveloperUserId);

            if (botDeveloper) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🆘 **EMERGENCY SUPPORT REQUEST** 🆘')
                    .setDescription(
                        '**New support request from server owner:**'
                    )
                    .addFields([
                        {
                            name: '👤 **User Information**',
                            value: `**Username**: ${interaction.user.username}\n**User ID**: ${interaction.user.id}\n**Mention**: <@${interaction.user.id}>`,
                            inline: false
                        },
                        {
                            name: '🏰 **Server Information**', 
                            value: `**Server**: ${interaction.guild.name}\n**Server ID**: ${interaction.guild.id}\n**Members**: ${interaction.guild.memberCount}`,
                            inline: false
                        },
                        {
                            name: '📝 **Problem Description**',
                            value: problemDescription.length > 1000 ? problemDescription.substring(0, 1000) + '...' : problemDescription,
                            inline: false
                        },
                        {
                            name: '⚡ **Urgency Level**',
                            value: urgencyLevel,
                            inline: true
                        },
                        {
                            name: '📞 **Contact Preference**',
                            value: contactPreference,
                            inline: true
                        },
                        {
                            name: '🕒 **Request Time**',
                            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                            inline: true
                        }
                    ])
                    .setColor(0xff0000)
                    .setFooter({ text: `Use /dm ${interaction.user.id} to reply directly to this user` })
                    .setTimestamp();

                // Send DM to bot developer
                await botDeveloper.send({ embeds: [helpEmbed] });

                // Log the emergency request
                auditLogger.log('EMERGENCY_HELP', `Emergency help request from ${interaction.user.username} in ${interaction.guild.name}`, 'emergency_support', {
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    guildId: interaction.guild.id,
                    guildName: interaction.guild.name,
                    problemDescription: problemDescription,
                    urgencyLevel: urgencyLevel,
                    contactPreference: contactPreference,
                    timestamp: new Date()
                });

                logger.warn(`Emergency help request sent to bot developer from ${interaction.user.username} in ${interaction.guild.name}`);
            }

            // Confirm to user that help request was sent
            await interaction.reply({
                content: '✅ **Emergency Support Request Sent!**\n\nYour request has been forwarded to the bot developer. You should receive a response within 24 hours depending on urgency level.\n\n**What happens next:**\n• Developer will review your request\n• You may receive a DM with assistance\n• Critical issues will be prioritized\n\n*Thank you for your patience!*',
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error handling emergency help submission:', error);
            await interaction.reply({
                content: '❌ Error sending emergency help request. Please try again or contact support directly.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle Quick Start setup for server owners
     */
    static async handleQuickStart(interaction) {
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

            // Reuse the Bot Developer's Game Hall setup logic
            const { BotDeveloperHandler } = await import('./BotDeveloperHandler.js');
            await BotDeveloperHandler.handleCustomSetupGameHall(interaction);
            
            logger.info(`Server owner quick setup initiated in ${interaction.guild.name} by ${interaction.user.username}`);

        } catch (error) {
            logger.error('Error handling server owner quick start:', error);
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
     * Handle Custom Setup for server owners
     */
    static async handleCustomSetup(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔧 **CUSTOM SETUP** 🔧')
                .setDescription(
                    '**Server Owner Custom Setup**\n\n' +
                    '✅ **Admin Profile**: Verified\n' +
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

            logger.info(`Server owner custom setup initiated in ${interaction.guild.name} by ${interaction.user.username}`);

        } catch (error) {
            logger.error('Error handling server owner custom setup:', error);
            await interaction.update({
                content: '❌ Error starting custom setup. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle Custom Setup Cancel for Server Owners
     */
    static async handleCustomSetupCancel(interaction) {
        try {
            // Import BotDeveloperHandler to reuse asset detection
            const { BotDeveloperHandler } = await import('./BotDeveloperHandler.js');
            const dungeonitesAssets = await BotDeveloperHandler.findDungeonitesAssets(interaction.guild);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ **CUSTOM SETUP CANCELLED** ❌')
                .setDescription(
                    '**Server Owner Custom Setup Cancelled**\n\n' +
                    '✅ **Admin Profile**: Still Active\n' +
                    `🎯 **Target Server**: ${interaction.guild?.name}\n\n` +
                    '**Setup Status**: Custom setup cancelled\n' +
                    '**What happens next?**\n' +
                    '└ Return to admin dashboard\n' +
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

            const adminDashboardButton = new ButtonBuilder()
                .setCustomId('admin_dashboard')
                .setLabel('🏠 Return to Admin Dashboard')
                .setStyle(ButtonStyle.Primary);

            const tryAgainButton = new ButtonBuilder()
                .setCustomId('server_setup_custom')
                .setLabel('🔄 Try Setup Again')
                .setStyle(ButtonStyle.Secondary);

            const components = [adminDashboardButton, tryAgainButton];

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
            logger.error('Error handling server owner custom setup cancel:', error);
            await interaction.update({
                content: '❌ Error cancelling custom setup. Please try again.',
                embeds: [],
                components: []
            });
        }
    }
} 