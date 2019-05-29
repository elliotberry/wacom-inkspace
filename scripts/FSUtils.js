const childProcess = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = {
	removeSync: function(path) {
		if (fs.existsSync(path)) {
			if (fs.lstatSync(path).isDirectory()) {
				fs.readdirSync(path).forEach((file, index) => {
					var currPath = path + "/" + file;

					if (fs.lstatSync(currPath).isDirectory())
						this.removeSync(currPath);
					else
						fs.unlinkSync(currPath);
				});

				fs.rmdirSync(path);
			}
			else
				fs.unlinkSync(path);
		}
	},

	move: function(sourcePath, destinationPath) {
		this.copy(sourcePath, destinationPath, true);
	},

	copy: function(sourcePath, destinationPath, move) {
		var source = fs.createReadStream(sourcePath);
		var destination = fs.createWriteStream(destinationPath);

		source.on("error", (error) => console.error("source:", error.message));
		destination.on("error", (error) => console.error("destination", error.message));

		source.on("end", function() {
			console.log("<---------- copy ---------->");
			console.log("source:", sourcePath);
			console.log("destination:", destinationPath);
			console.log("!---------- copy ----------!");

			if (move) fs.unlink(sourcePath, () => console.log(`${sourcePath} removed successfully`));
		});

		source.pipe(destination);
	},

	requireGlobal: function(packageName) {
		var globalNodeModules = childProcess.execSync("npm root -g").toString().trim();
		var packageDir = path.join(globalNodeModules, packageName);

		if (!fs.existsSync(packageDir))
			packageDir = path.join(globalNodeModules, 'npm/node_modules', packageName); // find package required by old npm

		if (!fs.existsSync(packageDir))
			throw new Error("Cannot find global module '" + packageName + "'");

		var packageMeta = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json")).toString());
		var main = path.join(packageDir, packageMeta.main || "index.js");

		return require(main);
	}
};
