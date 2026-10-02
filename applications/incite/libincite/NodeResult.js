//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const InciteResult = require("./InciteResult.js");

/**
 * A wrapper for the output value of a node after execution.
 */
class NodeResult {

    #graphId
    #nodeId
    #success
    #error
    #warnings
    #valueChanged
    #portResults

    constructor(graphId, nodeId, options = {}) {
        this.#graphId = graphId;
        this.#nodeId = nodeId;
        this.#success = options.success ?? true;
        this.#error = options.error ?? null;
        this.#warnings = options.warnings ?? [];
        this.#valueChanged = options.valueChanged ?? false;
        this.#portResults = {};
    }

    static success(graphId, nodeId, options = {}) {
        return new InciteResult(graphId, nodeId, value, { ...options, success: true});
    }

    static failure(graphId, nodeId, error, options = {}) {
        return new InciteResult(graphId, nodeId, null, {...options, success: false, error});
    }

    /**
     * The id of this NodeResult;
     * matches the id of the Node within the executed graph.
     */
    get id() {
        return this.nodeId;
    }

    get graphId() {
        return this.#graphId;
    }

    get nodeId() {
        return this.#nodeId;
    }

    /**
    * The success state of this result
    * Will be true if the node executed successfully
    */
    get success() {
        return this.#success;
    }

    set success(state) {
        this.#success = state;
    }

    get error() {
        return this.#error;
    }

    get warnings() {
        return this.#warnings;
    }

    /**
     * Whether the value may have changed since last execution.
     * This is usually set by a non-pure node,
     * and will be carried forward by pure nodes.
     * When true, the next Node will ignore it's cached output value(s)
     * and re-execute.
     */
    get valueChanged() {
        return this.#valueChanged;
    }

    get portResults() {
        return Object.values(this.#portResults);
    }

    addWarning(warning) {
        this.#warnings.push(warning);
        return this;
    }

    /**
     * Provide the error which caused this result to fail;
     * Setting an error causes this result to be marked as not successfull.
     */
    setError(error) {
        this.#success = false;
        this.#error = error;
    }

    getPortResult(portResultId) {
        return this.#portResults[portResultId];
    }

    setPortResult(portResult) {
        this.#portResults[portResult.id] = portResult; // TODO verify is PortResult
    }

    toJSON() {
        return {
            id: this.id,
            graphId: this.graphId,
            nodeId: this.nodeId,
            success: this.success,
            error: this.error,
            warnings: this.warnings,
            valueChanged: this.valueChanged,
            portResults: this.portResults
        }
    }

}

module.exports = NodeResult;
