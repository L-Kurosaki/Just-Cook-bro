import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/gemini_service.dart';
import '../services/spotify_service.dart';
import '../services/supabase_service.dart';

class CookingModeScreen extends StatefulWidget {
  final Recipe recipe;
  const CookingModeScreen({super.key, required this.recipe});

  @override
  State<CookingModeScreen> createState() => _CookingModeScreenState();
}

class _CookingModeScreenState extends State<CookingModeScreen> {
  int _currentStep = 0;
  Timer? _timer;
  int _timeLeft = 0;
  bool _timerRunning = false;
  String? _aiTip;
  
  // Music Tracking
  SpotifyTrack? _currentTrack;
  final SpotifyService _spotify = SpotifyService();
  final Set<String> _playedTrackUris = {};
  final List<SpotifyTrack> _sessionHistory = [];

  @override
  void initState() {
    super.initState();
    _resetTimer();
    _checkMusic();
  }

  void _checkMusic() async {
    Timer.periodic(const Duration(seconds: 10), (t) async {
       if (!mounted) return t.cancel();
       
       final track = await _spotify.getCurrentlyPlaying("mock_token");
       if (track != null) {
         setState(() {
           _currentTrack = track;
           // Add to history if unique
           if (!_playedTrackUris.contains(track.uri)) {
             _playedTrackUris.add(track.uri);
             _sessionHistory.add(track);
           }
         });
       }
    });
  }

  void _nextStep() {
    if (_currentStep < widget.recipe.steps.length - 1) {
      setState(() {
        _currentStep++;
        _resetTimer();
      });
    } else {
      _finishCooking();
    }
  }

  void _finishCooking() {
    // Show Completion Dialog
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _buildCompletionDialog(ctx)
    );
  }

  Widget _buildCompletionDialog(BuildContext dialogContext) {
    final commentController = TextEditingController();
    bool shareMusic = true;

    return StatefulBuilder(
      builder: (context, setState) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 24, 
            bottom: MediaQuery.of(context).viewInsets.bottom + 24
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(child: Icon(LucideIcons.partyPopper, size: 48, color: Color(0xFFC9A24D))),
              const SizedBox(height: 16),
              const Center(child: Text("Bon Appétit!", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))),
              const Center(child: Text("You cooked it! Share your triumph?", style: TextStyle(color: Colors.grey))),
              const SizedBox(height: 24),
              
              // User Expression
              const Text("What did you think?", style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: commentController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: "Review, tips, or modifications...",
                  filled: true,
                  fillColor: const Color(0xFFF3F4F6),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 16),

              // Music Toggle
              if (_sessionHistory.isNotEmpty)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text("Include Cooking Soundtrack"),
                  subtitle: Text("${_sessionHistory.length} songs tracked"),
                  value: shareMusic,
                  activeColor: const Color(0xFFC9A24D),
                  onChanged: (val) => setState(() => shareMusic = val ?? true),
                ),

              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(dialogContext); // Close sheet
                        Navigator.pop(context); // Close cooking screen
                      },
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                      child: const Text("Keep Private", style: TextStyle(color: Colors.black)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        try {
                          await SupabaseService().shareRecipeToCommunity(
                            widget.recipe, 
                            commentController.text,
                            musicSession: shareMusic ? _sessionHistory : null
                          );
                          if (mounted) {
                            Navigator.pop(dialogContext);
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Posted to Feed!")));
                          }
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFC9A24D),
                        padding: const EdgeInsets.symmetric(vertical: 16)
                      ),
                      child: const Text("Post to Feed", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              )
            ],
          ),
        );
      }
    );
  }

  void _resetTimer() {
    _timer?.cancel();
    setState(() {
      _timeLeft = widget.recipe.steps[_currentStep].timeInSeconds ?? 0;
      _timerRunning = false;
      _aiTip = null;
    });
  }

  void _toggleTimer() {
    if (_timeLeft <= 0) return;
    if (_timerRunning) {
      _timer?.cancel();
    } else {
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        setState(() {
          if (_timeLeft > 0) _timeLeft--;
          else {
             _timer?.cancel();
             _timerRunning = false;
          }
        });
      });
    }
    setState(() => _timerRunning = !_timerRunning);
  }

  Future<void> _askAi() async {
    final service = GeminiService();
    final step = widget.recipe.steps[_currentStep].instruction;
    final tip = await service.getCookingHelp(step);
    setState(() => _aiTip = tip);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final step = widget.recipe.steps[_currentStep];
    final progress = (_currentStep + 1) / widget.recipe.steps.length;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: IconButton(icon: const Icon(LucideIcons.x, color: Colors.black), onPressed: () => Navigator.pop(context)),
        title: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(value: progress, color: const Color(0xFFC9A24D), backgroundColor: Colors.grey[200], minHeight: 8),
        ),
        actions: [
            if (_currentTrack != null)
                Padding(
                  padding: const EdgeInsets.only(right: 16.0),
                  child: Icon(LucideIcons.music, color: Colors.green),
                )
        ],
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            if (_currentStep == 0 && widget.recipe.allergens.isNotEmpty)
               Container(
                 margin: const EdgeInsets.only(bottom: 10),
                 padding: const EdgeInsets.all(8),
                 color: Colors.red.shade50,
                 child: Row(
                   mainAxisAlignment: MainAxisAlignment.center,
                   children: [
                     const Icon(LucideIcons.alertTriangle, size: 16, color: Colors.red),
                     const SizedBox(width: 8),
                     Text("Contains: ${widget.recipe.allergens.join(', ')}", style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
                   ],
                 ),
               ),
               
            if (_currentTrack != null)
                Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                    child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                            Text("Now Playing: ${_currentTrack!.name}", style: TextStyle(color: Colors.green[800], fontSize: 12, fontWeight: FontWeight.bold))
                        ],
                    ),
                ),
            const SizedBox(height: 10),
            Text('Step ${_currentStep + 1}', style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  child: Text(
                    step.instruction,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, height: 1.4),
                  ),
                ),
              ),
            ),
            if (step.tip != null)
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    const Icon(LucideIcons.lightbulb, color: Colors.blue),
                    const SizedBox(width: 12),
                    Expanded(child: Text(step.tip!, style: TextStyle(color: Colors.blue[900]))),
                  ],
                ),
              ),
            if (_aiTip != null)
               Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(color: const Color(0xFF2E2E2E), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    const Icon(LucideIcons.bot, color: Color(0xFFC9A24D)),
                    const SizedBox(width: 12),
                    Expanded(child: Text(_aiTip!, style: const TextStyle(color: Colors.white))),
                  ],
                ),
              ),
            if (_timeLeft > 0 || step.timeInSeconds != null)
              GestureDetector(
                onTap: _toggleTimer,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: _timerRunning ? const Color(0xFFC9A24D) : const Color(0xFFF3F4F6),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${(_timeLeft ~/ 60).toString().padLeft(2, '0')}:${(_timeLeft % 60).toString().padLeft(2, '0')}',
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: _timerRunning ? Colors.white : Colors.black),
                  ),
                ),
              ),
            const SizedBox(height: 40),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _askAi,
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
                    child: const Text('Ask AI', style: TextStyle(color: Colors.black)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _nextStep,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFC9A24D), padding: const EdgeInsets.all(16)),
                    child: Text(_currentStep == widget.recipe.steps.length - 1 ? 'Finish' : 'Next', style: const TextStyle(color: Colors.white)),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}