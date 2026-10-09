"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

/**
 * @typedef {Object} renderTask
 * @property {Object} element
 * @property {Object} document
 */

/**
 * The base class which all Tactile renderers must extend.
 *
 * A renderer is responsible for rendering a TactileDocument tree. Each renderer will render in a different way, to a particular surface or context.
 */
class BaseRenderer {

    /**
     * @type {Array<renderTask>}
     */
    #renderTasks

    constructor() {
        this.#renderTasks = [];
    }

    /**
     * Called when an element is in need of rerendering
     * The renderer does not immediately render the element,
     * it will render it on its next pass
     */
    onElementValidated(document, element) {
        // TODO: Confirm it is an element

        // Store the element and document tree in renderTask
        // TODO: Do we want to store IDs instead of objects here? Documents do not yet have one.
        const renderTask = {
            element: element,
            document: document,
        }

        this.#renderTasks.push(renderTask);
        console.log("Added renderTask for element", renderTask.element.id);

        // Schedule a draw, if not already scheduled
        if (!this.renderScheduled) {
            this.scheduleRender();
        }
    }

    /**
     * Called when an element is in need of removal.
     * The renderer does not immediately remove the element,
     * it will render the change on its next pass
     */
    onElementRemoved(document, element) {
        console.log("onElementRemoved", document.id, element.id)
        // TODO: Confirm it is an element

        // Store the element and document tree in renderTask
        // TODO: Do we want to store IDs instead of objects here? Documents do not yet have one.
        const renderTask = {
            element: element,
            document: document,
            action: "DELETE"
        }

        this.#renderTasks.push(renderTask);
        console.log("Added renderTask for element", renderTask.element.id);

        // Schedule a draw, if not already scheduled
        if (!this.renderScheduled) {
            this.scheduleRender();
        }
    }

    /**
     * Schedules a new render pass of outstanding renderTasks
     * called when this renderer marks an element to be rendered
     */
    scheduleRender() {
        if (this.renderScheduled) return;
        if (typeof Script != 'undefined') { // Are we in Overte?
            Script.setTimeout(() => {
                this.renderScheduled = false;
                this.renderSchedule();
            }, 100);
        } else { // We're not in Overte, probably node.js.
            setTimeout(() => {
                this.renderScheduled = false;
                this.renderSchedule();
            }, 100);
        }
        this.renderScheduled = true;
    }



    /**
     * Render all renderTasks
     */
    renderSchedule() {
        console.log(`renderSchedule: ${this.#renderTasks.length} tasks`)
        for (const renderTask of this.#renderTasks) {
            console.log("Executing render task for element ", renderTask.element.id, ",", renderTask.document.id);
            const element = renderTask.element;
            if (renderTask.action == "DELETE") {
                console.log("renderSchedule action to DELETE", element.id)
                this.destroyElement(element);
            } else {
                this.renderElement(element);
            }
        }
        this.#renderTasks = [];
    }

    /**
     * Render changes to a particular TactileElement.
     * @param {TactileElement} element
     *
     * @abstract
     */
    renderElement(element) {
        throw new Error("renderElement method must be implemented by a sub-class");
    }

    /**
     * Render removal of a particular TactileElement.
     * @param {TactileElement} element
     *
     * @abstract
     */
    destroyElement(element) {
        throw new Error("destroyElement method must be implemented by a sub-class");
    }

    /**
     * Cleanup rendered data
     *
     * @abstract
     */
    destroy() {
        throw new Error("destroy method must be implemented by a sub-class");
    }
}

module.exports = BaseRenderer;
