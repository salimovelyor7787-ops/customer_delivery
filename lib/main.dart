import 'package:customer_delivery/app.dart';
import 'package:customer_delivery/core/config/app_config.dart';
import 'package:customer_delivery/core/di/providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();
  if (!config.isConfigured) {
    runApp(const _MissingSupabaseConfigApp());
    return;
  }

  await Supabase.initialize(
    url: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
  );

  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
      ],
      child: const CustomerApp(),
    ),
  );
}

class _MissingSupabaseConfigApp extends StatelessWidget {
  const _MissingSupabaseConfigApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Нужны ключи Supabase',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 12),
                Text(
                  'В APK не были переданы URL и anon-ключ при сборке. '
                  'Ключи подставляются только на этапе компиляции (dart-define), в коде их нет.',
                ),
                SizedBox(height: 20),
                Text('Что сделать', style: TextStyle(fontWeight: FontWeight.w600)),
                SizedBox(height: 8),
                Text(
                  '• GitHub Actions: в репозитории Settings → Secrets → Actions задайте '
                  'SUPABASE_URL и SUPABASE_ANON_KEY, затем снова запустите workflow «Build Android APK».\n\n'
                  '• Локально: скопируйте dart_defines.example.json → dart_defines.json, '
                  'вставьте свои значения и выполните:\n'
                  'flutter build apk --release --dart-define-from-file=dart_defines.json\n\n'
                  '• Запуск с ПК:\n'
                  'flutter run --dart-define=SUPABASE_URL=https://....supabase.co '
                  '--dart-define=SUPABASE_ANON_KEY=eyJ...',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
