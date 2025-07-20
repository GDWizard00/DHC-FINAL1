/**
 * Logger utility for the Dungeonites Heroes Challenge bot
 */

class Logger {
    constructor() {
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m'
        };
    }

    _getTimestamp() {
        return new Date().toISOString();
    }

    _formatMessage(level, message, data = null) {
        const timestamp = this._getTimestamp();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data) {
            formattedMessage += '\n' + (typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
        }
        
        return formattedMessage;
    }

    info(message, data = null) {
        const formattedMessage = this._formatMessage('INFO', message, data);
        console.log(`${this.colors.green}${formattedMessage}${this.colors.reset}`);
    }

    warn(message, data = null) {
        const formattedMessage = this._formatMessage('WARN', message, data);
        console.warn(`${this.colors.yellow}${formattedMessage}${this.colors.reset}`);
    }

    error(message, data = null) {
        const formattedMessage = this._formatMessage('ERROR', message, data);
        console.error(`${this.colors.red}${formattedMessage}${this.colors.reset}`);
    }

    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            const formattedMessage = this._formatMessage('DEBUG', message, data);
            console.log(`${this.colors.cyan}${formattedMessage}${this.colors.reset}`);
        }
    }

    game(message, userId = null, data = null) {
        const userInfo = userId ? ` [User: ${userId}]` : '';
        const formattedMessage = this._formatMessage('GAME' + userInfo, message, data);
        console.log(`${this.colors.magenta}${formattedMessage}${this.colors.reset}`);
    }
}

export const logger = new Logger();
export default logger; 