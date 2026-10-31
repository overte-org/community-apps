// An Overte Interface script to showcase what is possible with Tactile
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//
// Show the examples in front of you from the Develper menu:
//  Developer > Apps > Tactile > Show Tactile examples
//

const tactile = require("./tactile.js");

// Replace this with your script name
const SCRIPT_NAME = "tactileExamples";

/**
 * When enabled the examples are active and visible
 */
let enabled = false;
let renderer;
let document;

let container;
let testLayout;
let toolbar;
let previousButton;
let nextButton;

let cycleElementsHandle;

// Developer menu
//

const DEVELOPER_ROOT = "Developer > Apps"
const DEVELOPER_SUBMENU = `${DEVELOPER_ROOT}`
const MENU_DEBUG_NAME = "Show Tactile examples";

Menu.addMenu(DEVELOPER_ROOT);

Menu.addMenuItem({
    menuName: DEVELOPER_SUBMENU,
    menuItemName: MENU_DEBUG_NAME,
    isCheckable: true,
    isChecked: enabled,
});

Menu.menuItemEvent.connect(_handleMenuClick);

function _handleMenuClick(menuItem) {
    switch(menuItem) {
        case MENU_DEBUG_NAME:
            toggleEnabled();
            break;
    }
}

// update menu items

function toggleEnabled() {
    enabled = !enabled;
    if (enabled) {
        console.log("enabling!")
        //Script.startProfiling();
        startRendering();
    } else {
        console.log("disabling!")
        stopRendering();
        //Script.stopProfilingAndSave();
    }
}

function startRendering() {
    renderer = new tactile.renderer.TactileRenderer({
        position: MyAvatar.position,
        renderContext: "local",
    });
    document = getDocument();

    // Start cycling child elements
    cycleElementsHandle = Script.setInterval(cycleChildElements, 1000);
}

function stopRendering() {
    if (cycleElementsHandle) {
        Script.clearInterval(cycleElementsHandle);
        cycleElementsHandle = undefined;
    }
    renderer.cleanup();
    renderer = null;
}

function getWindow() {
    const layout = new tactile.element.ColumnLayout({
        //preferredHeight: 3,
        //preferredWidth: 1,
        maxWidth: 1,
        maxHeight: 1,
        spacing: 0.01,
        margins: { top: 0.01, right: 0.01, bottom: 0.01, left: 0.01 },
        alpha: 0.1,
    });

    const titlebar = new tactile.element.RowLayout({
        //preferredWidth: 1,
        preferredHeight: 0.1,
        maxHeight: 0.1,
        minHeight: 0.1,
        spacing: 0.01,
        margins: { top: 0.02, right: 0.02, bottom: 0.02, left: 0.02 },
        alpha: 0.1,
    });
    titlebar.addElement(new tactile.element.TextElement({
        //preferredWidth: 1,
        text: "Tactile Example UI",
        color: { red: 255, green: 144, blue: 0 },
        textColor: { red: 0, green: 0, blue: 0 },
        lineHeight: 0.06,
        unlit: true,
    }));
    const closeButton = new tactile.element.ButtonElement({
        maxHeight: 0.1, // Temp workaround
        maxWidth: 0.1, // Temp workaround
        //color: "red", // Temp
    });
    closeButton.elementPressed.connect((documentId, elementId) => {
        console.log("Clicked!");
        toggleEnabled();
    });
    titlebar.addElement(closeButton);

    container = new tactile.element.RowLayout({

    });

    toolbar = new tactile.element.RowLayout({
        //preferredWidth: 1,
        preferredHeight: 0.1,
        maxHeight: 0.1,
        minHeight: 0.1,
        spacing: 0.01,
        margins: { top: 0.02, right: 0.02, bottom: 0.02, left: 0.02 },
        alpha: 0.1,
    })
    layoutTitle = new tactile.element.TextElement({
        text: "",
    })
    previousButton = getPreviousButton();
    nextButton = getNextButton();
    toolbar.addElements([layoutTitle, previousButton, nextButton]);

    layout.addElement(titlebar);
    layout.addElement(container);
    layout.addElement(toolbar);
    return layout;
}

function getTestLayoutGrid() {
    const layout = new tactile.element.GridLayout({
        columns: 3,
        spacing: 0.01,
    });

    return layout;
}

function newElement(num) {
    const elementChoices = [
        () => new tactile.element.TactileElement({
            model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx")
        }),
        () => new tactile.element.TextElement({
            text: "#2",
        }),
        () => new tactile.element.ColumnLayout({
            elements: [
                new tactile.element.TactileElement(),
                new tactile.element.TactileElement({
                    model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx")
                }),
                new tactile.element.TextElement({
                    text: "Column Layout"
                }),
            ]
        }),
        () => new tactile.element.RowLayout({
            elements: [
                new tactile.element.TactileElement(),
                new tactile.element.TactileElement({
                    model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx")
                }),
                new tactile.element.TextElement({
                    text: "Row Layout"
                }),
            ]
        }),
        () => new tactile.element.GridLayout({
            columns: 3,
            elements: [
                new tactile.element.TactileElement(),
                new tactile.element.TactileElement({
                    model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx")
                }),
                new tactile.element.TextElement({
                    text: "Grid Layout"
                }),
                new tactile.element.TactileElement({
                    model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx")
                }),
                new tactile.element.TactileElement({
                    model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx")
                }),
            ]
        }),
    ]
    return elementChoices[num % elementChoices.length]();
}

/**
 * Update the child elements of the given layout in a loop
 */
function cycleChildElements() {
    // Get number of child elements
    const numElements = testLayout.elementTree.elements.length;

    // If child element count is equal or grater to n
    if (numElements >= 10) {
        // Remove all child elements
        testLayout.elementTree.removeAllElements();
    }

    // Add another element to layout
    testLayout.elementTree.addElement(newElement(numElements));

}

let currentLayout = 0;

const layouts = [
    {
        name: "GridLayout",
        elementTree: getTestLayoutGrid(),
    },
    {
        name: "ColumnLayout",
        elementTree: new tactile.element.ColumnLayout({
            spacing: 0.01,
        })
    },
    {
        name: "RowLayout",
        elementTree: new tactile.element.RowLayout({
            spacing: 0.01,
        })
    },
    {
        name: "Test3",
        elementTree: new tactile.element.TextElement({
            text: "#3 TODO: Layout Goes Here"
        })
    },
    {
        name: "Test4",
        elementTree: new tactile.element.TextElement({
            text: "#4 TODO: Layout Goes Here"
        })
    }
]

/**
 * The current layout to test
 */
function getCurrentLayout() {
    return layouts[currentLayout];
}

/**
 * Change current layout to the previous or next in the array.
 * The previous element from 0 will be the last in the array, and the next from
 * the last will be 0.
 *
 * @param {number} direction - -1 for previous layout, 1 for next layout.
 */
function walkLayouts(direction) {
    const lastIndex = layouts.length - 1;
    if (direction < 0) {
        currentLayout = currentLayout == 0
                ? lastIndex
                : currentLayout - 1;
    } else if (direction > 0) {
        currentLayout = currentLayout == lastIndex
                ? 0
                : currentLayout + 1;
    }
    // direction=0 stays on the current layout.

    // TODO Remove existing layout and add new current
    container.removeElement(testLayout.elementTree.id);
    testLayout = getCurrentLayout();
    console.log(JSON.stringify(testLayout));
    container.addElement(testLayout.elementTree);
    layoutTitle.text = testLayout.name;

}

/**
 * Button to go back to previous layout
 */
function getPreviousButton() {
    const button = new tactile.element.ButtonElement({

    });
    button.elementPressed.connect((documentId, elementId) => {
        console.log("Previous button clicked!");
        walkLayouts(-1);
    });
    return button;
}

/**
 * Button to go to the next layout
 */
function getNextButton() {
    const button = new tactile.element.ButtonElement({

    });
    button.elementPressed.connect((documentId, elementId) => {
        console.log("Next button clicked!");
        walkLayouts(1);
    });
    return button;
}

function getDocument() {
    const window = getWindow();

    testLayout = getCurrentLayout();

    layoutTitle.text = testLayout.name;
    container.addElements([testLayout.elementTree]);

    const elements = [window];
    const document = tactile.tactileStore.documentManager.newDocument({
        elements: elements,
        renderer: renderer,
        expandToFit: true,
    });

    return document;

}


function getOldDocument() {
    const layout = new tactile.element.ColumnLayout({
        preferredHeight: 3,
        preferredWidth: 1,
        maxWidth: 1,
        spacing: 0.01,
        margins: { top: 0.01, right: 0.01, bottom: 0.01, left: 0.01 },
        alpha: 0.1,
    });
    const titlebar = new tactile.element.RowLayout({
        preferredWidth: 1,
        preferredHeight: 0.1,
        maxHeight: 0.1,
        spacing: 0.01,
        margins: { top: 0.02, right: 0.02, bottom: 0.02, left: 0.02 },
        alpha: 0.1,
    });
    titlebar.addElement(new tactile.element.TextElement({
        preferredWidth: 1,
        text: "Tactile Example UI",
        color: { red: 255, green: 144, blue: 0 },
        textColor: { red: 0, green: 0, blue: 0 },
        lineHeight: 0.06,
        unlit: true,
    }));
    const closeButton = new tactile.element.ButtonElement({
        maxHeight: 0.1, // Temp workaround
        maxWidth: 0.1, // Temp workaround
        //color: "red", // Temp
    });
    titlebar.addElement(closeButton);
    layout.addElement(titlebar);

    closeButton.elementPressed.connect((documentId, elementId) => {
        console.log("Clicked!");
        toggleEnabled();
    });

    // Container
    const containerElement = new tactile.element.ColumnLayout({
        preferredHeight: 3,
        preferredWidth: 4,
        spacing: 0.1,
        margins: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
        color: { red: 30, green: 30, blue: 30 },
        alpha: 0.1,
    });
    //
    //
    containerElement.addElement(new tactile.element.TextElement({
        preferredHeight: 0.1,
        text: "This is the example UI for the Tactile 3D UI module for Overte.",
        color: { red: 255, green: 144, blue: 0 },
        textColor: { red: 0, green: 0, blue: 0 },
        lineHeight: 0.06,
        unlit: true,
    }));
    //
    //
    const gridLayout = new tactile.element.GridLayout({
        preferredHeight: 2,
        preferredWidth: Infinity,
        spacing: 0.1,
        alpha: 0.1,
    });
    //
    //
    gridLayout.addElement(new tactile.element.TactileElement({
        color: "Blue",
    }));
    // Model element
    gridLayout.addElement(new tactile.element.TactileElement({
        model: new tactile.data.Model("https://content.zedwork.co.uk/overte/model/PolygonalMind/avatar-show/Book.glb")
    }));
    gridLayout.addElement(new tactile.element.TactileElement({
        color: "Red",
        model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx")
    }));
    containerElement.addElement(gridLayout);
    //
    layout.addElement(containerElement);

    const elements = [layout];
    return tactile.tactileStore.documentManager.newDocument({
        elements: elements,
        renderer: renderer,
        expandToFit: true,
    });
}

// Script cleanup
Script.scriptEnding.connect(function () {
    print("Disabling "+SCRIPT_NAME)
    if (enabled) stopRendering();
    Menu.removeMenuItem(DEVELOPER_SUBMENU, MENU_DEBUG_NAME);
});
