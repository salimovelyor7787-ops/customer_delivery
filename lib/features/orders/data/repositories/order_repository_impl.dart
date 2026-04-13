import 'package:customer_delivery/core/errors/failures.dart';
import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/cart/domain/entities/cart_line.dart';
import 'package:customer_delivery/features/orders/domain/entities/order_summary.dart';
import 'package:customer_delivery/features/orders/domain/repositories/order_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide Provider;

class OrderRepositoryImpl implements OrderRepository {
  OrderRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<Result<String>> createOrder({
    required String restaurantId,
    required String addressId,
    required String paymentMethod,
    required List<CartLine> lines,
  }) async {
    try {
      final body = {
        'restaurant_id': restaurantId,
        'address_id': addressId,
        'payment_method': paymentMethod,
        'items': lines
            .map(
              (l) => {
                'menu_item_id': l.menuItemId,
                'quantity': l.quantity,
                'selected_option_ids': l.selectedOptionIds.toList(),
              },
            )
            .toList(),
      };
      final res = await _client.functions.invoke(
        'create_order',
        body: body,
        method: HttpMethod.post,
      );
      if (res.status != null && res.status! >= 400) {
        return FailureResult(ValidationFailure(res.data?.toString() ?? 'Order rejected'));
      }
      final data = res.data;
      if (data is Map<String, dynamic> && data['order_id'] != null) {
        return Success(data['order_id'].toString());
      }
      if (data is Map && data['order_id'] != null) {
        return Success(data['order_id'].toString());
      }
      return const FailureResult(ServerFailure('Invalid create_order response'));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<OrderSummary>>> fetchActiveOrders() async {
    try {
      final res = await _client.functions.invoke(
        'get_active_orders',
        method: HttpMethod.get,
      );
      if (res.status != null && res.status! >= 400) {
        return FailureResult(ServerFailure(res.data?.toString() ?? 'Failed to load orders'));
      }
      final data = res.data;
      if (data is List) {
        final list = data.map((e) => OrderSummary.fromJson(Map<String, dynamic>.from(e as Map))).toList();
        return Success(list);
      }
      if (data is Map<String, dynamic> && data['orders'] is List) {
        final list = (data['orders'] as List)
            .map((e) => OrderSummary.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
        return Success(list);
      }
      return const Success([]);
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<OrderSummary>>> fetchOrderHistory({required int offset, int limit = 20}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) {
        return const FailureResult(AuthFailure('Not signed in'));
      }
      final end = offset + limit - 1;
      final rows = await _client
          .from('orders')
          .select('*, restaurants(name)')
          .eq('user_id', uid)
          .in_('status', ['delivered', 'cancelled', 'rejected'])
          .order('created_at', ascending: false)
          .range(offset, end);
      final list = (rows as List).map((e) => OrderSummary.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      return Success(list);
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }

  @override
  Future<Result<OrderSummary>> fetchOrderById(String orderId) async {
    try {
      final row = await _client.from('orders').select('*, restaurants(name)').eq('id', orderId).maybeSingle();
      if (row == null) {
        return const FailureResult(ServerFailure('Order not found'));
      }
      return Success(OrderSummary.fromJson(Map<String, dynamic>.from(row)));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }
}
