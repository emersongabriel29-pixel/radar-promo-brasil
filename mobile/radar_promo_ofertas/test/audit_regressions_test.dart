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
import 'package:radar_promo_ofertas/screens/app_version.dart';
import 'package:radar_promo_ofertas/services/api.dart';

void main() {
  const channel = MethodChannel('br.com.radarpromo/app_info');
  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(() => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(channel, null));

  test('invalid numeric data and absent dates never invent a price or timestamp', () {
    final offer = Offer.fromJson({'id':'one','currentPrice':'NaN','originalPrice':'Infinity','discountPercent':'NaN'});
    expect(offer.hasPrice, false);
    expect(offer.discountPercent, 0);
    expect(offer.createdAt, isNull);
    expect(Offer.fromJson(jsonDecode(jsonEncode(offer.toJson()))).createdAt, isNull);
    expect(Offer.fromJson({'discountPercent':150}).discountPercent, 100);
  });
  testWidgets('unknown price and date are explicit in details', (tester) async {
    await tester.pumpWidget(MaterialApp(home: OfferDetailScreen(
      offer:Offer.fromJson({'id':'one','title':'Teste local'}),isFavorite:false,onFavorite:(){},
    )));
    expect(find.text('Preço indisponível'), findsOneWidget);
    expect(find.textContaining('R\$ 0,00'), findsNothing);
    await tester.scrollUntilVisible(find.text('Data indisponível'), 200);
    expect(find.text('Data indisponível'), findsOneWidget);
  });
  testWidgets('about version follows installed package metadata', (tester) async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async => {'version':'9.8.7','build':'654'});
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: InstalledAppVersion())));
    await tester.pumpAndSettle();
    expect(find.text('Versão 9.8.7 (654)'), findsOneWidget);
  });
  testWidgets('categories preserve real names from the loaded feed', (tester) async {
    String? selected;
    final api=OffersApi(client:MockClient((request) async {
      selected=request.url.queryParameters['category'];
      return http.Response(jsonEncode({'offers':[{'id':'one','title':'Teste local','category':'Moda e beleza','currentPrice':19}], 'total':1,'hasMore':false}),200);
    }));
    await tester.pumpWidget(MaterialApp(home:HomeScreen(api:api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Categorias'));
    await tester.pumpAndSettle();
    expect(find.text('Tech & Eletrônicos'), findsNothing);
    await tester.tap(find.text('Moda e beleza'));
    await tester.pumpAndSettle();
    expect(selected,'Moda e beleza');
  });
  testWidgets('narrow screen with large text keeps navigation usable during API failure', (tester) async {
    tester.view.physicalSize=const Size(360,800);
    tester.view.devicePixelRatio=1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api=OffersApi(client:MockClient((_) async=>http.Response('{}',429)));
    await tester.pumpWidget(MaterialApp(
      builder:(context,child)=>MediaQuery(data:MediaQuery.of(context).copyWith(textScaler:const TextScaler.linear(1.8)),child:child!),
      home:HomeScreen(api:api),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Ofertas indisponíveis'),findsOneWidget);
    expect(tester.takeException(),isNull);
    await tester.tap(find.text('Categorias'));
    await tester.pumpAndSettle();
    expect(find.text('As categorias aparecerão quando as ofertas forem carregadas.'),findsOneWidget);
    expect(tester.takeException(),isNull);
  });
}
