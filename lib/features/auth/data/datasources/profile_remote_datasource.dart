import 'package:supabase_flutter/supabase_flutter.dart';

/// Reads `profiles` row for the authenticated user.
class ProfileRemoteDataSource {
  ProfileRemoteDataSource(this._client);

  final SupabaseClient _client;

  Future<Map<String, dynamic>?> fetchProfile(String userId) async {
    final res = await _client.from('profiles').select().eq('id', userId).maybeSingle();
    return res;
  }
}
