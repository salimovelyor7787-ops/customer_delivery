import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';

abstract class MenuRepository {
  Future<Result<List<MenuItem>>> fetchMenu({required String restaurantId});

  Future<Result<MenuItem>> fetchMenuItem({
    required String restaurantId,
    required String menuItemId,
  });
}
