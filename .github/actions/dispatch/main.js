import github from "@actions/github";
import core from "@actions/core";
import { promises as fs } from "fs";
import path from "path";

function get_file_with_name(base, type) {
	return new Promise(async (rs, rj) => {
		fs.readdir(path.join(base, type))
			.then((files) => rs({ type, files }))
			.catch(rj);
	});
}
function read_file_with_meta(base, type, path) {
	return new Promise(async (rs, rj) => {
		fs.readFile(path.join(base, type, path))
			.then((content) => rs({ type, path, content }))
			.catch(rj);
	});
}

async function run() {
	const base = core.getInput("base");
	console.log(base);

	const {
		context: { eventName, payload },
	} = github;

	console.log(eventName, payload, process.env);
	console.log(__dirname);

	try {
		const dirs = await fs.readdir(base);
		console.log("contents of base dir");
		const file_paths = await await Promise.all(
			dirs.map((f) => get_file_with_name(base, f))
		);
		console.log(file_paths);

		const files = await Promise.all(
			file_paths
				.reduce(
					(acc, { type, files }) => [
						...acc,
						...files.map((f) => ({ type, file: f })),
					],
					[]
				)
				.map(({ type, file }) => read_file_with_meta(base, type, file))
		);

		console.log(files);

		console.log(p);
	} catch (e) {
		console.log("it didn't work");
	}

	switch (eventName) {
		case "release":
			console.log(`new release for ${payload.release.tag_name}`);
			break;
		case "push":
			console.log(`unreleased docs`);
			break;
		default:
			break;
	}

	// console.log(JSON.stringify(github.payload, null, 2));
}

run();
