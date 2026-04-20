import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/restaurant/data/repositories/menu_repository_impl.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/domain/repositories/menu_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final menuRepositoryProvider = Provider<MenuRepository>((ref) {
  return MenuRepositoryImpl(ref.watch(supabaseClientProvider));
});

final restaurantMenuProvider = FutureProvider.family<List<MenuItem>, String>((ref, restaurantId) async {
  final repo = ref.watch(menuRepositoryProvider);
  final res = await repo.fetchMenu(restaurantId: restaurantId);
  return res.fold((f) => throw f, (d) => d);
});

/// Key format: `restaurantId|menuItemId`
final singleMenuItemProvider = FutureProvider.family<MenuItem, String>((ref, key) async {
  final parts = key.split('|');
  if (parts.length != 2) throw ArgumentError('Invalid menu item key');
  final repo = ref.watch(menuRepositoryProvider);
  final res = await repo.fetchMenuItem(restaurantId: parts[0], menuItemId: parts[1]);
  return res.fold((f) => throw f, (d) => d);
});
