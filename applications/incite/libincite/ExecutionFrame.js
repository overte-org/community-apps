//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

class ExecutionFrame {
    /**
     * The ID of the graph this execution frame belongs to.
     **/
    #graphId;

    /**
     * The ID of this execution frame,
     * unique for the associated graph
     * */
    #frameId;

    /**
     * Each node ports' results from this execution.
     **/
    #results;

    /**
     * The sequence of results,
     * in the order they were executed in.
     **/
    #history;

    constructor(graphId, frameId) {
        this.#graphId = graphId;
        this.#frameId = frameId;
        this.#results = {};
        this.#history = [];
        this.executionSuccess = true;
    }

    get graphId() {
        return this.#graphId;
    }

    get id() {
        return this.#frameId;
    }

    get results() {
        return this.#results;
    }

    get history() {
        return this.#history;
    }

    /*
     * Gets the InciteResult which matches the provided ID.
     * An InciteID is a combination of the Node's ID and the port ID;
     * <nodeId>:<portId>, e.g. 3:0
     */
    getNodeResult(resultId) {
        return this.#results[resultId];
    }

    storeNodeResult(nodeResult) {
        this.#results[nodeResult.id] = nodeResult; // TODO
        this.#history.push(nodeResult);
        if (!nodeResult.resultState && this.executionSuccess) this.executionSuccess = false;
    }

}

module.exports = ExecutionFrame;
