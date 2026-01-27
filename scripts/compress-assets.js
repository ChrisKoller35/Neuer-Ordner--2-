"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const srcDir = path.join(__dirname, "..", "src");

async function main() {
	if (!fs.existsSync(srcDir)) {
		console.error("src directory not found:", srcDir);
		process.exit(1);
	}

	const files = fs.readdirSync(srcDir).filter(name => /\.png$/i.test(name));
	if (files.length === 0) {
		console.log("No PNG files found in", srcDir);
		return;
	}

	for (const file of files) {
		const inputPath = path.join(srcDir, file);
		const outputPath = path.join(srcDir, file.replace(/\.png$/i, ".webp"));
		await sharp(inputPath)
			.webp({ quality: 80 })
			.toFile(outputPath);
		console.log("Created", path.relative(process.cwd(), outputPath));
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
