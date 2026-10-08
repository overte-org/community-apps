"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

/**
 * This is Incite
 *
 * @module incite
 */

/**
 * Default Incite nodes
 */
const Nodes = require("./Nodes/index.js");

/**
 * The Graph class
 *
 * @see Graph
 */
const Graph = require("./Graph.js");

/**
 * A helper for building Graph objects
 *
 * @see GraphBuilder
 */
const GraphBuilder = require("./GraphBuilder.js");

/**
 * InciteStore holds instantiated objects
 *
 * @see InciteStore
 */
const InciteStore = require("./InciteStore.js");

/**
 * Signal
 *
 * @see Signal
 */
const Signal = require("./Signal.js");


module.exports = {
    Nodes,
    Graph,
    GraphBuilder,
    InciteStore,
    Signal,
};
