"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const incite = require("./libincite/incite.js");
const tactile = require("./libtactile/tactile.js");

/**
 * A Rez'd instance of an Incite Graph.
 */
class GraphRez {
    #document
    #connectionElementMap
    #elementConnectionMap
    #elementNodeMap
    #entityHostType
    #graph
    #inputportElementMap // map<number, map<number, number>>; nodeId -> portId -> elementId
    #outputportElementMap
    #nodeElementMap
    #position

    constructor(graph, position) {
        this.#graph = graph
        this.#position = position;
        this.#entityHostType = "local";
        this.#document = this.DEFAULT_DOCUMENT;

        this.#nodeElementMap = new Map();
        this.#elementNodeMap = new Map();

        this.#inputportElementMap = new Map;
        this.#outputportElementMap = new Map;

        this.#connectionElementMap = new Map();
        this.#elementConnectionMap = new Map();

        this.modeData = {};

        this.subscribe();
    }

    subscribe() {
        this.graph.nodeAddedEvent.connect(this.onNodeAdded.bind(this));
        this.graph.nodeRemovedEvent.connect(this.onNodeRemoved.bind(this));
        this.graph.connectionAddedEvent.connect(this.onConnectionAdded.bind(this));
        this.graph.connectionRemovedEvent.connect(this.onConnectionRemoved.bind(this));
        incite.InciteStore.graphManager.graphDeletedEvent.connect(this.onGraphDeleted.bind(this));
    }

    setNodeInputportElementToMap(nodeId, portId, elementId) {
        console.log("setNodeInputportElementToMap", nodeId, portId, elementId);
        let portMap = this.#inputportElementMap.get(nodeId);
        if (!portMap) {
            this.#inputportElementMap.set(nodeId, new Map());
            portMap = this.#inputportElementMap.get(nodeId);
        }
        portMap.set(portId, elementId);
    }

    getNodeInputportElementToMap(nodeId, portId) {
        console.log("getNodeInputportElementToMap", nodeId, portId);
        const portMap = this.#inputportElementMap.get(nodeId);
        if (!portMap) {
            console.warn("getNodeInputportElementToMap", nodeId, portId, "portMap is nundefined");
            return;
        }
        return portMap.get(portId);
    }

    setNodeOutputportElementToMap(nodeId, portId, elementId) {
        console.log("setNodeOutputportElementToMap", nodeId, portId, elementId);
        let portMap = this.#outputportElementMap.get(nodeId);
        if (!portMap) {
            this.#outputportElementMap.set(nodeId, new Map());
            portMap = this.#outputportElementMap.get(nodeId);
        }
        portMap.set(portId, elementId);
    }


    getNodeOutputportElementToMap(nodeId, portId) {
        console.log("getNodeOutputportElementToMap", nodeId, portId);
        const portMap = this.#outputportElementMap.get(nodeId);
        if (!portMap) {
            console.warn("getNodeOutputportElementToMap", nodeId, portId, "portMap is nundefined");
            return;
        }
        return portMap.get(portId);
    }

    onNodeAdded(graphId, nodeId) {
        const onCompleteCommands = []; // We need to run some commands later, once all elements have been added to the document
        const node = this.graph.getNode(nodeId);
        const nodeElement = new tactile.element.ColumnLayout({
            preferredWidth: 0.5, preferredHeight: 0.5,
            minWidth: 0.5, minHeight: 0.5,
            maxWidth: 1, maxHeight: 1,
            color: { red: 216, green: 216, blue: 216 },
            margins: { top: 0.01, right: 0.01, bottom: 0.01, left: 0.01 },
            spacing: 0.01,
            alpha: 1,
            zDepth: 0.1,
        });
        nodeElement.addElement(new tactile.element.TextElement({
            text: node.type,
            color: { red: 255, green: 144, blue: 0 },
            textColor: { red: 0, green: 0, blue: 0 },
            lineHeight: 0.12,
            preferredWidth: 0.3, preferredHeight: 0.2,
            unlit: true,
        }));

        // Ports row
        const portsContainer = new tactile.element.RowLayout({
            minWidth: 0.5,
            preferredWidth: 0.3, preferredHeight: 0.1,
            alpha: 0,
            zDepth: 0,

        });

        // input ports
        const inputPorts = new tactile.element.ColumnLayout({
            preferredWidth: 0.2, preferredHeight: 0.1,
            maxWidth: 0.4,
            color: { red: 93, green: 93, blue: 93 },
            alpha: 0.5,
            zDepth: 0.01,
            margins: { top: 0.01, right: 0.01, bottom: 0.01, left: 0.01 },
            spacing: 0.01,

        });
        node.inputs.forEach((port, index) => {
            const inputElement = new tactile.element.TactileElement({
                preferredWidth: 0.1, preferredHeight: 0.1,
                maxWidth: 0.1, maxHeight: 0.1,
                color: { red: 0, green: 240, blue: 44 },
                alpha: 1,
                zDepth: 0.02,
                offsetZ: -0.01,
            });
            inputPorts.addElement(inputElement);
            inputElement.elementPressed.connect((documentId, elementId) => {
                console.log(`Element ${elementId} has been clicked! Input.`);
                // check if we are in connection mode, so we can finalise the connection here.
                if (this.interactionMode == 'ConnectingPorts') {
                    const newConnection = {
                        in: {
                            node: this.modeData.outputPort.nodeId, // modeData is undefined??
                            port: this.modeData.outputPort.portId
                        },
                        out: {
                            node: this.#elementNodeMap.get(nodeElement.id),
                            port: index,
                        }
                    };
                    console.log("newConnection:", JSON.stringify(newConnection));
                    if (!this.#graph.validateConnection(newConnection)) {
                        console.warn("Connection is not valid; Ports are not compatable ");
                        return;
                    }
                    console.log("newConnection 1");

                    // End ConnectingPorts interaction mode and clean up connecting line
                    this.startInteractionMode('None');

                    console.log("newConnection 2");

                    // Connect nodes in the graph
                    this.#graph.addConnection(newConnection);
                    // Connection is drawn in response to new connection signal from Graph
                    console.log("newConnection complete");
                // Do we have an existing connection? We shall disconnect it.
                } else {
                    console.log("We are not currently connecting ports.");
                    const connections = this.#graph.getConnections(node);
                    connections?.inputs.forEach((connection, connectionIndex) => {
                        console.log("Could we delete this connection?", connection.id, JSON.stringify(connection))
                        if (connection.out.port === index) {
                            console.log("Connection matches port", index);
                            // This connection terminates at this node.
                            this.#graph.deleteConnection(connection.id);
                            console.log("Removed connection:", JSON.stringify(connection));
                        }
                    })
                }
            });
            // this.#elementPortMap.set(inputElement.id, port.id);
            onCompleteCommands.push(() => {
                this.setNodeInputportElementToMap(node.id, index, inputElement.id);
            });
        });
        portsContainer.addElement(inputPorts);

        // output ports
        const outputPorts = new tactile.element.ColumnLayout({
            preferredWidth: 0.1, preferredHeight: 0.1,
            maxWidth: 0.4,
            color: { red: 93, green: 93, blue: 93 },
            alpha: 0.5,
            zDepth: 0.01,
            margins: { top: 0.01, right: 0.01, bottom: 0.01, left: 0.01 },
            spacing: 0.1,
        });
        node.outputs.forEach((port, index) => {
            const outputElement = new tactile.element.TactileElement({
                preferredWidth: 0.1, preferredHeight: 0.1,
                maxWidth: 0.1, maxHeight: 0.1,
                color: { red: 0, green: 44, blue: 240 },
                alpha: 1,
                zDepth: 0.02,
                offsetZ: -0.01,
            });
            outputPorts.addElement(outputElement);
            outputElement.elementPressed.connect((documentId, elementId) => {
                console.log(`Element ${elementId} has been clicked! Output.`);
                // check we are not already in connection mode (if this is the same output we were already trying to connect just cancel connection mode)
                if (this.interactionMode == 'ConnectingPorts') return;

                // Begin connection mode
                this.startInteractionMode("ConnectingPorts", {
                    outputPort: {
                        documentId: documentId,
                        elementId: elementId,
                        nodeId: this.#elementNodeMap.get(nodeElement.id),
                        portId: index,
                        types: port.types,
                    }
                });

                // Update port visually
            });
            onCompleteCommands.push(() => {
                this.setNodeOutputportElementToMap(node.id, index, outputElement.id);
            });
        });
        portsContainer.addElement(outputPorts);

        nodeElement.addElement(portsContainer);


        this.document.root.addElement(nodeElement); // TODO Build an element for the type of node
        // Store elementId by the nodeId;
        this.#nodeElementMap.set(nodeId, nodeElement.id);
        this.#elementNodeMap.set(nodeElement.id, nodeId);

        onCompleteCommands.forEach(command => command());
    }

    onConnectionAdded(graphId, connectionId) {
        const connection = this.graph.getConnection(connectionId);
        const portElementA = this.#document.getElement(this.getNodeOutputportElementToMap(connection.in.node,
                                                           connection.in.port));
        const portElementB = this.#document.getElement(this.getNodeInputportElementToMap(connection.out.node,
                                                          connection.out.port));
        const pointA = { x: portElementA.cache.absoluteX+(portElementA.cache.width/2),
            y: portElementA.cache.absoluteY+(portElementA.cache.height/2),
            z: 0 }
        const pointB = { x: portElementB.cache.absoluteX+(portElementA.cache.width/2),
            y: portElementB.cache.absoluteY+(portElementA.cache.height/2),
            z: 0 }
        const connectionElement = new tactile.element.LineElement({
            preferredWidth: Infinity, preferredHeight: Infinity,
            linePoints: [
                pointA,
                pointB,
            ],
            glow: true,
            faceCamera: true,
            offsetZ: 0.12,
        });
        this.#document.addElement(connectionElement);
        this.#connectionElementMap.set(connectionId, connectionElement.id);
        this.#elementConnectionMap.set(connectionElement.id, connectionId);
    }

    onConnectionRemoved(graphId, connectionId) {
        console.log("onConnectionRemoved", graphId, connectionId);
        const connectionElementId = this.#connectionElementMap.get(connectionId);
        this.#elementConnectionMap.delete(connectionElementId);
        this.#connectionElementMap.delete(connectionId);
        this.#document.removeElement(connectionElementId);
    }

    startInteractionMode(newMode, newModeData = {}) {
        console.log("startInteractionMode", newMode, JSON.stringify(newModeData));
        console.log("startInteractionMode; current interactionMode:", this.interactionMode);
        // cleanup existing mode
        switch(this.interactionMode) {
            case "ConnectingPorts":
                console.log("startInteractionMode ConnectingPorts");
                // Cleanup polyline
                if (this.modeData.elementId) {
                    const document = tactile.tactileStore.documentManager.getDocument(this.modeData.outputPort.documentId)
                    console.log("startInteractionMode doc1");
                    //const line = document.getElement(this.modeData.elementId);
                    console.log("startInteractionMode doc2");
                    document.removeElement(this.modeData.elementId);
                    console.log("startInteractionMode doc3");
                }

                // Return port visuals to normal

                break;
            default:
                if (this.interactionMode) this.interactionMode = null;
                break;
        }
        // modeData is cleaned up later by overwriting it.

        // Begin the new mode:
        this.interactionMode = newMode;
        this.modeData = newModeData; // Overwriting old modeData
        switch(newMode) {
            case "ConnectingPorts":
                // TODO Verify we have the data we would expect

                const document = tactile.tactileStore.documentManager.getDocument(this.modeData.outputPort.documentId)
                const element = document.getElement(this.modeData.outputPort.elementId);

                // Create Polyline
                const pointA = { x: element.cache.absoluteX+(element.cache.width/2), y: element.cache.absoluteY+(element.cache.height/2), z: 0 };
                const line = new tactile.element.LineElement({
                    preferredWidth: Infinity, preferredHeight: Infinity,
                    linePoints: [
                        pointA,
                        pointA, // We'll just set the other end of the line to the same spot for now, and then overwrite the end later with the cursor position. TODO
                    ],
                    glow: true,
                    faceCamera: true,
                    offsetZ: 0.12,
                });
                document.addElement(line);

                this.modeData.elementId = line.id;

                // Setup loops to keep one end of polyline touching avatar's pointer location on graph

                break;
            default:

                break;
        }
    }

    onNodeRemoved(graphId, nodeId) {
        console.log("onNodeRemoved", graphId, nodeId);
        const elementId = this.#nodeElementMap.get(nodeId);
        this.document.root.removeElement(elementId);
        this.#nodeElementMap.delete(nodeId);
        this.#elementNodeMap.delete(elementId);
    }

    onGraphDeleted(graphId) {
        if (graphId !== this.graph.id) return; // Not our concern!

        // Clean up document TODO
        this.document.cleanup();

        this.graphRezEnding.emit(this.id, this.graph.id);
    }

    /**
     * The graph that is Rez'd into the world
     */
    get graph() {
        return this.#graph;
    }

    /**
     * The id of the graph that is Rez'd into the world
     */
    get graphId() {
        return this.graph.id;
    }

    /**
     * The context in which this graph is to be rendered. See Entities.EntityHostType in the Overte apidocs.
     */
    get entityHostType() {
        return this.#entityHostType;
    }

    set entityHostType(entityHostType) {
        this.#entityHostType = entityHostType;
        // TODO rerender when the host type context changes
    }

    get document() {
        return this.#document;
    }

    set document(doc) {
        // TODO validate and then cleanup old document, if there is one
        this.#document = doc;
        // TODO finalise setup of new document
    }

    get DEFAULT_DOCUMENT() {
        const renderer = new tactile.renderer.TactileRenderer({ // TODO: Only attach renderer when we are ready to render
            position: this.position,
            renderContext: "local"
        });

        const layout = new tactile.element.FloatingLayout({
            rows: 4,
            flowDirection: 'column',
            spacing: 0.1,
            margins: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
        });

        const grid = new tactile.element.GridElement({
            preferredWidth: Infinity, preferredHeight: Infinity,
        });
        const elements = [layout,grid];

        // for each node in graph:
        for(const node of this.graph.nodes) {
            // create Element for node
            const element = new tactile.element.TactileElement({ minWidth: 0.5 });
            // attach to layout
            layout.addElement(element);
        }

        return tactile.tactileStore.documentManager.newDocument({
            elements: elements,
            renderer: renderer,
            expandToFit: true,
        });
    }

    /**
     * The world position where this Graph has been Rez'd.
     * Note: This should be updated when the entity moves around the world, but it may not be strictly up to date at all times
     */
    get position() {
        // TODO update cached position if cache TTL has expired
        return this.#position;
    }

    set position(pos) {
        this.#position = pos;
        // TODO rerender when the position changes
    }

    /**
     * Rez or relocate this graph in the world at the specified posiition
     * @param {Vec3} [position] - The world coordinates where this graph should be
     */
    rez(position = this.position) {

    }

    /**
     * Remove all entities from the world
     */
    cleanup() {
        this.document.cleanup();
    }

    // Signals

    /**
     * Emits when the graph is no longer being rezzed into the world.
     *
     * @type Signal<(nodeId: number, graphId: number) => void>
     */
    graphRezEnding = new incite.Signal("GraphRezEnding");

}

module.exports = GraphRez;
