#!/bin/sh
# -*- coding: utf-8-unix -*-
[ "$TRACE" ] && set -x
set -eu

# npm --prefer-offlineはstableかチェックしに行かないのでつけない
NPM_OPT=${NPM_OPT:---cache .npm --legacy-peer-deps}
npm install $NPM_OPT
if [ ! -x ./node_modules/.bin/ncu ];then
   # audit error workaround
  ./node_modules/.bin/npm install npm-check-updates $NPM_OPT
fi
./node_modules/.bin/ncu -u
./node_modules/.bin/npm uninstall npm-check-updates $NPM_OPT

./node_modules/.bin/npm update $NPM_OPT || true
./node_modules/.bin/npm install $NPM_OPT
./node_modules/.bin/npm dedup $NPM_OPT
./node_modules/.bin/npm audit fix $NPM_OPT --force
./node_modules/.bin/npm fund $NPM_OPT
