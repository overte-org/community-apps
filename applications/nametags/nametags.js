//
// Copyright 2023 Overte e.V.
//
// Written by Armored Dragon

let user_nametags = {};
let user_uuids = [];
let visible = Settings.getValue("Nametags_toggle", true);

const logs = (info) => console.log("[NAMETAGS] " + info);

// New user connected
AvatarManager.avatarAddedEvent.connect(() => {
  Script.setTimeout(() => {
    clear();
    startup();
  }, 1000);
});

function startup() {
  user_uuids = AvatarList.getAvatarIdentifiers();
  user_uuids.push(MyAvatar.sessionUUID);
  user_uuids = user_uuids.filter((uuid) => uuid); // Remove empty, undefined values from array

  user_uuids.forEach((avatar) => {
    let uuid = avatar;
    if (user_nametags[uuid]) return;
    let definite_avatar = AvatarList.getAvatar(uuid);
    user_nametags[uuid] = { overlay: { text: {}, background: {} } };
    user_nametags[uuid].overlay.text = Entities.addEntity(
      {
        type: "Text",
        text: definite_avatar.displayName.substring(0, 50),
        backgroundAlpha: 0.0,
        billboardMode: "full",
        unlit: true,
        parentID: uuid,
        position: Vec3.sum(definite_avatar.position, { x: 0, y: 1 * definite_avatar.scale, z: 0 }),
        visible: true,
        isSolid: false,
        topMargin: 0.025,
        alignment: "center",
        lineHeight: 0.1,
      },
      "local"
    );
    user_nametags[uuid].overlay.background = Entities.addEntity(
      {
        type: "Image",
        dimensions: { x: 0.8, y: 0.2, z: 0.1 },
        emissive: true,
        alpha: 0.8,
        keepAspectRatio: false,
        position: Vec3.sum(definite_avatar.position, { x: 0, y: 1 * definite_avatar.scale, z: 0 }),
        parentID: user_nametags[uuid].overlay.text,
        billboardMode: "full",
        imageURL: Script.resolvePath("./assets/badge.svg"),
      },
      "local"
    );

    // We need to have this on a timeout because "textSize" can not be determined instantly after the entity was created.
    // https://apidocs.overte.org/Entities.html#.textSize
    Script.setTimeout(() => {
      let textSize = Entities.textSize(user_nametags[uuid].overlay.text, definite_avatar.displayName.substring(0, 50));
      Entities.editEntity(user_nametags[uuid].overlay.text, { dimensions: { x: textSize.width + 0.25, y: textSize.height - 0.05, z: 0.1 } });
      Entities.editEntity(user_nametags[uuid].overlay.background, {
        dimensions: { x: Math.max(textSize.width + 0.25, 0.6), y: textSize.height - 0.05, z: 0.1 },
      });
    }, 100);
  });
}
function clear() {
  for (let i = 0; Object.keys(user_nametags).length > i; i++) {
    Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].overlay.text);
    Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].overlay.background);
  }
  user_uuids = {};
  user_nametags = {};
}
function scriptEnding() {
  clear();
  tablet.removeButton(tabletButton);
  Menu.removeMenuItem("View", "Nametags");
}
function setVisible(visible) {
  if (visible !== isVisible) {
    isVisible = visible;
    if (isVisible) {
      startUpdating();
    } else {
      stopUpdating();
    }
    if (button) {
      button.editProperties({ isActive: isVisible });
    }
  }
}
function toggleState() {
  visible = !visible;

  tabletButton.editProperties({ isActive: visible });

  clear();

  if (visible) startup();
  Settings.setValue("Nametags_toggle", visible);
}
function toggleStateMenu() {
  let is_checked = Menu.isOptionChecked("Nametags");
  if (is_checked !== visible) toggleState();

  // Toolbar
  tabletButton.editProperties({ isActive: visible });
}

// Tablet icon
let tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
let tabletButton = tablet.addButton({
  icon: Script.resolvePath("./assets/nametags-i.svg"),
  activeIcon: Script.resolvePath("./assets/nametags-a.svg"),
  text: "NAMETAGS",
  isActive: visible,
});
// Menu item
Menu.addMenuItem({
  menuName: "View",
  menuItemName: "Nametags",
  shortcutKey: "CTRL+N",
  isCheckable: true,
  isChecked: visible,
});
Menu.menuItemEvent.connect(toggleStateMenu);
tabletButton.clicked.connect(toggleState);
Script.scriptEnding.connect(scriptEnding);

if (visible) {
  startup();
  tabletButton.editProperties({ isActive: visible });
  toggleStateMenu();
}
