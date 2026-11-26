import 'package:flutter_test/flutter_test.dart';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:radar_promo_ofertas/services/community.dart';
import 'package:radar_promo_ofertas/main.dart';
import 'package:radar_promo_ofertas/models/offer.dart';

void main() {
  test('community destinations stay on the official HTTPS host', () async {
    Uri? opened;
    LaunchMode? mode;
    final links = CommunityLinks(opener: (uri, launchMode) async {
      opened = uri;
      mode = launchMode;
      return true;
    });
    await links.open('offer', offerId: 'offer:123');
    expect(opened!.scheme, 'https');
    expect(opened!.host, 'radar-promo-ofertas.hatchable.site');
    expect(opened!.queryParameters['offerId'], 'offer:123');
    expect(mode, LaunchMode.inAppBrowserView);
    expect(() => CommunityLinks.destination('https://evil.test'), throwsArgumentError);
    expect(() => CommunityLinks.destination('offer', offerId: '//evil.test'), throwsArgumentError);
  });
  testWidgets('offer conversation opens the actual offer and handles launch failure', (tester) async {
    String? requested;
    final links = CommunityLinks(opener: (uri, _) async {
      requested = uri.queryParameters['offerId'];
      return false;
    });
    await tester.pumpWidget(MaterialApp(home: OfferDetailScreen(
      offer: Offer.fromJson({'id':'real-route','title':'Oferta de teste local'}),
      isFavorite:false, onFavorite:(){}, community:links,
    )));
    await tester.scrollUntilVisible(
      find.text('Votos e comentários'), 200,
      scrollable: find.byWidgetPredicate(
        (widget) => widget is Scrollable && widget.axisDirection == AxisDirection.down,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Votos e comentários'));
    await tester.pumpAndSettle();
    expect(requested, 'real-route');
    expect(find.textContaining('Não foi possível abrir sua conta.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
