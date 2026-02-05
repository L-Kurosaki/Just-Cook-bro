// Replace this with your actual Spotify Client ID from developer.spotify.com
// For development, ensure 'http://localhost:5173/' (or your app URL) is added to Redirect URIs in dashboard
const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'; 
const REDIRECT_URI = window.location.origin + '/'; 
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state'
];

export const spotifyService = {
  getAuthUrl: () => {
    return `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(' '))}&response_type=token&show_dialog=true`;
  },

  getTokenFromUrl: (): string | null => {
    const hash = window.location.hash;
    if (!hash) return null;
    
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    return token;
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