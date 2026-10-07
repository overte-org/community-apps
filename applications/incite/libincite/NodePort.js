//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * Node port.
 * @module NodePort
 */

/**
 * Class representing a node's port.
 */
class NodePort {
    #id
    #connectedPort
    #type
    #types
    #name

    /**
     * All possible types a port can be.
     * @enum {string}
     */
    static get PortType() {
        return {
            INPUT: 'input',
            OUTPUT: 'output',
        }
    }

    /**
     * All possible PortType values
     *
     * @type {array<PortType>}
     */
    static PortTypes = new Set(Object.values(NodePort.PortType));

    /**
     * Create a port for a node.
     *
     * @param {object} data
     */
    constructor(data = {}) {
        this.#id = data.id;
        this.#connectedPort = data.connectedPort;
        this.#type = data.type;
        this.#types = data.types ?? [];
        this.#name = data.name;
    };

    /**
     * The unique ID representing this port within its Node.
     *
     * @type {number}
     */
    get id() {
        return this.#id;
    }

    /**
     * The port which this port is currently connected to; null if unconnected.
     *
     * @default null;
     * @type {NodePort}
     */
    get connectedPort() {
        return this.#connectedPort;
    }


    set connectedPort(port) {
        this.#connectedPort = port;
    }

    /**
     * The type of port.
     *
     * @type {PortType}
     */
    get type() {
        return this.#type;
    }

    /**
     * Valid data types which this port is compatible with.
     *
     * @type {array}
     */
    get types() {
        return this.#types;
    }

    /**
     * The friendly name of this port;
     * helps identify what its purpose is.
     *
     * @type {string}
     */
    get name() {
        return this.#name;
    }
}

module.exports = NodePort;
