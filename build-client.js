const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/app.jsx"],
    bundle: true,
    outfile: "public/app.js",
    format: "iife",
    platform: "browser",
    target: ["es2018"],
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    logLevel: "info",
  })
  .catch(() => {
    process.exit(1);
  });
