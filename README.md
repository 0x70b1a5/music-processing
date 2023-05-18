# music processing: rip individual songs from playlist videos

I like to download music mixes, but I don't like listening to songs in the same order over and over. Most uploaders include song timestamps in their videos, so I wrote this tool to split the single long playlist file into the individual songs. It's not perfect because timestamps are at most precise to 1 second intervals, but it's good enough.

## Dependencies

- FFmpeg
- yt-dlp

## Usage

You need the following directory structure: 

```
music-processing
|-- split_mix_into_songs.py
|-- mixes # unprocessed mix audio
|-- songs # individual songs will go here
|-- processed # processed audio will go here
|-- dupes # duplicate songs will go here
```

Description files MUST have some number of lines in the following format: `(HH:)MM:SS - artist - title`

```
(any lines that don't start with a timestamp are ignored)

00:00 artist - title
02:00 artist2 - title2
... etc
01:03:00 artist12 - title12
... etc
```

```sh
yt-dlp -x --audio-format mp3 --write-description "the url to your video and/or playlist"
python split_mix_into_songs.py
```

You can also do a dry run by editing the line `dry_run=True`.
