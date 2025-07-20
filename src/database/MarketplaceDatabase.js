import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * MarketplaceDatabase - Secure database system for marketplace transactions
 * Designed for web3 integration with backup and recovery capabilities
 * Handles player listings, trades, auctions, and transaction history
 */
export class MarketplaceDatabase {
    constructor() {
        this.dbPath = './data/marketplace.db';
        this.backupPath = './data/marketplace_backup.db';
        this.ensureDataDirectory();
        this.initializeDatabase();
        this.setupBackupSystem();
    }

    /**
     * Ensure data directory exists
     */
    ensureDataDirectory() {
        const dataDir = './data';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            logger.info('Created data directory for marketplace database');
        }
    }

    /**
     * Initialize primary database with all required tables
     */
    initializeDatabase() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = FULL');
            this.db.pragma('foreign_keys = ON');

            this.createTables();
            logger.info('Marketplace database initialized successfully');

        } catch (error) {
            logger.error('Error initializing marketplace database:', error);
            throw error;
        }
    }

    /**
     * Create all marketplace tables
     */
    createTables() {
        // Store inventory table (daily rotating items)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS store_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                division TEXT NOT NULL,
                item_type TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                rarity TEXT NOT NULL,
                price INTEGER NOT NULL,
                slot_number INTEGER NOT NULL,
                refresh_date DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(division, slot_number, refresh_date)
            )
        `);

        // Player listings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS player_listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seller_id TEXT NOT NULL,
                seller_username TEXT NOT NULL,
                item_type TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                item_rarity TEXT NOT NULL,
                item_division TEXT NOT NULL,
                price INTEGER NOT NULL,
                currency_type TEXT NOT NULL,
                listing_fee INTEGER NOT NULL,
                status TEXT DEFAULT 'active',
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                sold_at DATETIME NULL,
                buyer_id TEXT NULL,
                buyer_username TEXT NULL
            )
        `);

        // Trade offers table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS trade_offers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                creator_id TEXT NOT NULL,
                creator_username TEXT NOT NULL,
                offered_items TEXT NOT NULL, -- JSON array
                requested_items TEXT NOT NULL, -- JSON array
                sweetener_amount INTEGER DEFAULT 0,
                sweetener_currency TEXT NULL,
                description TEXT NULL,
                status TEXT DEFAULT 'active',
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accepted_by TEXT NULL,
                accepted_at DATETIME NULL,
                rejected_at DATETIME NULL
            )
        `);

        // Auctions table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS auctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seller_id TEXT NOT NULL,
                seller_username TEXT NOT NULL,
                item_type TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                item_rarity TEXT NOT NULL,
                item_division TEXT NOT NULL,
                starting_bid INTEGER NOT NULL,
                current_bid INTEGER NOT NULL,
                currency_type TEXT NOT NULL,
                highest_bidder_id TEXT NULL,
                highest_bidder_username TEXT NULL,
                status TEXT DEFAULT 'active',
                ends_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Auction bids table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS auction_bids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                auction_id INTEGER NOT NULL,
                bidder_id TEXT NOT NULL,
                bidder_username TEXT NOT NULL,
                bid_amount INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (auction_id) REFERENCES auctions (id)
            )
        `);

        // Transaction history table (for web3 integration)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS transaction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_type TEXT NOT NULL, -- 'sale', 'trade', 'auction', 'store_buy', 'store_sell'
                seller_id TEXT NOT NULL,
                buyer_id TEXT NOT NULL,
                item_details TEXT NOT NULL, -- JSON
                currency_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                fee_amount INTEGER NOT NULL,
                external_transaction_id TEXT NULL, -- For web3 integration
                status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                confirmed_at DATETIME NULL,
                blockchain_hash TEXT NULL -- For web3 transactions
            )
        `);

        // Marketplace settings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS marketplace_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Initialize default settings
        this.initializeSettings();
    }

    /**
     * Initialize default marketplace settings
     */
    initializeSettings() {
        const defaultSettings = {
            'max_listings_per_player': '5',
            'listing_duration_hours': '24',
            'listing_fee_percentage': '1',
            'store_sell_percentage': '50',
            'last_store_refresh': new Date().toISOString().split('T')[0]
        };

        const insertSetting = this.db.prepare(`
            INSERT OR IGNORE INTO marketplace_settings (key, value) VALUES (?, ?)
        `);

        for (const [key, value] of Object.entries(defaultSettings)) {
            insertSetting.run(key, value);
        }
    }

    /**
     * Setup backup system
     */
    setupBackupSystem() {
        try {
            // Create backup database
            this.backupDb = new Database(this.backupPath);
            this.backupDb.pragma('journal_mode = WAL');
            
            // Copy schema to backup only if backup is empty
            const tableCount = this.backupDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get().count;
            
            if (tableCount === 0) {
                const schema = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table'").all();
                for (const table of schema) {
                    if (table.sql) {
                        this.backupDb.exec(table.sql);
                    }
                }
            }

            // Setup automatic backup every hour
            setInterval(() => this.performBackup(), 60 * 60 * 1000);
            
            logger.info('Marketplace database backup system initialized');

        } catch (error) {
            logger.error('Error setting up backup system:', error);
        }
    }

    /**
     * Perform database backup
     */
    performBackup() {
        try {
            this.db.backup(this.backupPath);
            logger.info('Marketplace database backup completed');
        } catch (error) {
            logger.error('Error performing database backup:', error);
        }
    }

    /**
     * Get marketplace setting
     */
    getSetting(key) {
        try {
            const stmt = this.db.prepare('SELECT value FROM marketplace_settings WHERE key = ?');
            const result = stmt.get(key);
            return result ? result.value : null;
        } catch (error) {
            logger.error(`Error getting setting ${key}:`, error);
            return null;
        }
    }

    /**
     * Update marketplace setting
     */
    updateSetting(key, value) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO marketplace_settings (key, value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run(key, value);
            return true;
        } catch (error) {
            logger.error(`Error updating setting ${key}:`, error);
            return false;
        }
    }

    /**
     * Close database connections
     */
    close() {
        try {
            if (this.db) {
                this.db.close();
            }
            if (this.backupDb) {
                this.backupDb.close();
            }
            logger.info('Marketplace database connections closed');
        } catch (error) {
            logger.error('Error closing database connections:', error);
        }
    }

    /**
     * Recovery from backup
     */
    async recoverFromBackup() {
        try {
            if (fs.existsSync(this.backupPath)) {
                fs.copyFileSync(this.backupPath, this.dbPath);
                this.initializeDatabase();
                logger.info('Successfully recovered marketplace database from backup');
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Error recovering from backup:', error);
            return false;
        }
    }
}

// Create singleton instance
export const marketplaceDb = new MarketplaceDatabase(); 