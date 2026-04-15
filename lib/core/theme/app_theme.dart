import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData light() {
    const primary = Color(0xFFFF6B00);
    const primaryDark = Color(0xFFE65C00);
    const primaryLight = Color(0xFFFFF3E9);
    const accent = Color(0xFFFF8A3D);

    const background = Color(0xFFFFFFFF);
    const backgroundSoft = Color(0xFFF8F9FB);

    const textPrimary = Color(0xFF1A1A1A);
    const textSecondary = Color(0xFF666666);
    const textLight = Color(0xFF666666);
    const border = Color(0xFFEDEDED);

    const success = Color(0xFF22C55E);
    const error = Color(0xFFEF4444);
    const warning = Color(0xFFFACC15);
    const info = Color(0xFF3B82F6);

    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
    ).copyWith(
      primary: primary,
      onPrimary: Colors.white,
      primaryContainer: primaryLight,
      onPrimaryContainer: primaryDark,
      secondary: accent,
      onSecondary: Colors.white,
      tertiary: info,
      onTertiary: Colors.white,
      error: error,
      onError: Colors.white,
      background: background,
      onBackground: textPrimary,
      surface: background,
      onSurface: textPrimary,
      onSurfaceVariant: textSecondary,
      outline: border,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      dividerColor: border,
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        scrolledUnderElevation: 0,
        backgroundColor: background,
        foregroundColor: textPrimary,
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: background,
        indicatorColor: primaryLight,
        iconTheme: MaterialStatePropertyAll(IconThemeData(size: 28)),
        labelTextStyle: MaterialStatePropertyAll(TextStyle(color: textSecondary)),
      ),
      chipTheme: const ChipThemeData(
        side: BorderSide(color: border),
        backgroundColor: backgroundSoft,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: primary),
        ),
      ),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: textPrimary),
        bodyMedium: TextStyle(color: textSecondary),
        bodySmall: TextStyle(color: textLight),
      ),
      extensions: const <ThemeExtension<dynamic>>[
        _StatusColors(
          success: success,
          warning: warning,
          info: info,
        ),
      ],
    );
  }
}

@immutable
class _StatusColors extends ThemeExtension<_StatusColors> {
  const _StatusColors({
    required this.success,
    required this.warning,
    required this.info,
  });

  final Color success;
  final Color warning;
  final Color info;

  @override
  ThemeExtension<_StatusColors> copyWith({
    Color? success,
    Color? warning,
    Color? info,
  }) {
    return _StatusColors(
      success: success ?? this.success,
      warning: warning ?? this.warning,
      info: info ?? this.info,
    );
  }

  @override
  ThemeExtension<_StatusColors> lerp(ThemeExtension<_StatusColors>? other, double t) {
    if (other is! _StatusColors) return this;
    return _StatusColors(
      success: Color.lerp(success, other.success, t) ?? success,
      warning: Color.lerp(warning, other.warning, t) ?? warning,
      info: Color.lerp(info, other.info, t) ?? info,
    );
  }
}
