import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/supabase_service.dart';
import 'main_screen.dart';
import '../widgets/logo.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _loading = false;

  Future<void> _submit() async {
    setState(() => _loading = true);
    final auth = SupabaseService();
    
    try {
      if (_isLogin) {
        await auth.signIn(_emailController.text, _passwordController.text);
      } else {
        await auth.signUp(
          _emailController.text, 
          _passwordController.text,
          _nameController.text,
          _phoneController.text
        );
      }
      
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MainScreen())
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Auth failed: ${e.toString()}'), backgroundColor: Colors.red)
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _forgotPassword() async {
    if (_emailController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please enter your email first.")));
      return;
    }
    try {
      await SupabaseService().resetPassword(_emailController.text);
      if(mounted) showDialog(
        context: context, 
        builder: (_) => const AlertDialog(content: Text("Password reset link sent to your email."))
      );
    } catch(e) {
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Use consistent Logo widget
              const Logo(size: 120, showText: true),
              const SizedBox(height: 40),
              
              Container(
                decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    _buildToggleBtn('Sign In', true),
                    _buildToggleBtn('Sign Up', false),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              if (!_isLogin) ...[
                _buildInput(_nameController, 'Full Name', LucideIcons.user),
                const SizedBox(height: 16),
                _buildInput(_phoneController, 'Phone Number', LucideIcons.phone),
                const SizedBox(height: 16),
              ],
              
              _buildInput(_emailController, 'Email', LucideIcons.mail),
              const SizedBox(height: 16),
              _buildInput(_passwordController, 'Password', LucideIcons.lock, isObscure: true),
              
              if (_isLogin)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _forgotPassword,
                    child: const Text("Forgot Password?", style: TextStyle(color: Color(0xFFC9A24D))),
                  ),
                ),

              const SizedBox(height: 24),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFC9A24D),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading 
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(_isLogin ? 'Sign In' : 'Create Account', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
              
              const SizedBox(height: 24),
              TextButton(
                onPressed: () {
                   Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const MainScreen())
                  );
                }, 
                child: const Text('Continue as Guest', style: TextStyle(color: Colors.grey))
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToggleBtn(String text, bool activeState) {
    final isActive = _isLogin == activeState;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _isLogin = activeState),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isActive ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))] : null,
          ),
          child: Text(
            text, 
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.bold, color: isActive ? Colors.black : Colors.grey),
          ),
        ),
      ),
    );
  }

  Widget _buildInput(TextEditingController controller, String hint, IconData icon, {bool isObscure = false}) {
    return TextField(
      controller: controller,
      obscureText: isObscure,
      decoration: InputDecoration(
        prefixIcon: Icon(icon, color: Colors.grey, size: 20),
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[200]!)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[200]!)),
      ),
    );
  }
}