# More
1. What is More
2. User manual
    - Installation
	- Adding Repositories
    - Usability tips
3. Development
	- How to create your own repository

## What is More
More is an application that allows users to quickly install additional applications hosted from online repositories.

## User Manual
### Installation
**Recommended method**:

To install this application, visit the pre-installed More application provided inside of Overte. 

Inside of the pre installed More application, search for the app that is also called "More".
Click the "Install" button and the More application will be installed.
You will also need to add the url Add `https://raw.githubusercontent.com/overte-org/community-apps/master/applications/more/more.qml` to the QML whitelist manually.

**Alternative**:

You can install More manually by following these instructions: 
1. In Interface, go to Edit > Running Scripts.
2. Load the script url: `https://raw.githubusercontent.com/overte-org/community-apps/master/applications/more/more.js`
3. Add `https://raw.githubusercontent.com/overte-org/community-apps/master/applications/more/more.qml` to the QML whitelist.

### Adding Repositories
To add a repository, navigate to the application menu by pressing the top right most button with the hamburger icon.
From there, click the section labeled "Repository Manager". In the text field labeled "Add a manifest.json url", paste in a url that provides a manifest json object.
As an example, if you wanted to provide a url to a manifest file hosted on GitHub, you would paste in something along the lines of `https://raw.githubusercontent.com/user/respository/manifest.json`. 
After the url is in the text field, press the green plus button to add the repository to the list. Do note that this app does attempt to verify repositories when they are added. If you find that your repository can not be added successfully, ensure the repository is of the correct format. Also make sure that the url you are providing is correct.
If you are a repository host, ensure that your repository is set up correctly.


### Usability Tips
TODO

## Development
### How to create your own repository
#### Github
To turn a GitHub repository into a Overte repository provider, you need to make your GitHub repository a "[GitHub Pages](https://pages.github.com/)" repository.
The defaults provided by GitHub will be sufficient for this use case. Select the root of the repository as the GitHub Pages root.
After you have ensured that your repository is set up correctly, you can add the `manifest.json` file to the root of your repository.

This is the format to use:
```json
{
	"title": "My GitHub Repository", // This is the name that will show up in the repository manager
	"base_url": "https://raw.githubusercontent.com/myuser/myrepository", // This is what the More app uses as a base to search for applications provided by the 'applications' key just below this entry.
	
	// This is the list of all applications this repository will provide to the More app.
	"applications": [
		{
			"name": "My App", // The name of the application to display.
			"directory": "myapp", // The directory of the application relative to the 'base_url'. This will be interpreted as 'https://raw.githubusercontent.com/myuser/myrepository/myapp' internally.
			"script": "myapp.js", // The entry script of the application.
			"icon": "icon.png", // The icon of the application to show in the list.
			"description": "This is my first application! Download this please." // The description of the application to display in the "details" page.
		},
		/// ...and other applications
	]
}
```

#### HTTPS Servers
To provide the applications from a standard HTTPS server, the procedure is largely the same as with GitHub. You simply need to provide a JSON response that is in the same format as the above "GitHub" format.