"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const incite = require("./libincite/incite.js");

/**
 * Renders graph data into an Overte domain
 */
class NodeRenderer {
    #graphRenderer
    #nodeId;
    #entities

    get #graph() {
        return incite.InciteStore.graphManager.getGraph(this.#graphRenderer.graphId);
    }

    get #node() {
        return this.#graph.getNode(this.#nodeId);
    }

    /**
     * @param {number} graphId
     * @param {number} nodeId
     */
    constructor(graphRenderer, nodeId) {
        console.log("NodeRender");
        this.#graphRenderer = graphRenderer;
        this.#nodeId = nodeId;
        this.#entities = new Set();

        this.setup();
    }

    setup() {
    console.log("Node Render setup");
        // get node
        const node = this.#node;

        const graphEntityId = this.#graphRenderer.graphEntityId;

        const properties = Entities.getEntityProperties(graphEntityId, "position");

        console.log("Graph entity", graphEntityId, "position", properties.position);

        const nodeEntityId = Entities.addEntity({
            type: "Box",
            name: "Incite Node "+node.id,
            parentID: graphEntityId,
            position: properties.position,
            dimensions: [0.5, 0.5, 0.2],
            dynamic: true,
            collisionless: false,
            grab: { grabbable: true, kinematic: false },

        });

        console.log("New node entity", nodeEntityId);

        this.#entities.add(nodeEntityId);
    }

    subscribe() {
    }

    /**
     * Updates the in-domain representation of the graph
     */
    render() {

        // Process render queue

    }

    deleteEntities() {
        for (let i = this.#entities.length -1; i >= 0; i--) {
            Entities.deleteEntity(entities[i]);
        };
    }

    end() {
        this.deleteEntities();
    }
}

module.exports = NodeRenderer;
