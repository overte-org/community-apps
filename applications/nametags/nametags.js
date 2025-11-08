//
// Copyright 2024 Overte e.V.
//
// Written by Armored Dragon
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

(function () {

  const ContextMenu = Script.require("contextMenu");

  "use strict";
  let user_nametags = {};
  let maximum_name_length = 50;
  let last_camera_mode = Camera.mode;

  // Settings
  let visible = Settings.getValue("Nametags_toggle", true);
  let visibleSelf = Settings.getValue("Nametags_toggleself", false);

  const COLOUR_ENABLED = "lightgreen";
  const COLOUR_DISABLED = "red";
  const COLOUR_INACTIVE = [128, 128, 128];

  _updateList();

  AvatarManager.avatarAddedEvent.connect(_addUser); // New user connected
  AvatarManager.avatarRemovedEvent.connect(_removeUser); // User disconnected
  Script.update.connect(_adjustNametags); // Delta time

  Script.scriptEnding.connect(_scriptEnding); // Script was uninstalled
  Menu.menuItemEvent.connect(_toggleState); // Toggle the nametag

  // Toolbar icon
  let tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
  let tabletButton = tablet.addButton({
    icon: Script.resolvePath("./assets/nametags-i.svg"),
    activeIcon: Script.resolvePath("./assets/nametags-a.svg"),
    text: "NAMETAGS",
    isActive: visible,
  });
  tabletButton.clicked.connect(_toggleState);

  // Menu item
  Menu.addMenuItem({
    menuName: "View",
    menuItemName: "Nametags",
    shortcutKey: "CTRL+N",
    isCheckable: true,
    isChecked: visible,
  });

  function _updateList() {
    const include_self = visibleSelf && !HMD.active && !Camera.mode.includes("first person");
    var user_list = AvatarList.getAvatarIdentifiers();
    if (include_self) user_list.push(MyAvatar.sessionUUID);

    // Filter undefined values out
    user_list = user_list.filter((uuid) => uuid);

    user_list.forEach(_addUser);
  }

  function _nametagPosition(user) {
    const headJointIndex = user.getJointIndex("Head");
    const jointInObjectFrame = user.getAbsoluteJointTranslationInObjectFrame(headJointIndex);
    return Vec3.sum(user.position, { x: 0.01, y: jointInObjectFrame.y + 0.4*Math.max(0.4, Math.min(user.scale, 4)), z: 0 })
  }

  function displayName(user) {
    return user.displayName ? user.displayName.substring(0, maximum_name_length) : "Anonymous"
  }

  // Add a user to the user list
  function _addUser(user_uuid) {
    if (!visible
        || (!visibleSelf
            && user_uuid === MyAvatar.sessionUUID)
        || user_nametags[user_uuid]) return;

    const user = AvatarList.getAvatar(user_uuid);
    const display_name = displayName(user);

    console.log(`Registering ${display_name} (${user_uuid}) nametag`);

    user_nametags[user_uuid] = { text: {}, background: {}, scale: user.scale, displayName: user.displayName };

    user_nametags[user_uuid].text = Entities.addEntity(
      {
        type: "Text",
        text: display_name,
        backgroundAlpha: 0.0,
        billboardMode: "full",
        dimensions: { x: 0.8, y: 0.2, z: 0.1 },
        unlit: true,
        parentID: user_uuid,
        position: _nametagPosition(user),
        visible: true,
        isSolid: false,
        topMargin: 0.025,
        alignment: "center",
        lineHeight: 0.1,
        canCastShadow: false,
        grab: {
          grabbable: false
        }
      },
      "local"
    );
    user_nametags[user_uuid].background = Entities.addEntity(
      {
        type: "Image",
        dimensions: { x: 0.8, y: 0.2, z: 0.1 },
        emissive: true,
        alpha: 0.8,
        keepAspectRatio: false,
        position: _nametagPosition(user),
        parentID: user_nametags[user_uuid].text,
        billboardMode: "full",
        imageURL: Script.resolvePath("./assets/badge.svg"),
        canCastShadow: false,
        grab: {
          grabbable: false
        }
      },
      "local"
    );

    // We need to have this on a timeout because "textSize" can not be determined instantly after the entity was created.
    // https://apidocs.overte.org/Entities.html#.textSize
    Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);
  }

  function _adjustNametagSize(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);
    let textSize = Entities.textSize(user_nametags[user_uuid].text, displayName(user));

    if (textSize.width === 0 || textSize.height === 0) {
      // Text size cannot be calculated immediately after entity creation;
      // We'll keep trying until textSize does not report 0.
      Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);
      return;
    }

    Entities.editEntity(user_nametags[user_uuid].text, { dimensions: { x: textSize.width + 0.25, y: textSize.height + 0.07, z: 0.1 } });
    Entities.editEntity(user_nametags[user_uuid].background, {
      dimensions: { x: Math.max(textSize.width + 0.25, 0.6), y: textSize.height + 0.05, z: 0.1 },
    });
  }

  // Remove a user from the user list
  function _removeUser(user_uuid) {
    console.log(`Deleting ${user_uuid} nametag`);
    Entities.deleteEntity(user_nametags[user_uuid].text);
    Entities.deleteEntity(user_nametags[user_uuid].background);
    delete user_nametags[user_uuid];
  }

  // Updates positions of existing nametags
  function _adjustNametags() {
    if (!visible) return;

    if (visibleSelf) {
      if (last_camera_mode !== Camera.mode) {
        if (Camera.mode.includes("first person")) _removeUser(MyAvatar.sessionUUID);
        else _addUser(MyAvatar.sessionUUID);
        last_camera_mode = Camera.mode;
      }
    }

    Object.keys(user_nametags).forEach((user_uuid) => {
      _adjustNametag(user_uuid);
    });
  }

  function _adjustNametag(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);

    if (user.scale !== user_nametags[user_uuid].scale) {
      // Avatar is rescaling...

      // TODO: Hide nametag until done


      user_nametags[user_uuid].scale = user.scale
      user_nametags[user_uuid].rescaling = true;
    } else if (user_nametags[user_uuid].rescaling === true) {
      // User has finished rescaling,
      //  but there may be a delay before the avatar finishes resizing.
      Script.setTimeout(() => {
        if (user_nametags[user_uuid].rescaling === true) return;
        Entities.editEntity(user_nametags[user_uuid].text, {
          position: _nametagPosition(user),
        });
      }, 3000);

      user_nametags[user_uuid].rescaling = false;
    }

    if (user.displayName !== user_nametags[user_uuid].displayName) {
      const display_name = user.displayName ? user.displayName.substring(0, maximum_name_length) : "Anonymous";
      Entities.editEntity(user_nametags[user_uuid].text, {
        text: display_name,
      });
      user_nametags[user_uuid].displayName = user.displayName;
    }
  }

  // Enable or disable nametags
  function _toggleState() {
    visible = !visible;
    tabletButton.editProperties({ isActive: visible });
    Settings.setValue("Nametags_toggle", visible);
    _updateActionSet();

    if (!visible) Object.keys(user_nametags).forEach(_removeUser);
    if (visible){
      last_camera_mode = Camera.mode; // Update camera before _adjustNametags runs again
      _updateList();
    }
  }

  // Enable or disabled own nametag
  function _toggleVisibleSelf() {
    visibleSelf = !visibleSelf;
    Settings.setValue("Nametags_toggleSelf", visibleSelf);
    _updateActionSet()

    if (visible) {
      myUUID = MyAvatar.sessionUUID;
      if (!visibleSelf && user_nametags[myUUID]) _removeUser(myUUID);
      else if (visibleSelf){
        last_camera_mode = Camera.mode; // Update camera before _adjustNametags runs again
        _updateList();
      }
    }
  }

  var CHANNEL_CLICK_CONTEXT = ContextMenu.CLICK_FUNC_CHANNEL;
  var handleMessage = function(channel, message, sender) {
    if (channel === CHANNEL_CLICK_CONTEXT && sender === MyAvatar.sessionUUID) {
      try {
        data = JSON.parse(message)
      } catch (err) {
        console.error('Invalid JSON on Context Menu Click message:', message, err.message);
        return
      }

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const func = data.func;

        if (typeof func !== 'undefined') {
          console.log('Func:', func);
          switch (func) {
            case "nametags.toggle":
              _toggleState();
              break;
            case "nametags.toggleSelf":
              _toggleVisibleSelf();
              break;
          }

        } else {
          console.warn('"func" key not found in the JSON');
        }
      }
    }
  };

  Messages.subscribe(CHANNEL_CLICK_CONTEXT);
  Messages.messageReceived.connect(handleMessage);

  function textToggle(boolean) {
    return boolean ? "[X]" : "[   ]";
  }

  function textColour(boolean) {
    return boolean ? COLOUR_ENABLED : COLOUR_DISABLED;
  }

  const actionSet = [
    {
      text: textToggle(visible)+" Nametags",
 localClickFunc: "nametags.toggle",
 textColor: textColour(visible),
 priority: -5,
    },
    {
      text: textToggle(visibleSelf)+" My Nametag",
 localClickFunc: "nametags.toggleSelf",
 textColor: visible ?
              textColour(visibleSelf)
              : COLOUR_INACTIVE,
 priority: -4.9,
    },
  ];

  ContextMenu.registerActionSet("nametags", [{
    text: "> Nametags",
    submenu: "nametags.menu",
    backgroundColor: [0, 0, 0],
    textColor: "white",
    priority: -5,
  }], "_SELF");

  ContextMenu.registerActionSet("nametags.menu", actionSet, undefined, "Nametags");

  function _updateActionSet() {
    actionSet[0].text = textToggle(visible)+" Nametags";
    actionSet[0].textColor = textColour(visible);
    actionSet[1].text = textToggle(visibleSelf)+" My Nametag";
    actionSet[1].textColor = visible ?
    textColour(visibleSelf)
    : COLOUR_INACTIVE;

    ContextMenu.editActionSet("nametags.menu", actionSet);
  }

  function _scriptEnding() {
    tablet.removeButton(tabletButton);
    Menu.removeMenuItem("View", "Nametags");

    for (let i = 0; Object.keys(user_nametags).length > i; i++) {
      Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].text);
      Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].background);
    }
    user_nametags = {};
  }
})();
