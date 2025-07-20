import { Client, GatewayIntentBits, Collection, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
import { DatabaseManager } from './src/database/DatabaseManager.js';
import { initializeServices } from './src/utils/serviceRegistry.js';
import { CommandHandler } from './src/commands/CommandHandler.js';
import { AdminHandler } from './src/handlers/admin/AdminHandler.js';
import { BotDeveloperHandler } from './src/handlers/admin/BotDeveloperHandler.js';
import { logger } from './src/utils/logger.js';
import { slashCommands } from './src/commands/slash/index.js';
import { data as setupCommandData, execute as setupCommandExecute } from './src/commands/slash/setuphero.js';
import { PersistentEmbedManager } from './src/utils/persistentEmbedManager.js';
import { AuthenticationManager } from './src/utils/authenticationManager.js';
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

// Make client globally accessible for PersistentEmbedManager
global.client = client;

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
        // Initialize unified authentication system
        AuthenticationManager.initialize();
        // Initialize persistent embed management system
        PersistentEmbedManager.initialize();
        // Initialize admin system
        await AdminHandler.initialize();
        // Initialize Bot Developer system
        await BotDeveloperHandler.initialize();
        // Initialize thread management system
        const { ThreadManager } = await import('./src/utils/ThreadManager.js');
        ThreadManager.initialize();
        logger.info('Database connection established successfully');

        // Login to Discord unless running in test mode (no token provided)
        if (!isTestMode) {
        await client.login(process.env.DISCORD_TOKEN);
        logger.info('Discord client logged in successfully');

            // Register all slash commands
            logger.info(`Loading slash commands from index: ${slashCommands.length} commands found`);
            slashCommands.forEach(cmd => logger.info(`- ${cmd.data.name}: ${cmd.data.description}`));
            
            // Also test direct import of setup command
            logger.info(`Direct setup command import: ${setupCommandData.name}`);
            
            const commandData = slashCommands.map(command => command.data);
            
            // Register commands per-guild for instant availability (vs global which takes 1+ hours)
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.commands.set(commandData);
                    logger.info(`Slash commands registered for guild: ${guild.name} (${commandData.length} commands)`);
                } catch (error) {
                    logger.error(`Failed to register commands for guild ${guild.name}:`, error);
                }
            }
            
            // Also clear global commands to avoid conflicts
            await client.application.commands.set([]);
            logger.info('Global commands cleared - using guild-specific registration for instant availability');
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

// Auto-register commands when joining new guilds
client.on('guildCreate', async (guild) => {
    try {
        const commandData = slashCommands.map(command => command.data);
        await guild.commands.set(commandData);
        logger.info(`Slash commands registered for new guild: ${guild.name} (${commandData.length} commands)`);
    } catch (error) {
        logger.error(`Failed to register commands for new guild ${guild.name}:`, error);
    }
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

// Handle different interaction types
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isStringSelectMenu() || interaction.isButton()) {
            await CommandHandler.handleInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            // Special handling for user password authentication modals
            if (interaction.customId.startsWith('user_password_auth_')) {
                try {
                    const source = interaction.customId.replace('user_password_auth_', '');
                    const { UserProfileHandler } = await import('./src/handlers/user/UserProfileHandler.js');
                    const authenticated = await UserProfileHandler.handlePasswordAuth(interaction, source);
                    
                    if (authenticated) {
                        if (source === 'smart_login') {
                            // Authentication successful for smart login
                            logger.info(`Smart login authentication successful for ${interaction.user.username}`);
                        } else if (source === 'casino') {
                            // Authentication successful for casino - start coinflip
                            logger.info(`Casino authentication successful for ${interaction.user.username}, starting coinflip`);
                            try {
                                const { MarketplaceHandler } = await import('./src/handlers/marketplace/MarketplaceHandler.js');
                                await MarketplaceHandler.handleCoinflipStart(interaction);
                            } catch (coinflipError) {
                                logger.error('Error starting coinflip after casino auth:', coinflipError);
                            }
                        }
                    }
                } catch (error) {
                    logger.error('Error handling user password auth modal:', error);
                    try {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '❌ Authentication error. Please try again.',
                                ephemeral: true
                            });
                        }
                    } catch (replyError) {
                        logger.error('Could not send auth error response:', replyError);
                    }
                }
            } else {
                // Regular modal submission handler
                await CommandHandler.handleModalSubmission(interaction);
            }
        } else if (interaction.isCommand()) {
            // Handle slash commands by importing and executing the appropriate command
            try {
                const commandName = interaction.commandName;
                logger.info(`Slash command executed: ${commandName} by ${interaction.user.username}`);
                
                // Import the command dynamically and execute it
                const commandModule = await import(`./src/commands/slash/${commandName}.js`);
                if (commandModule.execute) {
                    await commandModule.execute(interaction);
                } else {
                    logger.error(`Command ${commandName} does not have an execute function`);
                    await interaction.reply({
                        content: '❌ This command is not properly configured.',
                        ephemeral: true
                    });
                }
            } catch (importError) {
                logger.error(`Error importing command ${interaction.commandName}:`, importError);
                if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                        content: '❌ Command not found or failed to load.',
                        ephemeral: true
                });
                }
            }
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                if (interaction.isModalSubmit() || interaction.isButton() || interaction.isStringSelectMenu()) {
                    await interaction.reply({
                        content: '⚠️ An error occurred while processing your interaction. Please try again.',
                        ephemeral: true
                    });
                } else if (interaction.isCommand()) {
                await interaction.reply({ 
                        content: '⚠️ An error occurred while processing your command. Please try again.',
                        ephemeral: true
                });
                }
            }
        } catch (replyError) {
            logger.error('Failed to send error reply:', replyError);
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
        // Shutdown thread management system
        try {
            const { ThreadManager } = await import('./src/utils/ThreadManager.js');
            ThreadManager.shutdown();
        } catch (error) {
            logger.error('Error shutting down ThreadManager:', error);
        }

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