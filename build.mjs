/* ============================================================
   Build — precompile JSX → JS (drop in-browser Babel)
   Output: dist/  (deployable static site for GitHub Pages)
   - src/*.jsx  → Babel preset-react (classic, global scope) → dist/src/*.js
   - src/*.js   → copied verbatim
   - styles.css → copied
   - index.html → rewritten: no Babel CDN, React production build, .js scripts
   ============================================================ */
import babel from "@babel/core";
import presetReact from "@babel/preset-react";
import { promises as fs } from "fs";
import path from "path";

const ROOT = path.resolve(".");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const DIST_SRC = path.join(DIST, "src");

async function main() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST_SRC, { recursive: true });

  const files = (await fs.readdir(SRC)).sort();
  for (const f of files) {
    const full = path.join(SRC, f);
    if (f.endsWith(".jsx")) {
      const code = await fs.readFile(full, "utf8");
      const out = await babel.transformAsync(code, {
        filename: f,
        babelrc: false,
        configFile: false,
        sourceType: "script", // classic <script> semantics — shared global scope across files
        presets: [[presetReact, { runtime: "classic" }]],
      });
      const target = path.join(DIST_SRC, f.replace(/\.jsx$/, ".js"));
      await fs.writeFile(target, out.code, "utf8");
      console.log("compiled", f, "→", path.relative(ROOT, target));
    } else if (f.endsWith(".js")) {
      await fs.copyFile(full, path.join(DIST_SRC, f));
      console.log("copied  ", f);
    }
  }

  await fs.copyFile(path.join(ROOT, "styles.css"), path.join(DIST, "styles.css"));
  console.log("copied   styles.css");

  let html = await fs.readFile(path.join(ROOT, "index.html"), "utf8");
  html = html
    // remove the in-browser Babel transpiler
    .replace(/^.*@babel\/standalone.*\r?\n/m, "")
    // use React production builds
    .replace(/react\.development\.js/, "react.production.min.js")
    .replace(/react-dom\.development\.js/, "react-dom.production.min.js")
    // drop SRI hashes (they were for the dev builds)
    .replace(/\s+integrity="[^"]*"/g, "")
    // load precompiled .js instead of in-browser-transpiled .jsx
    .replace(
      /<script type="text\/babel" data-presets="react" src="(src\/[^"]+)\.jsx"><\/script>/g,
      '<script src="$1.js"></script>'
    );
  await fs.writeFile(path.join(DIST, "index.html"), html, "utf8");
  console.log("wrote    dist/index.html");

  console.log("\n✓ build complete → dist/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
