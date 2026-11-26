import 'dart:convert';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/offer_image.dart';
import 'package:radar_promo_ofertas/services/api.dart';
import 'package:radar_promo_ofertas/services/theme_preference.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(() => AppThemePreference.mode.value = ThemeMode.system);

  test('savings use valid prices and preserve upstream data and tracking', () {
    final offer = Offer.fromJson({'id': 'a', 'currentPrice': 80,
      'originalPrice': 100, 'discountPercent': 95,
      'affiliateUrl': 'https://example.com/p?aff=x&subid=a%2Fb'});
    expect(offer.savingsAmount, 20);
    expect(offer.savingsPercent, 20);
    expect(offer.discountPercent, 95);
    expect(Offer.fromJson(offer.toJson()).affiliateUrl, offer.affiliateUrl);
    for (final prices in [<num>[0, 100], <num>[100, 80], <num>[80, 0]]) {
      final invalid = Offer.fromJson({'currentPrice': prices[0], 'originalPrice': prices[1]});
      expect(invalid.savingsAmount, 0);
      expect(invalid.savingsPercent, 0);
    }
  });

  for (final mode in [ThemeMode.light, ThemeMode.dark]) {
    testWidgets('search surface and clear label respect $mode', (tester) async {
      AppThemePreference.mode.value = mode;
      final api = OffersApi(client: MockClient((_) async =>
          http.Response(jsonEncode({'offers': [], 'total': 0, 'hasMore': false}), 200)));
      await tester.pumpWidget(RadarPromoApp(api: api));
      await tester.pumpAndSettle();
      final field = tester.widget<TextField>(find.byType(TextField).first);
      final colors = Theme.of(tester.element(find.byType(TextField).first)).colorScheme;
      expect(field.decoration!.fillColor, colors.surface);
      expect(find.byTooltip('Limpar busca'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('card favorite keeps 48 dp target and accessible name', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: OfferCard(
      offer: Offer.fromJson({'id': 'a', 'title': 'Produto', 'currentPrice': 19}),
      favorite: false, onFavorite: () {}, onTap: () {},
    ))));
    final size = tester.getSize(find.byTooltip('Salvar oferta'));
    expect(size.width, greaterThanOrEqualTo(48));
    expect(size.height, greaterThanOrEqualTo(48));
  });

  testWidgets('missing image is explicit and does not request an unsafe URL', (tester) async {
    await tester.pumpWidget(MaterialApp(home: SizedBox(width: 200, height: 200,
      child: OfferImage(offer: Offer.fromJson({'imageUrl': 'http://example.com/p.png'})))));
    expect(find.byType(Image), findsNothing);
    expect(find.byIcon(Icons.shopping_bag_outlined), findsOneWidget);
  });

  testWidgets('offer action remains reachable before scrolling', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(home: OfferDetailScreen(
      offer: Offer.fromJson({'id': 'a', 'title': 'Produto',
        'affiliateUrl': 'https://example.com/p?subid=preservado'}),
      isFavorite: false, onFavorite: () {},
    )));
    expect(find.text('IR PARA A OFERTA').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
