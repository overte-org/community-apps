"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Layout = require("./Layout.js");

/**
 * Base Layout class
 *
 */
class FloatingLayout extends Layout {
    constructor(options) {
        super(options);

    }

    get type() {
        return 'FloatingLayout';
    }

    findAvailablePosition(width, height) {
        const visibleElements = this.visibleElements;
        const placedElements = this.placedElements;
        console.log(`findAvailablePosition - placedElements: ${placedElements.length}`);
        const cache = this.cache;
        const spacing = this.spacing;
        const margins = this.margins;
        const candidates = generateCandidates(width, height);

        let bestRating = 0;
        let bestCandidate = null;

        for (const candidate of candidates) {
            const rating = rateMyCandidate(candidate); // 0.0 - 1.0; 1.0 is ideal

            console.log(`Candidate ${candidate.x},${candidate.y} rating is ${rating} (Best: ${bestRating})`);

            if (rating > bestRating) {
                bestRating = rating;
                bestCandidate = candidate
            }

        }

        // We should have a best candidate, but if there were no good candidates
        // we should just throw it down *somewhere*
        if (!bestCandidate) {
            const offset = placedElements.length*0.1;
            bestCandidate = { x: this.margins.left+offset, y: this.margins.top+offset};
            console.log("Could not find a good place to position the element.");
        }

        return bestCandidate;

        /**
         * Finds the area that would overlap
         *
         * @returns {number} - total overlapping area
         */
        function getOverlap(candidatePosition, element) {
            console.log(`getOverlap candidatePosition: ${candidatePosition.x},${candidatePosition.y}, cache: ${cache.width},${cache.height}, element.cache: ${element.cache.x},${element.cache.y} ${element.cache.measuredWidth},${element.cache.measuredHeight}`)

            const overlapX = Math.min(candidatePosition.x + cache.width,
                                      element.cache.x + element.cache.measuredWidth) - Math.max(candidatePosition.x, element.cache.x);
            const overlapY = Math.min(candidatePosition.y + cache.height,
                                      element.cache.y + element.cache.measuredHeight) - Math.max(candidatePosition.y, element.cache.y);

            console.log(`getOverlap overlap: ${overlapX},${overlapY}`);
            return overlapX * overlapY;
        }

        /**
         * Rates candidate based on overlap with neighbouring elements
         *
         * @returns {number} - A number between 0.0 and 1.0, where 1.0 is an ideal candidate;
         */
        function rateMyCandidate(candidatePosition) {
            let totalOverlap = 0;
            let greatestOverlap = 0;

            console.log("Checking overlaps...");
            for (const element of placedElements) { // Elements which already have a place in the layout
                const overlap = getOverlap(candidatePosition, element);

                console.log(" ... Overlap is", overlap, "for element", element.id);

                totalOverlap += overlap;
                if (overlap > greatestOverlap) greatestOverlap = overlap;
            }

            console.log("... totalOverlap:", totalOverlap, "greatestOverlap: ", greatestOverlap);

            const totalArea = width * height;
            const areaRemaining = totalArea - greatestOverlap;

            return areaRemaining / totalArea;
        }

        function generateCandidates(width, height) {
            // candidate positions to check
            const candidates = [];

            // Ideal first position
            candidates.push({ x: margins.left, y: margins.top });

            function withinBounds(x, y, w, h) {
                return x >= 0
                        && y >= 0
                        && x + w <= cache.width
                        && y + h <= cache.height
            }

            function pushIfWithinBounds(x, y, w, h) {
                if (withinBounds(x, y, w, h)) {
                    candidates.push({x: x, y: y});
                } else {
                    console.warn(`Out of bounds when generating candidate; x: ${x}, y: ${y}, width: ${w}, height: ${h}, floatingLayout: ${cache.width},${cache.width}`)
                }
            }

            // Check below and to the right of all existing (valid) elements
            for (const element of placedElements) {
                // Below
                pushIfWithinBounds(element.cache.x,
                                   element.cache.y + element.cache.measuredHeight + spacing,
                                   element.cache.measuredWidth, element.cache.measuredHeight);
                // Right
                pushIfWithinBounds(element.cache.x + element.cache.measuredWidth + spacing,
                                   element.cache.y,
                                   element.cache.measuredWidth, element.cache.measuredHeight);
            }

            // More candidates could come from a grid, each grid should be half
            // the provided width/height for best coverage
            // Ideally candidates would be scored based on amount of overlapping;
            // with a configurable amount of overlap accepted and higher amount
            // of overlap having a greater penalty to prefer less overlap.

            // Filter out candidates which would extend beyond the edges
            return candidates;
        }
    }



    measure() {
        // Let's measure the width and height of each row, to accomodate the desired element sizes


        console.log("Meausuring...");

        let totalArea = 0;
        this.visibleElements.forEach((element, index) => {

            const dimensions = element.measure();
            const width = dimensions.width;
            const height = dimensions.height;

            totalArea += (width + this.spacing + this.margins.left + this.margins.right) * (height + this.spacing + this.margins.top + this.margins.bottom);
        });

        // Scale up totalArea to allow for a bit more space
        const estimatedArea = totalArea * 1.5

        // Size of this layout should be a ratio of 4:1
        // unless connections dictate an alternative distribution

        let measuredWidth = Math.sqrt(estimatedArea + this.margins.left + this.margins.right);
        let measuredHeight = Math.sqrt(estimatedArea) + this. margins.top + this.margins.bottom;
        measuredWidth = measuredWidth !== Infinity ? measuredWidth : Number.MAX_SAFE_INTEGER;
        measuredHeight = measuredHeight !== Infinity ? measuredHeight : Number.MAX_SAFE_INTEGER;

        console.log("... Measured!");

        console.log(`width: ${measuredWidth}, height: ${measuredHeight}`);

        this.cache.measuredWidth = measuredWidth;
        this.cache.measuredHeight = measuredHeight;

        return {
            width: measuredWidth,
            height: measuredHeight,
        }
    }

    layout(availableWidth, availableHeight, x, y) {
        console.log(`availableWidth: ${availableWidth}, availableHeight: ${availableHeight}, x: ${x}, y: ${y}`)

        const finalWidth = Math.max(this.minWidth, Math.min(availableWidth, this.maxWidth));
        const finalHeight = Math.max(this.minHeight, Math.min(availableHeight, this.maxHeight));

        const innerMeasuredWidth = this.cache.measuredWidth - this.margins.left - this.margins.right;
        const innerMeasuredHeight = this.cache.measuredHeight - this.margins.top - this.margins.bottom;

        const innerWidth = finalWidth - this.margins.left - this.margins.right;
        const innerHeight = finalHeight - this.margins.top - this.margins.bottom;

        this.cache.x = x;
        this.cache.y = y;
        this.cache.absoluteX = (this.parent ? this.parent.cache.absoluteX : 0) + x;
        this.cache.absoluteY = (this.parent ? this.parent.cache.absoluteY : 0) + y;
        this.cache.width = finalWidth;
        this.cache.height = finalHeight;

        console.log("Calculating positions...");
        this.visibleElements.forEach((element, index) => {

            // If element is already position, we don't need to generate a new
            // position for it.
            // We may need to update its position if the this has resized. TODO
            if (element.isPlaced) {
                console.log("Element is already positioned; let's leave it where it is. Element:", element.id)
                element.layout(element.cache.measuredWidth, element.cache.measuredHeight, element.cache.x, element.cache.y);
            } else {
                const position = this.findAvailablePosition(element.cache.measuredWidth, element.cache.measuredHeight);

                element.layout(element.cache.measuredWidth, element.cache.measuredHeight, position.x, position.y);
            }

        });

        console.log("totalWidth:", this.cache.measuredWidth, "totalHeight:", this.cache.measuredHeight);

        this.valid = true;

        return this.cache;
    }

}

module.exports = FloatingLayout;
