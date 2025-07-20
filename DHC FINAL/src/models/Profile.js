import crypto from 'crypto';

/**
 * Profile Model representing a player's permanent account outside of transient GameState.
 * Stored via DatabaseManager under the `players` collection.
 */
export class Profile {
    constructor({
        discordId,
        passwordHash = '',
        email = '',
        wallets = [],
        stats = {},
        createdAt = new Date(),
        updatedAt = new Date()
    } = {}) {
        this.discordId = discordId;
        this.passwordHash = passwordHash;
        this.email = email;
        this.wallets = wallets; // Array of EVM address strings
        this.stats = {
            gamesPlayed: 0,
            totalGoldFound: 0,
            totalMonstersDefeated: 0,
            achievements: [],
            ...stats
        };
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Securely hash a clear-text password using Node crypto sha256.
     */
    static hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    /**
     * Validate a clear-text password against stored hash.
     */
    verifyPassword(candidate) {
        return Profile.hashPassword(candidate) === this.passwordHash;
    }

    /**
     * Serialize for DB storage.
     */
    toJSON() {
        return {
            discordId: this.discordId,
            passwordHash: this.passwordHash,
            email: this.email,
            wallets: this.wallets,
            stats: this.stats,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
} 