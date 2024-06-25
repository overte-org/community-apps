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
	"use strict";

	// TODO: Preinstall Overte community apps by default
	var installed_scripts = Settings.getValue("ArmoredMore-InstalledScripts", []) || []; // All scripts installed though more.js
	var installed_repositories = Settings.getValue("ArmoredMore-InstalledRepositories", []) || []; // All repositories installed though more.js

	// Global vars
	var tablet;
	var app_button;
	var active = false;

	tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

	app_button = tablet.addButton({
		icon: Script.resolvePath("./img/icon_white.png"),
		activeIcon: Script.resolvePath("./img/icon_black.png"),
		text: "MORE",
		isActive: active,
	});
	// When script ends, remove itself from tablet
	Script.scriptEnding.connect(function () {
		console.log("Shutting Down");
		tablet.removeButton(app_button);
	});

	// Overlay button toggle
	app_button.clicked.connect(toolbarButtonClicked);

	tablet.fromQml.connect(fromQML);

	function toolbarButtonClicked() {
		if (active) {
			tablet.gotoHomeScreen();
			active = !active;
			app_button.editProperties({
				isActive: active,
			});
		} else {
			getLists();
			tablet.loadQMLSource(Script.resolvePath("./more.qml"));
			active = !active;
			app_button.editProperties({
				isActive: active,
			});
		}
	}

	function installApp({ title, repository, url, icon, description }) {
		// Add script to saved list
		installed_scripts.push({
			title: title,
			repository: repository,
			url: url,
			icon: icon,
			description: description,
		});

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledScripts", installed_scripts);

		// Install the script
		ScriptDiscoveryService.loadScript(url, true); // Force reload the script, do not use cache.

		// Send updated app list
		getLists();
	}

	function uninstallApp(url) {
		// Find app in saved list
		var entry = installed_scripts.filter((app) => app.url == url);
		const index = installed_scripts.indexOf(entry);

		// Remove it from list
		installed_scripts.splice(index, 1);

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledScripts", installed_scripts);

		// Uninstall the script
		ScriptDiscoveryService.stopScript(url, false);

		// Send updated app list
		getLists();
	}

	// TODO: Duplication check
	async function installRepo(url) {
		// Test repository
		const repo = await request(url);
		if (!repo) return; // Failure

		// Add repo to saved list
		installed_repositories.push({
			title: repo.title || "Unnamed repository",
			url: url,
		});

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledRepositories", installed_repositories);

		// Send updated repository list
		getLists();
	}
	function uninstallRepo(url) {
		// Find app in saved list
		var entry = installed_repositories.filter((repo) => repo.url == url);
		const index = installed_repositories.indexOf(entry);

		// Remove it from list
		installed_repositories.splice(index, 1);

		// Save new list as setting
		Settings.setValue("ArmoredMore-InstalledRepositories", installed_repositories);

		// Send updated app list
		getLists();
	}

	// Startup populate lists
	async function getLists() {
		let application_list = [];
		let installed_apps_by_url = installed_scripts.map((app) => app.url);

		for (let i = 0; installed_repositories.length > i; i++) {
			let repo = installed_repositories[i];
			let apps = await request(repo.url);
			if (!apps) continue; // Failure

			apps = apps.application_list || [];

			// Filter to non-installed ones
			apps = apps.filter((app) => {
				let app_root = repo.url.replace(/\/metadata.json/g, "") + `/${app.directory}`;

				let script_url = app_root + `/${app.script}`;

				return installed_apps_by_url.indexOf(script_url) == -1;
			});

			apps = apps.map((app) => {
				let app_root = repo.url.replace(/\/metadata.json/g, "") + `/${app.directory}`;

				let script_url = app_root + `/${app.script}`;
				let script_icon = app_root + `/${app.icon}`;

				return {
					title: app.name,
					description: app.description,
					icon: script_icon,
					repository: repo.title,
					url: script_url,
				};
			});

			// Add all apps from repo to list
			application_list.push(...apps);
		}

		_emitEvent({
			type: "installed_apps",
			app_list: [
				...installed_scripts.map((app) => {
					return { ...app, installed: true };
				}),
				...application_list,
			],
		});

		_emitEvent({
			type: "installed_repositories",
			repository_list: installed_repositories,
		});
	}

	async function request(url) {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", url, false);
		xmlHttp.send(null);

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
