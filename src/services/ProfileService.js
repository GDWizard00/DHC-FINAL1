import { DatabaseManager } from '../database/DatabaseManager.js';
import { Profile } from '../models/Profile.js';
import { Web3Manager } from '../utils/Web3Manager.js';
import { logger } from '../utils/logger.js';

/**
 * ProfileService - High-level API for creating, updating and retrieving player profiles.
 */
export class ProfileService {
    /**
     * Fetch profile; returns null if not exists.
     */
    static async getProfile(discordId) {
        const doc = await DatabaseManager.getPlayer(discordId);
        if (!doc) return null;
        return new Profile(doc);
    }

    /**
     * Create new profile – fails if one already exists.
     */
    static async createProfile(discordId, { password, email }) {
        const existing = await this.getProfile(discordId);
        if (existing) {
            throw new Error('Profile already exists.');
        }
        const profile = new Profile({
            discordId,
            passwordHash: Profile.hashPassword(password),
            email: email || ''
        });
        await DatabaseManager.savePlayer(discordId, profile.toJSON());
        return profile;
    }

    /**
     * Update profile fields (password/email)
     */
    static async updateProfile(discordId, { password, email }) {
        const profile = await this.getProfile(discordId);
        if (!profile) throw new Error('Profile not found.');
        if (password) profile.passwordHash = Profile.hashPassword(password);
        if (email !== undefined) profile.email = email;
        profile.updatedAt = new Date();
        await DatabaseManager.savePlayer(discordId, profile.toJSON());
        return profile;
    }

    /**
     * Reset another user password (admin override).
     */
    static async resetPassword(targetDiscordId, newPassword) {
        const profile = await this.getProfile(targetDiscordId);
        if (!profile) throw new Error('Profile not found.');
        profile.passwordHash = Profile.hashPassword(newPassword);
        profile.updatedAt = new Date();
        await DatabaseManager.savePlayer(targetDiscordId, profile.toJSON());
        return true;
    }

    /**
     * Add wallet address (EVM) to profile.
     */
    static async addWallet(discordId, address) {
        address = address.toLowerCase();
        const profile = await this.getProfile(discordId);
        if (!profile) throw new Error('Profile not found.');
        const web3 = new Web3Manager();
        if (!web3.isValidAddress(address)) {
            throw new Error('Invalid EVM address.');
        }
        if (profile.wallets.includes(address)) {
            throw new Error('Wallet already added.');
        }
        profile.wallets.push(address);
        profile.updatedAt = new Date();
        await DatabaseManager.savePlayer(discordId, profile.toJSON());
        return profile.wallets;
    }

    /**
     * Remove wallet address
     */
    static async removeWallet(discordId, address) {
        address = address.toLowerCase();
        const profile = await this.getProfile(discordId);
        if (!profile) throw new Error('Profile not found.');
        profile.wallets = profile.wallets.filter(w => w !== address);
        profile.updatedAt = new Date();
        await DatabaseManager.savePlayer(discordId, profile.toJSON());
        return profile.wallets;
    }

    /**
     * Get wallet overview placeholder
     */
    static async getWalletOverview(discordId) {
        const profile = await this.getProfile(discordId);
        if (!profile) throw new Error('Profile not found.');
        // TODO: WEB3 CONFIG HERE – fetch on-chain balances, NFTs, swap history etc.
        return profile.wallets.map(addr => ({
            address: addr,
            assets: [],
            nfts: []
        }));
    }

    /**
     * Add XP to profile and update rank
     */
    static async addXP(discordId, amount, reason = 'Quest reward') {
        try {
            let profile = await this.getProfile(discordId);
            if (!profile) {
                // Create profile if it doesn't exist
                profile = new Profile({ discordId });
            }

            const result = profile.addXP(amount, reason);
            await DatabaseManager.savePlayer(discordId, profile.toJSON());
            
            logger.info(`Added ${amount} XP to ${discordId}: ${reason} (Total: ${result.totalXP})`);
            
            return result;
        } catch (error) {
            logger.error(`Failed to add XP to ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Update profile stats (games played, monsters defeated, etc.)
     */
    static async updateStats(discordId, statUpdates) {
        try {
            let profile = await this.getProfile(discordId);
            if (!profile) {
                profile = new Profile({ discordId });
            }

            // Update individual stats
            Object.keys(statUpdates).forEach(statName => {
                if (profile.stats.hasOwnProperty(statName)) {
                    profile.stats[statName] += statUpdates[statName];
                }
            });

            profile.updatedAt = new Date();
            await DatabaseManager.savePlayer(discordId, profile.toJSON());
            
            logger.info(`Updated stats for ${discordId}:`, statUpdates);
            return profile;
        } catch (error) {
            logger.error(`Failed to update stats for ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Award achievement and XP
     */
    static async awardAchievement(discordId, achievementId, xpReward = 0) {
        try {
            let profile = await this.getProfile(discordId);
            if (!profile) {
                profile = new Profile({ discordId });
            }

            // Check if achievement already earned
            if (profile.stats.achievements.includes(achievementId)) {
                return { alreadyEarned: true };
            }

            // Add achievement
            profile.stats.achievements.push(achievementId);
            
            // Add XP if specified
            let xpResult = null;
            if (xpReward > 0) {
                xpResult = profile.addXP(xpReward, `Achievement: ${achievementId}`);
            }

            await DatabaseManager.savePlayer(discordId, profile.toJSON());
            
            logger.info(`Awarded achievement ${achievementId} to ${discordId} with ${xpReward} XP`);
            
            return {
                alreadyEarned: false,
                achievementId,
                xpReward,
                xpResult
            };
        } catch (error) {
            logger.error(`Failed to award achievement to ${discordId}:`, error);
            throw error;
        }
    }
} 