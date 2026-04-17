/// Build-time configuration. Pass via:
/// `flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`
///
/// Optional [createOrderApiUrl]: full URL to the Next.js route that proxies checkout
/// (same as the website), e.g. `https://your-app.vercel.app/api/create-order`.
/// Use when Supabase Edge Function `create_order` is not deployed — avoids NOT_FOUND from the app.
class AppConfig {
  const AppConfig({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    this.createOrderApiUrl,
  });

  final String supabaseUrl;
  final String supabaseAnonKey;

  /// Trailing slash stripped; empty means use Supabase `functions.invoke` only.
  final String? createOrderApiUrl;

  static AppConfig fromEnvironment() {
    const url = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
    const key = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');
    const orderApi = String.fromEnvironment('CREATE_ORDER_API_URL', defaultValue: '');
    final trimmed = orderApi.trim();
    return AppConfig(
      supabaseUrl: url,
      supabaseAnonKey: key,
      createOrderApiUrl: trimmed.isEmpty ? null : trimmed.replaceAll(RegExp(r'/$'), ''),
    );
  }

  bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
