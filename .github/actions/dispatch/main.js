import github from "@actions/github";


function run() {
	console.log(JSON.stringify(github, null, 2));
	const {context: { eventName, payload } } = github;

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
