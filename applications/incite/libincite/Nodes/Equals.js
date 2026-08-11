//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Node = require('./Node.js');

class Equals extends Node {
    constructor(data = {}) {
        super(data);
        this.inputs = [
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
        this.outputs = [
            {
                name: "equals",
                types: [
                    'number',
                ],
                value: 0,
            },

        ];
    }

    static get type() {
        return 'equals';
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
