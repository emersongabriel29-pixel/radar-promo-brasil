import 'dart:convert';

// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:radar_promo_ofertas/screens/preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({
      'saved_searches': <String>['notebook'],
    });
  });

  testWidgets('price dialog saves and closes without framework errors', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SavedSearchesScreen(onSearch: (_) {}),
      ),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Definir preço desejado'));
    await tester.pumpAndSettle();
    expect(find.text('Preço desejado: notebook'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField), '1.299,90');
    await tester.tap(find.text('Salvar'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Preço desejado: notebook'), findsNothing);
    final prefs = await SharedPreferences.getInstance();
    final prices = jsonDecode(prefs.getString('saved_search_target_prices')!) as Map<String, dynamic>;
    expect(prices['notebook'], 1299.9);

    await tester.tap(find.byTooltip('Definir preço desejado'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sem limite'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    final cleared = jsonDecode(prefs.getString('saved_search_target_prices')!) as Map<String, dynamic>;
    expect(cleared.containsKey('notebook'), isFalse);

    await tester.tap(find.byTooltip('Definir preço desejado'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
