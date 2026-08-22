//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

class NodePort {
    #id
    #connectedPort
    #type
    #types
    #name
    #value

    /**
     * @enum {string}
     */
    static get PortType() {
        return {
            INPUT: 'input',
            OUTPUT: 'output',
        }
    }

    static PortTypes = new Set(Object.values(NodePort.PortType));

    constructor(data = {}) {
        this.#id = data.id;
        this.#connectedPort = data.connectedPort;
        this.#type = data.type;
        this.#types = data.types ?? [];
        this.#name = data.name;
        this.#value = data.value;
    };

    /**
     * The unique ID representing this port within its Node.
     */
    get id() {
        return this.#id;
    }

    /**
     * The port which this port is currently connected to
     */
    get connectedPort() {
        return this.#connectedPort;
    }

    set connectedPort(port) {
        this.#connectedPort = port;
    }

    /**
     * The type of port.
     * typedef {PortType}
     */
    get type() {
        return this.#type;
    }

    /**
     * Valid data types which this port is compatible with
     */
    get types() {
        return this.#types;
    }

    /**
     * The friendly name of this port;
     * helps identify what its purpose is.
     */
    get name() {
        return this.#name;
    }

    /**
     * The data value currently associated with this port.
     */
    get value() {
        return this.#value;
    }

    set value(value) {
        this.#value = value;
    }
}

module.exports = NodePort;
