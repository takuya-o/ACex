// npx esbuild src/botservice.ts --bundle --outfile=out.js --platform=node --format=esm --packages=external

import { analyzeMetafile, build } from 'esbuild';

const result = await build({
  bundle: true,
  charset: 'utf8',
  entryPoints: ['./src/ACex.ts', './src/AirSearchExtender.ts', './src/PlayerExtender.ts', './src/Background.ts', './src/ReleaseNote.ts', './src/CountGraph.ts', './src/CourseList.ts', './src/CountResult.ts', './src/Popup.ts', './src/Options.ts' ],
  format: 'esm',
  metafile: true,
  minify: false,
  outbase: './src', // outbaseを指定することで指定したディレクトリの構造が出力先ディレクトリに反映されるようになる,
  outdir: './src/out/',
  //platform: 'node', // 'browser'=default 'node'  'neutral' のいずれかを指定,
  //packages: 'external',
  sourcemap: true,
  tsconfigRaw: '{"compilerOptions":{"removeComments": true, "incremental": false}}',
});

console.log(await analyzeMetafile(result.metafile, {
  //verbose: true,
}))
