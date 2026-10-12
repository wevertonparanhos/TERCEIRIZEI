// Inicia o Next.js com cwd = marketplace/ (usado pelo preview do app desktop).
const path = require("path");

process.chdir(path.join(__dirname, ".."));
process.argv = [process.argv[0], process.argv[1], "dev", "--port", "3004"];

require(path.join(__dirname, "../node_modules/next/dist/bin/next"));
