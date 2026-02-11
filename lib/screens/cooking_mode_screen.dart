import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/gemini_service.dart';
import '../services/spotify_service.dart';

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
  SpotifyTrack? _currentTrack;
  final SpotifyService _spotify = SpotifyService();

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
       setState(() => _currentTrack = track);
    });
  }

  void _nextStep() {
    if (_currentStep < widget.recipe.steps.length - 1) {
      setState(() {
        _currentStep++;
        _resetTimer();
      });
    } else {
      Navigator.popUntil(context, (route) => route.isFirst);
    }
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