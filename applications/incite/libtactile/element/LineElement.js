"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElement = require("./TactileElement.js");

/**
 * A TextElement for displaying text
 *
 * @property {Array<Vec3>} linePoints - The sequence of points to draw lines between. The coords are in 2D coordinates relative to its parent. A maximum of 70 points can be specified. Note: The Z coordinate will be relative to this element's offset position.
 * @property {Array<Vec3>} normals - The normal vectors for the line's surface at the linePoints. The values are relative to the entity's orientation.
 * @property {arrray<number>} strokeWidths - The widths, in m, of the line at the linePoints.
 * @property {Array<Vec3} strokeColors - The base colors of each point, with values in the range 0.0,0.0,0.0 – 1.0,1.0,1.0. If there are more line points than stroke colors, the color property value is used for the remaining points.
 * @property {string} textures - The URL of a JPG or PNG texture to use for the lines.
 * @property {boolean} isUVModeStretch - true if the texture is stretched to fill the whole line, false if the texture repeats along the line.
 * @property {boolean} glow - true if the opacity of the strokes drops off away from the line center, false if it doesn't.
 * @property {boolean} faceCamera - true if each line segment rotates to face the camera, false if they don't.
 */
class LineElement extends TactileElement {

    #linePoints
    #normals
    #strokeWidths
    #textures
    #isUVModeStretch
    #glow
    #faceCamera

    constructor(options = {}) {
        super(options);
        this.#linePoints = options.linePoints ?? [];
        this.#normals = options.normals ?? []
        this.#strokeWidths = options.strokeWidths ?? []
        this.#textures = options.textures ?? "";
        this.#isUVModeStretch = options.isUVModeStretch ?? true;
        this.#glow = options.glow ?? false;
        this.#faceCamera = options.faceCamera ?? false;
        this.zDepth = options.zDepth ?? 0.01

        this.setDefaults(this.#linePoints.length);


    }

    get type() {
        return 'LineElement';
    }

    get linePoints() {
        return [ ... this.#linePoints]; // Returning a copy to ensure any changes to the array can be caught when it is later replaced.
    }

    set linePoints(points) {
        if (points === this.#linePoints) return;
        this.#linePoints = points;

        const length = this.#linePoints.length

        // normals and strokeWidths MUST be set in order for a PolyLine to render,
        // so we may as well make sure they have defaults set so we don't need to specify them manually later.'
        this.setDefaults(length);

        this.valid = false;
    }

    setDefaults(numLinePoints) {
        if (this.#normals.length != numLinePoints) {
            this.#normals = new Array(numLinePoints).fill({ x: 0, y: 0, z: 1 });
        }
        if (this.#strokeWidths.length != numLinePoints) {
            this.#strokeWidths = new Array(numLinePoints).fill(0.01);
        }
    }

    get normals() {
        return [ ... this.#normals];
    }

    set normals(normals) {
        if (normals === this.#normals) return;
        this.#normals = normals;

        this.valid = false;
    }

    get strokWidths() {
        return [ ... this.#strokeWidths];
    }

    set strokeWidths(strokeWidths) {
        if (strokeWidths === this.#strokeWidths) return;
        this.#strokeWidths = strokeWidths;

        this.valid = false;
    }

    get textures() {
        return this.#textures;
    }

    set textures(textures) {
        if (typeof textures != 'string') return;
        this.#textures = textures;

        this.valid = false;
    }

    get isUVModeStretch() {
        return this.#isUVModeStretch;
    }

    set isUVModeStretch(bool) {
        if (typeof bool != 'boolean') return;
        this.#isUVModeStretch = isUVModeStretch;

        this.valid = false;
    }

    get glow() {
        return this.#glow;
    }

    set glow(bool) {
        if (typeof bool != 'boolean') return;
        this.#glow = glow;

        this.valid = false;
    }

    get faceCamera() {
        return this.#faceCamera;
    }

    set faceCamera(bool) {
        if (typeof bool != 'boolean') return;
        this.#faceCamera = faceCamera;

        this.valid = false;
    }

}

module.exports = LineElement;
