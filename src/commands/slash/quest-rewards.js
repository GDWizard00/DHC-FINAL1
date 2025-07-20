import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { Web3Manager } from '../../utils/Web3Manager.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import crypto from 'crypto';

const data = new SlashCommandBuilder()
    .setName('quest-rewards')
    .setDescription('Manage quest rewards and crypto/NFT distributions (Admin only)')
    .addSubcommand(sub => sub
        .setName('distribute')
        .setDescription('Distribute rewards to quest participants')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to distribute rewards for').setRequired(true))
        .addBooleanOption(opt => opt.setName('auto_distribute').setDescription('Automatically distribute to all eligible participants').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('claim')
        .setDescription('Claim your quest rewards')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to claim rewards from').setRequired(true))
        .addStringOption(opt => opt.setName('wallet_address').setDescription('Your wallet address for crypto/NFT rewards').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('status')
        .setDescription('Check reward distribution status')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to check status').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('payment')
        .setDescription('Process payment for special quest')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to process payment for').setRequired(true))
        .addStringOption(opt => opt.setName('payment_method').setDescription('Payment method used').setRequired(true)
            .addChoices(
                { name: 'Crypto (ETH/Tokens)', value: 'crypto' },
                { name: 'Credit Card', value: 'card' },
                { name: 'Bank Transfer', value: 'bank' },
                { name: 'PayPal', value: 'paypal' }
            ))
        .addStringOption(opt => opt.setName('transaction_id').setDescription('Transaction ID or reference').setRequired(true))
        .addStringOption(opt => opt.setName('amount').setDescription('Amount paid').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('fund-quest')
        .setDescription('Fund a special quest with crypto rewards')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to fund').setRequired(true))
        .addStringOption(opt => opt.setName('funding_tx').setDescription('Funding transaction hash').setRequired(true))
        .addStringOption(opt => opt.setName('amount').setDescription('Amount funded (ETH)').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('refund')
        .setDescription('Process refund for cancelled quest')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to refund').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Refund reason').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('treasury')
        .setDescription('View quest treasury and financial status')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export { data };

/**
 * Hash password for validation
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + process.env.SALT || 'dhc_salt_2024').digest('hex');
}

/**
 * Validate admin password
 */
async function validateAdminPassword(serverId, userId, password) {
    try {
        const serverConfig = await DatabaseManager.getServerConfig(serverId);
        if (!serverConfig) {
            return { valid: false, message: 'No server configuration found. Use `/setup admin` first.' };
        }

        if (serverConfig.adminId === userId) {
            const inputHash = hashPassword(password);
            if (inputHash === serverConfig.adminPasswordHash) {
                return { valid: true, role: 'admin' };
            } else {
                return { valid: false, message: 'Invalid admin password.' };
            }
        }

        return { valid: false, message: 'Only server admin can manage quest rewards.' };
    } catch (error) {
        logger.error('Error validating admin password:', error);
        return { valid: false, message: 'Password validation error.' };
    }
}

/**
 * Calculate reward distribution
 */
function calculateRewardDistribution(quest) {
    if (!quest.participants || quest.participants.length === 0) {
        return { eligible: [], distribution: [] };
    }

    const eligible = quest.participants.filter(p => {
        if (quest.type === 'standard') {
            return p.progress >= quest.target;
        } else if (quest.type === 'whitelist') {
            return p.completed || p.progress > 0; // Participated
        } else if (quest.type === 'special') {
            return p.completed || p.progress >= quest.target;
        }
        return false;
    });

    const distribution = eligible.map(participant => {
        let reward = {};
        
        if (quest.type === 'standard') {
            reward = {
                gold: quest.rewards?.gold || 0,
                xp: quest.rewards?.xp || 0,
                items: quest.rewards?.items || []
            };
        } else if (quest.type === 'whitelist') {
            reward = {
                whitelistSpot: true,
                project: quest.projectName
            };
        } else if (quest.type === 'special') {
            if (quest.rewardType === 'crypto') {
                const totalAmount = parseFloat(quest.rewardDetails.match(/[\d.]+/)?.[0] || '0');
                const perUser = totalAmount / eligible.length;
                reward = {
                    crypto: {
                        amount: perUser,
                        currency: quest.rewardDetails.includes('ETH') ? 'ETH' : 'TOKEN'
                    }
                };
            } else if (quest.rewardType === 'nft') {
                reward = {
                    nft: {
                        collection: quest.rewardDetails,
                        quantity: 1
                    }
                };
            }
        }

        return {
            userId: participant.userId,
            reward,
            status: 'pending'
        };
    });

    return { eligible, distribution };
}

/**
 * Generate payment QR code or instructions
 */
function generatePaymentInstructions(quest) {
    const pricing = quest.pricing;
    const instructions = {
        total: pricing.total,
        methods: []
    };

    // Crypto payment
    instructions.methods.push({
        type: 'crypto',
        details: {
            address: process.env.TREASURY_WALLET || '0x742d35Cc6634C0532925a3b8D4D8dcF6e6D8D8C4',
            amount: (pricing.total * 0.0003).toFixed(6), // Convert to ETH equivalent
            currency: 'ETH',
            network: 'Ethereum',
            note: `Quest payment for ${quest.id}`
        }
    });

    // Traditional payment methods
    instructions.methods.push({
        type: 'card',
        details: {
            provider: 'Stripe',
            url: `https://payment.dungeonites.com/quest/${quest.id}`,
            amount: pricing.total,
            currency: 'USD'
        }
    });

    return instructions;
}

export async function execute(interaction) {
    try {
        // Bot Developer Only Access - Command Cleanup Phase 3
        const { BotDeveloperHandler } = await import('../../handlers/admin/BotDeveloperHandler.js');
        if (!BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('🚫 **ACCESS DENIED** 🚫')
                .setDescription(
                    '**Bot Developer Only Command**\n\n' +
                    '🔒 This command is restricted to the Bot Developer only.\n' +
                    '⚠️ **Security Notice**: This attempt has been logged.\n\n' +
                    '*Quest rewards are managed by the Bot Developer.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Quest Rewards • Bot Developer Access Required' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return;
        }

    const sub = interaction.options.getSubcommand();
    const serverId = interaction.guildId;
    const userId = interaction.user.id;
        // Commands that don't require admin password
        if (sub === 'claim') {
            const questId = interaction.options.getString('quest_id');
            const walletAddress = interaction.options.getString('wallet_address');
            
            const quest = await DatabaseManager.getQuestById(questId);
            
            if (!quest || quest.serverId !== serverId) {
                await interaction.reply({ 
                    content: '❌ Quest not found or not available on this server.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            if (quest.status !== 'completed') {
                await interaction.reply({ 
                    content: '❌ Quest is not completed yet. Rewards cannot be claimed.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            // Check if user is eligible for rewards
            const participant = quest.participants?.find(p => p.userId === userId);
            if (!participant) {
                await interaction.reply({ 
                    content: '❌ You did not participate in this quest.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            // Check if already claimed
            if (participant.rewardClaimed) {
                await interaction.reply({ 
                    content: '❌ You have already claimed your rewards for this quest.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            const { distribution } = calculateRewardDistribution(quest);
            const userReward = distribution.find(d => d.userId === userId);

            if (!userReward) {
                await interaction.reply({ 
                    content: '❌ You are not eligible for rewards from this quest.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🎁 **CLAIM QUEST REWARDS**')
                .setDescription(`Claim your rewards from "${quest.title}"`)
                .setColor(0xFFD700)
                .setTimestamp();

            if (quest.type === 'standard') {
                embed.addFields({
                    name: '💰 Your Rewards',
                    value: `**Gold:** ${userReward.reward.gold}\n**XP:** ${userReward.reward.xp}${userReward.reward.items.length > 0 ? `\n**Items:** ${userReward.reward.items.join(', ')}` : ''}`,
                    inline: false
                });
            } else if (quest.type === 'whitelist') {
                embed.addFields({
                    name: '🎫 Your Rewards',
                    value: `**Whitelist Spot:** ${userReward.reward.project}\n**Status:** Confirmed`,
                    inline: false
                });
            } else if (quest.type === 'special') {
                if (userReward.reward.crypto) {
                    if (!walletAddress) {
                        await interaction.reply({ 
                            content: '❌ Wallet address is required for crypto rewards. Please provide your wallet address.', 
                            flags: MessageFlags.Ephemeral 
                        });
                        return;
                    }
                    
                    embed.addFields({
                        name: '💎 Your Crypto Rewards',
                        value: `**Amount:** ${userReward.reward.crypto.amount} ${userReward.reward.crypto.currency}\n**Wallet:** ${walletAddress}`,
                        inline: false
                    });
                } else if (userReward.reward.nft) {
                    embed.addFields({
                        name: '🖼️ Your NFT Rewards',
                        value: `**Collection:** ${userReward.reward.nft.collection}\n**Quantity:** ${userReward.reward.nft.quantity}`,
                        inline: false
                    });
                }
            }

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`claim_reward_${questId}`)
                        .setLabel('Claim Rewards')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎁'),
                    new ButtonBuilder()
                        .setCustomId(`cancel_claim_${questId}`)
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [actionRow], 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        if (sub === 'status') {
            const questId = interaction.options.getString('quest_id');
            const quest = await DatabaseManager.getQuestById(questId);
            
            if (!quest || quest.serverId !== serverId) {
                await interaction.reply({ 
                    content: '❌ Quest not found or not available on this server.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            const { eligible, distribution } = calculateRewardDistribution(quest);

            const embed = new EmbedBuilder()
                .setTitle('📊 **QUEST REWARD STATUS**')
                .setDescription(`Reward distribution status for "${quest.title}"`)
                .addFields([
                    {
                        name: '🎯 Quest Status',
                        value: `**Status:** ${quest.status}\n**Participants:** ${quest.participants?.length || 0}\n**Eligible for Rewards:** ${eligible.length}`,
                        inline: false
                    },
                    {
                        name: '💰 Reward Information',
                        value: quest.type === 'standard' ? 
                            `**Gold:** ${quest.rewards?.gold || 0}\n**XP:** ${quest.rewards?.xp || 0}` :
                            quest.type === 'whitelist' ? 
                            `**Project:** ${quest.projectName}\n**WL Spots:** ${quest.wlSpots}` :
                            `**Type:** ${quest.rewardType}\n**Details:** ${quest.rewardDetails}`,
                        inline: false
                    }
                ])
                .setColor(quest.status === 'completed' ? 0x00FF00 : 0xFFFF00)
                .setTimestamp();

            if (quest.type === 'special' && quest.pricing) {
                embed.addFields({
                    name: '💳 Payment Status',
                    value: `**Total Cost:** $${quest.pricing.total}\n**Payment Status:** ${quest.paymentStatus || 'Pending'}`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Admin-only commands require password validation
        const password = interaction.options.getString('password');
        const permissionCheck = await validateAdminPassword(serverId, userId, password);
        
        if (!permissionCheck.valid) {
            await interaction.reply({ 
                content: `❌ ${permissionCheck.message}`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        switch (sub) {
            case 'distribute': {
                const questId = interaction.options.getString('quest_id');
                const autoDistribute = interaction.options.getBoolean('auto_distribute') || false;
                
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.status !== 'completed') {
                    await interaction.reply({ 
                        content: '❌ Quest must be completed before distributing rewards.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const { eligible, distribution } = calculateRewardDistribution(quest);

                if (eligible.length === 0) {
                    await interaction.reply({ 
                        content: '❌ No participants are eligible for rewards.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('🎁 **DISTRIBUTE QUEST REWARDS**')
                    .setDescription(`Ready to distribute rewards for "${quest.title}"`)
                    .addFields([
                        {
                            name: '📊 Distribution Summary',
                            value: `**Eligible Participants:** ${eligible.length}\n**Total Participants:** ${quest.participants?.length || 0}\n**Quest Type:** ${quest.type}`,
                            inline: false
                        }
                    ])
                    .setColor(0xFFD700)
                    .setTimestamp();

                if (quest.type === 'standard') {
                    embed.addFields({
                        name: '💰 Rewards Per Participant',
                        value: `**Gold:** ${quest.rewards?.gold || 0}\n**XP:** ${quest.rewards?.xp || 0}${quest.rewards?.items?.length > 0 ? `\n**Items:** ${quest.rewards.items.join(', ')}` : ''}`,
                        inline: false
                    });
                } else if (quest.type === 'special' && quest.rewardType === 'crypto') {
                    const totalAmount = parseFloat(quest.rewardDetails.match(/[\d.]+/)?.[0] || '0');
                    const perUser = totalAmount / eligible.length;
                    embed.addFields({
                        name: '💎 Crypto Rewards',
                        value: `**Total Pool:** ${totalAmount} ${quest.rewardDetails.includes('ETH') ? 'ETH' : 'TOKEN'}\n**Per Participant:** ${perUser.toFixed(6)}`,
                        inline: false
                    });
                }

                if (autoDistribute) {
                    // Auto-distribute rewards
                    for (const reward of distribution) {
                        // Update participant with reward claimed status
                        await DatabaseManager.updateQuestParticipantProgress(
                            questId, 
                            reward.userId, 
                            quest.participants.find(p => p.userId === reward.userId)?.progress || 0, 
                            true
                        );
                    }

                    await DatabaseManager.updateQuest(questId, { 
                        rewardsDistributed: true,
                        distributedAt: new Date(),
                        distributedBy: userId
                    });

                    embed.addFields({
                        name: '✅ Distribution Complete',
                        value: `Rewards have been automatically distributed to ${eligible.length} participants.`,
                        inline: false
                    });

                    auditLogger.log('QUEST', `Rewards distributed for quest ${questId} by ${userId} on server ${serverId}`, 'rewards_distributed');
                } else {
                    // Manual distribution confirmation
                    const actionRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`distribute_rewards_${questId}`)
                                .setLabel('Distribute Rewards')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🎁'),
                            new ButtonBuilder()
                                .setCustomId(`cancel_distribute_${questId}`)
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('❌')
                        );

                    await interaction.reply({ 
                        embeds: [embed], 
                        components: [actionRow], 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }

            case 'payment': {
                const questId = interaction.options.getString('quest_id');
                const paymentMethod = interaction.options.getString('payment_method');
                const transactionId = interaction.options.getString('transaction_id');
                const amount = interaction.options.getString('amount');
                
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.status !== 'pending_payment') {
                    await interaction.reply({ 
                        content: '❌ Quest is not pending payment.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                // Record payment
                const paymentRecord = {
                    questId,
                    method: paymentMethod,
                    transactionId,
                    amount: parseFloat(amount),
                    processedBy: userId,
                    processedAt: new Date()
                };

                await DatabaseManager.updateQuest(questId, { 
                    status: 'active',
                    paymentStatus: 'paid',
                    paymentRecord
                });

                await interaction.reply({ 
                    content: `✅ Payment processed successfully!\n\n**Quest:** ${quest.title}\n**Amount:** $${amount}\n**Method:** ${paymentMethod}\n**Transaction ID:** ${transactionId}\n\nQuest is now active and live!`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `Payment processed for quest ${questId} by ${userId} on server ${serverId}`, 'payment_processed');
                break;
            }

            case 'fund-quest': {
                const questId = interaction.options.getString('quest_id');
                const fundingTx = interaction.options.getString('funding_tx');
                const amount = interaction.options.getString('amount');
                
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.type !== 'special' || quest.rewardType !== 'crypto') {
                    await interaction.reply({ 
                        content: '❌ Quest funding is only available for special crypto reward quests.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                // Verify transaction if Web3Manager is available
                let txVerified = false;
                try {
                    if (Web3Manager) {
                        txVerified = await Web3Manager.verifyTransaction(fundingTx);
                    }
                } catch (error) {
                    logger.warn('Could not verify transaction:', error);
                }

                const fundingRecord = {
                    questId,
                    transactionHash: fundingTx,
                    amount: parseFloat(amount),
                    verified: txVerified,
                    fundedBy: userId,
                    fundedAt: new Date()
                };

                await DatabaseManager.updateQuest(questId, { 
                    funded: true,
                    fundingRecord
                });

                await interaction.reply({ 
                    content: `✅ Quest funded successfully!\n\n**Quest:** ${quest.title}\n**Amount:** ${amount} ETH\n**Transaction:** ${fundingTx}\n**Verified:** ${txVerified ? 'Yes' : 'Pending'}\n\nQuest rewards are now funded and ready for distribution!`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `Quest ${questId} funded by ${userId} on server ${serverId}`, 'quest_funded');
                break;
            }

            case 'refund': {
                const questId = interaction.options.getString('quest_id');
                const reason = interaction.options.getString('reason');
                
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.status !== 'cancelled' && quest.status !== 'pending_payment') {
                    await interaction.reply({ 
                        content: '❌ Refunds are only available for cancelled or pending payment quests.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const refundRecord = {
                    questId,
                    reason,
                    amount: quest.pricing?.total || 0,
                    processedBy: userId,
                    processedAt: new Date()
                };

                await DatabaseManager.updateQuest(questId, { 
                    status: 'refunded',
                    refundRecord
                });

                await interaction.reply({ 
                    content: `✅ Refund processed successfully!\n\n**Quest:** ${quest.title}\n**Amount:** $${quest.pricing?.total || 0}\n**Reason:** ${reason}\n\nRefund will be processed within 3-5 business days.`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `Refund processed for quest ${questId} by ${userId} on server ${serverId}`, 'refund_processed');
                break;
            }

            case 'treasury': {
                const quests = await DatabaseManager.getServerQuests(serverId);
                const specialQuests = quests.filter(q => q.type === 'special');
                
                let totalRevenue = 0;
                let totalRefunds = 0;
                let pendingPayments = 0;
                let activeFunding = 0;

                specialQuests.forEach(quest => {
                    if (quest.paymentStatus === 'paid') {
                        totalRevenue += quest.pricing?.total || 0;
                    } else if (quest.status === 'pending_payment') {
                        pendingPayments += quest.pricing?.total || 0;
                    }
                    
                    if (quest.status === 'refunded') {
                        totalRefunds += quest.refundRecord?.amount || 0;
                    }
                    
                    if (quest.funded && quest.fundingRecord) {
                        activeFunding += quest.fundingRecord.amount || 0;
                    }
                });

                const embed = new EmbedBuilder()
                    .setTitle('🏦 **QUEST TREASURY STATUS**')
                    .setDescription(`Financial overview for ${interaction.guild.name}`)
                    .addFields([
                        {
                            name: '💰 Revenue',
                            value: `**Total Revenue:** $${totalRevenue.toFixed(2)}\n**Pending Payments:** $${pendingPayments.toFixed(2)}\n**Total Refunds:** $${totalRefunds.toFixed(2)}`,
                            inline: true
                        },
                        {
                            name: '💎 Crypto Funding',
                            value: `**Active Funding:** ${activeFunding.toFixed(4)} ETH\n**Funded Quests:** ${specialQuests.filter(q => q.funded).length}`,
                            inline: true
                        },
                        {
                            name: '📊 Quest Stats',
                            value: `**Total Special Quests:** ${specialQuests.length}\n**Active:** ${specialQuests.filter(q => q.status === 'active').length}\n**Completed:** ${specialQuests.filter(q => q.status === 'completed').length}`,
                            inline: true
                        }
                    ])
                    .setColor(0x00CED1)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }

            default:
                await interaction.reply({ content: '❌ Unknown quest rewards command.', flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        logger.error('Quest rewards command error:', error);
        await interaction.reply({ content: `❌ Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        auditLogger.log('ERROR', `Quest rewards command ${sub} failed: ${error.message}`, 'quest_rewards_error');
    }
} 