let cp = require("child_process");
let args = process.argv.slice(2);

args[0] += (process.platform == "win32")?".bat":".sh";
let prefix = (process.platform == "win32")?"app-scripts\\":"./app-scripts/";
let command = prefix + args.join(" ");

console.log("----------------------------------------");
console.log("exec:", command);
console.log("----------------------------------------", "\n");

// const proc = cp.spawn("ls", ["-lh"]);
const proc = cp.spawn(prefix + args[0], args.slice(1), {cwd: __dirname, env: process.env});

proc.stdout.on("data", (data) => {
	console.log(data.toString());
});

proc.stderr.on("data", (data) => {
	console.error("error:", data);
});

proc.on("close", (code) => {
	if (code != 0)
		console.log(`child process exited with code ${code}`);
});

proc.on("error", (e) => {
	console.error("error:", e.message);
	console.error(e);
});

/*
try {
	let stdout = cp.execSync(command).toString();
	console.log(stdout);
}
catch(e) {
	console.error(e);
}
*/
