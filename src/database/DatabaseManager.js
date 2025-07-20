import { MongoClient } from 'mongodb';
import { logger } from '../utils/logger.js';

/**
 * Database Manager for Dungeonites Heroes Challenge
 * Handles all MongoDB operations for game data persistence
 */
class DatabaseManagerClass {
    constructor() {
        this.client = null;
        this.db = null;
        this.connected = false;
        this.memoryStore = null;
        this.collections = {
            players: null,
            gameStates: null,
            leaderboards: null,
            achievements: null,
            quests: null,
            transactions: null,
            deposits: null,
            serverConfigs: null,
            globalQuests: null,
            masterProfiles: null,
            adminProfiles: null,
            userProfiles: null
        };
    }

    /**
     * Initialize database connection
     */
    async initialize() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            const dbName = process.env.DB_NAME || 'dungeonites_heroes';

            this.client = new MongoClient(mongoUri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            await this.client.connect();
            logger.info('Connected to MongoDB successfully');

            this.db = this.client.db(dbName);
            
            // Initialize collections
            this.collections.players = this.db.collection('players');
            this.collections.gameStates = this.db.collection('gameStates');
            this.collections.leaderboards = this.db.collection('leaderboards');
            this.collections.achievements = this.db.collection('achievements');
            this.collections.quests = this.db.collection('quests');
            this.collections.transactions = this.db.collection('transactions');
            this.collections.deposits = this.db.collection('deposits');
            this.collections.serverConfigs = this.db.collection('serverConfigs');
            this.collections.globalQuests = this.db.collection('globalQuests');
            this.collections.masterProfiles = this.db.collection('masterProfiles');
            this.collections.adminProfiles = this.db.collection('adminProfiles');
            this.collections.userProfiles = this.db.collection('userProfiles');

            // Create indexes for better performance
            await this._createIndexes();
            
            logger.info('Database collections initialized successfully');
            this.connected = true;
            
        } catch (error) {
            logger.warn('MongoDB connection failed - running in demo mode:', error.message);
            logger.info('To enable full functionality, please start MongoDB server');
            
            // Set up in-memory storage for demo mode
            this.connected = false;
            this.memoryStore = {
                players: new Map(),
                gameStates: new Map(),
                leaderboards: new Map(),
                achievements: new Map(),
                quests: new Map(),
                transactions: new Map(),
                deposits: new Map(),
                serverConfigs: new Map(),
                globalQuests: new Map(),
                masterProfiles: new Map(),
                adminProfiles: new Map(),
                userProfiles: new Map()
            };
            
            logger.info('Demo mode initialized - data will not persist between restarts');
        }
    }

    /**
     * Create database indexes for optimal performance
     */
    async _createIndexes() {
        try {
            // Player collection indexes
            await this.collections.players.createIndex({ discordId: 1 }, { unique: true });
            await this.collections.players.createIndex({ 'progress.highestFloor': -1 });
            
            // Game state collection indexes
            await this.collections.gameStates.createIndex({ playerId: 1 });
            await this.collections.gameStates.createIndex({ lastSaved: -1 });
            
            // Leaderboard collection indexes
            await this.collections.leaderboards.createIndex({ category: 1, value: -1 });
            
            // Quest collection indexes
            await this.collections.quests.createIndex({ playerId: 1 });
            await this.collections.quests.createIndex({ expiresAt: 1 });
            
            // Transaction collection indexes
            await this.collections.transactions.createIndex({ userId: 1, timestamp: -1 });
            await this.collections.transactions.createIndex({ txHash: 1 }, { unique: true });
            
            // Deposit collection indexes
            await this.collections.deposits.createIndex({ fromAddress: 1, timestamp: -1 });
            await this.collections.deposits.createIndex({ processed: 1 });
            
            // Server config indexes
            await this.collections.serverConfigs.createIndex({ serverId: 1 }, { unique: true });
            
            // Global quest indexes
            await this.collections.globalQuests.createIndex({ questId: 1 }, { unique: true });
            await this.collections.globalQuests.createIndex({ 'quests.questId': 1 });

            // Master profile indexes
            await this.collections.masterProfiles.createIndex({ userId: 1 }, { unique: true });
            
            // Admin profile indexes
            await this.collections.adminProfiles.createIndex({ userId: 1 }, { unique: true });

            // User profile indexes
            await this.collections.userProfiles.createIndex({ userId: 1 }, { unique: true });
            
            logger.info('Database indexes created successfully');
        } catch (error) {
            logger.error('Failed to create database indexes:', error);
        }
    }

    /**
     * Save player data
     */
    async savePlayer(discordId, playerData) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                this.memoryStore.players.set(discordId, {
                    ...playerData,
                    discordId,
                    lastUpdated: new Date()
                });
                logger.debug(`Player data saved to memory for ${discordId}`);
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.players.updateOne(
                { discordId },
                { 
                    $set: { 
                        ...playerData, 
                        lastUpdated: new Date() 
                    } 
                },
                { upsert: true }
            );
            
            logger.debug(`Player data saved for ${discordId}`, { result });
            return result;
        } catch (error) {
            logger.error(`Failed to save player data for ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Load player data
     */
    async loadPlayer(discordId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const player = this.memoryStore.players.get(discordId) || null;
                logger.debug(`Player data loaded from memory for ${discordId}`, { found: !!player });
                return player;
            }

            const player = await this.collections.players.findOne({ discordId });
            logger.debug(`Player data loaded for ${discordId}`, { found: !!player });
            return player;
        } catch (error) {
            logger.error(`Failed to load player data for ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Get player data (alias for loadPlayer)
     */
    async getPlayer(discordId) {
        return await this.loadPlayer(discordId);
    }

    /**
     * Update player economy
     */
    async updatePlayerEconomy(discordId, economyData) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const player = this.memoryStore.players.get(discordId) || {};
                player.economy = economyData;
                player.lastUpdated = new Date();
                this.memoryStore.players.set(discordId, player);
                logger.debug(`Player economy updated in memory for ${discordId}`);
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.players.updateOne(
                { discordId },
                { 
                    $set: { 
                        economy: economyData,
                        lastUpdated: new Date() 
                    } 
                },
                { upsert: true }
            );
            
            logger.debug(`Player economy updated for ${discordId}`, { result });
            return result;
        } catch (error) {
            logger.error(`Failed to update player economy for ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Save game state
     */
    async saveGameState(playerId, gameState) {
        try {
            // Ensure session.lastSaved is set
            if (!gameState.session) {
                gameState.session = {};
            }
            gameState.session.lastSaved = new Date();
            
            if (!this.connected) {
                // Demo mode - use in-memory storage
                this.memoryStore.gameStates.set(playerId, {
                    ...gameState,
                    playerId
                });
                logger.debug(`Game state saved to memory for ${playerId}`);
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.gameStates.updateOne(
                { playerId },
                { 
                    $set: { 
                        ...gameState, 
                        playerId
                    } 
                },
                { upsert: true }
            );
            
            logger.debug(`Game state saved for ${playerId}`, { result });
            return result;
        } catch (error) {
            logger.error(`Failed to save game state for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Load game state
     */
    async loadGameState(playerId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const gameState = this.memoryStore.gameStates.get(playerId) || null;
                logger.debug(`Game state loaded from memory for ${playerId}`, { found: !!gameState });
                return gameState;
            }

            const gameState = await this.collections.gameStates.findOne({ playerId });
            logger.debug(`Game state loaded for ${playerId}`, { found: !!gameState });
            return gameState;
        } catch (error) {
            logger.error(`Failed to load game state for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get game state (alias for loadGameState)
     */
    async getGameState(playerId) {
        return await this.loadGameState(playerId);
    }

    /**
     * Update leaderboard
     */
    async updateLeaderboard(playerId, category, value, playerName) {
        try {
            const result = await this.collections.leaderboards.updateOne(
                { playerId, category },
                { 
                    $set: { 
                        playerId,
                        category,
                        value,
                        playerName,
                        lastUpdated: new Date()
                    } 
                },
                { upsert: true }
            );
            
            logger.debug(`Leaderboard updated for ${playerId}`, { category, value });
            return result;
        } catch (error) {
            logger.error(`Failed to update leaderboard for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get leaderboard data
     */
    async getLeaderboard(limit = 20) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const players = Array.from(this.memoryStore.players.values())
                    .filter(player => player.progress && player.progress.highestFloorReached > 0)
                    .sort((a, b) => (b.progress.highestFloorReached || 0) - (a.progress.highestFloorReached || 0))
                    .slice(0, limit);
                
                logger.debug(`Leaderboard loaded from memory`, { count: players.length });
                return players;
            }

            const players = await this.collections.players.find({
                'progress.highestFloorReached': { $gt: 0 }
            })
            .sort({ 'progress.highestFloorReached': -1 })
            .limit(limit)
            .toArray();
            
            logger.debug(`Leaderboard loaded`, { count: players.length });
            return players;
        } catch (error) {
            logger.error('Failed to load leaderboard:', error);
            throw error;
        }
    }

    /**
     * Update player currency
     */
    async updatePlayerCurrency(discordId, currencyType, amount) {
        try {
            const updateField = `currency.${currencyType}`;
            const result = await this.collections.players.updateOne(
                { discordId },
                { 
                    $inc: { [updateField]: amount },
                    $set: { lastUpdated: new Date() }
                }
            );
            
            logger.debug(`Currency updated for ${discordId}`, { currencyType, amount });
            return result;
        } catch (error) {
            logger.error(`Failed to update currency for ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Get player currency
     */
    async getPlayerCurrency(discordId) {
        try {
            const player = await this.collections.players.findOne(
                { discordId },
                { projection: { currency: 1 } }
            );
            
            return player?.currency || {
                gold: 0,
                tokens: 0,
                dng: 0,
                hero: 0,
                eth: 0
            };
        } catch (error) {
            logger.error(`Failed to get currency for ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Get top players for leaderboard
     */
    async getTopPlayers(limit = 10) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const players = Array.from(this.memoryStore.players.values())
                    .sort((a, b) => {
                        // Sort by highest floor reached, then by monsters defeated
                        const floorDiff = (b.highestFloorReached || 0) - (a.highestFloorReached || 0);
                        if (floorDiff !== 0) return floorDiff;
                        return (b.totalMonstersDefeated || 0) - (a.totalMonstersDefeated || 0);
                    })
                    .slice(0, limit);
                    
                logger.debug(`Top players retrieved from memory`, { count: players.length });
                return players;
            }

            const players = await this.collections.players
                .find({})
                .sort({ 
                    highestFloorReached: -1, 
                    totalMonstersDefeated: -1 
                })
                .limit(limit)
                .toArray();
            
            logger.debug(`Top players retrieved`, { count: players.length });
            return players;
        } catch (error) {
            logger.error('Failed to get top players:', error);
            return [];
        }
    }

    /**
     * Save transaction record
     */
    async saveTransaction(transactionData) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                this.memoryStore.transactions.set(transactionData.txHash, {
                    ...transactionData,
                    timestamp: new Date()
                });
                logger.debug(`Transaction saved to memory: ${transactionData.txHash}`);
                return { acknowledged: true, insertedId: transactionData.txHash };
            }

            const result = await this.collections.transactions.insertOne({
                ...transactionData,
                timestamp: new Date()
            });
            
            logger.debug(`Transaction saved: ${transactionData.txHash}`);
            return result;
        } catch (error) {
            logger.error(`Failed to save transaction:`, error);
            throw error;
        }
    }

    /**
     * Get transaction history for user
     */
    async getTransactionHistory(userId, limit = 50) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const transactions = Array.from(this.memoryStore.transactions.values())
                    .filter(tx => tx.userId === userId)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, limit);
                return transactions;
            }

            const transactions = await this.collections.transactions
                .find({ userId })
                .sort({ timestamp: -1 })
                .limit(limit)
                .toArray();
            
            logger.debug(`Transaction history retrieved for ${userId}`, { count: transactions.length });
            return transactions;
        } catch (error) {
            logger.error(`Failed to get transaction history for ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Save deposit record
     */
    async saveDeposit(depositData) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const depositId = `${depositData.txHash}_${Date.now()}`;
                this.memoryStore.deposits.set(depositId, {
                    ...depositData,
                    timestamp: new Date(),
                    processed: false
                });
                logger.debug(`Deposit saved to memory: ${depositId}`);
                return { acknowledged: true, insertedId: depositId };
            }

            const result = await this.collections.deposits.insertOne({
                ...depositData,
                timestamp: new Date(),
                processed: false
            });
            
            logger.debug(`Deposit saved: ${depositData.txHash}`);
            return result;
        } catch (error) {
            logger.error(`Failed to save deposit:`, error);
            throw error;
        }
    }

    /**
     * Get unprocessed deposits
     */
    async getUnprocessedDeposits(limit = 100) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const deposits = Array.from(this.memoryStore.deposits.values())
                    .filter(deposit => !deposit.processed)
                    .slice(0, limit);
                return deposits;
            }

            const deposits = await this.collections.deposits
                .find({ processed: false })
                .sort({ timestamp: 1 })
                .limit(limit)
                .toArray();
            
            logger.debug(`Unprocessed deposits retrieved`, { count: deposits.length });
            return deposits;
        } catch (error) {
            logger.error('Failed to get unprocessed deposits:', error);
            throw error;
        }
    }

    /**
     * Mark deposit as processed
     */
    async markDepositProcessed(depositId, userId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const deposit = this.memoryStore.deposits.get(depositId);
                if (deposit) {
                    deposit.processed = true;
                    deposit.processedBy = userId;
                    deposit.processedAt = new Date();
                }
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.deposits.updateOne(
                { _id: depositId },
                { 
                    $set: { 
                        processed: true,
                        processedBy: userId,
                        processedAt: new Date()
                    } 
                }
            );
            
            logger.debug(`Deposit marked as processed: ${depositId}`);
            return result;
        } catch (error) {
            logger.error(`Failed to mark deposit as processed:`, error);
            throw error;
        }
    }

    /**
     * Clean up expired quests
     */
    async cleanupExpiredQuests() {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const now = new Date();
                let cleaned = 0;
                
                for (const [playerId, playerData] of this.memoryStore.players.entries()) {
                    if (playerData.quests) {
                        const beforeCount = playerData.quests.length;
                        playerData.quests = playerData.quests.filter(quest => 
                            !quest.expiresAt || new Date(quest.expiresAt) > now
                        );
                        cleaned += beforeCount - playerData.quests.length;
                    }
                }
                
                logger.debug(`Expired quests cleaned up from memory`, { count: cleaned });
                return cleaned;
            }

            // In MongoDB, quests are stored within player documents
            const players = await this.collections.players.find({
                'quests.expiresAt': { $lt: new Date() }
            }).toArray();
            
            let totalCleaned = 0;
            
            for (const player of players) {
                const validQuests = player.quests.filter(quest => 
                    !quest.expiresAt || new Date(quest.expiresAt) > new Date()
                );
                
                const cleanedCount = player.quests.length - validQuests.length;
                totalCleaned += cleanedCount;
                
                if (cleanedCount > 0) {
                    await this.collections.players.updateOne(
                        { _id: player._id },
                        { $set: { quests: validQuests } }
                    );
                }
            }
            
            logger.debug(`Expired quests cleaned up`, { count: totalCleaned });
            return totalCleaned;
        } catch (error) {
            logger.error('Failed to cleanup expired quests:', error);
            return 0;
        }
    }

    /**
     * Quest management methods
     */

    /**
     * Create a new quest for a player
     */
    async createQuest(questData) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const questId = `${questData.playerId}_${questData.questId}_${Date.now()}`;
                this.memoryStore.quests.set(questId, {
                    ...questData,
                    _id: questId,
                    createdAt: new Date()
                });
                logger.debug(`Quest created in memory for player ${questData.playerId}`);
                return { acknowledged: true, insertedId: questId };
            }

            const result = await this.collections.quests.insertOne({
                ...questData,
                createdAt: new Date()
            });
            
            logger.debug(`Quest created for player ${questData.playerId}`, { questId: questData.questId });
            return result;
        } catch (error) {
            logger.error(`Failed to create quest for ${questData.playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get a specific quest for a player
     */
    async getQuest(playerId, questId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                for (const [key, quest] of this.memoryStore.quests.entries()) {
                    if (quest.playerId === playerId && quest.questId === questId) {
                        return quest;
                    }
                }
                return null;
            }

            const quest = await this.collections.quests.findOne({ 
                playerId, 
                questId 
            });
            
            logger.debug(`Quest retrieved for player ${playerId}`, { questId, found: !!quest });
            return quest;
        } catch (error) {
            logger.error(`Failed to get quest for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get all quests for a player
     */
    async getPlayerQuests(playerId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quests = [];
                for (const [key, quest] of this.memoryStore.quests.entries()) {
                    if (quest.playerId === playerId) {
                        quests.push(quest);
                    }
                }
                return quests;
            }

            const quests = await this.collections.quests.find({ playerId }).toArray();
            logger.debug(`Player quests retrieved for ${playerId}`, { count: quests.length });
            return quests;
        } catch (error) {
            logger.error(`Failed to get player quests for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Update quest data
     */
    async updateQuest(playerId, questId, updateData) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                for (const [key, quest] of this.memoryStore.quests.entries()) {
                    if (quest.playerId === playerId && quest.questId === questId) {
                        this.memoryStore.quests.set(key, {
                            ...quest,
                            ...updateData,
                            lastUpdated: new Date()
                        });
                        logger.debug(`Quest updated in memory for player ${playerId}`);
                        return { acknowledged: true, modifiedCount: 1 };
                    }
                }
                return { acknowledged: true, modifiedCount: 0 };
            }

            const result = await this.collections.quests.updateOne(
                { playerId, questId },
                { 
                    $set: { 
                        ...updateData,
                        lastUpdated: new Date() 
                    } 
                }
            );
            
            logger.debug(`Quest updated for player ${playerId}`, { questId, result });
            return result;
        } catch (error) {
            logger.error(`Failed to update quest for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Update quest progress
     */
    async updateQuestProgress(playerId, questId, progress, completed = false) {
        try {
            const updateData = { 
                progress,
                completed,
                lastUpdated: new Date()
            };

            if (completed) {
                updateData.completedAt = new Date();
            }

            return await this.updateQuest(playerId, questId, updateData);
        } catch (error) {
            logger.error(`Failed to update quest progress for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get completed quests for a player
     */
    async getCompletedQuests(playerId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quests = [];
                for (const [key, quest] of this.memoryStore.quests.entries()) {
                    if (quest.playerId === playerId && quest.completed) {
                        quests.push(quest);
                    }
                }
                return quests;
            }

            const quests = await this.collections.quests.find({ 
                playerId, 
                completed: true 
            }).toArray();
            
            logger.debug(`Completed quests retrieved for ${playerId}`, { count: quests.length });
            return quests;
        } catch (error) {
            logger.error(`Failed to get completed quests for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Remove all quests for a player (for reset)
     */
    async removePlayerQuests(playerId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const keysToDelete = [];
                for (const [key, quest] of this.memoryStore.quests.entries()) {
                    if (quest.playerId === playerId) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => this.memoryStore.quests.delete(key));
                logger.debug(`Player quests removed from memory for ${playerId}`);
                return { acknowledged: true, deletedCount: keysToDelete.length };
            }

            const result = await this.collections.quests.deleteMany({ playerId });
            logger.debug(`Player quests removed for ${playerId}`, { result });
            return result;
        } catch (error) {
            logger.error(`Failed to remove player quests for ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Server configuration methods
     */

    /**
     * Save a server configuration
     */
    async saveServerConfig(key, value) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                this.memoryStore.serverConfigs.set(key, value);
                logger.debug(`Server config saved to memory: ${key}`);
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.serverConfigs.updateOne(
                { serverId: key },
                { $set: { value: value } },
                { upsert: true }
            );
            
            logger.debug(`Server config saved: ${key}`);
            return result;
        } catch (error) {
            logger.error(`Failed to save server config: ${key}`, error);
            throw error;
        }
    }

    /**
     * Get a server configuration
     */
    async getServerConfig(key) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const config = this.memoryStore.serverConfigs.get(key);
                logger.debug(`Server config loaded from memory: ${key}`, { found: !!config });
                return config;
            }

            const config = await this.collections.serverConfigs.findOne({ serverId: key });
            logger.debug(`Server config loaded: ${key}`, { found: !!config });
            return config?.value;
        } catch (error) {
            logger.error(`Failed to get server config: ${key}`, error);
            throw error;
        }
    }

    /**
     * Global Quest management methods
     */

    /**
     * Create a new global quest
     */
    async createGlobalQuest(questData) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                this.memoryStore.globalQuests.set(questData.id, {
                    ...questData,
                    createdAt: new Date()
                });
                logger.debug(`Global quest created in memory: ${questData.id}`);
                return { acknowledged: true, insertedId: questData.id };
            }

            const result = await this.collections.globalQuests.insertOne({
                ...questData,
                createdAt: new Date()
            });
            
            logger.debug(`Global quest created: ${questData.id}`, { questId: questData.id });
            return result;
        } catch (error) {
            logger.error(`Failed to create global quest: ${questData.id}`, error);
            throw error;
        }
    }

    /**
     * Get all active global quests
     */
    async getActiveGlobalQuests() {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quests = [];
                const now = new Date();
                for (const [id, quest] of this.memoryStore.globalQuests.entries()) {
                    if (quest.status === 'active' && new Date(quest.expiresAt) > now) {
                        quests.push(quest);
                    }
                }
                return quests;
            }

            const quests = await this.collections.globalQuests.find({ 
                status: 'active',
                expiresAt: { $gt: new Date() }
            }).toArray();
            
            logger.debug(`Active global quests retrieved`, { count: quests.length });
            return quests;
        } catch (error) {
            logger.error('Failed to get active global quests:', error);
            throw error;
        }
    }

    /**
     * Get global quests by server
     */
    async getServerGlobalQuests(serverId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quests = [];
                for (const [id, quest] of this.memoryStore.globalQuests.entries()) {
                    if (quest.serverId === serverId || quest.type === 'cross_server') {
                        quests.push(quest);
                    }
                }
                return quests;
            }

            const quests = await this.collections.globalQuests.find({ 
                $or: [
                    { serverId: serverId },
                    { type: 'cross_server' }
                ]
            }).toArray();
            
            logger.debug(`Server global quests retrieved for ${serverId}`, { count: quests.length });
            return quests;
        } catch (error) {
            logger.error(`Failed to get server global quests for ${serverId}:`, error);
            throw error;
        }
    }

    /**
     * Update global quest status
     */
    async updateGlobalQuestStatus(questId, status, updateData = {}) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quest = this.memoryStore.globalQuests.get(questId);
                if (quest) {
                    quest.status = status;
                    Object.assign(quest, updateData);
                    quest.lastUpdated = new Date();
                }
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.globalQuests.updateOne(
                { id: questId },
                { 
                    $set: { 
                        status: status,
                        ...updateData,
                        lastUpdated: new Date()
                    } 
                }
            );
            
            logger.debug(`Global quest status updated: ${questId}`, { status });
            return result;
        } catch (error) {
            logger.error(`Failed to update global quest status: ${questId}`, error);
            throw error;
        }
    }

    /**
     * Add participant to global quest
     */
    async addQuestParticipant(questId, userId, participantData = {}) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quest = this.memoryStore.globalQuests.get(questId);
                if (quest) {
                    if (!quest.participants) quest.participants = [];
                    const existingIndex = quest.participants.findIndex(p => p.userId === userId);
                    if (existingIndex >= 0) {
                        quest.participants[existingIndex] = { userId, ...participantData, joinedAt: new Date() };
                    } else {
                        quest.participants.push({ userId, ...participantData, joinedAt: new Date() });
                    }
                }
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.globalQuests.updateOne(
                { id: questId },
                { 
                    $addToSet: { 
                        participants: { 
                            userId, 
                            ...participantData, 
                            joinedAt: new Date() 
                        } 
                    } 
                }
            );
            
            logger.debug(`Participant added to global quest: ${questId}`, { userId });
            return result;
        } catch (error) {
            logger.error(`Failed to add participant to global quest: ${questId}`, error);
            throw error;
        }
    }

    /**
     * Update quest participant progress
     */
    async updateQuestParticipantProgress(questId, userId, progress, completed = false) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quest = this.memoryStore.globalQuests.get(questId);
                if (quest && quest.participants) {
                    const participant = quest.participants.find(p => p.userId === userId);
                    if (participant) {
                        participant.progress = progress;
                        participant.completed = completed;
                        participant.lastUpdated = new Date();
                        if (completed) {
                            participant.completedAt = new Date();
                        }
                    }
                }
                return { acknowledged: true, modifiedCount: 1 };
            }

            const updateData = {
                'participants.$.progress': progress,
                'participants.$.completed': completed,
                'participants.$.lastUpdated': new Date()
            };

            if (completed) {
                updateData['participants.$.completedAt'] = new Date();
            }

            const result = await this.collections.globalQuests.updateOne(
                { id: questId, 'participants.userId': userId },
                { $set: updateData }
            );
            
            logger.debug(`Quest participant progress updated: ${questId}`, { userId, progress, completed });
            return result;
        } catch (error) {
            logger.error(`Failed to update quest participant progress: ${questId}`, error);
            throw error;
        }
    }

    /**
     * Get quest by ID
     */
    async getGlobalQuest(questId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                const quest = this.memoryStore.globalQuests.get(questId);
                logger.debug(`Global quest loaded from memory: ${questId}`, { found: !!quest });
                return quest;
            }

            const quest = await this.collections.globalQuests.findOne({ id: questId });
            logger.debug(`Global quest loaded: ${questId}`, { found: !!quest });
            return quest;
        } catch (error) {
            logger.error(`Failed to get global quest: ${questId}`, error);
            throw error;
        }
    }

    /**
     * Get quest by ID (alias for getGlobalQuest)
     */
    async getQuestById(questId) {
        return await this.getGlobalQuest(questId);
    }

    /**
     * Get all quests for a server
     */
    async getServerQuests(serverId) {
        try {
            if (!this.connected) {
                return Array.from(this.memoryStore.globalQuests.values()).filter(quest => quest.serverId === serverId);
            }

            const quests = await this.collections.globalQuests.find({ serverId }).toArray();
            logger.debug(`Server quests retrieved for ${serverId}`, { count: quests.length });
            return quests;
        } catch (error) {
            logger.error(`Failed to get server quests for ${serverId}:`, error);
            throw error;
        }
    }

    /**
     * Update a quest
     */
    async updateQuest(questId, updateData) {
        try {
            if (!this.connected) {
                const quest = this.memoryStore.globalQuests.get(questId);
                if (quest) {
                    Object.assign(quest, updateData);
                    quest.lastUpdated = new Date();
                    return quest;
                }
                return null;
            }

            const result = await this.collections.globalQuests.updateOne(
                { id: questId },
                { $set: { ...updateData, lastUpdated: new Date() } }
            );
            logger.debug(`Quest updated: ${questId}`, { modified: result.modifiedCount });
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error(`Failed to update quest ${questId}:`, error);
            throw error;
        }
    }

    /**
     * Update player achievements
     */
    async updatePlayerAchievements(discordId, achievements) {
        try {
            const updateData = {
                achievements: achievements,
                lastUpdated: new Date()
            };

            const result = await this.collections.players.updateOne(
                { discordId },
                { $set: updateData },
                { upsert: true }
            );

            logger.info(`Updated achievements for player ${discordId}`);
            return result;

        } catch (error) {
            logger.error('Error updating player achievements:', error);
            throw error;
        }
    }

    /**
     * Update player stats
     */
    async updatePlayerStats(discordId, stats) {
        try {
            const updateData = {
                stats: stats,
                lastUpdated: new Date()
            };

            const result = await this.collections.players.updateOne(
                { discordId },
                { $set: updateData },
                { upsert: true }
            );

            logger.info(`Updated stats for player ${discordId}`);
            return result;

        } catch (error) {
            logger.error('Error updating player stats:', error);
            throw error;
        }
    }

    /**
     * Get player achievements
     */
    async getPlayerAchievements(discordId) {
        try {
            const player = await this.collections.players.findOne({ discordId });
            return player?.achievements || {};

        } catch (error) {
            logger.error('Error getting player achievements:', error);
            throw error;
        }
    }

    /**
     * Get player stats
     */
    async getPlayerStats(discordId) {
        try {
            const player = await this.collections.players.findOne({ discordId });
            return player?.stats || {};

        } catch (error) {
            logger.error('Error getting player stats:', error);
            throw error;
        }
    }

    /**
     * Get master profile (Bot Developer)
     */
    async getMasterProfile(userId) {
        try {
            if (!this.connected) return null;
            
            const result = await this.collections.masterProfiles.findOne({ userId: userId });
            return result;
        } catch (error) {
            logger.error('Error getting master profile:', error);
            return null;
        }
    }

    /**
     * Save master profile (Bot Developer)
     */
    async saveMasterProfile(profile) {
        try {
            if (!this.connected) return false;
            
            const result = await this.collections.masterProfiles.replaceOne(
                { userId: profile.userId },
                profile,
                { upsert: true }
            );
            
            return result.acknowledged;
        } catch (error) {
            logger.error('Error saving master profile:', error);
            throw error;
        }
    }

    /**
     * Update master profile login history
     */
    async updateMasterLoginHistory(userId, loginData) {
        try {
            if (!this.connected) return false;
            
            const result = await this.collections.masterProfiles.updateOne(
                { userId: userId },
                { 
                    $set: { lastLogin: loginData.timestamp },
                    $push: { loginHistory: loginData }
                }
            );
            
            return result.acknowledged;
        } catch (error) {
            logger.error('Error updating master login history:', error);
            return false;
        }
    }

    /**
     * Get all servers where bot is present (for master oversight)
     */
    async getMasterServersList() {
        try {
            if (!this.connected) return [];
            
            const servers = await this.collections.serverConfigs.find({}).toArray();
            return servers.map(server => ({
                serverId: server.serverId,
                serverName: server.serverName || 'Unknown',
                adminId: server.adminId,
                memberCount: server.memberCount || 0,
                createdAt: server.createdAt,
                lastActive: server.lastActive
            }));
        } catch (error) {
            logger.error('Error getting master servers list:', error);
            return [];
        }
    }

    /**
     * Close database connection
     */
    async close() {
        try {
            if (this.connected && this.client) {
                await this.client.close();
                logger.info('Database connection closed successfully');
            } else if (!this.connected) {
                logger.info('Demo mode - clearing memory store');
                if (this.memoryStore) {
                    this.memoryStore.players.clear();
                    this.memoryStore.gameStates.clear();
                    this.memoryStore.leaderboards.clear();
                    this.memoryStore.achievements.clear();
                    this.memoryStore.quests.clear();
                    this.memoryStore.transactions.clear();
                    this.memoryStore.deposits.clear();
                    this.memoryStore.serverConfigs.clear();
                    this.memoryStore.globalQuests.clear();
                    this.memoryStore.masterProfiles.clear();
                    this.memoryStore.adminProfiles.clear();
                    this.memoryStore.userProfiles.clear();
                }
            }
            this.connected = false;
        } catch (error) {
            logger.error('Failed to close database connection:', error);
        }
    }

    /**
     * Delete master profile (for testing/reset purposes)
     */
    async deleteMasterProfile(userId) {
        try {
            if (!this.connected) {
                // Demo mode - use in-memory storage
                if (this.memoryStore.masterProfiles && this.memoryStore.masterProfiles.has(userId)) {
                    this.memoryStore.masterProfiles.delete(userId);
                    logger.debug(`Master profile deleted from memory for ${userId}`);
                }
                return { acknowledged: true, deletedCount: 1 };
            }

            const result = await this.collections.masterProfiles.deleteOne({ userId });
            logger.info(`Master profile deleted for user ${userId}`);
            return result;
        } catch (error) {
            logger.error('Error deleting master profile:', error);
            throw error;
        }
    }

    /**
     * Health check for database connection
     */
    async healthCheck() {
        try {
            await this.db.admin().ping();
            return true;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }
}

export const DatabaseManager = new DatabaseManagerClass(); 