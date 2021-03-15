import resolve from "@rollup/plugin-node-resolve";
import cjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

export default [
	{
		plugins: [
			cjs(),
			resolve(),
			// terser(),
		],
		input: "main.js",
		output: [
			{
				file: "dist/main.js",
				format: "cjs",
				sourcemap: true,
			},
		],
	},
];
