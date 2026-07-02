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
class RowLayout extends Layout {
    constructor(options) {
        super(options);

    }

    get type() {
        return 'RowLayout';
    }

    measure() {
        // Let's measure the width and height of each row, to accomodate the desired element sizes


        console.log("Meausuring...");

        let totalWidth = this.margins.left;
        let totalChildWidth = 0;
        let totalChildHeight = 0;
        let totalHeight = this.preferredHeight;
        this.visibleElements.forEach((element, index) => {

            const dimensions = element.measure();
            const width = dimensions.width;
            const height = dimensions.height;

            totalChildWidth += width

            totalWidth += (index != 0 ? this.spacing : 0) + width
            if (totalChildHeight < height) totalChildHeight = height;
        });
        totalWidth += this.margins.right;
        totalWidth = Math.max(totalWidth, this.preferredWidth);

        if (totalChildHeight > totalHeight) totalHeight = totalChildHeight;
        totalHeight + this.margins.top + this.margins.bottom;
        totalHeight = Math.max(totalHeight, this.preferredHeight);

        let measuredWidth = Math.max(this.minWidth, Math.min(totalWidth, this.maxWidth));
        let measuredHeight = Math.max(this.minHeight, Math.min(totalHeight, this.maxHeight));
        measuredWidth = measuredWidth !== Infinity ? measuredWidth : Number.MAX_SAFE_INTEGER;
        measuredHeight = measuredHeight !== Infinity ? measuredHeight : Number.MAX_SAFE_INTEGER;

        if (!Number.isFinite(measuredWidth)) Number.MAX_SAFE_INTEGER

        console.log("... Measured!");

        console.log(`width: ${measuredWidth}, height: ${measuredHeight}`);

        this.cache.measuredWidth = measuredWidth;
        this.cache.measuredHeight = measuredHeight;
        this.cache.totalChildWidth = totalChildWidth;
        this.cache.totalChildHeight = totalChildHeight;

        return {
            width: measuredWidth,
            height: measuredHeight,
        }
    }

    layout(availableWidth, availableHeight, x, y) {
        console.log(`availableWidth: ${availableWidth}, availableHeight: ${availableHeight}, x: ${x}, y: ${y}`)

        const maxWidth = Math.max(this.minWidth, Math.min(availableWidth, this.maxWidth));
        const maxHeight = Math.max(this.minHeight, Math.min(availableHeight, this.maxHeight));

        const finalWidth = Math.min(this.cache.measuredWidth, maxWidth);
        const finalHeight = Math.min(this.cache.measuredHeight, maxHeight);

        const innerMeasuredWidth = this.cache.measuredWidth - this.margins.left - this.margins.right;
        const innerMeasuredHeight = this.cache.measuredHeight - this.margins.top - this.margins.bottom;

        const innerWidth = finalWidth - this.margins.left - this.margins.right;
        const innerHeight = finalHeight - this.margins.top - this.margins.bottom;

        const visibleElements = this.visibleElements;

        // Count up each element's minWidth value to find the minimum space required purely for content
        const minimumWidthsTotal = visibleElements.reduce((sum, element) => sum + element.minWidth, 0);

        // Remaining space to distribute to elements in addition to their minimum size
        const remainingWidth = innerWidth - minimumWidthsTotal - ((visibleElements.length-1)*this.spacing);

        // Count up the sum of all element's potential for expansion.
        const totalExpansionWidth = visibleElements.reduce((sum, element) => {
            element.cache.preferredExpansionWidth = element.cache.measuredWidth - element.minWidth;
            sum += element.cache.preferredExpansionWidth;
            return sum;
        }, 0);

        const scaleX = innerWidth / innerMeasuredWidth;
        const scaleY = innerHeight / innerMeasuredHeight;

        const numElements = visibleElements.length;

        const contentWidth = (innerWidth - (this.spacing * (numElements-1)));
        const contentHeight = innerHeight;
        const genericCellWidth = contentWidth / numElements;

        const finalSpacing = (innerWidth - (this.cache.totalChildWidth * scaleX)) / visibleElements.length;

        this.cache.x = x;
        this.cache.y = y;
        this.cache.absoluteX = (this.parent ? this.parent.cache.absoluteX : 0) + x;
        this.cache.absoluteY = (this.parent ? this.parent.cache.absoluteY : 0) + y;
        this.cache.width = finalWidth;
        this.cache.height = finalHeight;

        let currentX = this.margins.left;
        const currentY = this.margins.top;

        console.log("Calculating positions...");
        visibleElements.forEach((element, index) => {
            const elementExpansionWidth = (element.cache.preferredExpansionWidth / totalExpansionWidth) * remainingWidth;
            const cellWidth = element.minWidth + elementExpansionWidth;
            const cellHeight = contentHeight; // Always the same width given as the restriction.

            if (index != 0) currentX += this.spacing;

            element.layout(cellWidth, cellHeight, currentX, currentY);

            currentX += cellWidth;

        });

        console.log("totalWidth:", finalWidth, "totalHeight:", finalHeight);

        this.valid = true;

        return this.cache;
    }

}

module.exports = RowLayout;
