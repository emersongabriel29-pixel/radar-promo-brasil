// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'models/offer.dart';

/// Shared bounded image decoding and truthful fallback; never substitutes a product.
class OfferImage extends StatelessWidget {
  const OfferImage({super.key, required this.offer});
  final Offer offer;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final uri = Uri.tryParse(offer.imageUrl);
    final valid = uri != null && uri.scheme == 'https' && uri.host.isNotEmpty && uri.userInfo.isEmpty;
    Widget placeholder(String label, IconData icon) => Semantics(
      label: label,
      child: Center(child: Icon(icon, size: 36, color: colors.onSurfaceVariant)),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: ColoredBox(
        color: colors.surfaceContainerHighest,
        child: valid
            ? Image.network(
                offer.imageUrl,
                semanticLabel: offer.title,
                fit: BoxFit.contain,
                cacheWidth: (MediaQuery.devicePixelRatioOf(context) * 400).round().clamp(256, 1200).toInt(),
                frameBuilder: (context, child, frame, synchronous) =>
                    synchronous || frame != null ? child : placeholder('Carregando imagem', Icons.image_outlined),
                errorBuilder: (_, __, ___) => placeholder('Imagem indisponível', Icons.image_not_supported_outlined),
              )
            : placeholder('Imagem não informada', Icons.shopping_bag_outlined),
      ),
    );
  }
}
