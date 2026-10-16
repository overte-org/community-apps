//
//  Created by RTUnreal, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * Logger for libtactile
 */
class Logger {
    #enableLog
    #enableDebug
    #enableInfo
    #enableWarn
    #enableError

    constructor() {
        this.#enableLog = true;
        this.#enableDebug = false
        this.#enableInfo = false;
        this.#enableWarn = false;
        this.#enableError = false;
    }

    log(...args) {
        if (this.#enableLog) {
            console.log(...args);
        }
    }

    debug(...args) {
        if (this.#enableDebug) {
            console.log(...args);
        }
    }

    info(...args) {
        if (this.#enableInfo) {
            console.info(...args);
        }
    }

    warn(...args) {
        if (this.#enableWarn) {
            console.warn(...args);
        }
    }

    error(...args) {
        if (this.#enableError) {
            console.error(...args);
        }
    }
}

module.exports = new Logger(); // Cached, so only one instance is created
