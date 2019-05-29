let utils = {
	formatBytes(bytes, decimals) {
		if (bytes == 0) return '0 Byte';
		var k = 1000; // or 1024 for binary
		var dm = decimals + 1 || 3;
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		var i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	},

	throttle(fn, threshhold, scope) {
		threshhold || (threshhold = 250);

		var last;
		var deferTimer;

		return function () {
			var context = scope || this;
			var now = +new Date;
			var args = arguments;

			if (last && now < last + threshhold) {
				// hold on to it
				clearTimeout(deferTimer);

				deferTimer = setTimeout(function () {
					last = now;
					fn.apply(context, args);
				}, threshhold);
			}
			else {
				last = now;
				fn.apply(context, args);
			}
		};
	},

	debounce(fn, delay) {
		var timer = null;

		return function () {
			var context = this;
			var args = arguments;

			clearTimeout(timer);

			timer = setTimeout(function () {
				fn.apply(context, args);
			}, delay);
		};
	},

	synchronize(fn, interval, onUpdateState = () => {}) {
		var timer = null;
		var update = [];

		return function (data) {
			var context = this;

			if (!(data instanceof Array)) data = [data];
			update = update.concat(data);

			if (!timer) {
				onUpdateState(true);

				timer = setTimeout(function () {
					fn.call(context, update);

					update = [];
					timer = null;

					onUpdateState(false);
				}, interval);
			}
		};
	},

	// arr.sort(comparator({sortBy: "name", sortOrder: "asc", ignoreCase: true}, {sortBy: "data[profile].age", sortOrder: "desc"}));
	comparator() {
		let sortBy = Array.prototype.slice.call(arguments);

		let compare = function(left, right, sortOrder) {
			let sortMultiplier = sortOrder === "asc" ? 1 : -1;

			if (left > right)
				return 1 * sortMultiplier;
			else if (left < right)
				return -1 * sortMultiplier;
			else
				return 0;
		};

		let getValue = function(obj, path, ignoreCase) {
			path.replace("[", ".").replace("]", "").split(".").forEach(key => (obj = obj[key]));
			return ignoreCase ? obj.toLowerCase() : obj;
		};

		return function(sortLeft, sortRight) {
			return sortBy.map((property) => {
				return compare(getValue(sortLeft, property.sortBy, property.ignoreCase), getValue(sortRight, property.sortBy, property.ignoreCase), property.sortOrder);
			}).reduceRight(function(left, right) {
				return right || left;
			});
		};
	}
};

module.exports = utils;
