import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/orders/data/repositories/order_repository_impl.dart';
import 'package:customer_delivery/features/orders/domain/entities/order_summary.dart';
import 'package:customer_delivery/features/orders/domain/repositories/order_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepositoryImpl(ref.watch(supabaseClientProvider));
});

final activeOrdersProvider = FutureProvider<List<OrderSummary>>((ref) async {
  final repo = ref.watch(orderRepositoryProvider);
  final res = await repo.fetchActiveOrders();
  return res.fold((f) => throw f, (d) => d);
});

final orderHistoryProvider = FutureProvider<List<OrderSummary>>((ref) async {
  final repo = ref.watch(orderRepositoryProvider);
  final res = await repo.fetchOrderHistory(offset: 0, limit: 30);
  return res.fold((f) => throw f, (d) => d);
});

final orderDetailProvider = FutureProvider.family<OrderSummary, String>((ref, id) async {
  final repo = ref.watch(orderRepositoryProvider);
  final res = await repo.fetchOrderById(id);
  return res.fold((f) => throw f, (d) => d);
});
