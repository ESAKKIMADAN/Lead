import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/supabase_service.dart';
import 'dashboard_screen.dart';

class PinScreen extends StatefulWidget {
  const PinScreen({Key? key}) : super(key: key);

  @override:
  State<PinScreen> createState() => _PinScreenState();
}

class _PinScreenState extends State<PinScreen> {
  String _pin = '';
  bool _loading = false;
  String? _error;

  void _onKeyPress(String val) {
    if (_pin.length < 4) {
      setState(() {
        _pin += val;
        _error = null;
      });
      if (_pin.length == 4) {
        _verifyPin();
      }
    }
  }

  void _onBackspace() {
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
        _error = null;
      });
    }
  }

  Future<void> _verifyPin() async {
    setState(() {
      _loading = true;
    });

    final currentUser = SupabaseService.client.auth.currentUser;
    if (currentUser != null) {
      // User is already logged in
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
      );
    } else {
      // Demo auto-login or prompt
      final success = await SupabaseService.signInWithEmailAndPin(
        'test@example.com',
        _pin,
      );

      if (mounted) {
        if (success) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        } else {
          // Bypass for local testing if offline/demo
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      }
    }

    setState(() {
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            children: [
              const SizedBox(height: 40),
              // App Brand Header
              Text(
                'LEAD',
                style: GoogleFonts.outfit(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 4,
                  color: AppColors.textWhite,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'ENTER SECURITY PIN',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2,
                  color: AppColors.textMuted,
                ),
              ),
              const Spacer(),
              // PIN Dots Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (index) {
                  final isFilled = index < _pin.length;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 12),
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isFilled ? AppColors.cardPurple : Colors.transparent,
                      border: Border.all(
                        color: isFilled
                            ? AppColors.cardPurple
                            : Colors.white.withOpacity(0.2),
                        width: 2,
                      ),
                    ),
                  );
                }),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                ),
              ],
              const Spacer(),
              // Number Pad
              if (_loading)
                const CircularProgressIndicator(color: AppColors.cardPurple)
              else
                Column(
                  children: [
                    _buildNumRow(['1', '2', '3']),
                    const SizedBox(height: 16),
                    _buildNumRow(['4', '5', '6']),
                    const SizedBox(height: 16),
                    _buildNumRow(['7', '8', '9']),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        const SizedBox(width: 72),
                        _buildNumButton('0'),
                        IconButton(
                          onPressed: _onBackspace,
                          iconSize: 28,
                          icon: const Icon(Icons.backspace_outlined,
                              color: AppColors.textWhite),
                        ),
                      ],
                    ),
                  ],
                ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNumRow(List<String> numbers) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: numbers.map((n) => _buildNumButton(n)).toList(),
    );
  }

  Widget _buildNumButton(String number) {
    return InkWell(
      onTap: () => _onKeyPress(number),
      borderRadius: BorderRadius.circular(40),
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.cardBg,
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        alignment: Alignment.center,
        child: Text(
          number,
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            color: AppColors.textWhite,
          ),
        ),
      ),
    );
  }
}
