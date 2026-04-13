import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/auth/presentation/notifiers/auth_action_notifier.dart';
import 'package:customer_delivery/features/auth/presentation/providers/auth_providers.dart';
import 'package:customer_delivery/features/profile/presentation/providers/profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(supabaseClientProvider).auth.currentSession;

    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Sign in to see your profile and saved addresses.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 24),
                ListTile(
                  leading: const Icon(Icons.receipt_long_rounded),
                  title: const Text('Мои заказы'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/orders'),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () => context.push(withNextQuery('/login', '/profile')),
                  child: const Text('Sign in'),
                ),
                TextButton(
                  onPressed: () => context.push(withNextQuery('/register', '/profile')),
                  child: const Text('Create account'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final user = ref.watch(currentUserProvider);
    final addressesAsync = ref.watch(addressesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(user?.fullName ?? 'Customer'),
            subtitle: Text(user?.email ?? ''),
          ),
          ListTile(
            leading: const Icon(Icons.receipt_long_rounded),
            title: const Text('Мои заказы'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => context.push('/orders'),
          ),
          const Divider(),
          Text('Saved addresses', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          addressesAsync.when(
            data: (list) {
              if (list.isEmpty) {
                return const Text('No addresses yet. Add one in your Supabase dashboard or profile API.');
              }
              return Column(
                children: list
                    .map(
                      (a) => Card(
                        child: ListTile(
                          title: Text(a.label),
                          subtitle: Text(a.singleLine),
                          trailing: a.isDefault ? const Chip(label: Text('Default')) : null,
                        ),
                      ),
                    )
                    .toList(),
              );
            },
            loading: () => const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
            error: (e, _) => Text('Addresses: $e'),
          ),
          const SizedBox(height: 24),
          FilledButton.tonal(
            onPressed: () async {
              await ref.read(authActionNotifierProvider.notifier).signOut();
              if (context.mounted) context.go('/home');
            },
            child: const Text('Log out'),
          ),
        ],
      ),
    );
  }
}
