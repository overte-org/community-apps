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
            {
                name: "number",
                id: 0,
                types: [
                    'number',
                ],
                value: 1,

            },

        ];
    }

    get pure() {
        return true;
    }

    get inputNumber() {
        return this.inputs[0].value;
    }

    set inputNumber(num) {
        this.inputs[0].value = num;
    }

    get outputNumber() {
        return this.outputs[0].value;
    }

    set outputNumber(value) {
        this.outputs[0].value = value;
    }

    execute() {
        this.outputNumber = this.outputNumber;
    }
}

module.exports = Number;
