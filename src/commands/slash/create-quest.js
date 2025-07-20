import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import crypto from 'crypto';

const data = new SlashCommandBuilder()
    .setName('create-quest')
    .setDescription('Create quests for your server (Admin/Certified Members only)')
    .addSubcommand(sub => sub
        .setName('standard')
        .setDescription('Create a standard quest with game rewards')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('type').setDescription('Quest type').setRequired(true)
            .addChoices(
                { name: 'Monster Hunter - Kill specific monsters', value: 'monster_hunter' },
                { name: 'Explorer - Visit certain floors', value: 'explorer' },
                { name: 'Collector - Gather specific items', value: 'collector' },
                { name: 'Survivor - Complete without dying', value: 'survivor' },
                { name: 'Speed Runner - Complete within time limit', value: 'speed_runner' },
                { name: 'Floor Clearer - Clear specific floors', value: 'floor_clearer' },
                { name: 'Treasure Hunter - Find treasures/chests', value: 'treasure_hunter' },
                { name: 'Combat Master - Win with conditions', value: 'combat_master' },
                { name: 'Resource Gatherer - Collect gold/materials', value: 'resource_gatherer' },
                { name: 'Achievement Hunter - Complete milestones', value: 'achievement_hunter' }
            ))
        .addStringOption(opt => opt.setName('title').setDescription('Quest title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Quest description').setRequired(true))
        .addIntegerOption(opt => opt.setName('target').setDescription('Target amount (monsters, floors, items, etc.)').setRequired(true))
        .addStringOption(opt => opt.setName('specific_target').setDescription('Specific target (monster name, floor number, item name, etc.)').setRequired(false))
        .addStringOption(opt => opt.setName('difficulty').setDescription('Quest difficulty level').setRequired(false)
            .addChoices(
                { name: 'Easy - Beginner friendly', value: 'easy' },
                { name: 'Medium - Moderate challenge', value: 'medium' },
                { name: 'Hard - Experienced players', value: 'hard' },
                { name: 'Expert - Elite challenge', value: 'expert' }
            ))
        .addIntegerOption(opt => opt.setName('time_limit_minutes').setDescription('Time limit in minutes (for speed challenges)').setRequired(false))
        .addBooleanOption(opt => opt.setName('allow_death').setDescription('Allow player deaths (false for survivor quests)').setRequired(false))
        .addIntegerOption(opt => opt.setName('min_floor').setDescription('Minimum floor requirement').setRequired(false))
        .addIntegerOption(opt => opt.setName('max_floor').setDescription('Maximum floor requirement').setRequired(false))
        .addStringOption(opt => opt.setName('required_hero').setDescription('Required hero for quest').setRequired(false))
        .addStringOption(opt => opt.setName('forbidden_items').setDescription('Forbidden items (comma separated)').setRequired(false))
        .addStringOption(opt => opt.setName('required_items').setDescription('Required items (comma separated)').setRequired(false))
        .addIntegerOption(opt => opt.setName('gold_reward').setDescription('Gold reward amount').setRequired(false))
        .addIntegerOption(opt => opt.setName('xp_reward').setDescription('XP reward amount').setRequired(false))
        .addStringOption(opt => opt.setName('item_rewards').setDescription('Item rewards (comma separated)').setRequired(false))
        .addStringOption(opt => opt.setName('category').setDescription('Quest category').setRequired(false)
            .addChoices(
                { name: 'Daily - Resets daily at 0 UTC', value: 'daily' },
                { name: 'Weekly - Resets Monday 0 UTC', value: 'weekly' },
                { name: 'Event - Special event quest', value: 'event' },
                { name: 'Seasonal - Limited time seasonal', value: 'seasonal' }
            ))
        .addIntegerOption(opt => opt.setName('duration_hours').setDescription('Quest duration in hours (default: 24)').setRequired(false))
        .addIntegerOption(opt => opt.setName('max_participants').setDescription('Maximum number of participants (0 = unlimited)').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('whitelist')
        .setDescription('Create a whitelist distribution quest (Free)')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Quest title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Quest description').setRequired(true))
        .addStringOption(opt => opt.setName('project_name').setDescription('Project name for WL').setRequired(true))
        .addStringOption(opt => opt.setName('wl_spots').setDescription('Number of WL spots available').setRequired(true))
        .addStringOption(opt => opt.setName('requirements').setDescription('WL requirements/tasks').setRequired(true))
        .addStringOption(opt => opt.setName('social_tasks').setDescription('Social media tasks (Twitter follow, Discord join, etc.)').setRequired(false))
        .addStringOption(opt => opt.setName('game_requirements').setDescription('In-game requirements (level, achievements, etc.)').setRequired(false))
        .addStringOption(opt => opt.setName('form_url').setDescription('External form URL for additional requirements').setRequired(false))
        .addStringOption(opt => opt.setName('winner_selection').setDescription('Winner selection method').setRequired(false)
            .addChoices(
                { name: 'Random - Random selection from participants', value: 'random' },
                { name: 'First Come First Serve - First to complete', value: 'fcfs' },
                { name: 'Performance - Best game performance', value: 'performance' },
                { name: 'Manual - Admin manual selection', value: 'manual' }
            ))
        .addIntegerOption(opt => opt.setName('duration_hours').setDescription('Quest duration in hours (default: 168)').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('special')
        .setDescription('Create a special quest with crypto/NFT rewards')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Quest title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Quest description').setRequired(true))
        .addStringOption(opt => opt.setName('reward_type').setDescription('Reward type').setRequired(true)
            .addChoices(
                { name: 'Crypto (ETH/Tokens)', value: 'crypto' },
                { name: 'NFT Rewards', value: 'nft' },
                { name: 'Whitelist Spots', value: 'whitelist' },
                { name: 'Physical Prizes', value: 'physical' },
                { name: 'Gift Cards', value: 'giftcard' }
            ))
        .addStringOption(opt => opt.setName('reward_details').setDescription('Reward details (amount, NFT info, etc.)').setRequired(true))
        .addStringOption(opt => opt.setName('sponsor_info').setDescription('Sponsor/project information').setRequired(false))
        .addStringOption(opt => opt.setName('image_url').setDescription('Custom quest image URL').setRequired(false))
        .addBooleanOption(opt => opt.setName('promotional_embed').setDescription('Add promotional embed to start screen (+fee)').setRequired(false))
        .addBooleanOption(opt => opt.setName('cross_server').setDescription('Enable cross-server participation (+fee)').setRequired(false))
        .addBooleanOption(opt => opt.setName('featured_placement').setDescription('Featured placement for 24h (+fee)').setRequired(false))
        .addStringOption(opt => opt.setName('hashtag_campaign').setDescription('Custom hashtag for social media campaign').setRequired(false))
        .addIntegerOption(opt => opt.setName('duration_hours').setDescription('Quest duration in hours (default: 168)').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('view-pricing')
        .setDescription('View quest creation pricing and features'))
    .addSubcommand(sub => sub
        .setName('templates')
        .setDescription('View quest templates and examples for each quest type')
        .addStringOption(opt => opt.setName('quest_type').setDescription('View specific quest type template').setRequired(false)
            .addChoices(
                { name: 'Monster Hunter', value: 'monster_hunter' },
                { name: 'Explorer', value: 'explorer' },
                { name: 'Collector', value: 'collector' },
                { name: 'Survivor', value: 'survivor' },
                { name: 'Speed Runner', value: 'speed_runner' },
                { name: 'Floor Clearer', value: 'floor_clearer' },
                { name: 'Treasure Hunter', value: 'treasure_hunter' },
                { name: 'Combat Master', value: 'combat_master' },
                { name: 'Resource Gatherer', value: 'resource_gatherer' },
                { name: 'Achievement Hunter', value: 'achievement_hunter' }
            )))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export { data };

/**
 * Quest type parameter definitions and validation
 */
const QUEST_TYPE_CONFIGS = {
    monster_hunter: {
        name: 'Monster Hunter',
        description: 'Hunt and defeat specific monsters',
        requiredParams: ['target', 'specific_target'],
        optionalParams: ['min_floor', 'max_floor', 'time_limit_minutes', 'required_hero'],
        defaultTarget: 5,
        examples: [
            { title: 'Goblin Slayer', target: 10, specific_target: 'Goblin', description: 'Defeat 10 Goblins in any dungeon' },
            { title: 'Dragon Hunter Elite', target: 1, specific_target: 'Ancient Dragon', description: 'Defeat the Ancient Dragon on floor 10+', min_floor: 10 }
        ]
    },
    explorer: {
        name: 'Explorer',
        description: 'Visit and explore specific floors or areas',
        requiredParams: ['target'],
        optionalParams: ['min_floor', 'max_floor', 'specific_target', 'time_limit_minutes'],
        defaultTarget: 3,
        examples: [
            { title: 'Deep Delver', target: 5, min_floor: 15, description: 'Reach floor 15 or deeper 5 times' },
            { title: 'Floor Master', target: 10, specific_target: 'Floor 20', description: 'Reach floor 20 exactly 10 times' }
        ]
    },
    collector: {
        name: 'Collector',
        description: 'Collect specific items or materials',
        requiredParams: ['target', 'specific_target'],
        optionalParams: ['min_floor', 'max_floor', 'time_limit_minutes', 'forbidden_items'],
        defaultTarget: 10,
        examples: [
            { title: 'Potion Collector', target: 20, specific_target: 'Health Potion', description: 'Collect 20 Health Potions' },
            { title: 'Rare Gem Hunter', target: 5, specific_target: 'Ruby', description: 'Find 5 Rubies in treasure chests' }
        ]
    },
    survivor: {
        name: 'Survivor',
        description: 'Complete challenges without dying',
        requiredParams: ['target'],
        optionalParams: ['min_floor', 'max_floor', 'time_limit_minutes', 'required_hero', 'forbidden_items'],
        defaultTarget: 1,
        defaultParams: { allow_death: false },
        examples: [
            { title: 'No Death Run', target: 10, description: 'Complete 10 battles without dying once' },
            { title: 'Floor 20 Survivor', target: 1, min_floor: 20, description: 'Reach floor 20 without dying' }
        ]
    },
    speed_runner: {
        name: 'Speed Runner',
        description: 'Complete tasks within time limits',
        requiredParams: ['target', 'time_limit_minutes'],
        optionalParams: ['specific_target', 'min_floor', 'max_floor', 'required_hero'],
        defaultTarget: 1,
        examples: [
            { title: 'Speed Demon', target: 5, time_limit_minutes: 30, description: 'Complete 5 floors in under 30 minutes' },
            { title: 'Boss Rush', target: 3, time_limit_minutes: 15, specific_target: 'Boss', description: 'Defeat 3 bosses in 15 minutes' }
        ]
    },
    floor_clearer: {
        name: 'Floor Clearer',
        description: 'Clear specific floors completely',
        requiredParams: ['target'],
        optionalParams: ['min_floor', 'max_floor', 'specific_target', 'time_limit_minutes', 'allow_death'],
        defaultTarget: 3,
        examples: [
            { title: 'Floor Sweeper', target: 5, min_floor: 10, description: 'Completely clear 5 floors (10+)' },
            { title: 'Perfect Clear', target: 1, specific_target: 'Floor 15', allow_death: false, description: 'Clear floor 15 without dying' }
        ]
    },
    treasure_hunter: {
        name: 'Treasure Hunter',
        description: 'Find treasures and open chests',
        requiredParams: ['target'],
        optionalParams: ['specific_target', 'min_floor', 'max_floor', 'time_limit_minutes'],
        defaultTarget: 5,
        examples: [
            { title: 'Chest Master', target: 10, description: 'Open 10 treasure chests' },
            { title: 'Rare Treasure', target: 3, specific_target: 'Golden Chest', description: 'Find 3 Golden Chests' }
        ]
    },
    combat_master: {
        name: 'Combat Master',
        description: 'Win battles with specific conditions',
        requiredParams: ['target'],
        optionalParams: ['specific_target', 'required_hero', 'forbidden_items', 'min_floor', 'time_limit_minutes'],
        defaultTarget: 5,
        examples: [
            { title: 'Weapon Master', target: 10, forbidden_items: 'Magic Spells', description: 'Win 10 battles using only weapons' },
            { title: 'Hero Challenge', target: 5, required_hero: 'Warrior', description: 'Win 5 battles as Warrior class' }
        ]
    },
    resource_gatherer: {
        name: 'Resource Gatherer',
        description: 'Collect gold, materials, or resources',
        requiredParams: ['target'],
        optionalParams: ['specific_target', 'min_floor', 'max_floor', 'time_limit_minutes'],
        defaultTarget: 1000,
        examples: [
            { title: 'Gold Rush', target: 5000, specific_target: 'Gold', description: 'Collect 5000 gold pieces' },
            { title: 'Material Collector', target: 50, specific_target: 'Iron Ore', description: 'Gather 50 Iron Ore' }
        ]
    },
    achievement_hunter: {
        name: 'Achievement Hunter',
        description: 'Complete specific milestones or achievements',
        requiredParams: ['target'],
        optionalParams: ['specific_target', 'min_floor', 'max_floor', 'time_limit_minutes'],
        defaultTarget: 3,
        examples: [
            { title: 'Milestone Master', target: 5, specific_target: 'Level Up', description: 'Level up your hero 5 times' },
            { title: 'Achievement Collector', target: 10, description: 'Unlock 10 different achievements' }
        ]
    }
};

/**
 * Hash password for validation
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + process.env.SALT || 'dhc_salt_2024').digest('hex');
}

/**
 * Validate admin password or certified member permissions
 */
async function validateQuestPermissions(serverId, userId, password, requiredPermission = 'quest_creator') {
    try {
        const serverConfig = await DatabaseManager.getServerConfig(serverId);
        if (!serverConfig) {
            return { valid: false, message: 'No server configuration found. Use `/setup admin` first.' };
        }

        // Check if user is admin
        if (serverConfig.adminId === userId) {
            const inputHash = hashPassword(password);
            if (inputHash === serverConfig.adminPasswordHash) {
                return { valid: true, role: 'admin' };
            } else {
                return { valid: false, message: 'Invalid admin password.' };
            }
        }

        // Check if user has certified member permissions
        // Note: This would need to be enhanced to check Discord roles
        // For now, we'll require admin password for all quest creation
        return { valid: false, message: 'Only server admin can create quests currently. Certified member system coming soon.' };

    } catch (error) {
        logger.error('Error validating quest permissions:', error);
        return { valid: false, message: 'Permission validation error.' };
    }
}

/**
 * Validate quest parameters based on quest type
 */
function validateQuestParameters(questType, params) {
    const config = QUEST_TYPE_CONFIGS[questType];
    if (!config) {
        return { valid: false, message: `Unknown quest type: ${questType}` };
    }

    const errors = [];

    // Check required parameters
    for (const param of config.requiredParams) {
        if (!params[param] || (typeof params[param] === 'string' && params[param].trim() === '')) {
            errors.push(`Missing required parameter: ${param}`);
        }
    }

    // Validate specific parameter types
    if (params.time_limit_minutes && (params.time_limit_minutes < 1 || params.time_limit_minutes > 1440)) {
        errors.push('Time limit must be between 1 and 1440 minutes (24 hours)');
    }

    if (params.min_floor && params.max_floor && params.min_floor > params.max_floor) {
        errors.push('Minimum floor cannot be greater than maximum floor');
    }

    if (params.target && params.target < 1) {
        errors.push('Target must be at least 1');
    }

    if (params.max_participants && params.max_participants < 0) {
        errors.push('Maximum participants cannot be negative');
    }

    return {
        valid: errors.length === 0,
        message: errors.length > 0 ? errors.join(', ') : 'Valid parameters',
        errors
    };
}

/**
 * Get quest template information
 */
function getQuestTemplate(questType) {
    const config = QUEST_TYPE_CONFIGS[questType];
    if (!config) return null;

    return {
        name: config.name,
        description: config.description,
        requiredParams: config.requiredParams,
        optionalParams: config.optionalParams,
        defaultTarget: config.defaultTarget,
        examples: config.examples,
        defaultParams: config.defaultParams || {}
    };
}

/**
 * Calculate quest pricing for special quests
 */
function calculateQuestPricing(questData) {
    let basePrice = 0;
    let features = [];

    // Base pricing
    if (questData.reward_type === 'crypto' || questData.reward_type === 'nft') {
        basePrice = 100; // Special Quest Premium
        features.push('Special Quest Premium - $100');
    } else if (questData.reward_type === 'physical') {
        basePrice = 75; // Physical Prize Premium
        features.push('Physical Prize Premium - $75');
    } else if (questData.reward_type === 'giftcard') {
        basePrice = 50; // Gift Card Premium
        features.push('Gift Card Premium - $50');
    }

    // Image addon
    if (questData.image_url) {
        basePrice += 50;
        features.push('Custom Quest Image - $50');
    }

    // Promotional embed addon
    if (questData.promotional_embed) {
        basePrice += 100;
        features.push('Promotional Embed on Start Screen - $100');
    }

    // Cross-server addon
    if (questData.cross_server) {
        basePrice += 25;
        features.push('Cross-Server Participation - $25');
    }

    // Featured placement addon
    if (questData.featured_placement) {
        basePrice += 50;
        features.push('Featured Placement (24h) - $50');
    }

    // Hashtag campaign addon
    if (questData.hashtag_campaign) {
        basePrice += 75;
        features.push('Custom Hashtag Campaign - $75');
    }

    // Platform fee (0.5%)
    const platformFee = Math.ceil(basePrice * 0.005);
    
    // Estimated gas costs
    const estimatedGas = 15;

    const total = basePrice + platformFee + estimatedGas;

    return {
        basePrice,
        platformFee,
        estimatedGas,
        total,
        features
    };
}

/**
 * Generate unique quest ID
 */
function generateQuestId() {
    return `quest_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export async function execute(interaction) {
    try {
        // Bot Developer Only Access - Command Cleanup Phase 3
        const { BotDeveloperHandler } = await import('../../handlers/admin/BotDeveloperHandler.js');
        if (!BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 **ACCESS DENIED** 🚫')
                .setDescription(
                    '**Bot Developer Only Command**\n\n' +
                    '🔒 This command is restricted to the Bot Developer only.\n' +
                    '⚠️ **Security Notice**: This attempt has been logged.\n\n' +
                    '*Quest creation is managed by the Bot Developer through this interface.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Quest Creation • Bot Developer Access Required' })
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
        if (sub === 'view-pricing') {
            const embed = new EmbedBuilder()
                .setTitle('💰 **QUEST PRICING & FEATURES**')
                .setDescription('Pricing structure for quest creation and promotional features')
                .addFields([
                    {
                        name: '🆓 **FREE QUESTS**',
                        value: '• **Standard Quests** - Game rewards only\n• **Whitelist Distribution** - Free WL spots (requires form)',
                        inline: false
                    },
                    {
                        name: '💎 **SPECIAL QUEST PRICING**',
                        value: '• **Crypto/NFT Premium** - $100\n• **Physical Prize Premium** - $75\n• **Gift Card Premium** - $50\n• **Custom Quest Image** - +$50\n• **Promotional Embed** - +$100\n• **Cross-Server Boost** - +$25\n• **Featured Placement** - +$50 (24h)\n• **Hashtag Campaign** - +$75',
                        inline: false
                    },
                    {
                        name: '💳 **TRANSACTION FEES**',
                        value: '• **Platform Fee** - 0.5% of total\n• **Estimated Gas** - ~$15 (for crypto distribution)\n• **Real-time Quotes** - Exact pricing before payment',
                        inline: false
                    },
                    {
                        name: '🎯 **PROMOTIONAL FEATURES**',
                        value: '• Social media engagement campaigns\n• Brand exposure in quest UI\n• Engagement metrics dashboard\n• ROI tracking reports\n• Custom hashtag campaigns',
                        inline: false
                    }
                ])
                .setColor(0xFFD700)
                .setFooter({ text: 'Contact admin for custom pricing on bulk campaigns' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        if (sub === 'templates') {
            const questType = interaction.options.getString('quest_type');
            
            if (questType) {
                // Show specific quest type template
                const template = getQuestTemplate(questType);
                if (!template) {
                    await interaction.reply({ content: '❌ Unknown quest type.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📋 **${template.name.toUpperCase()} TEMPLATE**`)
                    .setDescription(template.description)
                    .addFields([
                        {
                            name: '📝 **Required Parameters**',
                            value: template.requiredParams.map(param => `• ${param}`).join('\n') || 'None',
                            inline: true
                        },
                        {
                            name: '⚙️ **Optional Parameters**',
                            value: template.optionalParams.map(param => `• ${param}`).join('\n') || 'None',
                            inline: true
                        },
                        {
                            name: '🎯 **Default Target**',
                            value: template.defaultTarget.toString(),
                            inline: true
                        }
                    ])
                    .setColor(0x00CED1);

                // Add examples
                if (template.examples && template.examples.length > 0) {
                    template.examples.forEach((example, index) => {
                        let exampleText = `**Target:** ${example.target}`;
                        if (example.specific_target) exampleText += `\n**Specific Target:** ${example.specific_target}`;
                        if (example.min_floor) exampleText += `\n**Min Floor:** ${example.min_floor}`;
                        if (example.max_floor) exampleText += `\n**Max Floor:** ${example.max_floor}`;
                        if (example.time_limit_minutes) exampleText += `\n**Time Limit:** ${example.time_limit_minutes} minutes`;
                        if (example.allow_death !== undefined) exampleText += `\n**Allow Death:** ${example.allow_death ? 'Yes' : 'No'}`;
                        
                        embed.addFields({
                            name: `📖 **Example ${index + 1}: ${example.title}**`,
                            value: `${example.description}\n\n${exampleText}`,
                            inline: false
                        });
                    });
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            } else {
                // Show all quest types overview
                const embed = new EmbedBuilder()
                    .setTitle('📋 **QUEST TEMPLATES OVERVIEW**')
                    .setDescription('Available quest types and their descriptions. Use `/create-quest templates quest_type:<type>` for detailed templates.')
                    .setColor(0x00CED1);

                Object.entries(QUEST_TYPE_CONFIGS).forEach(([key, config]) => {
                    embed.addFields({
                        name: `🎯 **${config.name}**`,
                        value: `${config.description}\n**Default Target:** ${config.defaultTarget}\n**Required:** ${config.requiredParams.join(', ')}`,
                        inline: true
                    });
                });

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
        }

        // Validate permissions for quest creation
        const password = interaction.options.getString('password');
        const permissionCheck = await validateQuestPermissions(serverId, userId, password);
        
        if (!permissionCheck.valid) {
            await interaction.reply({ 
                content: `❌ ${permissionCheck.message}`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        switch (sub) {
            case 'standard': {
                const questType = interaction.options.getString('type');
                const title = interaction.options.getString('title');
                const description = interaction.options.getString('description');
                const target = interaction.options.getInteger('target');

                // Collect all parameters
                const questParams = {
                    target,
                    specific_target: interaction.options.getString('specific_target'),
                    difficulty: interaction.options.getString('difficulty'),
                    time_limit_minutes: interaction.options.getInteger('time_limit_minutes'),
                    allow_death: interaction.options.getBoolean('allow_death'),
                    min_floor: interaction.options.getInteger('min_floor'),
                    max_floor: interaction.options.getInteger('max_floor'),
                    required_hero: interaction.options.getString('required_hero'),
                    forbidden_items: interaction.options.getString('forbidden_items'),
                    required_items: interaction.options.getString('required_items'),
                    category: interaction.options.getString('category'),
                    max_participants: interaction.options.getInteger('max_participants')
                };

                // Validate parameters
                const validation = validateQuestParameters(questType, questParams);
                if (!validation.valid) {
                    await interaction.reply({ 
                        content: `❌ **Parameter Validation Failed:**\n${validation.message}`, 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                // Apply default parameters for quest type
                const template = getQuestTemplate(questType);
                if (template.defaultParams) {
                    Object.entries(template.defaultParams).forEach(([key, value]) => {
                        if (questParams[key] === null || questParams[key] === undefined) {
                            questParams[key] = value;
                        }
                    });
                }

                const questData = {
                    id: generateQuestId(),
                    serverId,
                    createdBy: userId,
                    type: 'standard',
                    questType,
                    title,
                    description,
                    target,
                    parameters: questParams,
                    rewards: {
                        gold: interaction.options.getInteger('gold_reward') || 0,
                        xp: interaction.options.getInteger('xp_reward') || 0,
                        items: interaction.options.getString('item_rewards')?.split(',').map(item => item.trim()) || []
                    },
                    duration: interaction.options.getInteger('duration_hours') || 24,
                    status: 'active',
                    participants: [],
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + ((interaction.options.getInteger('duration_hours') || 24) * 60 * 60 * 1000))
                };

                await DatabaseManager.createGlobalQuest(questData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ **STANDARD QUEST CREATED**')
                    .setDescription(`Quest "${questData.title}" has been created and is now live!`)
                    .addFields([
                        {
                            name: '🎯 Quest Type',
                            value: questData.questType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            inline: true
                        },
                        {
                            name: '🎖️ Target',
                            value: questData.target.toString() + (questParams.specific_target ? ` (${questParams.specific_target})` : ''),
                            inline: true
                        },
                        {
                            name: '⏰ Duration',
                            value: `${questData.duration} hours`,
                            inline: true
                        }
                    ])
                    .setColor(0x00FF00)
                    .setTimestamp();

                // Add parameter details
                let paramDetails = [];
                if (questParams.difficulty) paramDetails.push(`**Difficulty:** ${questParams.difficulty}`);
                if (questParams.time_limit_minutes) paramDetails.push(`**Time Limit:** ${questParams.time_limit_minutes} minutes`);
                if (questParams.min_floor) paramDetails.push(`**Min Floor:** ${questParams.min_floor}`);
                if (questParams.max_floor) paramDetails.push(`**Max Floor:** ${questParams.max_floor}`);
                if (questParams.required_hero) paramDetails.push(`**Required Hero:** ${questParams.required_hero}`);
                if (questParams.allow_death === false) paramDetails.push(`**No Death Challenge:** Yes`);
                if (questParams.category) paramDetails.push(`**Category:** ${questParams.category}`);
                if (questParams.max_participants) paramDetails.push(`**Max Participants:** ${questParams.max_participants}`);

                if (paramDetails.length > 0) {
                    embed.addFields({
                        name: '⚙️ Parameters',
                        value: paramDetails.join('\n'),
                        inline: false
                    });
                }

                embed.addFields({
                    name: '💰 Rewards',
                    value: `Gold: ${questData.rewards.gold}\nXP: ${questData.rewards.xp}${questData.rewards.items.length > 0 ? `\nItems: ${questData.rewards.items.join(', ')}` : ''}`,
                    inline: false
                });

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                auditLogger.log('QUEST', `Standard quest created by ${userId} on server ${serverId}`, 'quest_created');
                break;
            }

            case 'whitelist': {
                const questData = {
                    id: generateQuestId(),
                    serverId,
                    createdBy: userId,
                    type: 'whitelist',
                    title: interaction.options.getString('title'),
                    description: interaction.options.getString('description'),
                    projectName: interaction.options.getString('project_name'),
                    wlSpots: interaction.options.getString('wl_spots'),
                    requirements: interaction.options.getString('requirements'),
                    socialTasks: interaction.options.getString('social_tasks'),
                    gameRequirements: interaction.options.getString('game_requirements'),
                    formUrl: interaction.options.getString('form_url'),
                    winnerSelection: interaction.options.getString('winner_selection') || 'random',
                    duration: interaction.options.getInteger('duration_hours') || 168,
                    status: 'active',
                    participants: [],
                    winners: [],
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + ((interaction.options.getInteger('duration_hours') || 168) * 60 * 60 * 1000))
                };

                await DatabaseManager.createGlobalQuest(questData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ **WHITELIST QUEST CREATED**')
                    .setDescription(`Whitelist quest "${questData.title}" has been created and is now live!`)
                    .addFields([
                        {
                            name: '🏢 Project',
                            value: questData.projectName,
                            inline: true
                        },
                        {
                            name: '🎫 WL Spots',
                            value: questData.wlSpots,
                            inline: true
                        },
                        {
                            name: '⏰ Duration',
                            value: `${questData.duration} hours`,
                            inline: true
                        },
                        {
                            name: '🏆 Winner Selection',
                            value: questData.winnerSelection.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            inline: true
                        },
                        {
                            name: '📋 Requirements',
                            value: questData.requirements,
                            inline: false
                        }
                    ])
                    .setColor(0x9932CC)
                    .setTimestamp();

                // Add optional fields if provided
                if (questData.socialTasks) {
                    embed.addFields({
                        name: '📱 Social Tasks',
                        value: questData.socialTasks,
                        inline: false
                    });
                }

                if (questData.gameRequirements) {
                    embed.addFields({
                        name: '🎮 Game Requirements',
                        value: questData.gameRequirements,
                        inline: false
                    });
                }

                if (questData.formUrl) {
                    embed.addFields({
                        name: '📝 Additional Form',
                        value: `[Complete Additional Requirements](${questData.formUrl})`,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                auditLogger.log('QUEST', `Whitelist quest created by ${userId} on server ${serverId}`, 'quest_created');
                break;
            }

            case 'special': {
                const rewardType = interaction.options.getString('reward_type');
                const rewardDetails = interaction.options.getString('reward_details');
                const sponsorInfo = interaction.options.getString('sponsor_info');
                const imageUrl = interaction.options.getString('image_url');
                const promotionalEmbed = interaction.options.getBoolean('promotional_embed') || false;
                const crossServer = interaction.options.getBoolean('cross_server') || false;
                const featuredPlacement = interaction.options.getBoolean('featured_placement') || false;
                const hashtagCampaign = interaction.options.getString('hashtag_campaign');

                // Calculate pricing
                const pricing = calculateQuestPricing({
                    reward_type: rewardType,
                    image_url: imageUrl,
                    promotional_embed: promotionalEmbed,
                    cross_server: crossServer,
                    featured_placement: featuredPlacement,
                    hashtag_campaign: hashtagCampaign
                });

                const questData = {
                    id: generateQuestId(),
                    serverId,
                    createdBy: userId,
                    type: 'special',
                    title: interaction.options.getString('title'),
                    description: interaction.options.getString('description'),
                    rewardType,
                    rewardDetails,
                    sponsorInfo,
                    imageUrl,
                    promotionalEmbed,
                    crossServer,
                    featuredPlacement,
                    hashtagCampaign,
                    pricing,
                    duration: interaction.options.getInteger('duration_hours') || 168,
                    status: 'pending_payment',
                    participants: [],
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + ((interaction.options.getInteger('duration_hours') || 168) * 60 * 60 * 1000))
                };

                await DatabaseManager.createGlobalQuest(questData);

                const embed = new EmbedBuilder()
                    .setTitle('💎 **SPECIAL QUEST CREATED**')
                    .setDescription(`Special quest "${questData.title}" has been created and is pending payment.`)
                    .addFields([
                        {
                            name: '🎁 Reward Type',
                            value: rewardType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            inline: true
                        },
                        {
                            name: '💰 Total Cost',
                            value: `$${pricing.total}`,
                            inline: true
                        },
                        {
                            name: '⏰ Duration',
                            value: `${questData.duration} hours`,
                            inline: true
                        },
                        {
                            name: '📋 Features Included',
                            value: pricing.features.join('\n'),
                            inline: false
                        }
                    ])
                    .setColor(0xFF6347)
                    .setTimestamp();

                // Add reward details
                embed.addFields({
                    name: '🏆 Reward Details',
                    value: rewardDetails,
                    inline: false
                });

                // Add sponsor info if provided
                if (sponsorInfo) {
                    embed.addFields({
                        name: '🏢 Sponsor Information',
                        value: sponsorInfo,
                        inline: false
                    });
                }

                // Add special features if enabled
                let specialFeatures = [];
                if (crossServer) specialFeatures.push('🌐 Cross-Server Enabled');
                if (featuredPlacement) specialFeatures.push('⭐ Featured Placement (24h)');
                if (hashtagCampaign) specialFeatures.push(`📱 Hashtag Campaign: #${hashtagCampaign}`);
                if (imageUrl) specialFeatures.push('🖼️ Custom Quest Image');

                if (specialFeatures.length > 0) {
                    embed.addFields({
                        name: '✨ Special Features',
                        value: specialFeatures.join('\n'),
                        inline: false
                    });
                }

                embed.addFields({
                    name: '💳 Payment Required',
                    value: 'Quest will go live after payment confirmation. You will receive payment instructions shortly.',
                    inline: false
                });

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                auditLogger.log('QUEST', `Special quest created by ${userId} on server ${serverId} - pending payment`, 'quest_created');
                break;
            }

            default:
                await interaction.reply({ content: '❌ Unknown quest creation command.', flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        logger.error('Create quest command error:', error);
        await interaction.reply({ content: `❌ Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        auditLogger.log('ERROR', `Create quest command ${sub} failed: ${error.message}`, 'quest_creation_error');
    }
} 