import 'package:flutter/services.dart';

import 'price_alerts.dart';

/// System notifications for foreground price matches. Background push
/// requires a separately configured server and device registration.
class AndroidPriceNotifications {
  static const MethodChannel channel =
      MethodChannel('br.com.radarpromo/notifications');

  static Future<int> show(List<PriceAlert> alerts) async {
    if (alerts.isEmpty) return 0;
    try {
      final allowed = await channel.invokeMethod<bool>('requestPermission');
      if (allowed != true) return 0;
      var sent = 0;
      for (final alert in alerts.take(5)) {
        final delivered = await channel.invokeMethod<bool>('showPriceAlert', {
          'title': 'Preço desejado: ${alert.query}',
          'body': '${alert.offer.title} por R\$ ${alert.offer.currentPrice.toStringAsFixed(2)}',
        });
        if (delivered == true) sent++;
      }
      return sent;
    } on MissingPluginException {
      // Widget tests and non-Android platforms do not expose this channel.
      return 0;
    } on PlatformException {
      return 0;
    }
  }
}
