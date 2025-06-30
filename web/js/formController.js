function continueFromUrl() {
	formData.url = document.querySelector('#repo-url').value;

	if (formData.url === 'https://more.overte.org/applications/metadata.js') {
		getCommunityAppsMetadata();
		showPageArea('form-v1-app');
		return;
	}

	getMetadata(formData.url);

	showPageArea('form-v2-app');
}

function continueFromV1() {
	const { app } = formData;

	// V1 of the metadata requires the app directory to be leading in all directory fields
	app.directory = format.directory(app.directory);
	app.icon = format.v1Directory(app.icon, app.directory);
	app.script = format.v1Directory(app.script, app.directory);

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
	const { app } = formData;

	const entry = {
		appName: app.name,
		appDescription: app.description,
		appBaseDirectory: app.directory,
		appScriptVersions: { stable: app.script },
		appIcon: app.icon,
		appHomeUrl: app.homepage,
		appCategory: app.category,
		appAgeMaturity: app.maturity,
		appActive: true
	}

	document.querySelector('#result-snippet-textarea').value = JSON.stringify(entry, null, 4);

	repository.applicationList.push(entry);
	let fullMetadata = JSON.stringify(repository, null, 4);

	document.querySelector('#result-complete-textarea').value = fullMetadata;

	setTimeout(() => {
		document.querySelector('#result-snippet-textarea').style.height = document.querySelector('#result-snippet-textarea').scrollHeight + 'px';
		document.querySelector('#result-complete-textarea').style.height = document.querySelector('#result-complete-textarea').scrollHeight + 'px';
	}, 50)

	showPageArea('results');
}