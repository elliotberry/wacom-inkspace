class PromiseQueue {
	constructor() {
		this.queue = Promise.resolve();
		this.thenables = [];
	}

	/**
	 * @param {Function<Promise>} thenable
	 * @param {Function} [resolve] callback after step execution
	 * @param {int} [i] serial step
	 *
	 * @return {PromiseQueue} this queue
	 */
	then(thenable, resolve, i) {
		this.thenables.push(thenable);

		// this.queue = this.queue.then(thenable);

		this.queue = this.queue.then((...args) => {
			this.thenables.shift();

			if (thenable.canceled)
				return Promise.resolve();
			else
				return thenable(...args);
		});

		if (resolve)
			this.then(result => resolve(result, i));

		return this;
	}

	catch(resolve) {
		this.queue = this.queue.catch(resolve);
		return this;
	}

	cancel() {
		this.thenables.forEach(thenable => (thenable.canceled = true));
	}

	/**
	 * @param {Function<Promise>[]} collection
	 * @param {Function} [resolve] callback after step execution,
	 *	resolve args are previous step result and step index
	 *
	 * @return {Promise} current queue step
	 */
	static serial(collection, resolve) {
		let pq = new PromiseQueue();
		collection.forEach((thenable, i) => pq.then(thenable, resolve, i));
		return pq.queue;
	}
}

module.exports = PromiseQueue;
