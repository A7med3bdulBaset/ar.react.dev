// @ts-check

import {readFile, readdir, mkdir, writeFile} from 'fs/promises';
import path from 'path';

/**
 * Array of directories to calc inside ./src/cotent.
 * > Note: Leave it empty to calc all directories
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

async function main() {
  
  if (!DIRECTORIES.length) {
    await calcDirectory('', BASE_PATH, 'ALL_FILES');
  } else {
    for await (const DIR of DIRECTORIES) {
      await calcDirectory(DIR, path.join(BASE_PATH, DIR), DIR);
    }
  }

  const outputFile = formatFile('ALL_FILES', ALL_FILES);
  await mkdir(path.join(process.cwd(), 'stats'), {recursive: true});
  await writeFile(
    path.join(process.cwd(), 'stats', `ALL_FILES.md`),
    outputFile,
    'utf8'
  );

  console.log(`Done: ALL_FILES`);
}

/**
 * @param {string} dir
 * @param {string} dirPath
 * @param {string} outFileName
 */
async function calcDirectory(dir, dirPath, outFileName) {
  /** @type {Stats[]} */
  const FILES = [];

  const filesOrDirs = await readdir(dirPath, {withFileTypes: true});

  for (const fileOrDir of filesOrDirs) {
    if (fileOrDir.isDirectory()) {
      const directory = fileOrDir.name;
      await calcDirectory(
        directory,
        path.join(dirPath, directory),
        dir ? `${outFileName}_${directory}` : directory
      );
    } else {
      const file = fileOrDir.name;

      const fileContent = await readFile(path.join(dirPath, file), 'utf8');
      const isArabic = fileContent.search(ARABIC_REGEX) !== -1;

      /** @type {Stats} */
      const doc = {
        name: file,
        isTranslated: isArabic,
        lines: fileContent.split('\n').length,
        words: fileContent.split(' ').length,
        characters: fileContent.length,
      };

      [FILES, ALL_FILES].forEach((arr) => arr.push(doc));
    }
  }

  if (!FILES.length || !dir) return;
  const outputFile = formatFile(dir, FILES);
  await mkdir(path.join(process.cwd(), 'stats'), {recursive: true});
  await writeFile(
    path.join(process.cwd(), 'stats', `${outFileName.replace('/', '_')}.md`),
    outputFile,
    'utf8'
  );

  console.log(`Done: ${outFileName}`);
}

/**
 * @param {string} dir
 * @param {Stats[]} files
 * @returns {string}
 **/
function formatFile(dir, files) {
  const untranslatedFiles = files.filter((f) => !f.isTranslated);
  const translatedFiles = files.filter((f) => f.isTranslated);

  const untranslatedTable = createTable(untranslatedFiles);
  const translatedTable = createTable(translatedFiles);

  return `# ${dir}
| Total Files | ${files.length} |
| ----------- | -------------- |
| Untranslated Files | ${untranslatedFiles.length} |
| Translated Files | ${translatedFiles.length} |

## Untranslated:
${untranslatedTable}

## Translated:
${translatedTable}
`
}

/**
 * @param {Stats[]} files
 */
function createTable(files) {
  if (files.length === 0) {
    return "There's no files here.";
  }

  const sortedFiles = files.sort((a, b) => a.lines - b.lines);
  const tableRows = sortedFiles
    .map((f, i) => `| ${i + 1} | ${f.name} | ${f.lines} | ${f.words} | ${f.characters} | ${f.isTranslated ? '[x]' : '[ ]'} |`)
    .join('\n');

  return `| Idx | File | Lines | Words | Characters | isTranslated |
| --- | ---- | ----- | ----- | ---------- | ------------ |
${tableRows}
`;
}

/**
 * @typedef {{name: string, isTranslated: boolean, lines: number, words: number, characters: number}} Stats
 */
