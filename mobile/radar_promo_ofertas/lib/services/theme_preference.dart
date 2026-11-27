// Flutter 3.50 deprecates this import; retain compatibility with the pinned app dependencies.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Theme preference is local to this device.
class AppThemePreference {
  static const key = 'app_theme_mode';
  static final mode = ValueNotifier<ThemeMode>(ThemeMode.system);

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    mode.value = fromValue(prefs.getString(key));
  }

  static ThemeMode fromValue(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String toValue(ThemeMode value) {
    switch (value) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  static Future<void> setMode(ThemeMode value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, toValue(value));
    mode.value = value;
  }
}
