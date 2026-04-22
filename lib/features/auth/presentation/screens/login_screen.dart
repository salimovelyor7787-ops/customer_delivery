import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/auth/presentation/notifiers/auth_action_notifier.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final action = ref.watch(authActionNotifierProvider);
    final next = GoRouterState.of(context).uri.queryParameters['next'];
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Customer', style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 8),
                    Text('Sign in to order food', style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email'),
                      validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _password,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password'),
                      validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null,
                    ),
                    if (action.error != null) ...[
                      const SizedBox(height: 12),
                      Text(action.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: action.loading
                          ? null
                          : () async {
                              if (!_formKey.currentState!.validate()) return;
                              final ok = await ref
                                  .read(authActionNotifierProvider.notifier)
                                  .signIn(_email.text.trim(), _password.text);
                              if (ok && context.mounted) {
                                context.go(safeRedirectPath(next) ?? '/home');
                              }
                            },
                      child: action.loading
                          ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Sign in'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: action.loading
                          ? null
                          : () async {
                              await ref.read(authActionNotifierProvider.notifier).signInWithGoogle();
                            },
                      icon: const Icon(Icons.g_mobiledata_rounded, size: 22),
                      label: const Text('Continue with Google'),
                    ),
                    TextButton(
                      onPressed: () => context.push(withNextQuery('/register', next)),
                      child: const Text('Create account'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
