/**
 * Quest Model for Dungeonites Heroes Challenge
 * Handles daily quests and reward distribution
 */

export class Quest {
    constructor(data = {}) {
        this.id = data.id || '';
        this.type = data.type || 'daily'; // daily, weekly, special
        this.title = data.title || '';
        this.description = data.description || '';
        this.requirements = data.requirements || {};
        this.rewards = data.rewards || {};
        this.isCompleted = data.isCompleted || false;
        this.progress = data.progress || {};
        this.maxProgress = data.maxProgress || {};
        this.expiresAt = data.expiresAt || null;
        this.createdAt = data.createdAt || new Date();
        this.completedAt = data.completedAt || null;
    }

    /**
     * Check if quest is completed
     */
    checkCompletion() {
        if (this.isCompleted) return true;

        // Check if all requirements are met
        for (const [key, required] of Object.entries(this.maxProgress)) {
            const current = this.progress[key] || 0;
            if (current < required) {
                return false;
            }
        }

        this.isCompleted = true;
        this.completedAt = new Date();
        return true;
    }

    /**
     * Update quest progress
     */
    updateProgress(progressKey, amount = 1) {
        if (this.isCompleted) return false;

        this.progress[progressKey] = (this.progress[progressKey] || 0) + amount;
        
        // Check if quest is now completed
        return this.checkCompletion();
    }

    /**
     * Get progress percentage
     */
    getProgressPercentage() {
        if (this.isCompleted) return 100;

        let totalRequired = 0;
        let totalProgress = 0;

        for (const [key, required] of Object.entries(this.maxProgress)) {
            totalRequired += required;
            totalProgress += Math.min(this.progress[key] || 0, required);
        }

        if (totalRequired === 0) return 0;
        return Math.floor((totalProgress / totalRequired) * 100);
    }

    /**
     * Get progress display text
     */
    getProgressText() {
        if (this.isCompleted) return '✅ **COMPLETED**';

        const progressParts = [];
        for (const [key, required] of Object.entries(this.maxProgress)) {
            const current = Math.min(this.progress[key] || 0, required);
            progressParts.push(`${current}/${required}`);
        }

        return progressParts.join(' | ');
    }

    /**
     * Check if quest is expired
     */
    isExpired() {
        if (!this.expiresAt) return false;
        return new Date() > this.expiresAt;
    }

    /**
     * Get reward text for display
     */
    getRewardText() {
        const rewards = [];
        
        if (this.rewards.tokens > 0) {
            rewards.push(`🪙 ${this.rewards.tokens} Tokens`);
        }
        if (this.rewards.dng > 0) {
            rewards.push(`💎 ${this.rewards.dng} $DNG`);
        }
        if (this.rewards.gold > 0) {
            rewards.push(`💰 ${this.rewards.gold} Gold`);
        }
        if (this.rewards.keys > 0) {
            rewards.push(`🗝️ ${this.rewards.keys} Keys`);
        }

        return rewards.join(', ') || 'No rewards';
    }

    /**
     * Convert to JSON for database storage
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            description: this.description,
            requirements: this.requirements,
            rewards: this.rewards,
            isCompleted: this.isCompleted,
            progress: this.progress,
            maxProgress: this.maxProgress,
            expiresAt: this.expiresAt,
            createdAt: this.createdAt,
            completedAt: this.completedAt
        };
    }

    /**
     * Create Quest from JSON data
     */
    static fromJSON(data) {
        return new Quest(data);
    }
}

/**
 * Quest Manager - Handles quest generation and management
 */
export class QuestManager {
    
    /**
     * Generate daily quest for player
     */
    static generateDailyQuest(economyType = 'gold') {
        const questTemplates = [
            {
                id: 'daily_battle',
                title: 'Monster Hunter',
                description: 'Defeat monsters in the dungeon',
                requirements: { battles: 3 },
                maxProgress: { battles: 3 },
                rewards: economyType === 'gold' ? { tokens: 1, gold: 50 } : { dng: 1, gold: 100 }
            },
            {
                id: 'daily_explore',
                title: 'Dungeon Explorer',
                description: 'Explore dungeon floors',
                requirements: { explores: 5 },
                maxProgress: { explores: 5 },
                rewards: economyType === 'gold' ? { tokens: 1, keys: 2 } : { dng: 1, keys: 5 }
            },
            {
                id: 'daily_floor',
                title: 'Floor Conqueror',
                description: 'Defeat a floor boss',
                requirements: { floors: 1 },
                maxProgress: { floors: 1 },
                rewards: economyType === 'gold' ? { tokens: 1, gold: 100 } : { dng: 1, gold: 200 }
            },
            {
                id: 'daily_treasure',
                title: 'Treasure Seeker',
                description: 'Find treasure while exploring',
                requirements: { treasures: 2 },
                maxProgress: { treasures: 2 },
                rewards: economyType === 'gold' ? { tokens: 1, gold: 75 } : { dng: 1, keys: 3 }
            }
        ];

        // Select random quest template
        const template = questTemplates[Math.floor(Math.random() * questTemplates.length)];
        
        // Create quest with expiration (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        return new Quest({
            ...template,
            id: `${template.id}_${Date.now()}`,
            expiresAt,
            progress: {}
        });
    }

    /**
     * Generate weekly quest for player
     */
    static generateWeeklyQuest(economyType = 'gold') {
        const weeklyTemplates = [
            {
                id: 'weekly_progression',
                title: 'Deep Delver',
                description: 'Reach floor 10 or higher',
                requirements: { floor: 10 },
                maxProgress: { floor: 10 },
                rewards: economyType === 'gold' ? { tokens: 5, gold: 500 } : { dng: 5, gold: 1000 }
            },
            {
                id: 'weekly_battles',
                title: 'Battle Master',
                description: 'Win 20 battles this week',
                requirements: { battles: 20 },
                maxProgress: { battles: 20 },
                rewards: economyType === 'gold' ? { tokens: 7, keys: 10 } : { dng: 7, keys: 20 }
            }
        ];

        const template = weeklyTemplates[Math.floor(Math.random() * weeklyTemplates.length)];
        
        // Create quest with expiration (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return new Quest({
            ...template,
            id: `${template.id}_${Date.now()}`,
            type: 'weekly',
            expiresAt,
            progress: {}
        });
    }
} 