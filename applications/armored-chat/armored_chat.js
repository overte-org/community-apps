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
  // TODO: Minimal theme
  // TODO: Image embedding

  var app_is_visible = true;
  var settings = {
    max_history: 250,
    // show_typing_indicator: true,
    // show_speech_bubble: true,
    // compact_chat: false
  };
  var app_data = { app_uuid: Uuid.generate(), current_page: "domain" };
  // var encryption = { public: null, private: null };

  // Global vars
  var ac_tablet;
  var chat_overlay_window;

  startup();

  function startup() {
    ac_tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    var app_button = ac_tablet.addButton({
      icon: Script.resolvePath("./img/icon.png"),
      text: "A-CHAT",
    });

    // When script ends, remove itself from tablet
    Script.scriptEnding.connect(function () {
      ac_tablet.removeButton(app_button);
      chat_overlay_window.close();
    });

    chat_overlay_window = new OverlayWebWindow({
      title: "Armored-Chat",
      width: 350,
      height: 400,
      visible: app_is_visible,
      source: Script.resolvePath("./index.html"),
    });
    // TODO Crashing
    // chat_overlay_window = new AppUi({
    //   buttonName: "Armored-Chat",
    //   home: Script.resolvePath("./index.html"),
    //   graphicsDirectory: Script.resolvePath("./") // The path to your button icons
    // });

    // Main overlay

    // Overlay button toggle
    app_button.clicked.connect(toggleMainChatWindow);
    chat_overlay_window.closed.connect(toggleMainChatWindow);

    function toggleMainChatWindow() {
      app_is_visible = !app_is_visible;
      app_button.editProperties({ isActive: app_is_visible });
      chat_overlay_window.visible = app_is_visible;
    }
  }

  // Initialize default message subscriptions
  Messages.subscribe("chat");
  Messages.subscribe("system");
  // Messages.subscribe() // TODO: Get unique avatar identifier

  // Add event listeners
  // FIXME: below needs to be changed to work with appui
  chat_overlay_window.webEventReceived.connect(onWebEventReceived);
  Messages.messageReceived.connect(receivedMessage);

  function receivedMessage(channel, message) {
    // Check to see if the message is relating to Chat
    channel = channel.toLowerCase();

    if (channel !== "chat") return;

    // Parse the chat channel for the message
    var message = JSON.parse(message);
    message.channel = message.channel.toLowerCase();

    // For now, while we are working on superseding Floof, we will allow compatibility with it.
    // If for_app exists, it came from us and we are just sending the message so Floof can read it.
    // We don't need to listen to this message.
    if (message.for_app) return;

    // Check the channel is valid
    if (
      message.channel !== "domain" &&
      message.channel !== "local" &&
      message.channel !== "system"
    )
      return;

    // If message is local, and if player is too far away from location, don't do anything
    if (
      channel.toLowerCase() === "local" &&
      !Vec3.withinEpsilon(MyAvatar.position, message.position, 20)
    )
      return;

    // Update web view of to new message
    // FIXME: this needs to be changed to work with appui
    chat_overlay_window.emitScriptEvent(JSON.stringify(message));

    // Display on popup chat area
    _overlayMessage({ sender: message.displayName, message: message });
  }
  function onWebEventReceived(event) {
    var parsed = JSON.parse(event);

    // Not our app? Not our problem!
    if (parsed.app !== "ArmoredChat") return;

    if (parsed.action === "change_page") {
      app_data.current_page = parsed.message;
      return;
    }

    if (parsed.action === "change_setting") {
      console.log(parsed);
      settings[parsed.message.setting] = parsed.message.value;

      console.log(settings[parsed.message.setting]);

      if (parsed.message.setting === "vr_safe_mode") {
        chat_overlay_window.close();
        // close window
        // change settings
      }
    }
    if (parsed.action === "send_chat_message")
      return _sendMessage(parsed.message);
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
        channel:
          app_data.current_page.charAt(0).toUpperCase() +
          app_data.current_page.slice(1),
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
})();
