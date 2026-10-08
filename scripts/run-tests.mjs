import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function testFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : testFiles(path);
    return entry.isFile() && /\.test\.(ts|mjs)$/.test(entry.name) ? [relative(root, path)] : [];
  });
}

const files = ["src", "scripts"].flatMap(directory => testFiles(join(root, directory))).sort();
if (!files.length) throw new Error("Nenhum arquivo de teste encontrado.");
console.log(`Executando ${files.length} arquivos de teste.`);
const result = spawnSync(process.execPath, [join(root, "node_modules/tsx/dist/cli.mjs"), "--test", ...files], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
