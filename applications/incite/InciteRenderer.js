"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

/**
 * @typedef {Object} RenderData
 * @Property {Array<Object>] graphs
 * @Property {Array<Object>} nodes
 * @Property {Array<Object>} connections
 */

const incite = require("./libincite/incite.js");
const GraphRenderer = require("./GraphRenderer.js");

/**
 * Renders graph data into and Overte domain
 */
class InciteRenderer {
    #renderData
    #graphRenderers

    constructor() {
        this.#renderData = {};
        this.#graphRenderers = new Map();

        this.subscribe();
    }

    /**
     * @private
     */
    subscribe() {
        Script.scriptEnding.connect(this.end.bind(this));
        incite.InciteStore.graphManager.graphAddedEvent.connect(this.graphCreated.bind(this))
    }

    /**
     * @private
     */
    graphCreated(graphId) {
        this.#graphRenderers.set(graphId, new GraphRenderer(graphId));
    }

    /**
     * Compares fresh graph data with data from the previous frame.
     * Prepares for the next render frame.
     */
    update() {

        // Update the graphs
        this.#graphRenderers.get(0).update();
    }

    /**
     * Updates the in-domain representation of the graph
     */
    render() {

        // Render the graphs
        this.#graphRenderers.get(0).render();

    }

    /**
     * @private
     */
    end() {
        incite.InciteStore.graphManager.graphAddedEvent.disconnect(this.graphCreated.bind(this));
        Script.scriptEnding.disconnect(this.end.bind(this));
    }
}

module.exports = new InciteRenderer();
