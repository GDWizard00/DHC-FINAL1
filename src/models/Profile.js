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
        xp = 0,
        rank = 'Bronze',
        createdAt = new Date(),
        updatedAt = new Date()
    } = {}) {
        this.discordId = discordId;
        this.passwordHash = passwordHash;
        this.email = email;
        this.wallets = wallets; // Array of EVM address strings
        this.xp = xp; // Experience points for engagement rewards
        this.rank = rank; // Player rank tier based on XP
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
     * Rank tier definitions and XP requirements
     */
    static RANK_TIERS = {
        'Bronze': { min: 0, max: 999, color: 0xCD7F32 },
        'Silver': { min: 1000, max: 2999, color: 0xC0C0C0 },
        'Gold': { min: 3000, max: 4999, color: 0xFFD700 },
        'Platinum': { min: 5000, max: 7999, color: 0xE5E4E2 },
        'Diamond': { min: 8000, max: 11999, color: 0xB9F2FF },
        'Master': { min: 12000, max: 19999, color: 0x800080 },
        'Grandmaster': { min: 20000, max: Infinity, color: 0xFF1493 }
    };

    /**
     * Calculate rank based on current XP
     */
    calculateRank() {
        for (const [rankName, tier] of Object.entries(Profile.RANK_TIERS)) {
            if (this.xp >= tier.min && this.xp <= tier.max) {
                return rankName;
            }
        }
        return 'Bronze'; // Default fallback
    }

    /**
     * Add XP and update rank if needed
     */
    addXP(amount, reason = 'Unknown') {
        const oldRank = this.rank;
        this.xp += amount;
        this.rank = this.calculateRank();
        this.updatedAt = new Date();

        const rankChanged = oldRank !== this.rank;
        return {
            xpAdded: amount,
            totalXP: this.xp,
            oldRank,
            newRank: this.rank,
            rankChanged,
            reason
        };
    }

    /**
     * Get progress to next rank
     */
    getRankProgress() {
        const currentTier = Profile.RANK_TIERS[this.rank];
        if (!currentTier || currentTier.max === Infinity) {
            return { 
                current: this.xp, 
                needed: Infinity, 
                percentage: 100,
                isMaxRank: true 
            };
        }

        const nextRankName = this.getNextRank();
        const nextTier = Profile.RANK_TIERS[nextRankName];
        
        if (!nextTier) {
            return { 
                current: this.xp, 
                needed: Infinity, 
                percentage: 100,
                isMaxRank: true 
            };
        }

        const progressInTier = this.xp - currentTier.min;
        const tierSize = nextTier.min - currentTier.min;
        const percentage = Math.floor((progressInTier / tierSize) * 100);

        return {
            current: this.xp,
            needed: nextTier.min,
            percentage: Math.min(percentage, 100),
            isMaxRank: false
        };
    }

    /**
     * Get next rank name
     */
    getNextRank() {
        const ranks = Object.keys(Profile.RANK_TIERS);
        const currentIndex = ranks.indexOf(this.rank);
        return currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : this.rank;
    }

    /**
     * Get rank color for embeds
     */
    getRankColor() {
        return Profile.RANK_TIERS[this.rank]?.color || 0xCD7F32;
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
            xp: this.xp,
            rank: this.rank,
            stats: this.stats,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
} 