import 'dart:convert';

// Flutter 3.50 deprecates this import; retain compatibility with the pinned app dependencies.
// ignore: deprecated_member_use
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
    final requests = <Map<String, String>>[];
    final api = OffersApi(client: MockClient((request) async {
      requests.add(request.url.queryParameters);
      return http.Response(jsonEncode({
        'offers': [
          {
            'id': 'offer-test-1',
            'title': 'Produto para teste',
            'source': 'Loja de teste',
            'currentPrice': 49.90,
            'category': 'Tecnologia',
            'couponCode': 'RADAR10',
            'affiliateUrl': 'https://example.com/offer'
          }
        ],
        'total': 1,
        'hasMore': false
      }), 200);
    }));

    await tester.pumpWidget(RadarPromoApp(api: api));
    await tester.pumpAndSettle();
    expect(find.byType(ChoiceChip), findsWidgets);
    expect(find.byType(NavigationBar), findsOneWidget);
    await tester.tap(find.text('Tecnologia').first);
    await tester.pumpAndSettle();
    expect(requests.last['category'], 'Tecnologia');
    await tester.ensureVisible(find.text('Produto para teste'));
    await tester.pumpAndSettle();
    expect(find.text('Produto para teste'), findsWidgets);
    expect(find.text('Loja de teste'), findsWidgets);
    expect(find.text('Cupom RADAR10'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.bookmark_border).first);
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.bookmark), findsWidgets);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getStringList('favorites'), contains('offer-test-1'));
  });

  testWidgets('feed handles an upstream failure without crashing', (tester) async {
    final api = OffersApi(client: MockClient((_) async =>
        http.Response('Service unavailable', 503)));
    await tester.pumpWidget(RadarPromoApp(api: api));
    await tester.pumpAndSettle();
    expect(find.text('Não conseguimos carregar as ofertas'), findsOneWidget);
  });
}
