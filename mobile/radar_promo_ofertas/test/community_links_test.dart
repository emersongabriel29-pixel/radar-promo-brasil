import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/services/community.dart';
import 'package:url_launcher/url_launcher.dart';

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

  test('submission route opens the dedicated hosted form', () {
    final uri = CommunityLinks.destination('submit');
    expect(uri.scheme, 'https');
    expect(uri.host, 'radar-promo-ofertas.hatchable.site');
    expect(uri.path, '/submit-offer.html');
    expect(uri.queryParameters['section'], 'submit');
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
  test('hosted authentication opens in an in-app browser without tokens in URLs', () async {
    Uri? requested;
    LaunchMode? mode;
    final links = CommunityLinks(opener: (uri, selectedMode) async {
      requested = uri;
      mode = selectedMode;
      return true;
    });
    expect(await links.open('account'), isTrue);
    expect(mode, LaunchMode.inAppBrowserView);
    expect(requested!.scheme, 'https');
    expect(requested!.host, 'radar-promo-ofertas.hatchable.site');
    expect(requested!.queryParameters.keys, isNot(contains('token')));
    expect(requested!.queryParameters.keys, isNot(contains('password')));
  });

}
