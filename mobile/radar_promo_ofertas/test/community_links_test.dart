import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/services/community.dart';

void main() {
  test('account and inbox routes remain on the hosted domain', () {
    for (final section in ['account', 'inbox']) {
      final uri = CommunityLinks.destination(section);
      expect(uri.scheme, 'https');
      expect(uri.host, 'radar-promo-ofertas.hatchable.site');
      expect(uri.path, '/community.html');
      expect(uri.queryParameters['section'], section);
    }
  });

  test('offer route preserves a safe ID', () {
    final uri = CommunityLinks.destination('offer', offerId: 'offer-123:abc');
    expect(uri.queryParameters['offerId'], 'offer-123:abc');
  });

  test('unknown sections and unsafe offer IDs are rejected', () {
    expect(() => CommunityLinks.destination('admin'), throwsArgumentError);
    for (final id in ['', '../admin', 'a&section=account', 'a b', '<script>']) {
      expect(
        () => CommunityLinks.destination('offer', offerId: id),
        throwsArgumentError,
        reason: id,
      );
    }
    expect(() => CommunityLinks.destination('offer'), throwsArgumentError);
  });
}
