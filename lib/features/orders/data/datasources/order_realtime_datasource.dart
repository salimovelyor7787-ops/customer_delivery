import 'dart:math' as math;

import 'package:customer_delivery/features/orders/domain/entities/order_summary.dart' show CourierLocation;
import 'package:supabase_flutter/supabase_flutter.dart' hide Provider;

typedef OrderRowCallback = void Function(Map<String, dynamic> record);
typedef CourierLocationCallback = void Function(CourierLocation location);

/// Subscribes to Supabase Realtime with minimal churn (courier updates throttled).
class OrderRealtimeDataSource {
  OrderRealtimeDataSource(this._client);

  final SupabaseClient _client;

  RealtimeChannel? _ordersChannel;
  RealtimeChannel? _courierChannel;
  RealtimeChannel? _singleOrderChannel;

  DateTime _lastCourierEmit = DateTime.fromMillisecondsSinceEpoch(0);
  CourierLocation? _lastCourier;

  void subscribeMyOrders({
    required String userId,
    required OrderRowCallback onOrderChange,
  }) {
    _ordersChannel?.unsubscribe();
    final ch = _client.channel('public:orders:user:$userId');
    ch
        .on(
          RealtimeListenTypes.postgresChanges,
          ChannelFilter(
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: 'user_id=eq.$userId',
          ),
          (payload, [ref]) {
            final map = _recordFromPayload(payload);
            if (map != null) onOrderChange(map);
          },
        )
        .subscribe();
    _ordersChannel = ch;
  }

  void subscribeSingleOrder({
    required String orderId,
    required OrderRowCallback onOrderChange,
  }) {
    _singleOrderChannel?.unsubscribe();
    final ch = _client.channel('public:orders:row:$orderId');
    ch
        .on(
          RealtimeListenTypes.postgresChanges,
          ChannelFilter(
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: 'id=eq.$orderId',
          ),
          (payload, [ref]) {
            final map = _recordFromPayload(payload);
            if (map != null) onOrderChange(map);
          },
        )
        .subscribe();
    _singleOrderChannel = ch;
  }

  void subscribeCourierForOrder({
    required String orderId,
    required CourierLocationCallback onLocation,
  }) {
    _courierChannel?.unsubscribe();
    _lastCourier = null;
    _lastCourierEmit = DateTime.fromMillisecondsSinceEpoch(0);
    final ch = _client.channel('public:courier_locations:$orderId');
    ch
        .on(
          RealtimeListenTypes.postgresChanges,
          ChannelFilter(
            event: '*',
            schema: 'public',
            table: 'courier_locations',
            filter: 'order_id=eq.$orderId',
          ),
          (payload, [ref]) {
            final map = _recordFromPayload(payload);
            if (map == null) return;
            try {
              final loc = CourierLocation.fromJson(map);
              if (!_shouldEmitCourier(loc)) return;
              _lastCourier = loc;
              _lastCourierEmit = DateTime.now();
              onLocation(loc);
            } catch (_) {}
          },
        )
        .subscribe();
    _courierChannel = ch;
  }

  bool _shouldEmitCourier(CourierLocation loc) {
    final prev = _lastCourier;
    if (prev == null) return true;
    final dt = loc.updatedAt.difference(_lastCourierEmit);
    if (dt.inSeconds >= 12) return true;
    final d = _distanceMeters(prev.lat, prev.lng, loc.lat, loc.lng);
    return d > 40;
  }

  static double _distanceMeters(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371000.0;
    final p1 = lat1 * math.pi / 180;
    final p2 = lat2 * math.pi / 180;
    final dp = (lat2 - lat1) * math.pi / 180;
    final dl = (lon2 - lon1) * math.pi / 180;
    final a = math.sin(dp / 2) * math.sin(dp / 2) +
        math.cos(p1) * math.cos(p2) * math.sin(dl / 2) * math.sin(dl / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return r * c;
  }

  Map<String, dynamic>? _recordFromPayload(dynamic payload) {
    if (payload is! Map) return null;
    final newRecord = payload['new'];
    if (newRecord is Map) {
      return Map<String, dynamic>.from(newRecord);
    }
    final oldRecord = payload['old'];
    if (oldRecord is Map) {
      return Map<String, dynamic>.from(oldRecord);
    }
    final data = payload['data'];
    final rec = data is Map ? data['record'] : null;
    if (rec is Map) {
      return Map<String, dynamic>.from(rec);
    }
    return null;
  }

  Future<void> dispose() async {
    if (_ordersChannel != null) await _ordersChannel!.unsubscribe();
    if (_courierChannel != null) await _courierChannel!.unsubscribe();
    if (_singleOrderChannel != null) await _singleOrderChannel!.unsubscribe();
    _ordersChannel = null;
    _courierChannel = null;
    _singleOrderChannel = null;
  }
}
