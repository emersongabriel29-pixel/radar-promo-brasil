import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/services/api.dart';
import 'package:radar_promo_ofertas/services/theme_preference.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    AppThemePreference.mode.value = ThemeMode.light;
  });

  testWidgets('feed displays a fetched offer and can save it', (tester) async {
    final api = OffersApi(client: MockClient((request) async {
      return http.Response(jsonEncode({
        'offers': [
          {
            'id': 'offer-test-1',
            'title': 'Produto para teste',
            'source': 'Loja de teste',
            'currentPrice': 49.90,
            'affiliateUrl': 'https://example.com/offer'
          }
        ],
        'total': 1,
        'hasMore': false
      }), 200);
    }));

    await tester.pumpWidget(RadarPromoApp(api: api));
    await tester.pumpAndSettle();
    expect(find.text('Produto para teste'), findsWidgets);
    expect(find.text('Loja de teste'), findsWidgets);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('feed handles an upstream failure without crashing', (tester) async {
    final api = OffersApi(client: MockClient((_) async =>
        http.Response('Service unavailable', 503)));
    await tester.pumpWidget(RadarPromoApp(api: api));
    await tester.pumpAndSettle();
    expect(find.text('Não conseguimos carregar as ofertas'), findsOneWidget);
  });
}
