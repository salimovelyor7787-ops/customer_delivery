import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/cart/domain/entities/cart_line.dart';
import 'package:customer_delivery/features/orders/domain/entities/order_summary.dart';

abstract class OrderRepository {
  Future<Result<String>> createOrder({
    required String restaurantId,
    required String addressId,
    required String paymentMethod,
    required List<CartLine> lines,
  });

  Future<Result<List<OrderSummary>>> fetchActiveOrders();

  Future<Result<List<OrderSummary>>> fetchOrderHistory({required int offset, int limit = 20});

  Future<Result<OrderSummary>> fetchOrderById(String orderId);
}
