# Incite Visual Scripting Library

This is the Incite library for creating executable graphs as part of a visual scripting system.

Incite has been created with intention to form the basis for Overte's visual scripting, however it has been architected to be platform agnostic. You can use this library to create supporting software for working with Overte's visual scripts, or even use it in an entirely unrelated project.

## Creating a Graph

Graphs can be created from javascript code, or by preparing a graph json file.

### Javascript

Create a graph:

```js
const incite = require("https://github.com/overte-org/community-apps/raw/refs/heads/master/applications/incite/libincite/incite.js");
const graph = new incite.GraphBuilder().build();
incite.InciteStore.graphManager.addGraph(graph);
```

Add nodes to the graph:

```js
const NumberNode = incite.InciteStore.nodeRegistry.get("Number");
const AddNode = incite.InciteStore.nodeRegistry.get("Add");
const PrintNode = incite.InciteStore.nodeRegistry.get("Print");

// Add the nodes
//
// 1st Number node
const nodeNumber1 = new NumberNode();
graph.addNode(nodeNumber1);
// 2nd Number node
const nodeNumber2 = new NumberNode();
graph.addNode(nodeNumber2);
// Add node
const nodeAdd1 = new AddNode();
graph.addNode(nodeAdd1);
// Print node
const nodePrint1 = new PrintNode();
graph.addNode(nodePrint1);

// Connect the nodes
//
// 1st Number node output to Add node's 1st input
graph.addConnection({
    in: {
        node: nodeNumber1.id,
        port: 0 // The output port of Number
    },
    out: {
        node: nodeAdd1.id,
        port: 0 // The first input port of Add
    }
});
// 2nd Number node output to Add node's 2nd input
graph.addConnection({
    in: {
        node: nodeNumber2.id,
        port: 0 // The output port of Number
    },
    out: {
        node: nodeAdd1.id,
        port: 1 // The second input port of Add
    }
});
// Add node's output to Print's input
graph.addConnection({
    in: {
        node: nodeAdd1.id,
        port: 2 // The output port of Add
    },
    out: {
        node: nodeAdd1.id,
        port: 0 // The input port of Print
    }
});


```

Execute the graph:

```js
graph.populateConnections();
graph.execute();
```

Delete the graph:

```js
incite.InciteStore.graphManager.deleteGraph(0);
```

### Json

An example graph:

```json
{
    "nodes": [
        {
            "id": 0,
            "type": "number",
            "data": {
                "value": 1
            }
        },
        {
            "id": 1,
            "type": "add"
        },
        {
            "id": 2,
            "type": "number",
            "data": {
                "value": 2
            }
        },
        {
            "id": 3,
            "type": "print"
        }
    ],
    "connections": [
        {
            "in": {
                "node": 0,
                "port": 0
            },
            "out": {
                "node": 1,
                "port": 0
            }
        },
        {
            "in": {
                "node": 2,
                "port": 0
            },
            "out": {
                "node": 1,
                "port": 1
            }
        },
        {
            "in": {
                "node": 1,
                "port": 0
            },
            "out": {
                "node": 3,
                "port": 0
            }
        }
    ],
    "assertions": [
        {
            "nodeId": 1,
            "portId": 0,
            "value": 3
        }
    ]
}

```

Load your json file as a graph:

```js
var graph;
var req = new XMLHttpRequest();
req.onreadystatechange = function () {
    if (req.readyState === req.DONE) {
        if (req.status === 200) {
            graph = new incite.GraphBuilder().fromJson(graphJson).build();
            incite.InciteStore.graphManager.addGraph(graph);
        }
        
        reg = null;
    }
}

req.open("GET", "https://github.com/overte-org/community-apps/blob/master/applications/incite/tests/graphs/test_graph_math_add.json");
req.send();
```

Once your graph is loaded it can be modified and executed:

```js
// Add Multiply node
cont multiplyNode = new MultiplyNode();
graph.addNode(multiplyNode);

// Disconnect Add from Print
const connections = graph.getConnections(3); // 3 is the id of print, as defined in the graph json
graph.deleteConnection(connections[0].id); // The Print node only has one connection, which we know is connected to the Add node

// Connect both inputs of Multiply to the output of Add
const connection1 = {
    in: {
        node: 1, // Add node Id
        port: 2 // The output port of Add
    },
    out: {
        node: multiplyNode.id,
        port: 0 // The first input port of Multiply
    }
}
const connection2 = {
    in: {
        node: 1, // Add node Id
        port: 2 // The output for of Add
    },
    out: {
        node: multiplyNode.id,
        port: 1 // The second input port of Multiply
    }
}
graph.addConnection(connection1);
graph.addConnection(connection2);

// Connect output of Multiply to Print
const connection3 = {
    in: {
        node: multiplyNode.id,
        port: 2 // Output port of Multiply
    },
    out: {
        node: 3, // print node id
        port: 0
    }
}
graph.addConnection(connection3);


// Execute
graph.populateConnections();
graph.execute();
```

When executed the graph should now print `9`, the result of `(1+2)*(1+2)`.

## Graph Events

A graph and its nodes emit Signals, which callbacks can be connected to.

For example, if we want to respond to a node being added to the graph we can connect a callback function to the `nodeAddedEvent` signal:

```js
graph.nodeAddedEvent.connect((graphId, nodeId) => {
    console.log(`Node ${nodeId} connected to Graph ${graphId}`);
});
```


