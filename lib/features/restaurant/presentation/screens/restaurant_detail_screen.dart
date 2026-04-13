import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/cart/presentation/utils/cart_helpers.dart';
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
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(r.name),
                  background: AppNetworkImage(imageUrl: r.imageUrl, fit: BoxFit.cover),
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
                            label: Text(r.isOpen ? 'Открыто' : 'Закрыто'),
                            backgroundColor: r.isOpen ? Colors.green.shade100 : null,
                          ),
                          const SizedBox(width: 8),
                          Text('Доставка от ${money.format(r.deliveryFeeCents / 100)}'),
                        ],
                      ),
                      if (!r.isOpen)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Ресторан сейчас закрыт. Меню можно смотреть, оформление заказа может быть недоступно.',
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/cart'),
        icon: const Icon(Icons.shopping_cart),
        label: const Text('Корзина'),
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
          IconButton(
            tooltip: 'В корзину',
            icon: const Icon(Icons.add_shopping_cart_outlined),
            onPressed: item.isAvailable
                ? () async {
                    final ok = await ensureCartRestaurantOrConfirmSwitch(context, ref, restaurantId);
                    if (!ok || !context.mounted) return;
                    ref.read(cartNotifierProvider.notifier).addItem(item);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('«${item.name}» добавлено в корзину')),
                    );
                  }
                : null,
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
