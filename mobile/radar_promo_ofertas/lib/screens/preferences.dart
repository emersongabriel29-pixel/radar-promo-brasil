import 'dart:convert';
// Keep compatibility with Flutter versions before Material UI was split.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/theme_preference.dart';

class SavedSearchesScreen extends StatefulWidget {
  const SavedSearchesScreen({super.key, required this.onSearch});
  final ValueChanged<String> onSearch;
  @override
  State<SavedSearchesScreen> createState() => _SavedSearchesScreenState();
}

class _SavedSearchesScreenState extends State<SavedSearchesScreen> {
  final input = TextEditingController();
  List<String> searches = [];
  Map<String, double> targetPrices = {};
  Set<String> mutedSearches = {};
  bool ready = false;

  @override
  void initState() {
    super.initState();
    _read();
  }

  Future<void> _read() async {
    final prefs = await SharedPreferences.getInstance();
    final storedPrices = prefs.getString('saved_search_target_prices');
    final prices = <String, double>{};
    if (storedPrices != null) {
      try {
        final decoded = jsonDecode(storedPrices);
        if (decoded is Map) {
          for (final entry in decoded.entries) {
            final value = entry.value;
            if (entry.key is String && value is num && value.isFinite && value > 0) {
              prices[entry.key as String] = value.toDouble();
            }
          }
        }
      } catch (_) { /* Invalid local preference is ignored. */ }
    }
    if (mounted) {
      setState(() {
        searches = prefs.getStringList('saved_searches') ?? [];
        targetPrices = prices;
        mutedSearches = (prefs.getStringList('saved_search_muted') ?? []).toSet();
        ready = true;
      });
    }
  }

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    FocusScope.of(context).unfocus();
    final term = input.text.trim();
    if (term.isEmpty) return;
    final next = [...searches];
    if (!next.any((s) => s.toLowerCase() == term.toLowerCase())) next.add(term);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('saved_searches', next);
    if (mounted) {
      setState(() {
        searches = next;
        input.clear();
      });
    }
  }

  Future<void> _editTarget(String term) async {
    final controller = TextEditingController(
      text: targetPrices[term]?.toStringAsFixed(2).replaceAll('.', ',') ?? '',
    );
    final value = await showDialog<double?>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Preço desejado: $term'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Preço máximo (R\$)',
            helperText: 'Apenas referência local; não envia notificações.',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(dialogContext, -1), child: const Text('Sem limite')),
          FilledButton(
            onPressed: () {
              final raw = controller.text.trim().replaceAll(' ', '');
              final normalized = raw.contains(',')
                  ? raw.replaceAll('.', '').replaceAll(',', '.')
                  : raw;
              final amount = double.tryParse(normalized);
              if (amount == null || !amount.isFinite || amount <= 0 || amount > 100000000) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  const SnackBar(content: Text('Informe um preço válido maior que zero.')),
                );
                return;
              }
              Navigator.pop(dialogContext, amount);
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null || !mounted) return;
    final next = Map<String, double>.from(targetPrices);
    if (value < 0) { next.remove(term); } else { next[term] = value; }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('saved_search_target_prices', jsonEncode(next));
    if (mounted) setState(() => targetPrices = next);
  }

  Future<void> _toggleMute(String term) async {
    final next = Set<String>.from(mutedSearches);
    if (!next.add(term)) next.remove(term);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('saved_search_muted', next.toList());
    if (mounted) setState(() => mutedSearches = next);
  }

  Future<void> _remove(String term) async {
    final next = searches.where((s) => s != term).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('saved_searches', next);
    final prices = Map<String, double>.from(targetPrices)..remove(term);
    await prefs.setString('saved_search_target_prices', jsonEncode(prices));
    final muted = Set<String>.from(mutedSearches)..remove(term);
    await prefs.setStringList('saved_search_muted', muted.toList());
    if (mounted) setState(() { searches = next; targetPrices = prices; mutedSearches = muted; });
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      const Text(
        'Acompanhe o que procura',
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 10),
      const Text(
        'Salve produtos ou lojas para consultar novamente. Toque em uma busca para atualizar os resultados.',
      ),
      const SizedBox(height: 18),
      TextField(
        controller: input,
        maxLength: 120,
        textInputAction: TextInputAction.done,
        onSubmitted: (_) => _add(),
        decoration: InputDecoration(
          labelText: 'Produto ou loja',
          border: const OutlineInputBorder(),
          suffixIcon: IconButton(
            tooltip: 'Salvar busca',
            onPressed: ready ? _add : null,
            icon: const Icon(Icons.add),
          ),
        ),
      ),
      if (!ready) const Center(child: CircularProgressIndicator()),
      if (ready && searches.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 32),
          child: Text(
            'Suas buscas salvas aparecerão aqui.',
            textAlign: TextAlign.center,
          ),
        ),
      ...searches.map(
        (term) => Dismissible(
          key: ValueKey(term),
          direction: DismissDirection.endToStart,
          background: Container(alignment: Alignment.centerRight, padding: const EdgeInsets.all(16), color: Colors.red.shade100, child: const Icon(Icons.delete_outline)),
          onDismissed: (_) => _remove(term),
          child: Card(
          child: ListTile(
            leading: const Icon(Icons.search),
            title: Text(term),
            subtitle: Text('${mutedSearches.contains(term) ? 'Pausada localmente · ' : ''}'
                '${targetPrices.containsKey(term) ? 'Preço desejado: R\$ ${targetPrices[term]!.toStringAsFixed(2).replaceAll('.', ',')}' : 'Sem preço máximo'}'),
            onTap: () => widget.onSearch(term),
            onLongPress: () => _editTarget(term),
            trailing: Wrap(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: mutedSearches.contains(term) ? 'Reativar busca' : 'Pausar busca',
                  icon: Icon(mutedSearches.contains(term) ? Icons.notifications_off_outlined : Icons.notifications_active_outlined),
                  onPressed: () => _toggleMute(term),
                ),
                IconButton(
                  tooltip: 'Definir preço desejado',
                  icon: const Icon(Icons.price_change_outlined),
                  onPressed: () => _editTarget(term),
                ),
              ],
            ),
          ),
          ),
        ),
      ),
      const SizedBox(height: 16),
      const Text(
        'Para excluir uma busca, deslize o cartão para o lado. Pausar e definir preço são preferências locais; não controlam notificações reais.',
      ),
      const SizedBox(height: 8),
      const Text(
        'As buscas ficam neste aparelho. Esta versão não envia alertas ou notificações em segundo plano.',
        style: TextStyle(color: Color(0xFF6B7C72)),
      ),
    ],
  );
}

class PreferencesScreen extends StatefulWidget {
  const PreferencesScreen({super.key});
  @override
  State<PreferencesScreen> createState() => _PreferencesScreenState();
}

class _PreferencesScreenState extends State<PreferencesScreen> {
  bool working = false;
  Future<void> _clear() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Apagar dados locais?'),
        content: const Text(
          'Seus favoritos e buscas salvas serão removidos deste aparelho.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Apagar'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    setState(() => working = true);
    final prefs = await SharedPreferences.getInstance();
    for (final key in ['favorites', 'saved_offers', 'saved_searches', 'saved_search_target_prices', 'saved_search_muted']) {
      await prefs.remove(key);
    }
    if (!mounted) return;
    setState(() => working = false);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Dados locais apagados.')));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Preferências')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const ListTile(
          leading: Icon(Icons.phone_android),
          title: Text('Dados neste aparelho'),
          subtitle: Text(
            'Favoritos e buscas salvas não são sincronizados com uma conta.',
          ),
        ),
        const ListTile(
          leading: Icon(Icons.notifications_none),
          title: Text('Notificações'),
          subtitle: Text('Alertas push ainda não estão disponíveis.'),
        ),
        const SizedBox(height: 12),
        ValueListenableBuilder<ThemeMode>(
          valueListenable: AppThemePreference.mode,
          builder: (context, selected, _) => ListTile(
            leading: const Icon(Icons.palette_outlined),
            title: const Text('Aparência'),
            subtitle: const Text('Tema do aparelho, claro ou escuro'),
            trailing: DropdownButton<ThemeMode>(
              value: selected,
              items: const [
                DropdownMenuItem(value: ThemeMode.system, child: Text('Sistema')),
                DropdownMenuItem(value: ThemeMode.light, child: Text('Claro')),
                DropdownMenuItem(value: ThemeMode.dark, child: Text('Escuro')),
              ],
              onChanged: (value) {
                if (value != null) AppThemePreference.setMode(value);
              },
            ),
          ),
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: working ? null : _clear,
          icon: const Icon(Icons.delete_outline),
          label: const Text('Apagar favoritos e buscas'),
        ),
      ],
    ),
  );
}

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Privacidade')),
    body: const SingleChildScrollView(
      padding: EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Você controla seus dados',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
          ),
          SizedBox(height: 18),
          Text(
            'Favoritos e buscas salvas ficam no armazenamento local do aplicativo. Você pode removê-los em Preferências.',
          ),
          SizedBox(height: 18),
          Text(
            'Ao pesquisar ou atualizar o feed, o texto da busca, a categoria e a página são enviados ao serviço de ofertas. A conexão também revela informações técnicas, como seu endereço IP, aos serviços envolvidos.',
          ),
          SizedBox(height: 18),
          Text(
            'Imagens são carregadas dos endereços fornecidos pelas ofertas. Ao abrir uma loja, o navegador acessa o link de afiliado, sujeito às políticas da loja e da rede de afiliados.',
          ),
          SizedBox(height: 18),
          Text(
            'Preços e disponibilidade podem mudar. Ofertas salvas são uma cópia do momento em que foram consultadas; confira o valor final na loja.',
          ),
          SizedBox(height: 18),
          Text(
            'Consultar ofertas e usar favoritos locais não exige conta. Ao abrir Minha conta no navegador, e-mail, votos, comentários, favoritos da conta e preferências são tratados pelo serviço de comunidade. Essa sessão fica no navegador. Os avisos de respostas aparecem na conta; notificações push ainda não estão disponíveis.',
          ),
        ],
      ),
    ),
  );
}
