//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * A callback which is called when the current animation on the model of the element has changed.
 *
 * @callback AnimationChangedCallback
 * @param {string} animationKey - The animation key of the model's animation
 */

class AnimationHandler {

    #currentAnimation;
    #element;
    #animationChangedCallback;


    /**
     * Create a new AnimationHandler
     *
     * @param {TactileElement} element
     * @param {AnimationChangedCallback} animationChangedCallback
     */
    constructor(element, animationChangedCallback) {
        this.#element = element;
        this.#animationChangedCallback = animationChangedCallback.bind(element);
    }

    /**
     * The currently set animation key, used to select which animation to play from a model
     *
     * @type {string}
     */
    get currentAnimation() {
        return this.#currentAnimation;
    }

    /**
     * The element to handle animations for
     *
     * @type {TactileElement}
     */
    get element() {
        return this.#element;
    }

    /**
     * Sets the running animation.
     *
     * If no delay is specified the animation will change immediately,
     * otherwise it will change after the specified number of ms.
     *
     * @param {string} animationKey - The string representing the animation in
     * the element model's animations.
     * @param {number} [delay=0] - The number of milliseconds before the animation should change
     */
    setAnimation(animationKey, delay = 0) {
        if (delay == 0) {
            this.#animationChange(animationKey);
        } else {
            Script.setTimeout(() => {
                this.#animationChange(animationKey);
                console.log("Delayed animation started:", animationKey);
            }, delay);
        }
    }

    #animationChange(animationKey) {
        this.#currentAnimation = animationKey;
        this.#animationChangedCallback(animationKey);
    }
}

module.exports = AnimationHandler;
