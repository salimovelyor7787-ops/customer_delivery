import 'package:customer_delivery/core/config/app_config.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide Provider;

/// Global Supabase client (initialized in `main`).
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final appConfigProvider = Provider<AppConfig>((ref) {
  throw UnimplementedError('Override appConfigProvider in ProviderScope');
});
