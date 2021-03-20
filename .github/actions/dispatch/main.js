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

		// console.log(sorted_files);

		const API_BASE = "https://svelte-api.pngwn.workers.dev/docs";

		const api = sorted_files.api.map(({ file, content }) => {
			return transform(file, content);
		});

		const keys = [];

		release_keys.forEach((version) => {
			const list = [];

			api.forEach(({ title, slug, file, sections, content }) => {
				list.push({
					title,
					slug,
					file,
					sections,
					url: `${API_BASE}/${repo.repo}/api/${file.replace(
						".md",
						""
					)}?q=${version}`,
				});

				keys.push({
					key: `${repo.repo}:api:${file.replace(".md", "")}:${version}`,
					value: JSON.stringify({ title, slug, file, sections, content }),
				});
			});

			keys.push({
				key: `${repo.repo}:api:list:${version}`,
				value: JSON.stringify(list),
			});

			keys.push({
				key: `${repo.repo}:api:${version}`,
				value: JSON.stringify(api),
			});
		});

		// const api_items = release_keys
		// 	.map((version) =>
		// 		api.map((content) => ({
		// 			key: `${repo.repo}:api:${file.replace(".md", "")}:${version}`,
		// 			value: JSON.stringify(content),
		// 		}))
		// 	)
		// 	.flat();

		// const api_list = release_keys.map((version) => ({
		// 	key: `${repo.repo}:api:list:${version}`,
		// 	value: JSON.stringify(
		// 		api.map(({ title, slug, file, sections }) => ({
		// 			title,
		// 			slug,
		// 			file,
		// 			sections,
		// 			url: `${API_BASE}/${docs}/${repo.repo}/${file.replace(".md", "")}`,
		// 		}))
		// 	),
		// }));

		// const api_all = release_keys.map((version) => ({
		// 	key: `${repo.repo}:api:${version}`,
		// 	value: JSON.stringify(api),
		// }));
		// console.log(body);
		// console.log(cf_token, `${API_ROOT}${KV_WRITE}`);
		console.log(keys);

		const x = await put(`${API_ROOT}${KV_WRITE}`, {
			body: keys,
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
		throw e;
	}

	console.log("boo, not bad it worked");

	// console.log(JSON.stringify(github.payload, null, 2));
}

run();
