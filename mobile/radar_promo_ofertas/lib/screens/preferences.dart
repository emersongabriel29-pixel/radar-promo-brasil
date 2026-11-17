// Keep compatibility with Flutter versions before Material UI was split.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SavedSearchesScreen extends StatefulWidget {
  const SavedSearchesScreen({super.key, required this.onSearch});
  final ValueChanged<String> onSearch;
  @override
  State<SavedSearchesScreen> createState() => _SavedSearchesScreenState();
}

class _SavedSearchesScreenState extends State<SavedSearchesScreen> {
  final input = TextEditingController();
  List<String> searches = [];
  bool ready = false;

  @override
  void initState() {
    super.initState();
    _read();
  }

  Future<void> _read() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        searches = prefs.getStringList('saved_searches') ?? [];
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

  Future<void> _remove(String term) async {
    final next = searches.where((s) => s != term).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('saved_searches', next);
    if (mounted) setState(() => searches = next);
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
        (term) => Card(
          child: ListTile(
            leading: const Icon(Icons.search),
            title: Text(term),
            onTap: () => widget.onSearch(term),
            trailing: IconButton(
              tooltip: 'Excluir busca',
              icon: const Icon(Icons.delete_outline),
              onPressed: () => _remove(term),
            ),
          ),
        ),
      ),
      const SizedBox(height: 16),
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
    for (final key in ['favorites', 'saved_offers', 'saved_searches']) {
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
            'Esta versão não exige conta e não oferece comentários, votos ou notificações push.',
          ),
        ],
      ),
    ),
  );
}
