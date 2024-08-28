//
//  more.js
//
//  Easily install additional functionality from repositories online
//
//  Created by Armored Dragon, 2024.
//  Copyright 2024 Overte e.V.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

(() => {
	("use strict");

	var installedScripts = Settings.getValue("ArmoredMore-InstalledScripts", []) || []; // All scripts installed though more.js
	var installedRepositories = Settings.getValue("ArmoredMore-InstalledRepositories", []) || []; // All repositories installed though more.js
	var isFirstRun = Settings.getValue("ArmoredMore-FirstRun", true); // Check if this app has ran before

	// Global vars
	var tablet;
	var appButton;
	var active = false;

	tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
	tablet.screenChanged.connect(onScreenChanged);

	appButton = tablet.addButton({
		icon: Script.resolvePath("./img/icon_white.png"),
		activeIcon: Script.resolvePath("./img/icon_black.png"),
		text: "MORE",
		isActive: active,
	});
	// When script ends, remove itself from tablet
	Script.scriptEnding.connect(function () {
		console.log("Shutting Down");
		tablet.removeButton(appButton);
	});

	// Overlay button toggle
	appButton.clicked.connect(toolbarButtonClicked);

	tablet.fromQml.connect(fromQML);

	if (isFirstRun) {
		installRepo("https://more.overte.org/applications/metadata.js");
		Settings.setValue("ArmoredMore-FirstRun", false);
		isFirstRun = false;
	}

	function toolbarButtonClicked() {
		if (active) {
			tablet.gotoHomeScreen();
			active = !active;
			appButton.editProperties({
				isActive: active,
			});
		} else {
			getLists();
			tablet.loadQMLSource(Script.resolvePath("./more.qml"));
			active = !active;
			appButton.editProperties({
				isActive: active,
			});
		}
	}

	function installApp({ title, repository, url, icon, description }) {
		// Add script to saved list
		installedScripts.push({
			title: title,
			repository: repository,
			url: url,
			icon: icon,
			description: description,
		});

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledScripts", installedScripts);

		// Install the script
		ScriptDiscoveryService.loadScript(url, true); // Force reload the script, do not use cache.

		// Send updated app list
		getLists();
	}

	function uninstallApp(url) {
		// Find app in saved list
		var entry = installedScripts.filter((app) => app.url == url);
		const index = installedScripts.indexOf(entry);

		// Remove it from list
		installedScripts.splice(index, 1);

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledScripts", installedScripts);

		// Uninstall the script
		ScriptDiscoveryService.stopScript(url, false);

		// Send updated app list
		getLists();
	}

	async function installRepo(url) {
		// Hardcode support for Overte
		if (url === "https://raw.githubusercontent.com/overte-org/community-apps/master/applications/metadata.js") 
			url = "https://more.overte.org/applications/metadata.js"

		var repoIsInstalled = installedRepositories.find((repo) => repo.url === url) ? true : false;
		if (repoIsInstalled) return; // Repository URL already in the list, don't add it again.

		// Test repository
		const repo = await request(url);
		if (!repo) return; // Failure

		// Add repo to saved list
		installedRepositories.push({
			title: repo.title || "Unnamed repository",
			url: url,
		});

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledRepositories", installedRepositories);

		// Send updated repository list
		getLists();
	}
	function uninstallRepo(url) {
		// Find app in saved list
		var entry = installedRepositories.filter((repo) => repo.url == url);
		const index = installedRepositories.indexOf(entry);

		// Remove it from list
		installedRepositories.splice(index, 1);

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledRepositories", installedRepositories);

		// Send updated app list
		getLists();
	}

	// Startup populate lists
	async function getLists() {
		let applicationList = [];
		let installedAppsByUrl = installedScripts.map((app) => app.url);

		for (let i = 0; installedRepositories.length > i; i++) {
			let repo = installedRepositories[i];
			let repoContent = await request(repo.url);
			if (!repoContent) continue; // Failure

			let apps = repoContent.application_list || [];

			// Filter to non-installed ones
			apps = apps.filter((app) => {
				let appRoot = repo.url.replace(/\/metadata.js(?:on)?/g, "") + `/${app.directory}`;

				let scriptUrl = appRoot + `/${app.script}`;

				return installedAppsByUrl.indexOf(scriptUrl) == -1;
			});

			apps = apps.map((app) => {
				let appRoot = repoContent.base_url + `/${app.directory}`;

				let scriptUrl = appRoot + `/${app.script}`;
				let scriptIcon = appRoot + `/${app.icon}`;

				return {
					title: app.name,
					description: app.description,
					icon: scriptIcon,
					repository: repo.title,
					url: scriptUrl,
				};
			});

			// Add all apps from repo to list
			applicationList.push(...apps);
		}

		_emitEvent({
			type: "installed_apps",
			app_list: [
				...installedScripts.map((app) => {
					return { ...app, installed: true };
				}),
				...applicationList,
			],
		});

		_emitEvent({
			type: "installed_repositories",
			repository_list: installedRepositories,
		});
	}

	function onScreenChanged(type, url) {
		if (url != Script.resolvePath("./more.qml")) {
			active = false;
			appButton.editProperties({
				isActive: active,
			});
		}
	}

	async function request(url) {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", url, false);
		xmlHttp.send(null);

		// Hardcode support for Overte Community-Apps metadata.js
		// This can be safely removed at some point in the far future. 7/18/2024
		if (url === "https://more.overte.org/applications/metadata.js") {
			// Scary text formatting to get the metadata.js response object into a JSON object.
			var formattedResponse = xmlHttp.responseText.replace("var metadata = ", "").slice(0, -1).trim();

			// Extract the application list.
			var applicationList = JSON.parse(formattedResponse).applications;

			// Convert each entry into a value we expect it to be.
			applicationList = applicationList.map((appEntry) => {
				return {
					name: appEntry.name,
					directory: appEntry.directory,
					script: appEntry.jsfile.replace(`${appEntry.directory}/`, ""),
					icon: appEntry.icon.replace(`${appEntry.directory}/`, ""),
					description: appEntry.description,
				};
			});

			// Return the formatted list along with extra repository information.
			return { title: "Overte", base_url: "https://more.overte.org/applications", application_list: applicationList };
		}

		// Any request we make is intended to be a JSON response.
		// If it can not be parsed into JSON then fail.
		try {
			return JSON.parse(xmlHttp.responseText);
		} catch {
			return false;
		}
	}

	function fromQML(event) {
		console.log(`New QML event:\n${JSON.stringify(event)}`);

		switch (event.type) {
			case "initialized":
				getLists();
				break;
			case "install_application":
				installApp(event);
				break;
			case "remove_application":
				uninstallApp(event.url);
				break;
			case "install_repo":
				installRepo(event.url);
				break;
			case "remove_repo":
				uninstallRepo(event.url);
				break;
		}
	}

	/**
	 * Emit a packet to the HTML front end. Easy communication!
	 * @param {Object} packet - The Object packet to emit to the HTML
	 * @param {("show_message"|"clear_messages"|"notification"|"initial_settings")} packet.type - The type of packet it is
	 */
	function _emitEvent(packet = { type: "" }) {
		tablet.sendToQml(packet);
	}
})();
