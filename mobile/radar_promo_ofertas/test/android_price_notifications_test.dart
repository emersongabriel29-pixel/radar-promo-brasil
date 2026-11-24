import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/services/android_price_notifications.dart';
import 'package:radar_promo_ofertas/services/price_alerts.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('br.com.radarpromo/notifications');
  final calls = <MethodCall>[];
  bool permission = true;

  setUp(() {
    calls.clear();
    permission = true;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      calls.add(call);
      if (call.method == 'requestPermission') return permission;
      if (call.method == 'showPriceAlert') return true;
      return null;
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  const offer = Offer(
    id: 'offer-1',
    title: 'Fone Bluetooth',
    source: 'Loja',
    currentPrice: 39.9,
    originalPrice: 80,
    imageUrl: '',
    affiliateUrl: 'https://example.com/item',
    discountPercent: 50,
    category: 'Eletronicos',
    couponCode: '',
    createdAt: null,
  );

  test('displays Android notification after permission', () async {
    final sent = await AndroidPriceNotifications.show(
      [const PriceAlert('fone', offer)],
    );
    expect(sent.length, 1);
    expect(calls.map((call) => call.method),
        ['requestPermission', 'showPriceAlert']);
    final payload = calls.last.arguments as Map;
    expect(payload['title'], contains('fone'));
    expect(payload['body'], contains('39.90'));
  });

  test('does not notify when permission is denied', () async {
    permission = false;
    final sent = await AndroidPriceNotifications.show(
      [const PriceAlert('fone', offer)],
    );
    expect(sent, isEmpty);
    expect(calls.map((call) => call.method), ['requestPermission']);
  });

  test('does not request permission without alerts', () async {
    expect(await AndroidPriceNotifications.show([]), 0);
    expect(calls, isEmpty);
  });
}
