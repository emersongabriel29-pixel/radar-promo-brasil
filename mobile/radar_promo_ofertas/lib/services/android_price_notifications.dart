import 'package:flutter/services.dart';

import 'price_alerts.dart';

/// System notifications for foreground price matches. Background push
/// requires a separately configured server and device registration.
class AndroidPriceNotifications {
  static const MethodChannel channel =
      MethodChannel('br.com.radarpromo/notifications');

  static Future<List<PriceAlert>> show(List<PriceAlert> alerts) async {
    if (alerts.isEmpty) return const [];
    try {
      final allowed = await channel.invokeMethod<bool>('requestPermission');
      if (allowed != true) return const [];
      final deliveredAlerts = <PriceAlert>[];
      for (final alert in alerts.take(5)) {
        try {
          final delivered = await channel.invokeMethod<bool>('showPriceAlert', {
            'title': 'Preço desejado: ${alert.query}',
            'body': '${alert.offer.title} por R\$ ${alert.offer.currentPrice.toStringAsFixed(2)}',
          });
          if (delivered == true) deliveredAlerts.add(alert);
        } on PlatformException {
          // Keep previously delivered alerts and retry this one later.
        } on MissingPluginException {
          break;
        }
      }
      return deliveredAlerts;
    } on MissingPluginException {
      // Widget tests and non-Android platforms do not expose this channel.
      return const [];
    } on PlatformException {
      return const [];
    }
  }
}
