import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/home/domain/entities/category.dart';
import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';

class RestaurantPage {
  const RestaurantPage({required this.items, required this.hasMore});

  final List<Restaurant> items;
  final bool hasMore;
}

abstract class RestaurantRepository {
  Future<Result<List<Category>>> fetchCategories();

  Future<Result<Restaurant>> fetchRestaurantById(String id);

  Future<Result<RestaurantPage>> fetchRestaurants({
    String? categoryId,
    String? searchQuery,
    required int offset,
    int limit = 20,
  });
}
