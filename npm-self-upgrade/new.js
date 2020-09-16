#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

fs.copyFileSync(
  path.resolve(__dirname, "replaced.js"),
  path.resolve(__dirname, "index.js")
);

console.log("done");
