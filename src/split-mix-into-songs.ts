import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

interface Timestamp {
  start: string;
  artist: string;
  title: string;
}

function readDescriptionFile(filepath: string): string[] {
  return fs.readFileSync(filepath, 'utf8').split('\n');
}

function extractTimestamps(lines: string[]): Timestamp[] {
  const rangePattern = /(\d\d?:\d\d?:?\d?\d?)\s*-\s*\d\d?:\d\d?:?\d?\d?\s+(.+?)\s+-\s+(.+)/;
  const timestampPattern = /(\d\d?:\d\d?:?\d?\d?)\s+(.+)/;
  const timestamps: Timestamp[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    let match = rangePattern.exec(trimmedLine);
    if (match) {
      timestamps.push({
        start: match[1],
        artist: match[2],
        title: match[3]
      });
    } else {
      match = timestampPattern.exec(trimmedLine);
      if (match) {
        const titlePart = match[2];
        const dashIndex = titlePart.lastIndexOf(' - ');
        
        if (dashIndex > 0) {
          timestamps.push({
            start: match[1],
            artist: titlePart.substring(0, dashIndex).trim(),
            title: titlePart.substring(dashIndex + 3).trim()
          });
        } else {
          timestamps.push({
            start: match[1],
            artist: '',
            title: titlePart.trim()
          });
        }
      }
    }
  }
  
  return timestamps;
}

function getAudioDuration(filepath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  let h = 0, m = 0, s = 0;
  
  if (parts.length === 2) {
    [m, s] = parts;
  } else {
    [h, m, s] = parts;
  }
  
  return Math.round(h * 3600 + m * 60 + s);
}

async function splitAudio(
  timestamps: Timestamp[],
  inputAudio: string,
  outputDir: string,
  doneDir: string,
  dryRun: boolean = false
): Promise<void> {
  const duration = await getAudioDuration(inputAudio);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < timestamps.length; i++) {
    const { start, artist, title } = timestamps[i];
    const cleanArtist = artist.replace(/[/\\]/g, '');
    const cleanTitle = title.replace(/[/\\]/g, '');
    const startSec = timeToSeconds(start);
    const endSec = i + 1 < timestamps.length 
      ? timeToSeconds(timestamps[i + 1].start) 
      : duration;

    const outputFile = path.join(outputDir, `${cleanArtist} - ${cleanTitle} (${i}).mp3`);
    
    if (fs.existsSync(outputFile)) {
      console.log(`!! [E] File already exists: ${outputFile}`);
    } else {
      if (dryRun) {
        console.log(`-- [I] Dry run: ffmpeg -i "${inputAudio}" -ss ${startSec} -t ${endSec - startSec} -c copy "${outputFile}"`);
      } else {
        try {
          await new Promise<void>((resolve, reject) => {
            ffmpeg(inputAudio)
              .seekInput(startSec)
              .duration(endSec - startSec)
              .audioCodec('copy')
              .output(outputFile)
              .on('end', () => resolve())
              .on('error', (err: any) => reject(err))
              .run();
          });
        } catch (error) {
          console.log(`!! [E] ffmpeg: ${error}`);
        }
      }
    }
  }
}

async function processDescriptionFiles(
  inputDir: string,
  outputDir: string,
  doneDir: string,
  dryRun: boolean = false
): Promise<void> {
  const descriptionFiles = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.description'))
    .sort();
  
  const totalFiles = descriptionFiles.length;

  for (let index = 0; index < descriptionFiles.length; index++) {
    const filename = descriptionFiles[index];
    
    try {
      console.log(`\n\n-- [I] Processing file ${index + 1}/${totalFiles}: ${filename}`);

      const filepath = path.join(inputDir, filename);
      const lines = readDescriptionFile(filepath);
      const timestamps = extractTimestamps(lines);
      const numSongs = timestamps.length;
      
      console.log(`-- [I] Found ${numSongs} songs.`);
      
      if (numSongs > 0) {
        const audioFilename = path.basename(filename, '.description') + '.mp3';
        const audioFilepath = path.join(inputDir, audioFilename);

        await splitAudio(timestamps, audioFilepath, outputDir, doneDir, dryRun);

        const descOut = path.join(doneDir, filename);
        const audioOut = path.join(doneDir, audioFilename);
        
        console.log(`-- [I] Moving file to ${descOut}`);
        console.log(`-- [I] Moving file to ${audioOut}`);
        
        if (dryRun) {
          console.log(`-- [I] Dry run: fs.rename(${filepath}, ${descOut})`);
          console.log(`-- [I] Dry run: fs.rename(${audioFilepath}, ${audioOut})`);
        } else {
          fs.renameSync(filepath, descOut);
          fs.renameSync(audioFilepath, audioOut);
        }
        
        console.log(`++ [D] Finished processing file ${index + 1}/${totalFiles}: ${filename}\n`);
      } else {
        console.log(`!! [E] No songs in description; skipping.`);
      }
    } catch (error) {
      console.log(`!! [E] Error processing file ${filename}: ${error}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  const baseDir = process.cwd();
  const inputDir = path.join(baseDir, 'mixes');
  const outputDir = path.join(baseDir, 'songs');
  const doneDir = path.join(baseDir, 'processed');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(doneDir)) {
    fs.mkdirSync(doneDir, { recursive: true });
  }
  
  console.log(`Running in ${dryRun ? 'dry-run' : 'live'} mode`);
  await processDescriptionFiles(inputDir, outputDir, doneDir, dryRun);
}

if (require.main === module) {
  main().catch(console.error);
}
