//
//  zDebugger.js
//
//  Created by Zetaphor, September 21st 2023.
//  Copyright 2023 Overte e.V.
//
//  This application let you setup different Anti-Aliasing setup for HMD and Desktop.
//  And it switches the configuration when the mode changes.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
"use strict";
(function () {
  const jsMainFileName = "zDebugger.js"
  const ROOT = Script.resolvePath('').split(jsMainFileName)[0]
  const APP_NAME = "ZDEBUG"
  const APP_URL = ROOT + `zDebugger.html?t=${Math.floor(Date.now() / 1000)}`
  const APP_ICON_INACTIVE = ROOT + "icon-inactive.png"
  const APP_ICON_ACTIVE = ROOT + "icon-active.png"
  const rawChannel = "application.zetaphor.zDebugger.raw"
  const receiveChannel = "application.zetaphor.zDebugger.receive"

  const tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system")

  let appActive = false

  let overlayWebWindow = null

  const button = tablet.addButton({
    text: APP_NAME,
    icon: APP_ICON_INACTIVE,
    activeIcon: APP_ICON_ACTIVE,
    sortOrder: 3
  })

  function clicked() {
    if (appActive) {
      overlayWebWindow.webEventReceived.disconnect(onWebEventReceived)
      appActive = false
    } else {
      overlayWebWindow = new OverlayWebWindow({
        title: "zDebugger",
        source: Script.resolvePath(APP_URL),
        width: 850,
        height: 500
      })

      overlayWebWindow.webEventReceived.connect(onWebEventReceived)
      overlayWebWindow.closed.connect(function () {
        button.editProperties({
          isActive: false
        })
      })

      ScriptDiscoveryService.printedMessage.connect(function (message, source) {
        logRawMessage('print', source, message)
      })
      ScriptDiscoveryService.errorMessage.connect(function (message, source) {
        logRawMessage('error', source, message)
      })
      ScriptDiscoveryService.infoMessage.connect(function (message, source) {
        logRawMessage('info', source, message)
      })
      ScriptDiscoveryService.warningMessage.connect(function (message, source) {
        logRawMessage('warn', source, message)
      })
    }

    button.editProperties({
      isActive: true
    })
  }

  function logRawMessage(type, source, message) {
    const eventData = {
      channel: rawChannel,
      type: type,
      source: source,
      message: message
    }
    overlayWebWindow.emitScriptEvent(JSON.stringify(eventData))
  }

  button.clicked.connect(clicked)

  function onWebEventReceived(message) {
    if (typeof message === "string") {
      let eventObj = JSON.parse(message)
      if (eventObj.channel === receiveChannel) {
        console.info('ZDEBUG-RECEIVE:', message)
      }
    }
  }

  function cleanup() {
    if (appActive) {
      overlayWebWindow.webEventReceived.disconnect(onWebEventReceived)
    }

    tablet.removeButton(button)
  }

  Script.scriptEnding.connect(cleanup)
}())