//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

/**
 * @typedef {Object} Graph~NodeJson
 * @property {string} type - The unique type string of the node
 * @property {Object} data
 */

/**
 * @typedef {Object} Graph~Connection
 * @property {Graph~ConnectionPoint} in - The tart of the connection; a node's output port
 * @property {Graph~ConnectionPoint} out - The end of the connection; a node's input port
 */

/**
 * @typedef {Object} Graph~ConnectionPoint
 * @property {number} node - The node id
 * @property {number} port - the port id
 */

/**
 * @typedef {Object} GraphJson
 * @property {Array<Graph~Node>} nodes
 * @property {(Array<Graph~Connection>|undfined)} connections
 * @property {(Array<Graph~Assertion>|undefined)} assertion
 */

/**
 * @typedef {Object} Graph~Assertion
 * @property {number} nodeId - The id of the node this assertion is about
 * @property {number} portId - The id of the output port this assertion is about
 * @property {*} value - The value of the specified node's output port after exection
 */

const Signal = require("./Signal.js");
const ExecutionFrame = require("./ExecutionFrame.js");
const ExecutionReel = require("./ExecutionReel.js");

/**
 * A visual scripting graph containing nodes and their connections
 */
class Graph {
    /**
     * The graph ID
     */
    id

    /**
     * The url where this graph can be loaded from
     */
    #url

    /**
     * An iterable array of nodes within this graph
     */
    #nodes

    /**
     * A map of nodes within this graph, allowing lookup by node ID.
     */
    #nodesById

    /**
     * An array of connections between nodes
     * @type {Array<Graph~Connection>}
     */
    #connections

    /**
     * A map of connection
     * @type {map<number, Graph~Connection>}
     */
    #connectionsById

    /**
     * An array of Assertions made about the values of specific nodes after graph execution
     */
    #assertions

    /**
     * The next ID to use when adding a node to this graph; used only when #availableIds is empty.
     */
    #nextId

    /**
     * A list of previously used node IDs which are now available to be reused for new nodes
     */
    #availableIds

    /**
     * Has this graph pass the vibe check?
     * If false something about this graph has not passed validation, and it will not execute without intervention.
     */
    #valid

    /**
     * The order this graph will execute in
     */
    #executionOrder

    /**
     * The current results to be used to provide input values during execution.
     */
    #resultCache

    /**
     * The reel of previous ExecutionFrames
     */
    #exectutionReel

    /**
     * Which output types can be connected to which input types
     */
    static get TYPE_COMPATIBLES() {
        return {
            string: new Set(['string', 'number', 'boolean']),
            number: new Set(['number', 'string', 'boolean']),
            boolean: new Set(['string', 'number', 'boolean']),
            array: new Set(['array']),
            object: new Set(['object']),
        }
    }

    constructor(data = {}) {
        this.id = data.id ?? null;
        this.#url = data.url ?? null;
        this.#nodes = new Set(data.nodes ?? []);
        this.#nodesById = new Map();
        this.#nextId = 0;
        this.#availableIds = [];
        for (const node of this.#nodes) {
            if (node.id === undefined) node.id = this.#availableIds.length > 0 ? this.#availableIds.pop() : this.#nextId++;
            if (node.id <= this.#nextId) this.#nextId = node.id+1;
            this.#nodesById.set(node.id, node);
            this.nodeAddedEvent.emit(this.id, node.id);
        }
        this.graphUpdatedEvent.emit(this.id, new Set(this.#nodes));
        this.#connections = data.connections ?? [];
        this.#connectionsById = new Map();
        this.#connections.forEach((connection, index) => {
            this.#connectionsById.set(index, connection); // FIXME: Wrong ID
        })
        this.#assertions = data.assertions ?? [];

        this.#valid = this.validateGraph(); // We validate, but we do not judge
        console.log("Graph is valid?", this.#valid);


        this.populateConnections();
        this.#executionOrder = this.calculateExecutionOrder();

        this.#resultCache = {};
        this.executionReel = new ExecutionReel(this.id);
    }

    /**
     * the url where the json definition for this graph can be found
     *
     * @returns {string}
     */
    get url() {
        return this.#url;
    }

    /**
     * A copy of the nodes in this graph
     *
     * @returns {Array<Node>}
     */
    get nodes() {
        return [ ... this.#nodes];
    }

    /**
     * A copy of the connections in this graph
     *
     * @returns {Array<Graph~Connection>}
     */
    get connections() {
        return [ ... this.#connections];
    }

    /**
     * A copy of the assertions for this graph
     *
     * @returns {Array<Graph~Assertion>}
     */
    get assertions() {
        return [ ... this.#assertions];
    }

    /**
     * The order this graph will execute in
     *
     * @returns {Array<number>} - nodeIds in order of execution
     */
    get executionOrder() {
        return [ ... this.#executionOrder ];
    }

    get newId() {
        console.log("nextId:", this.#nextId, "availableIds:", this.#availableIds);
        return this.#availableIds.length > 0 ? this.#availableIds.pop() : this.#nextId++;
    }

    /**
     * Add a node to this graph
     *
     * @param {Node}
     */
    addNode(node) {
        node.id = this.newId;
        this.#nodes.add(node);
        this.#nodesById.set(node.id, node);
        node.setParentGraph(this);
        this.nodeAddedEvent.emit(this.id, node.id); // TODO: Only emit if successfully added
        this.updateData();
        this.graphUpdatedEvent.emit(this.id, new Set([node.id]));
        return node.id;
    }

    /**
     * Get a node by its ID
     *
     * @param {number} nodeId
     * @returns {Node}
     */
    getNode(nodeId) {
        return this.#nodesById.get(nodeId);
    }

    /**
     * Delete a node from this graph by its id
     *
     * @param {number}
     */
    deleteNode(nodeId) {
        const node = this.#nodes.get(nodeId);
        this.#nodes.delete(node);
        this.#nodesById.delete(nodeId);
        this.#availableIds.push(nodeId);
        this.nodeRemovedEvent.emit(this.id, nodeId); // TODO: Only emit if successfully removed
        this.updateData();
        this.graphUpdatedEvent.emit(this.id, new Set([nodeId]));
    }

    addConnection(connection) {
        console.log("graph.addConnection:", JSON.stringify(connection));
        //const id = this.#availableIds.length > 0 ? this.#availableIds.pop() : this.#nextId++;
        connection.id = this.newId;
        console.log("graph.addConnection with id", connection.id);
        this.#connections.push(connection);
        this.#connectionsById.set(connection.id, connection);

        this.populateConnections();
        this.#executionOrder = this.calculateExecutionOrder();

        this.connectionAddedEvent.emit(this.id, connection.id);

        this.#valid = this.validateGraph();
    }

    /**
     *
     * @param {number} connectionId
     * @returns {Graph~Connection}
     */
    getConnection(connectionId) {
        return this.#connectionsById.get(connectionId);
    }

    /**
     *
     * @param {number} connectionId
     */
    deleteConnection(connectionId) {
        console.log("graph.deleteConnection:", connectionId);
        const connection = this.#connectionsById.get(connectionId);
        const index = this.#connections.findIndex((connection) => connection.id == connectionId);
        this.#connections.splice(index, 1);
        this.#connectionsById.delete(connectionId);
        this.#availableIds.push(connectionId);

        this.connectionRemovedEvent.emit(this.id, connectionId);

        this.#valid = this.validateGraph();
    }

    /**
     * Get the cached result for the connected output port
     * of the given input port.
     * Will return null if no connected port.
     *
     * @param {number} nodeId
     * @param {number} portId
     * @returns {(PortResult|null)}
     */
    getConnectedResult(nodeId, portId) {
        for (const connection of this.#connections) {
            const inNodeId = connection.in.node;
            const outNodeId = connection.out.node;

            // if (inNodeId == nodeId) {
            //     const inPortId = connection.in.port;
            //     if (inPortId == portId) {
            //         return this.getPortResult(outNodeId, outPortId);
            //     }
            // }
            if (outNodeId == nodeId) {
                const outPortId = connection.out.port;
                if (outPortId == portId) {
                    return this.getPortResult(inNodeId, connection.in.port);
                }
            }
        }

        return null;
    }

    /**
     * @param {number} nodeId
     * @param {number} portId
     * @returns {(PortResult|undefined)}
     */
    getPortResult(nodeId, portId) {
        return this.#resultCache[`${nodeId}:${portId}`];
    }

    setPortResult(nodeId, portId, result) {
        this.#resultCache[`${nodeId}:${portId}`] = result;
    }

    /**
     * Clear results for a node.
     * To be used when the node is removed from the graph.
     *
     * @param {number} nodeId
     */
    clearResults(nodeId) {
        // TODO
        const keys = new Set();

        // Collect keys to delete
        for (const key of this.#resultCache.keys()) {
            if (key.startsWith(`${nodeId}:`)) {
                keys.add(key);
            }
        }

        // Delete the matching results
        for (const key of keys) {
            delete this.#resultCache[key];
        }
    }

    /**
     * Update this graph's data; typically after structural changes to this graph.
     */
    updateData() {
        // validate graph
        this.#valid = this.validateGraph();

        // update connection data
        this.populateConnections();

        // update execution order
        this.#executionOrder = this.calculateExecutionOrder();
    }

    /**
     * Validate the given connection
     *
     * @param {Graph~Connection} connection
     * @returns {boolean}
     */
    validateConnection(connection){
        console.log("graph.validateConnection", JSON.stringify(connection));
        let inPort;
        let outPort;
        let bothPortsDefined = false;
        let bothPortTypesCorrect = false;
        if (typeof connection == 'object') {
            // Does this connection have an in node?
            if (typeof connection.in == 'object') {
                // Does the port exist?
                const inNodeId = connection.in.node
                const inPortId = connection.in.port
                if (       typeof inNodeId == 'number'
                        && typeof inPortId == 'number') { // Connection claims an in port
                    const inNode = this.getNode(inNodeId);
                    // Does the inNode exist? TODO
                    if (typeof inNode == 'object') { // TODO instanceof Node
                        inPort = inNode.getPort(inPortId);
                    }
                }
            }

            // Does this connection have an out node?
            if (typeof connection.out == 'object') {
                // Does the port exist?
                const outNodeId = connection.out.node
                const outPortId = connection.out.port
                if (       typeof outNodeId == 'number'
                        && typeof outPortId == 'number') { // Connection claims an out port
                    const outNode = this.getNode(outNodeId);
                    // Does the outNode exist? TODO
                    if (typeof outNode == 'object') { // TODO instanceof Node
                        outPort = outNode.getPort(outPortId);
                    }
                }
            }

            // Does the port type match the in port?
            bothPortsDefined = (typeof inPort != 'undefined' && typeof outPort != 'undefined');

            if (bothPortsDefined) {
                // Are both port PortTypes correct?
                bothPortTypesCorrect = (inPort.type === inPort.constructor.PortType.OUTPUT && outPort.type === outPort.constructor.PortType.INPUT);
                if (bothPortTypesCorrect) {
                    const inTypes = inPort.types;
                    // Here we check if the inNode of this connection will output
                    // only the types which the outNode accepts on its input
                    // If it may output a type which would not be accepted, the connection will
                    // be rejected even if it can output a type which would be accepted.
                    if (outPort.types.some(outType =>
                                            inTypes.length < (Graph.TYPE_COMPATIBLES[outType] ?? new Set()).size && inPort.types.every(inType =>
                                                (Graph.TYPE_COMPATIBLES[outType] ?? new Set()).has(inType)))) { // TODO: improve validation by matching against specific type currently being output
                        return true;
                    } else {
                        console.log("Cannot validate", inPort.types, "Connecting to", outPort.types);
                    }
                };
            }
        }

        let message = []
        message.push("Connection did not validate.");
        if (!inPort) message.push("From node "+connection.in.node+", port "+connection.in.port+" does not exist.");
        if (!outPort) message.push("To node:port "+connection.out.node+":"+connection.out.port+" does not exist.");
        if (bothPortsDefined) message.push("inPort", inPort, "outPort:", outPort);
        if (!bothPortTypesCorrect) message.push("One or more port type is incorrect; inPort:", inPort.type, "outPort:", outPort.type);
        message.push(JSON.stringify(connection));
        console.warn(... message);
        return false;
    }

    /**
     * Validate all connections in the graph
     *
     * @returns {boolean}
     */
    validateConnections() {
        const total = this.connections.length;
        let failed = 0;
        for (const connection of this.connections) {
            if (!this.validateConnection(connection)) {
                failed++;
            }
        }
        return failed == 0;
    }

    /**
     * Validate everything about this graph; if it fails to validate it will not execute without intervention.
     *
     * @returns {boolean} - True if this graph is valid
     */
    validateGraph() {
        let isValid = true;
        const results = {};
        ((result) => (results.connections = result))(this.validateConnections());
        const invalidTypes = Object.entries(results)
                .filter(([key, value]) => !value)
                .map(([key]) => key);
        if (invalidTypes.length != 0) {
            console.log(`Graph ${this.id} failed the vibe check. The following have issues: ${invalidTypes}`);
            return false;
        }
        return true;
    }

    /**
     * Run through the entire graph in order, executing each node
     *
     * @param {boolean} force - force this graph to execute, even if it fails validation.
     * @returns {ExecutionFrame} - The results of this execution
     */
    execute(force = false) {
        // Calculate the number of dependencies which must be resolved before each node can execute
        if(!force && !this.#valid) return [];
        const queue = this.executionOrder;
        const executionFrame = new ExecutionFrame(this.id);

        console.log("Execution order:", queue);

        // Run through execution order
        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentNode = this.#nodesById.get(currentId);
            currentNode.run(executionFrame); // TODO
            // Iterate all port results of this nodeResult
            const nodeResult = executionFrame.getNodeResult(currentNode.id)
            for (const portResult of nodeResult.portResults) {
                console.log(`${portResult.nodeId}:${portResult.portId} = ${portResult.value ?? "No Value"}`);
            }
        }

        this.verifyAssertions(executionFrame);

        this.executionReel.add(executionFrame);
        this.graphExecutedEvent.emit(this.id, executionFrame);

        return executionFrame;
    }

    /**
     * Find the order in which to execute this graph so all of a node's dependencies are resolved before it would execute.
     *
     * @returns {Array<number>} - This Graph's GraphNodes as a list of ids in executable order
     */
    calculateExecutionOrder() {
        // All nodes get a dependency value based on its input connections
        //  ; nodes with no inputs have 0
        //  ; nodes which have been processed present as a 0 on the input of the next node
        //  ; nodes with all inputs processed have 0
        // We process all nodes with 0 dependencies, and once those are complete
        // we should have new nodes with 0 dependencies. Keep processing until all nodes
        // are complete.

        const inputDependencies = new Map();
        for (const node of this.#nodes) {
            inputDependencies.set(node.id, this.connections.filter(item => item.out.node === node.id).length); // Number of inputs connected on each node
        }

        const queue = [];
        const result = []; // nodeIDs in execution order
        const processedIds = new Set(); // TODO: Ensure we don't loop back in on ourselves.

        // Nodes with 0 inputDependencies are ready to execute
        for (const [id, count] of inputDependencies.entries()) {
            if (count === 0) {
                queue.push(id);
            }
        }

        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentNode = this.#nodesById.get(currentId);

            result.push(currentId);
            processedIds.add(currentId);

            // Find downstream connected nodes
            const connectedNodes = [];
            for( const connection of this.#connections) {
                if (connection.in.node === currentId) {
                    connectedNodes.push(connection.out.node);
                }
            }

            // Update downstream node dependency value
            for (const connectedNodeId of connectedNodes) {
                const connectedNode = this.#nodesById.get(connectedNodeId);
                const dependencies = inputDependencies.get(connectedNode.id)
                inputDependencies.set(connectedNode.id, dependencies - 1);

                // If all dependencies are resolved, add to queue.
                if (inputDependencies.get(connectedNode.id) === 0) {
                    queue.push(connectedNode.id);
                }
            }

        }

        if (result.length !== this.#nodes.size) {
            console.warn(`Not all nodes were processed! ${result.length}/${this.#nodes.size}`)
        }

        return result;
    }

    /**
     * Returns any connections involving the specified node
     *
     * @param {GraphNode} graphNode
     * @returns {Array<Graph~Connection>} - input and output connections
     */
    getConnections(graphNode) {
        //console.log(graphNode);
        const inputs = [];
        const output = [];
        this.connections.forEach(item => {
            //console.log(item);
            //console.log("in:", item.in, ", out:", item.out);
            if (item.out.node === graphNode.id) {
                inputs.push(item);
            } else if (item.in.node === graphNode.id) {
                output.push(item);
            }
        });

        return {
            // inputs: node.connections.filter(item => item.out === node.id),
            // outputs: node.connections.filter(item => item.in === node.id)
            inputs: inputs,
            output: output
        }
    }

    /**
     * Go through all connected and apply links to nodes
     *
     * @param {boolean} force - force populating connections, even if the graph fails validation.
     * @returns {boolean} success
     */
    populateConnections(force = false) { // TODO: What if a connection is removed or no longer points to a node; need to handle clearing old links
        if(!force && !this.#valid) return false;
        for (const connection of this.connections) {
            console.log("Connection:", connection);
            const inNode = this.getNode(connection.in.node);
            const outNode = this.getNode(connection.out.node);

            //console.log("inNode:", inNode, "outNode:", outNode);

            const outputPort = inNode.getPort(connection.in.port);
            const inputPort = outNode.getPort(connection.out.port);

            // Set connectedPort on in side
            outputPort.connectedPort = inputPort

            // Set connectedNode on out side
            inputPort.connectedPort = outputPort
        }
        return true;
    }

    /**
     * @param {ExecutionFrame} executionFrame
     * @returns {boolean} success
     */
    verifyAssertions(executionFrame){
        const queue = [ ... this.assertions ];
        let result = true;

        console.log("Verifying assertions...");

        while (queue.length > 0) {
            const assertion = queue.shift();
            const node = this.nodes[assertion.nodeId];
            const port = node.getPort(assertion.portId);
            const nodeResult = executionFrame.getResult(assertion.nodeId);
            const portResult = executionFrame.getPortResult(assertion.portId);
            const value = assertion.value;

            //console.log(`Verifying assertion ${assertion.nodeId}:${assertion.portId} == ${assertion.value}`);

            if (!portResult.success || portResult.value != value) {
                console.warn(`!! Graph assertion failure !! Node ${assertion.nodeId}, Port ${assertion.portId} should have value ${value} but has ${portResult.value} instead. ${portResult.success ? "success" : "failure"}`);
                result = false;
                console.log(`Node Execution Result: ${JSON.stringify(nodeResult)}`);
            }
        }

        if (result) console.log("... All good!");

        return result;
    }

    toJSON() {
        return {
            id: this.id,
            url: this.#url,
            nodes: this.#nodes,
            connections: this.#connections
        };
    }

    // Show private fields in log (in node.js)
    [inspectCustom]() {
        return {
            id: this.id,
            url: this.#url,
            nodes: this.#nodes,
            connections: this.#connections
        };
    }

    // Emitters

    /**
     * Emitted when a new node is added to this graph.
     *
     * @type Signal<(graphId: number, nodeId: number) => void>
     */
    nodeAddedEvent = new Signal("NodeAddedEvent");

    /**
     * Emitted when a node is removed from this graph.
     *
     * @type Signal<(graphId: number, nodeId: number) => void>
     */
    nodeRemovedEvent = new Signal("NodeRemovedEvent");

    /**
     * Emitted when a new connection is added to this graph.
     *
     * @type Signal<(graphId: number, connectionId: number) => void>
     */
    connectionAddedEvent = new Signal("NodeAddedEvent");

    /**
     * Emitted when a connection is removed from this graph.
     *
     * @type Signal<(graphId: number, connectionId: number) => void>
     */
    connectionRemovedEvent = new Signal("NodeRemovedEvent");

    /**
     * Emits when this graph is deleted.
     *
     * @type Signal<(graphId: number) => void>
     */
    graphDeletedEvent = new Signal("GraphDeletedEvent"); // TODO

    /**
     * @callback GraphUpdatedEventCallback
     * @param {number} graphId
     * @param {Set<Node>} changedNodes
     */

    /**
     * Emits when the graph configuration changes.
     *
     * @type Signal<(graphId: number, changedNodes: Set<Node>) => void>
     */
    graphUpdatedEvent = new Signal("GraphUpdatedEvent"); // TODO this should represent all changes, not just node additions/deletions.

    /**
     * Emits when a node on this graph has updated or changed.
     *
     * @type Signal<(nodeId: number, graphId: number) => void>
     */
    nodeUpdatedEvent = new Signal("NodeUpdatedEvent"); // TODO

    /**
     * Emits when a connection on this graph has updated or changed.
     */
    conectionUpdatedEvent = new Signal("ConectionUpdatedEvent"); // TODO

    /**
     * Emits when this graph has executed
     *
     * @type Signal<(graphId: number, executionFrame: ExecutionFrame) => void>
     */
    graphExecutedEvent = new Signal("GraphExecutedEvent");

}

module.exports = Graph;
