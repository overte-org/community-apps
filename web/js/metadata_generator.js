// FIXME: Description does not allow punctuation.

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
	let isValid = true;

	if (!isStringValid(app.name)) newError(`Invalid application name`, 'app-name');
	if (!isStringValid(app.description)) newError(`Invalid application description`, 'app-description');
	if (!isUrlValid(app.icon)) newError(`Invalid application icon path`, 'app-icon');
	if (!isUrlValid(app.directory)) newError(`Invalid application directory path`, 'app-directory');
	if (!isUrlValid(app.script)) newError(`Invalid application script path`, 'app-script');
	if (!isStringValid(app.author)) newError(`Invalid application author`, 'app-author');
	if (!isUrlValid(app.homepage || '')) newError(`Invalid application homepage path`, 'app-homepage');
	if (!isStringValid(app.category)) newError(`Invalid application category`, 'app-category');
	if (!isStringValid(app.maturity)) newError(`Invalid application maturity`, 'app-maturity');

	return isValid;

	function newError(error, targetElement) {
		console.log(`Element ${targetElement} has error '${error}'.`);
		addFormError(error);
		document.querySelector(`#${targetElement}`).classList.add('error-input');
		errorElements.push(document.querySelector(`#${targetElement}`));
		isValid = false;
	}
}
function validateV1Metadata() {
	clearFormErrors();
	const { app } = formData;
	let isValid = true;

	if (!isStringValid(app.name)) newError(`Invalid application name`, 'app-v1-name');
	if (!isStringValid(app.description)) newError(`Invalid application description`, 'app-v1-description');
	if (!isUrlValid(app.icon)) newError(`Invalid application icon path`, 'app-v1-icon');
	if (!isUrlValid(app.directory)) newError(`Invalid application directory path`, 'app-v1-directory');
	if (!isUrlValid(app.script)) newError(`Invalid application script path`, 'app-v1-script');
	if (!isStringValid(app.caption)) newError(`Invalid application caption`, 'app-v1-caption');

	return isValid;

	function newError(error, targetElement) {
		console.log(`Element ${targetElement} has error '${error}'.`);
		addFormError(error);
		document.querySelector(`#${targetElement}`).classList.add('error-input');
		errorElements.push(document.querySelector(`#${targetElement}`));
		isValid = false;
	}
}

function isStringValid(input) {
	const regex = /^[A-Za-z0-9 _-]*$/; // Allow letters, numbers, and spaces
	const regexText = regex.test(input);
	return input !== '' && regexText;
}

function isUrlValid(input) {
	const regex = /^[A-Za-z0-9 _\-:.\/]*$/; // Allow URL characters.
	const regexText = regex.test(input);
	return input !== '' && regexText;
}

function addFormError(error) {
	console.log(error);
}

function clearFormErrors() {
	console.log('Cleared errors');
	errorElements.forEach((elem) => { elem.classList.remove('error-input') })
	errorElements = [];
}

function updateFormData(event, targetElementName) {
	formData.app[targetElementName] = event.target.value;
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