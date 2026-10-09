//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const NodeRegistry = require("./NodeRegistry.js");
const GraphManager = require("./GraphManager.js");

/**
 * Store for all your inciteful needs.
 *
 * @example
 * // Load Incite
 * const incite = require("https://github.com/overte-org/community-aps/applications/incite/libincite/incite.js");
 * // Get InciteStore instance
 * const inciteStore = incite.InciteStore;
 */
class InciteStore {
    #nodeRegistry
    #graphManager

    constructor(data = {}) {
        this.#nodeRegistry = new NodeRegistry();
        this.#graphManager = new GraphManager();
    }

    /**
     * The NodeRegistry instance.
     *
     * @type {NodeRegistry}
     *
     * @example
     * // Load Incite
     * const incite = require("https://github.com/overte-org/community-aps/applications/incite/libincite/incite.js");
     * // Access nodeRegistry instance via InciteStore
     * const nodeRegistry = incite.InciteStore.nodeRegistry;
     */
    get nodeRegistry() {
        return this.#nodeRegistry;
    }

    /**
     * The GraphManager instance.
     *
     * @type {GraphManager}
     *
     * @example
     * // Load Incite
     * const incite = require("https://github.com/overte-org/community-aps/applications/incite/libincite/incite.js");
     * // Access graphManager instance via InciteStore
     * const graphManager = incite.InciteStore.graphManager;
     */
    get graphManager() {
        return this.#graphManager;
    }

    toJSON() {
        return {
            nodeRegistry: this.#nodeRegistry,
            graphManager: this.#graphManager
        }
    }

}

module.exports = new InciteStore(); // Cached, so only one instance is created
