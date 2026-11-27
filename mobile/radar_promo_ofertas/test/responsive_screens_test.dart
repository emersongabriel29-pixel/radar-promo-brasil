// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/design/radar_theme.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/screens/preferences.dart';
import 'package:radar_promo_ofertas/screens/stores_coupons.dart';

void main() {
  for (final theme in [RadarTheme.light, RadarTheme.dark]) {
    for (final size in [const Size(320,900), const Size(640,360), const Size(1024,768)]) {
      testWidgets('all secondary screens support $size at 200 percent in ${theme.brightness}', (tester) async {
        tester.view.physicalSize=size;
        tester.view.devicePixelRatio=1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        SharedPreferences.setMockInitialValues({'saved_searches':['Produto com uma busca salva extensa para testar leitura']});
        final offer=Offer.fromJson({'id':'layout','title':'Nome de produto longo para verificar quebra de texto',
          'source':'Loja do teste','couponCode':'CODIGODECUPOMLONGO','currentPrice':1234.56,'originalPrice':2345.67});
        for (final page in <Widget>[
          OfferDetailScreen(offer:offer,isFavorite:false,onFavorite:(){}),
          StoresCouponsScreen(offers:[offer],onOpen:(_){}),
          const PreferencesScreen(), const PrivacyScreen(),
          Scaffold(body:SavedSearchesScreen(onSearch:(_){})),
        ]) {
          await tester.pumpWidget(MaterialApp(theme:theme,
            builder:(context,child)=>MediaQuery(data:MediaQuery.of(context).copyWith(
              textScaler:const TextScaler.linear(2),disableAnimations:true),child:child!), home:page));
          await tester.pumpAndSettle();
          expect(tester.takeException(),isNull,reason:'${page.runtimeType} / $size / ${theme.brightness}');
        }
      });
    }
  }
}
