// ignore: deprecated_member_use
import 'package:flutter/material.dart';

// Central brand tokens. Context-dependent foregrounds are audited separately.
abstract final class RadarPalette {
  static const ink = Color(0xFF10243A);
  static const green = Color(0xFF16A34A);
  static const promotion = Color(0xFFF97316);
  static const accent = Color(0xFF86EFAC);
  static const background = Color(0xFFF5F7FA);
  static const darkBackground = Color(0xFF0F172A);
  static const darkSurface = Color(0xFF1E293B);
  static const darkCard = Color(0xFF243449);
  static const darkText = Color(0xFFF8FAFC);
  static const darkMuted = Color(0xFFCBD5E1);
  static const brandShade = Color(0xFF23466B);
  static const muted = Color(0xFF526174);
  static const placeholder = Color(0xFF64748B);
  static const categoryTint = Color(0xFFE8EEF6);
  static const imageBackground = Color(0xFFF1F5F9);
  static const savingTint = Color(0xFFDCFCE7);
  static const savingInk = Color(0xFF166534);
}

abstract final class RadarLayout {
  static const space = 8.0;
  static const gutter = 16.0;
  static const sectionGap = 24.0;
  static const touchTarget = 48.0;
  static const radius = 18.0;
  static const readingWidth = 840.0;
  static double toolbarHeight(BuildContext context) =>
      56 * MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 2.0);
}

/// App-wide components and typography. Existing brand colors remain stable.
abstract final class RadarTheme {
  static final light = _build(Brightness.light);
  static final dark = _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: RadarPalette.ink,
      brightness: brightness,
      primary: isDark ? RadarPalette.accent : RadarPalette.ink,
      onPrimary: isDark ? RadarPalette.ink : Colors.white,
      secondary: isDark ? RadarPalette.accent : RadarPalette.savingInk,
      surface: isDark ? RadarPalette.darkSurface : Colors.white,
      onSurface: isDark ? RadarPalette.darkText : RadarPalette.ink,
      onSurfaceVariant: isDark ? RadarPalette.darkMuted : RadarPalette.muted,
    );
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(RadarLayout.radius));
    final base = ThemeData(useMaterial3: true, brightness: brightness, colorScheme: scheme, fontFamily: 'Roboto');
    return base.copyWith(
      scaffoldBackgroundColor: isDark ? RadarPalette.darkBackground : RadarPalette.background,
      textTheme: base.textTheme.copyWith(
        headlineSmall: const TextStyle(fontSize: 24, height: 1.25, fontWeight: FontWeight.w800),
        titleLarge: const TextStyle(fontSize: 22, height: 1.3, fontWeight: FontWeight.w800),
        titleMedium: const TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w700),
        bodyLarge: const TextStyle(fontSize: 16, height: 1.5),
        bodyMedium: const TextStyle(fontSize: 14, height: 1.45),
        bodySmall: const TextStyle(fontSize: 12, height: 1.4),
        labelLarge: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      ).apply(fontFamily: 'Roboto', bodyColor: scheme.onSurface, displayColor: scheme.onSurface),
      cardTheme: CardThemeData(color: isDark ? RadarPalette.darkCard : Colors.white, elevation: 0, shape: shape),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? RadarPalette.darkBackground : RadarPalette.background,
        foregroundColor: scheme.onSurface, elevation: 0, centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: scheme.surface,
        labelStyle: TextStyle(color: scheme.onSurfaceVariant),
        helperStyle: TextStyle(color: scheme.onSurfaceVariant),
        contentPadding: const EdgeInsets.all(RadarLayout.gutter),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      ),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48), tapTargetSize: MaterialTapTargetSize.padded,
      )),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48), tapTargetSize: MaterialTapTargetSize.padded,
      )),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(
        minimumSize: const Size(48, 48), tapTargetSize: MaterialTapTargetSize.padded,
      )),
      iconButtonTheme: const IconButtonThemeData(style: ButtonStyle(
        minimumSize: WidgetStatePropertyAll(Size(48, 48)),
        tapTargetSize: MaterialTapTargetSize.padded,
      )),
      dialogTheme: DialogThemeData(shape: shape, backgroundColor: scheme.surface),
      pageTransitionsTheme: PageTransitionsTheme(builders: {
        for (final entry in const PageTransitionsTheme().builders.entries)
          entry.key: RadarReducedMotionTransitions(entry.value),
      }),
    );
  }
}

/// Delegate to the platform's existing transition unless motion is reduced.
class RadarReducedMotionTransitions extends PageTransitionsBuilder {
  const RadarReducedMotionTransitions(this.delegate);
  final PageTransitionsBuilder delegate;

  @override
  Widget buildTransitions<T>(PageRoute<T> route, BuildContext context,
      Animation<double> animation, Animation<double> secondaryAnimation, Widget child) {
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) return child;
    return delegate.buildTransitions(route, context, animation, secondaryAnimation, child);
  }
}

