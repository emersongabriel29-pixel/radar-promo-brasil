import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:radar_promo_ofertas/services/api.dart';
import 'package:radar_promo_ofertas/models/offer.dart';

void main() {
  test(
    'decimal prices and saved offers round trip without losing affiliate parameters',
    () {
      final offer = Offer.fromJson({
        'id': 'a',
        'title': 'Produto',
        'currentPrice': '12.90',
        'originalPrice': '20.00',
        'affiliateUrl': 'https://loja.example/p?aff=123&campaign=abc',
      });
      expect(offer.currentPrice, 12.9);
      expect(offer.hasValidLink, true);
      expect(Offer.fromJson(offer.toJson()).affiliateUrl, offer.affiliateUrl);
      expect(
        Offer.fromJson({'affiliateUrl': 'javascript:alert(1)'}).hasValidLink,
        false,
      );
    },
  );
  test('feed uses server pagination and encodes filter text', () async {
    final api = OffersApi(
      client: MockClient((request) async {
        expect(request.url.host, 'runnmpzkomcdawwzuift.supabase.co');
        expect(request.url.path, '/functions/v1/radar-offers-feed');
        expect(request.url.queryParameters['page'], '2');
        expect(request.url.queryParameters['q'], 'café & leite');
        expect(request.headers.containsKey('Authorization'), false);
        return http.Response(
          jsonEncode({
            'total': 31,
            'hasMore': true,
            'offers': [
              {'id': 'a', 'currentPrice': '20.50'},
            ],
          }),
          200,
        );
      }),
    );
    final result = await api.getOffers(page: 2, query: 'café & leite');
    expect(result.offers.single.currentPrice, 20.5);
    expect(result.hasMore, true);
  });
  test(
    'HTML sign in page is rejected instead of appearing as empty feed',
    () async {
      final api = OffersApi(
        client: MockClient(
          (_) async => http.Response('<html>Login</html>', 200),
        ),
      );
      await expectLater(api.getOffers(), throwsException);
    },
  );
  test(
    'quota error is translated without exposing infrastructure internals',
    () async {
      final api = OffersApi(
        client: MockClient(
          (_) async => http.Response('{"error":"internal quota data"}', 429),
        ),
      );
      await expectLater(
        api.getOffers(),
        throwsA(
          predicate(
            (e) =>
                e.toString().contains('limite temporário') &&
                !e.toString().contains('internal'),
          ),
        ),
      );
    },
  );
  test(
    'empty page terminates pagination even for inconsistent upstream flag',
    () async {
      final api = OffersApi(
        client: MockClient(
          (_) async =>
              http.Response('{"offers":[],"total":5,"hasMore":true}', 200),
        ),
      );
      expect((await api.getOffers()).hasMore, false);
    },
  );
}
