//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const Logger = require("./Logger.js");
const Nodes = require('./Nodes/index.js');
const NodePort = require('./NodePort.js');

/**
 * Holds all of the registered nodes. Nodes must be registered here before they can be used in a graph.
 */
class NodeRegistry {
    #nodes

    /**
     * @param {boolean} loadDefaultNodes - Should the default nodes be loaded (Default: true)
     */
    constructor(loadDefaultNodes = true) {
        this.#nodes = new Map();
        this.loadDefaultNodes();
    }

    /**
     * Register the default nodes provided in Nodes/
     */
    loadDefaultNodes() {

        Logger.log("Registering nodes...")

        this.register(Nodes.Add);
        this.register(Nodes.Divide);
        this.register(Nodes.Equals);
        this.register(Nodes.Multiply);
        this.register(Nodes.Number);
        this.register(Nodes.Print);
        this.register(Nodes.Subtract);

        const nodes = this.nodes;

        Logger.log("Registered", nodes.size, "nodes");

    };

    /**
     * Get a copy of all available nodes
     *
     * @returns {Map}
     */
    get nodes() {
        return new Map(this.#nodes);
    }

    /**
     * Register a new node type
     *
     * @param {Object} node - Node class to register
     * @returns {boolean} - If the node has been registed successfully
     */
    register(node) {
        Logger.log("...node", node.type);
        // Validate node before registering it.
        try {
            this.validate(node)
        } catch (err) {
            const reasonString = err.name === 'Error'
                                    ? `${err.name}: ${err.message}`
                                    : err.stack
            Logger.warn(`Cannot register node type ${node.type} because it failed validation; Reason: ${reasonString}`);
            return false;
        }
        this.#nodes.set(node.type, node);
        return true;
    }

    /**
     * Validates the node conforms to the expected structure of a node, and is otherwise valid.
     *
     * @param {Node}
     * @returns {boolean}
     * @throws {Error} - Node has a problem which makes it invalid
     */
    validate(node) {

        // Collect all port IDs, both input and output, to ensure uniqueness.
        const IDs = new Set();

        function validateInputs() {
            for (const port of node.defaultInputs) {
                // check port is a NodePort
                if (!(port instanceof NodePort)) {
                    throw new Error(`Node type ${node.type} has an input port which is not an instance of NodePort: ${typeof port} (${port.constructor?.name})`);
                }

                // Validate IDs; unique across both inputs and outputs
                if (port.id != undefined && typeof port.id === 'number') {
                    if (IDs.has(port.id)) {
                        throw new Error(`Node type ${node.type} has multiple ports with the same ID: ${port.id}`);
                    }
                    IDs.add(port.id);
                }
                else {
                    throw new Error(`Node type ${node.type} has a port with an invalid ID: ${port.id}`);
                }

                // Validate PortTypes
                if (!port.constructor.PortTypes.has(port.type)) {
                    throw new Error(`Node type ${node.type} has a port with an invalid type: ${port.type}`);
                }
            }


            // Validate types TODO


            return !(node.defaultInputs === undefined);
        }

        function validateOutputs() {
            for (const port of node.defaultOutputs) {
                // check port is a NodePort
                if (!(port instanceof NodePort)) {
                    throw new Error(`Node type ${node.type} has an output port which is not an instance of NodePort: ${typeof port} (${port.constructor?.name})`);
                }

                // Validate IDs; unique across both inputs and outputs
                if (port.id != undefined && typeof port.id === 'number') {
                    if (IDs.has(port.id)) {
                        throw new Error(`Node type ${node.type} has multiple ports with the same ID: ${port.id}`);
                    }
                    IDs.add(port.id);
                }
                else {
                    throw new Error(`Node type ${node.type} has a port with an invalid ID: ${port.id}`);
                }

                // Validate PortTypes
                if (!port.constructor.PortTypes.has(port.type)) {
                    throw new Error(`Node type ${node.type} has a port with an invalid type: ${port.type}`);
                }
            }

            // Validate types TODO

            return !(node.defaultOutputs === undefined);
        }

        if (node.type === 'node' || node.type === "") {
            throw new Error(`A node has not provided a unique type value ('${node.type}')`);
        }
        if (!validateInputs()) {
            throw new Error(`${node.type} defined invalid inputs`);
        }
        if (!validateOutputs()) {
            throw new Error(`${node.type} defined invalid outputs`);
        }

        return true;
    }

    /**
     * Get the specified node type from the registry
     *
     * @param {string} type - The unique type of the node to get.
     * @returns {Node}
     */
    get(type) {
        return this.#nodes.get(type);
    }

    /**
     * Check if a node of the specified type exist in the registry
     *
     * @param {string} type - The unqiue type of the node to get.
     * @returns {boolean} - true if the node has been registered
     */
    has(type) {
        return this.#nodes.has(type);
    }
}

module.exports = NodeRegistry;
