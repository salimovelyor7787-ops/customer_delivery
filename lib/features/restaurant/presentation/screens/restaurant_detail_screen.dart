import 'dart:io';

import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/cart/presentation/utils/cart_helpers.dart';
import 'package:customer_delivery/features/cart/presentation/widgets/cart_quantity_control.dart';
import 'package:customer_delivery/features/home/domain/utils/restaurant_schedule.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/presentation/providers/menu_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class RestaurantDetailScreen extends ConsumerWidget {
  const RestaurantDetailScreen({super.key, required this.restaurantId});

  final String restaurantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final restaurantAsync = ref.watch(restaurantDetailProvider(restaurantId));
    final menuAsync = ref.watch(restaurantMenuProvider(restaurantId));
    final money = NumberFormat.currency(locale: 'uz_UZ', symbol: "so'm ", decimalDigits: 0);

    return Scaffold(
      body: restaurantAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _buildErrorView(context, e),
        data: (r) {
          final canOrder = isRestaurantOpenNow(r);
          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 180,
                pinned: true,
                centerTitle: false,
                flexibleSpace: FlexibleSpaceBar(
                  titlePadding: const EdgeInsetsDirectional.only(start: 12, bottom: 12, end: 12),
                  title: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.35),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      r.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        shadows: [
                          Shadow(color: Colors.black54, blurRadius: 4, offset: Offset(0, 1)),
                        ],
                      ),
                    ),
                  ),
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      AppNetworkImage(imageUrl: r.imageUrl, fit: BoxFit.cover),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withOpacity(0.08),
                              Colors.black.withOpacity(0.12),
                              Colors.black.withOpacity(0.45),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Chip(
                            label: Text(canOrder ? 'Ochiq' : 'Yopiq'),
                            backgroundColor: canOrder ? Colors.green.shade100 : null,
                          ),
                          const SizedBox(width: 8),
                          Text("Ish vaqti: ${restaurantWorkingHoursLabel(r)}"),
                        ],
                      ),
                      if (!canOrder)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            "Restoran hozir ishlamayapti. Ish vaqtida buyurtma berish mumkin.",
                            style: TextStyle(color: Theme.of(context).colorScheme.error),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              menuAsync.when(
                loading: () => const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => SliverFillRemaining(child: _buildErrorView(context, e)),
                data: (items) {
                  final grouped = <String, List<MenuItem>>{};
                  for (final item in items) {
                    final rawCategory = item.category?.trim() ?? '';
                    final category = rawCategory.isEmpty ? 'Boshqa' : rawCategory;
                    grouped.putIfAbsent(category, () => <MenuItem>[]).add(item);
                  }
                  final sections = grouped.entries.toList();
                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final section = sections[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                                child: Text(
                                  section.key,
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                              ...section.value.map(
                                (item) => _MenuItemListTile(
                                  item: item,
                                  restaurantId: restaurantId,
                                  money: money,
                                  canOrder: canOrder,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                      childCount: sections.length,
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

bool _isOfflineError(Object error) {
  if (error is SocketException) return true;
  final text = error.toString().toLowerCase();
  return text.contains('failed host lookup') || text.contains('socketexception');
}

Widget _buildErrorView(BuildContext context, Object error) {
  if (_isOfflineError(error)) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          'Iltimos internet ulanishini tekshiring',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
  return Center(child: Text('$error'));
}

class _MenuItemListTile extends ConsumerWidget {
  const _MenuItemListTile({
    required this.item,
    required this.restaurantId,
    required this.money,
    required this.canOrder,
  });

  final MenuItem item;
  final String restaurantId;
  final NumberFormat money;
  final bool canOrder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartNotifierProvider);
    String? plainLineId;
    var qty = 0;
    for (final line in cart.lines) {
      if (line.menuItemId == item.id && line.selectedOptionIds.isEmpty) {
        plainLineId = line.lineId;
        qty = line.quantity;
        break;
      }
    }

    return ListTile(
      leading: SizedBox(
        width: 56,
        height: 56,
        child: AppNetworkImage(
          imageUrl: item.imageUrl,
          borderRadius: BorderRadius.circular(8),
          placeholderIcon: Icons.fastfood,
        ),
      ),
      title: Text(item.name),
      subtitle: Text(
        item.description ?? '',
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: SizedBox(
        width: 112,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (item.isDeal && item.dealPriceCents != null) ...[
              Text(
                money.format(item.effectivePriceCents / 100),
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              Text(
                money.format(item.priceCents / 100),
                style: TextStyle(
                  fontSize: 12,
                  decoration: TextDecoration.lineThrough,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ] else
              Text(
                money.format(item.priceCents / 100),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            const SizedBox(height: 6),
            if (qty == 0)
              IconButton(
                tooltip: 'Savatga',
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.add_rounded),
                onPressed: item.isAvailable && canOrder
                    ? () async {
                        final messenger = ScaffoldMessenger.of(context);
                        final ok = await ensureCartRestaurantOrConfirmSwitch(context, ref, restaurantId);
                        if (!ok) return;
                        ref.read(cartNotifierProvider.notifier).addItem(item);
                        messenger.showSnackBar(
                          SnackBar(content: Text('«${item.name}» savatga qo‘shildi')),
                        );
                      }
                    : null,
              )
            else
              CartQuantityControl(
                quantity: qty,
                compact: true,
                onDecrement: () {
                  if (plainLineId == null) return;
                  ref.read(cartNotifierProvider.notifier).setQuantity(plainLineId, qty - 1);
                },
                onIncrement: () {
                  if (!canOrder) return;
                  ref.read(cartNotifierProvider.notifier).addItem(item);
                },
              ),
          ],
        ),
      ),
      onTap: () => context.push(
        '/home/restaurant/$restaurantId/item/${item.id}',
        extra: item,
      ),
    );
  }
}
