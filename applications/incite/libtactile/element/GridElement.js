"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElement = require("./TactileElement.js");

/**
 * A TextElement for displaying text
 */
class GridElement extends TactileElement {

    constructor(options = {}) {
        super(options);
        this.zDepth = options.zDepth ?? 0.01
        this.followCamera = options.followCamera ?? false;
        this.majorGridEvery = options.majorGridEvery ?? 5;
        this.minorGridEvery = options.minorGridEvery ?? 1;

    }

    get type() {
        return 'GridElement';
    }


}

module.exports = GridElement;
