import { logger } from './logger.js';
import { auditLogger } from './auditLogger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import crypto from 'crypto';

/**
 * AuthenticationManager - Unified authentication system for Bot Dev > Admin > Player hierarchy
 * Handles all authentication types and permission management across the bot
 */
export class AuthenticationManager {
    // Bot Developer configuration
    static BOT_DEVELOPER_ID = '292854498299346945'; // gdwizard's Discord ID
    static SESSION_DURATION = 60 * 60 * 1000; // 1 hour for sessions
    
    // Active sessions for all user types
    static activeSessions = new Map(); // userId -> { expires, authenticated, profileType, permissions, lastAuthenticated }
    
    // Permission hierarchy levels
    static PERMISSION_LEVELS = {
        BOT_DEVELOPER: 4,
        ADMIN: 3,
        CERTIFIED_USER: 2,
        REGULAR_USER: 1,
        NO_PROFILE: 0
    };

    /**
     * Initialize authentication system
     */
    static initialize() {
        try {
            // Start session cleanup interval
            setInterval(() => {
                this.cleanupExpiredSessions();
            }, 10 * 60 * 1000); // Every 10 minutes

            logger.info('AuthenticationManager initialized with unified hierarchy system');
        } catch (error) {
            logger.error('Error initializing AuthenticationManager:', error);
        }
    }

    /**
     * Get user's profile information and determine their access level
     */
    static async getUserProfileInfo(userId) {
        try {
            // Check if Bot Developer
            if (userId === this.BOT_DEVELOPER_ID) {
                return {
                    hasProfile: true,
                    profileType: 'bot_developer',
                    permissionLevel: this.PERMISSION_LEVELS.BOT_DEVELOPER,
                    profile: await this.getMasterProfile()
                };
            }

            // Check for admin profile
            const adminProfile = await this.getAdminProfile(userId);
            if (adminProfile) {
                return {
                    hasProfile: true,
                    profileType: 'admin',
                    permissionLevel: this.PERMISSION_LEVELS.ADMIN,
                    profile: adminProfile
                };
            }

            // Check for user profile
            const userProfile = await this.getUserProfile(userId);
            if (userProfile) {
                const isCertified = userProfile.profileType === 'certified_user';
                return {
                    hasProfile: true,
                    profileType: isCertified ? 'certified_user' : 'regular_user',
                    permissionLevel: isCertified ? this.PERMISSION_LEVELS.CERTIFIED_USER : this.PERMISSION_LEVELS.REGULAR_USER,
                    profile: userProfile
                };
            }

            // No profile found
            return {
                hasProfile: false,
                profileType: null,
                permissionLevel: this.PERMISSION_LEVELS.NO_PROFILE,
                profile: null
            };

        } catch (error) {
            logger.error('Error getting user profile info:', error);
            return {
                hasProfile: false,
                profileType: null,
                permissionLevel: this.PERMISSION_LEVELS.NO_PROFILE,
                profile: null
            };
        }
    }

    /**
     * Check if user is authenticated with current session
     */
    static isAuthenticated(userId) {
        const session = this.activeSessions.get(userId);
        if (!session) return false;

        const now = Date.now();

        // Check if session has expired
        if (now > session.expires) {
            this.activeSessions.delete(userId);
            return false;
        }

        // Check if authenticated within last 12 hours (auto-login period)
        const twelveHours = 12 * 60 * 60 * 1000;
        if (session.lastAuthenticated && (now - session.lastAuthenticated) < twelveHours) {
            return true;
        }

        return session.authenticated || false;
    }

    /**
     * Check if user needs password authentication
     */
    static needsPasswordAuth(userId) {
        const session = this.activeSessions.get(userId);
        if (!session) return true;

        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;

        // Check if last authentication was within 12 hours
        if (session.lastAuthenticated && (now - session.lastAuthenticated) < twelveHours) {
            return false;
        }

        return true;
    }

    /**
     * Authenticate user with password
     */
    static async authenticateUser(userId, password) {
        try {
            const profileInfo = await this.getUserProfileInfo(userId);
            if (!profileInfo.hasProfile) return false;

            const profile = profileInfo.profile;
            if (!profile || !profile.passwordHash) {
                logger.warn(`Profile found but no password hash for user ${userId} (${profileInfo.profileType})`);
                return false;
            }

            const hashedInputPassword = crypto.createHash('sha256').update(password).digest('hex');

            if (hashedInputPassword === profile.passwordHash) {
                // Create session
                const now = Date.now();
                this.activeSessions.set(userId, {
                    expires: now + this.SESSION_DURATION,
                    authenticated: true,
                    lastAuthenticated: now,
                    profileType: profileInfo.profileType,
                    permissionLevel: profileInfo.permissionLevel,
                    permissions: this.getPermissionsForLevel(profileInfo.permissionLevel)
                });

                // Update last login in database
                await this.updateLastLogin(userId, profileInfo.profileType);

                logger.info(`Authentication successful for ${profile.username || 'Unknown'} (${profileInfo.profileType})`);
                
                auditLogger.log('USER_AUTH', `User ${profile.username || userId} authenticated`, 'auth_success', {
                    userId: userId,
                    profileType: profileInfo.profileType,
                    permissionLevel: profileInfo.permissionLevel,
                    timestamp: new Date()
                });

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
     * Check if user has specific permission
     */
    static hasPermission(userId, permission) {
        const session = this.activeSessions.get(userId);
        if (!session || !this.isAuthenticated(userId)) return false;

        return session.permissions.includes(permission);
    }

    /**
     * Check if user has minimum permission level
     */
    static hasMinimumLevel(userId, requiredLevel) {
        const session = this.activeSessions.get(userId);
        if (!session || !this.isAuthenticated(userId)) return false;

        return session.permissionLevel >= requiredLevel;
    }

    /**
     * Get permissions for a permission level
     */
    static getPermissionsForLevel(level) {
        const permissions = [];

        // Everyone gets basic permissions
        if (level >= this.PERMISSION_LEVELS.REGULAR_USER) {
            permissions.push('game_access', 'profile_management', 'marketplace_access', 'casino_access', 'quest_participation');
        }

        // Certified users get enhanced permissions
        if (level >= this.PERMISSION_LEVELS.CERTIFIED_USER) {
            permissions.push('quest_creation', 'enhanced_marketplace', 'community_features');
        }

        // Admins get server management permissions
        if (level >= this.PERMISSION_LEVELS.ADMIN) {
            permissions.push('server_management', 'user_management', 'economy_management', 'quest_management', 'admin_tools');
        }

        // Bot Developer gets ultimate permissions
        if (level >= this.PERMISSION_LEVELS.BOT_DEVELOPER) {
            permissions.push('master_override', 'system_management', 'cross_server_access', 'emergency_controls', 'developer_tools');
        }

        return permissions;
    }

    /**
     * Get master profile (Bot Developer)
     */
    static async getMasterProfile() {
        try {
            if (!DatabaseManager.connected) return null;

            const collection = DatabaseManager.db.collection('masterProfiles');
            const profile = await collection.findOne({ userId: this.BOT_DEVELOPER_ID });
            return profile;
        } catch (error) {
            logger.error('Error getting master profile:', error);
            return null;
        }
    }

    /**
     * Get admin profile
     */
    static async getAdminProfile(userId) {
        try {
            if (!DatabaseManager.connected) return null;

            const collection = DatabaseManager.db.collection('adminProfiles');
            const profile = await collection.findOne({ 
                $or: [
                    { userId: String(userId) },
                    { userId: parseInt(userId) },
                    { userId: userId }
                ]
            });
            return profile;
        } catch (error) {
            logger.error('Error getting admin profile:', error);
            return null;
        }
    }

    /**
     * Get user profile
     */
    static async getUserProfile(userId) {
        try {
            if (!DatabaseManager.connected) return null;

            const collection = DatabaseManager.db.collection('userProfiles');
            const profile = await collection.findOne({ 
                $or: [
                    { userId: String(userId) },
                    { userId: parseInt(userId) },
                    { userId: userId }
                ]
            });
            return profile;
        } catch (error) {
            logger.error('Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Update last login timestamp
     */
    static async updateLastLogin(userId, profileType) {
        try {
            if (!DatabaseManager.connected) return;

            let collection;
            switch (profileType) {
                case 'bot_developer':
                    collection = DatabaseManager.db.collection('masterProfiles');
                    break;
                case 'admin':
                    collection = DatabaseManager.db.collection('adminProfiles');
                    break;
                default:
                    collection = DatabaseManager.db.collection('userProfiles');
                    break;
            }

            await collection.updateOne(
                { userId: userId },
                { $set: { lastLogin: new Date() } }
            );
        } catch (error) {
            logger.error('Error updating last login:', error);
        }
    }

    /**
     * Logout user
     */
    static logout(userId) {
        this.activeSessions.delete(userId);
        logger.info(`User ${userId} logged out`);
    }

    /**
     * Clean up expired sessions
     */
    static cleanupExpiredSessions() {
        try {
            const now = Date.now();
            const expiredSessions = [];

            for (const [userId, session] of this.activeSessions.entries()) {
                if (now > session.expires) {
                    expiredSessions.push(userId);
                }
            }

            expiredSessions.forEach(userId => {
                this.activeSessions.delete(userId);
            });

            if (expiredSessions.length > 0) {
                logger.info(`Cleaned up ${expiredSessions.length} expired authentication sessions`);
            }
        } catch (error) {
            logger.error('Error during session cleanup:', error);
        }
    }

    /**
     * Get session information for a user
     */
    static getSessionInfo(userId) {
        const session = this.activeSessions.get(userId);
        if (!session) return null;

        const now = Date.now();
        return {
            isAuthenticated: this.isAuthenticated(userId),
            profileType: session.profileType,
            permissionLevel: session.permissionLevel,
            permissions: session.permissions,
            timeRemaining: Math.max(0, session.expires - now),
            autoLoginRemaining: session.lastAuthenticated ? Math.max(0, (session.lastAuthenticated + (12 * 60 * 60 * 1000)) - now) : 0
        };
    }

    /**
     * Get statistics for monitoring
     */
    static getStats() {
        const sessions = [...this.activeSessions.values()];
        return {
            activeSessions: sessions.length,
            botDeveloperSessions: sessions.filter(s => s.profileType === 'bot_developer').length,
            adminSessions: sessions.filter(s => s.profileType === 'admin').length,
            userSessions: sessions.filter(s => s.profileType === 'regular_user' || s.profileType === 'certified_user').length
        };
    }
}

// Auto-initialize when module is imported
AuthenticationManager.initialize(); 