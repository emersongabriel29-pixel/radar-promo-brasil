import 'dart:async';
import 'dart:convert';
import 'dart:io' show HttpDate;

import 'package:http/http.dart' as http;

import '../models/offer.dart';

class OffersResult {
  final List<Offer> offers;
  final int total;
  final bool hasMore;
  const OffersResult(this.offers, this.total, this.hasMore);
}

class CatalogResult {
  final List<String> categories;
  final List<String> stores;
  final bool hasMore;
  const CatalogResult(this.categories, this.stores, this.hasMore);
}

class OffersApi {
  // This endpoint is public. Server integration credentials never enter the APK.
  static const baseUrl =
      'https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-offers-feed';
  final http.Client? client;
  final DateTime Function()? clock;
  final _inFlight = <String, Future<OffersResult>>{};
  DateTime? _retryAt;
  String _retryMessage = _rateLimitMessage;
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
      return Future.error(Exception(_retryMessage));
    }
    final key = jsonEncode([page, query, category, sort]);
    return _inFlight.putIfAbsent(key, () => _fetchOffers(
      page: page, query: query, category: category, sort: sort,
    ).whenComplete(() { _inFlight.remove(key); }));
  }

  DateTime _retryDeadline(String? header) {
    final now = _now;
    final value = header?.trim() ?? '';
    try {
      final seconds = int.tryParse(value);
      if (seconds != null && RegExp(r'^\d+$').hasMatch(value)) {
        // Reject values outside DateTime's representable range before Duration
        // arithmetic can overflow. Valid server waits are never shortened.
        if (seconds > 8640000000000) throw const FormatException();
        return now.add(Duration(seconds: seconds));
      }
      final deadline = HttpDate.parse(value);
      return deadline.isAfter(now) ? deadline : now;
    } catch (_) {
      return now.add(const Duration(seconds: 60));
    }
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
    final data = await _fetchJson(uri);
    if (data['offers'] is! List) {
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
  Future<CatalogResult> getCatalog({int page = 1}) async {
    final uri = Uri.parse(baseUrl).replace(queryParameters: {
      'catalog': '1', 'page': '$page', 'limit': '60',
    });
    final data = await _fetchJson(uri);
    List<String> names(String key) {
      final values = data[key];
      if (values is! List || values.any((value) => value is! String)) {
        throw Exception('O serviço retornou um catálogo incompatível.');
      }
      return List.unmodifiable(values.cast<String>().map((value) => value.trim())
          .where((value) => value.isNotEmpty).toSet());
    }
    final categories = names('categories'), stores = names('stores');
    return CatalogResult(categories, stores,
      data['hasMore'] == true && (categories.isNotEmpty || stores.isNotEmpty));
  }

  Future<Map<String, dynamic>> _fetchJson(Uri uri) async {
    if (_retryAt != null && _now.isBefore(_retryAt!)) throw Exception(_retryMessage);
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
      String? upstreamCode;
      try {
        final body = jsonDecode(response.body);
        if (body is Map<String, dynamic>) {
          upstreamCode = body['code']?.toString();
        }
      } catch (_) {
        // Some infrastructure failures return HTML rather than JSON.
      }
      final message = upstreamCode == 'RADAR_CAPACITY_REACHED' ||
          upstreamCode == 'RADAR_CONNECTION_NOT_CONFIGURED'
          ? 'O serviço de ofertas está temporariamente indisponível no servidor. As ofertas voltarão quando a integração for restabelecida.'
          : switch (response.statusCode) {
        429 => _rateLimitMessage,
        401 ||
        403 => 'O serviço de ofertas precisa liberar o acesso ao aplicativo.',
        502 || 503 =>
          'As ofertas estão temporariamente indisponíveis. Tente novamente mais tarde.',
        _ => 'Não foi possível atualizar as ofertas (${response.statusCode}).',
      };
      if (response.statusCode == 429 ||
          (response.statusCode == 503 && response.headers.containsKey('retry-after'))) {
        final deadline = _retryDeadline(response.headers['retry-after']);
        // Concurrent failures may extend a server pause, never shorten it.
        if (_retryAt == null || deadline.isAfter(_retryAt!)) {
          _retryAt = deadline;
          _retryMessage = message;
        }
      }
      throw Exception(message);
    }
    dynamic data;
    try {
      data = jsonDecode(response.body);
    } catch (_) {
      throw Exception('O serviço retornou uma resposta inválida.');
    }
    if (data is! Map<String, dynamic>) throw Exception('O serviço retornou uma resposta incompatível.');
    return data;
  }

}
