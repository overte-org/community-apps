//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const InciteResult = require("./InciteResult.js");

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
        this.#error = options.error ?? null;
        this.#warnings = options.warnings ?? [];
        this.#value = value;
        this.#valueChanged = options.valueChanged ?? false;
    }

    static success(graphId, nodeId, portId, value, options = {}) {
        return new PortResult(graphId, nodeId, portId, value, { ...options, success: true});
    }

    static failure(graphId, nodeId, portId, error, options = {}) {
        return new PortResult(graphId, nodeId, portId, null, {...options, success: false, error});
    }

    get graphId() {
        return this.#graphId;
    }

    get nodeId() {
        return this.#nodeId;
    }

    get portId() {
        return this.#portId;
    }

    get id() {
        return this.#portId;
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

    get value() {
        return this.#value;
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
