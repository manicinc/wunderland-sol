import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const sourceRoot = path.resolve(path.dirname(__filename), '../../../..');

const resolvePromptDirectory = () => {
  const envOverride = process.env.PROMPTS_DIRECTORY ? path.resolve(process.env.PROMPTS_DIRECTORY) : null;
  const candidates = [
    envOverride,
    path.join(sourceRoot, 'prompts'),
    path.join(sourceRoot, '..', 'prompts'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate && fsSync.existsSync(candidate) && fsSync.statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch (error) {
      // Ignore filesystem errors for this candidate and try the next fallback.
    }
  }

  // Fall back to the first candidate, even if it does not currently exist, so
  // downstream error messages remain deterministic.
  return candidates[0] ?? path.join(sourceRoot, 'prompts');
};

const PROMPT_DIR = resolvePromptDirectory();

export async function GET(req, res) {
  try {
    const { filename } = req.params;

    if (!filename || !filename.endsWith('.md')) {
      res.status(400).json({ message: 'Filename must be a .md file.' });
      return;
    }

    const absolutePath = path.normalize(path.join(PROMPT_DIR, filename));

    if (!absolutePath.startsWith(PROMPT_DIR)) {
      res.status(400).json({ message: 'Invalid filename.' });
      return;
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    res.status(200).type('text/markdown').send(content);
  } catch (error) {
    console.error('PromptRoutes: Failed to serve markdown file:', error?.message ?? error);
    res.status(404).json({
      message: 'Prompt file not found.',
      error: error?.message ?? 'Unknown error',
      resolvedPath: PROMPT_DIR,
    });
  }
}
