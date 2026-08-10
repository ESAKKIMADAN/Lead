import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../services/supabase_service.dart';
import '../models/models.dart';

class NotesScreen extends StatefulWidget {
  const NotesScreen({Key? key}) : super(key: key);

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  List<NoteItem> _notes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() => _loading = true);
    final notes = await SupabaseService.getNotes();
    setState(() {
      _notes = notes;
      _loading = false;
    });
  }

  Color _getNoteColor(String colorName) {
    switch (colorName.toLowerCase()) {
      case 'purple':
      case 'violet':
        return AppColors.cardPurple;
      case 'mint':
      case 'green':
        return AppColors.cardMint;
      case 'orange':
        return AppColors.cardOrange;
      case 'pink':
        return AppColors.cardPink;
      default:
        return AppColors.cardBg;
    }
  }

  void _showAddNoteDialog() {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    String selectedColor = 'purple';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'NEW NOTE',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: titleCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 18),
                decoration: InputDecoration(
                  hintText: 'Title...',
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                  border: InputBorder.none,
                ),
              ),
              TextField(
                controller: contentCtrl,
                maxLines: 4,
                style: const TextStyle(color: Colors.white70, fontSize: 15),
                decoration: InputDecoration(
                  hintText: 'Write your thought...',
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                  border: InputBorder.none,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _colorBubble('purple', AppColors.cardPurple, selectedColor, (c) => setModalState(() => selectedColor = c)),
                  _colorBubble('mint', AppColors.cardMint, selectedColor, (c) => setModalState(() => selectedColor = c)),
                  _colorBubble('orange', AppColors.cardOrange, selectedColor, (c) => setModalState(() => selectedColor = c)),
                  _colorBubble('pink', AppColors.cardPink, selectedColor, (c) => setModalState(() => selectedColor = c)),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                  ),
                  onPressed: () async {
                    if (titleCtrl.text.trim().isNotEmpty || contentCtrl.text.trim().isNotEmpty) {
                      await SupabaseService.addNote(
                        titleCtrl.text.trim(),
                        contentCtrl.text.trim(),
                        selectedColor,
                      );
                      Navigator.pop(ctx);
                      _loadNotes();
                    }
                  },
                  child: Text(
                    'SAVE NOTE',
                    style: GoogleFonts.outfit(
                      fontSize: 13,
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

  Widget _colorBubble(String name, Color col, String current, Function(String) onSelect) {
    final isSelected = current == name;
    return GestureDetector(
      onTap: () => onSelect(name),
      child: Container(
        margin: const EdgeInsets.only(right: 12),
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: col,
          shape: BoxShape.circle,
          border: isSelected ? Border.all(color: Colors.white, width: 3) : null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'NOTES',
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
            color: Colors.white,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus, color: Colors.white),
            onPressed: _showAddNoteDialog,
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.cardPurple))
            : _notes.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.fileText, color: Colors.white24, size: 48),
                        const SizedBox(height: 12),
                        Text(
                          'No notes created yet',
                          style: GoogleFonts.outfit(color: Colors.white54, fontSize: 16),
                        ),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(20),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 0.95,
                    ),
                    itemCount: _notes.length,
                    itemBuilder: (ctx, idx) {
                      final note = _notes[idx];
                      final bgColor = _getNoteColor(note.color);
                      final isDarkText = bgColor != AppColors.cardBg;

                      return Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: bgColor,
                          borderRadius: BorderRadius.circular(28),
                          border: bgColor == AppColors.cardBg
                              ? Border.all(color: AppColors.borderSubtle)
                              : null,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              note.title.isNotEmpty ? note.title : 'Untitled',
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: isDarkText ? Colors.black : Colors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Expanded(
                              child: Text(
                                note.content,
                                style: GoogleFonts.outfit(
                                  fontSize: 13,
                                  color: isDarkText
                                      ? Colors.black.withOpacity(0.7)
                                      : Colors.white.withOpacity(0.7),
                                  height: 1.3,
                                ),
                                maxLines: 5,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
