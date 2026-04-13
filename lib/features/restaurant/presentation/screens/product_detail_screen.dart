import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/presentation/providers/menu_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.restaurantId,
    required this.menuItemId,
    this.preloaded,
  });

  final String restaurantId;
  final String menuItemId;
  final MenuItem? preloaded;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  final Set<String> _selected = {};

  int _extras(MenuItem item) {
    return item.options.where((o) => _selected.contains(o.id)).fold(0, (a, b) => a + b.priceDeltaCents);
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.simpleCurrency();
    final cacheKey = '${widget.restaurantId}|${widget.menuItemId}';
    final asyncItem = widget.preloaded != null && widget.preloaded!.id == widget.menuItemId
        ? AsyncValue<MenuItem>.data(widget.preloaded!)
        : ref.watch(singleMenuItemProvider(cacheKey));
    final itemForCart = asyncItem.asData?.value;

    return Scaffold(
      appBar: AppBar(title: const Text('Item')),
      body: asyncItem.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (item) {
          final unit = item.priceCents + _extras(item);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: 16 / 10,
                  child: AppNetworkImage(
                    imageUrl: item.imageUrl,
                    fit: BoxFit.cover,
                    placeholderIcon: Icons.fastfood,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(item.name, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(item.description ?? '', style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 16),
              Text('From ${money.format(unit / 100)}', style: Theme.of(context).textTheme.titleMedium),
              if (item.options.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text('Options', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                ...item.options.map(
                  (o) => CheckboxListTile(
                    value: _selected.contains(o.id),
                    onChanged: item.isAvailable
                        ? (v) => setState(() {
                              if (v == true) {
                                _selected.add(o.id);
                              } else {
                                _selected.remove(o.id);
                              }
                            })
                        : null,
                    title: Text(o.name),
                    subtitle: o.priceDeltaCents != 0 ? Text('+${money.format(o.priceDeltaCents / 100)}') : null,
                  ),
                ),
              ],
              if (!item.isAvailable)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Text('Currently unavailable', style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ),
            ],
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: itemForCart != null && itemForCart.isAvailable
                ? () {
                    ref.read(cartNotifierProvider.notifier).addItem(itemForCart, selectedOptionIds: Set.from(_selected));
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
                    context.pop();
                  }
                : null,
            child: const Text('Add to cart'),
          ),
        ),
      ),
    );
  }
}
