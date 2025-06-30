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


function continueFromUrl() {
	formData.url = document.querySelector('#repo-url').value;

	if (formData.url === 'https://more.overte.org/applications/metadata.js') {
		getCommunityAppsMetadata();
		showPageArea('form-v1-app');
		return;
	}

	showPageArea('form-v2-app');
}

async function continueFromV1() {
	if (validateV1Metadata() === false) {
		return;
	}

	const { app } = formData;

	const entry = {
		name: app.name,
		description: app.description,
		directory: app.directory,
		jsfile: app.script,
		icon: app.icon,
		caption: app.caption,
		isActive: true
	}

	document.querySelector('#result-snippet-textarea').value = JSON.stringify(entry, null, 4);

	repository.applications.push(entry);
	let fullMetadata = JSON.stringify(repository, null, 4);
	fullMetadata = `var metadata = ${fullMetadata};`; // Append the extra string that was remove earlier

	document.querySelector('#result-complete-textarea').value = fullMetadata;

	setTimeout(() => {
		document.querySelector('#result-snippet-textarea').style.height = document.querySelector('#result-snippet-textarea').scrollHeight + 'px';
		document.querySelector('#result-complete-textarea').style.height = document.querySelector('#result-complete-textarea').scrollHeight + 'px';
	}, 50)
	showPageArea('results');
}

function continueFromV2() {
	if (validateV2Metadata() === false) {
		return;
	}

	// TODO: Create app entry json

	// TODO: Combine with existing JSON

	showPageArea('results');
}

function validateV2Metadata() {
	clearFormErrors();
	const { app } = formData;
}

function validateV1Metadata() {
	clearFormErrors();
	const { app } = formData;

	// V1 of the metadata requires the app directory to be leading in all directory fields
	app.icon = format.v1Directory(app.icon, app.directory);
	app.directory = format.directory(app.directory);
	app.script = format.v1Directory(app.script, app.directory);

	return true;
}

function addFormError(error) {
	console.log(error);
}

function clearFormErrors() {
	console.log('Cleared errors');
	errorElements.forEach((elem) => { elem.classList.remove('error-input') })
	errorElements = [];
}

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