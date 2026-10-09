//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Node = require('./Node.js');

class Add extends Node {
    constructor(data = {}) {
        super(data);
    }

    static get type() {
        return 'add';
    }

    static get defaultInputs() {
        return [
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
        return [
            new Node.NodePort({
                name: "sum",
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
        return this.getInputResult(0).value;
    }

    get inputBValue() {
        // return this.getPort(1).connectedPort?.value ?? 0;
        return this.getInputResult(1).value;
    }

    get outputSumValue() {
        return this.getOutputResult(2).value;
    }

    execute() {
        this.setPortResult(2, this.inputAValue + this.inputBValue);
    }
}

module.exports = Add;
