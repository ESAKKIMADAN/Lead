class Profile {
  final String id;
  final String username;
  final String name;
  final String? email;
  final int streak;
  final String? lastCompletedTaskDate;
  final String timezone;

  Profile({
    required this.id,
    required this.username,
    required this.name,
    this.email,
    required this.streak,
    this.lastCompletedTaskDate,
    required this.timezone,
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      username: json['username'] ?? '',
      name: json['name'] ?? 'User',
      email: json['email'] as String?,
      streak: json['streak'] ?? 0,
      lastCompletedTaskDate: json['last_completed_task_date'] as String?,
      timezone: json['timezone'] ?? 'UTC',
    );
  }
}

class Ego {
  final String id;
  final String userId;
  final String goal;
  final String reason;
  final String category;
  final bool active;

  Ego({
    required this.id,
    required this.userId,
    required this.goal,
    required this.reason,
    required this.category,
    required this.active,
  });

  factory Ego.fromJson(Map<String, dynamic> json) {
    return Ego(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      goal: json['goal'] ?? '',
      reason: json['reason'] ?? '',
      category: json['category'] ?? 'mindset',
      active: json['active'] ?? true,
    );
  }
}

class TaskItem {
  final String id;
  final String userId;
  final String title;
  final String type; // 'short_term' | 'long_term' | 'event'
  final String? scheduledTime;
  final String? targetDate;
  final bool completed;

  TaskItem({
    required this.id,
    required this.userId,
    required this.title,
    required this.type,
    this.scheduledTime,
    this.targetDate,
    required this.completed,
  });

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    return TaskItem(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] ?? '',
      type: json['type'] ?? 'short_term',
      scheduledTime: json['scheduled_time'] as String?,
      targetDate: json['target_date'] as String?,
      completed: json['completed'] ?? false,
    );
  }
}

class NoteItem {
  final String id;
  final String userId;
  final String title;
  final String content;
  final String color;
  final bool pinned;

  NoteItem({
    required this.id,
    required this.userId,
    required this.title,
    required this.content,
    required this.color,
    required this.pinned,
  });

  factory NoteItem.fromJson(Map<String, dynamic> json) {
    return NoteItem(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      color: json['color'] ?? 'violet',
      pinned: json['pinned'] ?? false,
    );
  }
}

class NotificationLogItem {
  final String id;
  final String userId;
  final String notificationTitle;
  final String notificationBody;
  final String? createdAt;

  NotificationLogItem({
    required this.id,
    required this.userId,
    required this.notificationTitle,
    required this.notificationBody,
    this.createdAt,
  });

  factory NotificationLogItem.fromJson(Map<String, dynamic> json) {
    return NotificationLogItem(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      notificationTitle: json['notification_title'] ?? '',
      notificationBody: json['notification_body'] ?? '',
      createdAt: json['created_at'] as String?,
    );
  }
}
