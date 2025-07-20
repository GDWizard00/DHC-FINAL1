import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import crypto from 'crypto';

/**
 * EMERGENCY ProfileDatabase - SQLite-based profile storage
 * Created to fix critical data loss in P2E ecosystem
 * Replaces failing MongoDB connection for profiles
 */
export class ProfileDatabase {
    constructor() {
        this.dbPath = './data/profiles.db';
        this.backupPath = './data/profiles_backup.db';
        this.ensureDataDirectory();
        this.initializeDatabase();
        logger.info('🚨 EMERGENCY ProfileDatabase initialized - MongoDB replacement active');
    }

    /**
     * Ensure data directory exists
     */
    ensureDataDirectory() {
        const dataDir = './data';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            logger.info('Created data directory for profile database');
        }
    }

    /**
     * Initialize database with profile tables
     */
    initializeDatabase() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = FULL');
            this.db.pragma('foreign_keys = ON');

            this.createTables();
            logger.info('Profile database initialized successfully');

        } catch (error) {
            logger.error('Error initializing profile database:', error);
            throw error;
        }
    }

    /**
     * Create all profile tables
     */
    createTables() {
        // Master profiles (Bot Developer)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS master_profiles (
                userId TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                passwordHash TEXT NOT NULL,
                xAccount TEXT,
                evmWallet TEXT,
                email TEXT,
                recoveryMethods TEXT, -- JSON array
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastLogin DATETIME,
                isActive INTEGER DEFAULT 1
            )
        `);

        // Admin profiles (Server Owners)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS admin_profiles (
                userId TEXT NOT NULL,
                serverId TEXT NOT NULL,
                username TEXT NOT NULL,
                passwordHash TEXT NOT NULL,
                xAccount TEXT,
                evmWallet TEXT,
                email TEXT,
                recoveryMethods TEXT, -- JSON array
                permissions TEXT, -- JSON array
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastLogin DATETIME,
                isActive INTEGER DEFAULT 1,
                PRIMARY KEY (userId, serverId)
            )
        `);

        // User profiles (Players)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                userId TEXT NOT NULL,
                serverId TEXT NOT NULL,
                username TEXT NOT NULL,
                passwordHash TEXT,
                profileType TEXT DEFAULT 'user',
                division TEXT DEFAULT 'gold',
                balance INTEGER DEFAULT 0,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                lastLogin DATETIME,
                isActive INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (userId, serverId)
            )
        `);

        logger.info('Profile database tables created successfully');
    }

    /**
     * Get master profile (Bot Developer)
     */
    async getMasterProfile(userId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM master_profiles WHERE userId = ? AND isActive = 1');
            const result = stmt.get(userId);
            return result || null;
        } catch (error) {
            logger.error('Error getting master profile:', error);
            return null;
        }
    }

    /**
     * Save master profile (Bot Developer)
     */
    async saveMasterProfile(profileData) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO master_profiles 
                (userId, username, passwordHash, xAccount, evmWallet, email, recoveryMethods, lastLogin)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            
            const result = stmt.run(
                profileData.userId,
                profileData.username,
                profileData.passwordHash,
                profileData.xAccount || null,
                profileData.evmWallet || null,
                profileData.email || null,
                JSON.stringify(profileData.recoveryMethods || [])
            );
            
            logger.info(`Master profile saved for ${profileData.username} (${profileData.userId})`);
            return result;
        } catch (error) {
            logger.error('Error saving master profile:', error);
            throw error;
        }
    }

    /**
     * Get admin profile
     */
    async getAdminProfile(userId, serverId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM admin_profiles WHERE userId = ? AND serverId = ? AND isActive = 1');
            const result = stmt.get(userId, serverId);
            return result || null;
        } catch (error) {
            logger.error('Error getting admin profile:', error);
            return null;
        }
    }

    /**
     * Save admin profile
     */
    async saveAdminProfile(profileData) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO admin_profiles 
                (userId, serverId, username, passwordHash, xAccount, evmWallet, email, recoveryMethods, permissions, lastLogin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            
            const result = stmt.run(
                profileData.userId,
                profileData.serverId,
                profileData.username,
                profileData.passwordHash,
                profileData.xAccount || null,
                profileData.evmWallet || null,
                profileData.email || null,
                JSON.stringify(profileData.recoveryMethods || []),
                JSON.stringify(profileData.permissions || [])
            );
            
            logger.info(`Admin profile saved for ${profileData.username} (${profileData.userId}) in server ${profileData.serverId}`);
            return result;
        } catch (error) {
            logger.error('Error saving admin profile:', error);
            throw error;
        }
    }

    /**
     * Create emergency master profile for gdwizard
     */
    async createEmergencyMasterProfile(userId, username, password) {
        try {
            const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
            
            const profileData = {
                userId: userId,
                username: username,
                passwordHash: passwordHash,
                recoveryMethods: ['emergency_recovery']
            };
            
            await this.saveMasterProfile(profileData);
            logger.info(`🚨 EMERGENCY master profile created for ${username}`);
            return true;
        } catch (error) {
            logger.error('Error creating emergency master profile:', error);
            throw error;
        }
    }

    /**
     * Verify password
     */
    verifyPassword(storedHash, password) {
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        return hash === storedHash;
    }

    /**
     * Backup database
     */
    backup() {
        try {
            if (fs.existsSync(this.dbPath)) {
                fs.copyFileSync(this.dbPath, this.backupPath);
                logger.info('Profile database backed up successfully');
            }
        } catch (error) {
            logger.error('Error backing up profile database:', error);
        }
    }

    /**
     * Health check
     */
    healthCheck() {
        try {
            const stmt = this.db.prepare('SELECT COUNT(*) as count FROM master_profiles');
            stmt.get();
            return true;
        } catch (error) {
            logger.error('Profile database health check failed:', error);
            return false;
        }
    }
}

// Create singleton instance
export const profileDB = new ProfileDatabase(); 