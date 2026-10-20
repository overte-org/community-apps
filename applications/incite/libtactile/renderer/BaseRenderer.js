"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Logger = require("../Logger.js");
const RenderTask = require("./RenderTask.js");

/**
 * The base class which all Tactile renderers must extend.
 *
 * A renderer is responsible for rendering a TactileDocument tree. Each renderer will render in a different way, to a particular surface or context.
 */
class BaseRenderer {

    /**
     * @type {Array<RenderTask>}
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
        this.addRenderTask(new RenderTask(element,
                                          document));
    }

    /**
     * Called when an element is in need of removal.
     * The renderer does not immediately remove the element,
     * it will render the change on its next pass
     */
    onElementRemoved(document, element) {
        Logger.debug("onElementRemoved", document.id, element.id)
        // TODO: Confirm it is an element

        // Store the element and document tree in renderTask
        this.addRenderTask(new RenderTask(element,
                                          document,
                                          RenderTask.DELETE));
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
     * Add a new renderTask to be completed on the next pass
     *
     * @param {RenderTask} renderTask
     */
    addRenderTask(renderTask) {
        if (!renderTask instanceof RenderTask) {
            throw new TypeError(`Cannot add render task; expected RenderTask but got ${typeof renderTask}`);
        }

        this.#renderTasks.push(renderTask);
        Logger.debug("Added renderTask for element", renderTask.element.id);

        // Schedule a draw, if not already scheduled
        if (!this.renderScheduled) {
            this.scheduleRender();
        }
    }



    /**
     * Render all renderTasks
     */
    renderSchedule() {
        Logger.debug(`renderSchedule: ${this.#renderTasks.length} tasks`)
        const queue = [...this.#renderTasks];
        this.#renderTasks = [];

        for (const renderTask of queue) {
            Logger.debug("Executing render task for element ", renderTask.element.id, ",", renderTask.document.id);
            const element = renderTask.element;
            if (renderTask.action == RenderTask.DELETE) {
                Logger.debug("renderSchedule action to DELETE", element.id)
                this.destroyElement(element);
            } else if (renderTask.action == RenderTask.REFINE) {
                Logger.debug("renderSchedule action to REFINE", element.id)
                this.refineElement(element);
            }else {
                this.renderElement(element);
            }
        }
    }

    /**
     * Run a second pass to render an element
     *
     * @param {TactileElement} element
     * @abstract
     */
    refineElement(element) {
        throw new Error("refineElement method must be implemented by a sub-class");
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
