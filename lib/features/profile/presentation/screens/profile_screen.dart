import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/auth/presentation/notifiers/auth_action_notifier.dart';
import 'package:customer_delivery/features/auth/presentation/providers/auth_providers.dart';
import 'package:customer_delivery/features/profile/presentation/providers/profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _notificationsEnabled = true;

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(supabaseClientProvider).auth.currentSession;
    final user = ref.watch(currentUserProvider);
    final addressesAsync = ref.watch(addressesProvider);
    final t = Theme.of(context).textTheme;

    if (session == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Profil'),
          actions: const [
            Padding(
              padding: EdgeInsetsDirectional.only(end: 10),
              child: Icon(Icons.settings_outlined),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          children: [
            const _ProfileHeader(
              title: 'Mehmon foydalanuvchi',
              subtitle: "Profil va manzillar uchun tizimga kiring",
            ),
            const SizedBox(height: 14),
            _InviteCard(onTap: () {}),
            const SizedBox(height: 20),
            Text('Yordam va profil', style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            _SectionCard(
              children: [
                _MenuRow(
                  icon: Icons.support_agent_rounded,
                  title: "Qo'llab-quvvatlash chati",
                  subtitle: 'Yordam va savollar',
                  onTap: () => context.push('/support'),
                ),
                _MenuRow(
                  icon: Icons.location_on_outlined,
                  title: 'Mening manzillarim',
                  subtitle: 'Saqlangan manzillar',
                  onTap: () => context.push(withNextQuery('/login', '/profile')),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text('Sozlamalar', style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            _SectionCard(
              children: [
                _SwitchRow(
                  icon: Icons.notifications_none_rounded,
                  title: 'Bildirishnomalar',
                  subtitle: 'Push xabarlarni boshqarish',
                  value: _notificationsEnabled,
                  onChanged: (v) => setState(() => _notificationsEnabled = v),
                ),
                _MenuRow(
                  icon: Icons.info_outline_rounded,
                  title: 'Ilova haqida',
                  subtitle: 'Versiya 1.0.0',
                  onTap: () {},
                ),
              ],
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: () => context.push(withNextQuery('/login', '/profile')),
              child: const Text('Kirish'),
            ),
            TextButton(
              onPressed: () => context.push(withNextQuery('/register', '/profile')),
              child: const Text('Hisob yaratish'),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil'),
        actions: const [
          Padding(
            padding: EdgeInsetsDirectional.only(end: 10),
            child: Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        children: [
          _ProfileHeader(
            title: user?.fullName?.trim().isNotEmpty == true ? user!.fullName! : 'Foydalanuvchi',
            subtitle: user?.phone?.trim().isNotEmpty == true ? user!.phone! : (user?.email ?? ''),
          ),
          const SizedBox(height: 14),
          _InviteCard(onTap: () {}),
          const SizedBox(height: 20),
          Text('Yordam va profil', style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          _SectionCard(
            children: [
              _MenuRow(
                icon: Icons.support_agent_rounded,
                title: "Qo'llab-quvvatlash chati",
                subtitle: 'Yordam va savollar',
                onTap: () => context.push('/support'),
              ),
              _MenuRow(
                icon: Icons.location_on_outlined,
                title: 'Mening manzillarim',
                subtitle: addressesAsync.when(
                  data: (list) => list.isEmpty ? 'Saqlangan manzillar' : '${list.length} ta manzil saqlangan',
                  loading: () => 'Yuklanmoqda...',
                  error: (_, __) => 'Saqlangan manzillar',
                ),
                onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Manzil tahriri tez orada qo'shiladi")),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text('Sozlamalar', style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          _SectionCard(
            children: [
              _SwitchRow(
                icon: Icons.notifications_none_rounded,
                title: 'Bildirishnomalar',
                subtitle: 'Push xabarlarni boshqarish',
                value: _notificationsEnabled,
                onChanged: (v) => setState(() => _notificationsEnabled = v),
              ),
              _MenuRow(
                icon: Icons.info_outline_rounded,
                title: 'Ilova haqida',
                subtitle: 'Versiya 1.0.0',
                onTap: () {},
              ),
            ],
          ),
          const SizedBox(height: 22),
          FilledButton(
            onPressed: () async {
              await ref.read(authActionNotifierProvider.notifier).signOut();
              if (context.mounted) context.go('/home');
            },
            child: const Text('Chiqish'),
          ),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF2EC),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.person_rounded, size: 32, color: Color(0xFFFF7A00)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

class _InviteCard extends StatelessWidget {
  const _InviteCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF2EC),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const Icon(Icons.card_giftcard_rounded, color: Color(0xFFFF7A00), size: 30),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Do'stlaringizni taklif qiling",
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  'Bonus va chegirmalar oling!',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          FilledButton(
            onPressed: onTap,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFFF7A00),
              minimumSize: const Size(0, 36),
            ),
            child: const Text('Taklif qilish'),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(children: children),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFFDB8B2E)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
    );
  }
}

class _SwitchRow extends StatelessWidget {
  const _SwitchRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFFDB8B2E)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeColor: Colors.white,
        activeTrackColor: const Color(0xFFFF7A00),
      ),
    );
  }
}
