#!/usr/bin/env sh

set -eu

cd app

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev