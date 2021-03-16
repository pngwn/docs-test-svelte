import github from "@actions/github";
import fs from 'fs';
import path from 'path';

async function run() {
	console.log(JSON.stringify(github, null, 2));
	const { context: { eventName, payload } } = github;
	console.log(eventName, payload, process.env)
	console.log(__dirname)
	try {
		const p = fs.readFileSync(path.join('.', 'package.json'));
		console.log(p)
	} catch(e) {
		console.log("it didn't work")
	}

	


	switch (eventName) {
		case 'release':

			console.log(`new release for ${payload.release.tag_name}`)
			break;
		case 'push':

			console.log(`unreleased docs`);
			break;
		default:
			break;
	}

	


	
	// console.log(JSON.stringify(github.payload, null, 2));
}

run();
