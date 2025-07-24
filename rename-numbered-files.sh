#!/bin/bash

# Script to rename files from "filename (number).mp3" to "number filename.mp3"
# Usage: ./rename-numbered-files.sh <directory>

if [ $# -ne 1 ]; then
    echo "Usage: $0 <directory>"
    echo "Example: $0 /path/to/music/files"
    exit 1
fi

DIR="$1"

if [ ! -d "$DIR" ]; then
    echo "Error: Directory '$DIR' does not exist"
    exit 1
fi

# Find and rename files matching the pattern (.*)\((\d+)\)\.mp3
find "$DIR" -name "*.mp3" -type f | while read -r file; do
    # Extract directory and filename
    dir=$(dirname "$file")
    filename=$(basename "$file")
    
    # Check if filename matches pattern: (.*)\((\d+)\)\.mp3
    if [[ "$filename" =~ ^(.+)\ \(([0-9]+)\)\.mp3$ ]]; then
        title="${BASH_REMATCH[1]}"
        number="${BASH_REMATCH[2]}"
        
        # Create new filename: number title.mp3
        new_filename="${number} ${title}.mp3"
        new_path="${dir}/${new_filename}"
        
        # Check if target file already exists
        if [ -e "$new_path" ]; then
            echo "Warning: Target file already exists: $new_path"
            echo "  Skipping: $file"
        else
            echo "Renaming: $filename"
            echo "      to: $new_filename"
            mv "$file" "$new_path"
        fi
    fi
done

echo "Rename operation completed."