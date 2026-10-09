"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Logger = require("../Logger.js");
const TactileElement = require("./TactileElement.js");
const BaseRenderer = require("../renderer/BaseRenderer.js");
const Signal = require("../../libincite/Signal.js");

/**
 * Contains the elements
 *
 * @property {number} _nextID - The next id which can be assigned
 * @property {Array<number>} _availableIds - ids which were in use but have since become available
 * @property {Map} _elementMap - elements indexed by their Id
 * @property {Array<BaseRenderer>} renderers - renderers attached to this document
 * @property {TactileElement} root - The top level TactileElement container, all other elements are children in the tree below this element
 */
class TactileDocument extends TactileElement {

    #documentId


    constructor(options) {
        super(options);
        this.alpha = options.alpha ?? 0;
        this.zDepth = options.zDepth ?? 0;
        Logger.log("TactileDocument constructor, after super");

        this.expandToFit = options.expandToFit ?? false; // When true will expand the container document size to fit the contents. When false will constrain the contents to fit the container document size.

        this.depth = 0;
        if (!this._availableIds) {
            this._nextId = 1;
            this._availableIds = [];
            this._elementMap = new Map();
        }

        Logger.log("TactileDocument constructor preparing renderers");
        this.renderers = [];
        if (options.renderer instanceof BaseRenderer) {
            Logger.log("BaseRenderer being pushed during construction");
            this.renderers.push(options.renderer)
        } else if (Array.isArray(options.renderer)) { // TODO: Is it an array of BaseRenderers?
            Logger.log("Replacing renderers during construction");
            this.renderers = options.renderer;
        }

        this._elementMap.set(0, this);

    }

    getElement(elementId) {
        return this._elementMap.get(elementId);
    }

    get documentId() {
        return this.#documentId;
    }

    set documentId(newId) {
        if (this.#documentId) {
            Logger.warn("TactileDocument documentId cannot be changed.");
        } else {
            this.#documentId = newId;
        }
        return this.#documentId;
    }

    get type() {
        return 'TactileDocument';
    }

    /**
     * The root element; TODO: Should be able to support multiple children...
     */
    get root() {
        return this.elements[0];
    }

    get id() {
        return 0;
    }

    set id(id) {
        return
    }

    /**
     * Called when an element is added as a child of this tree
     */
    _onElementAttachedToTree(element) {
        // This can be called during super construction, which means we don't get a chance to create these variables
        if (!this._availableIds) {
            this._nextId = 1;
            this._availableIds = [];
            this._elementMap = new Map();
        }
        const id = this._availableIds.length > 0 ? this._availableIds.pop() : this._nextId++;
        element.id = id;
        this._elementMap.set(id, element);
    }

    /**
     * Called when an element is removed as a child of this tree
     */
    _onElementRemovedFromTree(element) {
        Logger.log("_onElementRemovedFromTree", element.id)
        this._elementMap.delete(element.id);
        this._availableIds.push(element.id);
        for (const renderer of this.renderers) {
            Logger.log("Informing rendered of validation.");
            renderer.onElementRemoved(this, element);
        }
    }

    _onElementInvalidated(element) {
        Logger.info(`Element ${element.id} invalidated! What now?`);

        // mark this document invalid
        if (this.valid) this.valid = false;

        // Schedule a task to relayout after a short delay;
        // Find invalid branches and measure/layout
        this.scheduleUpdate();
    }

    scheduleUpdate() {
        if (this.updateScheduled) return; // We'll just let the update go ahead as planned
        if (typeof Script != 'undefined') { // Are we in Overte?
            Script.setTimeout(() => {
                this.updateScheduled = false;
                this.update();
            }, 100);
        } else { // We're not in Overte, probably node.js.
            setTimeout(() => {
                this.updateScheduled = false;
                this.update();
            }, 100);
        }
        this.updateScheduled = true;

    }

    /**
     * Called when an element of this tree has become valid
     */
    _onElementValidated(element) {
        // Inform renderer of the newly valid element,
        // so they might choose to render it again at some
        // point in the future.

        Logger.info(`Element ${element.id} validated! What now?`);

        for (const renderer of this.renderers) {
            Logger.log("Informing rendered of validation.");
            renderer.onElementValidated(this, element);
        }
    }

    /**
     * Add a new renderer responsible for rendering this TactileDocument
     */
    attachRenderer(renderer) {
        this.renderers.push(renderer);
    }

    /**
     * Remove a renderer from this TactileDocument,
     * so it will no longer be repsonsible for rendering.
     */
    detachRenderer(renderer) {
        this.renderers = this.renderers.filter(r => r != renderer);
    }

    update() {
        Logger.log("Document update");
        Logger.log("Number of elements:", this.elements.length);

        // iterate through tree
        // when element is not valid; do geometry calc

        this.cache.largestWidth = 0;
        this.cache.largestHeight = 0;
        for (const element of this.elements) {
            Logger.log("We got elements!");
            if (!this.expandToFit && element.valid) continue; // Skip if nothing to do.
            Logger.log("We invalid!");
            const size = element.measure();
            const width = size.width;
            const height = size.height;

            if (   ((width < Number.MAX_SAFE_INTEGER) && width > this.cache.largestWidth)
                || (this.cache.largestWidthElement == element.id && width < this.cache.largestWidth)
            ) {
                Logger.log(`New largest width from element ${element.id}: ${width}, (was ${this.cache.largestWidth})`);
                this.cache.largestWidth = width;
                this.cache.largestElement = element.id;
            }
            if (    ((height < Number.MAX_SAFE_INTEGER) && height > this.cache.largestHeight)
                || (this.cache.largestHeightElement == element.id && height < this.cache.largestHeight)
            ) {
                Logger.log(`New largest height from element ${element.id}: ${height}, (was ${this.cache.largestHeight})`);
                this.cache.largestHeight = height;
                this.cache.largestElement = element.id;
            }

        }

        // Here we want the document to either constrain, or if expandToFit then
        // it should expand to fit the geometry whereever it may be destined to be.
        // I don't tihnk we support arbritary positioning, so it should just be as big
        // or larger than the largest child element.

        const rootWidth = this.expandToFit ? this.cache.largestWidth : this.preferredWidth;
        const rootHeight = this.expandToFit ? this.cache.largestHeight : this.preferredHeight;

        const totalWidth = rootWidth + this.margins.left + this.margins.right;
        const totalHeight = rootHeight + this.margins.top + this.margins.bottom;

        this.cache.x = 0;
        this.cache.y = 0;
        this.cache.absoluteX = 0;
        this.cache.absoluteY = 0;
        this.cache.width = totalWidth;
        this.cache.height = totalHeight;

        this.valid = true;

        for (const element of this.elements) {
            if (!this.expandToFit && element.valid) continue; // Skip if nothing to do.

            element.layout(rootWidth, rootHeight, 0, 0);

        }
    }

    /**
     * Final tasks prior to deletion
     */
    cleanup() {
        for(const renderer of this.renderers) {
            renderer.cleanup();
        }
    }

    /**
     * Emits when this TactileDocument is deleted.
     *
     * @type Signal<(documentId: number) => void>
     */
    documentDeletedEvent = new Signal("DocumentDeletedEvent"); // TODO
}

module.exports = TactileDocument;
