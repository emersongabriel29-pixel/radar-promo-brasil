import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/screens/preferences.dart';
import 'package:radar_promo_ofertas/services/api.dart';
import 'package:radar_promo_ofertas/services/theme_preference.dart';

const capture = bool.fromEnvironment('CAPTURE_AUDIT');
const fixture = {'id':'visual-fixture','title':'Produto de teste visual', 'source':'Loja de teste',
  'currentPrice':80,'originalPrice':100,'couponCode':'TESTE20','category':'Categoria de teste',
  'affiliateUrl':'https://example.invalid/product?subid=visual-test'};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    if (!capture) return;
    final sdk = Platform.environment['FLUTTER_ROOT'];
    if (sdk == null) throw StateError('Flutter SDK path required for reproducible captures');
    final loader = FontLoader('Roboto');
    for (final name in ['Roboto-Regular.ttf','Roboto-Bold.ttf']) {
      final file = File('$sdk/bin/cache/artifacts/material_fonts/$name');
      loader.addFont(file.readAsBytes().then((bytes) => ByteData.sublistView(bytes)));
    }
    await loader.load();
    final icons = FontLoader('MaterialIcons');
    icons.addFont(File('$sdk/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf').readAsBytes().then((bytes) => ByteData.sublistView(bytes)));
    await icons.load();
  });

  for (final mode in [ThemeMode.light, ThemeMode.dark]) {
    testWidgets('record actual widget routes with labeled fixture data in $mode', (tester) async {
      tester.view.physicalSize = const Size(393, 852);
      tester.view.devicePixelRatio = 1;
      final semantics = tester.ensureSemantics();
      addTearDown(semantics.dispose);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(() => AppThemePreference.mode.value = ThemeMode.system);
      SharedPreferences.setMockInitialValues({'saved_offers':[jsonEncode(fixture)], 'saved_searches':['teste visual']});
      AppThemePreference.mode.value = mode;
      final boundary = GlobalKey();
      final names = <String>[];
      Future<void> record(String name) async {
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline), reason: '$mode/$name Android touch targets');
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline), reason: '$mode/$name labeled controls');
        await expectLater(tester, meetsGuideline(textContrastGuideline), reason: '$mode/$name text contrast');
        names.add(name);
        if (!capture) return;
        await tester.runAsync(() async {
          final render = boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
          final image = await render.toImage(pixelRatio: 1);
          try {
            final data = await image.toByteData(format: ui.ImageByteFormat.png);
            final output = File('build/audit_visual_evidence/${mode.name}-$name.png');
            await output.parent.create(recursive: true);
            await output.writeAsBytes(data!.buffer.asUint8List());
            expect(image.width, 393);
            expect(image.height, 852);
          } finally { image.dispose(); }
        });
        expect(tester.takeException(), isNull);
      }
      final api = OffersApi(client: MockClient((request) async => http.Response(jsonEncode(
        request.url.queryParameters['catalog']=='1'
          ? {'categories':['Categoria de teste'],'stores':['Loja de teste'],'hasMore':false}
          : {'offers':[fixture],'total':1,'hasMore':false}),200)));
      await tester.pumpWidget(RadarPromoApp(api:api, builder:(context, child) => RepaintBoundary(key:boundary,child:child!)));
      await record('feed');
      for (final entry in {'Categorias':'categories','Cupons':'coupons','Favoritos':'favorites','Perfil':'profile'}.entries) {
        await tester.tap(find.text(entry.key));
        await record(entry.value);
      }
      await tester.tap(find.text('Buscas salvas e alertas'));
      await record('saved-searches');
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      // Additional pages use the same production widgets and theme.
      final context = tester.element(find.byType(NavigationBar));
      Navigator.of(context).push(MaterialPageRoute<void>(builder:(_) => OfferDetailScreen(
        offer:Offer.fromJson(fixture),isFavorite:true,onFavorite:(){},
      )));
      await record('details');
      Navigator.of(tester.element(find.byType(OfferDetailScreen))).pop();
      await tester.pumpAndSettle();
      Navigator.of(tester.element(find.byType(NavigationBar))).push(MaterialPageRoute<void>(builder:(_) => const PreferencesScreen()));
      await record('preferences');
      Navigator.of(tester.element(find.byType(PreferencesScreen))).pop();
      await tester.pumpAndSettle();
      Navigator.of(tester.element(find.byType(NavigationBar))).push(MaterialPageRoute<void>(builder:(_) => const PrivacyScreen()));
      await record('privacy');
      expect(names.length,9);
      if (capture) {
        await tester.runAsync(() async {
          await File('build/audit_visual_evidence/${mode.name}-manifest.json').writeAsString(jsonEncode({
            'kind':'flutter-widget-render','real_device':false,'production_data':false,
            'fixture':'explicit test product/store/coupon, no real marketplace offer',
            'font':'Roboto from pinned Flutter SDK','source_commit':Platform.environment['GITHUB_SHA'],
            'size':[393,852],'theme':mode.name,'screens':names,
          }));
        });
      }
    });
  }
}
