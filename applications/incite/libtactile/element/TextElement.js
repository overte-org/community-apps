"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElement = require("./TactileElement.js");

/**
 * A TextElement for displaying text
 */
class TextElement extends TactileElement {

    #text

    constructor(options = {}) {
        super(options);
        this.text = options.text ?? "text";
        this.color = options.color ?? { red: 0, green: 0, blue: 0 };
        this.textColor = options.textColor ?? { red: 255, green: 255, blue: 255 };
        this.textAlpha = options.textAlpha ?? 1;
        this.lineHeight = options.lineHeight ?? 0.06;
        this.zDepth = options.zDepth ?? 0.01

    }

    get type() {
        return 'TextElement';
    }

    /**
     * The text displayed on this element
     *
     * @type {string}
     */
    get text() {
        return this.#text;
    }

    set text(newText) {
        this.#text = newText;
        this.valid = false;
    }

    measure() {
        const superSize = super.measure(); // The size of the child elements

        // The textSize is up to the renderer and will be defined and cached once
        // this element has been rendered for the first time.
        const textSize = this.cache.textSize
                ? this.cache.textSize
                : {width:0,height:0}

        return {
            width: superSize.width > textSize.width
                    ? superSize.width
                    : textSize.width,
            height: superSize.height > textSize.height
                    ? superSize.height
                    : textSize.height
        }

    }


}

module.exports = TextElement;
