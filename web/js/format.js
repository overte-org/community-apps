const format = {
	directory: (string) => {
		// Remove leading '/' character if present
		if (string[0] === "/") string = string.substring(1)

		return string;
	},
	v1Directory: (string, directory) => {
		string = format.directory(string);

		string = `${directory}/${string}`;

		return string;
	}
}