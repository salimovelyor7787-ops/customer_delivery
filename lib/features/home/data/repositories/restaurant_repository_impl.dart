import 'package:customer_delivery/core/errors/failures.dart';
import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/home/domain/entities/category.dart';
import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';
import 'package:customer_delivery/features/home/domain/repositories/restaurant_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class RestaurantRepositoryImpl implements RestaurantRepository {
  RestaurantRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<Result<Restaurant>> fetchRestaurantById(String id) async {
    try {
      final row = await _client.from('restaurants').select('*, categories(name)').eq('id', id).maybeSingle();
      if (row == null) {
        return const FailureResult(ServerFailure('Restaurant not found'));
      }
      return Success(Restaurant.fromJson(Map<String, dynamic>.from(row)));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<Category>>> fetchCategories() async {
    try {
      final rows = await _client.from('categories').select().order('sort_order');
      final list = (rows as List).map((e) => Category.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      return Success(list);
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<RestaurantPage>> fetchRestaurants({
    String? categoryId,
    String? searchQuery,
    required int offset,
    int limit = 20,
  }) async {
    try {
      var query = _client.from('restaurants').select('*, categories(name)');
      if (categoryId != null && categoryId.isNotEmpty) {
        query = query.eq('category_id', categoryId);
      }
      final q = searchQuery?.trim();
      if (q != null && q.isNotEmpty) {
        final pattern = '%$q%';
        query = query.or('name.ilike.$pattern,slug.ilike.$pattern');
      }
      final end = offset + limit;
      final rows = await query.order('name').range(offset, end);
      final list = (rows as List).map((e) => Restaurant.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      final hasMore = list.length > limit;
      final items = hasMore ? list.sublist(0, limit) : list;
      return Success(RestaurantPage(items: items, hasMore: hasMore));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }
}
