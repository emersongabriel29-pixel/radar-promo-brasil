// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:radar_promo_ofertas/design/radar_theme.dart';

double contrast(Color a, Color b) {
  final first = a.computeLuminance(), second = b.computeLuminance();
  return ((first > second ? first : second) + .05) / ((first < second ? first : second) + .05);
}

class _TrackingTransitions extends PageTransitionsBuilder {
  int calls = 0;
  @override
  Widget buildTransitions<T>(PageRoute<T> route, BuildContext context,
      Animation<double> animation, Animation<double> secondaryAnimation, Widget child) {
    calls++;
    return child;
  }
}

void main() {
  for (final theme in [RadarTheme.light, RadarTheme.dark]) {
    test('semantic text and button colors meet AA in ${theme.brightness}', () {
      final scheme = theme.colorScheme;
      expect(contrast(scheme.onSurface, scheme.surface), greaterThanOrEqualTo(4.5));
      expect(contrast(scheme.onSurfaceVariant, theme.cardTheme.color!), greaterThanOrEqualTo(4.5));
      expect(contrast(scheme.onPrimary, scheme.primary), greaterThanOrEqualTo(4.5));
      expect(theme.textTheme.bodyMedium!.fontSize, 14);
      expect(theme.textTheme.bodySmall!.fontSize, 12);
      expect(theme.filledButtonTheme.style!.minimumSize!.resolve({}), const Size(48, 48));
      expect(theme.iconButtonTheme.style!.minimumSize!.resolve({}), const Size(48, 48));
    });
  }
  for (final reduced in [false, true]) {
    testWidgets('platform transitions respect reduced motion: $reduced', (tester) async {
      final delegate = _TrackingTransitions();
      const content = Text('Conteúdo preservado');
      await tester.pumpWidget(MaterialApp(home: MediaQuery(
        data: MediaQueryData(disableAnimations: reduced),
        child: Builder(builder: (context) => RadarReducedMotionTransitions(delegate).buildTransitions(
          MaterialPageRoute<void>(builder: (_) => content), context,
          const AlwaysStoppedAnimation(1.0), const AlwaysStoppedAnimation(0.0), content,
        )),
      )));
      expect(find.text('Conteúdo preservado'), findsOneWidget);
      expect(delegate.calls, reduced ? 0 : 1);
    });
  }
}
