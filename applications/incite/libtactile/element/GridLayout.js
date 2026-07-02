"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Layout = require("./Layout.js");

/**
 * Base Layout class
 *
 * @param {string} containerEntity - the ID of the container entity
 *
 * @property {number} columns
 * @property {number} rows
 * @property {number} rowHeight
 * @property {string} flowDirection
 * @property {number} secondaryDimension - Number of rows or columns, whichever flowDirection
 */
class GridLayout extends Layout{
    constructor(options) {
        super(options);
        this.columns = options.columns ?? Infinity; // max columns when flowDirection is 'row'
        this.rows = options.rows ?? Infinity; // max rows when flowDirection is 'column'
        this.rowHeight = options.rowHeight ?? 1;
        this.flowDirection = options.flowDirection ?? 'row'; // 'row' or 'column'
        console.log(`flowDirection: this=${this.flowDirection}, options=${options.flowDirection}`);
    }

    get type() {
        return 'GridLayout';
    }

    // secondary == flowDirection, primary == predefined limit
    get secondaryDimension() {
        return Math.min(this.visibleElements.length,
                              this.flowDirection == 'row'
                                     ? this.columns
                                     : this.rows
        );
    }

    currentColumn(index) {
        return this.flowDirection == 'row'
        ? index % this.columns
        : Math.floor(index / this.rows)
    }

    currentRow(index) {
        return this.flowDirection == 'row'
        ? Math.floor(index / this.columns)
        : index % this.rows
    }

    measure() {
        // Let's measure the width and height of each row, to accomodate the desired element sizes

        const num = this.visibleElements.length-1;
        // Total columns/rows
        const columns = this.flowDirection == 'row'
                            ? this.secondaryDimension
                            : num > this.columns ? this.columns : this.currentColumn(num)+1;
        const rows = this.flowDirection == 'row'
                            ? num > this.rows ? this.rows : this.currentRow(num)+1
                            : this.secondaryDimension;

        console.log("Meausuring...");
        this.cache.maxColumnWidths = new Array(columns).fill(0); //TODO JSDoc
        this.cache.maxRowHeights = new Array(rows).fill(0); // TODO JSDoc
        console.log(" maxColumnWidths", this.cache.maxColumnWidths);
        //console.table(this.cache.maxColumnWidths);
        console.log(" maxRowHeights", this.cache.maxRowHeights);
        //console.table(this.cache.maxRowHeights);

        this.visibleElements.forEach((element, index) => {
            console.log(`... ${index}: ${element}`);
            const col = this.currentColumn(index);
            const row = this.currentRow(index);
            console.log(`   ... column: ${col}, row: ${row}`);

            const dimensions = element.measure();
            const width = dimensions.width;
            const height = dimensions.height;

            console.log(`   ... width: ${width}, height: ${height}`);

            // Is this the biggest element in this column/row? If so, update the width
            this.cache.maxColumnWidths[col] = Math.max(this.cache.maxColumnWidths[col], width);
            this.cache.maxRowHeights[row] = Math.max(this.cache.maxRowHeights[row], height);

            console.log("   ... maxColumnWidths", this.cache.maxColumnWidths);
            console.log("   ... maxRowHeights", this.cache.maxRowHeights);

        });

        const idealWidth = this.cache.maxColumnWidths.reduce((total, width) => total + width, 0) + (this.spacing * (columns - 1) + this.margins.left + this.margins.right);

        const idealHeight = this.cache.maxRowHeights.reduce((total, height) => total + height, 0) + (this.spacing * (rows - 1) + this.margins.top + this.margins.bottom);

        console.log("... Measured!");

        console.log(`width: ${idealWidth}, height: ${idealHeight}`);

        const totalWidth = Math.max(this.minWidth, Math.min(Math.max(idealWidth, Number.isFinite(this.preferredWidth) ? this.preferredWidth : 0), this.maxWidth));

        const totalHeight = Math.max(this.minWidth, Math.min(Math.max(idealHeight, Number.isFinite(this.preferredHeight) ? this.preferredHeight : 0), this.maxHeight));

        console.log(`width: ${totalWidth}, height: ${totalHeight}`);

        console.log(" maxColumnWidths", this.cache.maxColumnWidths);
        //console.table(this.cache.maxColumnWidths);


        console.log(" maxRowHeights", this.cache.maxRowHeights);
        //console.table(this.cache.maxRowHeights);

        const measuredWidth = totalWidth !== Infinity ? totalWidth : Number.MAX_SAFE_INTEGER;
        const measuredHeight = totalHeight !== Infinity ? totalHeight : Number.MAX_SAFE_INTEGER;

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

        // scale column/row dimensions based on final dimensions
        const scaleX = innerWidth / innerMeasuredWidth;
        const scaleY = innerHeight / innerMeasuredHeight;
        this.cache.maxColumnWidths = this.cache.maxColumnWidths.map(width => width * scaleX);
        this.cache.maxRowHeights = this.cache.maxRowHeights.map(height => height * scaleY);

        this.cache.x = x;
        this.cache.y = y;
        this.cache.absoluteX = (this.parent ? this.parent.cache.absoluteX : 0) + x;
        this.cache.absoluteY = (this.parent ? this.parent.cache.absoluteY : 0) + y;
        this.cache.width = finalWidth;
        this.cache.height = finalHeight;

        console.log(`look ${this.cache.x} - ${this.parent.cache.absoluteX}`);

        console.log("margins:", this.margins, "spacing", this.spacing);


        let currentX = this.margins.left;
        let currentY = this.margins.top;

        console.log("Calculating positions...");
        this.visibleElements.forEach((element, index) => {
            console.log(`... ${index}: element ${element}`);
            const column = this.currentColumn(index);
            const row = this.currentRow(index);

            console.log(`... ${index}: Column ${column}, Row ${row}`);

            const cellWidth = this.cache.maxColumnWidths[column];
            const cellHeight = this.cache.maxRowHeights[row];

            console.log("margins.left:", this.margins.left, "column:", column, "cellWidth:", cellWidth, "spacing:", this.spacing, "(cellWidth + this.spacing)", (cellWidth + this.spacing));

            element.layout(cellWidth, cellHeight, currentX, currentY);

            if (this.flowDirection == 'row') {
                currentX += cellWidth + this.spacing;

                if (column == this.columns -1) {
                    currentX = this.margins.left;
                    currentY += cellHeight + this.spacing;
                }
            } else {
                currentY += cellHeight + this.spacing

                if (row == this.rows - 1) {
                    currentY = this.margins.top;
                    currentX += cellWidth + this.spacing;
                }
            }
        });

        console.log("totalWidth:", this.cache.width, "totalHeight:", this.cache.height);
        console.log("maxColumnWidths:", this.cache.maxColumnWidths, "maxRowHeights:", this.cache.maxRowHeights);

        this.valid = true;

        return this.cache;
    }

}

module.exports = GridLayout;
