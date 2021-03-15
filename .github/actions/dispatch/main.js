import github from "@actions/github";


function run() {
	console.log(JSON.stringify(github, null, 2));

	// console.log(JSON.stringify(github.payload, null, 2));
}

run();
