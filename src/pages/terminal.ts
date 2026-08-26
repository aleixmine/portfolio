import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

export function load() {
    const terminal = new Terminal();
    terminal.open(document.getElementById("terminal")!);
    terminal.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
}