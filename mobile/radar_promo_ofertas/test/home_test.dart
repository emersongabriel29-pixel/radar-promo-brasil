import 'dart:convert';
// Keep the test compatible with the app's supported Flutter Material facade.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/services/api.dart';
import 'package:radar_promo_ofertas/models/offer.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  testWidgets('saved offers remain visible when the live feed is unavailable', (
    tester,
  ) async {
    final offer = Offer.fromJson({
      'id': 'saved',
      'title': 'Cafeteira salva',
      'currentPrice': '99.90',
    });
    SharedPreferences.setMockInitialValues({
      'favorites': ['saved'],
      'saved_offers': [jsonEncode(offer.toJson())],
    });
    final api = OffersApi(
      client: MockClient((_) async => http.Response('{}', 429)),
    );
    await tester.pumpWidget(MaterialApp(home: HomeScreen(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Salvos'));
    await tester.pumpAndSettle();
    expect(find.text('Cafeteira salva'), findsOneWidget);
    expect(find.text('Carregar mais ofertas'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'bottom navigation reaches searches and privacy on narrow screens',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = OffersApi(
        client: MockClient(
          (_) async =>
              http.Response('{"offers":[],"total":0,"hasMore":false}', 200),
        ),
      );
      await tester.pumpWidget(MaterialApp(home: HomeScreen(api: api)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Buscas'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'notebook');
      await tester.tap(find.byTooltip('Salvar busca'));
      await tester.pumpAndSettle();
      expect(find.text('notebook'), findsOneWidget);
      await tester.tap(find.text('Sobre'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Privacidade'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Privacidade'));
      await tester.pumpAndSettle();
      expect(find.text('Você controla seus dados'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('favorite button updates in offer detail', (tester) async {
    var taps = 0;
    final offer = Offer.fromJson({'id': 'one', 'title': 'Oferta teste'});
    await tester.pumpWidget(
      MaterialApp(
        home: OfferDetailScreen(
          offer: offer,
          isFavorite: false,
          onFavorite: () => taps++,
        ),
      ),
    );
    expect(find.byIcon(Icons.bookmark_border), findsOneWidget);
    await tester.tap(find.byTooltip('Salvar oferta'));
    await tester.pump();
    expect(find.byIcon(Icons.bookmark), findsOneWidget);
    expect(taps, 1);
  });
}
