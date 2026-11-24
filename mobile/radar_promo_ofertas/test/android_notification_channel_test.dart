import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/services/android_price_notifications.dart';
import 'package:radar_promo_ofertas/services/price_alerts.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('br.com.radarpromo/notifications');

  PriceAlert alert(String id) => PriceAlert(
    'notebook',
    Offer(
      id: id,
      title: 'Notebook $id',
      source: 'Loja',
      currentPrice: 100,
      originalPrice: 150,
      imageUrl: '',
      affiliateUrl: 'https://example.com',
      discountPercent: 33,
      category: 'Tecnologia',
      couponCode: '',
      createdAt: null,
    ),
  );

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('denied permission never posts alerts', () async {
    var posts = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'requestPermission') return false;
      posts++;
      return true;
    });
    expect(await AndroidPriceNotifications.show([alert('1')]), isEmpty);
    expect(posts, 0);
  });

  test('partial platform failure preserves successful deliveries', () async {
    var posts = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'requestPermission') return true;
      posts++;
      if (posts == 2) {
        throw PlatformException(code: 'NOTIFICATION_FAILED');
      }
      return true;
    });
    final delivered = await AndroidPriceNotifications.show([
      alert('1'),
      alert('2'),
      alert('3'),
    ]);
    expect(delivered.map((a) => a.offer.id).toList(), ['1', '3']);
  });
}
