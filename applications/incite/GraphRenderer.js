"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const incite = require("./libincite/incite.js");
const NodeRenderer = require("./NodeRenderer.js");

/**
 * Renders graph data into an Overte domain
 */
class GraphRenderer {
    /**
     * The id of the Graph to render
     */
    #graphId;

    /**
     * The ID of this GraphRenderer
     */
    #rendererId;

    /**
     * The ID of the root entity representing the Graph
     */
    #graphEntityId

    /**
     * Renderers for Nodes within this Graph
     */
    #nodeRenderers

    /**
     * Renderers for Connections within this Graph
     */
    #renderedConnections


    /**
     * The id of the Graph to render
     */
    get graphId() {
        return this.#graphId;
    }

    /**
     * The id of the root entity representing the Graph
     */
    get graphEntityId() {
        return this.#graphEntityId;
    }

    /**
     * The Graph to render
     */
    get graph() {
        return incite.InciteStore.graphManager.getGraph(this.#graphId);
    }


    constructor(graphId, data = {}) {
        console.log("GraphRenderer", graphId, data);
        this.#graphId = graphId;
        this.#nodeRenderers = data.nodeRenderers ?? new Map();
        this.#renderedConnections = data.renderedConnections ?? new Map();

        this.renderGraph();

        for (const node of this.graph.nodes) {
            console.log("GraphRenderer constructing nodeRenderer for ", node);
            this.addNodeRenderer(node.id);
        }

        this.#subscribe();

        console.log("GraphRenderer Started");
    }

    #subscribe() {
        console.log("GraphRenderer graphId:",this.#graphId);
        const graph = this.graph;

        graph.GraphUpdatedEvent.connect(this.update.bind(this));
        incite.InciteStore.graphManager.graphDeletedEvent.connect(this.end.bind(this));

        // Nodes
        graph.nodeRemovedEvent.connect(this.removeNode.bind(this));
    }

    /**
     * The NodRenderer associated with a particular node
     * @param {number} nodeId
     * @returns {NodeRenderer}
     */
    getNodeRenderer(nodeId) {
        return this.#nodeRenderers.get(nodeId);
    }

    /**
     * Compares fresh graph data with data from the previous frame.
     * Prepares for the next render frame.
     * @param {number} graphId - The id for the graph to render
     * @param {Array<number>} changedNodeIds - An array of nodes which may need to be rerendered
     */
    update(graphId, changedNodeIds) {
        console.log("GraphRenderer update", graphId, changedNodeIds);
        // Check nodes to see which are marked as updated
        for (const nodeId of changedNodeIds) {
            const node = this.graph.getNode(nodeId);
            // Queue changes as Render Commands
            // const renderCommand = new RenderCommand(RenderCommand.REDRAW,
            //                                         RenderCommand.entityType.NODE,
            //                                         node);
            // this.#renderCommands.push(renderCommand);

            // Call Render method
            this.renderNode(nodeId)

            // Mark dones as not updated
            node.updated = false;
        }

    }

    /**
     * Add a new NodeRenderer for the specified node
     * @param {number} nodeId - The ID of the node
     * @return {NodeRenderer} - The new NodeRenderer object for the specified node
     */
    addNodeRenderer(nodeId) {
        const nodeRenderer = new NodeRenderer(this, nodeId);
        this.#nodeRenderers.set(nodeId, nodeRenderer);
        return nodeRenderer;
    }

    /**
     * (Re)render the given node; will create a NodeRender as required.
     * @param {number} nodeId
     */
    renderNode(nodeId) {
        console.log("GraphRenderer renderNode", nodeId);
        let nodeRenderer = this.#nodeRenderers.get(nodeId);
        if (!nodeRenderer) {
            console.log("GraphRenderer renderNode", nodeId, "!nodeRenderer");
            nodeRenderer = this.addNodeRenderer(nodeId);
        } else {
            console.log("Cannot create new NodeRenderer for", nodeId, "nodeRenderer already exists for this node.");
        }

        nodeRenderer.render();
    }

    /**
     * Updates the in-domain representation of the graph
     */
    render() {

        // Process render queue

    }

    /**
     * Renders the graph to the domain
     */
    renderGraph() {
        if (!this.#graphEntityId) {
            this.#graphEntityId = Entities.addEntity({
                type: "Grid",
                name: "Incite Graph "+this.#graphId,
                position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -2 })),
                rotation: MyAvatar.orientation,
                dimensions: { x: 10.0, y: 10.0, z: 0.01 },
                alpha: 0.5,
                followCamera: false,
                majorGridEvery: 1,
                minorGridEvery: 0.2
            });
        } else {
            console.warn("Could not render new graphEntity; one already exists!");
        }
    }

    /**
     * Remove the node from this graph
     * This is distinct from deletion // TODO: Make this distinct from deletion
     */
    removeNode(nodeId) {
        console.log("removeNode: Graph", this.#graphId, "node", nodeId)
        this.getNodeRenderer(nodeId).deleteEntities();
        this.#nodeRenderers.delete(nodeId);
    }

    /**
     * Delete the in-domain representation of the Graph
     */
    deleteGraphEntity() {
        console.log("Deleting Graph entity", this.#graphEntityId);
        Entities.deleteEntity(this.#graphEntityId);
    }

    /**
     * Final clean-up task of this GraphRenderer
     */
    end(graphId) {
        if(graphId != this.graphId) return;

        console.log("GraphRenderer end graph");
        const graph = this.graph;

        //graph.GraphUpdatedEvent.disconnect(this.update.bind(this));
        incite.InciteStore.graphManager.graphDeletedEvent.disconnect(this.end.bind(this));
        graph.nodeRemovedEvent.connect(this.removeNode.bind(this));

        this.deleteGraphEntity();
    }
}

module.exports = GraphRenderer;
