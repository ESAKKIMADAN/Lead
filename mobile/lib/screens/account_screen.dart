import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../services/supabase_service.dart';
import '../services/notification_service.dart';
import '../models/models.dart';
import 'ego_setup_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({Key? key}) : super(key: key);

  @override:
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Profile? _profile;
  Ego? _ego;
  List<NotificationLogItem> _logs = [];
  bool _loading = true;
  String? _statusMessage;
  bool _statusIsError = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final profile = await SupabaseService.getProfile();
    final ego = await SupabaseService.getActiveEgo();
    final logs = await SupabaseService.getNotificationLogs();
    setState(() {
      _profile = profile;
      _ego = ego;
      _logs = logs;
      _loading = false;
    });
  }

  Future<void> _enableNotifications() async {
    final granted = await NotificationService.requestPermission();
    setState(() {
      if (granted) {
        _statusMessage = 'Notifications Active! System alerts are ready.';
        _statusIsError = false;
      } else {
        _statusMessage = 'Permission denied in Android system settings.';
        _statusIsError = true;
      }
    });
  }

  Future<void> _sendTestNotification() async {
    String title = 'LEAD Motivation';
    String body = 'Success is built through daily small wins. Stay focused!';

    if (_logs.isNotEmpty) {
      final pick = _logs[DateTime.now().second % _logs.length];
      title = pick.notificationTitle.isNotEmpty ? pick.notificationTitle : title;
      body = pick.notificationBody.isNotEmpty ? pick.notificationBody : body;
    }

    await NotificationService.showNotification(title: title, body: body);

    setState(() {
      _statusMessage = 'Sent: "$title" — Check your Android notification shade!';
      _statusIsError = false;
    });
  }

  void _showEditNameDialog() {
    final nameCtrl = TextEditingController(text: _profile?.name ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: Text('Edit Name', style: GoogleFonts.outfit(color: Colors.white)),
        content: TextField(
          controller: nameCtrl,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Enter your name',
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.cardPurple,
              foregroundColor: Colors.black,
            ),
            onPressed: () async {
              if (nameCtrl.text.trim().isNotEmpty) {
                await SupabaseService.updateProfileName(nameCtrl.text.trim());
                Navigator.pop(ctx);
                _loadData();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'ACCOUNT & SETTINGS',
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
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    // Profile Header Card
                    InkWell(
                      onTap: _showEditNameDialog,
                      borderRadius: BorderRadius.circular(32),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.cardPurple,
                          borderRadius: BorderRadius.circular(32),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.black.withOpacity(0.1),
                              ),
                              child: const Icon(LucideIcons.user, color: Colors.black),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _profile?.name ?? 'User Profile',
                                    style: GoogleFonts.outfit(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black,
                                    ),
                                  ),
                                  Text(
                                    _ego?.goal ?? 'No active goal set',
                                    style: GoogleFonts.outfit(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: Colors.black.withOpacity(0.6),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const Icon(LucideIcons.chevronRight, color: Colors.black45),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Settings Group
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Column(
                        children: [
                          _buildSettingTile(
                            icon: LucideIcons.target,
                            title: 'Goal & Ego Setup',
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const EgoSetupScreen()),
                              );
                              _loadData();
                            },
                          ),
                          const Divider(height: 1, color: AppColors.borderSubtle),
                          _buildSettingTile(
                            icon: LucideIcons.bell,
                            title: 'Notifications & Alerts',
                            onTap: _showNotificationsModal,
                          ),
                          const Divider(height: 1, color: AppColors.borderSubtle),
                          _buildSettingTile(
                            icon: LucideIcons.lock,
                            title: 'Security PIN',
                            onTap: () {},
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Danger Zone
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: _buildSettingTile(
                        icon: LucideIcons.logOut,
                        title: 'Sign Out',
                        titleColor: Colors.redAccent,
                        onTap: () async {
                          await SupabaseService.client.auth.signOut();
                          Navigator.pop(context);
                        },
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  void _showNotificationsModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(36)),
      ),
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ANDROID NOTIFICATIONS',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Receive motivational system popups on your Android phone.',
                style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 20),

              // Enable Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.cardOrange,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                  ),
                  icon: const Icon(LucideIcons.bellRing, size: 18),
                  label: Text(
                    'ENABLE SYSTEM ALERTS',
                    style: GoogleFonts.outfit(
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  onPressed: () async {
                    await _enableNotifications();
                    setModalState(() {});
                  },
                ),
              ),
              const SizedBox(height: 12),

              // Test Push Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: AppColors.borderSubtle),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                  ),
                  icon: const Icon(LucideIcons.send, size: 18),
                  label: Text(
                    'SEND TEST NOTIFICATION',
                    style: GoogleFonts.outfit(
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  onPressed: () async {
                    await _sendTestNotification();
                    setModalState(() {});
                  },
                ),
              ),

              if (_statusMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _statusIsError
                        ? Colors.redAccent.withOpacity(0.1)
                        : AppColors.cardMint.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _statusIsError
                          ? Colors.redAccent.withOpacity(0.3)
                          : AppColors.cardMint.withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    _statusMessage!,
                    style: TextStyle(
                      color: _statusIsError ? Colors.redAccent : AppColors.cardMint,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 20),

              // Recent Logs
              Text(
                'RECENT LOGS (${_logs.length})',
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),
              if (_logs.isEmpty)
                Text('No logs available yet.', style: TextStyle(color: Colors.white38, fontSize: 13))
              else
                SizedBox(
                  height: 120,
                  child: ListView.builder(
                    itemCount: _logs.length > 5 ? 5 : _logs.length,
                    itemBuilder: (ctx, i) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text(
                        '• ${_logs[i].notificationTitle}: ${_logs[i].notificationBody}',
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    Color titleColor = Colors.white,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: titleColor.withOpacity(0.8), size: 20),
      title: Text(
        title,
        style: GoogleFonts.outfit(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: titleColor,
        ),
      ),
      trailing: const Icon(LucideIcons.chevronRight, color: Colors.white24, size: 18),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
    );
  }
}
