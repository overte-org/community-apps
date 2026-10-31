# incite_app.js

Incite your entities to act with visual scripting!

[LICENSE](LICENSE)

## What is Incite?

Incite is a visual scripting language designed for Overte. With it you can create an executable program entirely from within Overte using the in-world UI.

## How To Use

Once installed you can access most Incite functions through the Incite menu in the Context Menu.

1. Create a new graph from the Incite menu.
2. Select the nodes you want in your graph with "Add node" in the Incite menu.
3. Close the context menu
4. Connect nodes in your graph by interacting with the output port (right side) of the source node, then interact with the input port (left side) of the target node.
5. Connect all of your nodes until you have a complete script.
6. From the context menu, select Incite > Execute Graph.

## Incite

The Incite scripting language has been designed with Overte in mind, but has been architected to be platform agnostic so it can work on a variety of platforms.

Read more in the [Incite documentation](libincite/README.md).

## Tactile

Tactile is a framework which enables creating in-world 3D user interfaces for Overte. Although Tactile has been designed for Overte, its architecture allows for UIs created with it to be rendered anywhere.

Read more in the [Tactile documentation](libtactile/README.md).
