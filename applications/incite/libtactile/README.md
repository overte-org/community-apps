# Tactile

Tactile is a UI framework intended for creating menu layouts in 3D worlds. It has been designed primarily for creating fully 3D menus in the Overte VR platform.

## How to Use

Each file which interacts with the Tactile API will need to `require` tactile:

```js
const tactile = require("https://github.com/overte-org/community-apps/raw/refs/heads/master/applications/incite/libtactile/tactile.js");
```

A tactile UI consists of a root TactileDocument which contains child elements, each of which could have its own child elements. Altogether these elements form the element tree.

```js
new document = new tactile.element.TactileDocument()
        .addElement(new tactile.element.TactileElement()
                .addElement(new tactile.element.TactileElement()));
        .addElement(new tactile.element.TactileElement());
```

To control how these child elements are visually arranged we use layouts. Layouts are elements with custom rules for arranging child elements.

```js
new document = new tactile.element.TactileDocument()
        .addElement(new tactile.element.ColumnLayout() // Arrange elements vertically
            .addElement(new tactile.element.RowLayout() // Arrange elements horizontally
                    .addElement(new tactile.element.TactileElement())
                    .addElement(new tactile.element.TactileElement()))
            .addElement(new tactile.element.TactileElement()));
```

We can then use different types of elements to add buttons, 3D models, text, etc.

```js
// Create button element; A preconfigured element which handles the feedback one might expect when interacting with a button.
const buttonElement = new tactile.element.ButtonElement();
// Add callback for when the button is pressed
buttonElement.elementPressed.connect((documentId, elementId) => {
        console.log("Button has been pressed!");
    });
// Create the document and populate it, including the button element above.
new document = new tactile.element.TactileDocument()
        .addElement(new tactile.element.ColumnLayout()
            .addElement(new tactile.element.RowLayout()
                    .addElement(new tactile.element.TextElement({
                        text: "Tactile UI"
                    }))
                    .addElement(buttonElement))
            .addElement(new tactile.element.TextElement({
                text: "This is an example of a UI made using Tactile."
            })));
```

#### 3D Models and Animations

An element can render as a 3D model with animation, if supported by the renderer.

To render an element as a model we first need to create a Model object, and add it to an element.

```js
const model = new tactile.data.Model("https://content.overte.org/Bazaar/Avatars/PinkDress/fbx/PinkDress.fbx");
const element = new tactile.element.TactileElement({
    model: model,
});
```

Animations can be added to a model with a coresponding name or key:

```js
const model = new tactile.data.Model("https://content.overte.org/Bazaar/Avatars/PinkDress/fbx/PinkDress.fbx");

// Create the idle animation from an url
const animationIdle = new tactile.data.Animation(url="qrc:///avatar/animations/sitting_idle.fbx");
// configure the animation
animationIdle.running = true;
animationIdle.loop = true;
animationIdle.allowTranslation = false;
animationIdle.firstFrame = 1;
animationIdle.lastFrame = 10000;
// Add the animation to the model, with the key "idle"
model.animations.idle = animationIdle;

// Creeate the jog animation from an url
const animationJog = new tactile.data.Animation(url="qrc:///avatar/animations/jog_fwd.fbx");
// Configure the jog animation
animationJog.running = true;
animationJog.loop = true;
animationJog.allowTranslation = false;
animationJog.firstFrame = 1;
animationJog.lastFrame = 18;
// Add the animation to the mode, with the key "jog"
model.animations.jog = animationJog;

// Create the element with the model and animations
const element = new tactile.element.TactileElement({
    model: model,
    //currentAnimation: "idle" // Select the animation playing; default is "idle"
});
```

The element is rendered as the model, with the animation selected by `currentAnimation` loaded (and if the animation's `running` is true, will be playing).

We can now switch between animations on an element at any time:

```js
// Load the animation with the key "jog"
element.setAnimation("jog");
// Load the "idle" animation after a delay of 6 seconds
element.setAnimation("idle", 6000); // 6000 ms, or 6 seconds
```

Below is a complete interface script for Overte which will load the model into the world, and show the avatar model jogging for 6 seconds when clicked before returning to the idle animation. The script will tidy up after itself by telling the tactile renderer to stop rendering when the script stops or is removed.

For more information on how to load an interface script in Overte see [Interface Scripts](https://docs.overte.org/en/latest/script/interface-scripts.html) on the Overte docs.

```js
const tactile = require("https://raw.githubusercontent.com/zedwick/overte-community-apps/refs/heads/incite_tactile_modelimprovements/applications/incite/libtactile/tactile.js");

const model = new tactile.data.Model("https://content.overte.org/Bazaar/Avatars/PinkDress/fbx/PinkDress.fbx");
const animationJog = new tactile.data.Animation(url="qrc:///avatar/animations/jog_fwd.fbx");
animationJog.running = true;
animationJog.loop = true;
animationJog.allowTranslation = false;
animationJog.firstFrame = 1;
animationJog.lastFrame = 18;
model.animations.jog = animationJog;
const animationIdle = new tactile.data.Animation(url="qrc:///avatar/animations/sitting_idle.fbx");
animationIdle.running = true;
animationIdle.loop = true;
animationIdle.allowTranslation = false;
animationIdle.firstFrame = 1;
animationIdle.lastFrame = 10000;
model.animations.idle = animationIdle;
const modelElement = new tactile.element.TactileElement({
    model: model,
    currentAnimation: "idle",
});
modelElement.elementPressed.connect((documentId, elementId) => {
    console.log(`Changing the animation for element ${elementId}!`);
    modelElement.setAnimation("jog");
    modelElement.setAnimation("idle", 6000); // Reset back to idle animation after 6 seconds
});

const renderer = new tactile.renderer.TactileRenderer({
    position: MyAvatar.position,
});

const document = tactile.tactileStore.documentManager.newDocument({
    elements: [modelElement],
    renderer: renderer,
    expandToFit: true,
});

// Script cleanup
Script.scriptEnding.connect(function () {
    print("Disabling "+SCRIPT_NAME)
    renderer.cleanup();
    renderer = null;
});
```

### Size Behaviour

Each element has a collection of properties which define its size in any given context. These help inform how wide and tall it will be given its space constraints and the size of its content.

| ---               | ---                                           |
| Property          | Description                                   |
| ---               | ---                                           |
| minWidth          | The minimum width the element can shrink to   |
| preferredWidth    | The target width for this element             |
| maxWidth          | The maximum width the element can grow to     |
| minHeight         | The minimum height the element can shrink to  |
| preferredHeight   | The target height for this element            |
| maxHeight         | The maximum height the element can grow to    |
| sizeBehaviour     | The ruleset which defines how the element scales its dimensions, dependent on container constraints and content size |
| widthBehaviour    | The ruleset which defines how the element width scales. Defaults to the value of sizeBehaviour |
| heightBehaviour   | The ruleset which defines how the element height scales. Defaults to the value of sizeBehaviour |
| ---               | ---                                           |

How the element's dimensions scale will depend on the chosen behaviour. So let's take a look at the size behaviour rules

| ---       | ---           |
| Name      | Description   |
| ---       | ---           |
| `fixed`   | The element will be sized to match the preferred size, and will not grow shrink in order to fill or fit the space constrains. |
| `grow`    | The element will be sized at the preferred size, or grow to fill the available space provided to it. |
| `shrink`  | The element will be sized at the preferred size, or shrink to fit within the available space. |
| `content` | The element will be sized to fit its child elements, whilst respecting the min and max size properties. The preferred size property dictates its size when it has no content to base its size on. |
| ---       | ---           |

To put some of these rules into practise, we'll take a loot at these examples.

An toolbar might have several buttons which are expected to be a fixed size:

```js
tactile.element.ButtonElement({
    preferredSize: 0.1,
    sizeBehaviour: "fixed",
});
```

A window title bar might have a text line which is expected to expand along the width of the bar taking all available space:

```js
tactile.element.TextElement({
    preferredHeight: 0.1,
    heightBehaviour: "fixed",
    widthBehaviour: "grow",
});
```

<!-- TODO shrink -->

Any layout may need to reflect the true size of its content:

```js
tactile.element.GridLayout({
    preferredHeight: 0.2,
    sizeBehaviour: "content",
});
```

<!-- TODO Show a complete working example showcasing these rules -->

## Building JSDoc

For the full Tactile API documentation you can build it with JSDoc.

```js
jsdoc --recurse ./
```

This will generate HTML documentation in `out/`.

## Creating a Custom Renderer

Tactile currently comes with the TactileRenderer, which is for rendering to entities within Overte, however TactileDocument can be rendered to any context, once a new renderer has been created to do so.

Creating a new renderer implementation is fairly straightforward, however how you choose to render each element will depend entirely on the context of where it is being rendered to. In Overte each element maps to an entity type, but if you were to render to a 2D canvas you would draw their shapes and colours accordingly.

Let's create a new renderer class:

```js
class NewRenderer extends BaseRenderer {

    refineElement(element) {
        // Secondary render pass logic goes here...
        // This is for anything which needs to be rendered after everything else
        // has been rendered, or anything which requires delayed information
    }
    
    renderElement(element) {
        // Rendering logic goes here...
    }
    
    destroyElement(element) {
        // Handle the element being removed from the rendered scene here...
    }
}
```


