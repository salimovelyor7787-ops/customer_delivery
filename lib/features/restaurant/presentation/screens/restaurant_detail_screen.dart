import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/cart/presentation/utils/cart_helpers.dart';
import 'package:customer_delivery/features/cart/presentation/widgets/cart_quantity_control.dart';
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
    final money = NumberFormat.simpleCurrency();

    return Scaffold(
      body: restaurantAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (r) {
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
                            label: Text(r.isOpen ? 'Ochiq' : 'Yopiq'),
                            backgroundColor: r.isOpen ? Colors.green.shade100 : null,
                          ),
                          const SizedBox(width: 8),
                          Text("Yetkazib berish ${money.format(r.deliveryFeeCents / 100)} dan"),
                        ],
                      ),
                      if (!r.isOpen)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            "Restoran hozir yopiq. Menyuni ko'rish mumkin, buyurtma berish vaqtincha cheklangan bo'lishi mumkin.",
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
                error: (e, _) => SliverFillRemaining(child: Center(child: Text('$e'))),
                data: (items) {
                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final item = items[i];
                        return _MenuItemListTile(
                          item: item,
                          restaurantId: restaurantId,
                          money: money,
                        );
                      },
                      childCount: items.length,
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

class _MenuItemListTile extends ConsumerWidget {
  const _MenuItemListTile({
    required this.item,
    required this.restaurantId,
    required this.money,
  });

  final MenuItem item;
  final String restaurantId;
  final NumberFormat money;

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
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(money.format(item.priceCents / 100)),
          const SizedBox(width: 6),
          if (qty == 0)
            IconButton(
              tooltip: 'Savatga',
              icon: const Icon(Icons.add_shopping_cart_outlined),
              onPressed: item.isAvailable
                  ? () async {
                      final ok = await ensureCartRestaurantOrConfirmSwitch(context, ref, restaurantId);
                      if (!ok || !context.mounted) return;
                      ref.read(cartNotifierProvider.notifier).addItem(item);
                      ScaffoldMessenger.of(context).showSnackBar(
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
                ref.read(cartNotifierProvider.notifier).addItem(item);
              },
            ),
        ],
      ),
      onTap: () => context.push(
        '/home/restaurant/$restaurantId/item/${item.id}',
        extra: item,
      ),
    );
  }
}
