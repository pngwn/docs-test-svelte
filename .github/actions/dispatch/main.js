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
function read_file_with_meta(base, type, path_name) {
	return new Promise(async (rs, rj) => {
		fs.readFile(path.join(base, type, path_name))
			.then((content) =>
				rs({ type, file: path_name, content: content.toString() })
			)
			.catch(rj);
	});
}

async function run() {
	const base = core.getInput("base");
	const token = core.getInput("token");

	const {
		context: { eventName, payload, ref },
	} = github;

	const release_type =
		eventName === "release" ? payload.release.tag_name : "next";

	console.log(eventName, payload, process.env);
	console.log(__dirname);
	let webhook_payload;

	try {
		const dirs = await fs.readdir(base);
		console.log("contents of base dir");
		const file_paths = await await Promise.all(
			dirs.map((f) => get_file_with_name(base, f))
		);

		const files = await Promise.all(
			file_paths
				.filter(({ type }) => type !== "examples" && type !== "tutorials")
				.reduce(
					(acc, { type, files }) => [
						...acc,
						...files.map((f) => ({ type, file: f })),
					],
					[]
				)
				.map(({ type, file }) => read_file_with_meta(base, type, file))
		);

		webhook_payload = files.reduce((acc, { type, content, file }) => {
			if (!acc[type]) {
				return { ...acc, [type]: [{ file, content }] };
			} else {
				return { ...acc, [type]: [...acc[type], { file, content }] };
			}
		}, {});

		console.log(webhook_payload);

		const octokit = github.getOctokit(token);

		const x = await octokit.actions.createWorkflowDispatch({
			owner: "pngwn",
			repo: "docs-test-shell",
			workflow_id: "publish_docs.yml",
			ref,
		});
		console.log(x);
	} catch (e) {
		console.log("it didn't work", e.message);
	}

	console.log("boo, not bad it worked");

	// console.log(JSON.stringify(github.payload, null, 2));
}

run();
