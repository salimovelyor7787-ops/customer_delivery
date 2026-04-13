import 'package:customer_delivery/core/constants/app_roles.dart';
import 'package:customer_delivery/core/errors/failures.dart';
import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/auth/data/datasources/profile_remote_datasource.dart';
import 'package:customer_delivery/features/auth/domain/entities/app_user.dart';
import 'package:customer_delivery/features/auth/domain/repositories/auth_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._client, this._profiles);

  final SupabaseClient _client;
  final ProfileRemoteDataSource _profiles;

  AppUser? _cachedProfile;

  @override
  AppUser? get currentUserProfile => _cachedProfile;

  @override
  Stream<AppUser?> get authStateChanges {
    return _client.auth.onAuthStateChange.asyncMap((event) async {
      final session = event.session;
      if (session == null) {
        _cachedProfile = null;
        return null;
      }
      final profile = await _loadAndValidateCustomer(session.user.id);
      if (profile == null) {
        await _client.auth.signOut();
        _cachedProfile = null;
        return null;
      }
      _cachedProfile = profile;
      return profile;
    });
  }

  Future<AppUser?> _loadAndValidateCustomer(String userId) async {
    try {
      final row = await _profiles.fetchProfile(userId);
      if (row == null) {
        return null;
      }
      final role = row['role'] as String? ?? '';
      if (role != AppRoles.customer) {
        return null;
      }
      return AppUser(
        id: userId,
        email: _client.auth.currentUser?.email,
        role: role,
        fullName: row['full_name'] as String?,
        phone: row['phone'] as String?,
        avatarUrl: row['avatar_url'] as String?,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Future<Result<AppUser>> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _client.auth.signInWithPassword(email: email, password: password);
      final user = res.user;
      if (user == null) {
        return const FailureResult(AuthFailure('Sign in failed'));
      }
      final profile = await _loadAndValidateCustomer(user.id);
      if (profile == null) {
        await _client.auth.signOut();
        return const FailureResult(
          RoleFailure('This app is for customers only. Use the correct app for your role.'),
        );
      }
      _cachedProfile = profile;
      return Success(profile);
    } on AuthException catch (e) {
      return FailureResult(AuthFailure(e.message));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<AppUser>> registerWithEmail({
    required String email,
    required String password,
    required String fullName,
  }) async {
    try {
      final res = await _client.auth.signUp(email: email, password: password);
      final user = res.user;
      if (user == null) {
        return const FailureResult(AuthFailure('Registration failed'));
      }
      await _client.from('profiles').upsert({
        'id': user.id,
        'role': AppRoles.customer,
        'full_name': fullName,
      });
      final profile = await _loadAndValidateCustomer(user.id);
      if (profile == null) {
        await _client.auth.signOut();
        return const FailureResult(ServerFailure('Profile setup failed'));
      }
      _cachedProfile = profile;
      return Success(profile);
    } on AuthException catch (e) {
      return FailureResult(AuthFailure(e.message));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<bool>> signOut() async {
    try {
      await _client.auth.signOut();
      _cachedProfile = null;
      return const Success(true);
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }
}
