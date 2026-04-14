import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData light() {
    const seed = Color(0xFFFF7A00);
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.light),
      appBarTheme: const AppBarTheme(centerTitle: true, scrolledUnderElevation: 0),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: ColorScheme.fromSeed(seedColor: seed).primaryContainer,
      ),
      inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
    );
  }
}
