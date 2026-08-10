import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/supabase_service.dart';
import '../models/models.dart';

class EgoSetupScreen extends StatefulWidget {
  const EgoSetupScreen({Key? key}) : super(key: key);

  @override
  State<EgoSetupScreen> createState() => _EgoSetupScreenState();
}

class _EgoSetupScreenState extends State<EgoSetupScreen> {
  final _goalCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  Ego? _ego;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadEgo();
  }

  Future<void> _loadEgo() async {
    final ego = await SupabaseService.getActiveEgo();
    if (ego != null) {
      _ego = ego;
      _goalCtrl.text = ego.goal;
      _reasonCtrl.text = ego.reason;
    }
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (_ego == null) return;
    setState(() => _saving = true);
    await SupabaseService.updateEgoGoal(
      _ego!.id,
      _goalCtrl.text.trim(),
      _reasonCtrl.text.trim(),
    );
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'GOAL SETUP',
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
            color: Colors.white,
          ),
        ),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.cardPurple))
            : Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MASTER GOAL',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _goalCtrl,
                      maxLines: 3,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                      decoration: InputDecoration(
                        hintText: 'What is your primary focus?',
                        hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                        filled: true,
                        fillColor: AppColors.cardBg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: AppColors.borderSubtle),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'WHY IT MATTERS',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _reasonCtrl,
                      maxLines: 3,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                      decoration: InputDecoration(
                        hintText: 'Why does achieving this matter to you?',
                        hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                        filled: true,
                        fillColor: AppColors.cardBg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: AppColors.borderSubtle),
                        ),
                      ),
                    ),
                    const Spacer(),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ),
                        onPressed: _saving ? null : _save,
                        child: Text(
                          _saving ? 'SAVING...' : 'SAVE CHANGES',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
