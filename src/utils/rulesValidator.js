import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger.js';

/**
 * RULES.txt Compliance Validator
 * Validates codebase against RULES.txt requirements
 */
export class RulesValidator {
    constructor() {
        this.validationRules = new Map();
        this.initializeValidationRules();
    }

    /**
     * Initialize validation rules based on RULES.txt requirements
     */
    initializeValidationRules() {
        // Core game design rules
        this.validationRules.set('STRING_MENUS_ONLY', {
            name: 'String Menus Only',
            description: 'Only string select menus allowed, no buttons per RULES.txt',
            severity: 'CRITICAL',
            patterns: {
                forbidden: [
                    /new\s+ButtonBuilder/g,
                    /\.addButton\(/g,
                    /\.setComponents\(.*button/gi,
                    /ButtonStyle\./g
                ],
                exceptions: [
                    /\/\*[\s\S]*?\*\//g,  // Block comments
                    /\/\/.*$/gm,          // Line comments
                    /["'`].*?["'`]/g      // String literals
                ]
            },
            rulesReference: 'RULES.txt line 6: String menu / Drop down menus only'
        });

        this.validationRules.set('NO_XP_SYSTEM', {
            name: 'No XP System',
            description: 'No experience points system per RULES.txt line 1183',
            severity: 'CRITICAL',
            patterns: {
                forbidden: [
                    /\bexperience\s*[=:]\s*\d+/gi,
                    /\bexp\s*[=:]\s*\d+/gi,
                    /\bxp\s*[=:]\s*\d+/gi,
                    /\.experience\s*[=+]/gi,
                    /\.exp\s*[=+]/gi,
                    /\.xp\s*[=+]/gi,
                    /gainExperience|gainXP|addXP|increaseXP/gi,
                    /levelUp|level_up/gi
                ],
                exceptions: [
                    /\/\*[\s\S]*?\*\//g,  // Block comments
                    /\/\/.*$/gm,          // Line comments
                    /["'`].*?["'`]/g,     // String literals
                    /example|comment|description|explanation|expect|export|express|explore|explain/gi
                ]
            },
            rulesReference: 'RULES.txt line 1183: There is NO XP or player/character experience points'
        });

        this.validationRules.set('NO_TIMER_DELAYS', {
            name: 'No Timer Delays',
            description: 'No timer delays after selections per RULES.txt',
            severity: 'CRITICAL',
            patterns: {
                forbidden: [
                    /setTimeout\([^,]*,[^)]*\)/g,
                    /setInterval\([^,]*,[^)]*\)/g,
                    /delay\(\d+\)/gi,
                    /wait\(\d+\)/gi,
                    /sleep\(\d+\)/gi
                ],
                exceptions: [
                    /monitoring|audit|check|cleanup|heartbeat|ping|retry|reconnect/gi,
                    /\/\*[\s\S]*?\*\//g,  // Block comments
                    /\/\/.*$/gm,          // Line comments
                    /["'`].*?["'`]/g      // String literals
                ]
            },
            rulesReference: 'RULES.txt line 8: NEVER add timer "delays" after ANY selection'
        });

        this.validationRules.set('EMBED_REPLIES_ONLY', {
            name: 'Embed Replies Only',
            description: 'Embeds must be replies except for exploration updates',
            severity: 'HIGH',
            patterns: {
                forbidden: [
                    /\.editReply\(/g,
                    /\.update\(/g
                ],
                exceptions: [
                    /exploration|explore|monitor|audit/gi,
                    /\/\*[\s\S]*?\*\//g,  // Block comments
                    /\/\/.*$/gm,          // Line comments
                    /["'`].*?["'`]/g      // String literals
                ]
            },
            rulesReference: 'RULES.txt line 7: Embeds are meant to be a REPLY unless they are Explore options'
        });

        this.validationRules.set('MENU_TIMEOUTS', {
            name: '30 Minute Menu Timeouts',
            description: 'All menu selections should have 30 minute timeout',
            severity: 'MEDIUM',
            patterns: {
                required: [
                    /time:\s*30\s*\*\s*60\s*\*\s*1000/g,
                    /1800000/g
                ]
            },
            rulesReference: 'RULES.txt: All menu selections should be a 30 min timeout'
        });

        this.validationRules.set('INFINITE_LOOP_FLOOR_20', {
            name: 'Infinite Loop After Floor 20',
            description: 'Game should loop infinitely after floor 20',
            severity: 'HIGH',
            patterns: {
                required: [
                    /floor.*20.*loop/gi,
                    /infinite.*loop/gi
                ]
            },
            rulesReference: 'RULES.txt: Looping: infinite game loop. After Floor 20, the game loops'
        });

        this.validationRules.set('INVENTORY_LIMITS', {
            name: 'Inventory Limits',
            description: 'Inventory limits: 20 weapons, 20 armor, unlimited gold',
            severity: 'HIGH',
            patterns: {
                required: [
                    /weapons.*20|20.*weapons/gi,
                    /armor.*20|20.*armor/gi
                ]
            },
            rulesReference: 'RULES.txt: Maximum 20 weapons, Maximum 20 armor items'
        });

        this.validationRules.set('HERO_UNLOCKING', {
            name: 'Hero Unlocking System',
            description: 'Heroes unlock at specific floors',
            severity: 'MEDIUM',
            patterns: {
                required: [
                    /unlockFloor|unlock.*floor/gi,
                    /floor.*10.*unlock|unlock.*floor.*10/gi
                ]
            },
            rulesReference: 'RULES.txt: Heroes unlock at specific floors'
        });

        this.validationRules.set('SIMULTANEOUS_COMBAT', {
            name: 'Simultaneous Combat',
            description: 'Combat should be simultaneous selection',
            severity: 'HIGH',
            patterns: {
                required: [
                    /simultaneous/gi,
                    /both.*select|select.*both/gi
                ]
            },
            rulesReference: 'RULES.txt: Simultaneous (both player and monster select a move)'
        });

        this.validationRules.set('DATA_PERSISTENCE', {
            name: 'Data Persistence Per User',
            description: 'Data should be stored per Discord user ID',
            severity: 'HIGH',
            patterns: {
                required: [
                    /userId|user.*id/gi,
                    /discord.*id/gi
                ]
            },
            rulesReference: 'RULES.txt: Game data is stored per Discord user ID'
        });
    }

    /**
     * Remove comments and strings from code to avoid false positives
     */
    sanitizeCode(code) {
        // Remove block comments
        let sanitized = code.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Remove line comments
        sanitized = sanitized.replace(/\/\/.*$/gm, '');
        
        // Remove string literals
        sanitized = sanitized.replace(/["'`](?:(?!["'`])[^\\]|\\.)*["'`]/g, '""');
        
        return sanitized;
    }

    /**
     * Check if a match is in an exception context
     */
    isExceptionContext(match, exceptions, fullCode) {
        if (!exceptions || exceptions.length === 0) return false;
        
        for (const exception of exceptions) {
            if (exception.test(match)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Validate a single file against all rules
     */
    validateFile(filePath) {
        const violations = [];
        
        try {
            if (!fs.existsSync(filePath)) {
                return violations;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const sanitizedContent = this.sanitizeCode(content);
            
            for (const [ruleId, rule] of this.validationRules.entries()) {
                // Check forbidden patterns
                if (rule.patterns.forbidden) {
                    for (const pattern of rule.patterns.forbidden) {
                        const matches = sanitizedContent.match(pattern);
                        if (matches) {
                            for (const match of matches) {
                                if (!this.isExceptionContext(match, rule.patterns.exceptions, content)) {
                                    violations.push({
                                        rule: ruleId,
                                        severity: rule.severity,
                                        message: `${rule.description}`,
                                        file: filePath,
                                        match: match,
                                        line: this.getLineNumber(content, match)
                                    });
                                }
                            }
                        }
                    }
                }

                // Check required patterns (for some rules)
                if (rule.patterns.required) {
                    let hasRequired = false;
                    for (const pattern of rule.patterns.required) {
                        if (pattern.test(sanitizedContent)) {
                            hasRequired = true;
                            break;
                        }
                    }
                    
                    if (!hasRequired && this.isRelevantFile(filePath, ruleId)) {
                        violations.push({
                            rule: ruleId,
                            severity: rule.severity,
                            message: `Missing required pattern for ${rule.name}`,
                            file: filePath,
                            match: 'Missing required implementation',
                            line: 1
                        });
                    }
                }
            }
        } catch (error) {
            logger.error(`Error validating file ${filePath}:`, error);
        }

        return violations;
    }

    /**
     * Check if a file is relevant for a specific rule
     */
    isRelevantFile(filePath, ruleId) {
        const relevantFiles = {
            'MENU_TIMEOUTS': ['Handler', 'interaction'],
            'INFINITE_LOOP_FLOOR_20': ['Floor', 'Battle', 'progression'],
            'INVENTORY_LIMITS': ['Inventory', 'Item'],
            'HERO_UNLOCKING': ['Hero', 'Selection'],
            'SIMULTANEOUS_COMBAT': ['Battle', 'Combat'],
            'DATA_PERSISTENCE': ['Database', 'GameState']
        };

        const relevantTerms = relevantFiles[ruleId];
        if (!relevantTerms) return false;

        return relevantTerms.some(term => filePath.includes(term));
    }

    /**
     * Get line number for a match in content
     */
    getLineNumber(content, match) {
        const index = content.indexOf(match);
        if (index === -1) return 1;
        
        return content.substring(0, index).split('\n').length;
    }

    /**
     * Validate all JavaScript files in the project
     */
    validateProject(projectPath = './src') {
        const allViolations = [];
        
        const scanDirectory = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(itemPath);
                } else if (item.endsWith('.js') || item.endsWith('.mjs')) {
                    const violations = this.validateFile(itemPath);
                    allViolations.push(...violations);
                }
            }
        };

        if (fs.existsSync(projectPath)) {
            scanDirectory(projectPath);
        }

        return allViolations;
    }

    /**
     * Generate compliance report
     */
    generateReport(violations) {
        const report = {
            timestamp: new Date().toISOString(),
            totalViolations: violations.length,
            criticalViolations: violations.filter(v => v.severity === 'CRITICAL').length,
            highViolations: violations.filter(v => v.severity === 'HIGH').length,
            mediumViolations: violations.filter(v => v.severity === 'MEDIUM').length,
            violations: violations,
            compliance: violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT'
        };

        return report;
    }

    /**
     * Get violation summary by rule
     */
    getViolationSummary(violations) {
        const summary = new Map();
        
        for (const violation of violations) {
            if (!summary.has(violation.rule)) {
                summary.set(violation.rule, {
                    count: 0,
                    files: new Set(),
                    severity: violation.severity
                });
            }
            
            const rule = summary.get(violation.rule);
            rule.count++;
            rule.files.add(violation.file);
        }

        return Array.from(summary.entries()).map(([rule, data]) => ({
            rule,
            count: data.count,
            files: Array.from(data.files),
            severity: data.severity
        }));
    }

    /**
     * Get repair recommendations for violations
     */
    getRepairRecommendations(violations) {
        const recommendations = [];
        
        for (const violation of violations) {
            const rule = this.validationRules.get(violation.rule);
            if (rule) {
                recommendations.push({
                    file: violation.file,
                    line: violation.line,
                    violation: violation.rule,
                    recommendation: this.getRepairAction(violation.rule, violation.match),
                    severity: violation.severity,
                    reference: rule.rulesReference
                });
            }
        }

        return recommendations;
    }

    /**
     * Get specific repair action for a violation
     */
    getRepairAction(ruleId, match) {
        const actions = {
            'STRING_MENUS_ONLY': 'Replace button implementation with StringSelectMenuBuilder',
            'NO_XP_SYSTEM': 'Remove experience/XP system implementation',
            'NO_TIMER_DELAYS': 'Remove setTimeout/setInterval delays after user selections',
            'EMBED_REPLIES_ONLY': 'Change to use reply() instead of editReply() except for exploration',
            'MENU_TIMEOUTS': 'Add 30-minute timeout to menu selections',
            'INFINITE_LOOP_FLOOR_20': 'Implement infinite loop system after floor 20',
            'INVENTORY_LIMITS': 'Implement inventory limits (20 weapons, 20 armor)',
            'HERO_UNLOCKING': 'Add hero unlocking system based on floor progression',
            'SIMULTANEOUS_COMBAT': 'Implement simultaneous combat selection',
            'DATA_PERSISTENCE': 'Store data per Discord user ID'
        };

        return actions[ruleId] || 'Review and fix according to RULES.txt';
    }
}

// Export singleton instance
export const rulesValidator = new RulesValidator(); 