"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const platform = typeof process != 'undefined' && process.versions?.node ? 'node' : 'overte';
globalThis['inspectCustom'] = Symbol.for('nodejs.util.inspect.custom'); // For node

const isOverte = platform === 'overte';

const ContextMenu = isOverte ? require("contextMenu") : undefined;
const InciteRezzer = isOverte ? require("./InciteRezzer.js") : undefined;

switch (platform) {
    case 'overte':
        print("Setting up for Overte");
        Script.clearCache(); // TODO: Don't clear cache in production'
        break;
    case 'node':
        console.log("Setting up for Node.js ")
        console.log("process.versions.node:", process.versions.node);
        globalThis['XMLHttpRequest'] = require("xmlhttprequest").XMLHttpRequest;
        break;
}


const incite = require("./libincite/incite.js");

console.log("Welcome to Incite!");

function loadGraph(graphURL) {
    console.log("Loading", graphURL, "...")
    let graph = null;

    var req = new XMLHttpRequest();

    req.onreadystatechange = function () {
        if (req.readyState === req.DONE) {
            if (req.status === 200) {
                //console.log("Success");
                //console.log("Content type:", req.getResponseHeader("content-type"));
                //console.log("Content:", req.responseText.slice(0, 100), "...");

                graph = new incite.GraphBuilder().fromJson(req.responseText).build();

                incite.InciteStore.graphManager.addGraph(graph);

                graph.execute();

            } else {
                console.log("Error", req.status, req.statusText);
            }

            req = null;
        }
    }

    req.open("GET", graphURL);
    req.send();

};

const baseUrl = "http://localhost:8079"

//loadGraph(baseUrl + '/test_graph_math.json');

// Woo proper app stuff!

function registerContextMenu() {

    const actionSet = [
        {
            text: "Create Graph",
            localClickFunc: "incite.create_graph",
            textColor: "white",
            priority: -5,
        },
        {
            text: "> Add Node",
            localClickFunc: "incite.add_node",
            submenu: "incite.menu_nodes",
            textColor: "white",
            priority: -4.9,
        },
        {
            text: "Delete Graph",
            localClickFunc: "incite.delete_graph",
            textColor: "white",
            priority: -4.8,
        },
        {
            text: "Execute Graph",
            localClickFunc: "incite.execute_graph",
            textColor: "white",
            priority: -4.7,
        },
    ];

    ContextMenu.registerActionSet("incite", [{
        text: "Incite",
        submenu: "incite.menu",
        backgroundColor: [0, 0, 0],
        textColor: "white",
        priority: -5,
    }], ContextMenu.ROOT_SET);

    ContextMenu.registerActionSet("incite.menu", actionSet, undefined, "Incite");

    const nodesActionSet = [];

    for (const [index, node] of incite.InciteStore.nodeRegistry.nodes.entries()) {
        const nodeAction = {
            text: node.type,
            localClickFunc: "incite.add_node_"+node.type,
            textColor: "white",
            priority: -5-(index*0.01),
            keepMenuOpen: true,
        };
        nodesActionSet.push(nodeAction);
    }

    ContextMenu.registerActionSet("incite.menu_nodes", nodesActionSet, undefined, "Add node to graph");
};

function createNewGraph() {

    if (incite.InciteStore.graphManager.graphs.length == 0) {
        const graph = new incite.GraphBuilder().build();
        incite.InciteStore.graphManager.addGraph(graph);
        // Render graph into the world
        InciteRezzer.rezGraph(graph, Vec3.sum(MyAvatar.getHeadPosition(),
                                        Vec3.multiplyQbyV(MyAvatar.orientation,
                                                          { x: 0, y: 0, z: -2 }))); // TODO rotation
        console.log("Created graph");
    } else {
        console.log("Could not create graph; a graph already exists");
    }
}

function deleteGraph() {
    if (incite.InciteStore.graphManager.graphs.length > 0) {
        incite.InciteStore.graphManager.graphs.shift();
        incite.InciteStore.graphManager.deleteGraph(0); // TODO: Support more than one graph
        console.log("Deleted graph");
    } else {
        console.log("Could not delete graph; no such graph exists.");
    }

}

function executeGraph() {
    if (incite.InciteStore.graphManager.graphs.length > 0) {
        const graph = incite.InciteStore.graphManager.graphs[0];
        graph.execute();
        console.log("Executed graph");
    } else {
        console.log("Could not execute graph; no such graph exists.");
    }
}

function addNodeToGraph(type) {
    const node = new (incite.InciteStore.nodeRegistry.get(type))();
    console.log("Adding node", type, "to graph");

    incite.InciteStore.graphManager.getGraph(0).addNode(node);
}

function deleteNode(graphId) {
    incite.InciteStore.graphManager.getGraph(0).deleteNode(graphId);
}

if (isOverte) {
    registerContextMenu();


    Script.scriptEnding.connect(() => {
        ContextMenu.unregisterActionSet("incite.menu_nodes");
        ContextMenu.unregisterActionSet("incite.menu");
        ContextMenu.unregisterActionSet("incite");

         Controller.keyPressEvent.disconnect(handleKeyPress);

        deleteGraph();

        console.log("Incite app has finished.");


    });

    const handleMessage = function(channel, message, sender) {
        if (channel === ContextMenu.CLICK_FUNC_CHANNEL && sender === MyAvatar.sessionUUID) {
            console.log("Received ContextMenu FUNC");
            let data;
            try {
                data = JSON.parse(message)
            } catch (err) {
                console.error(`Received invalid JSON on ${ContextMenu.CLICK_FUNC_CHANNEL}`, message, err.message);
                return
            }

            if (data && typeof data === 'object') {
                console.log("Received ContextMenu object");
                const func = data.func;

                if (typeof func === 'string') {
                    console.log("Received ContextMenu func string");
                    if (func.substring(7, 16) === 'add_node_') {
                        console.log("Adding node...");
                        const nodeType = func.substring(16);

                        addNodeToGraph(nodeType);
                    }

                    switch(func) {
                        case 'incite.create_graph':
                            console.log("Creating graph...");
                            createNewGraph();
                            break;
                        case 'incite.delete_graph':
                            console.log("Deleting graph...");
                            deleteGraph();
                            break;
                        case 'incite.execute_graph':
                            console.log("Executing graph...");
                            executeGraph();
                            break;
                    }
                } else {
                    console.error(`Received invalid data from ${ContextMenu.CLICK_FUNC_CHANNEL}:`, data);
                }
            }
        };
    };
    Messages.messageReceived.connect(handleMessage);

    function handleKeyPress(event) {
        if (event.text === "e" && event.isControl && !event.isMeta && !event.isShifted && !event.isAlt) {
            executeGraph();
        }
    }
    Controller.keyPressEvent.connect(handleKeyPress);


}
