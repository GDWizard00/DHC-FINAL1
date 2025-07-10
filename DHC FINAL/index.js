import { Client, GatewayIntentBits, Collection, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
import { DatabaseManager } from './src/database/DatabaseManager.js';
import { initializeServices } from './src/utils/serviceRegistry.js';
import { CommandHandler } from './src/commands/CommandHandler.js';
import { logger } from './src/utils/logger.js';
import { data as profileCommandData, execute as profileCommandExecute } from './src/commands/slash/profile.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

// __dirname polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Determine test mode (e.g., during automated checks or CI)
const isTestMode = !process.env.DISCORD_TOKEN || process.env.TEST_MODE === 'true';

// Initialize collections for backwards compatibility
client.gameSessions = new Collection();
client.userStates = new Collection();

/**
 * Initialize the entire application
 */
async function initialize() {
    try {
        logger.info('Starting Dungeonites Heroes Challenge bot...');

        // Initialize database first
        await DatabaseManager.initialize();
        // Initialize core services (StateService, Web3Manager, etc.)
        await initializeServices();
        logger.info('Database connection established successfully');

        // Login to Discord unless running in test mode (no token provided)
        if (!isTestMode) {
        await client.login(process.env.DISCORD_TOKEN);
        logger.info('Discord client logged in successfully');

            await client.application.commands.set([profileCommandData]);
            logger.info('Slash commands registered successfully');
        } else {
            logger.warn('Running in TEST_MODE - Discord login skipped.');
        }

    } catch (error) {
        logger.error('Initialization failed:', error);
        process.exit(1);
    }
}

client.once('ready', async () => {
    logger.info(`${client.user.tag} is now online and ready!`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);
    logger.info('Dungeonites Heroes Challenge is ready for adventure!');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    try {
        await CommandHandler.handleMessage(message);
    } catch (error) {
        logger.error('Error handling message:', error);
        try {
            if (message.channel) {
                await message.reply({
                    content: '⚠️ An error occurred while processing your command. Please try again.',
                    allowedMentions: { repliedUser: false }
                });
            }
        } catch (replyError) {
            logger.error('Failed to send error reply:', replyError);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'profile') {
                await profileCommandExecute(interaction);
            }
            return;
        }

        if (interaction.isStringSelectMenu()) {
        await CommandHandler.handleInteraction(interaction);
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        try {
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '⚠️ An error occurred. Please try again.', 
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (replyError) {
            logger.error('Failed to send interaction error reply:', replyError);
        }
    }
});

client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

client.on('warn', (warning) => {
    logger.warn('Discord client warning:', warning);
});

client.on('disconnect', () => {
    logger.warn('Discord client disconnected');
});

client.on('reconnecting', () => {
    logger.info('Discord client reconnecting...');
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Starting graceful shutdown...');
    await gracefulShutdown();
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Starting graceful shutdown...');
    await gracefulShutdown();
});

/**
 * Graceful shutdown procedure
 */
async function gracefulShutdown() {
    try {
        logger.info('Disconnecting Discord client...');
        client.destroy();
        logger.info('Discord client disconnected');

        logger.info('Graceful shutdown completed successfully');
        process.exit(0);

    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}

// Start the application
initialize(); 