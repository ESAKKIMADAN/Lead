import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF0A0A0A);
  static const Color cardBg = Color(0xFF151515);
  static const Color cardPurple = Color(0xFFD9D2FC);
  static const Color cardMint = Color(0xFFC7F2E2);
  static const Color cardOrange = Color(0xFFFFE5D9);
  static const Color cardPink = Color(0xFFFCD2D2);
  static const Color textWhite = Colors.white;
  static const Color textMuted = Color(0x99FFFFFF);
  static const Color borderSubtle = Color(0x0FFFFFFF);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData.dark().copyWith(
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.cardPurple,
        surface: AppColors.cardBg,
        background: AppColors.background,
      ),
      cardTheme: CardTheme(
        color: AppColors.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(32),
          side: const BorderSide(color: AppColors.borderSubtle),
        ),
        elevation: 0,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
    );
  }
}
