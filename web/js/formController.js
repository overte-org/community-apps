function continueFromUrl() {
	formData.url = ROOTPATH + "../applications/metadata.json";

	getMetadata(formData.url);

	showPageArea('form-v2-app');
}

function continueFromV2() {
	const { app } = formData;

	const entry = {
		appName: app.name,
		appDescription: app.description,
		appBaseDirectory: app.directory,
		appScriptVersions: { Stable: app.script },
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