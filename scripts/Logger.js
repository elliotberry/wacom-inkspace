const fs = require("fs");

// require("./js.ext");

class Logger {
	constructor(root, target) {
		this.root = root + "/debug";
		this.target = target || Logger.Type.CONSOLE;

		if (!fs.existsSync(this.root)) fs.mkdirSync(this.root);

		this.filePath = `${this.root}/${Date.now()}.log`;
		console.info(this.filePath);

		this.consoleLog = console.log.bind(console);
	}

	fLog(...args) {
		if (this.target == Logger.Type.BOTH)
			this.consoleLog(...args);

		fs.appendFileSync(this.filePath, "\n" + args.map(o => {
			try {
				let content = JSON.stringify(o);

				if (content.substring(1) == "\"")
					return content.substring(1, content.length-1);
				else
					return content;
			}
			catch(e) {
				return o;
			}
		}).join(" "));
	}

	get() {
		if (this.target == Logger.Type.CONSOLE)
			return this.consoleLog;
		else
			return this.fLog.bind(this);
	}
}

if (Logger.createEnum)
	Logger.createEnum("Type", ["CONSOLE", "FILE", "BOTH"]);

module.exports = Logger;
