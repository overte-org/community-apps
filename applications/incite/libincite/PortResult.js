//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * A wrapper for the output value of a port after execution.
 */
class PortResult {

    #graphId
    #nodeId
    #portId
    #success
    #error
    #warnings
    #value
    #valueChanged

    constructor(graphId, nodeId, portId, value, options = {}) {
        this.#graphId = graphId;
        this.#nodeId = nodeId;
        this.#portId = portId;
        this.#success = options.success ?? true;
        this.#error = options.error ?? undefined;
        this.#warnings = options.warnings ?? [];
        this.#value = value;
        this.#valueChanged = options.valueChanged ?? false;
    }

    /**
     * Create a PortResult which is successful
     *
     * @param {number} graphId
     * @param {number} nodeId
     * @param {number} portId
     * @param {*} value
     * @param {Object} options
     * @returns {PortResult}
     */
    static createSuccess(graphId, nodeId, portId, value, options = {}) {
        return new PortResult(graphId, nodeId, portId, value, { ...options, success: true});
    }

    /**
     * Creates a failed PortResult with the provided error.
     *
     * @param {number} graphId
     * @param {number} nodeId
     * @param {number} portId
     * @param {Error} error
     * @param {Object} options
     * @returns {PortResult}
     */
    static createFailure(graphId, nodeId, portId, error, options = {}) {
        return new PortResult(graphId, nodeId, portId, null, {...options, success: false, error});
    }

    /**
     * The Id of the graph this PortResult is associated with
     *
     * @type {number}
     */
    get graphId() {
        return this.#graphId;
    }

    /**
     * The Id of the node with PortResult is associated with.
     *
     * @type {number}
     */
    get nodeId() {
        return this.#nodeId;
    }

    /**
     * The Id of the port of this PortResult.
     *
     * @type {number}
     */
    get portId() {
        return this.#portId;
    }

    /**
     * The Id of this PortResult, unique within the NodeResult.
     */
    get id() {
        return this.#portId;
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
     * The error of this PortResult, if it was not successful.
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
     * The resulting value
     *
     * @type {*}
     */
    get value() {
        return this.#value;
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
     * Add a warning
     *
     * @param {*}
     * @returns {PortResult}
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

    toJSON() {
        return {
            id: this.id,
            graphId: this.graphId,
            nodeId: this.nodeId,
            portId: this.portId,
            success: this.success,
            error: this.error,
            warnings: this.warnings,
            value: this.value,
            valueChanged: this.valueChanged
        }
    }

}

module.exports = PortResult;
