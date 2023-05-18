import os
import re

def is_description_file(filename):
    return filename.endswith('.description')

def has_timestamps(filepath):
    timestamp_pattern = re.compile(r'\d{2}:\d{2}')
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return bool(timestamp_pattern.search(content))

def main(input_dir):
    for filename in os.listdir(input_dir):
        if is_description_file(filename):
            filepath = os.path.join(input_dir, filename)
            if not has_timestamps(filepath):
                print(f"No timestamps found in file: {filename}")

if __name__ == '__main__':
    base_dir = os.getcwd()
    input_dir = base_dir
    main(input_dir)
