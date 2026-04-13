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
    return const MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Supabase configuration required', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                SizedBox(height: 16),
                Text(
                  'Run with dart-define values, for example:\n\n'
                  'flutter run '
                  '--dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co '
                  '--dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
