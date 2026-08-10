import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../services/supabase_service.dart';
import '../models/models.dart';
import 'account_screen.dart';
import 'notes_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Profile? _profile;
  Ego? _ego;
  List<TaskItem> _tasks = [];
  bool _loading = true;
  String _activeTab = 'short_term';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final profile = await SupabaseService.getProfile();
    final ego = await SupabaseService.getActiveEgo();
    final tasks = await SupabaseService.getTasks();

    setState(() {
      _profile = profile;
      _ego = ego;
      _tasks = tasks;
      _loading = false;
    });
  }

  Future<void> _toggleTask(TaskItem task) async {
    await SupabaseService.toggleTask(task.id, task.completed);
    _loadData();
  }

  void _showAddTaskDialog() {
    final titleController = TextEditingController();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      isScrollControlled: true,
      builder: (ctx) => Padding(
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
              'NEW TASK',
              style: GoogleFonts.outfit(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: titleController,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 18),
              decoration: InputDecoration(
                hintText: 'Enter task description...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.cardPurple,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(27),
                  ),
                ),
                onPressed: () async {
                  if (titleController.text.trim().isNotEmpty) {
                    await SupabaseService.addTask(
                      titleController.text.trim(),
                      _activeTab,
                    );
                    Navigator.pop(ctx);
                    _loadData();
                  }
                },
                child: Text(
                  'ADD TASK',
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredTasks = _tasks.where((t) => t.type == _activeTab).toList();

    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.cardPurple))
            : RefreshIndicator(
                onRefresh: _loadData,
                color: AppColors.cardPurple,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white.withOpacity(0.1),
                                ),
                                child: const Icon(LucideIcons.user, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _profile?.name ?? 'Welcome Back',
                                    style: GoogleFonts.outfit(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    '${_profile?.streak ?? 0} Day Streak 🔥',
                                    style: GoogleFonts.outfit(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.cardOrange,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(LucideIcons.fileText, color: Colors.white),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const NotesScreen()),
                                  );
                                },
                              ),
                              IconButton(
                                icon: const Icon(LucideIcons.settings, color: Colors.white),
                                onPressed: () async {
                                  await Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const AccountScreen()),
                                  );
                                  _loadData();
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Goal Card (Curved Accent Card)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.cardPurple,
                          borderRadius: BorderRadius.circular(36),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                Text(
                                  'ACTIVE GOAL',
                                  style: GoogleFonts.outfit(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 2,
                                    color: Colors.black.withOpacity(0.6),
                                  ),
                                ),
                                const Icon(LucideIcons.target, color: Colors.black, size: 20),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _ego?.goal.isNotEmpty == true
                                  ? _ego!.goal
                                  : 'Set your master goal in settings',
                              style: GoogleFonts.outfit(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.black,
                                height: 1.3,
                              ),
                            ),
                            if (_ego?.reason.isNotEmpty == true) ...[
                              const SizedBox(height: 8),
                              Text(
                                '"${_ego!.reason}"',
                                style: GoogleFonts.outfit(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  fontStyle: FontStyle.italic,
                                  color: Colors.black.withOpacity(0.7),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Tasks Header & Filter Tabs
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Text(
                            'TASKS',
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 2,
                              color: AppColors.textMuted,
                            ),
                          ),
                          InkWell(
                            onTap: _showAddTaskDialog,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.cardMint,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.plus, size: 14, color: Colors.black),
                                  const SizedBox(width: 4),
                                  Text(
                                    'ADD TASK',
                                    style: GoogleFonts.outfit(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Tabs (Short Term / Long Term / Events)
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildTabChip('Short Term', 'short_term'),
                            const SizedBox(width: 8),
                            _buildTabChip('Long Term', 'long_term'),
                            const SizedBox(width: 8),
                            _buildTabChip('Events', 'event'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Task Items List
                      if (filteredTasks.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          decoration: BoxDecoration(
                            color: AppColors.cardBg,
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(color: AppColors.borderSubtle),
                          ),
                          child: Column(
                            children: [
                              Icon(LucideIcons.checkCircle2, color: Colors.white.withOpacity(0.2), size: 36),
                              const SizedBox(height: 8),
                              Text(
                                'No tasks in this list',
                                style: GoogleFonts.outfit(color: AppColors.textMuted, fontSize: 14),
                              ),
                            ],
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filteredTasks.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final task = filteredTasks[idx];
                            return InkWell(
                              onTap: () => _toggleTask(task),
                              borderRadius: BorderRadius.circular(24),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                                decoration: BoxDecoration(
                                  color: AppColors.cardBg,
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(color: AppColors.borderSubtle),
                                ),
                                child: Row(
                                  children: [
                                    AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      width: 24,
                                      height: 24,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: task.completed ? AppColors.cardMint : Colors.transparent,
                                        border: Border.all(
                                          color: task.completed ? AppColors.cardMint : Colors.white.withOpacity(0.3),
                                          width: 2,
                                        ),
                                      ),
                                      child: task.completed
                                          ? const Icon(Icons.check, size: 14, color: Colors.black)
                                          : null,
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Text(
                                        task.title,
                                        style: GoogleFonts.outfit(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w500,
                                          color: task.completed ? Colors.white.withOpacity(0.4) : Colors.white,
                                          decoration: task.completed ? TextDecoration.lineThrough : null,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildTabChip(String label, String value) {
    final isSelected = _activeTab == value;
    return ChoiceChip(
      label: Text(
        label,
        style: GoogleFonts.outfit(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: isSelected ? Colors.black : Colors.white,
        ),
      ),
      selected: isSelected,
      selectedColor: AppColors.cardOrange,
      backgroundColor: AppColors.cardBg,
      side: BorderSide(color: isSelected ? AppColors.cardOrange : AppColors.borderSubtle),
      onSelected: (_) {
        setState(() => _activeTab = value);
      },
    );
  }
}
