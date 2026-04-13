import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/auth/data/datasources/profile_remote_datasource.dart';
import 'package:customer_delivery/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:customer_delivery/features/auth/domain/entities/app_user.dart';
import 'package:customer_delivery/features/auth/domain/repositories/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final profileRemoteDataSourceProvider = Provider<ProfileRemoteDataSource>((ref) {
  return ProfileRemoteDataSource(ref.watch(supabaseClientProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    ref.watch(supabaseClientProvider),
    ref.watch(profileRemoteDataSourceProvider),
  );
});

/// Emits the current customer profile when signed in; `null` when signed out.
final authStateProvider = StreamProvider<AppUser?>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return repo.authStateChanges;
});

final currentUserProvider = Provider<AppUser?>((ref) {
  return ref.watch(authStateProvider).valueOrNull;
});
