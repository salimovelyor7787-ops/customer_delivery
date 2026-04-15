import 'package:customer_delivery/core/errors/failures.dart';
import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/domain/repositories/menu_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MenuRepositoryImpl implements MenuRepository {
  MenuRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<Result<List<MenuItem>>> fetchMenu({required String restaurantId}) async {
    try {
      final rows = await _client
          .from('menu_items')
          .select('*, menu_item_options(*)')
          .eq('restaurant_id', restaurantId)
          .order('category', ascending: true)
          .order('sort_order');
      final list = (rows as List)
          .map((e) => MenuItem.fromJson(Map<String, dynamic>.from(e as Map), restaurantId: restaurantId))
          .toList();
      return Success(list);
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<MenuItem>> fetchMenuItem({
    required String restaurantId,
    required String menuItemId,
  }) async {
    try {
      final row = await _client
          .from('menu_items')
          .select('*, menu_item_options(*)')
          .eq('restaurant_id', restaurantId)
          .eq('id', menuItemId)
          .maybeSingle();
      if (row == null) {
        return const FailureResult(ServerFailure('Item not found'));
      }
      return Success(MenuItem.fromJson(Map<String, dynamic>.from(row), restaurantId: restaurantId));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }
}
