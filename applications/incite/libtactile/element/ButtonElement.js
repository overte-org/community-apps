"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElement = require("./TactileElement.js");

/**
 * A ButtonElement which will handle providing feedback to the user when hovering, pressing, or any other actions you might expect with a button.
 */
class ButtonElement extends TactileElement {

    #text

    constructor(options = {}) {
        super(options);
        this.preferredWidth = options.preferredWidth ?? 0.1;
        this.preferredHeight = options.preferredHeight ?? 0.1;
        this.zDepth = options.zDepth ?? 0.02;
        // Button stuff
        this.buttonColorPressed = { red: 0, green: 0, blue: 255 };
        this.buttonColorReleased = options.buttonColorReleased ?? "grey";
        this.buttonColorHover = options.buttonColorHover ?? "cyan";
        this.buttonColorSuccess = options.buttonColorSuccess ?? "green";
        this.buttonColorFailure = options.buttonColorFailure ?? "red";
        this.buttonPressDepth = options.buttonPressDepth ?? 0.01;

        this.color = options.color ?? this.buttonColorReleased;

    }

    get type() {
        return 'ButtonElement';
    }


}

module.exports = ButtonElement;
