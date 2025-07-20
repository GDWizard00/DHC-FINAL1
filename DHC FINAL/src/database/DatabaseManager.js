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
            deposits: null
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
                deposits: new Map()
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
            if (!this.connected) {
                // Demo mode - use in-memory storage
                this.memoryStore.gameStates.set(playerId, {
                    ...gameState,
                    playerId,
                    lastSaved: new Date()
                });
                logger.debug(`Game state saved to memory for ${playerId}`);
                return { acknowledged: true, modifiedCount: 1 };
            }

            const result = await this.collections.gameStates.updateOne(
                { playerId },
                { 
                    $set: { 
                        ...gameState, 
                        playerId,
                        lastSaved: new Date() 
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
                }
            }
            this.connected = false;
        } catch (error) {
            logger.error('Failed to close database connection:', error);
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