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
      'https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-offers-feed';
  final http.Client? client;
  final DateTime Function()? clock;
  final _inFlight = <String, Future<OffersResult>>{};
  DateTime? _retryAt;
  static const _rateLimitMessage = 'O servidor de ofertas atingiu o limite temporário de uso (HTTP 429). Não é uma falha do seu celular. Tente novamente após a liberação do serviço.';
  OffersApi({this.client, this.clock});

  DateTime get _now => clock?.call() ?? DateTime.now();

  Future<OffersResult> getOffers({
    int page = 1,
    String query = '',
    String category = '',
    String sort = 'recent',
  }) {
    if (_retryAt != null && _now.isBefore(_retryAt!)) {
      return Future.error(Exception(_rateLimitMessage));
    }
    final key = jsonEncode([page, query, category, sort]);
    return _inFlight.putIfAbsent(key, () => _fetchOffers(
      page: page, query: query, category: category, sort: sort,
    ).whenComplete(() { _inFlight.remove(key); }));
  }

  Future<OffersResult> _fetchOffers({
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
      if (response.statusCode == 429) {
        final seconds = (int.tryParse(response.headers['retry-after'] ?? '') ?? 60).clamp(1, 3600);
        _retryAt = _now.add(Duration(seconds: seconds.toInt()));
      }
      String? upstreamCode;
      try {
        final body = jsonDecode(response.body);
        if (body is Map<String, dynamic>) {
          upstreamCode = body['code']?.toString();
        }
      } catch (_) {
        // Some infrastructure failures return HTML rather than JSON.
      }
      if (upstreamCode == 'RADAR_CAPACITY_REACHED' ||
          upstreamCode == 'RADAR_CONNECTION_NOT_CONFIGURED') {
        throw Exception('O serviço de ofertas está temporariamente indisponível no servidor. As ofertas voltarão quando a integração for restabelecida.');
      }
      final message = switch (response.statusCode) {
        429 => _rateLimitMessage,
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
