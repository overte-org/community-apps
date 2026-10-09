"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElement = require("./TactileElement.js");

/**
 * Base Layout class
 *
 * @param {Object} options
 *
 * @property {number} spacing - The spacing between child elements in this layout
 *
 * @extends TactileElement
 */
class Layout extends TactileElement {

    constructor(options = {}) {
        super(options)
        this.isContainer = true;
        this.spacing = options.spacing ?? 0;
        this.alpha = options.alpha ?? 0;
        this.zDepth = options.zDepth ?? 0;
    }

    get type() {
        return 'Layout';
    }

    invalidate() {
        this.cache = null;
        if (this.parentLayout) {
            this.parentLayout.invalidate();
        }
    }

    clear() {
        this.elements = [];
        this.invalidate();
        return this;
    }

    /**
     * Calculate layout
     * @param {Object} options
     */
    calculate(options = {}) {
        if (!this.cache) {
            this.relayout(options);
        }
        return this.cache;
    }

    /**
     * @abstract
     */
    relayout(options) {
        throw new Error("relayout() must be implemented by a sub-class");
    }
}

module.exports = Layout;
