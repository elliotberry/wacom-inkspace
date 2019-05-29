import path from 'path';

const pkg = require("../../package.json");
const project = require("../../project.config.js");

global.debug = process.env.NODE_ENV === "development" || project.debug || pkg.version.indexOf("beta") != -1;

const WINDOW_MIN_WIDTH = 1040;

let AppManager = {
	reload: false,
	closing: false,
	closed: false,

	init: function() {
		UIManager.setVisualZoomLevelLimits(1, 1);
		PowerManager.onSuspend(window.close)

		addEventListener("resize", (e) => {
			clearTimeout(this.updateWindowSizeID);

			this.updateWindowSizeID = setTimeout(() => {
				DBManager.edit(DBManager.entities.SETTINGS, {
					window: {
						width: window.outerWidth < WINDOW_MIN_WIDTH ? WINDOW_MIN_WIDTH : window.outerWidth,
						height: window.outerHeight
					}
				}).catch(console.error);
			}, 500);
		});

		addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				e.stopPropagation();
			}
		});

		if (debug) {
			// addEventListener("keydown", function(e) {
			// 	console.log(e.keyCode, e.ctrlKey || e.metaKey, e.shiftKey, (e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode == 82)
			// }, false);

			// addEventListener("keydown", function(e) {
			window.onkeydown = function(e) {
				if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode == 82) {
					AppManager.reload = true;

					if (DeviceManager.context != DeviceManager.Context["SETUP"])
						global.redirect("/library");

					e.preventDefault();
					e.stopPropagation();

					window.close();
				}
			};
			// }, false);
		}

		window.onbeforeunload = (e) => {
			if (debug) console.log("[APP MANAGER] onbeforeunload (reload: %s, closing: %s, closed: %s)", this.reload, this.closing, this.closed);

			if (!this.closing) {
				this.closing = true;
				this.closeSmartPad();

				e.returnValue = false;
			}
			else if (!this.closed)
				e.returnValue = false;
			else if (!this.reload)
				UIManager.quit();
		}

		window.ondragover =
		window.ondrop =
		(e) => {
			e.preventDefault();
			e.stopPropagation();
		}
	},

	closeSmartPad: function() {
		DeviceManager.close().then(closing => {
			if (!closing)
				AppManager.complete();
		}).catch(reason => {
			if (reason.message)
				console.error(reason);
			else
				console.info(reason);

			setTimeout(this.closeSmartPad, 2000);
		});
	},

	confirmSmartPadClose() {
		this.complete();
	},

	confirmSaveNote() {
		this.editCompleted = true;
		this.complete();
	},

	forceReload: function() {
		this.closed = true;
		this.closing = true;

		UIManager.reload();
	},

	complete: function() {
		if (DeviceManager.context == DeviceManager.Context.LIVE)
			return;
		else if (DeviceManager.context == DeviceManager.Context.CREATION && !this.editCompleted) {
			this.triggerSaveNote();
			return;
		}

		delete this.editCompleted;

		setTimeout(function() {
			AppManager.closed = true;

			if (AppManager.reload)
				UIManager.reload();
			else
				DBManager.closeDB().then(() => window.close());
		}, 500);
	}
};

AppManager.init();

export default AppManager;
