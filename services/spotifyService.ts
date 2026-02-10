import { Linking } from 'react-native';

// We now use the environment variable for the Client ID.
// Create an app at https://developer.spotify.com/dashboard to get this ID.
const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || ''; 

// In React Native, you typically use a deep link scheme like 'justcookbro://'
// Ensure you add 'justcookbro://spotify-auth' to the Redirect URIs in your Spotify Dashboard.
const REDIRECT_URI = 'justcookbro://spotify-auth'; 

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state'
];

export const spotifyService = {
  getAuthUrl: () => {
    if (!CLIENT_ID) {
        console.warn("Spotify Client ID is missing. Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID.");
        return '';
    }
    return `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(' '))}&response_type=token`;
  },

  // Note: on Mobile, you catch this via Linking.addEventListener('url', ...) in the component
  extractTokenFromUrl: (url: string): string | null => {
    if (!url) return null;
    const regex = /access_token=([^&]*)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  },

  getCurrentlyPlaying: async (token: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 204 || response.status > 400) {
        return null;
      }

      const data = await response.json();
      if (!data.item) return null;

      return {
        name: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(', '),
        albumArt: data.item.album.images[0]?.url,
        uri: data.item.uri,
        playedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Spotify API Error:", error);
      return null;
    }
  }
};