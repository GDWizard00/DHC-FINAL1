import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';

/**
 * DivisionHandler - Handles division selection and wallet management
 * Manages the 5-layer economy system: Gold, Tokens, $DNG, $HERO, $ETH
 */
export class DivisionHandler {
    
    /**
     * Show division selection menu
     */
    static async showDivisionSelection(interactionOrMessage, gameState) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🏆 **SELECT YOUR DIVISION** 🏆')
                .setDescription('Choose your division to play in! Higher divisions offer better rewards but require tokens to enter.\n\n**Exchange Rates:** 1000:1 for all upgrades')
                .setColor(0x0099ff)
                .addFields([
                    {
                        name: '🟨 **Gold Division** (FREE)',
                        value: `Cost: Free\nReward Multiplier: 1x\nYour Balance: ${gameState.economy.gold}`,
                        inline: true
                    },
                    {
                        name: '🎫 **Token Division**',
                        value: `Cost: 1 Token per game\nReward Multiplier: 2x\nYour Balance: ${gameState.economy.tokens}`,
                        inline: true
                    },
                    {
                        name: '🔸 **$DNG Division**',
                        value: `Cost: 1 $DNG per game\nReward Multiplier: 5x\nYour Balance: ${gameState.economy.dng}`,
                        inline: true
                    },
                    {
                        name: '🦸 **$HERO Division**',
                        value: `Cost: 1 $HERO per game\nReward Multiplier: 10x\nYour Balance: ${gameState.economy.hero}`,
                        inline: true
                    },
                    {
                        name: '💎 **$ETH Division** (FREE)',
                        value: `Cost: Free\nReward Multiplier: 20x\nYour Balance: ${gameState.economy.eth}`,
                        inline: true
                    }
                ])
                .setFooter({ text: 'Select a division to continue' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('division_selection')
                .setPlaceholder('Choose your division...')
                .addOptions([
                    {
                        label: '🟨 Gold Division',
                        description: 'Free to play - Basic rewards',
                        value: 'gold',
                        emoji: '🟨'
                    },
                    {
                        label: '🎫 Token Division',
                        description: 'Costs 1 Token - 2x rewards',
                        value: 'tokens',
                        emoji: '🎫'
                    },
                    {
                        label: '🔸 $DNG Division',
                        description: 'Costs 1 $DNG - 5x rewards',
                        value: 'dng',
                        emoji: '🔸'
                    },
                    {
                        label: '🦸 $HERO Division',
                        description: 'Costs 1 $HERO - 10x rewards',
                        value: 'hero',
                        emoji: '🦸'
                    },
                    {
                        label: '💎 $ETH Division',
                        description: 'Free to play - 20x rewards',
                        value: 'eth',
                        emoji: '💎'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Check if it's an interaction or a message
            if (interactionOrMessage.isStringSelectMenu && interactionOrMessage.isStringSelectMenu()) {
                // It's an interaction
                await interactionOrMessage.update({
                    embeds: [embed],
                    components: [row]
                });
            } else {
                // It's a message
                await interactionOrMessage.reply({
                    embeds: [embed],
                    components: [row],
                    allowedMentions: { repliedUser: false }
                });
            }

            gameState.currentScreen = 'division_selection';
            gameState.updateActivity();

            logger.info(`Division selection displayed for user ${gameState.playerId}`);

        } catch (error) {
            logger.error('Error showing division selection:', error);
            
            // Handle error response based on type
            if (interactionOrMessage.isStringSelectMenu && interactionOrMessage.isStringSelectMenu()) {
                await interactionOrMessage.update({
                    content: 'Error loading division selection. Please try again.',
                    embeds: [],
                    components: []
                });
            } else {
                await interactionOrMessage.reply({
                    content: 'Error loading division selection. Please try again.',
                    allowedMentions: { repliedUser: false }
                });
            }
        }
    }

    /**
     * Handle division selection
     */
    static async handleDivisionSelection(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'gold':
                case 'tokens':
                case 'dng':
                case 'hero':
                case 'eth':
                    await this.selectDivision(interaction, selectedValue, gameState);
                    break;
                
                case 'exchange':
                    await this.showExchangeMenu(interaction, gameState);
                    break;
                
                case 'load_wallet':
                    await this.showWalletLoader(interaction, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown division selection: ${selectedValue}`);
                    await interaction.update({
                        content: '❌ Unknown division selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling division selection:', error);
            throw error;
        }
    }

    /**
     * Select a division and charge entry cost
     */
    static async selectDivision(interaction, division, gameState) {
        try {
            // Check if player can afford this division
            const cost = gameState.divisionCosts[division];
            const available = gameState.economy[division];

            if (division !== 'gold' && division !== 'eth' && available < cost) {
                await interaction.update({
                    content: `❌ Insufficient balance for ${division.toUpperCase()} division. You need ${cost} ${division.toUpperCase()} but only have ${available}.`,
                    embeds: [],
                    components: []
                });
                return;
            }

            // Charge entry cost (except for gold and eth)
            if (division !== 'gold' && division !== 'eth') {
                gameState.economy[division] -= cost;
            }

            // Set economy type
            gameState.economyType = division;

            // Save updated economy to database
            await DatabaseManager.updatePlayerEconomy(gameState.playerId, gameState.economy);

            // After setting the division, return player to hero selection screen
            const { HeroSelectionHandler } = await import('./HeroSelectionHandler.js');

            await HeroSelectionHandler.showHeroSelection(interaction, gameState);

            // Update current screen
            gameState.currentScreen = 'hero_selection';

            logger.info(`User ${gameState.playerId} selected ${division} division and ready to proceed`);

        } catch (error) {
            logger.error('Error selecting division:', error);
            await interaction.update({
                content: 'Error selecting division. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show exchange menu for currency trading
     */
    static async showExchangeMenu(interaction, gameState) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔄 **CURRENCY EXCHANGE** 🔄')
                .setDescription('Exchange your currencies at a 1000:1 ratio!\n\n**Current Balance:**')
                .addFields([
                    {
                        name: '💰 **Your Wallet**',
                        value: `🪙 **Gold:** ${gameState.economy.gold}\n🎫 **Tokens:** ${gameState.economy.tokens}\n🔸 **$DNG:** ${gameState.economy.dng}\n🦸 **$HERO:** ${gameState.economy.hero}\n💎 **$ETH:** ${gameState.economy.eth}`,
                        inline: true
                    },
                    {
                        name: '📋 **Exchange Rates**',
                        value: '1000 Gold → 1 Token\n1000 Tokens → 1 $DNG\n1000 $DNG → 1 $HERO\n1000 $HERO → 1 $ETH',
                        inline: true
                    }
                ])
                .setColor(0x0099FF)
                .setFooter({ text: 'Select an exchange option' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('exchange_menu')
                .setPlaceholder('Choose exchange option...')
                .addOptions([
                    {
                        label: 'Gold → Tokens',
                        description: 'Exchange 1000 Gold for 1 Token',
                        value: 'gold_to_tokens',
                        emoji: '🪙'
                    },
                    {
                        label: 'Tokens → $DNG',
                        description: 'Exchange 1000 Tokens for 1 $DNG',
                        value: 'tokens_to_dng',
                        emoji: '🎫'
                    },
                    {
                        label: '$DNG → $HERO',
                        description: 'Exchange 1000 $DNG for 1 $HERO',
                        value: 'dng_to_hero',
                        emoji: '🔸'
                    },
                    {
                        label: '$HERO → $ETH',
                        description: 'Exchange 1000 $HERO for 1 $ETH',
                        value: 'hero_to_eth',
                        emoji: '🦸'
                    },
                    {
                        label: 'Back to Main Menu',
                        description: 'Return to the main menu',
                        value: 'back_to_main',
                        emoji: '🔙'
                    }
                ]);

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            gameState.currentScreen = 'exchange_menu';
            gameState.updateActivity();

        } catch (error) {
            logger.error('Error showing exchange menu:', error);
            await interaction.update({
                content: '❌ Error loading exchange menu. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show wallet loader interface
     */
    static async showWalletLoader(interaction, gameState) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('💳 **WALLET LOADER** 💳')
                .setDescription('Load your wallet with currencies!\n\n**Current Balance:**')
                .addFields([
                    {
                        name: '💰 **Your Wallet**',
                        value: `🪙 **Gold:** ${gameState.economy.gold}\n🎫 **Tokens:** ${gameState.economy.tokens}\n🔸 **$DNG:** ${gameState.economy.dng}\n🦸 **$HERO:** ${gameState.economy.hero}\n💎 **$ETH:** ${gameState.economy.eth}`,
                        inline: true
                    },
                    {
                        name: '📋 **Load Options**',
                        value: 'Select currency to load into your wallet',
                        inline: true
                    }
                ])
                .setColor(0x00FF00)
                .setFooter({ text: 'Select a currency to load' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('wallet_loader')
                .setPlaceholder('Choose currency to load...')
                .addOptions([
                    {
                        label: 'Load Gold',
                        description: 'Add 1000 Gold to your wallet',
                        value: 'load_gold',
                        emoji: '🪙'
                    },
                    {
                        label: 'Load Tokens',
                        description: 'Add 100 Tokens to your wallet',
                        value: 'load_tokens',
                        emoji: '🎫'
                    },
                    {
                        label: 'Load $DNG',
                        description: 'Add 10 $DNG to your wallet',
                        value: 'load_dng',
                        emoji: '🔸'
                    },
                    {
                        label: 'Load $HERO',
                        description: 'Add 5 $HERO to your wallet',
                        value: 'load_hero',
                        emoji: '🦸'
                    },
                    {
                        label: 'Load $ETH',
                        description: 'Add 1 $ETH to your wallet',
                        value: 'load_eth',
                        emoji: '💎'
                    },
                    {
                        label: 'Back to Main Menu',
                        description: 'Return to the main menu',
                        value: 'back_to_main',
                        emoji: '🔙'
                    }
                ]);

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            gameState.currentScreen = 'wallet_loader';
            gameState.updateActivity();

        } catch (error) {
            logger.error('Error showing wallet loader:', error);
            await interaction.update({
                content: '❌ Error loading wallet loader. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle exchange menu actions
     */
    static async handleExchangeAction(interaction, action, gameState) {
        try {
            switch (action) {
                case 'gold_to_tokens':
                    await this.exchangeCurrency(interaction, gameState, 'gold', 'tokens', 1000, 1);
                    break;
                case 'tokens_to_dng':
                    await this.exchangeCurrency(interaction, gameState, 'tokens', 'dng', 1000, 1);
                    break;
                case 'dng_to_hero':
                    await this.exchangeCurrency(interaction, gameState, 'dng', 'hero', 1000, 1);
                    break;
                case 'hero_to_eth':
                    await this.exchangeCurrency(interaction, gameState, 'hero', 'eth', 1000, 1);
                    break;
                case 'back_to_main':
                    const { StartMenuHandler } = await import('./StartMenuHandler.js');
                    await StartMenuHandler.showStartMenu(interaction, gameState);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Invalid exchange option.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling exchange action:', error);
            await interaction.update({
                content: '❌ Error processing exchange. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle wallet loader actions
     */
    static async handleWalletAction(interaction, action, gameState) {
        try {
            switch (action) {
                case 'load_gold':
                    await this.loadCurrency(interaction, gameState, 'gold', 1000);
                    break;
                case 'load_tokens':
                    await this.loadCurrency(interaction, gameState, 'tokens', 100);
                    break;
                case 'load_dng':
                    await this.loadCurrency(interaction, gameState, 'dng', 10);
                    break;
                case 'load_hero':
                    await this.loadCurrency(interaction, gameState, 'hero', 5);
                    break;
                case 'load_eth':
                    await this.loadCurrency(interaction, gameState, 'eth', 1);
                    break;
                case 'back_to_main':
                    const { StartMenuHandler } = await import('./StartMenuHandler.js');
                    await StartMenuHandler.showStartMenu(interaction, gameState);
                    break;
                default:
                    await interaction.update({
                        content: '❌ Invalid wallet option.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling wallet action:', error);
            await interaction.update({
                content: '❌ Error processing wallet action. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Exchange one currency for another
     */
    static async exchangeCurrency(interaction, gameState, fromCurrency, toCurrency, fromAmount, toAmount) {
        try {
            // Check if user has enough currency
            if (gameState.economy[fromCurrency] < fromAmount) {
                await interaction.update({
                    content: `❌ Insufficient ${fromCurrency.toUpperCase()}! You need ${fromAmount} but only have ${gameState.economy[fromCurrency]}.`,
                    embeds: [],
                    components: []
                });
                return;
            }

            // Perform exchange
            gameState.economy[fromCurrency] -= fromAmount;
            gameState.economy[toCurrency] += toAmount;

            // Update database
            await DatabaseManager.updatePlayerEconomy(gameState.playerId, gameState.economy);

            // Show success message
            const embed = new EmbedBuilder()
                .setTitle('✅ **EXCHANGE SUCCESSFUL** ✅')
                .setDescription(`Successfully exchanged ${fromAmount} ${fromCurrency.toUpperCase()} for ${toAmount} ${toCurrency.toUpperCase()}!`)
                .addFields([
                    {
                        name: '💰 **Updated Balance**',
                        value: `🪙 **Gold:** ${gameState.economy.gold}\n🎫 **Tokens:** ${gameState.economy.tokens}\n🔸 **$DNG:** ${gameState.economy.dng}\n🦸 **$HERO:** ${gameState.economy.hero}\n💎 **$ETH:** ${gameState.economy.eth}`,
                        inline: true
                    }
                ])
                .setColor(0x00FF00)
                .setFooter({ text: 'Exchange completed successfully!' })
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });

            logger.info(`User ${gameState.playerId} exchanged ${fromAmount} ${fromCurrency} for ${toAmount} ${toCurrency}`);

        } catch (error) {
            logger.error('Error exchanging currency:', error);
            await interaction.update({
                content: '❌ Error processing exchange. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Load currency into wallet
     */
    static async loadCurrency(interaction, gameState, currency, amount) {
        try {
            // Add currency to wallet
            gameState.economy[currency] += amount;

            // Update database
            await DatabaseManager.updatePlayerEconomy(gameState.playerId, gameState.economy);

            // Show success message
            const embed = new EmbedBuilder()
                .setTitle('✅ **WALLET LOADED** ✅')
                .setDescription(`Successfully loaded ${amount} ${currency.toUpperCase()} into your wallet!`)
                .addFields([
                    {
                        name: '💰 **Updated Balance**',
                        value: `🪙 **Gold:** ${gameState.economy.gold}\n🎫 **Tokens:** ${gameState.economy.tokens}\n🔸 **$DNG:** ${gameState.economy.dng}\n🦸 **$HERO:** ${gameState.economy.hero}\n💎 **$ETH:** ${gameState.economy.eth}`,
                        inline: true
                    }
                ])
                .setColor(0x00FF00)
                .setFooter({ text: 'Wallet loaded successfully!' })
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });

            logger.info(`User ${gameState.playerId} loaded ${amount} ${currency} into wallet`);

        } catch (error) {
            logger.error('Error loading currency:', error);
            await interaction.update({
                content: '❌ Error loading currency. Please try again.',
                embeds: [],
                components: []
            });
        }
    }
} 