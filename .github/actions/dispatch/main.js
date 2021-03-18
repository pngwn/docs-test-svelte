import github from "@actions/github";
import exec from "@actions/exec";
import core from "@actions/core";
import transform from "@pngwn/svelte-util-parse-docs";
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

// function zipDirectory(source, out) {
// 	const archive = archiver("zip", { zlib: { level: 9 } });
// 	const stream = fs.createWriteStream(out);

// 	return new Promise((resolve, reject) => {
// 		archive
// 			.directory(source, false)
// 			.on("error", (err) => reject(err))
// 			.pipe(stream);

// 		stream.on("close", () => resolve());
// 		archive.finalize();
// 	});
// }

async function run() {
	const base = core.getInput("base");
	const token = core.getInput("token");
	// const aws_key_id = core.getInput("aws_key_id");
	// const aws_secret_access_key = core.getInput("aws_secret_access_key");

	// await zipDirectory(base, `${base}.zip`);
	// const fileContent = fs.readFileSync(`${base}.zip`);

	const {
		context: { eventName, payload, ref, repo },
	} = github;

	// const params = {
	// 	Bucket: BUCKET_NAME,
	// 	Key: "cat.jpg", // File name you want to save as in S3
	// 	Body: fileContent,
	// };

	// await exec.exec("zip", [`${base}.zip`, base, "-r"]);

	// await exec.exec("aws", ["configure", "set", "aws_access_key_id", aws_key_id]);
	// await exec.exec("aws", [
	// 	"configure",
	// 	"set",
	// 	"aws_secret_access_key",
	// 	aws_secret_access_key,
	// ]);

	// await exec.exec("aws", [
	// 	"s3",
	// 	"sync",
	// 	`${base}.zip`,
	// 	`s3://svelte-docs/${repo.repo}@next`,
	// ]);
	// aws s3 sync docs.zip s3://my-bucket/svelte@v3.28.0

	// await exec.exec("cat", ["~/.aws/credentials"]);

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

		// TODO: can i send a list of file?

		webhook_payload = files.reduce((acc, { type, content, file }) => {
			if (!acc[type]) {
				return { ...acc, [type]: [{ file, content }] };
			} else {
				return { ...acc, [type]: [...acc[type], { file, content }] };
			}
		}, {});

		console.log(webhook_payload);

		const octokit = github.getOctokit(token);

		console.log({
			type: release_type,
			repo: repo.repo,
			base,
		});

		// const x = await octokit.actions.createWorkflowDispatch({
		// 	owner: "pngwn",
		// 	repo: "docs-test-shell",
		// 	workflow_id: "publish_docs.yml",
		// 	ref,
		// 	inputs: {
		// 		type: release_type,
		// 		repo: repo.repo,
		// 		base,
		// 	},
		// });
		console.log(x);
	} catch (e) {
		console.log("it didn't work", e.message);
	}

	console.log("boo, not bad it worked");

	// console.log(JSON.stringify(github.payload, null, 2));
}

run();
