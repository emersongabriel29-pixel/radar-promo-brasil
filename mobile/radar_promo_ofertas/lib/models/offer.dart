class Offer {
  final String id;
  final String title;
  final String source;
  final double currentPrice;
  final double originalPrice;
  final String imageUrl;
  final String affiliateUrl;
  final int discountPercent;
  final String category;
  final String couponCode;
  final DateTime? createdAt;

  const Offer({
    required this.id,
    required this.title,
    required this.source,
    required this.currentPrice,
    required this.originalPrice,
    required this.imageUrl,
    required this.affiliateUrl,
    required this.discountPercent,
    required this.category,
    required this.couponCode,
    required this.createdAt,
  });

  factory Offer.fromJson(Map<String, dynamic> json) => Offer(
    id: (json['id'] ?? '').toString(),
    title: (json['title'] ?? 'Oferta').toString(),
    source: (json['source'] ?? '').toString(),
    currentPrice: _number(json['currentPrice']),
    originalPrice: _number(json['originalPrice']),
    imageUrl: (json['imageUrl'] ?? '').toString(),
    affiliateUrl: (json['affiliateUrl'] ?? '').toString(),
    discountPercent: _number(json['discountPercent']).round().clamp(0, 100).toInt(),
    category: (json['category'] ?? '').toString(),
    couponCode: (json['couponCode'] ?? '').toString(),
    createdAt:
        DateTime.tryParse((json['createdAt'] ?? '').toString()),
  );

  bool get hasPrice => currentPrice.isFinite && currentPrice > 0;

  // Derive displayed savings from the same pair of prices shown to the reader.
  // Keep the upstream percentage intact for persistence and diagnostics.
  double get savingsAmount => hasPrice && originalPrice.isFinite && originalPrice > currentPrice
      ? originalPrice - currentPrice : 0;

  int get savingsPercent => savingsAmount > 0
      ? (savingsAmount / originalPrice * 100).floor().clamp(0, 99).toInt()
      : 0;

  bool get hasValidLink {
    final uri = Uri.tryParse(affiliateUrl);
    return uri != null &&
        uri.scheme == 'https' &&
        uri.host.isNotEmpty &&
        uri.userInfo.isEmpty;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'source': source,
    'currentPrice': currentPrice,
    'originalPrice': originalPrice,
    'imageUrl': imageUrl,
    'affiliateUrl': affiliateUrl,
    'discountPercent': discountPercent,
    'category': category,
    'couponCode': couponCode,
    'createdAt': createdAt?.toIso8601String(),
  };

  static double _number(dynamic value) {
    final parsed = value is num
        ? value.toDouble()
        : double.tryParse(value?.toString() ?? '');
    return parsed != null && parsed.isFinite && parsed >= 0 ? parsed : 0;
  }
}
