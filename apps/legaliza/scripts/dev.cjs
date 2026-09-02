// Inicia o Next.js com cwd = apps/legaliza, para que Tailwind/PostCSS resolvam a
// configuração local em vez da raiz do monorepo (next dev <dir> não muda o cwd).
const path = require("path");

process.chdir(path.join(__dirname, ".."));
process.argv = [process.argv[0], process.argv[1], "dev", "--port", "3003"];

require(path.join(__dirname, "../../../node_modules/next/dist/bin/next"));
