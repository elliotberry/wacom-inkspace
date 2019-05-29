const fs = require("fs");

const levelup = require("levelup");
const leveldown = require("leveldown");

class DBWrapper {
	constructor(root) {
		this.root = root;
	}

	async open() {
		let lockPath = this.root + "/LOCK";
		if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);

		this.conn = levelup(leveldown(this.root));
	}

	async close() {
		await this.conn.close();
	}

	async get(entity) {
		let entry = await this.conn.get(Buffer.from(entity), {asBuffer: false}).catch(reason => {
			if (reason.type != "NotFoundError")
				throw reason;
		});

		if (entry)
			entry = JSON.parse(entry);
// console.info("got:", entity, "::", entry?JSON.stringify(entry):entry)
		return entry;
	}

	async set(entity, value) {
// console.info("exec set", entity, !!value)
		if (value)
			await this.conn.put(Buffer.from(entity), Buffer.from(JSON.stringify(value)));
		else
			await this.conn.del(Buffer.from(entity));
// console.info("exec set completed")
	}

	async remove(entity) {
		await this.conn.del(Buffer.from(entity));
	}
}

module.exports = DBWrapper;
