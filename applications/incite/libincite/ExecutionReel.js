//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
"use strict"

/**
 * Tracks a graph's previous ExecutionFrames.
 */
class ExecutionReel {
    /**
     * The graph this ExecutionReel is associated with.
     */
    #graphId

    /**
     * ExecutionFrames which represent previous executions for the graph.
     * Only stores a limited number of frames. See `maxSize`.
     */
    #frames

    constructor(graphId, frames = []) {
        this.#graphId = graphId;
        this.#frames = frames ?? [];
    }

    get graphId() {
        return this.#graphId;
    }

    /**
     * Returns a copy of all recent ExecutionFrames.
     */
    get frames() {
        return this.#frames.slice();
    }

    get maxSize() {
        return 20;
    }

    get lastSuccess() {
        return this.#frames.findLast((frame) => frame.executionSuccess);
    }

    get lastFailure() {
        return this.#frames.findLast((frame) => !frame.executionSuccess);
    }

    /**
     * Adds a new ExecutionFrame to the reel.
     * Will remove the oldest frame to make room
     * when the reel has reached capacity.
     */
    add(frame) {
        frames.push(frame);
        if (frame.length > this.maxSize) {
            frames.shift();
        }
    }
}

module.exports = ExecutionReel;
