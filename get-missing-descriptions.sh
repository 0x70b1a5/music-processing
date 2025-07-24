#!/bin/bash

for mp3_file in *.mp3; do
    description_file="${mp3_file%.*}.description"
    
    if [[ ! -f "$description_file" ]]; then
        if [[ "$mp3_file" =~ \[(.*)\] ]]; then
            # Since the audio already exists, the description only will be downloaded by yt-dlp
            yt-dlp -x --audio-format mp3 --write-description "https://youtu.be/${BASH_REMATCH[1]}"
        fi
    fi
done

