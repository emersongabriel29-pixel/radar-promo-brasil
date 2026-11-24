import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/offer.dart';

class OffersResult {
  final List<Offer> offers;
  final int total;
  final bool hasMore;
  const OffersResult(this.offers, this.total, this.hasMore);
}

class OffersApi {
  // This endpoint is public. Server integration credentials never enter the APK.
  static const baseUrl =
      'https://radar-promo-ofertas.hatchable.site/api/offers';
  final http.Client? client;
  OffersApi({this.client});

  Future<OffersResult> getOffers({
    int page = 1,
    String query = '',
    String category = '',
    String sort = 'recent',
  }) async {
    final uri = Uri.parse(baseUrl).replace(
      queryParameters: {
        'page': '$page',
        'limit': '30',
        if (query.isNotEmpty) 'q': query,
        if (category.isNotEmpty) 'category': category,
        'sort': sort,
      },
    );
    late http.Response response;
    try {
      response =
          await (client?.get(uri, headers: {'Accept': 'application/json'}) ??
                  http.get(uri, headers: {'Accept': 'application/json'}))
              .timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw Exception(
        'A conexão demorou mais que o esperado. Tente novamente.',
      );
    } on http.ClientException {
      throw Exception(
        'Não foi possível conectar. Verifique sua internet e tente novamente.',
      );
    }
    if (response.statusCode != 200) {
      final message = switch (response.statusCode) {
        429 =>
          'O serviço atingiu seu limite temporário. Tente novamente mais tarde.',
        401 ||
        403 => 'O serviço de ofertas precisa liberar o acesso ao aplicativo.',
        502 || 503 =>
          'As ofertas estão temporariamente indisponíveis. Tente novamente mais tarde.',
        _ => 'Não foi possível atualizar as ofertas (${response.statusCode}).',
      };
      throw Exception(message);
    }
    dynamic data;
    try {
      data = jsonDecode(response.body);
    } catch (_) {
      throw Exception('O serviço retornou uma resposta inválida.');
    }
    if (data is! Map<String, dynamic> || data['offers'] is! List) {
      throw Exception('O serviço retornou uma resposta incompatível.');
    }
    final rows = data['offers'] as List;
    final offers = rows
        .whereType<Map<String, dynamic>>()
        .map(Offer.fromJson)
        .where((o) => o.id.isNotEmpty)
        .toList();
    final total = int.tryParse('${data['total']}') ?? offers.length;
    return OffersResult(
      offers,
      total,
      data['hasMore'] == true && offers.isNotEmpty,
    );
  }
}
