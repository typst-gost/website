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
    
    const text = innerContent
      .replace(/<[^>]+>/g, '')
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
