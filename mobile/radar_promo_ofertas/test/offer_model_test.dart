import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/models/offer.dart';

void main() {
  test('parses public offer safely and retains affiliate URL', () {
    final offer = Offer.fromJson({
      'id': 'oferta-1',
      'title': 'Produto de teste',
      'source': 'Loja exemplo',
      'currentPrice': '99.90',
      'originalPrice': 149.90,
      'discountPercent': 33,
      'affiliateUrl': 'https://example.com/product?subid=abc',
      'imageUrl': 'https://example.com/image.png',
      'category': 'Tecnologia',
      'couponCode': 'TESTE',
      'createdAt': '2026-11-20T10:00:00Z',
    });
    expect(offer.hasPrice, isTrue);
    expect(offer.hasValidLink, isTrue);
    expect(offer.affiliateUrl, contains('subid=abc'));
    expect(Offer.fromJson(offer.toJson()).id, offer.id);
  });

  test('rejects unsafe affiliate links', () {
    for (final url in [
      'http://example.com',
      'javascript:alert(1)',
      'https://user:pass@example.com',
      'https:///missing-host',
    ]) {
      final offer = Offer.fromJson({'id': '1', 'affiliateUrl': url});
      expect(offer.hasValidLink, isFalse, reason: url);
    }
  });

  test('normalizes invalid prices and discount', () {
    final offer = Offer.fromJson({
      'id': '2',
      'currentPrice': '-20',
      'originalPrice': 'not-a-price',
      'discountPercent': 150,
    });
    expect(offer.hasPrice, isFalse);
    expect(offer.originalPrice, 0);
    expect(offer.discountPercent, 100);
  });
}
