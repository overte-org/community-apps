"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const BaseRenderer = require("./BaseRenderer.js");

/**
 * Renders a TactileDocument tree to console; useful for debugging purposes
 */
class ConsoleRenderer extends BaseRenderer {
    constructor() {
        super();
        this.elementCaches = {};
    }

    renderElement(element) {
        console.log(`${element.id}: ${JSON.stringify(element.cache)}`);
        this.elementCaches[element.id] = element.cache;
        console.table(this.elementCaches);
    }

    destroy() {
        console.log("Destroy is not yet implemented");

    }
}

module.exports = ConsoleRenderer;
