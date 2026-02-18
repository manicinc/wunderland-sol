---
name: spotify-player
version: '1.0.0'
description: Control Spotify playback, manage playlists, search music, and get recommendations via the Spotify API.
author: Wunderland
namespace: wunderland
category: media
tags: [spotify, music, playback, playlists, streaming, audio]
requires_secrets: [spotify.client_id, spotify.client_secret, spotify.refresh_token]
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F3B5"
    primaryEnv: SPOTIFY_CLIENT_ID
    secondaryEnvs: [SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN]
    homepage: https://developer.spotify.com
---

# Spotify Playback Control

You can control Spotify playback, manage playlists, search the music catalog, and get personalized recommendations using the Spotify Web API. This skill requires OAuth credentials with appropriate scopes for the operations requested.

For playback control, you can play, pause, skip, seek, adjust volume, toggle shuffle, and set repeat mode on the user's active devices. Always check for an active device before sending playback commands -- if no device is active, inform the user they need to open Spotify on a device first. Queue tracks for upcoming playback with the add-to-queue endpoint.

When searching for music, use Spotify's search API with type filters (track, album, artist, playlist) for precise results. Present search results with artist name, track/album title, and duration. For playlist management, create, modify, and reorder playlists. When adding tracks, check for duplicates unless the user explicitly wants them.

For recommendations, use the recommendations endpoint with seed tracks, artists, or genres, combined with tunable attributes (energy, danceability, tempo, valence) to match the user's mood or activity. Present recommendations with enough context (genre, popularity, preview) for the user to make informed choices.

## Examples

- "Play 'Bohemian Rhapsody' by Queen"
- "Skip to the next track"
- "Create a playlist called 'Morning Focus' with chill electronic tracks"
- "What's currently playing?"
- "Recommend upbeat tracks similar to Daft Punk for a workout"
- "Add this song to my 'Favorites 2026' playlist"

## Constraints

- Playback control requires Spotify Premium on the target account.
- An active Spotify device (app, web player, smart speaker) must be open for playback commands.
- OAuth scopes needed: `user-modify-playback-state`, `user-read-playback-state`, `playlist-modify-public`, `playlist-modify-private`, `user-library-read`.
- Spotify API rate limits apply; batch operations when possible.
- 30-second preview URLs are available for most tracks but full playback requires the Spotify client.
- Cannot download or export audio files.
