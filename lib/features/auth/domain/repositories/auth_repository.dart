import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/auth/domain/entities/app_user.dart';

abstract class AuthRepository {
  Stream<AppUser?> get authStateChanges;

  AppUser? get currentUserProfile;

  Future<Result<AppUser>> signInWithEmail({required String email, required String password});

  Future<Result<AppUser>> registerWithEmail({
    required String email,
    required String password,
    required String fullName,
  });

  /// Returns [Success] with `true` when session cleared.
  Future<Result<bool>> signOut();
}
