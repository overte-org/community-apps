//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * typedef {object} NodePort
 * @property {string} name - The name of this port
 * @property {array<string>} types - The list of types this port accepts
 * @property {object} value - The current value of this port, typically the output
 * @property {object} connectedPort - The port of another node this port is connected to, if connected to a port.
 */

/**
 * The base executable Node which all other nodes should extend
 *
 * @property {object} data
 * @property {object} graph - the graph this node belongs to
 * @property {number} id - The id of this node instance
 * @property {object} #node
 * @property {string} type - They type of this node
 */
class Node {
    #id
    #graph
    #node
    #data

    constructor(data = {}) {
        this.inputs = this.constructor.defaultInputs;
        this.outputs = this.constructor.defaultOutputs;

        this.#id = data.id ?? null;
        this.#data = data.data ?? {};
    };


    static get type() {
        return 'node';
    }

    /**
     * @abstract
     */
    static get defaultInputs() {
        throw new Error(`Node type ${this.type} must set its own defaultInputs`);
    }

    /**
     * @abstract
     */
    static get defaultOutputs() {
        throw new Error(`Node type ${this.type} must set its own defaultOutputs`);
    }

    get type() {
        return this.constructor.type;
    }


    get id() {
        return this.#id;
    }

    set id(id) {
        this.#id = id;
    }

    get graph() {
        return this.#graph;
    }

    set graph(graph) {
        this.#graph = graph;
    }

    get data() {
        return this.#data;
    }

    /**
     * Whether this node is pure
     * A node is pure when:
     *  * The output is deterministic base on its input values
     *  * It has no side-effects beyond simply setting its output value(s)
     *
     * If true, the output will always be the same when given certain values on its inputs.
     * if false, the output cannot be determined based exclusively on its input values.
     *
     * NOTE: Pure nodes will not re-execute unless the input values have changed.
     *
     * @returns {bool}
     * @abstract
     */
    get pure() {
        throw new Error(`Node type ${type} must set its own pure value`);
    }

    // JSON.stringify
    toJSON() {
        return {
            id: this.#id,
            type: this.type,
            data: this.#data,
            inputs: this.inputs,
            outputs: this.outputs
        }
    }

    // Show private fields in log (in node.js)
    [inspectCustom]() {
        return {
            id: this.#id,
            type: this.type,
            data: this.#data,
            inputs: this.inputs,
            outputs: this.outputs,
        };
    }

    /**
     * Node's logic
     * The code which runs when node would execute within the graph
     *
     * @abstract
     */
    execute() {
        throw new Error(`Node type ${type} must implement its own execute function`);
    }

    /**
     * Runs this node's executable code, whilst handling errors
     */
    run() {
        if (this.executed) return;

        try {
            console.log("Execute", this.type);
            for(const port of this.inputs) {
                console.log("Port", port.name, "connected to", port.connectedPort?.value ?? "No Port"); // TODO: N value = no port; Should make more useful error messages.
            }
            this.execute();
            this.executed = true;
        } catch (error) {
            console.error(`Error executing node $${this.id} ($${this.type}):`, error);
        }
    }

}

module.exports = Node;
