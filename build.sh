#!/bin/sh
# -*- coding: utf-8-unix -*-
[ "$TRACE" ] && set -x
set -eu

#npm default cache is ~/.npm but CI not have $HOME
#https://gitlab-docs.creationline.com/ee/ci/caching/#caching-nodejs-dependencies
NPM_OPT=${NPM_OPT:---cache .npm --prefer-offline --legacy-peer-deps}
CI_PROJECT_NAME=${CI_PROJECT_NAME:-$(basename $PWD)}

if [ -f src.pem ];then
  # src.pemがあれば正式ビルド
  TSC_OPT=${TSC_OPT:-"--removeComments --incremental false"}  # コメント消す 完全ビルド
  CRX_OPT=${CRX_OPT:-"-p src.pem"}      # 鍵ファイルを使う
fi

#rm -f src/lib/*.js
rm -f src/lib/*.map

if [ -x ./node_modules/.bin/npm ];then
  ./node_modules/.bin/npm install $NPM_OPT
else
  npm install $NPM_OPT
fi
./node_modules/.bin/npm update $NPM_OPT || true
./node_modules/.bin/npm audit fix $NPM_OPT || true # workaround
./node_modules/.bin/npm fund $NPM_OPT
#cp -p node_modules/jquery/dist/jquery.min.* src/lib/
[ -f node_modules/jspdf/dist/jspdf.es.min.js ] && cp -p node_modules/jspdf/dist/jspdf.es.min.js* src/lib/
# rm -f tsconfig.tsbuildinfo # tsc --incremental false があれば消す必要は無い
./node_modules/.bin/tsc -noEmit ${TSC_OPT:-} #|| true # workaround

npx rimraf src/out
node esbuild.config.js #tscもやってくれるけど TSC_OPTの渡し方があやしい

# rubyいらず .tsなども入らなくなりzipにkey.pemが無いけど問題なし
(cd src;zip -r -X - . -x@../.crxignore)|\
 ./node_modules/.bin/crx3 ${CRX_OPT:-} -o ${CI_PROJECT_NAME}.crx -z ${CI_PROJECT_NAME}.zip && rm ${CI_PROJECT_NAME}.crx

gem install --user-install --no-document crxmake  #ruby-rdocパッケージいれず-no-..
if [ -f src.pem ];then
  # src.pemがあれば正式ビルド
  ./build.rb
else
  crxmake --pack-extension="src" --zip-output="${CI_PROJECT_NAME}-crxmake.zip" \
  --key-output=src-tmp.pem  \
  --ignore-file="/(\.swp|.*~)/" --ignore-dir="/\.(?:svn|git|cvs)/" --verbose
  #DEBUG用に .tsと.map 含めておく
fi
