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
const SCRIPT_NAME = "tactileExample";

/**
 * When enabled the examples are active and visible
 */
let enabled = false;
let renderer = null;
let document = null;

// Developer menu
//

const DEVELOPER_ROOT = "Developer > Apps"
const DEVELOPER_SUBMENU = `${DEVELOPER_ROOT}`
const MENU_DEBUG_NAME = "Show Tactile example";

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
    });
    document = getDocument();
}

function stopRendering() {
    renderer.cleanup();
    renderer = null;
}

function buildCurrentAvatarElement() {

}

let currentAvatarIndex = 0;
let currentAvatarElement;
let avatarTextElement;
let avatarContainerElement;

const avatars = [
    // {
    //     modelUrl: "https://content.overte.org/Bazaar/Avatars/Femmebunny/fbx/FemmeBunny.fbx",
    //     avatarUrl: "https://content.overte.org/Bazaar/Avatars/Femmebunny/fbx/FemmeBunny.fst",
    //     name: "FemmeBunny",
    //     description: "Generic avatar.",
    // },
    // {
    //     modelUrl: "https://content.overte.org/Bazaar/Avatars/ButchBunny/fbx/ButchBunny.fbx",
    //     avatarUrl: "https://content.overte.org/Bazaar/Avatars/ButchBunny/fbx/ButchBunny.fst",
    //     name: "ButchBunny",
    //     description: "Generic avatar.",
    // },
    // {
    //     modelUrl: "https://content.overte.org/Bazaar/Avatars/FormalMan/fbx/FormalMan.fbx",
    //     avatarUrl: "https://content.overte.org/Bazaar/Avatars/FormalMan/fbx/FormalMan.fst",
    //     name: "FormalMan",
    //     description: "Generic avatar.",
    // },
    // {
    //     modelUrl: "https://content.overte.org/Bazaar/Avatars/Tom/fbx/Tom.fbx",
    //     avatarUrl: "https://content.overte.org/Bazaar/Avatars/Tom/fbx/Tom.fst",
    //     name: "Tom",
    //     description: "Generic avatar.",
    // },
    {
        modelUrl: "https://content.overte.org/Bazaar/Avatars/Randy/fbx/Randy.fbx",
        avatarUrl: "https://content.overte.org/Bazaar/Avatars/Randy/fbx/Randy.fst",
        name: "Randy",
        description: "Generic avatar.",
    },
    {
        modelUrl: "https://content.overte.org/Bazaar/Avatars/Summer/fbx/Summer.fbx",
        avatarUrl: "https://content.overte.org/Bazaar/Avatars/Summer/fbx/Summer.fst",
        name: "Summer",
        description: "Summer is a girl on the go. She is smart and savvy. She's very cautious and doesn't like to be in extremely crowded areas. Her favorite music is Death Metal and Death Note is her favorite band. She doesn't like to be stuck at home and you can find her hanging out in the mall with her friends.",
    },
    {
        modelUrl: "https://content.overte.org/Bazaar/Avatars/PinkDress/fbx/PinkDress.fbx",
        avatarUrl: "https://content.overte.org/Bazaar/Avatars/PinkDress/fbx/PinkDress.fst",
        name: "PinkDress",
        description: "Generic avatar.",
    }
]

/**
 * The current avatar to show
 */
function getCurrentAvatar() {
    return avatars[currentAvatarIndex];
}

function buildAvatarElement(avatar) {
    const model = new tactile.data.Model(avatar.modelUrl);
    model.maintainNaturalProportions = true;
    const animation = new tactile.data.Animation(url="qrc:///avatar/animations/jog_fwd.fbx");
    animation.running = true;
    animation.loop = true;
    animation.allowTranslation = false;
    animation.firstFrame = 1;
    animation.lastFrame = 18;
    console.log("animation:", JSON.stringify(animation))
    model.animations.active = animation;
    const animation_idle = new tactile.data.Animation(url="qrc:///avatar/animations/sitting_idle.fbx");
    animation_idle.running = true;
    animation_idle.loop = true;
    animation_idle.allowTranslation = false;
    animation_idle.firstFrame = 1;
    animation_idle.lastFrame = 10000;
    model.animations.idle = animation_idle;
    console.log("added:", JSON.stringify(model.animations))
    const element = new tactile.element.TactileElement({
        model: model,
        //currentAnimation: "idle",
    })
    element.elementPressed.connect(() => {
        element.setAnimation("active");
        element.setAnimation("none", 6000); // synonym for "idle" if an animation is already set, until it is possible to clear an animation
        console.log(JSON.stringify(model.animations))
    })
    return element;
}

/**
 * Change displayed avatar in the Avatar Showcase to the previous/next in array.
 * The previous element from 0 will be the last in the array, and the next from
 * the last will be 0.
 *
 * @param {number} direction - -1 for previous avatar, 1 for next avatar.
 */
function showAvatar(direction) {
    const lastIndex = avatars.length - 1;
    if (direction < 0) {
        currentAvatarIndex = currentAvatarIndex == 0
        ? lastIndex
        : currentAvatarIndex - 1;
    } else if (direction > 0) {
        currentAvatarIndex = currentAvatarIndex == lastIndex
        ? 0
        : currentAvatarIndex + 1;
    }
    // direction=0 stays on the current avatar.

    if (currentAvatarElement) {
        console.log("Removing avatar element...");
        avatarContainerElement.removeElement(currentAvatarElement.id);
    }
    currentAvatar = getCurrentAvatar();
    console.log(JSON.stringify(currentAvatar));
    const avatarElement = buildAvatarElement(currentAvatar);
    avatarContainerElement.addElement(avatarElement);
    currentAvatarElement = avatarElement;
    avatarTextElement.text = `${currentAvatar.name}\n\n${currentAvatar.description}`;

}

function getDocument() {
    const layout = new tactile.element.ColumnLayout({
        //preferredHeight: 3,
        preferredWidth: 1,
        maxWidth: 1,
        spacing: 0.01,
        margins: { top: 0.01, right: 0.01, bottom: 0.01, left: 0.01 },
        alpha: 0.1,
    })
        // Add title bar
        .addElement(new tactile.element.RowLayout({
            //preferredWidth: 1,
            preferredHeight: 0.1,
            maxHeight: 0.1,
            spacing: 0.01,
            margins: { top: 0.02, right: 0.02, bottom: 0.02, left: 0.02 },
            alpha: 0.1,
        })
            // Add title text
            .addElement(new tactile.element.TextElement({
                preferredWidth: 1,
                text: "Tactile Example UI",
                color: { red: 255, green: 144, blue: 0 },
                textColor: { red: 0, green: 0, blue: 0 },
                lineHeight: 0.06,
                unlit: true,
            }))
            // Add close button
            .addElement(new tactile.element.ButtonElement({
                maxHeight: 0.1, // Temp workaround
                maxWidth: 0.1, // Temp workaround
                //color: "red", // Temp
            })
                // Add action when close button is pressed
                .connect("elementPressed", (documentId, elementId) => {
                    console.log("Button pressed!");

                })));

    // Container
    const containerElement = new tactile.element.ColumnLayout({
        //preferredHeight: 3,
        preferredWidth: 4,
        spacing: 0.1,
        margins: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
        color: { red: 30, green: 30, blue: 30 },
        alpha: 0.1,
    });
    //
    //
    containerElement.addElement(new tactile.element.TextElement({
        preferredHeight: 0.15,
        text: "This is the example UI for the Tactile 3D UI module for Overte.",
        color: { red: 255, green: 144, blue: 0 },
        textColor: { red: 0, green: 0, blue: 0 },
        lineHeight: 0.06,
        unlit: true,
    }));
    //
    //
    const gridLayout = new tactile.element.GridLayout({
        //preferredHeight: 2,
        preferredWidth: Infinity,
        preferredHeight: 0,
        spacing: 0.1,
        alpha: 0.1,
    });
    //
    //
    gridLayout.addElement(new tactile.element.TactileElement({
        color: "Blue",
        preferredHeight: 0.2,
        preferredWidth: 0.2,
    }));
    // Model element
    gridLayout.addElement(new tactile.element.TactileElement({
        model: new tactile.data.Model("https://content.zedwork.co.uk/overte/model/PolygonalMind/avatar-show/Book.glb"),
        preferredHeight: 0.2,
        preferredWidth: 0.2,
    }));
    gridLayout.addElement(new tactile.element.TactileElement({
        color: "Red",
        model: new tactile.data.Model("https://content.overte.org/marketplaceItems/questionApp/appResources/appData/resources/models/questionMark.fbx"),
        preferredHeight: 0.2,
        preferredWidth: 0.2,
    }));
    containerElement.addElement(gridLayout);


    // Avatar Showcase
    const avatarShowcase = new tactile.element.ColumnLayout();
    // TextArea
    avatarTextElement = new tactile.element.TextElement({
        text: "Avatar Showcase",
        preferredHeight: 0.2,
    });
    // AvatarContainer
    avatarContainerElement = new tactile.element.RowLayout({
        maxHeight: 0.5,
    });
    avatarShowcase.addElement(avatarContainerElement);
    showAvatar(0);
    // TextArea; add after container
    avatarShowcase.addElement(avatarTextElement);
    // NavColumn
    const avatarNav = new tactile.element.RowLayout({
        spacing: 0.01,
        maxHeight: 0.1,
    });
    avatarShowcase.addElement(avatarNav);
    const avatarNavPrevious = new tactile.element.ButtonElement();
    avatarNavPrevious.elementPressed.connect((documentId, elementId) => {
        console.log("Previous button clicked!");
        showAvatar(-1);
    });
    avatarNav.addElement(avatarNavPrevious);
    const avatarNavNext = new tactile.element.ButtonElement();
    avatarNavNext.elementPressed.connect((documentId, elementId) => {
        console.log("Next button clicked!");
        showAvatar(1);
    });
    avatarNav.addElement(avatarNavNext);
    //
    containerElement.addElement(avatarShowcase);


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
