#!/bin/sh
# -*- coding: utf-8-unix -*-
[ "$TRACE" ] && set -x
set -eu

# npm --prefer-offlineはstableかチェックしに行かないのでつけない
NPM_OPT=${NPM_OPT:---cache .npm --legacy-peer-deps}
npm install $NPM_OPT
NPM=./node_modules/.bin/npm
if [ ! -x "$NPM" ];then
  NPM=npm
fi
#if [ ! -x ./node_modules/.bin/ncu ];then
#   # audit error workaround
#  $NPM install --no-save npm-check-updates $NPM_OPT
#fi
#./node_modules/.bin/ncu -u
## $NPM uninstall npm-check-updates $NPM_OPT
npx --yes npm-check-updates -u

$NPM update $NPM_OPT || true
$NPM install $NPM_OPT
$NPM dedup $NPM_OPT
$NPM audit fix $NPM_OPT --force
$NPM fund $NPM_OPT
