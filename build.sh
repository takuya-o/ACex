#!/bin/sh
# -*- coding: utf-8-unix -*-
set -eu

#rm -f src/lib/*.js
rm -f src/lib/*.js.map

npm install
./node_modules/.bin/npm update || true
./node_modules/.bin/npm audit fix
./node_modules/.bin/npm fund
cp -p node_modules/jquery/dist/jquery.min.* src/lib/
cp -p node_modules/jspdf/dist/jspdf.umd.min.js* src/lib/
rm -f tsconfig.tsbuildinfo
./node_modules/.bin/tsc --removeComments || true

# rubyいらず、tscも行われて最新のjqueryが入るが、
# *.tsと*.mapがZIPに入ってしまうのでbuild.rbの方が良い
#./node_modules/.bin/crx pack src -p src.pem \
#		      --zip-output `basename $PWD`.zip

gem install --user-install crxmake
./build.rb
