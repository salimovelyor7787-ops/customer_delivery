import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
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
                            label: Text(r.isOpen ? 'Open' : 'Closed'),
                            backgroundColor: r.isOpen ? Colors.green.shade100 : null,
                          ),
                          const SizedBox(width: 8),
                          Text('Delivery from ${money.format(r.deliveryFeeCents / 100)}'),
                        ],
                      ),
                      if (!r.isOpen)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'This restaurant is closed. You can browse the menu but checkout may be blocked by the server.',
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
                          trailing: Text(money.format(item.priceCents / 100)),
                          onTap: () => context.push(
                            '/home/restaurant/$restaurantId/item/${item.id}',
                            extra: item,
                          ),
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
        onPressed: () {
          final cart = ref.read(cartNotifierProvider);
          if (cart.restaurantId != null && cart.restaurantId != restaurantId) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Your cart has items from another restaurant. Clear cart first.')),
            );
            return;
          }
          context.go('/cart');
        },
        icon: const Icon(Icons.shopping_cart),
        label: const Text('Cart'),
      ),
    );
  }
}
