#!/bin/sh -ex
# -*- coding: utf-8-unix -*-
set -eu

npm install
./node_modules/.bin/ncu -u
./node_modules/.bin/npm update || true
./node_modules/.bin/npm install
./node_modules/.bin/npm dedup
./node_modules/.bin/npm audit fix
./node_modules/.bin/npm fund
