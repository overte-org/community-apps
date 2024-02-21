//
//  armored_chat.js
//
//  Created by Armored Dragon, 2024.
//  Copyright 2024 Overte e.V.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

(function () {
  "use strict";
  // TODO: Theme consistency
  // TODO: Dark Theme/Light theme
  // TODO: Encryption
  // TODO: Image embedding
  // TODO: Find window init event method

  var app_is_visible = true;
  var settings = {
    max_history: 250,
    // show_typing_indicator: true,
    // show_speech_bubble: true,
    compact_chat: false,
    external_window: false,
  };
  var app_data = { app_uuid: Uuid.generate(), current_page: "domain" };
  // var encryption = {  };

  // Global vars
  var ac_tablet;
  var chat_overlay_window;
  var app_button;

  startup();

  function startup() {
    ac_tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    app_button = ac_tablet.addButton({
      icon: Script.resolvePath("./img/icon.png"),
      text: "A-CHAT",
    });

    // When script ends, remove itself from tablet
    Script.scriptEnding.connect(function () {
      ac_tablet.removeButton(app_button);
      console.log("Closing");
      chat_overlay_window.close();
    });

    _openWindow();

    // Overlay button toggle
    app_button.clicked.connect(toggleMainChatWindow);
  }
  function toggleMainChatWindow() {
    app_is_visible = !app_is_visible;
    app_button.editProperties({ isActive: app_is_visible });
    chat_overlay_window.visible = app_is_visible;

    // External window was closed; the window does not exist anymore
    if (chat_overlay_window.title == "" && app_is_visible) {
      _openWindow();
    }
  }
  function _openWindow() {
    chat_overlay_window = new Desktop.createWindow(Script.resourcesPath() + "qml/hifi/tablet/DynamicWebview.qml", {
      title: "Armored-Chat",
      size: { x: 550, y: 400 },
      additionalFlags: Desktop.ALWAYS_ON_TOP,
      visible: app_is_visible,
      presentationMode: Desktop.PresentationMode.VIRTUAL,
    });
    chat_overlay_window.closed.connect(toggleMainChatWindow);
    chat_overlay_window.sendToQml({ url: Script.resolvePath("./index.html") });
    // FIXME: Loadsettings need to happen after the window is initialized?
    Script.setTimeout(_loadSettings, 1000);
    chat_overlay_window.webEventReceived.connect(onWebEventReceived);
  }

  // Initialize default message subscriptions
  Messages.subscribe("chat");
  Messages.subscribe("system");
  // Messages.subscribe() // TODO: Get unique avatar identifier
  Messages.messageReceived.connect(receivedMessage);

  function receivedMessage(channel, message) {
    var message = JSON.parse(message);

    if (message.action == "change_setting") return;

    channel = channel.toLowerCase();

    if (channel !== "chat") return;

    message.channel = message.channel.toLowerCase();

    console.log(channel);
    console.log(JSON.stringify(message));

    // For now, while we are working on superseding Floof, we will allow compatibility with it.
    // If for_app exists, it came from us and we are just sending the message so Floof can read it.
    // We don't need to listen to this message.
    if (message.for_app) return;

    // Check the channel is valid
    if (message.channel !== "domain" && message.channel !== "local" && message.channel !== "system") return;

    // If message is local, and if player is too far away from location, don't do anything
    if (channel === "local" && !Vec3.withinEpsilon(MyAvatar.position, message.position, 20)) return;

    if (message.type === "TransmitChatMessage") message.action = "send_chat_message";

    // Update web view of to new message
    // FIXME: this needs to be changed to work with appui
    chat_overlay_window.emitScriptEvent(JSON.stringify(message));

    // Display on popup chat area
    _overlayMessage({ sender: message.displayName, message: message });
  }
  function onWebEventReceived(event) {
    console.log(event);
    // FIXME: Lazy!
    // Checks to see if the event is a JSON object
    if (!event.includes("{")) return;

    var parsed = JSON.parse(event);

    // Not our app? Not our problem!
    if (parsed.app !== "ArmoredChat") return;

    if (parsed.action === "change_page") {
      app_data.current_page = parsed.message;
      return;
    }

    if (parsed.action === "change_setting") {
      settings[parsed.message.setting] = parsed.message.value;

      console.log(JSON.stringify(parsed.message));

      _saveSettings();
      switch (parsed.message.setting) {
        case "external_window":
          chat_overlay_window.presentationMode = parsed.message.value ? Desktop.PresentationMode.NATIVE : Desktop.PresentationMode.VIRTUAL;
          break;
      }

      if (parsed.message.setting === "vr_safe_mode") {
        chat_overlay_window.close();
        // close window
        // change settings
      }
    }
    if (parsed.action === "send_chat_message") return _sendMessage(parsed.message);
    if (parsed.action === "open_url") Window.openUrl(parsed.message.toString());

    // Send to specific user (DM)
  }
  function _sendMessage(message) {
    Messages.sendMessage(
      "chat",
      JSON.stringify({
        position: MyAvatar.position,
        message: message,
        displayName: MyAvatar.sessionDisplayName,
        channel: app_data.current_page,
        action: "send_chat_message",
      })
    );

    // FloofyChat Compatibility
    Messages.sendMessage(
      "Chat",
      JSON.stringify({
        position: MyAvatar.position,
        message: message,
        displayName: MyAvatar.sessionDisplayName,
        channel: app_data.current_page.charAt(0).toUpperCase() + app_data.current_page.slice(1),
        type: "TransmitChatMessage",
        for_app: "Floof",
      })
    );

    // Show overlay of the message you sent
    _overlayMessage({ sender: MyAvatar.sessionDisplayName, message: message });
  }
  // TODO: Create new overlay system
  function _overlayMessage(message) {
    // Foofchat compatibility
    // This makes it so that our own messages are not rendered.
    // For now, Floofchat has priority over notifications as they use a strange system I don't want to touch yet.
    if (!message.action) return;

    Messages.sendLocalMessage(
      "Floof-Notif",
      JSON.stringify({
        sender: message.sender,
        text: message.message,
        color: { red: 122, green: 122, blue: 122 },
      })
    );
  }
  function _sendUpdateMessage(message_packet = { setting_name, setting_value }) {
    chat_overlay_window.emitScriptEvent(
      JSON.stringify({
        setting_name: message_packet.setting_name,
        setting_value: message_packet.setting_value,
        action: "change_setting",
      })
    );
  }
  function _loadSettings() {
    console.log("Loading config");
    settings = Settings.getValue("ArmoredChat-Config", settings);
    console.log("\nSettings follow:");
    console.log(JSON.stringify(settings, " ", 4));

    // Compact chat
    if (settings.compact_chat) {
      _sendUpdateMessage({
        setting_name: "compact-chat",
        setting_value: true,
      });
    }

    // External Window
    if (settings.external_window) {
      chat_overlay_window.presentationMode = settings.external_window ? Desktop.PresentationMode.NATIVE : Desktop.PresentationMode.VIRTUAL;
      _sendUpdateMessage({
        setting_name: "external_window",
        setting_value: true,
      });
    }
  }
  function _saveSettings() {
    console.log("Saving config");
    Settings.setValue("ArmoredChat-Config", settings);
  }
})();
