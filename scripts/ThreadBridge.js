const uuid = require("uuid");
const threads = require("threads");

class ThreadBridge {
	constructor(src) {
		this.name = src.split("/").last.split(".").first.replace("Worker", "");
		// this.sender = (new Error("")).stack.split(/\n/g)[2].split(/\\|\//g).last.split(".").first;

		this.linker = {};
		this.worker = threads.spawn(src);
		this.worker.on("message", this.recieve.bind(this));
		this.worker.on("error", console.error);
	}

	init(input, consoleBridge) {
		let consoleBridgeID = uuid();

		this.linker[consoleBridgeID] = {
			resolve: consoleBridge.recieve.bind(consoleBridge),
			reject: console.error
		};

		input = Object.assign(input, {consoleBridgeID: consoleBridgeID, debug: global.debug});
		this.send("INIT", {input: input}, () => console.info("[WORKER_" + this.name + "] ready"));
	}

	send(action, request, resolve, reject) {
		let id = uuid();

		this.linker[id] = {
			resolve: resolve || (() => {}),
			reject: reject || console.error
		};
// console.info("[WORKER_" + this.name + "_] send " + action + " // " + id)
		this.worker.send(Object.assign({}, request, {id: id, action: action}));
	}

	forward(message, resolve, reject) {
		this.linker[message.id] = {
			resolve: resolve || (() => {}),
			reject: reject || console.error
		};
// console.info("[WORKER_" + this.name + "_] forward " + message.action + " // " + message.id)
		this.worker.send(message);
	}

	recieve(message) {
		let linker = this.linker[message.id];
// console.info("[_WORKER_" + this.name + "] recieve " + message.action + " // " + JSON.stringify(message.output)) // message.id, JSON.stringify(message.output)
		if (message.redirect)
			linker.resolve(message);
		else if (message.error)
			linker.reject(message.error);
		else {
			// message.output instanceof Array
			if (message.type)
				linker.resolve(...(message.output || []));
			else
				linker.resolve(message.output);
		}

		if (!message.persistent)
			delete this.linker[message.id];
	}

	kill() {
		this.worker.kill();
	}
}

module.exports = ThreadBridge;
