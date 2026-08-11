//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Node = require('./Node.js');

class Print extends Node {
    constructor(data = {}) {
        super(data);
        this.inputs = [
            {
                name: "message",
                types: [
                    'string',
                ],
                value: "",

            },

        ],
        this.outputs = [];
    }



    static get type() {
        return 'print';
    }

    // This node has a side-effect as it sends a message
    // to the log, thus it must always execute with the graph.
    get pure() {
        return false;
    }

    get inputMessage() {
        return this.inputs[0].connectedPort?.value ?? "";
    }

    execute() {
        console.log(this.inputMessage);
    }
}

module.exports = Print;
