
//  metadata_generator.js
//
//  Created by Armored Dragon, June 30th, 2025.
//  Copyright 2025 Overte e.V.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

//Paths
const thisPageName = "metadata_generator.html";
const currentPath = window.location.protocol + "//" + window.location.host + window.location.pathname;
const ROOTPATH = currentPath.replace(thisPageName, "");

let repository = {};

let formData = {
	url: '',
	app: {
		name: '',
		description: '',
		icon: '',
		directory: '',
		script: '',
		author: '',
		homepage: '',
		category: '',
		maturity: '',
		caption: '', 	// Legacy
	}
}

let errorElements = [];

function updateMetadataFromHTML(version) {
	if (version == 'v2') {
		const v2Parent = document.querySelector(`#form-v2-app`);
		const textInputs = v2Parent.querySelectorAll(`div input`);
		const textTextareas = v2Parent.querySelectorAll(`div textarea`);
		const textComboboxes = v2Parent.querySelectorAll(`div select`);
		const allInputs = [...textInputs, ...textTextareas, ...textComboboxes];

		allInputs.forEach((element) => {
			formData.app[element.id.replace('app-v2-', '')] = element.value;
		});
	}
}

async function getMetadata(url) {
	try {
		const response = await httpRequest(url);
		repository = response;
	} catch (err) {
		console.error("Failed to get metadata:", err);
	}
}

function httpRequest(url) {
	return fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			return response.json();
		});
}

function showPageArea(name) {
	document.querySelector('#form-v2-app').classList.add('hidden');
	document.querySelector('#results').classList.add('hidden');

	document.querySelector(`#${name}`).classList.remove('hidden');
}

function copyToClipboard(elementId) {
	const textArea = document.querySelector(elementId);
	textArea.select();
	document.execCommand('copy');
}
