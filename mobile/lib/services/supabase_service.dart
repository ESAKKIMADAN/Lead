import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

class SupabaseService {
  static const String supabaseUrl = 'https://izvgefvbknuqftsatjax.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dmdlZnZia251cWZ0c2F0amF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNjU0MDgsImV4cCI6MjEwMTc0MTQwOH0.f99sPbnlziwLvSPBwFSS3d5Fij5drhYvpgUPEdHpRK8';

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> init() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
  }

  // Auth: Verify PIN / Sign In
  static Future<bool> signInWithEmailAndPin(String email, String pin) async {
    try {
      final res = await client.auth.signInWithPassword(
        email: email,
        password: pin,
      );
      return res.user != null;
    } catch (e) {
      print('Sign In error: $e');
      return false;
    }
  }

  // Fetch Current Profile
  static Future<Profile?> getProfile() async {
    final user = client.auth.currentUser;
    if (user == null) return null;
    final res = await client.from('profiles').select().eq('id', user.id).single();
    return Profile.fromJson(res);
  }

  // Fetch Active Goal / Ego
  static Future<Ego?> getActiveEgo() async {
    final user = client.auth.currentUser;
    if (user == null) return null;
    final res = await client
        .from('egos')
        .select()
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1);
    if (res.isEmpty) return null;
    return Ego.fromJson(res.first);
  }

  // Update Ego Goal
  static Future<void> updateEgoGoal(String id, String goal, String reason) async {
    await client.from('egos').update({
      'goal': goal,
      'reason': reason,
    }).eq('id', id);
  }

  // Update Profile Name
  static Future<void> updateProfileName(String name) async {
    final user = client.auth.currentUser;
    if (user == null) return;
    await client.from('profiles').update({'name': name}).eq('id', user.id);
  }

  // Fetch User Tasks
  static Future<List<TaskItem>> getTasks() async {
    final user = client.auth.currentUser;
    if (user == null) return [];
    final res = await client
        .from('tasks')
        .select()
        .eq('user_id', user.id)
        .order('created_at', ascending: false);
    return (res as List).map((e) => TaskItem.fromJson(e)).toList();
  }

  // Toggle Task Completion
  static Future<void> toggleTask(String taskId, bool currentCompleted) async {
    await client.from('tasks').update({
      'completed': !currentCompleted,
    }).eq('id', taskId);
  }

  // Add New Task
  static Future<void> addTask(String title, String type) async {
    final user = client.auth.currentUser;
    if (user == null) return;
    await client.from('tasks').insert({
      'user_id': user.id,
      'title': title,
      'type': type,
      'completed': false,
    });
  }

  // Fetch User Notes
  static Future<List<NoteItem>> getNotes() async {
    final user = client.auth.currentUser;
    if (user == null) return [];
    final res = await client
        .from('notes')
        .select()
        .eq('user_id', user.id)
        .order('pinned', ascending: false)
        .order('created_at', ascending: false);
    return (res as List).map((e) => NoteItem.fromJson(e)).toList();
  }

  // Add New Note
  static Future<void> addNote(String title, String content, String color) async {
    final user = client.auth.currentUser;
    if (user == null) return;
    await client.from('notes').insert({
      'user_id': user.id,
      'title': title,
      'content': content,
      'color': color,
      'pinned': false,
    });
  }

  // Fetch Notification Logs
  static Future<List<NotificationLogItem>> getNotificationLogs() async {
    final user = client.auth.currentUser;
    if (user == null) return [];
    final res = await client
        .from('notification_logs')
        .select()
        .eq('user_id', user.id)
        .order('created_at', ascending: false)
        .limit(20);
    return (res as List).map((e) => NotificationLogItem.fromJson(e)).toList();
  }
}
