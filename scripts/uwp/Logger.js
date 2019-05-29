let Logger = {
	init: function() {
		let log = console.log.bind(console);
		let info = console.info.bind(console);
		let error = console.error.bind(console);

		this.log = (...args) => {
			log(...args);
			NativeLinker.log(...args);
		};

		this.info = (...args) => {
			info(...args);

			if (args[0] && typeof args[0] == "string" && !args[0].contains("UWP"))
				NativeLinker.log(...args);
		};

		this.error = (err) => {
			error(err);
			NativeLinker.error(err);
		};

		console.suppress = [];

		console.log = function(...args) {
			let d = new Date();
			let prefix = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + "." + d.getMilliseconds().pad(4) + ":";
			let caller = ((new Error()).stack.split(/\n/g)[2] || "").trim();

			if (args[0] && typeof args[0] == "string") {
				for (let i = 0; i < console.suppress.length; i++) {
					if (args[0].contains(`[${console.suppress[i]}]`))
						return;
				}
			}

			if (args[0] && args[0].toString().contains("%")) {
				args[0] = prefix + " " + args[0];

				if (Logger.target == Logger.Type.CONSOLE)
					console.groupCollapsed(...args);
				else
					Logger.log(...args);
			}
			else {
				if (Logger.target == Logger.Type.CONSOLE)
					console.groupCollapsed(prefix, ...args);
				else
					Logger.log(...[prefix, ...args]);
			}

			Logger.log(caller);

			if (Logger.target == Logger.Type.CONSOLE)
				console.groupEnd();
			else
				Logger.log("--------------------------------------------------------------------------------------------------------------------------");
		};

		console.info = function(...args) {
			if (args[0] && typeof args[0] == "string") {
				for (let i = 0; i < console.suppress.length; i++) {
					if (args[0].contains(`[${console.suppress[i]}]`))
						return;
				}
			}

			Logger.info(...args);
		}

		console.error = function(err) {
			Logger.error(err);
		}

		let lastReducerRow;
		let lastReducerTime = 0;

		console.reducer = function reducer(type, body) {
			if (type.startsWith("@@redux") || console.suppress.includes("REDUX"))
				return;

			let reducerRow;

			try {
				reducerRow = type + " :: " + JSON.stringify(body);
			}
			catch(e) {
				let caller = (new Error()).stack.split(/\n/g)[2].trim();

				console.group(type, "::", body);
				console.warn(caller);
				console.groupEnd();
			}

			let reducerTime = Date.now();

			if (reducerRow != lastReducerRow || reducerTime - lastReducerTime > 100) {
				lastReducerRow = reducerRow;
				lastReducerTime = reducerTime;

				console.log("[" + type + "]", body || "");
			}
		};
	}
};

Function.prototype.createEnum.call(Logger, "Type", ["CONSOLE", "FILE", "BOTH"]);
Logger.target = Logger.Type.FILE;

module.exports = Logger;
