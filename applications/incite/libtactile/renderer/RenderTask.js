//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

// const tactile = require("../tactile.js");

class RenderTask {

    /**
     * The name of the task when removing an element from the scene
     */
    static DELETE = "DELETE";

    /**
     * The name of the task when performing a second pass to refine the rendered element.
     */
    static REFINE = "REFINE";

    /**
     * The name of the task when rendering an element into the scene
     */
    static RENDER = "RENDER";

    #element
    #document
    #action


    // TODO: Do we want to store IDs instead of objects here? Documents do not yet have one.
    constructor(element, document, action = undefined) {
        this.#element = element;
        this.#document = document,
        this.#action = action ?? RenderTask.RENDER;
    }

    /**
     * The document the element is attached to.
     *
     * @type {TactileDocument}
     */
    get document() {
        return this.#document;
    }

    /**
     * The element this render task will act upon
     *
     * @type {TactileElement}
     */
    get element() {
        return this.#element;
    }

    /**
     * The task type.
     *
     * @type {string}
     */
    get action() {
        return this.#action;
    }
}

module.exports = RenderTask;
