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
	if (version == 'v1') {
		const v1Parent = document.querySelector(`#form-v1-app`);
		const textInputs = v1Parent.querySelectorAll(`div input`);
		const textTextareas = v1Parent.querySelectorAll(`div textarea`);
		const allInputs = [...textInputs, ...textTextareas];

		allInputs.forEach((element) => {
			formData.app[element.id.replace('app-v1-', '')] = element.value;
		});

		return;
	}

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

async function getCommunityAppsMetadata() {
	let response = await httpRequest('https://raw.githubusercontent.com/overte-org/community-apps/refs/heads/master/applications/metadata.js');

	// Remove the extra data that prevents this from being a JSON.
	const searchString = 'var metadata = '
	const indexOfVar = response.indexOf(searchString);
	response = response.substring(searchString.length + indexOfVar);

	const indexOfSemiColon = getIndexOfLastSemiColon(response);
	response = response.substring(0, indexOfSemiColon);

	response.trim();

	try {
		response = JSON.parse(response);
	} catch (err) {
		// TODO: Handle errors
		console.log('Failed to convert response to JSON.');
		console.log(err)
	}

	repository = response;

	return true;

	function getIndexOfLastSemiColon(rawMetadata) {
		let returnIndex = -1;

		for (let i = rawMetadata.length; 0 < i; i--) {
			if (rawMetadata[i] === ';') {
				returnIndex = i;
				break;
			}
		}

		return returnIndex;
	}
}

async function getMetadata(url) {
	let response = await httpRequest(url);

	try {
		response = JSON.parse(response);
	} catch {
		// TODO: Handle errors
		console.log('Failed to convert response to JSON.');
	}
	repository = response;
}

function httpRequest(url) {
	return new Promise((resolve) => {
		fetch(url).then(onResponse);

		function onResponse(response) {
			if (!response.ok) {
				resolve({ success: false });
			}

			return resolve(response.text());
		}
	})
}

function showPageArea(name) {
	document.querySelector('#form-v1-app').classList.add('hidden');
	document.querySelector('#form-v2-app').classList.add('hidden');
	document.querySelector('#results').classList.add('hidden');
	document.querySelector('#form-url').classList.add('hidden');

	document.querySelector(`#${name}`).classList.remove('hidden');
}

function copyToClipboard(elementId) {
	const textArea = document.querySelector(elementId);
	textArea.select();
	document.execCommand('copy');
}