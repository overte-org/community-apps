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
            {
                name: "a",
                types: [
                    'number',
                ],
                value: 0,
            },
            {
                name: "b",
                types: [
                    'number',
                ],
                value: 0,
            },

        ];
    }

    static get defaultOutputs() {
        return  [
            {
                name: "product",
                types: [
                    'number',
                ],
                value: 0,
            },

        ];
    }

    get pure() {
        return true;
    }

    get inputAValue() {
        return this.inputs[0].connectedPort?.value ?? 0;
    }

    get inputBValue() {
        return this.inputs[1].connectedPort?.value ?? 0;
    }

    get outputProductValue() {
        return this.outputs[0].value;
    }

    set outputProductValue(value) {
        this.outputs[0].value = value;
    }

    execute() {
        this.outputProductValue = (this.inputAValue * this.inputBValue);
    }
}

module.exports = Multiply;
