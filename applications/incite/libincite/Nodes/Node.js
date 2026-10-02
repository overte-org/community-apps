//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const NodePort = require("../NodePort.js");
const NodeResult = require("../NodeResult.js");
const PortResult = require("../PortResult.js");

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
    #ports

    static NodePort = NodePort;

    constructor(data = {}) {
        this.inputs = this.constructor.defaultInputs;
        this.outputs = this.constructor.defaultOutputs;
        this.#ports = {};
        this.inputs.forEach((port) => this.#ports[port.id] = port);
        this.outputs.forEach((port) => this.#ports[port.id] = port);

        this.#id = data.id ?? null;
        this.#data = data.data ?? {};
    };


    static get type() {
        return 'node';
    }

    /**
     * @abstract
     * @returns {Array<NodePort>} input ports
     */
    static get defaultInputs() {
        throw new Error(`Node type ${this.type} must set its own defaultInputs`);
    }

    /**
     * @abstract
     * @returns {Array<NodePort>} output ports
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

    get graphId() {
        return this.graph.id;
    }

    get data() {
        return this.#data;
    }

    get ports() {
        return this.#ports;
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

    /**
     * Returns the port with the given ID
     */
    getPort(portId) {
        return this.ports[portId];
    }

    getInputResult(portId) {
        // Confirm this is an input port
        const port = this.getPort(portId);
        if (port.type !== Node.NodePort.PortType.INPUT) {
            throw new Error(`Port ${portId} is not a valid input port`);
        }
        console.log("getInputResult", portId);

        // Return port result
        return this.graph.getConnectedResult(this.id, portId);
    }

    getOutputResult(portId) {
        // Confirm this is an input port
        const port = this.getPort(portId);
        if (port.type !== Node.NodePort.PortType.OUTPUT) {
            throw new Error(`Port ${portId} is not a valid output port`);
        }

        // return port result
        return this.graph.getPortResult(this.id, portId);
    }

    setPortResult(portId, value) {
        // TODO check if there is a NodeResult set
        // TODO Validate value; type, range, etc.
        console.log("setPortResult", this.graphId, this.id, portId, value);
        const result = PortResult.success(this.graphId,
                                          this.id,
                                          portId,
                                          value); // TODO mark valueChanged
        this.nodeResult.setPortResult(result);
        return result;
    }

    setParentGraph(graph) {
        this.#graph = graph;
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
     * The code which runs when node would execute within the graph.
     * All output ports should have a result set via `setPortResult` by the
     * end of this function.
     *
     * @abstract
     */
    execute() {
        throw new Error(`Node type ${type} must implement its own execute function`);
    }

    /**
     * Runs this node's executable code, whilst handling errors
     */
    run(executionFrame) {
        // TODO If a node is pure and its inputs did not re-execute or
        // their values match the previous input values, we do not need
        // to re-execute; provide the previously computed values.

        // Create NodeResult for current execution
        this.nodeResult =  new NodeResult(this.graphId, this.id);

        try {
            console.log("Execute", this.type);
            for(const port of this.inputs) {
                console.log("Port", port.name, "connected to", port.connectedPort?.value ?? "No Port"); // TODO: N value = no port; Should make more useful error messages.
            }

            // Execute
            this.execute();
            // Verify and store result of execution
            executionFrame.storeNodeResult(this.nodeResult);
            // Cache results
            for (const portResult of this.nodeResult.portResults) {
                console.log("Node.run portResult", JSON.stringify(portResult));
                this.graph.setPortResult(this.id, portResult.id, portResult);
            }

            return executionFrame;

        } catch (error) {
            console.error(`Error executing node $${this.id} ($${this.type}):`, error.stack);
            this.nodeResult.setError(error);
            executionFrame.storeNodeResult(this.nodeResult);
        }
    }

}

module.exports = Node;
