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

  const MENU_VISIBLE_MENU = "View";
  const MENU_VISIBLE_NAME = "Nametags";

  _updateList();

  AvatarManager.avatarAddedEvent.connect(_addUser); // New user connected
  AvatarManager.avatarRemovedEvent.connect(_removeUser); // User disconnected
  AvatarManager.avatarSessionChangedEvent.connect(_avatarSessionChanged);
  Script.update.connect(_adjustNametags); // Delta time

  Script.scriptEnding.connect(_scriptEnding); // Script was uninstalled
  Menu.menuItemEvent.connect(_handleMenuClick); // Toggle the nametag

  // Messages
  Messages.subscribe(CHANNEL_CLICK_CONTEXT);
  Messages.messageReceived.connect(_handleMessage);

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
    menuName: MENU_VISIBLE_MENU,
    menuItemName: MENU_VISIBLE_NAME,
    shortcutKey: "CTRL+N",
    isCheckable: true,
    isChecked: visible,
  });


  // ContextMenu
  //

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


  // Helper functions
  //

  // Avatar display name as shown on nametags
  function _displayName(user) {
    return user.displayName ? user.displayName.substring(0, maximum_name_length) : "Anonymous"
  }

  // There is no built in way to know if an avatar
  //  has fully loaded in, so we check for what we
  //  know should be true of a fully loaded avatar
  //    * The "Head" joint index will not be -1
  //    * The "Head" joint y translation will not be `0`
  //  An avatar which has not finished loading can can have a head index of > -1, whilst still not having a y value yet.
  function _hasAvatarLoaded(user) {
    const headJointIndex = user.getJointIndex("Head");
    return headJointIndex !== -1
    && user.getAbsoluteJointTranslationInObjectFrame(headJointIndex).y != 0;
  }

  // Nametag position for use in creating or adjusting nametag entities
  function _nametagPosition(user) {
    const headJointIndex = user.getJointIndex("Head");
    const jointInObjectFrame = user.getAbsoluteJointTranslationInObjectFrame(headJointIndex);
    return Vec3.sum(user.position,
                    {
                      x: 0.01,
                      y: jointInObjectFrame.y + 0.4*Math.max(0.4, Math.min(user.scale, 4)),
                    z: 0,
                    });
  }

  // ContextMenu helpers
  //
  function textToggle(boolean) {
    return boolean ? "[X]" : "[   ]";
  }
  //
  function textColour(boolean) {
    return boolean ? COLOUR_ENABLED : COLOUR_DISABLED;
  }


  // Signal functions
  //

  // Handle switching between worlds
  function _avatarSessionChanged(newSessionUUID, oldSessionUUID) {
    print("newSessionUUID:", newSessionUUID); // null if leaving
    print("oldSessionUUID:", oldSessionUUID); // null if entering

    if (oldSessionUUID !== null) {
        if (user_nametags[oldSessionUUID]) _removeUser(oldSessionUUID);
    }

    if (newSessionUUID !== null) {
      // This is MyAvatar only if MyAvatar.sessionUUID matches either oldSessionUUID, newSessionUUID or "{00000000-0000-0000-0000-000000000001}"
      const isSelf = [oldSessionUUID, "{00000000-0000-0000-0000-000000000001}", newSessionUUID].includes(MyAvatar.sessionUUID);

      if (!isSelf){
        _addUser(MyAvatar.sessionUUID);
      } else if (newSessionUUID !== "{00000000-0000-0000-0000-000000000001}"
          && visibleSelf
          && !Camera.mode.includes("first person")) {
            _addUser(newSessionUUID);
            last_camera_mode = Camera.mode;
      }
    }
  }

  function _handleMenuClick(menuItem) {
    if (MENU_VISIBLE_NAME === menuItem) {
      _toggleState();
    }
  }

  // Message handling
  //
  // Channels
  var CHANNEL_CLICK_CONTEXT = ContextMenu.CLICK_FUNC_CHANNEL;
  //
  function _handleMessage(channel, message, sender) {
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


  // Business functions
  //

  // Add a user to the user list
  function _addUser(user_uuid) {
    if (!visible
        || (!visibleSelf
            && user_uuid === MyAvatar.sessionUUID)
        || user_nametags[user_uuid]) return;

    const user = AvatarList.getAvatar(user_uuid);
    const display_name = _displayName(user);

    console.log(`Registering ${display_name} (${user_uuid}) nametag`);

    user_nametags[user_uuid] = { text: {}, background: {}, scale: user.scale, displayName: display_name, skeletonModelURL: user.skeletonModelURL };

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

    if (!_hasAvatarLoaded(user)) {
      // Avatar has not finished loading yet;
      //  we'll reposition when it's ready.
      print("Avatar is not loaded yet. Will retry...");
      _adjustNametagPosition(user_uuid);
    }

    // We need to have this on a timeout because "textSize" can not be determined instantly after the entity was created.
    // https://apidocs.overte.org/Entities.html#.textSize
    Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);
  }

  function _MonitorAvatarLoading(user) {
    if(_hasAvatarLoaded(user)) {
      // We will delay setting the nametag position
      // as some details of the avatar may not be fully
      // loaded at this point, and may be subject to change
      // whilst it settles in.
      print(`${user.displayName}${user.sessionUUID} avatar loaded; moving nametag after delay...`);
      Script.setTimeout(() => {
        print(`${user.displayName}${user.sessionUUID} ...avatar nametag moved`);
        _adjustNametagPosition(user.sessionUUID);
      }, 10000);
    } else {
      Script.setTimeout(() => {
        _MonitorAvatarLoading(user);
      }, 100);
    }
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
        _adjustNametagPosition(user_uuid);
      }, 3000);

      user_nametags[user_uuid].rescaling = false;
    }

    const newAvatar = user.skeletonModelURL;
    const oldAvatar = user_nametags[user_uuid].skeletonModelURL
    if (newAvatar != oldAvatar) {
      print(`${user.displayName}${user.sessionUUID} changed skeleton. Adjusting nametag..`)
      _MonitorAvatarLoading(user);
      user_nametags[user_uuid].skeletonModelURL = newAvatar;
    }

    const newName = user.displayName;
    const oldName = user_nametags[user_uuid].displayName;
    if (newName !== oldName) {
      const display_name = _displayName(user);
      print(`New displayName ${display_name} (${newName}) for ${oldName}`)
      Entities.editEntity(user_nametags[user_uuid].text, {
        text: display_name,
      });
      user_nametags[user_uuid].displayName = newName;
    }
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

  function _adjustNametagPosition(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);
    if (!user_nametags[user_uuid] || user_nametags[user_uuid]?.rescaling === true) return;

    if (!_hasAvatarLoaded(user)) {
      // Avatar has not finished loading yet;
      //  we'll reposition when it's ready.
      print("Avatar is not loaded yet. Will retry...");
      _MonitorAvatarLoading(user);
      return
    }

    Entities.editEntity(user_nametags[user_uuid].text, {
      position: _nametagPosition(user),
    });
  }

  // Resize user's nametag entity
  function _adjustNametagSize(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);
    const display_name = _displayName(user);
    let textSize = Entities.textSize(user_nametags[user_uuid].text, display_name);

    if (textSize.width === 0 || textSize.height === 0) {
      // Text size cannot be calculated immediately after entity creation;
      // We'll keep trying until textSize does not report 0.
      Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);
      return;
    } else if (textSize.height <= 0.08
            || textSize.height >= 0.2
            || textSize.height === null) {
      // Text size returns unexpected values during entity
      // creation. When entity sizes are too large, too small
      // or invalid we ignore them.
      // See https://github.com/overte-org/overte/issues/1897.
      print(`!!! Text size for ${display_name} is an unexpected ${JSON.stringify(textSize)}; Not sizing yet.`);
      Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);
      return;
    } else {
      print(`Text size for ${display_name} is ${JSON.stringify(textSize)}`);
    }

    Entities.editEntity(user_nametags[user_uuid].text,
                        {
                          dimensions: {
                            x: textSize.width + 0.25,
                            y: textSize.height + 0.07,
                            z: 0.1,
                          }
                        });
    Entities.editEntity(user_nametags[user_uuid].background,
                        {
                          dimensions: {
                            x: Math.max(textSize.width + 0.25, 0.6),
                        y: textSize.height + 0.05,
                        z: 0.1,
                          },
                        });
  }

  // Remove a user from the user list
  function _removeUser(user_uuid) {
    if (user_nametags[user_uuid]) {
      console.log(`Deleting ${user_uuid} nametag`);
      Entities.deleteEntity(user_nametags[user_uuid].text);
      Entities.deleteEntity(user_nametags[user_uuid].background);
      delete user_nametags[user_uuid];
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
    Settings.setValue("Nametags_toggleself", visibleSelf);
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

  function _updateList() {
    const include_self = visibleSelf && !HMD.active && !Camera.mode.includes("first person");
    var user_list = AvatarList.getAvatarIdentifiers();
    if (include_self) user_list.push(MyAvatar.sessionUUID);

    // Filter undefined values out
    user_list = user_list.filter((uuid) => uuid);

    user_list.forEach(_addUser);
  }

  // Clean up
  //

  function _scriptEnding() {
    tablet.removeButton(tabletButton);
    Menu.removeMenuItem(MENU_VISIBLE_MENU, MENU_VISIBLE_NAME);

    for (let i = 0; Object.keys(user_nametags).length > i; i++) {
      Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].text);
      Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].background);
    }
    user_nametags = {};
  }
})();
