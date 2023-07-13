// @ts-check

import { readFile, readdir, mkdir, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Array of directories to calculate inside ./src/content.
 * > Note: Leave it empty to calculate all directories
 * @type {string[]}
 */
const DIRECTORIES = [
  'learn',
  'reference',
  // 'blog',
  // 'community',
  // 'warnings',
];
const BASE_PATH = path.join(process.cwd(), 'src', 'content');
const ARABIC_REGEX = /[\u0600-\u06FF]/;
/** @type {Stats[]} */
const ALL_FILES = [];

main().catch((error) => {
  console.error('An error occurred:', error);
});

/**
 * Main function that calculates statistics for directories and generates output files.
 */
async function main() {
  if (!DIRECTORIES.length) {
    await calculateDirectory('', BASE_PATH, 'ALL_FILES');
  } else {
    for await (const dir of DIRECTORIES) {
      await calculateDirectory(dir, path.join(BASE_PATH, dir), dir);
    }
  }

  const outputFile = formatFile('ALL_FILES', ALL_FILES);
  await mkdir(path.join(process.cwd(), 'stats'), { recursive: true });
  await writeFile(
    path.join(process.cwd(), 'stats', `ALL_FILES.md`),
    outputFile,
    'utf8'
  );
  console.log('Done: ALL_FILES');
}

/**
 * Calculates statistics for a directory recursively.
 * @param {string} dir - Directory name.
 * @param {string} dirPath - Directory path.
 * @param {string} outFileName - Output file name.
 */
async function calculateDirectory(dir, dirPath, outFileName) {
  /** @type {Stats[]} */
  const FILES = [];

  const filesOrDirs = await readdir(dirPath, { withFileTypes: true });

  for (const fileOrDir of filesOrDirs) {
    if (fileOrDir.isDirectory()) {
      const subDir = fileOrDir.name;
      await calculateDirectory(
        subDir,
        path.join(dirPath, subDir),
        dir ? `${outFileName}_${subDir}` : subDir
      );
    } else {
      const file = fileOrDir.name;
      const fileContent = await readFile(path.join(dirPath, file), 'utf8');
      const isArabic = ARABIC_REGEX.test(fileContent);

      /** @type {Stats} */
      const doc = {
        name: file,
        isTranslated: isArabic,
        lines: fileContent.split('\n').length,
        words: fileContent.split(' ').length,
        characters: fileContent.length,
      };

      FILES.push(doc);
      ALL_FILES.push(doc);
    }
  }

  if (!FILES.length || !dir) return;

  const outputFile = formatFile(dir, FILES);
  await mkdir(path.join(process.cwd(), 'stats'), { recursive: true });
  await writeFile(
    path.join(process.cwd(), 'stats', `${outFileName.replace('/', '_')}.md`),
    outputFile,
    'utf8'
  );

  console.log(`Done: ${outFileName}`);
}

/**
 * Formats the output file content based on the directory and files statistics.
 * @param {string} dir - Directory name.
 * @param {Stats[]} files - Array of file statistics.
 * @returns {string} - Formatted output file content.
 */
function formatFile(dir, files) {
  const untranslatedFiles = files.filter((file) => !file.isTranslated);
  const translatedFiles = files.filter((file) => file.isTranslated);

  const untranslatedTable = createTable(untranslatedFiles);
  const translatedTable = createTable(translatedFiles);

  return [
    `# ${dir}`,
    `| Total Files | ${files.length} |`,
    '| ----------- | -------------- |',
    `| Untranslated Files | ${untranslatedFiles.length} |`,
    `| Translated Files | ${translatedFiles.length} |`,
    '',
    '## Untranslated:',
    `${untranslatedTable}`,
    '',
    '## Translated:',
    `${translatedTable}`,
  ].join('\n');
}

/**
 * Creates a table from file statistics.
 * @param {Stats[]} files - Array of file statistics.
 * @returns {string} - Formatted table.
 */
function createTable(files) {
  if (files.length === 0) {
    return "There's no files here.";
  }

  const sortedFiles = files.sort((a, b) => a.lines - b.lines);
  const tableRows = sortedFiles
    .map(
      (file, index) =>
        `| ${index + 1} | ${file.name} | ${file.lines} | ${file.words} | ${file.characters} | ${
          file.isTranslated ? '[x]' : '[ ]'
        } |`
    )
    .join('\n');

  return `| Idx | File | Lines | Words | Characters | isTranslated |
| --- | ---- | ----- | ----- | ---------- | ------------ |
${tableRows}
`;
}

/**
 * @typedef {{name: string, isTranslated: boolean, lines: number, words: number, characters: number}} Stats
 */
