//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * Tracks a graph's previous ExecutionFrames.
 */
class ExecutionReel {
    #graphId
    #frames

    constructor(graphId, frames = []) {
        this.#graphId = graphId;
        this.#frames = frames ?? [];
    }

    /**
     * The id of the graph this ExecutionReel is associated with.
     *
     * @type {number}
     */
    get graphId() {
        return this.#graphId;
    }

    /**
     * ExecutionFrames which represent previous executions for the graph.
     * Only stores a limited number of frames. See `maxSize`.
     *
     * @type Array<ExecutionFrame>
     */
    get frames() {
        return this.#frames.slice();
    }

    /**
     * The maximum total number of ExecutionFrames which can be stored in this reel
     *
     * @type {number}
     */
    get maxSize() {
        return 20;
    }

    /**
     * The last successful ExecutionFrame stored in this reel.
     *
     * @type {ExecutionFrame}
     */
    get lastSuccess() {
        return this.#frames.findLast((frame) => frame.executionSuccess);
    }

    /**
     * The last failed ExecutionFrame stored in this reel.
     *
     * @type {ExecutionFrame}
     */
    get lastFailure() {
        return this.#frames.findLast((frame) => !frame.executionSuccess);
    }

    /**
     * Adds a new ExecutionFrame to the reel.
     * Will remove the oldest frame to make room
     * when the reel has reached capacity.
     *
     * @param {ExecutionFrame} frame
     */
    add(frame) {
        this.#frames.push(frame);
        if (frame.length > this.maxSize) {
            this.#frames.shift();
        }
    }
}

module.exports = ExecutionReel;
