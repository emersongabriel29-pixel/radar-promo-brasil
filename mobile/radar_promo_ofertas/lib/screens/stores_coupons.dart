// Flutter 3.50 deprecates this import; retain compatibility with the pinned app dependencies.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/offer.dart';

/// Catalog is based on the feed pages already loaded, not a complete server index.
class StoresCouponsScreen extends StatefulWidget {
  const StoresCouponsScreen({super.key, required this.offers, required this.onOpen, this.embedded = false, this.initialCouponsOnly = false});
  final bool embedded;
  final bool initialCouponsOnly;
  final List<Offer> offers;
  final ValueChanged<Offer> onOpen;

  @override
  State<StoresCouponsScreen> createState() => _StoresCouponsScreenState();
}

class _StoresCouponsScreenState extends State<StoresCouponsScreen> {
  final search = TextEditingController();
  late bool couponsOnly = widget.initialCouponsOnly;

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final term = search.text.trim().toLowerCase();
    final groups = <String, List<Offer>>{};
    final seen = <String>{};
    for (final offer in widget.offers) {
      if (offer.id.isNotEmpty && !seen.add(offer.id)) continue;
      final store = offer.source.trim();
      if (store.isEmpty || !'$store ${offer.couponCode}'.toLowerCase().contains(term)) continue;
      if (couponsOnly && offer.couponCode.trim().isEmpty) continue;
      groups.putIfAbsent(store, () => []).add(offer);
    }
    final stores = groups.keys.toList()..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    final content = ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(couponsOnly ? 'Cupons das ofertas carregadas' : 'Explore lojas e cupons das ofertas carregadas',
            style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text('Este catálogo é parcial. Cupons e validade devem ser confirmados na loja.'),
          const SizedBox(height: 14),
          TextField(
            controller: search,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              labelText: 'Pesquisar loja ou cupom',
              border: OutlineInputBorder(),
            ),
          ),
          SwitchListTile(
            title: const Text('Somente ofertas com cupom'),
            value: couponsOnly,
            onChanged: (value) => setState(() => couponsOnly = value),
          ),
          if (stores.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 36),
              child: Center(child: Text('Nenhuma loja encontrada nas ofertas carregadas.')),
            ),
          for (final store in stores)
            Card(
              child: ExpansionTile(
                leading: const Icon(Icons.storefront_outlined),
                title: Text(store),
                subtitle: Text('${groups[store]!.length} oferta(s) carregada(s)'),
                children: [
                  for (final offer in groups[store]!)
                    ListTile(
                      title: Text(offer.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Text(offer.couponCode.trim().isEmpty
                          ? 'Sem cupom informado'
                          : 'Cupom: ${offer.couponCode.trim()} — validade não confirmada'),
                      trailing: offer.couponCode.trim().isEmpty
                          ? const Icon(Icons.chevron_right)
                          : IconButton(
                              tooltip: 'Copiar cupom',
                              icon: const Icon(Icons.copy),
                              onPressed: () async {
                                await Clipboard.setData(ClipboardData(text: offer.couponCode));
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Cupom copiado. Confira a validade na loja.')),
                                );
                              },
                            ),
                      onTap: () => widget.onOpen(offer),
                    ),
                ],
              ),
            ),
        ],
    );
    return widget.embedded ? content : Scaffold(
      appBar: AppBar(title: const Text('Lojas e cupons')), body: content,
    );
  }
}
