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

  String get deduplicationKey => '${query.toLowerCase()}:${offer.id}:${offer.currentPrice}';
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
        final alert = PriceAlert(query, offer);
        if (!seen.contains(alert.deduplicationKey)) found.add(alert);
      }
    }
    return found;
  }

  /// Only mark notifications actually accepted by Android as delivered.
  /// A denied permission or platform failure must leave them retryable.
  static Future<void> markDelivered(
    Iterable<PriceAlert> delivered, {
    SharedPreferences? preferences,
  }) async {
    final prefs = preferences ?? await SharedPreferences.getInstance();
    final seen = (prefs.getStringList(_seenKey) ?? <String>[]).toSet();
    var changed = false;
    for (final alert in delivered) {
      changed = seen.add(alert.deduplicationKey) || changed;
    }
    if (changed) {
      await prefs.setStringList(_seenKey, seen.toList().reversed.take(500).toList());
    }
  }
}
