const {common : consoleBridge} = require("../ConsoleBridge");

global.StrokesCodec = require("../StrokesCodec");

global.THREAD = "DB";

let DBManager;

function getResolve(response, done) {
	return function resolve() {
		let output = [];

		for (let i = 0; i < arguments.length; i++)
			output.push(arguments[i]);
// console.info("========= response resolve", response.action)
		response.output = output;
		done(response);
	};
}

function getReject(response, done) {
	return function reject(error) {
// console.info("========= response reject", response.action, error.message)
		response.error = error.message;
		done(response);
	}
}

consoleBridge.init();

module.exports = function(request, done) {
	let message = request.action + ((request.action == "INIT")?"":" (" + JSON.stringify(request.input) + ")") + " // " + request.id;
	console.log("[WORKER_DB] process", message);
	// console.log("[WORKER_DB] this", this);

	let input = request.input;
	delete request.input;

	let response = Object.assign({}, request);

	if (request.action == "INIT") {
		global.ROOT = input.app;
		global.debug = input.debug;

		consoleBridge.connect(input.consoleBridgeID, done);

		DBManager = new (require("../DBManager"))(input.root);
		done({id: request.id, action: request.action});
	}
	else {
		if (request.action == "CONNECT_WITH_STORE")
			DBManager.connectWithStore(response, done);
		else {
// console.info("========= request", request.action)
			if (request.type == "PROMISE")
				DBManager[request.action].apply(DBManager, input).then(getResolve(response, done)).catch(getReject(response, done));
			else if (request.type == "CALLBACK") {
				input.push(getResolve(response, done));
				DBManager[request.action].apply(DBManager, input);
			}
			else
				getReject(response, done)({message: "Unknown message type: " + request.type});
		}
	}
};
