//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * Class representing 3D Model data.
 */
class Model {
    #modelUrl
    #modelScale
    // #blendshapeCoefficients
    #useOriginalPivot
    // #loadPriority
    // #textures
    // #originalTextures
    #shapeType
    #compoundShapeUrl
    #animation
    // #joinRotations
    // #joinRotationsSet
    // #joinTranslations
    // #joinTranslationsSet
    // #relayParentJoints
    #groupCulled

    /**
     * @param {string} modelUrl
     */
    constructor(modelUrl) {
        this.#modelUrl = modelUrl;
    }

    /**
     * The URL to the model file
     *
     * @type {string}
     * @default ""
     */
    get modelUrl() {
        return this.#modelUrl ?? "";
    }

    set modelUrl(modelUrl) {
        this.modelUrl = modelUrl;
    }

    /**
     * The scale factor applied to the model's dimensions
     *
     * @type {Vec3}
     */
    get modelScale() {
        return this.#modelScale ?? { x: 1.0, y: 1.0, z: 1.0 };
    }

    set modelScale(modelScale) {
        this.#modelScale = modelScale;
    }

    /**
     * if false, the model will be centered based on its content, ignoring any offset in the model itself. If true, the model will respect its original offset.
     *
     * @type {boolean}
     * @default false
     */
    get useOriginalPivot() {
        return this.#useOriginalPivot ?? false;
    }

    set useOriginalPivot(useOriginalPivot) {
        this.#useOriginalPivot = useOriginalPivot;
    }

    /**
     * The shape of the collision hull used if collisions are enabled.
     *
     * See {@link https://apidocs.overte.org/global.html#ShapeType|ShapeType} for possible values
     *
     * @type {string}
     */
    get shapeType() {
        return this.#shapeType;
    }

    set shapeType(shapeType) {
        this.#shapeType = shapeType;
    }

    /**
     * The model file to use for the compound shape if `shapeType` is "compound".
     *
     * @type {string}
     * @default ""
     */
    get compoundShapeUrl() {
        return this.#compoundShapeUrl ?? "";
    }

    set compoundShapeUrl(url) {
        this.#compoundShapeUrl = url;
    }

    /**
     * An animation to play on this model.
     *
     * @type {object}
     * @see {@link https://apidocs.overte.org/Entities.html#.AnimationProperties|Entities.AnimationProperties}
     */
    get animation() {
        return this.#animation;
    }

    set animation(animation) {
        this.#animation = animation;
    }

    /**
     * `true` if the mesh parts of the model are LOD culled as a group, `false` if separate mesh parts are LOD culled individually.
     *
     * @type {boolean}
     */
    get groupCulled() {
        return this.#groupCulled
    }

    set groupCulled(bool) {
        this.#groupCulled = bool;
    }
}

module.exports = Model;
