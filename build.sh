#!/bin/sh
test -f package.json || npm init -y
npm install @actions/core
npm install @actions/github
npm install @actions/glob
npm install @iarna/toml
npm install @vercel/ncc
./node_modules/.bin/ncc build index.js -o dist
cp action.yml dist/
