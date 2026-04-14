import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/presentation/providers/menu_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProductDetailScreen extends ConsumerWidget {
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
  Widget build(BuildContext context, WidgetRef ref) {
    final cacheKey = '$restaurantId|$menuItemId';
    final asyncItem = preloaded != null && preloaded!.id == menuItemId
        ? AsyncValue<MenuItem>.data(preloaded!)
        : ref.watch(singleMenuItemProvider(cacheKey));

    return Scaffold(
      appBar: AppBar(title: const Text('Taom')),
      body: asyncItem.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (item) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(item.name, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(item.description ?? '', style: Theme.of(context).textTheme.bodyLarge),
            ],
          );
        },
      ),
    );
  }
}
