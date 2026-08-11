//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Node = require('./Node.js');

class Number extends Node {

    constructor(data = {}) {
        super(data);
        this.inputs = [];
        this.outputs = [
            {
                name: "number",
                types: [
                    'number',
                ],
                value: 1,

            },

        ];
    }

    static get type() {
        return 'number';
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
