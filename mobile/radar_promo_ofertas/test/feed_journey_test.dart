import 'dart:async';
import 'dart:convert';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/services/api.dart';

Finder get vertical => find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down);
void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('offer opening preserves affiliate URL and blocks duplicate taps', (tester) async {
    const link = 'https://example.invalid/p?aff=123&subid=a%2Fb&utm_source=radar';
    final pending = Completer<bool>();
    var calls = 0;
    await tester.pumpWidget(MaterialApp(home: OfferDetailScreen(
      offer: Offer.fromJson({'id':'a','title':'Teste de link','affiliateUrl':link}),
      isFavorite:false, onFavorite:(){}, offerOpener:(uri, mode) {
        calls++;
        expect(uri.toString(), link);
        expect(mode, LaunchMode.externalApplication);
        return pending.future;
      },
    )));
    await tester.tap(find.text('IR PARA A OFERTA'));
    await tester.pump();
    expect(find.text('ABRINDO LOJA...'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byWidgetPredicate((w) => w is FilledButton)).onPressed, isNull);
    expect(calls, 1);
    pending.complete(false);
    await tester.pumpAndSettle();
    expect(find.textContaining('Não foi possível abrir a loja.'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byWidgetPredicate((w) => w is FilledButton)).onPressed, isNotNull);
  });

  testWidgets('unsafe offer destination stays disabled', (tester) async {
    await tester.pumpWidget(MaterialApp(home: OfferDetailScreen(
      offer: Offer.fromJson({'id':'a','affiliateUrl':'javascript:alert(1)'}),
      isFavorite:false, onFavorite:(){}, offerOpener:(_,__) async => throw StateError('must not open'),
    )));
    expect(tester.widget<FilledButton>(find.byWidgetPredicate((w) => w is FilledButton)).onPressed, isNull);
  });

  testWidgets('paginated feed consolidates duplicate IDs without losing tracking', (tester) async {
    final requested = <String>[];
    final api=OffersApi(client:MockClient((request) async {
      if(request.url.queryParameters['catalog']=='1') return http.Response('{"categories":[],"stores":[],"hasMore":false}',200);
      final page=request.url.queryParameters['page']!; requested.add(page);
      return http.Response(jsonEncode({'offers':[
        {'id':'a','title':'Primeiro produto','affiliateUrl':'https://example.invalid/a?subid=keep'},
        if(page=='2') {'id':'b','title':'Segundo produto'},
      ],'total':2,'hasMore':page=='1'}),200);
    }));
    await tester.pumpWidget(RadarPromoApp(api:api));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Carregar mais ofertas'),250,scrollable:vertical);
    await tester.tap(find.text('Carregar mais ofertas'));
    await tester.pumpAndSettle();
    expect(requested,['1','2']);
    expect(find.byWidgetPredicate((w) => w is OfferCard && w.offer.id == 'a'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Segundo produto'),150,scrollable:vertical);
    expect(find.text('Segundo produto'),findsOneWidget);
    expect(find.text('Carregar mais ofertas'),findsNothing);
    final prefs=await SharedPreferences.getInstance();
    final cache=prefs.getStringList('last_real_offers_v1')!;
    expect(Offer.fromJson(jsonDecode(cache.first) as Map<String,dynamic>).affiliateUrl,
      'https://example.invalid/a?subid=keep');
  });

  testWidgets('offline cache is clearly marked as potentially stale', (tester) async {
    SharedPreferences.setMockInitialValues({'last_real_offers_v1':[
      jsonEncode(Offer.fromJson({'id':'cached','title':'Cópia local de teste','currentPrice':10}).toJson()),
    ]});
    final api=OffersApi(client:MockClient((_) async=>http.Response('{}',503)));
    await tester.pumpWidget(RadarPromoApp(api:api));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.textContaining('preços e disponibilidade podem estar desatualizados.'),150,scrollable:vertical);
    expect(find.textContaining('preços e disponibilidade podem estar desatualizados.'),findsOneWidget);
    await tester.scrollUntilVisible(find.text('Cópia local de teste'),150,scrollable:vertical);
    expect(find.text('Cópia local de teste'),findsOneWidget);
    expect(tester.takeException(),isNull);
  });
}
