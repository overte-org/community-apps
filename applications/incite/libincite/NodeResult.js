//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

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
        this.#error = options.error ?? undefined;
        this.#warnings = options.warnings ?? [];
        this.#valueChanged = options.valueChanged ?? false;
        this.#portResults = {};
    }

    /**
     * Create a NodeResult which is successful
     *
     * @param {number} graphId
     * @param {number} nodeId
     * @param {Object} options
     */
    static createSuccess(graphId, nodeId, options = {}) {
        return new NodeResult(graphId, nodeId, value, { ...options, success: true});
    }

    /**
     * Create a NodeResult with an error
     *
     * @param {number} graphId
     * @param {number} nodeId
     * @param {Object} options
     */
    static createFailure(graphId, nodeId, error, options = {}) {
        return new NodeResult(graphId, nodeId, null, {...options, success: false, error});
    }

    /**
     * The id of this NodeResult;
     * matches the id of the Node within the executed graph.
     *
     * @type {number}
     */
    get id() {
        return this.nodeId;
    }

    /**
     * The id of the graph this NodeResult is associated with
     *
     * @type {number}
     */
    get graphId() {
        return this.#graphId;
    }

    /**
     * The id of the node this NodeResult is associated with
     *
     * @type {number}
     */
    get nodeId() {
        return this.#nodeId;
    }

    /**
    * The success state of this result
    * Will be true if the node executed successfully
    *
    * @type {boolean}
    */
    get success() {
        return this.#success;
    }

    set success(state) {
        this.#success = state;
    }

    /**
     * The error provided by this NodeResult, if there is one. Otherwise, null.
     *
     * @type {Error|undefined}
     */
    get error() {
        return this.#error;
    }

    /**
     * @type {Array}
     */
    get warnings() {
        return this.#warnings;
    }

    /**
     * Whether the value may have changed since last execution.
     * This is usually set by a non-pure node,
     * and will be carried forward by pure nodes.
     * When true, the next Node will ignore it's cached output value(s)
     * and re-execute.
     *
     * @type {boolean}
     */
    get valueChanged() {
        return this.#valueChanged;
    }

    /**
     * @type {object<number, PortResult}
     */
    get portResults() {
        return Object.values(this.#portResults);
    }

    /**
     * Add a warning to this NodeResult.
     *
     * @returns {NodeResult}
     */
    addWarning(warning) {
        this.#warnings.push(warning);
        return this;
    }

    /**
     * Provide the error which caused this result to fail;
     * Setting an error causes this result to be marked as not successfull.
     *
     * @param {Error} error
     */
    setError(error) {
        this.#success = false;
        this.#error = error;
    }

    /**
     * Gets the PortResult with the given Id.
     *
     * @param {number} portResultId
     * @returns {PortResult}
     */
    getPortResult(portResultId) {
        return this.#portResults[portResultId];
    }

    /**
     * Set the PortResult associated with its Id.
     *
     * @param {PortResult} portResult
     */
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
