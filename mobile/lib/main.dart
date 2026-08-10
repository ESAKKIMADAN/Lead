import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/app_theme.dart';
import 'services/supabase_service.dart';
import 'services/notification_service.dart';
import 'screens/pin_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Force dark status bar
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize Supabase & Notifications
  await SupabaseService.init();
  await NotificationService.init();

  runApp(const LeadApp());
}

class LeadApp extends StatelessWidget {
  const LeadApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LEAD',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const PinScreen(),
    );
  }
}
