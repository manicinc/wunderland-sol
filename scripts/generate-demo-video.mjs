#!/usr/bin/env node

/**
 * WUNDERLAND Demo Video Generator
 *
 * Programmatic demo video: Playwright records the live site while
 * ElevenLabs narrates each flow. ffmpeg composites the final MP4.
 *
 * 100% agent-generated. No human touched the recording, narration, or edit.
 *
 * Usage: node scripts/generate-demo-video.mjs
 *
 * Prerequisites:
 *   - ffmpeg + ffprobe on PATH
 *   - npx playwright install chromium
 *   - ElevenLabs API key (hardcoded below)
 */

import { writeFile, mkdir, readdir, unlink, readFile } from 'fs/promises';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIG
// ============================================================================

const ELEVENLABS_API_KEY = 'sk_03a7a357da9c9147f7b5e2e01180007c2f92891ccffbcf9e';
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

const VOICE = {
  id: 'TxGEqnHWrfWFTfGW9XjX',
  name: 'Josh',
  settings: { stability: 0.30, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true },
};

const OUTPUT_DIR = join(__dirname, 'demo-output');
const VIDEO_DIR = join(OUTPUT_DIR, 'videos');
const AUDIO_DIR = join(OUTPUT_DIR, 'audio');
const FINAL_OUTPUT = join(OUTPUT_DIR, 'demo-final.mp4');
const NARRATION_PATH = join(__dirname, 'demo-narration.json');

const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;

// ============================================================================
// TTS GENERATION (reused from generate-podcast.mjs)
// ============================================================================

async function generateTTS(text, outputPath) {
  const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: VOICE.settings,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`ElevenLabs error (${response.status}): ${JSON.stringify(err)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
  return buffer.length;
}

function normalizeAudio(inputPath) {
  const normalizedPath = inputPath.replace('.mp3', '-norm.mp3');
  execSync(
    `ffmpeg -y -i "${inputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 "${normalizedPath}"`,
    { stdio: 'pipe' }
  );
  execSync(`mv "${normalizedPath}" "${inputPath}"`, { stdio: 'pipe' });
}

function getAudioDuration(filePath) {
  const output = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    { encoding: 'utf-8' }
  ).trim();
  return parseFloat(output);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// BROWSER ACTIONS
// ============================================================================

async function executeAction(page, action) {
  switch (action.type) {
    case 'wait':
      await sleep(action.ms || 1000);
      break;

    case 'scroll':
      await page.evaluate(async (pixels) => {
        const duration = 2000;
        const start = window.scrollY;
        const end = start + pixels;
        const startTime = performance.now();
        await new Promise(resolve => {
          function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            window.scrollTo(0, start + (end - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      }, action.pixels || 500);
      break;

    case 'scrollToTop':
      await page.evaluate(async () => {
        const duration = 1500;
        const start = window.scrollY;
        const startTime = performance.now();
        await new Promise(resolve => {
          function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            window.scrollTo(0, start * (1 - eased));
            if (progress < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      });
      break;

    case 'scrollToSelector':
      try {
        const selectors = action.selector.split(',').map(s => s.trim());
        let found = false;
        for (const sel of selectors) {
          const el = await page.$(sel);
          if (el) {
            await el.scrollIntoViewIfNeeded();
            found = true;
            break;
          }
        }
        if (!found && action.fallbackPixels) {
          await executeAction(page, { type: 'scroll', pixels: action.fallbackPixels });
        }
      } catch {
        if (action.fallbackPixels) {
          await executeAction(page, { type: 'scroll', pixels: action.fallbackPixels });
        }
      }
      break;

    case 'click':
      try {
        await page.click(action.selector, { timeout: 3000 });
      } catch {
        if (!action.fallback) console.warn(`  Click failed: ${action.selector}`);
      }
      break;

    case 'hover':
      try {
        if (action.position) {
          await page.mouse.move(action.position.x, action.position.y);
        } else {
          await page.hover(action.selector, { timeout: 3000 });
        }
      } catch {
        console.warn(`  Hover failed: ${action.selector || 'position'}`);
      }
      break;

    default:
      console.warn(`  Unknown action type: ${action.type}`);
  }
}

// ============================================================================
// VIDEO SEGMENT RECORDING
// ============================================================================

async function recordSegment(browser, segment, index) {
  const context = await browser.newContext({
    viewport: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    },
    colorScheme: 'dark',
  });

  const page = await context.newPage();

  console.log(`  Navigating to ${segment.url}...`);
  await page.goto(segment.url, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1000);

  for (const action of segment.actions) {
    await executeAction(page, action);
  }

  await page.close();
  await context.close();

  // Playwright saves video to VIDEO_DIR with auto-generated name
  // Find the most recently created file
  const files = await readdir(VIDEO_DIR);
  const webmFiles = files
    .filter(f => f.endsWith('.webm'))
    .map(f => ({
      name: f,
      path: join(VIDEO_DIR, f),
      mtime: existsSync(join(VIDEO_DIR, f)) ? execSync(`stat -f %m "${join(VIDEO_DIR, f)}"`, { encoding: 'utf-8' }).trim() : '0',
    }))
    .sort((a, b) => Number(b.mtime) - Number(a.mtime));

  if (webmFiles.length === 0) {
    throw new Error(`No WebM video found for segment ${index}`);
  }

  const latestWebm = webmFiles[0].path;
  const targetPath = join(VIDEO_DIR, `segment-${String(index).padStart(2, '0')}.webm`);
  execSync(`mv "${latestWebm}" "${targetPath}"`, { stdio: 'pipe' });

  return targetPath;
}

// ============================================================================
// FFMPEG COMPOSITION
// ============================================================================

function convertWebmToMp4(webmPath, mp4Path) {
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "${mp4Path}"`,
    { stdio: 'pipe' }
  );
}

function createTitleCard(outputPath, mainText, subText, duration = 3) {
  const mainEsc = mainText.replace(/'/g, "\\'");
  const subEsc = subText.replace(/'/g, "\\'");
  execSync(
    `ffmpeg -y -f lavfi -i color=c=black:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=${duration}:r=30 ` +
    `-vf "drawtext=text='${mainEsc}':fontsize=72:fontcolor=cyan:x=(w-text_w)/2:y=(h-text_h)/2-40,` +
    `drawtext=text='${subEsc}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+40" ` +
    `-c:v libx264 -pix_fmt yuv420p "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

function concatFiles(listPath, outputPath, type = 'video') {
  if (type === 'video') {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`,
      { stdio: 'pipe' }
    );
  } else {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`,
      { stdio: 'pipe' }
    );
  }
}

function overlayAudioOnVideo(videoPath, audioPath, outputPath) {
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v -map 1:a -shortest "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== WUNDERLAND Demo Video Generator ===');
  console.log('100% agent-generated. No human involvement.\n');

  // 1. Load narration script
  const narrationRaw = await readFile(NARRATION_PATH, 'utf-8');
  const { segments } = JSON.parse(narrationRaw);
  console.log(`Loaded ${segments.length} segments from narration script\n`);

  // 2. Calculate TTS cost
  const totalChars = segments.reduce((sum, s) => sum + s.narration.length, 0);
  const estimatedCost = (totalChars / 1000) * 0.30;
  console.log(`Total narration: ${totalChars.toLocaleString()} characters`);
  console.log(`Estimated TTS cost: $${estimatedCost.toFixed(2)}\n`);

  // 3. Prepare output directories
  for (const dir of [OUTPUT_DIR, VIDEO_DIR, AUDIO_DIR]) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }

  // Clean previous outputs
  for (const dir of [VIDEO_DIR, AUDIO_DIR]) {
    const existing = await readdir(dir);
    for (const f of existing) {
      await unlink(join(dir, f));
    }
  }

  // 4. Launch browser
  console.log('Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log('Browser ready\n');

  const videoSegmentPaths = [];
  const audioSegmentPaths = [];

  // 5. Record each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    console.log(`\n[${i + 1}/${segments.length}] Segment: ${segment.id}`);
    console.log(`  URL: ${segment.url}`);
    console.log(`  Duration target: ${segment.duration}s`);

    // Record video
    console.log('  Recording browser...');
    const videoPath = await recordSegment(browser, segment, i);
    videoSegmentPaths.push(videoPath);
    console.log(`  Video saved: ${videoPath}`);

    // Generate TTS audio
    const audioPath = join(AUDIO_DIR, `segment-${String(i).padStart(2, '0')}.mp3`);
    console.log(`  Generating TTS (${segment.narration.length} chars)...`);
    try {
      const bytes = await generateTTS(segment.narration, audioPath);
      normalizeAudio(audioPath);
      console.log(`  Audio: ${(bytes / 1024).toFixed(1)} KB (normalized)`);
      audioSegmentPaths.push(audioPath);
    } catch (err) {
      console.error(`  TTS FAILED: ${err.message}`);
      console.log('  Retrying in 3s...');
      await sleep(3000);
      try {
        const bytes = await generateTTS(segment.narration, audioPath);
        normalizeAudio(audioPath);
        console.log(`  Retry OK: ${(bytes / 1024).toFixed(1)} KB`);
        audioSegmentPaths.push(audioPath);
      } catch (retryErr) {
        console.error(`  Retry FAILED: ${retryErr.message}`);
        process.exit(1);
      }
    }

    // Rate limit delay
    if (i < segments.length - 1) await sleep(500);
  }

  await browser.close();
  console.log('\n\nBrowser closed. All segments recorded.\n');

  // 6. Convert WebM segments to MP4
  console.log('Converting video segments to MP4...');
  const mp4Paths = [];
  for (let i = 0; i < videoSegmentPaths.length; i++) {
    const webmPath = videoSegmentPaths[i];
    const mp4Path = webmPath.replace('.webm', '.mp4');
    convertWebmToMp4(webmPath, mp4Path);
    mp4Paths.push(mp4Path);
    console.log(`  [${i + 1}] ${mp4Path}`);
  }

  // 7. Create intro and outro cards
  console.log('\nCreating title cards...');
  const introPath = join(OUTPUT_DIR, 'intro.mp4');
  const outroPath = join(OUTPUT_DIR, 'outro.mp4');
  createTitleCard(introPath, 'WUNDERLAND', 'Agent Demo on Solana Devnet', 3);
  createTitleCard(outroPath, 'wunderland.sh', 'Built 100% by AI Agents | @rabbitholewld', 3);
  console.log('  Intro + Outro created');

  // 8. Concat all video segments (intro + segments + outro)
  console.log('\nConcatenating video...');
  const videoConcatList = join(OUTPUT_DIR, 'video-concat.txt');
  const allVideoParts = [introPath, ...mp4Paths, outroPath];
  const videoConcatContent = allVideoParts.map(f => `file '${f}'`).join('\n');
  await writeFile(videoConcatList, videoConcatContent);
  const rawVideoPath = join(OUTPUT_DIR, 'raw-video.mp4');
  concatFiles(videoConcatList, rawVideoPath);
  console.log('  Video concatenated');

  // 9. Concat all audio segments (with silence for intro/outro)
  console.log('Concatenating audio...');

  // Generate 3s silence for intro and outro
  const silencePath = join(AUDIO_DIR, 'silence-3s.mp3');
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 3 -c:a libmp3lame "${silencePath}"`,
    { stdio: 'pipe' }
  );

  const audioConcatList = join(OUTPUT_DIR, 'audio-concat.txt');
  const allAudioParts = [silencePath, ...audioSegmentPaths, silencePath];
  const audioConcatContent = allAudioParts.map(f => `file '${f}'`).join('\n');
  await writeFile(audioConcatList, audioConcatContent);
  const rawAudioPath = join(OUTPUT_DIR, 'raw-audio.mp3');
  concatFiles(audioConcatList, rawAudioPath, 'audio');
  console.log('  Audio concatenated');

  // 10. Final composition: overlay audio on video
  console.log('\nFinal composition...');
  overlayAudioOnVideo(rawVideoPath, rawAudioPath, FINAL_OUTPUT);
  console.log('  Composition complete');

  // 11. Report
  const finalDuration = getAudioDuration(FINAL_OUTPUT);
  const minutes = Math.floor(finalDuration / 60);
  const seconds = Math.floor(finalDuration % 60);

  console.log('\n=== DONE ===');
  console.log(`Output:     ${FINAL_OUTPUT}`);
  console.log(`Duration:   ${minutes}m ${seconds}s`);
  console.log(`Resolution: ${VIDEO_WIDTH}x${VIDEO_HEIGHT}`);
  console.log(`Narration:  ${totalChars.toLocaleString()} chars`);
  console.log(`TTS Cost:   ~$${estimatedCost.toFixed(2)}`);
  console.log(`Segments:   ${segments.length}`);
  console.log('\nNext steps:');
  console.log('  1. Review: open demo-output/demo-final.mp4');
  console.log('  2. Upload to YouTube or Loom');
  console.log('  3. Update Colosseum: PUT /my-project with presentationLink');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
