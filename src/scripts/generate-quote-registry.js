import fs from 'fs';
import path from 'path';

console.log('📚 Generating quotes registry...\n');

const quotes = [];
const contentDir = 'content/docs/';

if (!fs.existsSync(contentDir)) {
  console.log('⚠️  Content directory not found, skipping quote generation\n');
  process.exit(0);
}

function findMdxFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return findMdxFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.mdx') ? [entryPath] : [];
  });
}

function stripHtmlFromQuote(innerContent) {
  const rawBlockTags = new Set(['script', 'style', 'textarea', 'title', 'iframe', 'noscript']);
  let output = '';
  let i = 0;
  let rawBlockTag = null;

  while (i < innerContent.length) {
    if (rawBlockTag) {
      const closingTag = `</${rawBlockTag}`;
      const closeIndex = innerContent.toLowerCase().indexOf(closingTag, i);

      if (closeIndex === -1) {
        break;
      }

      i = closeIndex;
      rawBlockTag = null;
      continue;
    }

    const char = innerContent[i];

    if (char !== '<') {
      output += char;
      i++;
      continue;
    }

    if (innerContent.startsWith('<!--', i)) {
      const endIndex = innerContent.indexOf('-->', i + 4);
      i = endIndex === -1 ? innerContent.length : endIndex + 3;
      continue;
    }

    if (/^<\s*(?:https?:\/\/|mailto:|tel:)/i.test(innerContent.slice(i))) {
      output += char;
      i++;
      continue;
    }

    const tagMatch = innerContent.slice(i).match(/^<\/?\s*([A-Za-z][A-Za-z0-9:-]*)\b/);
    if (!tagMatch) {
      output += char;
      i++;
      continue;
    }

    const tagName = tagMatch[1].toLowerCase();
    let j = i + tagMatch[0].length;
    let quote = null;

    while (j < innerContent.length) {
      const current = innerContent[j];

      if (quote) {
        if (current === quote) {
          quote = null;
        } else if (current === '\\') {
          j++;
        }
      } else if (current === '"' || current === "'") {
        quote = current;
      } else if (current === '>') {
        j++;
        break;
      }

      j++;
    }

    if (!innerContent.startsWith('</', i) && rawBlockTags.has(tagName)) {
      rawBlockTag = tagName;
    }

    i = j;
  }

  return output;
}

const mdxFiles = findMdxFiles(contentDir);

console.log(`✨ Found ${mdxFiles.length} MDX files\n`);

if (mdxFiles.length === 0) {
  console.log('⚠️  No MDX files found\n');
}

let processedFiles = 0;

mdxFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const pagePath = '/' + filePath
    .replace(`${contentDir}`, 'docs/')
    .replace('.mdx', '')
    .replace(/\/index$/, '');

  const componentRegex = /<GostQuote([^>]*?)>([\s\S]*?)<\/GostQuote>/g;
  let match;
  let fileQuotes = 0;

  while ((match = componentRegex.exec(content)) !== null) {
    const propsString = match[1];
    const innerContent = match[2];
    
    const matchPosition = match.index;
    const lineNumber = content.substring(0, matchPosition).split('\n').length;
    
    const idMatch = propsString.match(/id=(?:["']([^"']+)["']|\{["']?([^}"']+)["']?\})/);
    const pageMatch = propsString.match(/page=\{(\d+)\}/);
    
    if (!idMatch || !pageMatch) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.warn(`  ⚠️  Skipping malformed quote at ${relativePath}:${lineNumber}:1`);
      continue;
    }
    
    const id = idMatch ? (idMatch[1] || idMatch[2]) : null;
    const page = parseInt(pageMatch[1]);
    
    const text = stripHtmlFromQuote(innerContent)
      .replace(/\n\s+/g, ' ')
      .trim();

    quotes.push({
      id,
      text,
      mdx: innerContent.trim(),
      page,
      pagePath
    });
    
    fileQuotes++;
  }

  if (fileQuotes > 0) {
    processedFiles++;
    console.log(`  ✓ ${path.relative(process.cwd(), filePath)}: ${fileQuotes} quote${fileQuotes > 1 ? 's' : ''}`);
  }
});

console.log();

const libDir = 'src/lib';
if (!fs.existsSync(libDir)) {
  console.log('⚠️  Library directory not found');
  process.exit(0);
}

const output = `// Auto-generated file. Do not edit manually.
// Generated at: ${new Date().toISOString()}

export interface QuoteMetadata {
  id: string;
  text: string;
  mdx: string;
  page: number;
  pagePath: string;
}

export const quotesRegistry: QuoteMetadata[] = ${JSON.stringify(quotes, null, 2)};

export const quotesMap = new Map(
  quotesRegistry.map(quote => [quote.id, quote])
);
`;

const outputPath = path.join(libDir, 'quotes-registry.ts');
fs.writeFileSync(outputPath, output);

console.log(`✨ Generated ${quotes.length} quote${quotes.length !== 1 ? 's' : ''} from ${processedFiles} file${processedFiles !== 1 ? 's' : ''}`);
console.log(`📝 Registry saved to ${outputPath}\n`);
