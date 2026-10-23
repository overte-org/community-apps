//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

class Animation {

    #url
    #allowTranslation
    #fps
    #firstFrame
    #lastFrame
    #currentFrame
    #running
    #loop
    #hold
    #smoothFrames

    constructor(url) {
        this.#url = url;
    }

    /**
     * The URL of the animation file
     *
     * @type {string}
     */
    get url() {
        return this.#url;
    }

    set url(url) {
        if (!typeof url == 'string') {
            throw TypeError(`Animation url value must be set as a string, received a ${typeof url}`);
        }

        this.#url = url;
    }

    /**
     * Whether to allow translations in the animation file to be played
     *
     * @type {boolean}
     */
    get allowTranslation() {
        return this.#allowTranslation;
    }

    set allowTranslation(bool) {
        if (!typeof bool == 'boolean') {
            throw TypeError(`Animation allowTranslation value must be set as a boolean, received a ${typeof url}`);
        }

        this.#allowTranslation = bool;
    }

    /**
     * The speed in frames/s that the animation is played at.
     *
     * @default 30
     * @type {number}
     */
    get fps() {
        return this.#fps ?? 30;
    }

    set fps(number) {
        if (!typeof number == 'number') {
            throw TypeError(`Animation fps value must be set as a number, received a ${typeof url}`);
        }

        this.#fps = number;
    }

    /**
     * The first frame to play in the animation.
     *
     * @default 0
     * @type {number}
     */
    get firstFrame() {
        return this.#firstFrame ?? 0;
    }

    set firstFrame(number) {
        if (!typeof number == 'number') {
            throw TypeError(`Animation firstFrame value must be set as a number, received a ${typeof url}`);
        }

        this.#firstFrame = number;
    }



    /**
     * The last frame to play in the animation.
     *
     * @default 100000
     * @type {number}
     */
    get lastFrame() {
        return this.#lastFrame ?? 100000;
    }

    set lastFrame(number) {
        if (!typeof number == 'number') {
            throw TypeError(`Animation lastFrame value must be set as a number, received a ${typeof url}`);
        }

        this.#lastFrame = number;
    }

    /**
     * The current frame being played in the animation.
     *
     * @default 0
     * @type {number}
     */
    get currentFrame() {
        return this.#currentFrame ?? 0;
    }

    set currentFrame(number) {
        if (!typeof number == 'number') {
            throw TypeError(`Animation currentFrame value must be set as a number, received a ${typeof url}`);
        }

        this.#currentFrame = number;
    }

    /**
     * Whether the animation should play or not
     *
     * @default false
     * @type {boolean}
     */
    get running() {
        return this.#running;
    }

    set running(bool) {
        if (!typeof bool == 'boolean') {
        throw TypeError(`Animation running value must be set as a boolean, received a ${typeof url}`);
    }
        this.#running = bool;
    }

    /**
     * Whether to repeat the animation, or play once.
     *
     * @default true
     * @type {boolean}
     */
    get loop() {
        return this.#loop;
    }

    set loop(bool) {
        if (!typeof bool == 'boolean') {
            throw TypeError(`Animation loop value must be set as a boolean, received a ${typeof url}`);
        }
        this.#loop = bool;
    }

    /**
     * Whether to maintain the final frame of the animation when it stops playing.
     *
     * @default true
     * @type {boolean}
     */
    get loop() {
        return this.#loop;
    }

    set loop(bool) {
        if (!typeof bool == 'boolean') {
            throw TypeError(`Animation loop value must be set as a boolean, received a ${typeof url}`);
        }
        this.#loop = bool;
    }

    toAnimationProperties() {
        return {
            url: this.url,
            allowTranslation: this.allowTranslation,
            fps: this.fps,
            firstFrame: this.firstFrame,
            lastFrame: this.lastFrame,
            currentFrame: this.currentFrame,
            running: this.running,
            loop: this.loop,
            hold: this.hold,
            smoothFrames: this.smoothFrames,
        };
    }

    toJSON() {
        return this.toAnimationProperties();
    }

}

module.exports = Animation;
