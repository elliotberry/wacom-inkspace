class PromiseQueue {
	constructor() {
		this.queue = Promise.resolve();
	}

	/**
	 * @param {Function<Promise>} thenable
	 * @param {Function} [resolve] callback after step execution
	 * @param {int} [i] serial step
	 *
	 * @return {Promise} current queue step
	 */
	process(thenable, resolve, i) {
		this.queue = this.queue.then(() => {
			if (resolve) {
				return thenable().then(result => {
					resolve(result, i);
					return Promise.resolve();
				});
			}
			else
				return thenable();
		});

		return this;
	}

	then(thenable) {
		this.queue = this.queue.then(thenable);
		return this;
	}

	catch(resolve) {
		this.queue = this.queue.catch(resolve);
		return this;
	}

	/**
	 * @param {Function<Promise>[]} collection
	 * @param {Function} [resolve] callback after step execution
	 *
	 * @return {Promise} current queue step
	 */
	serial(collection, resolve) {
		collection.forEach((thenable, i) => this.process(thenable, resolve, i));
		return this.queue;
	}

	/**
	 * @param {Function<Promise>[]} collection
	 * @param {Function} [resolve] callback after step execution
	 *
	 * @return {Promise} current queue step
	 */
	static serial(collection, resolve) {
		let pq = new PromiseQueue();
		return pq.serial(collection, resolve);
	}
}

module.exports = PromiseQueue;
