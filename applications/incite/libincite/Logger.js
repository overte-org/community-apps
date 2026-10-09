//
//  Created by RTUnreal, 2026
//  Copyright 2026 Overte e.V.
//

/**
 * Logger for libincite
 */
class Logger {
    #enableLog
    #enableInfo
    #enableWarn
    #enableError

    constructor() {
        this.#enableLog = false;
        this.#enableInfo = false;
        this.#enableWarn = false;
        this.#enableError = false;
    }

    log(...args) {
        if (this.#enableLog) {
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
