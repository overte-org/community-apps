"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElements = require("../element/index.js");
const BaseRenderer = require("./BaseRenderer.js");
const documentManager = require("../TactileStore.js").documentManager;

/**
 * @typedef {Object} DocumentElementIds
 * @property {number} documentId
 * @property {number} elementId
 */

/**
 * Render TactileElements to an Overte world
 * @property {string} renderContext
 * @property {string} rootEntityId
 * @property {Array<string>} entities
 * @property {number} scale - The scale at which to render elements
 * @property {Vec3} originOffset
 * @property {Map} entityMap - entityId, elementId
 * @property {Map} elementMap
 * @property {Map} clickableElementMap
 * @property {Map<string,DocumentElementIds>} entityToDocumentAndElementIds
 * @property {Vec3} position - The position in the world
 * @property {Quat} orientation - The orientation in the world
 * @property {Vec3} dimensions
 * @property {number} rootWidth
 * @property {number} rootHeight
 * @property {number} rendererCount - The number of times this renderer has rendered
 * @property {Vec3} rootPosition - The location in the world where the root element is rendered
 * @property {Vec3} rootEntityPosition - The root entity's position in the world
 * @property {Vec3} rootEntityRotation - The root entity's world rotation
 */
class TactileRenderer extends BaseRenderer {
    #rootEntityId

    constructor(options = {}) {
        super(options);
        //this.element = options.element ?? null;
        this.renderContext = options.renderContext ?? "local";
        this.#rootEntityId = options.rootEntityId ?? null;
        this.entities = options.entities ?? [];
        this.scale = options.scale ?? 1;
        this.originOffset = options.originOffset ?? { x: 0, y: 0, z: 0 };
        this.entityMap = new Map();
        this.elementMap = new Map();

        this.clickableElementMap = new Map();

        this.entityToDocumentAndElementIds = new Map() // entityId: { documentId, elementId }

        this.position = options.position ?? { x: 0, y: 0, z: 0 };
        this.orientation = options.orientation ?? { x: 0, y: 0, z: 0, w: 1 };
        this.dimensions = {x: 0, y: 0, z: 0}
        this.rootWidth = 0;
        this.rootHeight = 0;

        this.subscribe();

        Script.scriptEnding.connect(() => {
            this.cleanup();
            console.log("TactileRenderer ended.");
        });

        this.rendererCount = 0;
    }

    subscribe() {
        Entities.mousePressOnEntity.connect(this.onMousePressOnEntity.bind(this));
        Entities.hoverEnterEntity.connect(this.onHoverEnterEntity.bind(this));
        Entities.hoverLeaveEntity.connect(this.onHoverLeaveEntity.bind(this));
        Entities.mouseReleaseOnEntity.connect(this.onMouseReleaseOnEntity.bind(this));
        Entities.scrollOnEntity.connect(this.onScrollOnEntity.bind(this));
    }

    getElementFromEntityId(entityId) {
        const documentElementIds = this.entityToDocumentAndElementIds.get(entityId);
        if (!documentElementIds) return;
        const documentId = documentElementIds.documentId;
        const elementId = documentElementIds.elementId;
        if (typeof documentId == 'undefined' || typeof elementId == 'undefined') {
            console.warn("Received a DocumentElementId from TactileRenderer, but the data was incomplete.", documentId, elementId);
            return;
        }
        const document = documentManager.getDocument(documentId);
        return document.getElement(elementId);
    }

    onMousePressOnEntity(entityId, pointerEvent) {
        if (!pointerEvent.isPrimaryButton) return;
        const element = this.getElementFromEntityId(entityId);
        if (!(element instanceof TactileElements.TactileElement)) return;
        element.elementPressed.emit(element.documentId, element.id);
    }

    onHoverEnterEntity(entityId, pointerEvent) {
        const element = this.getElementFromEntityId(entityId);
        if (!(element instanceof TactileElements.TactileElement)) return;
        element.elementHoverStarted.emit(element.documentId, element.id);
    }

    onHoverLeaveEntity(entityId, pointEvent) {
        const element = this.getElementFromEntityId(entityId);
        if (!(element instanceof TactileElements.TactileElement)) return;
        element.elementHoverStopped.emit(element.documentId, element.id);
    }

    onMouseReleaseOnEntity(entityId, pointerEvent) {
        if (!pointerEvent.isPrimaryButton) return;

        const element = this.getElementFromEntityId(entityId);
        if (!(element instanceof TactileElements.TactileElement)) return;
        element.elementReleased.emit(element.documentId, element.id);
    }

    onScrollOnEntity(entityId, pointEvent) {
        const element = this.getElementFromEntityId(entityId);
        if (!(element instanceof TactileElements.TactileElement)) return;
        element.elementScroll.emit(element.documentId, element.id);
    }

    get rootEntityId() {
        return this.#rootEntityId;
    }

    set rootEntityId(entityId) {
        this.#rootEntityId = entityId;
        return this;
    }

    get rootEntityPosition() {
        return this.position; // TODO: Get updated entity position
    }

    get rootEntityRotation() {
        return this.orientation; // TODO: Get updated entity orientation
    }

    get rootPosition() {
        return this.rootEntityId == undefined ? this.position : this.rootEntityPosition; // TODO: What if the root element somehow has a non-origin x/y?
    }

    addElement(layoutElement, entityId) {
        this.entities.push(entityId);
        this.entityMap.set(layoutElement.id, entityId);
        this.elementMap.set(entityId, layoutElement.id);
        return this;
    }

    removeElement(layoutElementOrId) {
        const id = layoutElementOrId instanceof LayoutElement.id ?? layoutElementOrId; // TODO What??
        const entityId = this.entityMap.get(id);
        Entities.deleteEntity(entityId);
        this.entities.delete(id);
        this.entityMap.delete(id);
        this.elementMap.delete(entityId);
        return this;
    }

    /**
     * Final cleanup tasks before this renderer ceases activities
     */
    cleanup() {
        for (const entityId of this.entities) {
            Entities.deleteEntity(entityId);
        }
    }

    /**
     * Creates an entity to represent the given element
     * @param {TactileElement} element
     * @param {boolean} isRoot - Is this entity the root entity all other entities will be parented to?
     */
    createEntity(element, isRoot, renderType = "local") {
        console.log(`createEntity ... offsetZ=${element.offsetZ}, depth=${element.depth}`);

        console.log(`render element ${this.rendererCount} has a depth of ${element.depth} with offset of ${element.offsetZ} and parent depth of ${element.parent?.depth}`);
        if (isRoot) {
            // this is the root element, save its entityId seperately.
            console.log("Before I create root entity; saving some details...");
            this.dimensions = {x: element.cache.width, y: element.cache.height, z: 0.2};
            console.log(` ... dimensions: ${JSON.stringify(this.dimensions)}`);
            //this.entityOrigin = {x: entityProperties.position.x - (element.cache.width/2), y: entityProperties.position.y - (element.cache.height/2), z: entityProperties.position.z - 0.1}
            console.log(` ... entityOrigin: ${JSON.stringify(this.entityOrigin)}`);
            console.log("...done!");
        }
        const entityProperties = this.entityProperties(element);
        console.log(`Placing entity ${element.id} (${this.rendererCount}) @ ${JSON.stringify(entityProperties.position)}`);
        const entityId = Entities.addEntity(entityProperties, renderType);

        // Store entities for later
        this.entities.push(entityId);
        this.entityMap.set(element.id, entityId);
        this.elementMap.set(entityId, element.id);
        this.entityToDocumentAndElementIds.set(entityId, {
            documentId: element.documentId,
            elementId: element.id,
        })

        if (isRoot) {
            // this is the root element, save its entityId seperately.
            console.log("Created root entity; saving some details...");
            this.rootEntityId = entityId;
            console.log(` ... rootEntityId: ${this.rootEntityId}`);
            console.log("...done!");
        }
        this.rendererCount += 1;
        return entityId;
    }

    /**
     * Creates entityProperties for rendering the given element
     * @param {Object} element
     */
    entityProperties(element) {
        console.log(element.id, "entityProperties - start");
        const DEFAULT_ENTITY_PROPERTIES = {
            All: {
                description: "",
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                collidesWith: "static,dynamic,kinematic,otherAvatar,myAvatar",
                collisionSoundURL: "",
                cloneable: false,
                ignoreIK: true,
                canCastShadow: true,
                href: "",
                script: "",
                serverScripts: "",
                velocity: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                angularVelocity: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                restitution: 0.5,
                friction: 0.5,
                density: 1000,
                dynamic: false,
                grab: {
                    grabbable: false,
                    equipable: false,
                }
            },
            GridElement: {
                type: "Grid",
                followCamera: false,
                majorGridEvery: 1,
                minorGridEvery: 0.2,
            },
            LineElement: {
                type: "PolyLine",
            },
            TextElement: {
                type: "Text",
                text: "Text",
                textColor: { red: 255, green: 255, blue: 255 },
                backgroundColor: { red: 0, green: 0, blue: 0 },
                lineHeight: 0.06,
                faceCamera: false,
            }
        }

        const position = this.TwoToThreeD(element.cache.absoluteX,
                                          element.cache.absoluteY,
                                          element.cache.width,
                                          element.cache.height,
                                          element.absoluteZ,
                                          element.id == 0);

        console.log(`zDepth debug - zdepth: ${element.zDepth}, offsetZ: ${element.offsetZ}, absoluteZ: ${element.absoluteZ}`);

        // set default properties
        let properties = { ... DEFAULT_ENTITY_PROPERTIES.All,
                            name: `Tactile Element ${element.id} (${this.rendererCount})`,
                            position: position,
                            rotation: this.rootEntityRotation,
                            parentID: element.id == 0 ? "{00000000-0000-0000-0000-000000000000}" : this.rootEntityId,
                            dimensions: [element.cache.width, element.cache.height, element.zDepth],
                            unlit: element.unlit,
        }

        console.log(element.id, "entityProperties - switch time!");

        console.log(element.id, "element.type is", element.type);

        // Add variant-specific properties
        switch(element.type) {
            case 'TextElement':
                console.log(element.id, "entityProperties - TextElement!");
                properties = { ... properties, ... DEFAULT_ENTITY_PROPERTIES.TextElement }
                properties.text = element.text;
                properties.backgroundColor = element.color;
                properties.backgroundAlpha = element.alpha;
                properties.textColor = element.textColor;
                properties.textAlpha = element.textAlpha;
                properties.lineHeight = element.lineHeight;
                break;
            case 'GridElement':
                console.log(element.id, "entityProperties - GridElement!");
                properties = { ... properties, ... DEFAULT_ENTITY_PROPERTIES.GridElement }

                break;
            case 'LineElement':
                console.log(element.id, "entityProperties - LineElement!");
                properties = { ... properties, ... DEFAULT_ENTITY_PROPERTIES.LineElement };
                properties.linePoints = element.linePoints.map(point => {
                    return {
                        x: point.x - element.parent.cache.width/2,
                        y: element.parent.cache.height/2 - point.y,
                        z: point.z
                    }
                });
                properties.normals = element.normals;
                properties.strokeWidths = element.strokeWidths;
                properties.textures = element.textures;
                properties.isUVModeStretch = element.isUVModeStretch;
                properties.glow = element.glow;
                properties.faceCamera = element.faceCamera;
                break;
            default:
                console.log(element.id, "entityProperties - default!")
                properties.type = "Box";
                properties.color = element.color;
                properties.alpha = element.alpha;
                break;
        }

        console.log("entityProperties - I switched.");

        return properties;
    }

    /**
     * Updates the entity which the given element is rendered to
     */
    updateEntity(element, isRoot) {
        const entityProperties = this.entityProperties(element);

        Entities.editEntity(this.entityMap.get(element.id), entityProperties);
    }

    /**
     * Renders the given element's current state into the world
     */
    renderElement(element) {
        const entityId = this.entityMap.get(element.id);
        const isRoot = element.id == 0;
        if (entityId) {
            this.updateEntity(element, isRoot);
        } else {
            const entityID = this.createEntity(element, isRoot, this.renderContext); // TODO: IsRoot? need to check if it's a TactileDocument

            // Setup interactive callbacks

            // ButtonElement
            // TODO: Disconnect when element is no longer being rendered
            if (element instanceof TactileElements.ButtonElement) {
                element.elementPressed.connect((documentId, elementId) => {
                    console.log("renderElement button elementPressed");
                    const document = documentManager.getDocument(documentId);
                    const buttonElement = document.getElement(elementId);
                    buttonElement.color = buttonElement.buttonColorPressed;
                    buttonElement.zDepth = buttonElement.buttonPressDepth;
                });
                element.elementReleased.connect((documentId, elementId) => {
                    console.log("renderElement button elementReleased");
                    const document = documentManager.getDocument(documentId);
                    const buttonElement = document.getElement(elementId);
                    buttonElement.color = buttonElement.buttonColorHover;
                    buttonElement.zDepth = 0.02; // TODO: This should not be hardcoded
                });
                element.elementHoverStarted.connect((documentId, elementId) => {
                    console.log("renderElement button elementHoverStarted");
                    const document = documentManager.getDocument(documentId);
                    const buttonElement = document.getElement(elementId);
                    buttonElement.color = buttonElement.buttonColorHover;
                });
                element.elementHoverStopped.connect((documentId, elementId) => {
                    console.log("renderElement button elementHoverStopped");
                    const document = documentManager.getDocument(documentId);
                    const buttonElement = document.getElement(elementId);
                    buttonElement.color = buttonElement.buttonColorReleased;
                });
            }
        }
    }

    /**
     * Renders the absence of the given element into the world
     */
    destroyElement(element) {
        console.log("Destroying element", element.id);
        const entityId = this.entityMap.get(element.id);
        if (entityId) {
            Entities.deleteEntity(entityId);

            const index = this.entities.indexOf(entityId);
            this.entities.splice(index, 1);
            this.entityMap.delete(element.id);
            this.elementMap.delete(entityId);
            this.entityToDocumentAndElementIds.delete(entityId);
        } else {
            console.log("Asked to destroy element entity, but element has not been rendered; no such entity known to exist.", element.id);
        }
    }

    /**
     * Convert 2D coordinates to 3D coordinates for rendering to world
     */
    TwoToThreeD(x,
                y,
                width = 0,
                height = 0,
                offsetZ = 0,
                isRoot = false) {
        // Adjusted origin
        // 2D elements are positioned by their top left corner, whilst 3D entities are positioned by their center;
        //
        const origin = Vec3.sum(this.rootPosition, {
            x: -(this.dimensions.x/2),
            y: (this.dimensions.y/2),
            z: 0
        });

        const offsetFromOrigin = Vec3.multiplyQbyV(this.orientation, {
            x: (x) * this.scale + (width/2),
            y: (-y) * this.scale - (height/2),
            z: offsetZ,
        });

        print(`TwoToThreeD .. x=${x}, y=${y}, offsetZ=${offsetZ}, width=${width}, height=${height}, isRoot=${isRoot}, origin={x:${origin.x},y:${origin.y},z:${origin.z}}, offsetFromOrigin={x:${offsetFromOrigin.x},y:${offsetFromOrigin.y},z:${offsetFromOrigin.z}}`);

        return Vec3.sum(origin, offsetFromOrigin);
    }
}

module.exports = TactileRenderer;
