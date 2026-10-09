//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Logger = require("./Logger.js");
const Graph = require('./Graph.js');
const Signal = require('./Signal.js');

/**
 * Keeps track of all of the currently loaded Incite Graphs
 */
class GraphManager {
    #graphs
    #graphsById

    #nextId
    #availableIds

    constructor() {
        this.#graphs = new Set();
        this.#graphsById = new Map();
        this.#nextId = 0;
        this.#availableIds = [];
        Logger.log("new GraphManager");
    }

    /**
     * Get a copy of all current graphs
     *
     * @returns {Array}
     */
    get graphs() {
        return [ ... this.#graphs ];
    }

    /**
     * Add a graph
     *
     * @param {Graph} node - Instance of a Graph
     * @returns {number} new graph id
     */
    addGraph(graph) {
        const id = this.#availableIds.length > 0 ? this.#availableIds.pop() : this.#nextId++;
        graph.id = id; // TODO: Make graph IDs unique
        this.#graphs.add(graph);
        this.#graphsById.set(id, graph);
        Logger.log("addGraph", graph.id);
        Logger.log("Graph", graph.id, "is", this.#graphsById.get(graph.id).id);
        this.graphAddedEvent.emit(id); // TODO: Only emit if successfully added
        return id;
    }

    /**
     * Get the specified graph
     *
     * @param {number} graphId
     * @returns {Graph}
     */
    getGraph(graphId) {
        return this.#graphsById.get(graphId);
    }

    /**
     * Delete a node from this graph by its id
     *
     * @param {number} graphId
     */
    deleteGraph(graphId) {
        Logger.log("GraphManager 1 Deleted graph");
        const graph = this.#graphsById.get(graphId);

        Logger.log("GraphManager 2 Deleted graph");
        for (const node of graph.nodes) {
            graph.nodeRemovedEvent.emit(node.id);
        }
        this.graphDeletedEvent.emit(graphId);
        this.#graphs.delete(graph);
        this.#graphsById.delete(graphId);
        this.#availableIds.push(graphId);
    }

    /**
     * Emits when a Graph is loaded
     *
     * @type {Signal<(graphId: number) => void>}
     */
    graphAddedEvent = new Signal("GraphAddedEvent");

    /**
     * Emits when a Graph is removed
     *
     * @type {Signal<(graphId: number) => void>}
     */
    graphDeletedEvent = new Signal("GraphDeletedEvent");
}

module.exports = GraphManager;
