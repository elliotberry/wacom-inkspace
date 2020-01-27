const Logger = require("./Logger");

let ConsoleBridge = {
	queue: [],

	init: function() {
		console.log = function(...args) {
			// let debug = args.slice(0);
			// debug.unshift("[" + global.THREAD + "]");
			// console.info(...debug);

			ConsoleBridge.redirect("log", args);
		};

		console.warn = function(error) {
			// console.info(error);

			if (typeof error == "string") {
				error = {
					message: error,
					stack: (new Error(error)).stack
				};
			}

			ConsoleBridge.redirect("warn", [{
				message: error.message,
				stack: error.stack
			}]);
		};

		console.error = function(error) {
			if (error.stack) {
				console.info(error.stack);

				ConsoleBridge.redirect("error", [{
					message: error.message,
					stack: error.stack
				}]);
			}
			else {
				if (error.message && (error.message.startsWith("WebSocket handshake") || error.message.startsWith("Network error: ws")))
					console.info(error.message);
				else
					console.info(error);
			}
		};
	},

	connect: function(bridge) {
		this.bridge = bridge;

		while (this.queue.length > 0)
			this.bridge.send(this.queue.shift());
	},

	redirect: function(type, args) {
		if (this.bridge)
			this.bridge.send({type, args});
		else
			this.queue.push({type, args});
	},

	recieve: function(message) {
		console[message.type](...message.args);
	}
};

let bridgeCommon = {
	init: function() {
		ConsoleBridge.init();
	},

	connect: function(linkerID, done) {
		this.linkerID = linkerID;
		this.reply = done;

		ConsoleBridge.connect(this);
	},

	send: function(message) {
// console.info("bridgeCommon sending:", message)
		this.reply({id: this.linkerID, action: "CONSOLE", persistent: true, output: message});
	},

	recieve: function(message) {
		ConsoleBridge.recieve(message);
	}
};

let bridgeMain = {
	init: function() {
		const {ipcMain} = require("electron");

		ConsoleBridge.init();

		ipcMain.on("main-thread-log", (event, message) => {
			this.sender = event.sender;
			ConsoleBridge.connect(this);
		});
	},

	send: function(message) {
// console.info("bridgeMain sending:", message)
		this.sender.send("main-thread-log", message);
	},

	recieve: function(message) {
		ConsoleBridge.recieve(message);
	}
};

let bridgeRender = {
	init: function(fileLoggerRoot, loggerType) {
		const {ipcRenderer} = require("electron");

		ipcRenderer.send("main-thread-log");
		ipcRenderer.on("main-thread-log", (event, message) => this.recieve(message));

		this.implementLOG(fileLoggerRoot, loggerType);
	},

	implementLOG: function(root, type) {
		let logger = new Logger(root, Logger.Type[type]);
		let log = logger.get();

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

				if (logger.target == Logger.Type.CONSOLE)
					console.groupCollapsed(...args);
				else
					log(...args);
			}
			else {
				if (logger.target == Logger.Type.CONSOLE)
					console.groupCollapsed(prefix, ...args);
				else
					log(...[prefix, ...args]);
			}

			log(caller);

			if (logger.target == Logger.Type.CONSOLE)
				console.groupEnd();
			else
				log("--------------------------------------------------------------------------------------------------------------------------");
		};

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
	},

	send: function() {
		// render thread is target and never sends
	},

	recieve: function(message) {
		if (message.type == "log")
			console.log(...message.args);
		else if (message.type == "warn")
			console.warn(message.args[0].message);
		else if (message.type == "error")
			console.error(message.args[0].stack);
		else
			throw new Error("Unknown message type found:", JSON.stringify(message));
	}
};

module.exports = {
	common: bridgeCommon,
	main: bridgeMain,
	render: bridgeRender
};
