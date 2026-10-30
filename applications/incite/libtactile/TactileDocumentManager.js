"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Logger = require("./Logger.js");

class TactileDocumentManager {

    #documents
    #documentMap

    #nextId
    #availableIds

    #TactileDocumentClass

    constructor() {
        this.#documents = [];
        this.#documentMap = new Map();

        this.#nextId = 0;
        this.#availableIds = [];
    }

    get #TactileDocument() {
        if (!this.#TactileDocumentClass) {
            this.#TactileDocumentClass = require("./element/TactileDocument.js");
        }

        return this.#TactileDocumentClass;
    }

    getDocument(documentId) {
        return this.#documentMap.get(documentId);
    }

    addDocument(document) {
        if (!(document instanceof this.#TactileDocument)) {
            Logger.error("Cannot add document; it is not a document.");
            return;
        };
        const id = this.#availableIds.length > 0 ? this.#availableIds.pop() : this.#nextId++;
        document.documentId = id;
        this.#documents.push(document);
        this.#documentMap.set(id, document);
    }

    newDocument(options = {}) {
        const document = new this.#TactileDocument(options);
        this.addDocument(document);
        return document;
    }

}

module.exports = TactileDocumentManager;
