import os
import re
import ffmpeg
import shutil

def read_description_file(filepath):
    with open(filepath, 'r') as f:
        return f.readlines()

def extract_timestamps(lines):
    pattern = re.compile(r"(\d\d?:\d\d?:?\d?\d?)\s+(.+?)\s+-\s+(.+)")
    timestamps = []
    for line in lines:
        line = line.strip().lower()
        if not line:
            continue
        match = pattern.match(line)
        if match:
            timestamps.append((match.group(1), match.group(2), match.group(3)))
    return timestamps

def get_audio_duration(filepath):
    probe = ffmpeg.probe(filepath)
    return float(probe['streams'][0]['duration'])

def time_to_seconds(time_str):
    parts = list(map(int, time_str.split(':')))
    if len(parts) == 2:
        m, s = parts
        h = 0
    else:
        h, m, s = parts
    return round(h * 3600 + m * 60 + s)

def split_audio(timestamps, input_audio, output_dir, done_dir, dry_run=False):
    duration = get_audio_duration(input_audio)
    os.makedirs(output_dir, exist_ok=True)

    for i, (start, artist, title) in enumerate(timestamps):
        artist = artist.replace('/', '').replace('\\', '')
        title = title.replace('/', '').replace('\\', '')
        start_sec = time_to_seconds(start)
        end_sec = time_to_seconds(timestamps[i + 1][0]) if i + 1 < len(timestamps) else duration

        output_file = os.path.join(output_dir, f"{artist} - {title} ({i}).mp3")
        if (os.path.exists(output_file)):
            print(f"!! [E] File already exists: {output_file}")
        else: 
            command = (
                ffmpeg
                .input(input_audio, ss=start_sec, t=end_sec - start_sec)
                .output(output_file, codec='copy')
            )
            
            if dry_run:
                print("-- [I] Dry run:", command.compile())
            else:
                try:
                    command.run()
                except Exception as e:
                    print(f"!! [E] ffmpeg: {e}")

def process_description_files(input_dir, output_dir, done_dir, dry_run=False):
    description_files = [f for f in os.listdir(input_dir) if f.endswith(".description")]
    description_files.sort()
    total_files = len(description_files)

    for index, filename in enumerate(description_files):
        try:
            print(f"\n\n-- [I] Processing file {index + 1}/{total_files}: {filename}")

            filepath = os.path.join(input_dir, filename)
            lines = read_description_file(filepath)
            timestamps = extract_timestamps(lines)
            num_songs = len(timestamps)
            print(f"-- [I] Found {num_songs} songs.")
            if num_songs > 0:
                audio_filename = os.path.splitext(filename)[0] + ".mp3"
                audio_filepath = os.path.join(input_dir, audio_filename)

                split_audio(timestamps, audio_filepath, output_dir, done_dir, dry_run=dry_run)

                desc_out = os.path.join(done_dir, filename)
                audio_out = os.path.join(done_dir, audio_filename)
                print(f"-- [I] Moving file to {desc_out}")
                print(f"-- [I] Moving file to {audio_out}")
                if dry_run:
                    print("-- [I] Dry run:", f"shutil.move({filepath}, {desc_out})")
                    print("-- [I] Dry run:", f"shutil.move({audio_filepath}, {audio_out})")
                else:
                    shutil.move(filepath, desc_out)
                    shutil.move(audio_filepath, audio_out)
                print(f"++ [D] Finished processing file {index + 1}/{total_files}: {filename}\n")
            else:
                print(f"!! [E] No songs in description; skipping.")
        except Exception as e:
            print(f"!! [E] Error processing file {filename}: {e}")


if __name__ == "__main__":
    base_dir = os.getcwd()
    input_dir = os.path.join(base_dir, "mixes")
    output_dir = os.path.join(base_dir, "songs")
    done_dir = os.path.join(base_dir, "processed")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(done_dir, exist_ok=True)
    process_description_files(input_dir, output_dir, done_dir, dry_run=False)

