import 'dart:convert';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/screens/preferences.dart';
import 'package:radar_promo_ofertas/screens/stores_coupons.dart';
import 'package:radar_promo_ofertas/services/api.dart';
import 'package:radar_promo_ofertas/services/theme_preference.dart';

OffersApi emptyApi() => OffersApi(client: MockClient((_) async =>
  http.Response('{"offers":[],"total":0,"hasMore":false}', 200)));

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(() => AppThemePreference.mode.value = ThemeMode.system);

  testWidgets('category catalog is available even with no eligible feed offers', (tester) async {
    String? category;
    final api = OffersApi(client: MockClient((request) async {
      if (request.url.queryParameters['catalog'] == '1') {
        return http.Response('{"categories":["Categoria do catálogo"],"stores":["Loja real do teste"],"hasMore":false}', 200);
      }
      category = request.url.queryParameters['category'];
      return http.Response('{"offers":[],"total":0,"hasMore":false}', 200);
    }));
    await tester.pumpWidget(RadarPromoApp(api: api));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Categorias'));
    await tester.pumpAndSettle();
    expect(find.text('Categoria do catálogo'), findsOneWidget);
    await tester.tap(find.text('Categoria do catálogo'));
    await tester.pumpAndSettle();
    expect(category, 'Categoria do catálogo');
    expect(find.text('Nenhuma oferta encontrada agora.'), findsOneWidget);
  });

  testWidgets('five destinations preserve searches and system back behavior', (tester) async {
    await tester.pumpWidget(RadarPromoApp(api: emptyApi()));
    await tester.pumpAndSettle();
    for (final label in ['Início', 'Categorias', 'Cupons', 'Favoritos', 'Perfil']) {
      expect(find.text(label), findsOneWidget);
    }
    await tester.tap(find.text('Perfil'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Buscas salvas e alertas'));
    await tester.pumpAndSettle();
    expect(find.text('Acompanhe o que procura'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Seu perfil'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('coupon tab uses only real loaded coupons and deduplicates offer IDs', (tester) async {
    final offer = Offer.fromJson({'id': 'coupon', 'title': 'Produto com cupom', 'source': 'Loja A', 'couponCode': 'CUPOM-X'});
    final without = Offer.fromJson({'id': 'plain', 'title': 'Sem código', 'source': 'Loja B'});
    String? copied;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'] as String;
        return null;
      });
    addTearDown(() => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(SystemChannels.platform, null));
    await tester.pumpWidget(MaterialApp(home: StoresCouponsScreen(
      offers: [offer, offer, without], initialCouponsOnly: true, onOpen: (_) {},
    )));
    await tester.pumpAndSettle();
    expect(find.text('Loja B'), findsNothing);
    await tester.enterText(find.byType(TextField), 'cupom-x');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Loja A'));
    await tester.pumpAndSettle();
    expect(find.text('Produto com cupom'), findsOneWidget);
    await tester.tap(find.byTooltip('Copiar cupom'));
    await tester.pumpAndSettle();
    expect(copied, 'CUPOM-X');
    expect(find.textContaining('Confira a validade na loja.'), findsOneWidget);
  });

  testWidgets('favorites search does not change the feed query or send requests', (tester) async {
    var requests = 0;
    SharedPreferences.setMockInitialValues({'saved_offers': [jsonEncode(Offer.fromJson(
      {'id': 'saved', 'title': 'Produto salvo'}).toJson())]});
    final api = OffersApi(client: MockClient((request) async {
      if (request.url.queryParameters['catalog'] != '1') requests++;
      return http.Response('{"offers":[],"total":0,"hasMore":false}', 200);
    }));
    await tester.pumpWidget(RadarPromoApp(api: api));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'celular');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Favoritos'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'salvo');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Início'));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byType(TextField).first).controller!.text, 'celular');
    expect(requests, 2);
  });

  testWidgets('saved search has a delete action without requiring a swipe', (tester) async {
    SharedPreferences.setMockInitialValues({'saved_searches': ['notebook']});
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SavedSearchesScreen(onSearch: (_) {}))));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Opções da busca'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Excluir busca'));
    await tester.pumpAndSettle();
    expect((await SharedPreferences.getInstance()).getStringList('saved_searches'), isEmpty);
    expect(find.text('notebook'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  for (final mode in [ThemeMode.light, ThemeMode.dark]) {
    for (final size in [const Size(320, 900), const Size(640, 360), const Size(1024, 768)]) {
      testWidgets('all destinations fit $size at 200 percent text in $mode', (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        AppThemePreference.mode.value = mode;
        await tester.pumpWidget(RadarPromoApp(api: emptyApi(), builder: (context, child) =>
          MediaQuery(data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(2)), child: child!)));
        await tester.pumpAndSettle();
        for (final label in ['Categorias', 'Cupons', 'Favoritos', 'Perfil', 'Início']) {
          await tester.tap(find.text(label));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull, reason: '$label / $size / $mode');
        }
      });
    }
  }
}
