//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const Node = require('./Node.js');

class Print extends Node {
    constructor(data = {}) {
        super(data);
    }



    static get type() {
        return 'print';
    }

    static get defaultInputs() {
        return  [
             new Node.NodePort({
                name: "message",
                id: 0,
                type: Node.NodePort.PortType.INPUT,
                types: [
                    'string',
                ],
                value: "",

            }),

        ];
    }

    static get defaultOutputs() {
        return [];
    }

    // This node has a side-effect as it sends a message
    // to the log, thus it must always execute with the graph.
    get pure() {
        return false;
    }

    get inputMessage() {
        return this.getInputResult(0).value ?? "";
    }

    execute() {
        console.log(this.inputMessage);
    }
}

module.exports = Print;
