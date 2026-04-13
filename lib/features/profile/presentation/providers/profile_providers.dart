import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/profile/data/repositories/address_repository_impl.dart';
import 'package:customer_delivery/features/profile/domain/entities/address.dart';
import 'package:customer_delivery/features/profile/domain/repositories/address_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final addressRepositoryProvider = Provider<AddressRepository>((ref) {
  return AddressRepositoryImpl(ref.watch(supabaseClientProvider));
});

final addressesProvider = FutureProvider<List<Address>>((ref) async {
  final repo = ref.watch(addressRepositoryProvider);
  final res = await repo.fetchMyAddresses();
  return res.fold((f) => throw f, (d) => d);
});
