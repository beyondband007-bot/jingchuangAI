import { spawn } from "child_process";
import { readFile } from "fs/promises";

const [target, messageFile] = process.argv.slice(2);

if (!target || !messageFile) {
  console.error("Usage: node D:\\AI工作台\\send-slock-utf8.mjs <target> <message-file>");
  process.exit(2);
}

const cli = `${process.env.USERPROFILE}\\AppData\\Local\\npm-cache\\_npx\\277f35d2ed0078b9\\node_modules\\@slock-ai\\daemon\\dist\\cli\\index.js`;
const child = spawn(process.execPath, [cli, "message", "send", "--target", target], {
  stdio: ["pipe", "inherit", "inherit"],
  windowsHide: true
});

child.stdin.end(await readFile(messageFile));

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
