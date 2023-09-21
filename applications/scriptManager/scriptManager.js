//
//  scriptManager.js
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
    const jsMainFileName = "scriptManager.js"
    const ROOT = Script.resolvePath('').split(jsMainFileName)[0]
    const APP_NAME = "SCRIPTS"
    const APP_URL = ROOT + `scriptManager.html?t=${Math.floor(Date.now() / 1000)}`
    const APP_ICON_INACTIVE = ROOT + "icon-inactive.png"
    const APP_ICON_ACTIVE = ROOT + "icon-active.png"
    let appStatus = false
    const channel = "application.zetaphor.scriptManager"
    const tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system")

    let overlayWebWindow = null

    const button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
    })

    function clicked() {
        if (appStatus === true) {
            overlayWebWindow.webEventReceived.disconnect(onWebEventReceived)
            appStatus = false
        } else {
            overlayWebWindow = new OverlayWebWindow({
                title: "Scripts Manager",
                source: Script.resolvePath(APP_URL),
                width: 850,
                height: 500
            })

            overlayWebWindow.webEventReceived.connect(onWebEventReceived)

            overlayWebWindow.closed.connect(function () {
                appStatus = false
                button.editProperties({
                    isActive: appStatus
                })
            })

            appStatus = true
        }

        button.editProperties({
            isActive: appStatus
        })
    }

    function onWebEventReceived(message) {
        if (typeof message === "string") {
            const input = JSON.parse(message)
            if (input.channel !== channel) return
            if (input.action == 'refresh_scripts') {
                const runningScripts = ScriptDiscoveryService.getRunning()
                sendWebEvent('scripts_update', runningScripts)
            } else if (input.action == 'stop_script') {
                let scriptUrl = input.data
                if (scriptUrl.startsWith('scripts/')) scriptUrl = 'file:///~//' + scriptUrl
                ScriptDiscoveryService.stopScript(scriptUrl)
            } else if (input.action == 'reload_script') {
                let scriptUrl = input.data
                if (scriptUrl.startsWith('scripts/')) scriptUrl = 'file:///~//' + scriptUrl
                ScriptDiscoveryService.stopScript(scriptUrl)
                ScriptDiscoveryService.loadScript(scriptUrl)
            } else if (input.action == 'load_script') {
                // TODO: Need to pass flag to determine if script should be reloaded on restart
                ScriptDiscoveryService.loadScript(input.data, false, false, false, true)
            } else if (input.action == 'get_saved') {
                const savedScripts = Settings.getValue("zScriptManager/SavedScripts", [])
                sendWebEvent('saved_update', savedScripts)
            } else if (input.action == 'set_saved') {
                Settings.setValue("zScriptManager/SavedScripts", input.data)
            } else if (input.action == 'prompt_load') {
                url = Window.prompt("Enter the URL to a javascript file to load", "")
                ScriptDiscoveryService.loadScript(url, false, false, false, true)
                Script.setTimeout(function () {
                    const runningScripts = ScriptDiscoveryService.getRunning()
                    sendWebEvent('scripts_update', runningScripts)
                }, 1000)
            }
        }
    }

    function sendWebEvent(action, data = null) {
        const eventData = {
            "channel": channel,
            "action": action,
            "data": data
        }
        overlayWebWindow.emitScriptEvent(JSON.stringify(eventData))
    }

    function cleanup() {
        if (appStatus) {
            tablet.gotoHomeScreen()
            tablet.webEventReceived.disconnect(onWebEventReceived)
        }

        tablet.removeButton(button)
    }

    button.clicked.connect(clicked)
    Script.scriptEnding.connect(cleanup)
}())
