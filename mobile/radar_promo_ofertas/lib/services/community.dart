import 'package:url_launcher/url_launcher.dart';

typedef CommunityOpener = Future<bool> Function(Uri uri, LaunchMode mode);

/// Hosted account screens own the session; no cookie or token enters Dart.
class CommunityLinks {
  const CommunityLinks({this.opener});
  final CommunityOpener? opener;

  static Uri destination(String section, {String? offerId}) {
    if (!const ['account', 'offer', 'inbox'].contains(section)) {
      throw ArgumentError.value(section, 'section');
    }
    if (section == 'offer' &&
        (offerId == null ||
            !RegExp(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$').hasMatch(offerId))) {
      throw ArgumentError.value(offerId, 'offerId');
    }
    return Uri.https('radar-promo-ofertas.hatchable.site', '/community.html', {
      'section': section,
      if (section == 'offer') 'offerId': offerId!,
    });
  }

  Future<bool> open(String section, {String? offerId}) async {
    final uri = destination(section, offerId: offerId);
    if (opener != null) return opener!(uri, LaunchMode.inAppBrowserView);
    return launchUrl(uri, mode: LaunchMode.inAppBrowserView);
  }
}
