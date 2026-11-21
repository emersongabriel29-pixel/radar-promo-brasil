import '../models/offer.dart';

/// On-device matches against feed pages already loaded, not a background alert.
class LocalPriceMatches {
  static List<Offer> find(
    List<Offer> offers, {
    required String query,
    required double maximumPrice,
  }) {
    final term = query.trim().toLowerCase();
    if (term.isEmpty || !maximumPrice.isFinite || maximumPrice <= 0) {
      return const [];
    }
    final found = <String, Offer>{};
    for (final offer in offers) {
      if (offer.id.isEmpty || !offer.hasPrice || offer.currentPrice > maximumPrice) {
        continue;
      }
      if (!'${offer.title} ${offer.source}'.toLowerCase().contains(term)) {
        continue;
      }
      found[offer.id] = offer;
    }
    return found.values.toList()
      ..sort((a, b) => a.currentPrice.compareTo(b.currentPrice));
  }
}
