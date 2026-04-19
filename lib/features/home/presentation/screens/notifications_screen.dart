import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/home/domain/entities/home_banner.dart';
import 'package:customer_delivery/features/home/domain/entities/home_deal_item.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class PromoCodeItem {
  const PromoCodeItem({
    required this.id,
    required this.code,
    required this.discount,
    this.discountFixedCents,
  });

  final String id;
  final String code;
  final int discount;
  final int? discountFixedCents;

  String get discountLabel {
    if (discountFixedCents != null && discountFixedCents! > 0) {
      return '-${(discountFixedCents! / 100).toStringAsFixed(0)} so\'m';
    }
    return '-$discount%';
  }

  factory PromoCodeItem.fromJson(Map<String, dynamic> json) {
    return PromoCodeItem(
      id: json['id'].toString(),
      code: (json['code'] as String? ?? '').toUpperCase(),
      discount: (json['discount'] as num?)?.toInt() ?? 0,
      discountFixedCents: (json['discount_fixed_cents'] as num?)?.toInt(),
    );
  }
}

class PushNoticeItem {
  const PushNoticeItem({
    required this.id,
    required this.title,
    this.body,
    required this.createdAt,
    required this.isActive,
  });

  final String id;
  final String title;
  final String? body;
  final DateTime createdAt;
  final bool isActive;

  factory PushNoticeItem.fromJson(Map<String, dynamic> json) {
    return PushNoticeItem(
      id: json['id'].toString(),
      title: json['title'] as String? ?? '',
      body: json['body'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

final activePromocodesProvider = FutureProvider<List<PromoCodeItem>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final rows = await client
      .from('promocodes')
      .select('id, code, discount, discount_fixed_cents')
      .eq('active', true)
      .eq('listed_for_customers', true)
      .order('created_at', ascending: false)
      .limit(20);
  return (rows as List)
      .map((e) => PromoCodeItem.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
});

final pushNoticesProvider = FutureProvider<List<PushNoticeItem>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final rows = await client
      .from('push_notifications')
      .select('id, title, body, created_at, is_active')
      .eq('is_active', true)
      .order('created_at', ascending: false)
      .limit(30);
  return (rows as List)
      .map((e) => PushNoticeItem.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dealsAsync = ref.watch(homeDealsProvider);
    final bannersAsync = ref.watch(homeBannersProvider);
    final promoAsync = ref.watch(activePromocodesProvider);
    final pushAsync = ref.watch(pushNoticesProvider);
    final money = NumberFormat.currency(locale: 'uz_UZ', symbol: "so'm ", decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: const Text("Bildirishnomalar")),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          _SectionCard(
            title: 'Aksiyalar va bonuslar',
            icon: Icons.local_offer_outlined,
            child: dealsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: LinearProgressIndicator(minHeight: 2),
              ),
              error: (e, _) => Text('$e'),
              data: (deals) {
                if (deals.isEmpty) {
                  return const Text("Hozircha aksiyalar mavjud emas");
                }
                return Column(
                  children: deals.take(6).map((deal) => _DealRow(deal: deal, money: money)).toList(),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Banner bonuslar',
            icon: Icons.card_giftcard_outlined,
            child: bannersAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: LinearProgressIndicator(minHeight: 2),
              ),
              error: (e, _) => Text('$e'),
              data: (items) {
                if (items.isEmpty) {
                  return const Text("Hozircha bonus bannerlar yo'q");
                }
                return Column(children: items.take(5).map((banner) => _BannerRow(banner: banner)).toList());
              },
            ),
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Push bildirishnomalar',
            icon: Icons.notifications_active_outlined,
            child: pushAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: LinearProgressIndicator(minHeight: 2),
              ),
              error: (e, _) => Text('$e'),
              data: (items) {
                if (items.isEmpty) return const Text("Yangi push bildirishnomalar yo'q");
                final dateFmt = DateFormat('dd.MM.yyyy HH:mm');
                return Column(
                  children: items
                      .map(
                        (n) => ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.circle, size: 8),
                          title: Text(n.title),
                          subtitle: Text(
                            n.body == null || n.body!.trim().isEmpty
                                ? dateFmt.format(n.createdAt)
                                : '${n.body}\n${dateFmt.format(n.createdAt)}',
                          ),
                        ),
                      )
                      .toList(),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Promokodlar',
            icon: Icons.percent_rounded,
            child: promoAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: LinearProgressIndicator(minHeight: 2),
              ),
              error: (e, _) => Text('$e'),
              data: (items) {
                if (items.isEmpty) return const Text("Faol promokodlar mavjud emas");
                return Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: items
                      .map(
                        (promo) => Chip(
                          label: Text('${promo.code}  •  ${promo.discountLabel}'),
                          avatar: const Icon(Icons.local_offer_outlined, size: 16),
                        ),
                      )
                      .toList(),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x14000000)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _DealRow extends StatelessWidget {
  const _DealRow({
    required this.deal,
    required this.money,
  });

  final HomeDealItem deal;
  final NumberFormat money;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(deal.name),
      subtitle: Text(
        '${money.format(deal.basePriceCents / 100)}  ->  ${money.format(deal.dealPriceCents / 100)}',
      ),
      trailing: Text(
        '-${deal.discountPercent}%',
        style: TextStyle(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _BannerRow extends StatelessWidget {
  const _BannerRow({required this.banner});

  final HomeBanner banner;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(banner.title),
      subtitle: Text(
        banner.subtitle == null || banner.subtitle!.trim().isEmpty ? 'Bonus banner' : banner.subtitle!,
      ),
      trailing: banner.buttonText == null || banner.buttonText!.isEmpty
          ? null
          : Text(
              banner.buttonText!,
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
    );
  }
}
