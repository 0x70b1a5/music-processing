import * as fs from 'fs';
import * as path from 'path';

function isDescriptionFile(filename: string): boolean {
    return filename.endsWith('.description');
}

function hasTimestamps(filepath: string): boolean {
    const timestampPattern = /\d{2}:\d{2}/;
    const content = fs.readFileSync(filepath, 'utf-8');
    return timestampPattern.test(content);
}

function main(inputDir: string): void {
    const files = fs.readdirSync(inputDir);
    
    for (const filename of files) {
        if (isDescriptionFile(filename)) {
            const filepath = path.join(inputDir, filename);
            if (!hasTimestamps(filepath)) {
                console.log(`No timestamps found in file: ${filename}`);
            }
        }
    }
}

if (require.main === module) {
    const baseDir = process.cwd();
    main(baseDir);
}