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
            {
                name: "a",
                id: 0,
                types: [
                    'number',
                ],
                value: 0,
            },
            {
                name: "b",
                id: 1,
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
                name: "equals",
                id: 2,
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
        return this.inputs[0].connectedPort?.value ?? false;
    }

    get inputBValue() {
        return this.inputs[1].connectedPort?.value ?? true;
    }

    get outputEqualsValue() {
        return this.outputs[0].value;
    }

    set outputEqualsValue(value) {
        this.outputs[0].value = value;
    }

    execute() {
        this.outputEqualsValue = (this.inputAValue == this.inputBValue);
    }
}

module.exports = Equals;
