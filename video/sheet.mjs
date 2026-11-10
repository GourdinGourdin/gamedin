// Contact sheet of stills for review: node sheet.mjs t1,t2,... -> out/sheet.jpg
import ffmpegPath from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
const ts = process.argv[2].split(','), cols = Math.min(5, ts.length), rows = Math.ceil(ts.length / cols);
const args = ['-y', '-loglevel', 'error', ...ts.flatMap((t) => ['-i', `out/still-${t}.png`]), '-filter_complex',
  `${ts.map((_, i) => `[${i}:v]scale=360:640[s${i}]`).join(';')};${ts.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${ts.length}:layout=${ts.map((_, i) => `${(i % cols) * 364}_${Math.floor(i / cols) * 644}`).join('|')}:fill=gray[o]`,
  '-map', '[o]', '-frames:v', '1', '-q:v', '3', process.argv[3] ?? 'out/sheet.jpg'];
const r = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
