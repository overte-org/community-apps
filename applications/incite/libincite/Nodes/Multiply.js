//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

const Node = require('./Node.js');

class Multiply extends Node {
    constructor(data = {}) {
        super(data);
    }

    static get type() {
        return 'multiply';
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
                name: "product",
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
        return this.getInputResult(0).value ?? 0;
    }

    get inputBValue() {
        return this.getInputResult(1).value ?? 0;
    }

    get outputProductValue() {
        return this.getOutputResult(2).value;
    }

    execute() {
        this.setPortResult(2, this.inputAValue * this.inputBValue);
    }
}

module.exports = Multiply;
