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
} 