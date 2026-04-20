import 'package:customer_delivery/core/errors/failures.dart';
import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/profile/domain/entities/address.dart';
import 'package:customer_delivery/features/profile/domain/repositories/address_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AddressRepositoryImpl implements AddressRepository {
  AddressRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<Result<List<Address>>> fetchMyAddresses() async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) {
        return const FailureResult(AuthFailure('Not signed in'));
      }
      final rows = await _client.from('addresses').select().eq('user_id', uid).order('is_default', ascending: false);
      final list = (rows as List).map((e) => Address.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      return Success(list);
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }
}
