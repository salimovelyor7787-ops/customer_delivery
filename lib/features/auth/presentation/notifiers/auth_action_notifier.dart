import 'package:customer_delivery/features/auth/domain/repositories/auth_repository.dart';
import 'package:customer_delivery/features/auth/presentation/providers/auth_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthActionState {
  const AuthActionState({this.loading = false, this.error});

  final bool loading;
  final String? error;

  AuthActionState copyWith({bool? loading, String? error}) {
    return AuthActionState(
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

final authActionNotifierProvider =
    NotifierProvider<AuthActionNotifier, AuthActionState>(AuthActionNotifier.new);

class AuthActionNotifier extends Notifier<AuthActionState> {
  AuthRepository get _auth => ref.read(authRepositoryProvider);

  @override
  AuthActionState build() => const AuthActionState();

  Future<bool> signIn(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    final res = await _auth.signInWithEmail(email: email, password: password);
    state = state.copyWith(loading: false);
    return res.fold(
      (f) {
        state = state.copyWith(error: f.message);
        return false;
      },
      (_) => true,
    );
  }

  Future<void> register(String email, String password, String name) async {
    state = state.copyWith(loading: true, error: null);
    final res = await _auth.registerWithEmail(email: email, password: password, fullName: name);
    state = state.copyWith(loading: false);
    res.fold(
      (f) => state = state.copyWith(error: f.message),
      (_) {},
    );
  }

  Future<bool> signInWithGoogle() async {
    state = state.copyWith(loading: true, error: null);
    final res = await _auth.signInWithGoogle();
    state = state.copyWith(loading: false);
    return res.fold(
      (f) {
        state = state.copyWith(error: f.message);
        return false;
      },
      (_) => true,
    );
  }

  Future<void> signOut() async {
    state = state.copyWith(loading: true, error: null);
    final res = await _auth.signOut();
    state = state.copyWith(loading: false);
    res.fold(
      (f) => state = state.copyWith(error: f.message),
      (_) {},
    );
  }
}
