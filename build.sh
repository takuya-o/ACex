#!/bin/sh
# -*- coding: utf-8-unix -*-

npm install
cp -p node_modules/jquery/dist/jquery.min.js node_modules/jspdf/dist/jspdf.min.js src/lib/
./node_modules/.bin/tsc

# rubyいらず、tscも行われて最新のjqueryが入るが、
# *.tsと*.mapがZIPに入ってしまうのでbuild.rbの方が良い
#./node_modules/.bin/crx pack src -p src.pem \
#		      --zip-output `basename $PWD`.zip

gem install --user-install crxmake
./build.rb

