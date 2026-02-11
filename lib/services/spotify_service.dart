import 'package:url_launcher/url_launcher.dart';
import '../models.dart';

// Simulating Spotify for this demo as deep linking setup is complex in generated response.
class SpotifyService {
  Future<void> authorize() async {
    const clientId = String.fromEnvironment('SPOTIFY_CLIENT_ID', defaultValue: 'YOUR_ID');
    const redirectUri = 'justcookbro://spotify-auth';
    const scopes = 'user-read-currently-playing';
    
    final url = Uri.parse(
        'https://accounts.spotify.com/authorize?client_id=$clientId&redirect_uri=$redirectUri&scope=$scopes&response_type=token');
        
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  // In a real app, this would query the API with the token.
  Future<SpotifyTrack?> getCurrentlyPlaying(String token) async {
    // Mock response
    await Future.delayed(const Duration(milliseconds: 500));
    return SpotifyTrack(
      name: "Cooking Jazz", 
      artist: "Smooth Chef", 
      uri: "spotify:track:123", 
      playedAt: DateTime.now()
    );
  }
}
