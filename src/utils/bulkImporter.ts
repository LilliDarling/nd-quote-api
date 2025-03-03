import dotenv from 'dotenv';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import mongoose from 'mongoose';
import Quote from '../models/Quotes';
import path from 'path';

dotenv.config();

/**
 * Import quotes from a CSV file
 * CSV format should be: text,author,source,tags (comma separated tags)
 * Example: "My brain isn't broken, it's just different.","Sarah Caudwell","Book Title","autism,neurodiversity,acceptance"
 */
async function importFromCSV(filePath: string, skipDuplicates: boolean = true): Promise<{
  added: number;
  skipped: number;
  errors: string[];
}> {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB for import');

    const absolutePath = path.resolve(filePath);
    const fileStream = createReadStream(absolutePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for await (const line of rl) {
      lineNumber++;

      if (lineNumber === 1 && line.toLowerCase().includes('text') && line.toLowerCase().includes('author')) {
        continue;
      }

      try {
        const columns = parseCSVLine(line);
        
        if (columns.length < 2) {
          errors.push(`Line ${lineNumber}: Not enough columns`);
          continue;
        }

        const [text, author, source, tagsString] = columns;
        const tags = tagsString?.split(',').map(tag => tag.trim()).filter(Boolean) || [];

        if (!text.trim() || !author.trim()) {
          errors.push(`Line ${lineNumber}: Missing required fields`);
          continue;
        }

        if (skipDuplicates) {
          const existingQuote = await Quote.findOne({ 
            text: { $regex: new RegExp('^' + escapeRegExp(text.trim()) + '$', 'i') }
          });

          if (existingQuote) {
            console.log(`Skipping duplicate: "${text.substring(0, 30)}..."`);
            skipped++;
            continue;
          }
        }

        await Quote.create({
          text: text.trim(),
          author: author.trim(),
          source: source?.trim() || undefined,
          tags,
          isPublished: true
        });

        added++;
        console.log(`Added: "${text.substring(0, 30)}..."`);
      } catch (error) {
        console.error(`Error processing line ${lineNumber}:`, error);
        errors.push(`Line ${lineNumber}: ${(error as Error).message}`);
      }
    }

    console.log(`Import completed: ${added} quotes added, ${skipped} duplicates skipped, ${errors.length} errors`);
    return { added, skipped, errors };
  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

/**
 * Parse a CSV line, handling quoted fields correctly
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      
      inQuotes = !inQuotes;
      continue;
    }
    
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  
  return result;
}

/**
 * Escape special regex characters for safe regex creation
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: ts-node bulkImporter.ts <csv-file-path> [--allow-duplicates]');
    process.exit(1);
  }
  
  const filePath = args[0];
  const allowDuplicates = args.includes('--allow-duplicates');
  
  importFromCSV(filePath, !allowDuplicates)
    .then(result => {
      console.log('Import statistics:');
      console.log(`- Added: ${result.added}`);
      console.log(`- Skipped: ${result.skipped}`);
      console.log(`- Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(error => console.log(`- ${error}`));
      }
      
      process.exit(0);
    })
    .catch(err => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}

export default importFromCSV;