//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const Node = require('./Node.js');

class Equals extends Node {
    constructor(data = {}) {
        super(data);
    }

    static get type() {
        return 'equals';
    }

    static get defaultInputs() {
        return  [
            new Node.NodePort({
                name: "a",
                id: 0,
                type: Node.NodePort.PortType.INPUT,
                types: [
                    'number',
                ],
                value: 0,
            }),
            new Node.NodePort({
                name: "b",
                id: 1,
                type: Node.NodePort.PortType.INPUT,
                types: [
                    'number',
                ],
                value: 0,
            }),

        ];
    }

    static get defaultOutputs() {
        return  [
            new Node.NodePort({
                name: "equals",
                id: 2,
                type: Node.NodePort.PortType.OUTPUT,
                types: [
                    'number',
                ],
                value: 0,
            }),

        ];
    }

    get pure() {
        return true;
    }

    get inputAValue() {
        return this.getPort(0).connectedPort?.value ?? false;
    }

    get inputBValue() {
        return this.getPort(1).connectedPort?.value ?? true;
    }

    get outputEqualsValue() {
        return this.getPort(2).value;
    }

    set outputEqualsValue(value) {
        this.getPort(2).value = value;
    }

    execute() {
        this.outputEqualsValue = (this.inputAValue == this.inputBValue);
    }
}

module.exports = Equals;
