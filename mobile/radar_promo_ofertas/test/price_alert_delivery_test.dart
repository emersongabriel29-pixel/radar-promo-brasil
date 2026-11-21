import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/services/price_alerts.dart';

void main() {
  const offer = Offer(
    id: 'offer-1',
    title: 'Notebook promoção',
    source: 'Loja',
    currentPrice: 100,
    originalPrice: 150,
    imageUrl: '',
    affiliateUrl: 'https://example.com/item',
    discountPercent: 33,
    category: 'Tecnologia',
    couponCode: '',
    createdAt: null,
  );

  setUp(() {
    SharedPreferences.setMockInitialValues({
      'saved_searches': <String>['notebook'],
      'saved_search_target_prices': '{"notebook":120}',
    });
  });

  test('denied permission does not consume a pending alert', () async {
    final first = await PriceAlerts.check([offer]);
    expect(first, hasLength(1));
    final second = await PriceAlerts.check([offer]);
    expect(second, hasLength(1));
    expect(second.single.deduplicationKey, first.single.deduplicationKey);
  });

  test('delivered notification is deduplicated after confirmation', () async {
    final pending = await PriceAlerts.check([offer]);
    await PriceAlerts.markDelivered(pending);
    expect(await PriceAlerts.check([offer]), isEmpty);
  });

  test('marking no delivered alerts leaves matches pending', () async {
    final pending = await PriceAlerts.check([offer]);
    await PriceAlerts.markDelivered(const []);
    expect(await PriceAlerts.check([offer]), hasLength(pending.length));
  });
}
