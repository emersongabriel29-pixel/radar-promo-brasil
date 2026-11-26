// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class InstalledAppVersion extends StatefulWidget {
  const InstalledAppVersion({super.key});

  @override
  State<InstalledAppVersion> createState() => _InstalledAppVersionState();
}

class _InstalledAppVersionState extends State<InstalledAppVersion> {
  static const channel = MethodChannel('br.com.radarpromo/app_info');
  late final Future<String> version = _read();

  Future<String> _read() async {
    try {
      final info = await channel.invokeMapMethod<String, dynamic>('getVersion');
      final name = info?['version']?.toString() ?? '';
      final build = info?['build']?.toString() ?? '';
      if (name.isNotEmpty && build.isNotEmpty) return 'Versão $name ($build)';
    } on PlatformException {
      // Do not invent a version when package metadata is unavailable.
    } on MissingPluginException {
      // Non-Android widget tests and unsupported platforms.
    }
    return 'Versão indisponível';
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<String>(
    future: version,
    builder: (_, snapshot) => Text(
      snapshot.data ?? 'Consultando versão…',
      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12),
    ),
  );
}
