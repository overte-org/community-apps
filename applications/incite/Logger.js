//
//  Created by RTUnreal, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * Logger for the Incite App
 */
class Logger {
    #enableLog
    #enableDebug
    #enableInfo
    #enableWarn
    #enableError

    static loggerName = "ia";

    constructor() {
        this.#enableLog = true;
        this.#enableDebug = false;
        this.#enableInfo = true;
        this.#enableWarn = true;
        this.#enableError = true;
    }

    log(...args) {
        if (this.#enableLog) {
            console.log(`${Logger.loggerName}:`, ...args);
        }
    }

    debug(...args) {
        if (this.#enableDebug) {
            console.log(`${Logger.loggerName}:`, ...args);
        }
    }

    info(...args) {
        if (this.#enableInfo) {
            console.info(`${Logger.loggerName}:`, ...args);
        }
    }

    warn(...args) {
        if (this.#enableWarn) {
            console.warn(`${Logger.loggerName}:`, ...args);
        }
    }

    error(...args) {
        if (this.#enableError) {
            console.error(`${Logger.loggerName}:`, ...args);
        }
    }

    /**
     * Enable or disable logging debug messages
     */
    showDebug(bool) {
        this.#enableDebug = bool;
    }
}

module.exports = new Logger(); // Cached, so only one instance is created
