import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:collection/collection.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/cart/presentation/utils/cart_helpers.dart';
import 'package:customer_delivery/features/cart/presentation/widgets/cart_quantity_control.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/presentation/providers/menu_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
    final cart = ref.watch(cartNotifierProvider);
    final selectedSet = Set<String>.from(_selected);
    final matchingLine = itemForCart == null
        ? null
        : cart.lines.firstWhereOrNull(
            (l) =>
                l.menuItemId == itemForCart.id &&
                const SetEquality<String>().equals(l.selectedOptionIds, selectedSet),
          );
    final qty = matchingLine?.quantity ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Taom')),
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
              Text("${money.format(unit / 100)} dan boshlab", style: Theme.of(context).textTheme.titleMedium),
              if (item.options.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text("Qo'shimchalar", style: Theme.of(context).textTheme.titleMedium),
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
                  child: Text('Hozir mavjud emas', style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ),
            ],
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: itemForCart == null || !itemForCart.isAvailable
              ? const FilledButton(onPressed: null, child: Text('Savatga'))
              : qty == 0
                  ? FilledButton(
                      onPressed: () async {
                        final ok = await ensureCartRestaurantOrConfirmSwitch(
                          context,
                          ref,
                          widget.restaurantId,
                        );
                        if (!ok || !context.mounted) return;
                        ref.read(cartNotifierProvider.notifier).addItem(
                              itemForCart,
                              selectedOptionIds: selectedSet,
                            );
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Savatga qo'shildi")),
                        );
                      },
                      child: const Text('Savatga'),
                    )
                  : Container(
                      child: CartQuantityControl(
                        quantity: qty,
                        onDecrement: () {
                          if (matchingLine == null) return;
                          ref
                              .read(cartNotifierProvider.notifier)
                              .setQuantity(matchingLine.lineId, matchingLine.quantity - 1);
                        },
                        onIncrement: () {
                          ref.read(cartNotifierProvider.notifier).addItem(
                                itemForCart,
                                selectedOptionIds: selectedSet,
                              );
                        },
                      ),
                    ),
        ),
      ),
    );
  }
}
