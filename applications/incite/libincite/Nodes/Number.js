//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const Node = require('./Node.js');

class Number extends Node {

    constructor(data = {}) {
        super(data);
    }

    static get type() {
        return 'number';
    }

    static get defaultInputs() {
        return  [];
    }

    static get defaultOutputs() {
        return [
             new Node.NodePort({
                name: "number",
                type: Node.NodePort.PortType.OUTPUT,
                id: 0,
                types: [
                    'number',
                ],
                value: 1,

            }),

        ];
    }

    get pure() {
        return true;
    }

    get outputNumber() {
        return this.getPort(0).value;
    }

    set outputNumber(value) {
        this.getPort(0).value = value;
    }

    execute() {
        this.outputNumber = this.outputNumber;
    }
}

module.exports = Number;
