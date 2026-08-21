//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const Nodes = require('./Nodes/index.js');

/**
 * This is a javascript library and is not included by default. To use the method(s) below, you must first include the library.
 *
 * @example <caption>Include this library in your script.</caption>
 * Script.include("/~/system/libraries/incite.js");
 * @namespace VisualScripting
 */
class NodeRegistry {
    #nodes

    /**
     * @Property {boolean} loadDefaultNodes - Should the default nodes be loaded (Default: true)
     */
    constructor(loadDefaultNodes = true) {
        this.#nodes = new Map();
        this.loadDefaultNodes();
    }

    loadDefaultNodes() {

        console.log("Registering nodes...")

        this.register(Nodes.Add);
        this.register(Nodes.Divide);
        this.register(Nodes.Equals);
        this.register(Nodes.Multiply);
        this.register(Nodes.Number);
        this.register(Nodes.Print);
        this.register(Nodes.Subtract);

        const nodes = this.nodes;

        console.log("Registered", nodes.size, "nodes");

    };

    /**
     * Get a copy of all available nodes
     *
     * @return {Map}
     */
    get nodes() {
        return new Map(this.#nodes);
    }

    /**
     * Register a new node type
     *
     * @param {string} type
     * @param {Object} node - Instance of a node
     */
    register(node) {
        console.log("...node", node.type);
        // Validate node before registering it.
        try {
            this.validate(node)
        } catch (err) {
            const reasonString = err.name === 'Error'
                                    ? `${err.name}: ${err.message}`
                                    : err.stack
            console.warn(`Cannot register node type ${node.type} because it failed validation; Reason: ${reasonString}`);
            return false;
        }
        this.#nodes.set(node.type, node);
        return true;
    }

    validate(node) {

        function validateInputs() {
            return !(node.defaultInputs === undefined);
        }

        function validateOutputs() {
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
     * @return {object}
     */
    get(type) {
        return this.#nodes.get(type);
    }

    /**
     * Check if a node of the specified type exist in the registry
     * @return {boolean} - true if the node exists
     */
    has(type) {
        return this.#nodes.has(type);
    }
}

module.exports = NodeRegistry;
