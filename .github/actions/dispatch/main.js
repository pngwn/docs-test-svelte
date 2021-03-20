import github from "@actions/github";
import exec from "@actions/exec";
import core from "@actions/core";
import transform from "@pngwn/svelte-util-parse-docs";
import { put } from "httpie";
import { promises as fs } from "fs";
import path from "path";

const CF_ID = "03a53ffe7b4926e8f6c4aa5e2ddf6b0f";
const KV_ID = "e031c432a7d943d39dec45d34020883d";

const API_ROOT = "https://api.cloudflare.com/client/v4/";
const KV_WRITE = `accounts/${CF_ID}/storage/kv/namespaces/${KV_ID}/bulk`;

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
	const cf_token = core.getInput("cf_token");

	const {
		context: { eventName, payload, ref, repo },
	} = github;

	const release_keys =
		eventName === "release" ? [payload.release.tag_name, "latest"] : ["next"];

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

		const sorted_files = files.reduce((acc, { type, content, file }) => {
			if (!acc[type]) {
				return { ...acc, [type]: [{ file, content }] };
			} else {
				return { ...acc, [type]: [...acc[type], { file, content }] };
			}
		}, {});

		console.log(sorted_files);

		const api = sorted_files.api.map(({ file, content }) => {
			return transform(file, content);
		});

		console.log(api);

		const body = release_keys.map((version) => ({
			key: `${repo.repo}:api:${version}`,
			value: api,
		}));
		console.log(`${API_ROOT}${KV_WRITE}`);
		const x = await put(`${API_ROOT}${KV_WRITE}`, {
			body: JSON.stringify(body),
			headers: {
				Authorization: `Bearer ${cf_token}`,
			},
		});
		console.log("put: ", x);
		console.log({
			type: `${release_keys.map((v) => `${v}: ${repo.repo}:api:${v}`)}`,
			repo: repo.repo,
			base,
			key: `${repo.repo}:api:${version}`,
		});
	} catch (e) {
		console.log("it didn't work", e.message);
	}

	console.log("boo, not bad it worked");

	// console.log(JSON.stringify(github.payload, null, 2));
}

run();
