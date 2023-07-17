// npx esbuild src/botservice.ts --bundle --outfile=out.js --platform=node --format=esm --packages=external

import { build, analyzeMetafile } from 'esbuild';

let result = await build({
  entryPoints: ['./src/ACex.ts', './src/AirSearchExtender.ts', './src/PlayerExtender.ts', './src/Background.ts', './src/ReleaseNote.ts', './src/CountGraph.ts', './src/CourseList.ts', './src/CountResult.ts', './src/Popup.ts', './src/Options.ts' ],
  bundle: true,
  minify: false,
  sourcemap: true,
  //platform: 'node', // 'browser'=default 'node'  'neutral' のいずれかを指定,
  format: 'esm',
  //packages: 'external',
  outbase: './src', // outbaseを指定することで指定したディレクトリの構造が出力先ディレクトリに反映されるようになる,
  outdir: './src/out/',
  charset: 'utf8',
  tsconfigRaw: '{"compilerOptions":{"removeComments": true, "incremental": false}}',
  metafile: true,
});

console.log(await analyzeMetafile(result.metafile, {
  //verbose: true,
}))
