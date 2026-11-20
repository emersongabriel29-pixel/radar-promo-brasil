import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/services/price_alerts.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const offer = Offer(
    id: 'one',
    title: 'Fone bluetooth',
    source: 'Loja',
    currentPrice: 49,
    originalPrice: 90,
    imageUrl: '',
    affiliateUrl: 'https://example.com/item',
    discountPercent: 45,
    category: 'eletronicos',
    couponCode: '',
  );

  test('alerts once per matching offer and price', () async {
    SharedPreferences.setMockInitialValues({
      'saved_searches': <String>['fone'],
      'saved_search_target_prices': jsonEncode({'fone': 50}),
    });
    final prefs = await SharedPreferences.getInstance();
    expect((await PriceAlerts.check([offer], preferences: prefs)).length, 1);
    expect(await PriceAlerts.check([offer], preferences: prefs), isEmpty);
  });

  test('muted searches do not notify', () async {
    SharedPreferences.setMockInitialValues({
      'saved_searches': <String>['fone'],
      'saved_search_muted': <String>['fone'],
      'saved_search_target_prices': jsonEncode({'fone': 50}),
    });
    final prefs = await SharedPreferences.getInstance();
    expect(await PriceAlerts.check([offer], preferences: prefs), isEmpty);
  });

  test('invalid price configuration is ignored', () async {
    SharedPreferences.setMockInitialValues({
      'saved_searches': <String>['fone'],
      'saved_search_target_prices': '{invalid',
    });
    final prefs = await SharedPreferences.getInstance();
    expect(await PriceAlerts.check([offer], preferences: prefs), isEmpty);
  });
}
