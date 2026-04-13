import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/home/data/repositories/restaurant_repository_impl.dart';
import 'package:customer_delivery/features/home/domain/entities/category.dart';
import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';
import 'package:customer_delivery/features/home/domain/repositories/restaurant_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final restaurantRepositoryProvider = Provider<RestaurantRepository>((ref) {
  return RestaurantRepositoryImpl(ref.watch(supabaseClientProvider));
});

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final repo = ref.watch(restaurantRepositoryProvider);
  final res = await repo.fetchCategories();
  return res.fold((f) => throw f, (d) => d);
});

final restaurantDetailProvider = FutureProvider.family<Restaurant, String>((ref, id) async {
  final repo = ref.watch(restaurantRepositoryProvider);
  final res = await repo.fetchRestaurantById(id);
  return res.fold((f) => throw f, (d) => d);
});
