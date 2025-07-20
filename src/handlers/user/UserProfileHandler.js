import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import crypto from 'crypto';
import { PromotionalHandler } from './PromotionalHandler.js';

/**
 * UserProfileHandler - Manages regular user profiles and first-time setup
 * Enforces profile creation before accessing game/marketplace/casino
 */
export class UserProfileHandler {
    static userSessions = new Map(); // Active user profile sessions
    static SESSION_DURATION = 60 * 60 * 1000; // 1 hour for user sessions

    /**
     * Check if user has ANY profile (admin, master, or player)
     */
    static async hasAnyProfile(userId) {
        try {
            logger.info(`[DEBUG] Checking ANY profile for userId: ${userId} (type: ${typeof userId})`);
            
            if (!DatabaseManager.connected) {
                logger.warn('Database not connected, checking memory store');
                const hasMemoryProfile = DatabaseManager.memoryStore?.userProfiles?.has(userId) || false;
                logger.info(`[DEBUG] Memory store profile found: ${hasMemoryProfile}`);
                return { hasProfile: hasMemoryProfile, profileType: hasMemoryProfile ? 'unknown' : null };
            }
            
            // Convert userId to string for consistent searching
            const userIdStr = String(userId);
            const userIdNum = parseInt(userId);
            
            // Check for player profile first
            const userProfilesCollection = DatabaseManager.db.collection('userProfiles');
            logger.info(`[DEBUG] Querying MongoDB collection 'userProfiles' for userId: ${userId}`);
            
            // Check both string and number formats
            const playerProfile = await userProfilesCollection.findOne({ 
                $or: [
                    { userId: userIdStr },
                    { userId: userIdNum },
                    { userId: userId }
                ]
            });
            if (playerProfile) {
                logger.info(`[DEBUG] Found PLAYER profile for user: ${playerProfile.username} (userId: ${playerProfile.userId})`);
                return { hasProfile: true, profileType: 'player', profile: playerProfile };
            }
            
            // Check for admin profile
            const adminProfilesCollection = DatabaseManager.db.collection('adminProfiles');
            logger.info(`[DEBUG] Querying MongoDB collection 'adminProfiles' for userId: ${userId}`);
            
            const adminProfile = await adminProfilesCollection.findOne({ 
                $or: [
                    { userId: userIdStr },
                    { userId: userIdNum },
                    { userId: userId }
                ]
            });
            if (adminProfile) {
                logger.info(`[DEBUG] Found ADMIN profile for user: ${adminProfile.username} (userId: ${adminProfile.userId})`);
                return { hasProfile: true, profileType: 'admin', profile: adminProfile };
            }
            
            // Check for master profile
            const masterProfilesCollection = DatabaseManager.db.collection('masterProfiles');
            logger.info(`[DEBUG] Querying MongoDB collection 'masterProfiles' for userId: ${userId}`);
            
            const masterProfile = await masterProfilesCollection.findOne({ 
                $or: [
                    { userId: userIdStr },
                    { userId: userIdNum },
                    { userId: userId }
                ]
            });
            if (masterProfile) {
                logger.info(`[DEBUG] Found MASTER profile for user: ${masterProfile.username} (userId: ${masterProfile.userId})`);
                return { hasProfile: true, profileType: 'master', profile: masterProfile };
            }
            
            logger.info(`[DEBUG] No profile found for userId: ${userId}`);
            
            // Debug: Show what profiles exist
            const totalPlayerProfiles = await userProfilesCollection.countDocuments({});
            const totalAdminProfiles = await adminProfilesCollection.countDocuments({});
            const totalMasterProfiles = await masterProfilesCollection.countDocuments({});
            logger.info(`[DEBUG] Total profiles - Player: ${totalPlayerProfiles}, Admin: ${totalAdminProfiles}, Master: ${totalMasterProfiles}`);
            
            if (totalPlayerProfiles > 0) {
                const samplePlayerProfiles = await userProfilesCollection.find({}).limit(5).toArray();
                logger.info(`[DEBUG] Sample player userIds:`, samplePlayerProfiles.map(p => ({ userId: p.userId, username: p.username })));
            }
            
            if (totalAdminProfiles > 0) {
                const sampleAdminProfiles = await adminProfilesCollection.find({}).limit(5).toArray();
                logger.info(`[DEBUG] Sample admin userIds:`, sampleAdminProfiles.map(p => ({ userId: p.userId, username: p.username })));
            }
            
            if (totalMasterProfiles > 0) {
                const sampleMasterProfiles = await masterProfilesCollection.find({}).limit(5).toArray();
                logger.info(`[DEBUG] Sample master userIds:`, sampleMasterProfiles.map(p => ({ userId: p.userId, username: p.username })));
            }
            
            return { hasProfile: false, profileType: null };
            
        } catch (error) {
            logger.error('[DEBUG] Error checking user profiles:', error);
            return { hasProfile: false, profileType: null };
        }
    }

    /**
     * Check if user has a player profile specifically
     */
    static async hasProfile(userId) {
        try {
            logger.info(`[DEBUG] Checking PLAYER profile for userId: ${userId} (type: ${typeof userId})`);
            
            if (!DatabaseManager.connected) {
                logger.warn('Database not connected, checking memory store');
                const hasMemoryProfile = DatabaseManager.memoryStore?.userProfiles?.has(userId) || false;
                logger.info(`[DEBUG] Memory store profile found: ${hasMemoryProfile}`);
                return hasMemoryProfile;
            }
            
            const collection = DatabaseManager.db.collection('userProfiles');
            logger.info(`[DEBUG] Querying MongoDB collection 'userProfiles' for userId: ${userId}`);
            
            const profile = await collection.findOne({ userId: userId });
            logger.info(`[DEBUG] Player profile found: ${!!profile}`);
            if (profile) {
                logger.info(`[DEBUG] Found player profile for user: ${profile.username} (userId: ${profile.userId})`);
            }
            
            return !!profile;
        } catch (error) {
            logger.error('[DEBUG] Error checking user profile:', error);
            return false;
        }
    }

    /**
     * Get user profile from database
     */
    static async getUserProfile(userId) {
        try {
            if (!DatabaseManager.connected) {
                logger.warn('Database not connected, checking memory store');
                return DatabaseManager.memoryStore?.userProfiles?.get(userId) || null;
            }
            
            const collection = DatabaseManager.db.collection('userProfiles');
            return await collection.findOne({ userId: userId });
        } catch (error) {
            logger.error('Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated (works across all systems: game, marketplace, casino)
     */
    static isAuthenticated(userId) {
        const session = this.userSessions.get(userId);
        if (!session) return false;
        
        const now = Date.now();
        
        // Check if session has expired
        if (now > session.expires) {
            this.userSessions.delete(userId);
            return false;
        }
        
        // Check if authenticated within last 12 hours
        const twelveHours = 12 * 60 * 60 * 1000;
        if (session.lastAuthenticated && (now - session.lastAuthenticated) < twelveHours) {
            return true;
        }
        
        return session.authenticated || false;
    }

    /**
     * Check if user needs password for any system access
     * Returns true if password is required, false if auto-login is available
     */
    static needsPasswordAuth(userId) {
        const session = this.userSessions.get(userId);
        if (!session) return true; // No session = needs password
        
        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;
        
        // Check if last authentication was within 12 hours
        if (session.lastAuthenticated && (now - session.lastAuthenticated) < twelveHours) {
            return false; // Auto-login available
        }
        
        return true; // Needs password
    }

    /**
     * Authenticate user with password - works with any profile type
     */
    static async authenticateUser(userId, password) {
        try {
            const profileInfo = await this.hasAnyProfile(userId);
            if (!profileInfo.hasProfile) return false;

            let profile = null;
            let passwordHash = null;

            if (profileInfo.profileType === 'player') {
                profile = await this.getUserProfile(userId);
                passwordHash = profile?.passwordHash;
            } else if (profileInfo.profileType === 'admin') {
                // Get admin profile
                if (!DatabaseManager.connected) {
                    logger.warn('Database not connected for admin profile check');
                    return false;
                }
                // Convert userId to string for consistent searching
                const userIdStr = String(userId);
                const userIdNum = parseInt(userId);
                
                const adminCollection = DatabaseManager.db.collection('adminProfiles');
                profile = await adminCollection.findOne({ 
                    $or: [
                        { userId: userIdStr },
                        { userId: userIdNum },
                        { userId: userId }
                    ]
                });
                passwordHash = profile?.passwordHash;
                logger.info(`[AUTH_DEBUG] Admin profile found for ${userId}: ${!!profile}, has passwordHash: ${!!passwordHash}`);
            } else if (profileInfo.profileType === 'master') {
                // Get master profile
                if (!DatabaseManager.connected) {
                    logger.warn('Database not connected for master profile check');
                    return false;
                }
                // Convert userId to string for consistent searching
                const userIdStr = String(userId);
                const userIdNum = parseInt(userId);
                
                const masterCollection = DatabaseManager.db.collection('masterProfiles');
                profile = await masterCollection.findOne({ 
                    $or: [
                        { userId: userIdStr },
                        { userId: userIdNum },
                        { userId: userId }
                    ]
                });
                passwordHash = profile?.passwordHash;
            }

            if (!profile || !passwordHash) {
                logger.warn(`Profile found but no password hash for user ${userId} (${profileInfo.profileType})`);
                logger.info(`[AUTH_DEBUG] Profile: ${!!profile}, PasswordHash: ${!!passwordHash}, ProfileType: ${profileInfo.profileType}`);
                return false;
            }

            const hashedInputPassword = crypto.createHash('sha256').update(password).digest('hex');
            
            logger.info(`[AUTH_DEBUG] Password comparison for ${userId}:`, {
                profileType: profileInfo.profileType,
                hasStoredHash: !!passwordHash,
                hasInputPassword: !!password,
                inputLength: password.length
            });
            
            if (hashedInputPassword === passwordHash) {
                // Create session with last authenticated timestamp
                const now = Date.now();
                this.userSessions.set(userId, {
                    expires: now + this.SESSION_DURATION,
                    authenticated: true,
                    lastAuthenticated: now,
                    profileType: profileInfo.profileType
                });

                logger.info(`Authentication successful for ${profile.username} (${profileInfo.profileType} profile)`);
                return true;
            }
            
            logger.info(`Authentication failed for user ${userId} - incorrect password`);
            return false;
        } catch (error) {
            logger.error('Error authenticating user:', error);
            return false;
        }
    }

    /**
     * Check if user needs profile creation (main entry point)
     */
    static async checkProfileRequired(interaction, source = 'unknown') {
        const userId = interaction.user.id;
        const hasUserProfile = await this.hasProfile(userId);

        if (!hasUserProfile) {
            logger.info(`User ${userId} (${interaction.user.username}) attempting to access ${source} without profile - showing smart profile options`);
            
            // Always use smart profile options which show both login and create options
            await this.showSmartProfileOptions(interaction, source);
            return true; // Profile required, handled
        }

        return false; // Profile exists, continue
    }

    /**
     * Show first-time profile creation prompt
     */
    static async showProfileCreationPrompt(interaction, source) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎮 **WELCOME TO DUNGEONITES HEROES CHALLENGE** 🎮')
                .setDescription(
                    `**First-Time Player Setup Required**\n\n` +
                    `Welcome ${interaction.user.username}! Before you can access the ${source}, you need to create your player profile.\n\n` +
                    '**🔐 SECURITY PROFILE REQUIREMENTS:**\n' +
                    '• **Password**: 12+ characters for account security\n' +
                    '• **Recovery Methods**: Choose 2 of 3 options:\n' +
                    '  - 🐦 X (Twitter) account\n' +
                    '  - 💎 EVM wallet address\n' +
                    '  - 📧 Email address\n\n' +
                    '**⚠️ IMPORTANT SECURITY NOTES:**\n' +
                    '• Your password protects your game assets and progress\n' +
                    '• Recovery methods are used for password resets\n' +
                    '• All data is encrypted and stored securely\n' +
                    '• You\'ll need to login daily and after long breaks\n\n' +
                    '**🎯 AFTER PROFILE CREATION:**\n' +
                    '• Full access to game, marketplace, and casino\n' +
                    '• Secure asset protection and trading\n' +
                    '• Quest participation and rewards\n' +
                    '• Cross-server economy access\n\n' +
                    '*Click below to create your secure player profile:*'
                )
                .setColor(0x00ff00)
                .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                .setFooter({ text: 'Player Profile Creation • Required for Game Access' })
                .setTimestamp();

            const createProfileButton = new ButtonBuilder()
                .setCustomId('user_profile_create_begin')
                .setLabel('🔒 Create Player Profile')
                .setStyle(ButtonStyle.Primary);

            const helpButton = new ButtonBuilder()
                .setCustomId('user_profile_help')
                .setLabel('❓ Need Help?')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(createProfileButton, helpButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            auditLogger.log('USER_PROFILE', `Profile creation prompt shown to ${interaction.user.username}`, 'profile_prompt', {
                userId: interaction.user.id,
                source: source,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('Error showing profile creation prompt:', error);
            await interaction.reply({
                content: '❌ Error showing profile creation. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle profile creation button click
     */
    static async handleProfileCreationBegin(interaction) {
        try {
            logger.info('User profile creation begin - Creating comprehensive security modal for user:', interaction.user.id);
            
            const modal = new ModalBuilder()
                .setCustomId('user_security_profile_setup')
                .setTitle('Player Security Profile');

            const passwordInput = new TextInputBuilder()
                .setCustomId('user_password')
                .setLabel('Password')
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

            logger.info('User security profile modal created successfully, showing to user:', interaction.user.id);
            await interaction.showModal(modal);
            logger.info('User security profile modal shown successfully to user:', interaction.user.id);

        } catch (error) {
            logger.error('Error showing user profile creation modal:', error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Error showing profile creation form. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                logger.error('Error sending error reply:', replyError);
            }
        }
    }

    /**
     * Handle user security profile setup submission
     */
    static async handleSecurityProfileSetup(interaction) {
        try {
            const userPassword = interaction.fields.getTextInputValue('user_password');
            const confirmPassword = interaction.fields.getTextInputValue('confirm_password');
            const xAccount = interaction.fields.getTextInputValue('x_account') || null;
            const evmWallet = interaction.fields.getTextInputValue('evm_wallet') || null;
            const emailAddress = interaction.fields.getTextInputValue('email_address') || null;

            // Validate password
            if (userPassword !== confirmPassword) {
                await interaction.reply({
                    content: '❌ Passwords do not match. Please try again.',
                    ephemeral: true
                });
                return;
            }

            if (userPassword.length < 12) {
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

            // Require at least 2 of 3 recovery options for regular users
            if (recoveryMethods.length < 2) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ **INSUFFICIENT RECOVERY METHODS** ❌')
                    .setDescription(
                        '**Security Validation Failed**\n\n' +
                        '⚠️ **Minimum 2 recovery methods required** (excluding password)\n\n' +
                        '**Recovery Methods Provided:** ' + recoveryMethods.length + '/2\n\n' +
                        '**Recovery Options:**\n' +
                        '🐦 X (Twitter) account' + (xAccount && xAccount.trim() ? ' ✅' : ' ❌') + '\n' +
                        '💎 EVM wallet address' + (evmWallet && evmWallet.trim() ? ' ✅' : ' ❌') + '\n' +
                        '📧 Email address' + (emailAddress && emailAddress.trim() ? ' ✅' : ' ❌') + '\n\n' +
                        '*Please provide at least 2 recovery methods for account security.*'
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

            // Create user profile with recovery methods
            const hashedPassword = crypto.createHash('sha256').update(userPassword).digest('hex');
            const userProfile = {
                userId: interaction.user.id,
                username: interaction.user.username,
                displayName: interaction.user.displayName || interaction.user.username,
                passwordHash: hashedPassword,
                profileType: 'regular_user', // Could be 'certified_user' if designated
                recoveryMethods: {
                    xAccount: xAccount && xAccount.trim() ? xAccount.trim() : null,
                    evmWallet: evmWallet && evmWallet.trim() ? evmWallet.trim() : null,
                    email: emailAddress && emailAddress.trim() ? emailAddress.trim() : null
                },
                permissions: {
                    gameAccess: true,
                    marketplaceAccess: true,
                    casinoAccess: true,
                    questParticipation: true,
                    profileManagement: true
                },
                gameStats: {
                    gamesPlayed: 0,
                    totalPlayTime: 0,
                    highestFloor: 0,
                    totalDeaths: 0,
                    questsCompleted: 0
                },
                economy: {
                    totalGoldEarned: 0,
                    totalItemsFound: 0,
                    marketplaceSales: 0,
                    marketplacePurchases: 0
                },
                createdAt: new Date(),
                lastLogin: new Date(),
                loginHistory: [{
                    timestamp: new Date(),
                    action: 'profile_created'
                }]
            };

            // Save to database
            await this.saveUserProfile(userProfile);

            // Create session
            this.userSessions.set(interaction.user.id, {
                expires: Date.now() + this.SESSION_DURATION,
                authenticated: true
            });

            // Check and grant promotional weapons (for Dungeonites Heroes server only)
            try {
                const { StateService } = await import('../../utils/StateService.js');
                const gameState = await StateService.getOrCreateState(interaction.user.id);
                if (gameState && interaction.guild) {
                    const promotionalResult = await PromotionalHandler.checkAndGrantPromotionalWeapons(interaction, gameState, 'profile_creation');
                    if (promotionalResult.granted) {
                        await PromotionalHandler.showPromotionalNotification(interaction, promotionalResult);
                        // Save updated game state with new weapons
                        await StateService.saveGameState(interaction.user.id, gameState);
                    }
                }
            } catch (promotionalError) {
                logger.warn('Non-critical error checking promotional weapons:', promotionalError.message);
            }

            // Build recovery methods display
            const recoveryMethodsDisplay = [];
            if (xAccount && xAccount.trim()) recoveryMethodsDisplay.push('🐦 X Account: ' + xAccount.trim());
            if (evmWallet && evmWallet.trim()) recoveryMethodsDisplay.push('💎 EVM Wallet: ' + evmWallet.trim().substring(0, 8) + '...');
            if (emailAddress && emailAddress.trim()) recoveryMethodsDisplay.push('📧 Email: ' + emailAddress.trim());

            // Confirmation embed
            const embed = new EmbedBuilder()
                .setTitle('✅ **PLAYER PROFILE CREATED** ✅')
                .setDescription(
                    '**Player Profile Successfully Created!**\n\n' +
                    '🔐 **Password**: Configured\n' +
                    '🎮 **Game Access**: Enabled\n' +
                    '🏪 **Marketplace Access**: Enabled\n' +
                    '🎰 **Casino Access**: Enabled\n\n' +
                    '**🔄 Recovery Methods Configured (' + recoveryMethods.length + '/2):**\n' +
                    recoveryMethodsDisplay.join('\n') + '\n\n' +
                    '**⚠️ IMPORTANT SECURITY REMINDERS:**\n' +
                    '• Save your password securely - resets require 2 recovery methods\n' +
                    '• You\'ll need to login daily and after 12+ hour breaks\n' +
                    '• Password required for asset transfers and marketplace\n' +
                    '• Verify your recovery information is correct\n\n' +
                    '**🎯 YOU CAN NOW ACCESS:**\n' +
                                            '• **Game**: Use `/ch` to start your adventure\n' +
                    '• **Marketplace**: Use `/marketplace` to trade items\n' +
                    '• **Casino**: Access gambling features\n' +
                    '• **Quests**: Participate in daily and custom quests\n\n' +
                    '*Your secure player profile is now active!*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Player Profile Active • Game Access Enabled' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            auditLogger.log('USER_PROFILE', `Player profile created for ${interaction.user.username}`, 'profile_creation', {
                userId: interaction.user.id,
                recoveryMethods: recoveryMethods.length,
                timestamp: new Date()
            });

            logger.info(`Player profile created successfully for user ${interaction.user.id} (${interaction.user.username})`);

        } catch (error) {
            logger.error('Error creating user profile:', error);
            await interaction.reply({
                content: '❌ Error creating player profile. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Save user profile to database
     */
    static async saveUserProfile(userProfile) {
        try {
            
            if (!DatabaseManager.connected) {
                // Fallback to memory store if database not connected
                if (!DatabaseManager.memoryStore) {
                    DatabaseManager.memoryStore = { userProfiles: new Map() };
                }
                if (!DatabaseManager.memoryStore.userProfiles) {
                    DatabaseManager.memoryStore.userProfiles = new Map();
                }
                DatabaseManager.memoryStore.userProfiles.set(userProfile.userId, userProfile);
                logger.info(`User profile saved to memory store for ${userProfile.userId}`);
                return;
            }
            
            const collection = DatabaseManager.db.collection('userProfiles');
            
            // Use MongoDB upsert operation
            await collection.replaceOne(
                { userId: userProfile.userId },
                userProfile,
                { upsert: true }
            );

            logger.info(`User profile saved successfully for ${userProfile.userId}`);
            
        } catch (error) {
            logger.error('Error saving user profile:', error);
            throw error;
        }
    }

    /**
     * Show login menu for existing users
     */
    static async showLoginMenu(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔐 **PLAYER LOGIN REQUIRED** 🔐')
                .setDescription(
                    `**Welcome back ${interaction.user.username}!**\n\n` +
                    '✅ **Profile Found** - Your player profile exists\n' +
                    '🔑 **Authentication Required** - Please login to continue\n\n' +
                    '**Why do I need to login?**\n' +
                    '• Protects your game assets and progress\n' +
                    '• Prevents unauthorized access to your items\n' +
                    '• Required for marketplace and trading\n' +
                    '• Ensures secure cross-server play\n\n' +
                    '**Login Options:**\n' +
                    '🔑 **Password Login** - Use your secure password\n' +
                    '🆘 **Forgot Password** - Recover using your backup methods\n\n' +
                    '*Click below to authenticate and start your adventure:*'
                )
                .setColor(0x3498db)
                .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                .setFooter({ text: 'Player Authentication • Secure Login' })
                .setTimestamp();

            const loginButton = new ButtonBuilder()
                .setCustomId('user_login_password')
                .setLabel('🔑 Enter Password')
                .setStyle(ButtonStyle.Primary);

            const forgotButton = new ButtonBuilder()
                .setCustomId('user_forgot_password')
                .setLabel('🆘 Forgot Password')
                .setStyle(ButtonStyle.Secondary);

            const helpButton = new ButtonBuilder()
                .setCustomId('user_login_help')
                .setLabel('❓ Need Help?')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(loginButton, forgotButton, helpButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: false
            });

        } catch (error) {
            logger.error('Error showing login menu:', error);
            await interaction.reply({
                content: '❌ Error showing login menu. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show profile creation help
     */
    static async showProfileHelp(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('❓ **PLAYER PROFILE HELP** ❓')
                .setDescription(
                    '**Why do I need a profile?**\n' +
                    'Player profiles protect your game progress, items, and currency. All valuable assets require secure authentication.\n\n' +
                    '**What information is required?**\n' +
                    '• **Password**: 12+ characters for daily login protection\n' +
                    '• **Recovery Methods**: 2 of 3 options for password resets\n\n' +
                    '**Recovery Method Options:**\n' +
                    '🐦 **X (Twitter) Account**: Your username for identity verification\n' +
                    '💎 **EVM Wallet**: Ethereum-compatible wallet for crypto verification\n' +
                    '📧 **Email Address**: For verification codes and notifications\n\n' +
                    '**When will I need my password?**\n' +
                    '• Daily login (once per day)\n' +
                    '• Asset transfers between chests\n' +
                    '• Marketplace buying/selling\n' +
                    '• After 12+ hours away from game\n' +
                    '• Profile chest access\n\n' +
                    '**Is my data secure?**\n' +
                    '• All passwords are encrypted with SHA-256\n' +
                    '• Recovery information is stored securely\n' +
                    '• No plaintext passwords ever stored\n' +
                    '• Comprehensive audit logging\n\n' +
                    '**Need more help?**\n' +
                    'Contact server administrators or use the emergency help system.'
                )
                .setColor(0x3498db)
                .setFooter({ text: 'Player Profile Help • Security Information' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing profile help:', error);
            await interaction.reply({
                content: '❌ Error showing help information.',
                ephemeral: true
            });
        }
    }

    /**
     * Show password authentication modal for existing users
     */
    static async showPasswordAuthModal(interaction, source = 'unknown') {
        try {
            const modal = new ModalBuilder()
                .setCustomId(`user_password_auth_${source}`)
                .setTitle('Player Authentication');

            const passwordInput = new TextInputBuilder()
                .setCustomId('auth_password')
                .setLabel('Enter Your Password')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Enter your player password...')
                .setMaxLength(100);

            const row = new ActionRowBuilder().addComponents(passwordInput);
            modal.addComponents(row);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing password auth modal:', error);
            try {
                // Check if interaction is still available for response
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Error showing authentication form.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                logger.error('Could not send modal error response:', replyError);
            }
        }
    }

    /**
     * Handle password authentication
     */
    static async handlePasswordAuth(interaction, source) {
        try {
            const password = interaction.fields.getTextInputValue('auth_password');
            const userId = interaction.user.id;

            const authenticated = await this.authenticateUser(userId, password);

            if (authenticated) {
                const session = this.userSessions.get(userId);
                const profileType = session?.profileType || 'unknown';

                if (source === 'smart_login') {
                    // Smart login flow - show success message first
                    await interaction.reply({
                        content: `✅ **Authentication Successful!**\n\n🔓 **Welcome back ${interaction.user.username}!**\n🎯 **Auto-login active** for next 12 hours\n\n🎮 **Preparing your game menu...**`,
                        ephemeral: true
                    });

                    // Show post-login menu after brief delay
                    setTimeout(async () => {
                        try {
                            await this.handlePostLoginAction(interaction, profileType);
                        } catch (error) {
                            logger.error('Error showing post-login menu:', error);
                        }
                    }, 1000);

                } else {
                    // Regular login flow
                    await interaction.reply({
                        content: `✅ Authentication successful! You can now access the ${source}.`,
                        ephemeral: true
                    });
                }

                auditLogger.log('USER_AUTH', `User ${interaction.user.username} authenticated for ${source}`, 'auth_success', {
                    userId: userId,
                    profileType: profileType,
                    source: source,
                    timestamp: new Date()
                });

                // Check and grant promotional weapons (for Dungeonites Heroes server only)
                try {
                    const { StateService } = await import('../../utils/StateService.js');
                    const gameState = await StateService.getOrCreateState(userId);
                    if (gameState && interaction.guild) {
                        const promotionalResult = await PromotionalHandler.checkAndGrantPromotionalWeapons(interaction, gameState, 'login');
                        if (promotionalResult.granted) {
                            await PromotionalHandler.showPromotionalNotification(interaction, promotionalResult);
                            // Save updated game state with new weapons
                            await StateService.saveGameState(userId, gameState);
                        }
                    }
                } catch (promotionalError) {
                    logger.warn('Non-critical error checking promotional weapons:', promotionalError.message);
                }

                return true;
            } else {
                await interaction.reply({
                    content: '❌ **Invalid Password** - The password you entered is incorrect.\n\n🔒 **Security Notice:**\n• Check for typos and try again\n• Passwords are case-sensitive\n• Use "Forgot Password" if you need recovery\n\n*Please try again or contact support if you continue having issues.*',
                    ephemeral: true
                });

                auditLogger.log('USER_AUTH', `Failed authentication attempt by ${interaction.user.username} for ${source}`, 'auth_failed', {
                    userId: userId,
                    source: source,
                    timestamp: new Date()
                });

                return false;
            }
        } catch (error) {
            logger.error('Error handling password authentication:', error);
            try {
                // Check if we can still respond to the interaction
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ **Authentication Error** - There was a problem processing your login.\n\n🔧 **What to try:**\n• Refresh Discord and try again\n• Use a different authentication method\n• Contact support if the problem persists\n\n*We apologize for the inconvenience.*',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                logger.error('Could not send authentication error response:', replyError);
            }
            return false;
        }
    }

    /**
     * Handle password submission for player authentication
     */
    static async handlePasswordSubmission(interaction) {
        try {
            const password = interaction.fields.getTextInputValue('player_password');
            const userId = interaction.user.id;

            // Use unified authentication system
            const authResult = await this.authenticatePlayer(userId, password);

            if (authResult.success) {
                // Show player dashboard after successful authentication
                const { DashboardEmbedHandler } = await import('../ui/DashboardEmbedHandler.js');
                await DashboardEmbedHandler.showPlayerDashboard(interaction);
            } else {
                await interaction.reply({
                    content: '❌ **Authentication Failed**\n\nIncorrect password. Use the forgot password option if you need help.',
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error handling player password submission:', error);
            await interaction.reply({
                content: '❌ Error processing authentication.',
                ephemeral: true
            });
        }
    }

    /**
     * Authenticate player using unified system
     */
    static async authenticatePlayer(userId, password) {
        try {
            const { AuthenticationManager } = await import('../../utils/authenticationManager.js');
            
            // Use unified authentication (returns boolean)
            const isAuthenticated = await AuthenticationManager.authenticateUser(userId, password);
            
            if (isAuthenticated) {
                auditLogger.log('player_auth_success', {
                    userId: userId,
                    action: 'authentication_successful',
                    timestamp: new Date().toISOString()
                });
                return { success: true };
            } else {
                auditLogger.log('player_auth_failure', {
                    userId: userId,
                    action: 'authentication_failed',
                    timestamp: new Date().toISOString()
                });
                return { success: false };
            }

        } catch (error) {
            logger.error('Error authenticating player:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Show smart profile options - login OR create based on what user has
     */
    static async showSmartProfileOptions(interaction, source = 'game') {
        try {
            const userId = interaction.user.id;
            
            // Check if interaction was already acknowledged
            if (interaction.replied || interaction.deferred) {
                logger.warn(`Interaction already acknowledged for user ${userId} in showSmartProfileOptions`);
                return;
            }
            
            const profileInfo = await this.hasAnyProfile(userId);
            
            logger.info(`[PROFILE_DEBUG] User ${userId} (${interaction.user.username}) - Profile check result:`, {
                hasProfile: profileInfo.hasProfile,
                profileType: profileInfo.profileType,
                source: source
            });
            
            if (!profileInfo.hasProfile) {
                // No profile at all - show profile creation
                logger.info(`[PROFILE_DEBUG] No profile found for ${interaction.user.username}, showing creation prompt`);
                
                const embed = new EmbedBuilder()
                    .setTitle('🎮 **WELCOME TO DUNGEONITES HEROES CHALLENGE** 🎮')
                    .setDescription(
                        `**First-Time Player Setup Required**\n\n` +
                        `Welcome ${interaction.user.username}! Before you can access the ${source}, you need to create your player profile.\n\n` +
                        '**🔐 SECURITY PROFILE REQUIREMENTS:**\n' +
                        '• **Password**: 12+ characters for account security\n' +
                        '• **Recovery Methods**: Choose 2 of 3 options:\n' +
                        '  - 🐦 X (Twitter) account\n' +
                        '  - 💎 EVM wallet address\n' +
                        '  - 📧 Email address\n\n' +
                        '**⚠️ IMPORTANT SECURITY NOTES:**\n' +
                        '• Your password protects your game assets and progress\n' +
                        '• Recovery methods are used for password resets\n' +
                        '• All data is encrypted and stored securely\n' +
                        '• You\'ll need to login daily and after long breaks\n\n' +
                        '*Click below to create your secure player profile:*'
                    )
                    .setColor(0x00ff00)
                    .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                    .setFooter({ text: 'Player Profile Creation • Security Required' })
                    .setTimestamp();

                const createProfileButton = new ButtonBuilder()
                    .setCustomId('user_profile_create_begin')
                    .setLabel('🔒 Create Player Profile')
                    .setStyle(ButtonStyle.Primary);

                const helpButton = new ButtonBuilder()
                    .setCustomId('user_profile_help')
                    .setLabel('❓ Need Help?')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(createProfileButton, helpButton);

                await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
                return;
            }
            
            // They have SOME profile - show both options
            logger.info(`[PROFILE_DEBUG] Profile found for ${interaction.user.username} (${profileInfo.profileType}), showing smart options`);
            
            const embed = new EmbedBuilder()
                .setTitle('🎮 **WELCOME BACK TO DUNGEONITES** 🎮')
                .setDescription(
                    `**Welcome back ${interaction.user.username}!**\n\n` +
                    `✅ **Existing Account Found** - You have a ${profileInfo.profileType} profile\n` +
                    `🎯 **Choose Your Action:**\n\n` +
                    '**🔑 LOGIN** - Access your existing account\n' +
                    '• Use your existing password\n' +
                    '• Auto-login if used in last 12 hours\n' +
                    '• Access all your progress and items\n\n' +
                    '**🔒 CREATE PLAYER PROFILE** - Create new gaming profile\n' +
                    '• Enhanced security for game assets\n' +
                    '• Separate from your admin/master account\n' +
                    '• Full marketplace and trading access\n\n' +
                    '**❓ NEED HELP?** - Get assistance with your account\n\n' +
                    '*Choose the option that best fits your needs:*'
                )
                .setColor(0x3498db)
                .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                .setFooter({ text: `Account Options • ${profileInfo.profileType.charAt(0).toUpperCase() + profileInfo.profileType.slice(1)} Profile Detected` })
                .setTimestamp();

            const loginButton = new ButtonBuilder()
                .setCustomId('user_smart_login')
                .setLabel('🔑 Login to Existing Account')
                .setStyle(ButtonStyle.Primary);

            const createButton = new ButtonBuilder()
                .setCustomId('user_profile_create_begin')
                .setLabel('🔒 Create Player Profile')
                .setStyle(ButtonStyle.Secondary);

            const helpButton = new ButtonBuilder()
                .setCustomId('user_profile_help')
                .setLabel('❓ Need Help?')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(loginButton, createButton, helpButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            auditLogger.log('USER_PROFILE', `Smart profile options shown to ${interaction.user.username} (${profileInfo.profileType} profile detected)`, 'smart_profile_prompt', {
                userId: interaction.user.id,
                profileType: profileInfo.profileType,
                source: source,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('Error showing smart profile options:', error);
            
            // Only try to reply if we haven't already
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Error checking your account. Please try again.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    logger.error('Failed to send error reply in showSmartProfileOptions:', replyError);
                }
            }
        }
    }

    /**
     * Handle smart login - auto-login if used in last 12 hours, otherwise prompt for password
     */
    static async handleSmartLogin(interaction) {
        // STEP 1: Defer the interaction immediately to prevent acknowledgment errors
        await interaction.deferReply({ ephemeral: true });

        try {
            const userId = interaction.user.id;
            const profileInfo = await this.hasAnyProfile(userId);
            
            if (!profileInfo.hasProfile) {
                await interaction.editReply({
                    content: '❌ No profile found. Please create a profile first.'
                });
                return;
            }

            // Check if authenticated within last 12 hours
            const session = this.userSessions.get(userId);
            const now = Date.now();
            const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
            
            if (session && session.lastAuthenticated && (now - session.lastAuthenticated) < twelveHours) {
                // Auto-login successful
                logger.info(`Auto-login successful for ${interaction.user.username} (${profileInfo.profileType} profile)`);
                
                // Update session expiry
                this.userSessions.set(userId, {
                    expires: now + this.SESSION_DURATION,
                    authenticated: true,
                    lastAuthenticated: session.lastAuthenticated,
                    profileType: profileInfo.profileType
                });

                await interaction.editReply({
                    content: `✅ **Welcome back ${interaction.user.username}!**\n\n🔓 **Auto-Login Successful** - You've been authenticated automatically.\n\n🎮 **Starting your game now...**`
                });

                // Initialize game or redirect based on context
                setTimeout(async () => {
                    try {
                        await this.handlePostLoginAction(interaction, profileInfo.profileType);
                    } catch (error) {
                        logger.error('Error handling post-login action:', error);
                    }
                }, 1000);

                auditLogger.log('USER_AUTH', `Auto-login successful for ${interaction.user.username}`, 'auto_login_success', {
                    userId: userId,
                    profileType: profileInfo.profileType,
                    sessionAge: now - session.lastAuthenticated,
                    timestamp: new Date()
                });

            } else {
                // Need password authentication
                logger.info(`Password required for ${interaction.user.username} (${profileInfo.profileType} profile)`);
                
                const embed = new EmbedBuilder()
                    .setTitle('🔐 **PASSWORD REQUIRED** 🔐')
                    .setDescription(
                        `**Welcome back ${interaction.user.username}!**\n\n` +
                        `✅ **Account Found** - ${profileInfo.profileType.charAt(0).toUpperCase() + profileInfo.profileType.slice(1)} Profile\n` +
                        `🔑 **Password Authentication Required**\n\n` +
                        '**Why do I need to enter my password?**\n' +
                        '• More than 12 hours since last login\n' +
                        '• Protects your account and game assets\n' +
                        '• Required for security compliance\n\n' +
                        '**After successful login:**\n' +
                        '• Auto-login for next 12 hours\n' +
                        '• Full access to game features\n' +
                        '• Secure asset protection\n\n' +
                        '*Click below to enter your password:*'
                    )
                    .setColor(0xffa500)
                    .setFooter({ text: `Password Required • ${profileInfo.profileType.charAt(0).toUpperCase() + profileInfo.profileType.slice(1)} Profile` })
                    .setTimestamp();

                const passwordButton = new ButtonBuilder()
                    .setCustomId('user_smart_password_entry')
                    .setLabel('🔑 Enter Password')
                    .setStyle(ButtonStyle.Primary);

                const helpButton = new ButtonBuilder()
                    .setCustomId('user_login_help')
                    .setLabel('❓ Need Help?')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(passwordButton, helpButton);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

        } catch (error) {
            logger.error('Error in smart login:', error);
            try {
                await interaction.editReply({
                    content: '❌ Login error. Please try again or contact support.'
                });
            } catch (editError) {
                logger.error('Could not send error response:', editError);
            }
        }
    }

    /**
     * Show post-login game menu with buttons (for game thread context)
     */
    static async showPostLoginGameMenu(interaction, profileType) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎮 **AUTHENTICATION SUCCESSFUL** 🎮')
                .setDescription(
                    `**Welcome back ${interaction.user.username}!**\n\n` +
                    `✅ **Authenticated** - ${profileType.charAt(0).toUpperCase() + profileType.slice(1)} Profile\n` +
                    `🎯 **Auto-Login Active** - No password needed for 12 hours\n\n` +
                    '**Choose your next action:**\n' +
                    '⚔️ **Enter the Dungeon** - Start your adventure\n' +
                    '📦 **My Chests** - Manage your items and inventory\n' +
                    '🔙 **Return to Game Hall** - Go back to main game hall\n\n' +
                    '*Click a button below to continue:*'
                )
                .setColor(0x00ff00)
                .setImage('https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810')
                .setFooter({ text: 'Authentication Complete • Choose Your Path' })
                .setTimestamp();

            const enterDungeonButton = new ButtonBuilder()
                .setCustomId('post_login_enter_dungeon')
                .setLabel('⚔️ Enter the Dungeon')
                .setStyle(ButtonStyle.Primary);

            const myChestsButton = new ButtonBuilder()
                .setCustomId('post_login_my_chests')
                .setLabel('📦 My Chests')
                .setStyle(ButtonStyle.Secondary);

            const returnMenuButton = new ButtonBuilder()
                .setCustomId('post_login_return_game_hall')
                .setLabel('🔙 Return to Game Hall')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(enterDungeonButton, myChestsButton, returnMenuButton);

            // Check if this is in a thread context
            const isInThread = interaction.channel?.isThread() || interaction.thread;
            
            if (isInThread) {
                // Send new persistent message in thread - NOT ephemeral
                await interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                });
            } else {
                // Update the interaction - make it persistent, not ephemeral
                try {
                    await interaction.editReply({
                        embeds: [embed],
                        components: [row]
                    });
                } catch (editError) {
                    await interaction.followUp({
                        embeds: [embed],
                        components: [row],
                        ephemeral: false // Make it persistent!
                    });
                }
            }

            auditLogger.log('USER_AUTH', `Post-login game menu shown to ${interaction.user.username}`, 'post_login_game_menu', {
                userId: interaction.user.id,
                profileType: profileType,
                isInThread: isInThread,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('Error showing post-login game menu:', error);
        }
    }

    /**
     * Handle post-login actions based on context
     */
    static async handlePostLoginAction(interaction, profileType) {
        try {
            // Check if this is in a game thread context (thread name contains "Adventure")
            const isGameThread = interaction.channel?.isThread() && 
                                  interaction.channel.name?.includes('Adventure');
            
            if (isGameThread) {
                // Show button menu for game context
                await this.showPostLoginGameMenu(interaction, profileType);
                return;
            }
            
            // For non-game contexts (marketplace, casino), show generic success
            const embed = new EmbedBuilder()
                .setTitle('🎮 **LOGIN SUCCESSFUL** 🎮')
                .setDescription(
                    `**Welcome ${interaction.user.username}!**\n\n` +
                    `✅ **Authenticated** - ${profileType.charAt(0).toUpperCase() + profileType.slice(1)} Profile\n` +
                    `🎯 **Auto-Login Active** - No password needed for 12 hours\n\n` +
                    '**You can now:**\n' +
                    '🎮 **Play the game** - Click Start Game in Game Hall\n' +
                    '🏪 **Access marketplace** - Buy, sell, and trade items\n' +
                    '🎰 **Use casino** - Gamble with your gold\n' +
                    '📜 **Complete quests** - Daily and custom challenges\n\n' +
                    '*Your adventure awaits! Use the buttons and menus to play.*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Login Complete • Adventure Ready' })
                .setTimestamp();

            // Try to update the original interaction if possible
            try {
                await interaction.editReply({
                    embeds: [embed],
                    components: []
                });
            } catch (editError) {
                // If edit fails, try follow-up
                await interaction.followUp({
                    embeds: [embed],
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error in post-login action:', error);
        }
    }

    /**
     * Show password modal for player authentication
     */
    static async showPasswordModal(interaction, authType = 'player') {
        try {
            const modal = new ModalBuilder()
                .setCustomId('player_password_modal')
                .setTitle('🔐 Player Authentication');

            const passwordInput = new TextInputBuilder()
                .setCustomId('player_password')
                .setLabel('Player Password')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your player password...')
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(passwordInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing player password modal:', error);
            await interaction.reply({
                content: '❌ Error displaying authentication modal.',
                ephemeral: true
            });
        }
    }
} 