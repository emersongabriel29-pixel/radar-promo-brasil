import 'dart:convert';

// Keep compatibility with Flutter versions before Material UI was split.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/preferences.dart';
import 'screens/app_version.dart';
import 'screens/stores_coupons.dart';

import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import 'services/api.dart';
import 'services/community.dart';
import 'services/theme_preference.dart';
import 'models/offer.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppThemePreference.load();
  runApp(const RadarPromoApp());
}

class RadarPromoApp extends StatelessWidget {
  const RadarPromoApp({super.key, this.api, this.community = const CommunityLinks()});
  final OffersApi? api;
  final CommunityLinks community;

  @override
  Widget build(BuildContext context) {
    const ink = Color(0xFF102A2A);
    const green = Color(0xFFB8F34A);
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: AppThemePreference.mode,
      builder: (context, themeMode, _) => MaterialApp(
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: green,
          brightness: Brightness.dark,
        ),
      ),
      title: 'Radar Promo Ofertas',
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF6F8F3),
        colorScheme: ColorScheme.fromSeed(
          seedColor: ink,
          primary: ink,
          secondary: green,
          surface: Colors.white,
        ),
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF6F8F3),
          foregroundColor: ink,
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
      home: HomeScreen(api: api, community: community),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.api, this.community = const CommunityLinks()});
  final OffersApi? api;
  final CommunityLinks community;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final api = widget.api ?? OffersApi();
  final search = TextEditingController();
  int tab = 0;
  String sort = 'recent';
  String category = '';
  String storeFilter = '';
  List<Offer> offers = [];
  Set<String> favorites = {};
  Map<String, Offer> savedOffers = {};
  bool loadingMore = false;
  bool hasMore = false;
  int requestVersion = 0;
  bool loading = true;
  String? error;
  int page = 1;
  int total = 0;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
    _load();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> _loadFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = <String, Offer>{};
    for (final raw in prefs.getStringList('saved_offers') ?? <String>[]) {
      try {
        final offer = Offer.fromJson(jsonDecode(raw) as Map<String, dynamic>);
        if (offer.id.isNotEmpty) saved[offer.id] = offer;
      } catch (_) {
        /* Ignore a damaged local entry. */
      }
    }
    if (mounted) {
      setState(() {
        savedOffers = saved;
        favorites = {
          ...(prefs.getStringList('favorites') ?? []),
          ...saved.keys,
        };
      });
      await _persistFavorites();
    }
  }

  Future<void> _persistFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    for (final offer in offers) {
      if (favorites.contains(offer.id)) savedOffers[offer.id] = offer;
    }
    await prefs.setStringList('favorites', favorites.toList());
    await prefs.setStringList(
      'saved_offers',
      savedOffers.values
          .where((o) => favorites.contains(o.id))
          .map((o) => jsonEncode(o.toJson()))
          .toList(),
    );
  }

  Future<void> _toggleFavorite(Offer offer) async {
    setState(() {
      if (favorites.remove(offer.id)) {
        savedOffers.remove(offer.id);
      } else {
        favorites.add(offer.id);
        savedOffers[offer.id] = offer;
      }
    });
    await _persistFavorites();
  }

  Future<void> _load({bool reset = true}) async {
    if (!reset && (loading || loadingMore || !hasMore)) return;
    final version = reset ? ++requestVersion : requestVersion;
    final targetPage = reset ? 1 : page + 1;
    setState(() {
      error = null;
      if (reset) {
        loading = true;
        loadingMore = false;
        offers = [];
        total = 0;
        page = 1;
        hasMore = false;
      } else {
        loadingMore = true;
      }
    });
    try {
      final result = await api.getOffers(
        page: targetPage,
        query: search.text.trim(),
        category: category,
        sort: sort,
      );
      if (!mounted || version != requestVersion) return;
      setState(() {
        final merged = <String, Offer>{
          if (!reset)
            for (final offer in offers) offer.id: offer,
          for (final offer in result.offers) offer.id: offer,
        };
        offers = merged.values.toList();
        if (reset) storeFilter = '';
        page = targetPage;
        total = result.total;
        hasMore = result.hasMore;
        loading = false;
        loadingMore = false;
      });
      await _persistFavorites();
    } catch (e) {
      if (!mounted || version != requestVersion) return;
      setState(() {
        loading = false;
        loadingMore = false;
        error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  List<Offer> get visibleOffers {
    if (tab != 2) {
      if (storeFilter.isEmpty) return offers;
      return offers.where((offer) => offer.source.trim().toLowerCase() == storeFilter.toLowerCase()).toList();
    }
    final query = search.text.trim().toLowerCase();
    return savedOffers.values
        .where(
          (o) =>
              favorites.contains(o.id) &&
              (query.isEmpty ||
                  '${o.title} ${o.source}'.toLowerCase().contains(query)),
        )
        .toList();
  }

  void _openOffer(Offer offer) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OfferDetailScreen(
          offer: offer,
          community: widget.community,
          isFavorite: favorites.contains(offer.id),
          onFavorite: () => _toggleFavorite(offer),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final titles = [
      'Ofertas que valem a pena',
      'Categorias',
      'Salvos',
      'Buscas',
      'Sobre',
    ];
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0xFF102A2A),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.radar_rounded,
                color: Color(0xFFB8F34A),
                size: 23,
              ),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'RADAR PROMO',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                  ),
                ),
                Text(
                  'OFERTAS',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2.8,
                    color: Color(0xFF6B7C72),
                  ),
                ),
              ],
            ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Minha conta',
            icon: const Icon(Icons.account_circle_outlined),
            onSelected: (section) => openCommunity(context, widget.community, section),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'account', child: Text('Entrar / minha conta')),
              PopupMenuItem(value: 'inbox', child: Text('Notificações da conta')),
            ],
          ),
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Atualizar ofertas',
          ),
        ],
      ),
      body: SafeArea(
        child: tab == 4
            ? _about()
            : tab == 3
            ? SavedSearchesScreen(
                onSearch: (query) {
                  setState(() {
                    search.text = query;
                    category = '';
                    tab = 0;
                  });
                  _load();
                },
              )
            : tab == 1
            ? _categories()
            : _feed(titles[tab]),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (v) {
          FocusScope.of(context).unfocus();
          setState(() => tab = v);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.local_offer_outlined),
            selectedIcon: Icon(Icons.local_offer),
            label: 'Ofertas',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_rounded),
            label: 'Categorias',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_border),
            selectedIcon: Icon(Icons.bookmark),
            label: 'Salvos',
          ),
          NavigationDestination(
            icon: Icon(Icons.manage_search),
            label: 'Buscas',
          ),
          NavigationDestination(icon: Icon(Icons.info_outline), label: 'Sobre'),
        ],
      ),
    );
  }

  Widget _feed(String heading) {
    final list = visibleOffers;
    return RefreshIndicator(
      onRefresh: () async {
        if (tab != 2) await _load();
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFF102A2A),
                      borderRadius: BorderRadius.circular(22),
                      gradient: const LinearGradient(
                        colors: [Color(0xFF102A2A), Color(0xFF234844)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Preço bom. Compra consciente.',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 19,
                                  height: 1.15,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 7),
                              Text(
                                'Encontre ofertas e confira as condições na loja.',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: .75),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.radar,
                          color: Color(0xFFB8F34A),
                          size: 48,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    heading,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF102A2A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: search,
                    onSubmitted: (_) {
                      if (tab == 2) {
                        setState(() {});
                      } else {
                        _load();
                      }
                    },
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Buscar produto, loja ou marca',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        onPressed: () {
                          search.clear();
                          if (tab == 2) {
                            setState(() {});
                          } else {
                            _load();
                          }
                        },
                        icon: const Icon(Icons.close),
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (tab == 0) ...[
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'score', label: Text('Destaques')),
                        ButtonSegment(value: 'recent', label: Text('Recentes')),
                        ButtonSegment(value: 'discount', label: Text('Descontos')),
                      ],
                      selected: {sort},
                      onSelectionChanged: (selection) {
                        if (selection.first == sort) return;
                        setState(() => sort = selection.first);
                        _load();
                      },
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Destaques seguem a pontuação do Radar; não representam votos da comunidade.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF6B7C72))),
                    const SizedBox(height: 10),
                  ],
                  if (tab == 0 && offers.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      value: storeFilter.isEmpty || offers.any((offer) => offer.source.trim() == storeFilter) ? storeFilter : '',
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Loja (ofertas carregadas)', border: OutlineInputBorder()),
                      items: [
                        const DropdownMenuItem(value: '', child: Text('Todas as lojas')),
                        ...((offers.map((o) => o.source.trim()).where((v) => v.isNotEmpty).toSet().toList())..sort())
                            .map((name) => DropdownMenuItem(value: name, child: Text(name, overflow: TextOverflow.ellipsis))),
                      ],
                      onChanged: (value) => setState(() => storeFilter = value ?? ''),
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (category.isNotEmpty && tab != 2)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: InputChip(
                        label: Text(category),
                        onDeleted: () {
                          setState(() => category = '');
                          _load();
                        },
                      ),
                    ),
                  if (error != null && offers.isNotEmpty && tab != 2)
                    Text(error!, style: const TextStyle(color: Colors.red)),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          tab != 2 && error != null && offers.isEmpty
                              ? 'Ofertas indisponíveis'
                              : '${tab == 2 ? list.length : total} ofertas encontradas',
                          style: const TextStyle(
                            color: Color(0xFF6B7C72),
                            fontSize: 12,
                          ),
                      ),
                      if (tab != 2 && tab != 0)
                        DropdownButton<String>(
                          isExpanded: true,
                          value: sort,
                          underline: const SizedBox(),
                          items: const [
                            DropdownMenuItem(
                              value: 'recent',
                              child: Text('Mais recentes', maxLines: 1, overflow: TextOverflow.ellipsis),
                            ),
                            DropdownMenuItem(
                              value: 'discount',
                              child: Text('Maior desconto', maxLines: 1, overflow: TextOverflow.ellipsis),
                            ),
                            DropdownMenuItem(
                              value: 'score',
                              child: Text('Destaques Radar', maxLines: 1, overflow: TextOverflow.ellipsis),
                            ),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => sort = v);
                            _load();
                          },
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (tab != 2 && loading && offers.isEmpty)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (tab != 2 && error != null && offers.isEmpty)
            SliverFillRemaining(hasScrollBody: false, child: _errorState())
          else if (list.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _emptyState(tab == 2
                      ? 'Você ainda não salvou ofertas.'
                      : storeFilter.isNotEmpty
                          ? 'Nenhuma oferta desta loja nas páginas carregadas.'
                          : 'Nenhuma oferta encontrada agora.'),
                  if (tab != 2 && hasMore)
                    TextButton(
                      onPressed: loadingMore ? null : () => _load(reset: false),
                      child: Text(loadingMore ? 'Carregando...' : 'Buscar nas próximas páginas'),
                    ),
                  if (tab != 2 && storeFilter.isNotEmpty)
                    TextButton(
                      onPressed: () => setState(() => storeFilter = ''),
                      child: const Text('Limpar filtro de loja'),
                    ),
                ],
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(14, 4, 14, 20),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  if (index == list.length) {
                    return loadingMore
                        ? const Center(child: CircularProgressIndicator())
                        : TextButton(
                            onPressed: () => _load(reset: false),
                            child: const Text('Carregar mais ofertas'),
                          );
                  }
                  final offer = list[index];
                  return OfferCard(
                    offer: offer,
                    favorite: favorites.contains(offer.id),
                    onFavorite: () => _toggleFavorite(offer),
                    onTap: () => _openOffer(offer),
                  );
                }, childCount: list.length + (tab != 2 && hasMore ? 1 : 0)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _categories() {
    final categories = offers
        .map((offer) => offer.category.trim())
        .where((name) => name.isNotEmpty)
        .toSet()
        .toList()
      ..sort();
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        const Text(
          'Explore por categoria',
          style: TextStyle(
            fontSize: 23,
            fontWeight: FontWeight.w900,
            color: Color(0xFF102A2A),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Categorias das ofertas carregadas. Escolha uma para filtrar.',
          style: TextStyle(color: Color(0xFF6B7C72)),
        ),
        const SizedBox(height: 18),
        if (categories.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text('As categorias aparecerão quando as ofertas forem carregadas.'),
          ),
        ...categories.map(
          (c) => Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFEAF3D9),
                child: Icon(Icons.category_outlined, color: Color(0xFF234844)),
              ),
              title: Text(
                c,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                setState(() {
                  category = c;
                  tab = 0;
                });
                _load();
              },
            ),
          ),
        ),
        TextButton(
          onPressed: () {
            setState(() {
              category = '';
              tab = 0;
            });
            _load();
          },
          child: const Text('Ver todas as ofertas'),
        ),
      ],
    );
  }

  Widget _about() => ListView(
    padding: const EdgeInsets.all(22),
    children: [
      const Text(
        'Ofertas com origem rastreável',
        style: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w900,
          color: Color(0xFF102A2A),
        ),
      ),
      const SizedBox(height: 12),
      const Text(
        'Pesquise ofertas, salve seus produtos e confira as condições diretamente na loja.',
      ),
      const SizedBox(height: 18),
      _infoTile(
        Icons.verified_outlined,
        'Confira na loja',
        'Preços e disponibilidade podem mudar. Confirme o valor final antes de comprar.',
      ),
      _infoTile(
        Icons.link,
        'Links de afiliados',
        'Alguns links podem gerar comissão de afiliado. Confira as condições da oferta na loja.',
      ),
      _infoTile(
        Icons.bookmark_outline,
        'Seus salvos',
        'Favoritos desta versão ficam armazenados localmente neste aparelho.',
      ),
      const SizedBox(height: 16),
      ListTile(
        leading: const Icon(Icons.storefront_outlined),
        title: const Text('Lojas e cupons das ofertas carregadas'),
        subtitle: const Text('Catálogo parcial; consulte validade na loja'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => StoresCouponsScreen(
            offers: offers,
            onOpen: (offer) => _openOffer(offer),
          )),
        ),
      ),
      ListTile(
        leading: const Icon(Icons.settings_outlined),
        title: const Text('Preferências e dados locais'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () async {
          await Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (_) => const PreferencesScreen()));
          await _loadFavorites();
        },
      ),
      ListTile(
        leading: const Icon(Icons.privacy_tip_outlined),
        title: const Text('Privacidade'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const PrivacyScreen())),
      ),
      const InstalledAppVersion(),
    ],
  );

  Widget _infoTile(IconData icon, String title, String body) => Card(
    child: ListTile(
      leading: Icon(icon, color: const Color(0xFF234844)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(body),
    ),
  );

  Widget _errorState() => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.cloud_off_outlined,
            size: 48,
            color: Color(0xFF6B7C72),
          ),
          const SizedBox(height: 12),
          const Text(
            'Não conseguimos carregar as ofertas',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
          ),
          const SizedBox(height: 6),
          Text(
            error ?? 'Tente novamente.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF6B7C72)),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: _load, child: const Text('Tentar novamente')),
        ],
      ),
    ),
  );

  Widget _emptyState(String message) => Center(
    child: Padding(
      padding: const EdgeInsets.all(30),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.local_offer_outlined,
            size: 48,
            color: Color(0xFF8A9B8E),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF6B7C72)),
          ),
        ],
      ),
    ),
  );
}

class OfferCard extends StatelessWidget {
  const OfferCard({
    super.key,
    required this.offer,
    required this.favorite,
    required this.onFavorite,
    required this.onTap,
  });
  final Offer offer;
  final bool favorite;
  final VoidCallback onFavorite;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 112,
                height: 118,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F5F0),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: offer.imageUrl.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.network(
                          offer.imageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.image_not_supported_outlined,
                            size: 32,
                          ),
                        ),
                      )
                    : const Icon(
                        Icons.shopping_bag_outlined,
                        size: 34,
                        color: Color(0xFF8A9B8E),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (offer.hasPrice && offer.discountPercent > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEAF6D7),
                              borderRadius: BorderRadius.circular(7),
                            ),
                            child: Text(
                              '-${offer.discountPercent}%',
                              style: const TextStyle(
                                color: Color(0xFF315B20),
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        const Spacer(),
                        IconButton(
                          onPressed: onFavorite,
                          visualDensity: VisualDensity.compact,
                          constraints: const BoxConstraints(),
                          icon: Icon(
                            favorite ? Icons.bookmark : Icons.bookmark_border,
                            color: const Color(0xFF234844),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      offer.title,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      offer.hasPrice ? money.format(offer.currentPrice) : 'Preço indisponível',
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF102A2A),
                      ),
                    ),
                    if (offer.hasPrice && offer.originalPrice > offer.currentPrice)
                      Text(
                        money.format(offer.originalPrice),
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    const SizedBox(height: 5),
                    Text(
                      offer.source,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF6B7C72),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OfferDetailScreen extends StatefulWidget {
  const OfferDetailScreen({
    super.key,
    required this.offer,
    required this.isFavorite,
    required this.onFavorite,
    this.community = const CommunityLinks(),
  });
  final Offer offer;
  final bool isFavorite;
  final VoidCallback onFavorite;
  final CommunityLinks community;

  @override
  State<OfferDetailScreen> createState() => _OfferDetailScreenState();
}

class _OfferDetailScreenState extends State<OfferDetailScreen> {
  late bool isFavorite = widget.isFavorite;
  Offer get offer => widget.offer;

  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhes da oferta'),
        actions: [
          IconButton(
            tooltip: 'Salvar oferta',
            onPressed: () {
              widget.onFavorite();
              setState(() => isFavorite = !isFavorite);
            },
            icon: Icon(isFavorite ? Icons.bookmark : Icons.bookmark_border),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            height: 250,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
            ),
            child: offer.imageUrl.isNotEmpty
                ? Image.network(
                    offer.imageUrl,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.image_not_supported_outlined,
                      size: 50,
                    ),
                  )
                : const Icon(Icons.shopping_bag_outlined, size: 60),
          ),
          const SizedBox(height: 18),
          if (offer.hasPrice && offer.discountPercent > 0)
            Align(
              alignment: Alignment.centerLeft,
              child: Chip(
                label: Text('${offer.discountPercent}% de desconto'),
                backgroundColor: const Color(0xFFEAF6D7),
              ),
            ),
          Text(
            offer.title,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Color(0xFF102A2A),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            offer.hasPrice ? money.format(offer.currentPrice) : 'Preço indisponível',
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
          ),
          if (offer.hasPrice && offer.originalPrice > offer.currentPrice)
            Text(
              'Antes ${money.format(offer.originalPrice)}',
              style: const TextStyle(
                color: Colors.grey,
                decoration: TextDecoration.lineThrough,
              ),
            ),
          const SizedBox(height: 14),
          _detailLine('Loja / origem', offer.source),
          if (offer.category.isNotEmpty)
            _detailLine('Categoria', offer.category),
          if (offer.couponCode.isNotEmpty)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('Cupom: ${offer.couponCode}'),
              trailing: IconButton(
                tooltip: 'Copiar cupom',
                icon: const Icon(Icons.copy),
                onPressed: () async {
                  await Clipboard.setData(
                    ClipboardData(text: offer.couponCode),
                  );
                  if (mounted) _message('Cupom copiado.');
                },
              ),
            ),
          OutlinedButton.icon(
            icon: const Icon(Icons.copy),
            label: const Text('Copiar link da oferta'),
            onPressed: () async {
              if (!offer.hasValidLink) {
                _message('Link da oferta indisponível.');
                return;
              }
              await Clipboard.setData(ClipboardData(text: offer.affiliateUrl));
              if (mounted) _message('Link copiado para compartilhar.');
            },
          ),
          OutlinedButton.icon(
            icon: const Icon(Icons.forum_outlined),
            label: const Text('Votos e comentários'),
            onPressed: () => openCommunity(
              context, widget.community, 'offer', offerId: offer.id,
            ),
          ),
          const Text(
            'Sua conta abre em uma aba segura. Os favoritos deste aparelho continuam disponíveis em Salvos.',
          ),
          _detailLine(
            'Oferta recebida em',
            offer.createdAt == null
                ? 'Data indisponível'
                : DateFormat('dd/MM/yyyy HH:mm').format(offer.createdAt!.toLocal()),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF102A2A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            onPressed: offer.hasValidLink
                ? () async {
                    try {
                      final opened = await launchUrl(
                        Uri.parse(offer.affiliateUrl),
                        mode: LaunchMode.externalApplication,
                      );
                      if (!opened && mounted) {
                        _message(
                          'Não foi possível abrir a loja. Copie o link e tente no navegador.',
                        );
                      }
                    } catch (_) {
                      if (mounted) _message('Não foi possível abrir a loja.');
                    }
                  }
                : null,
            icon: const Icon(Icons.open_in_new),
            label: const Text('IR PARA A OFERTA'),
          ),
          const SizedBox(height: 10),
          const Text(
            'Preço e disponibilidade podem mudar na loja. Confirme as condições antes de comprar.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF6B7C72), fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _detailLine(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: const TextStyle(color: Color(0xFF6B7C72), fontSize: 12),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
          ),
        ),
      ],
    ),
  );
}

Future<void> openCommunity(
  BuildContext context, CommunityLinks links, String section, {String? offerId}
) async {
  try {
    final opened = await links.open(section, offerId: offerId);
    if (opened || !context.mounted) return;
  } catch (_) {
    if (!context.mounted) return;
  }
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Não foi possível abrir sua conta. Verifique o navegador e tente novamente.'),
    ));
  }
}
