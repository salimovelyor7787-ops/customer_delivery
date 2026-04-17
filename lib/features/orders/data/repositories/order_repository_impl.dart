import 'dart:convert';

import 'package:customer_delivery/core/errors/failures.dart';
import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/cart/domain/entities/cart_line.dart';
import 'package:customer_delivery/features/orders/domain/entities/order_summary.dart';
import 'package:customer_delivery/features/orders/domain/repositories/order_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide Provider;

class OrderRepositoryImpl implements OrderRepository {
  OrderRepositoryImpl(this._client);

  final SupabaseClient _client;

  Map<String, dynamic> _createOrderBody({
    required String restaurantId,
    required String paymentMethod,
    required List<CartLine> lines,
    String? addressId,
    String? guestPhone,
    double? guestLat,
    double? guestLng,
    String? guestDeviceId,
  }) {
    return {
      'restaurant_id': restaurantId,
      'address_id': addressId,
      'payment_method': paymentMethod,
      'guest_phone': guestPhone,
      'guest_lat': guestLat,
      'guest_lng': guestLng,
      'guest_device_id': guestDeviceId,
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
  }

  String _messageFromDecoded(Object? decoded, String rawBody) {
    if (decoded is Map) {
      final err = decoded['error'];
      if (err != null) return err.toString();
      final code = decoded['code'];
      final msg = decoded['message'];
      if (code != null || msg != null) {
        return [code, msg].where((e) => e != null).join(': ').trim();
      }
    }
    final preview = rawBody.length > 200 ? '${rawBody.substring(0, 200)}…' : rawBody;
    return preview.isEmpty ? 'Buyurtma rad etildi' : preview;
  }

  /// Shown when Edge Function `create_order` is missing on the linked Supabase project.
  String _edgeFunctionMissingMessage() {
    return 'Supabase loyihasida create_order Edge Function topilmadi. '
        'Loyiha papkasida: supabase functions deploy create_order '
        '(yoki Dashboard → Edge Functions). Kod: supabase/functions/create_order/';
  }

  String _friendlyInvokeError(int status, dynamic data) {
    final raw = data?.toString() ?? '';
    final lower = raw.toLowerCase();
    if (status == 404 ||
        lower.contains('not_found') ||
        lower.contains('requested function was not found') ||
        lower.contains('function not found')) {
      return _edgeFunctionMissingMessage();
    }
    Object? decoded = data is Map ? data : null;
    if (decoded == null && raw.isNotEmpty) {
      try {
        decoded = jsonDecode(raw);
      } catch (_) {}
    }
    return _messageFromDecoded(decoded, raw);
  }

  @override
  Future<Result<String>> createOrder({
    required String restaurantId,
    required String paymentMethod,
    required List<CartLine> lines,
    String? addressId,
    String? guestPhone,
    double? guestLat,
    double? guestLng,
    String? guestDeviceId,
  }) async {
    final body = _createOrderBody(
      restaurantId: restaurantId,
      paymentMethod: paymentMethod,
      lines: lines,
      addressId: addressId,
      guestPhone: guestPhone,
      guestLat: guestLat,
      guestLng: guestLng,
      guestDeviceId: guestDeviceId,
    );

    try {
      final res = await _client.functions.invoke(
        'create_order',
        body: body,
        method: HttpMethod.post,
      );
      if (res.status != null && res.status! >= 400) {
        return FailureResult(ValidationFailure(_friendlyInvokeError(res.status!, res.data)));
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
      final s = e.toString().toLowerCase();
      if (s.contains('not_found') || s.contains('requested function was not found') || s.contains('function not found')) {
        return FailureResult(ValidationFailure(_edgeFunctionMissingMessage()));
      }
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
