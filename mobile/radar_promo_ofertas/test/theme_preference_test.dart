import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/services/theme_preference.dart';

void main() {
  test('theme preference parses known and unknown values', () {
    expect(AppThemePreference.fromValue('light'), ThemeMode.light);
    expect(AppThemePreference.fromValue('dark'), ThemeMode.dark);
    expect(AppThemePreference.fromValue('system'), ThemeMode.system);
    expect(AppThemePreference.fromValue(null), ThemeMode.system);
    expect(AppThemePreference.fromValue('unexpected'), ThemeMode.system);
  });

  test('theme preference serializes modes', () {
    expect(AppThemePreference.toValue(ThemeMode.light), 'light');
    expect(AppThemePreference.toValue(ThemeMode.dark), 'dark');
    expect(AppThemePreference.toValue(ThemeMode.system), 'system');
  });
}
