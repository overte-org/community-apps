"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Signal = require("../../libincite/Signal.js");

/**
 * @typedef {object} GeometryCache
 * @property {number} x - x position relative to the parent
 * @property {number} y - y position relative to the parent
 * @property {number} absoluteX - x position within the document
 * @property {number} absoluteY - y position within the document
 * @property {number} width - the total width of this element
 * @property {number} height - the total height of this element
 */

/**
 * @typedef {object} Spacing
 * @property {number} top
 * @property {number} right
 * @property {number} bottom
 * @property {number} left
 */

/**
 * The basic TactileElement
 *
 * @property {number} id - The unique id of this element
 * @property {number} depth - the depth of this element with the document tree
 * @property {number} documentId - The ID of the document this element is attached to.
 * @property {array<object>} elements - The list of child elements within this element
 * @property {number} mindWidth - the minimum width this element should be
 * @property {number} minHeight - the minimum heigh this element should be
 * @property {number} maxWidth - the maxium width this element can be
 * @property {number} maxHeight - The maximum heigh this element can be
 * @property {number} preferredWidth - The preferred width of this element if given infinite space
 * @property {number} preferredHeight - the preferred height of this element if given infinite space
 * @property {string} alignment - Unused ; The horizontal alignment of child elements
 * @property {Spacing} margins - The space around the outer edges of elements within this element
 * @property {boolean} visible - Whether the element will be visible when rendered
 * @property {number} offsetZ - How far forward of the parent to render this element
 * @property {object} parent - The TactileElement which this element is a child of
 * @property {boolean} isContainer
 * @property {boolean} valid - If this element has had its layout computed; when false it must be updated, once valid it will be rerendered
 * @property {boolean} isPlaced - If this element has been assigned coordinates
 * @property {GeometryCache} cache - Cache of computed geometry for this element
 * @property {array<elements>} visibleElements - The elements which are marked as visible
 * @property {array<elements>} validElements - The elements which are marked as valid
 * @property {array<elements>} placedElements - The elements which have already been assigned coordinates
 */
class TactileElement {

    #cache
    #color
    #minWidth
    #minHeight
    #preferredWidth
    #preferredHeight
    #valid

    constructor(options = {}) {
        console.log("TactileElement constructor");
        this.id = options.id ?? null;
        this.depth = 0;

        console.log("TactileElement constructor preparing elements");
        this.elements = [];
        if (options.elements instanceof TactileElement) {
            console.log("TactileElement pushed during contruction", options.elements);
            this.addElement(options.elements)
        } else if (Array.isArray(options.elements)) { // TODO: Is it an array of TactileElements?
            console.log(`Array populating elements during construction, length: ${options.elements.length}`);
            // console.log(options.elements); // NOTE: This line locks up Interface, consuming all available RAM
            for (const element of options.elements) {
                this.addElement(element);
            }
        }

        this.#minWidth = options.minWidth ?? 0;
        this.#minHeight = options.minHeight ?? 0;
        this.#preferredWidth = options.preferredWidth ?? 1;
        this.#preferredHeight = options.preferredHeight ?? 1;
        this.maxWidth = options.maxWidth ?? Infinity;
        this.maxHeight = options.maxHeight ?? Infinity;
        this.alignment = options.alignment ?? 'center';
        this.margins = options.margins ?? { top: 0, right: 0, bottom: 0, left: 0 };
        this.visible = options.visible ?? true;
        this.zDepth = options.zDepth ?? 0.1;
        this.offsetZ = options.offsetZ ?? 0;

        this.#color = options.color ?? { red: 255, green: 255, blue: 255 }
        this.alpha = options.alpha ?? 1;
        this.unlit = options.unlit ?? false;

        this.resetCache();
        this.parent = null;

        this.isContainer = false;

        this.#valid = false; // Needs recalculating when false
        // Each renderer maintains it's own list of elements which need to be rerendered after updating
    }

    get documentId() {
        return this.parent?.documentId;
    }

    get document() {
        const tactileStore = require("../TactileStore.js");
        return tactileStore.documentManager.getDocument(this.documentId);
    }

    get absoluteZ() {
        let z = this.offsetZ+(this.zDepth/2);
        if (this.parent) z += this.parent.absoluteZ + (this.parent.zDepth/2);
        return z;
    }

    /**
     * The type of this TactileElement
     * @abstract
     */
    get type() {
        return 'TactileElement';
    }

    set preferredWidth(width) {
        this.#preferredWidth = width;
    }

    get preferredWidth() {
        return this.#cache?.totalWidth ?? this.#preferredWidth;
    }

    set preferredHeight(height) {
        this.#preferredHeight = height;
    }

    get preferredHeight() {
        return this.#cache?.totalHeight ?? this.#preferredHeight;
    }

    get minWidth() {
        return this.#cache?.minWidth ?? this.#minWidth;
    }

    get minHeight() {
        return this.#cache?.minHeight ?? this.#minHeight;
    }

    get color() {
        return this.#color;
    }

    set color(color) {
        this.#color = color;
        this.valid = false;
    }

    // TODO: Make this a clearly defined class structure
    get cache() {
        return this.#cache; // This is the layout data; why didn't I called it layoutData...
    }

    set cache(cache) {
        console.log("Setting cache");
        this.#cache = cache;
    }

    /**
     * When this element is valid it's data is in tip-top shape,
     * when this value is false it is in need of a measure and a layout.
     */
    get valid() {
        return this.#valid;
    }

    // Set as valid at the end of layout
    set valid(bool) {
        this.#valid = bool
        // notify up the tree
        this._propogateValidation(this, bool);
    }

    get isPlaced() {
        return typeof this.cache?.x !== 'undefined'
    }

    // No hidden elements here!
    get visibleElements() {
        return this.elements.filter(element => element.visible);
    }

    // elements with valid geometry
    get validElements() {
        return this.elements.filter(element => element.valid);
    }

    // elements with valid geometry
    get placedElements() {
        return this.elements.filter(element => element.isPlaced);
    };

    /**
     * Propogate element validation notification up through the tree
     */
    _propogateValidation(element, valid) {
        if (valid) {
            this._onElementValidated(element);
        } else {
            this._onElementInvalidated(element);
        }

        if (this.parent) {
            this.parent._propogateValidation(element, valid);
        }
    }

    /**
     * Propogate attachment notification up through the tree
     */
    _propogateAttachment(element) {
        // An element has been added below/within this element,
        // so this element's geometry is no longer valid
        this.valid = false;

        // Notify this element
        this._onElementAttachedToTree(element);


        if (this.parent) {
            // Propogate up the tree
            console.log(`Propogate up the tree; ${this.id} -> ${this.parent.id}`)
            this.parent._propogateAttachment(element);
        } else {
            console.log(`${this.id}: parent is ${this.parent?.id}`);
        }

    }

    /**
     * Propogate removal notification up through the tree
     */
    _propogateRemoval(element) {
        console.log("_propogateRemoval");
        // An element has been removed below/within this element,
        // so this element's geometry is no longer valid
        this.valid = false;

        // Notify this element
        this._onElementRemovedFromTree(element);
        console.log("_propogateRemoval post-_onElementRemovedFromTree");


        if (this.parent) {
            // Propogate up the tree
            console.log(`Propogate up the tree; ${this.id} -> ${this.parent.id}`)
            this.parent._propogateRemoval(element);
        } else {
            console.log(`${this.id}: parent is ${this.parent?.id}`);
        }

    }

    /**
     * Called whenever either this or any child element below this one is added to the tree
     */
    _onElementAttachedToTree(element) {};

    /**
     * Called whenever either this or any child element below this one is removed from the tree
     */
    _onElementRemovedFromTree(element) {};

    /**
     * Called whenever either this or any child element below this one become invalid
     */
    _onElementInvalidated(element) {};

    /**
     * Called whenever either this or any child element below this one become valid
     */
    _onElementValidated(element) {};

    /**
     * Called whenever this element's position within the tree changes.
     * This can be when it is attached to a new parent, or any parent element above it is added to a new tree or moves position within the same tree.
     */
    _onParentChanged(parent) {
        this.parent = parent;
        this.depth = this.parent ? this.parent.depth + 1 : 0;

        console.log(`_onParentChanged: element ${this.id} parent: ${this.parent.id}, depth${this.depth}`);

        // TODO: notify renderer
    }

    /**
     * Iterates down through the tree, updating child elements
     */
    _updateChildren() {
        console.log(`   . Updating my (${this.id}) children...`);
        for (const element of this.elements) {
            element._onParentChanged(this);
            element._propogateAttachment(element)
            console.log(`   . ... element ${element.id} parent: ${element.parent.id}`);
            element._updateChildren();
        }
        console.log(`   . ...done!`);
    }

    /**
     * Add a new child element to this element
     */
    addElement(element) {
        if (!(element instanceof TactileElement)) {
            throw new Error('Only TactileElements can be added as a child of a TactileElement');
        }

        console.log("addElement...");
        // console.log(" ... adding element to elements");
        this.elements.push(element);
        console.log(" ... calling element._onParentChanged");
        element._onParentChanged(this);
        console.log(`  .. parent is ${element.parent?.id}`);
        // console.log(" ... calling element._propogateAttachment");
        this._propogateAttachment(element);
        // console.log(" ... calling element._updateChildren");
        // notify children of change in tree
        element._updateChildren();
        console.log("...done!");
        return this;
    }

    /**
     * Remove a child element of this element
     */
    removeElement(elementId) {
        console.log("removeElement", elementId);
        const element = this.document.getElement(elementId);
        if (!element) {
            console.warn(`Cannot remove element from tree #${this.document.id}, element#${elementId} does not exist.`);
            return;
        }
        this.elements = this.elements.filter(element => element.id != elementId);
        this._propogateRemoval(element);
        element._updateChildren();
        return this;
    }

    /**
     * Clear computed values
     */
    resetCache() {
        console.log("resetting Cache");
        this.cache = this.cache ?? {};
        this.cache.elements = new Map();
    }

    /**
     * Iterate down through the tree, resolving each branch before the next
     */
    *iterate() {
        yield this;

        for (const element of this.elements) {
            yield* element.iterate();
        }
    }



    /**
     * Iterate down through the tree, resolving each branch before the next
     */
    *iterateUp() {
        yield this;

        if (this.parent) yield* parent.iterateUp();
    }

    /**
     * Find the size of this element when given infinite space
     */
    measure() {
        let totalWidth = this.preferredWidth;
        let totalHeight = this.preferredHeight;


        // Ensure element is equal or larger than its largest child
        if (this.elements.length > 0) {
            // Find the largest width and height of all direct children
            let largestWidth = 0;
            let largestHeight = 0;

            for (const child of this.elements) {
                const childSize = child.measure();
                if (childSize.width > largestWidth) {
                    largestWidth = childSize.width;
                }
                if (childSize.height > largestHeight) {
                    largestHeight = childSize.height;
                }
            }

            if (largestWidth > totalWidth) totalWidth = largestWidth;
            if (largestHeight > totalHeight) totalHeight = largestHeight;
        }

        // Constrain size
        totalWidth = Math.max(this.minWidth, Math.min(totalWidth, this.maxWidth));
        totalHeight = Math.max(this.minHeight, Math.min(totalHeight, this.maxHeight));
        const measuredWidth = totalWidth !== Infinity ? totalWidth : Number.MAX_SAFE_INTEGER;
        const measuredHeight = totalHeight !== Infinity ? totalHeight : Number.MAX_SAFE_INTEGER;

        this.cache.measuredWidth = measuredWidth;
        this.cache.measuredHeight = measuredHeight;


        return {
            width: measuredWidth,
            height: measuredHeight,
        }
    }

    /**
     * Size this entity based on its constraints given from its parent, giving constraints and position to its child entities
     *
     * @param {number} availableWidth
     * @param {number} availableHeight
     * @param {number} offsetX
     * @param {number} offsetY
     */
    layout(availableWidth, availableHeight, offsetX, offsetY) {

        const finalWidth = Math.max(this.minWidth, Math.min(availableWidth, this.maxWidth));
        const finalHeight = Math.max(this.minHeight, Math.min(availableHeight, this.maxHeight));

        // Save geometry
        this.cache.x = offsetX;
        this.cache.y = offsetY;
        this.cache.absoluteX = (this.parent ? this.parent.cache.absoluteX : 0) + offsetX;
        this.cache.absoluteY = (this.parent ? this.parent.cache.absoluteY : 0) + offsetY;
        this.cache.width = finalWidth;
        this.cache.height = finalHeight;

        if (this.elements.length > 0) {
            for (const child of this.elements) {
                child.layout(finalWidth, finalHeight, 0, 0); // We have no layout, so let the children do whatever within the confines of this element's size.
            }
        }

        this.valid = true;
    }

    // Signals

    /**
     * Triggered when a mouse button is clicked while the mouse cursor is on this element, or a controller trigger is fully pressed while its laser is on this element.
     */
    elementPressed = new Signal("ElementPressed");

    /**
     * Triggered when the mouse cursor or controller laser starts hovering on this element.
     */
    elementHoverStarted = new Signal("ElementHoverStarted");

    /**
     * Triggered when the mouse cursor or controller laser stops hovering over this element.
     */
    elementHoverStopped = new Signal("ElementHoverStopped");

    /**
     * Triggered when a mouse button is released after clicking on this element or the controller trigger is partly or fully released after pressing on this element, even if the mouse pointer or controller laser has moved off the element.
     */
    elementReleased = new Signal("ElementReleased");

    /**
     * Triggered when the mouse cursor or controller laser scrolls over this element.
     */
    elementScroll = new Signal("ElementScroll");

//     hoverOverEntity
//
//     mouseMoveOnEntity



}

module.exports = TactileElement;
