import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/models/offer.dart';
import 'package:radar_promo_ofertas/services/local_price_matches.dart';

void main() {
  Offer offer(String id, String title, String source, dynamic price) =>
      Offer.fromJson({
        'id': id,
        'title': title,
        'source': source,
        'currentPrice': price,
      });

  test('matches by title or store and respects maximum price', () {
    final matches = LocalPriceMatches.find([
      offer('1', 'Fone bluetooth', 'Loja A', 89),
      offer('2', 'Fone com fio', 'Loja B', 110),
      offer('3', 'Teclado', 'Fone Store', 59),
      offer('4', 'Mouse', 'Outra', 25),
    ], query: 'fone', maximumPrice: 100);
    expect(matches.map((o) => o.id).toList(), ['3', '1']);
  });

  test('ignores missing prices, duplicate IDs and invalid limits', () {
    final offers = [
      offer('a', 'Notebook', 'Loja', 0),
      offer('b', 'Notebook', 'Loja', 200),
      offer('b', 'Notebook novo', 'Loja', 150),
    ];
    expect(LocalPriceMatches.find(offers, query: 'notebook', maximumPrice: 175)
        .single.currentPrice, 150);
    expect(LocalPriceMatches.find(offers, query: '', maximumPrice: 100), isEmpty);
    expect(LocalPriceMatches.find(offers, query: 'notebook', maximumPrice: -1), isEmpty);
  });
}
