const pkg = require("../../package.json");
const project = require("../../project.config.js");

let UAManager = {
	init(appID, appUserID) {
		this.appID = appID.map(n => n.toString(16).pad(2, "0")).join("-").toUpperCase();
		this.appUserID = appUserID;
	},

	update: function() {
		let uuid = AuthenticationManager.profile.uuid;

		if (!uuid && this.uuid)
			UAManager.cloud("Log Out", "Log Out Confirmed");

		this.uuid = uuid;

		if (debug)
			console.log("[UA_MANAGER] update identity:", uuid || this.appUserID);
		else {
			if (this.visitor)
				this.visitor.set("uid", uuid || this.appUserID);
			else {
				this.visitor = UATracker.createInstance(project.uaTrackingID, uuid || this.appUserID);

				this.visitor.set("sr", screen.width + "x" + screen.height);
				this.visitor.set("an", pkg.productName);
				this.visitor.set("av", pkg.version);
				this.visitor.set("aid", this.appID);
				this.visitor.set("ul", project.locales[LocalesManager.locale]);
			}
		}
	},

	page: function(page) {
		if (debug) {
			console.log("[UA_MANAGER] page:", page);
			return;
		}

		this.pageview = "/" + page;
		this.visitor.pageview(this.pageview).send();
	},

	screen: function(name, description) {
		let screenName = name + (description?" - ":"") + (description || "");

		if (debug) {
			console.log("[UA_MANAGER] screen:", screenName);
			return;
		}

		this.visitor.screenview(screenName, pkg.productName).send();
	},

	event: function(category, action, label, value) {
		if (debug) {
			console.log("[UA_MANAGER] event:", Array.from(arguments).filter(e => !!e).join(", "));
			return;
		}

		this.visitor.set("dp", this.pageview);
		this.visitor.event(category, action, label, value).send();
	},

	install: function() {
		this.event("Installer", "Update Completed", pkg.version);
	},

	edit: function(action, label) {
		this.event("Edit Actions", action, label);
	},

	export: function(type) {
		this.event("Export Actions", "Export as " + type, "Export to HDD");
	},

	settings: function(action, label) {
		this.event("Setting Changes", action, label);
	},

	hardware: function(action, label, value) {
		if (action == "Set Orientation") {
			let orientations = ["Portrait", "Landscape Reverse", "Portrait Reverse", "Landscape"];
			label = orientations[label];
		}

		this.event("Hardware Interactions", action, label, value);
	},

	cloud: function(action, label, value) {
		this.event("Cloud Actions", action, label, value);
	}
};

export default UAManager;
