import 'package:collection/collection.dart';
import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/cart/domain/entities/cart_line.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/cart/presentation/utils/cart_helpers.dart';
import 'package:customer_delivery/features/cart/presentation/widgets/cart_quantity_control.dart';
import 'package:customer_delivery/features/home/domain/utils/restaurant_schedule.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
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
  String? _optionsItemId;
  Set<String> _selectedOptionIds = {};

  void _syncOptionsForItem(MenuItem item) {
    if (_optionsItemId == item.id) return;
    _optionsItemId = item.id;
    _selectedOptionIds = {};
  }

  int _optionsExtra(MenuItem item) {
    return item.options.where((o) => _selectedOptionIds.contains(o.id)).fold(0, (a, b) => a + b.priceDeltaCents);
  }

  int _effectivePriceCents(MenuItem item) {
    final base = item.isDeal && item.dealPriceCents != null ? item.dealPriceCents! : item.priceCents;
    return base + _optionsExtra(item);
  }

  @override
  Widget build(BuildContext context) {
    final cacheKey = '${widget.restaurantId}|${widget.menuItemId}';
    final asyncItem = widget.preloaded != null && widget.preloaded!.id == widget.menuItemId
        ? AsyncValue<MenuItem>.data(widget.preloaded!)
        : ref.watch(singleMenuItemProvider(cacheKey));

    final restaurantAsync = ref.watch(restaurantDetailProvider(widget.restaurantId));
    final canOrder = restaurantAsync.maybeWhen(
      data: (r) => isRestaurantOpenNow(r),
      orElse: () => true,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Taom')),
      body: asyncItem.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (item) {
          _syncOptionsForItem(item);
          final money = NumberFormat.simpleCurrency();
          final cart = ref.watch(cartNotifierProvider);
          const eq = SetEquality<String>();
          CartLine? line;
          for (final l in cart.lines) {
            if (l.menuItemId == item.id && eq.equals(l.selectedOptionIds, _selectedOptionIds)) {
              line = l;
              break;
            }
          }
          final qty = line?.quantity ?? 0;
          final plainLineId = line?.lineId;

          final desc = (item.description ?? '').trim();
          final unavailable = !item.isAvailable;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: CustomScrollView(
                  slivers: [
                    SliverToBoxAdapter(
                      child: AspectRatio(
                        aspectRatio: 4 / 3,
                        child: AppNetworkImage(
                          imageUrl: item.imageUrl,
                          fit: BoxFit.cover,
                          placeholderIcon: Icons.fastfood,
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          Text(
                            item.name,
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            money.format(_effectivePriceCents(item) / 100),
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          if (unavailable) ...[
                            const SizedBox(height: 12),
                            Text(
                              'Hozircha mavjud emas',
                              style: TextStyle(color: Theme.of(context).colorScheme.error),
                            ),
                          ],
                          if (desc.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Text(
                              'Tavsif',
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            Text(desc, style: Theme.of(context).textTheme.bodyLarge),
                          ],
                          if (item.options.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            Text(
                              "Qo'shimchalar",
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                          ],
                        ]),
                      ),
                    ),
                    if (item.options.isNotEmpty)
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, i) {
                              final opt = item.options[i];
                              final selected = _selectedOptionIds.contains(opt.id);
                              final deltaLabel = opt.priceDeltaCents > 0
                                  ? ' (+${money.format(opt.priceDeltaCents / 100)})'
                                  : opt.priceDeltaCents < 0
                                      ? ' (${money.format(opt.priceDeltaCents / 100)})'
                                      : '';
                              return CheckboxListTile(
                                value: selected,
                                onChanged: unavailable
                                    ? null
                                    : (v) {
                                        setState(() {
                                          if (v == true) {
                                            _selectedOptionIds = {..._selectedOptionIds, opt.id};
                                          } else {
                                            _selectedOptionIds = {..._selectedOptionIds}..remove(opt.id);
                                          }
                                        });
                                      },
                                title: Text('${opt.name}$deltaLabel'),
                                controlAffinity: ListTileControlAffinity.leading,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                              );
                            },
                            childCount: item.options.length,
                          ),
                        ),
                      ),
                    if (!canOrder)
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                        sliver: SliverToBoxAdapter(
                          child: Text(
                            "Restoran hozir ishlamayapti. Ish vaqtida buyurtma berish mumkin.",
                            style: TextStyle(color: Theme.of(context).colorScheme.error),
                          ),
                        ),
                      )
                    else
                      const SliverToBoxAdapter(child: SizedBox(height: 24)),
                  ],
                ),
              ),
              Material(
                elevation: 8,
                color: Theme.of(context).colorScheme.surface,
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            money.format(_effectivePriceCents(item) / 100),
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (qty == 0)
                          FilledButton.icon(
                            onPressed: unavailable || !canOrder
                                ? null
                                : () async {
                                    final messenger = ScaffoldMessenger.of(context);
                                    final ok = await ensureCartRestaurantOrConfirmSwitch(
                                      context,
                                      ref,
                                      widget.restaurantId,
                                    );
                                    if (!ok || !mounted) return;
                                    ref.read(cartNotifierProvider.notifier).addItem(
                                          item,
                                          selectedOptionIds: _selectedOptionIds,
                                        );
                                    messenger.showSnackBar(
                                      SnackBar(content: Text('«${item.name}» savatga qo‘shildi')),
                                    );
                                  },
                            icon: const Icon(Icons.add_shopping_cart_rounded),
                            label: const Text("Savatga qo'shish"),
                          )
                        else
                          CartQuantityControl(
                            quantity: qty,
                            compact: false,
                            onDecrement: () {
                              if (plainLineId == null) return;
                              ref.read(cartNotifierProvider.notifier).setQuantity(plainLineId, qty - 1);
                            },
                            onIncrement: () {
                              if (!canOrder) return;
                              ref.read(cartNotifierProvider.notifier).addItem(
                                    item,
                                    selectedOptionIds: _selectedOptionIds,
                                  );
                            },
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
