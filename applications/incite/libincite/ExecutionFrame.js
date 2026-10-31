//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

class ExecutionFrame {
    #graphId;
    #frameId;
    #results;
    #history;

    constructor(graphId, frameId) {
        this.#graphId = graphId;
        this.#frameId = frameId;
        this.#results = {};
        this.#history = [];
        this.executionSuccess = true;
    }

    /**
     * The ID of the graph this execution frame belongs to.
     *
     * @type {number}
     **/
    get graphId() {
        return this.#graphId;
    }


    /**
     * The ID of this execution frame,
     * unique for the associated graph
     *
     * @type {number}
     * */
    get id() {
        return this.#frameId;
    }

    /**
     * Each node ports' results from this execution.
     *
     * @type {Object<number, NodeResult>}
     **/
    get results() {
        return this.#results;
    }

    /**
     * The sequence of results,
     * in the order they were executed in.
     *
     * @type {Array<NodeResult>}
     **/
    get history() {
        return this.#history;
    }

    /**
     * Gets the NodeResult which matches the provided ID.
     *
     * @param {number} resultId;
     * @returns {NodeResult}
     */
    getNodeResult(resultId) {
        return this.#results[resultId];
    }

    /**
     * Record the provided NodeResult as part of this execution frame.
     *
     * @param {NodeResult} nodeResult
     */
    storeNodeResult(nodeResult) {
        this.#results[nodeResult.id] = nodeResult; // TODO
        this.#history.push(nodeResult);
        if (!nodeResult.resultState && this.executionSuccess) this.executionSuccess = false;
    }

}

module.exports = ExecutionFrame;
