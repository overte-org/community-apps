"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

globalThis['inspectCustom'] = Symbol.for('nodejs.util.inspect.custom'); // For node

const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const fs = require('fs');
const path = require('path');
// const assert = require('assert');
const incite = require('./libincite/incite.js');

const TEST_GRAPHS = './tests/graphs/';
const GRAPH_PATTERN = '*.json';

function loadGraph(graphURL) {
    console.log("Loading", graphURL, "...")
    let graph = null;

    var req = new XMLHttpRequest();

    req.onreadystatechange = function () {
        if (req.readyState === req.DONE) {
            if (req.status === 200) {
                graph = new incite.GraphBuilder().fromJson(req.responseText).build();

                incite.InciteStore.graphManager.addGraph(graph);

                graph.populateConnections();

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

const baseUrl = "http://localhost:8079/tests/graphs"

function runTests() {
    console.log("Running tests...");

    try {
        const files = fs.readdirSync(TEST_GRAPHS);
        for(const file of files) {
            console.log("file", file);
            const filePath = path.join(__dirname, TEST_GRAPHS, file);
            console.log("filePath", filePath);

            // Load the graph
            loadGraph(baseUrl +"/"+ file);
        };
    } catch (err) {
        console.error("Test Error:", err);
        process.exit(1);
    }

}

console.log("Incite Tests...");

runTests();
