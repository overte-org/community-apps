//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Graph = require("./Graph.js");
const Node = require("./Nodes/Node.js");
const InciteStore = require("./InciteStore.js");

/**
 * Builds graphs from a variety of sources and for varying contexts.
 */
class GraphBuilder {
    constructor(data = {}) {
        this._id = null;
        this._url = null;
        this._nodes = [];
        this._connections = [];
        this._assertions = [];
    }

    /**
     * Set the Graph's Id
     *
     * @param {number} id
     * @returns {GraphBuilder}
     */
    setId(id) {
        this._id = id;
        return this;
    }

    /**
     * Set the graph's Url
     *
     * @param {string} url
     * @returns {GraphBuilder}
     */
    setUrl(url) {
        this._url = url;
        return this;
    }

    /**
     * Add a node to the graph
     *
     * @param {Node} node
     * @returns {GRaphBuilder}
     */
    addNode(node) {
        this._nodes.push(node);
        return this;
    }

    /**
     * Add a collection of nodes to the graph
     *
     * @param {Array<Node>} nodes
     * @returns {GraphBuilder}
     */
    addNodes(nodes) {
        this._nodes.push(...nodes);
        return this;
    }

    /**
     * Add a connection between nodes in the graph
     *
     * @param {Object} connection
     * @returns {GraphBuilder}
     */
    addConnection(connection) {
        this._connections.push(connection);
        return this;
    }

    /**
     * Add a collection of connections between nodes in the graph
     *
     * @param {Array<Object>} connections
     * @returns {GraphBuilder}
     */
    addConnections(connections) {
        this._connections.push(...connections);
        return this;
    }

    /**
     * Add an assertion
     *
     * @param {Object} assertion
     * @returns {GraphBuilders}
     */
    addAssertion(assertion) {
        this._assertions.push(assertion);
        return this;
    }

    /**
     * Add a collection of assertions
     *
     * @param {Array<Object>} assertions
     * @returns {GraphBuilders}
     */
    addAssertions(assertions) {
        this._assertions.push(...assertions);
        return this;
    }

    /**
     * Build a new Graph object with the data provided.
     *
     * @returns {Graph}
     */
    build() {
        const graph = new Graph({
            id: this._id,
            url: this._url,
            nodes: this._nodes,
            connections: this._connections,
            assertions: this._assertions
        });

        // Let the node know which graph it is a part of
        for (const nodeIndex in graph.nodes) {
            graph.nodes[nodeIndex].graph = graph;
        }
        return graph;
    }

    /**
     * Loads Graph data from json. Accepts partial data.
     *
     * @param {(string|object)} jsonData - JSON string or object
     * @return {GraphBuilder}
     */
    fromJson(jsonData) {
        const data = typeof jsonData == 'string'
                        ? JSON.parse(jsonData)
                        : jsonData;

        // TODO: Improve validation
        if (data.id != undefined) this._id = data.id;
        if (data.url != undefined) this._url = data.url;
        if (data.nodes != undefined) {
            const nodeRegistry = InciteStore.nodeRegistry;
            for (const index in data.nodes) {
                const nodeData = data.nodes[index];
                const node = nodeRegistry.get(nodeData.type);
                const graphNode = new node({
                    id: Number(index),
                    data: nodeData.data ?? {}
                });
                //console.log(graphNode);
                this._nodes.push(graphNode);
            }
        }
        if (data.connections != undefined) {
            for (const index in data.connections) {
                const connectionData = data.connections[index];
                this._connections.push(connectionData);
            }
        }
        if (data.assertions != undefined) {
            for (const index in data.assertions) {
                const connectionData = data.assertions[index];
                this._assertions.push(connectionData);
            }
        }

        return this;
    }

    /**
     * Resets all data associated with this GraphBuilder.
     *
     * @return {GraphBuilder}
     */
    reset() {
        this._id = null;
        this._url = url;
        this._nodes = [];
        this._connections = [];
        this._assertions = [];
        return this;
    }


}

module.exports = GraphBuilder;
