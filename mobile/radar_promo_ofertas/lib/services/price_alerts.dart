import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/offer.dart';
import 'local_price_matches.dart';

/// On-device alerts when the user opens or refreshes the feed.
/// This is deliberately not presented as background push delivery.
class PriceAlert {
  final String query;
  final Offer offer;
  const PriceAlert(this.query, this.offer);
}

class PriceAlerts {
  static const _seenKey = 'price_alert_seen_v1';

  static Future<List<PriceAlert>> check(
    List<Offer> offers, {
    SharedPreferences? preferences,
  }) async {
    final prefs = preferences ?? await SharedPreferences.getInstance();
    final searches = prefs.getStringList('saved_searches') ?? <String>[];
    final muted = (prefs.getStringList('saved_search_muted') ?? <String>[]).toSet();
    final raw = prefs.getString('saved_search_target_prices');
    Map<String, dynamic> limits;
    try {
      final decoded = jsonDecode(raw ?? '{}');
      limits = decoded is Map<String, dynamic> ? decoded : {};
    } catch (_) {
      limits = {};
    }
    final seen = (prefs.getStringList(_seenKey) ?? <String>[]).toSet();
    final found = <PriceAlert>[];
    for (final query in searches) {
      if (muted.contains(query)) continue;
      final limit = limits[query];
      if (limit is! num || !limit.isFinite || limit <= 0) continue;
      for (final offer in LocalPriceMatches.find(
        offers,
        query: query,
        maximumPrice: limit.toDouble(),
      )) {
        final key = '${query.toLowerCase()}:${offer.id}:${offer.currentPrice}';
        if (seen.add(key)) found.add(PriceAlert(query, offer));
      }
    }
    if (found.isNotEmpty) {
      // Limit retained history so local storage cannot grow indefinitely.
      await prefs.setStringList(_seenKey, seen.toList().reversed.take(500).toList());
    }
    return found;
  }
}
