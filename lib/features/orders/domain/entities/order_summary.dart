import 'package:equatable/equatable.dart';

class OrderSummary extends Equatable {
  const OrderSummary({
    required this.id,
    required this.status,
    required this.totalCents,
    required this.createdAt,
    this.restaurantName,
    this.deliveryFeeCents = 0,
  });

  final String id;
  final String status;
  final int totalCents;
  final int deliveryFeeCents;
  final DateTime createdAt;
  final String? restaurantName;

  bool get isActive {
    const terminal = {'delivered', 'cancelled', 'rejected'};
    return !terminal.contains(status.toLowerCase());
  }

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    final rest = json['restaurants'];
    String? rname;
    if (rest is Map<String, dynamic>) {
      rname = rest['name'] as String?;
    }
    return OrderSummary(
      id: json['id'].toString(),
      status: json['status'] as String? ?? 'unknown',
      totalCents: (json['total_cents'] as num?)?.toInt() ?? 0,
      deliveryFeeCents: (json['delivery_fee_cents'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      restaurantName: rname ?? json['restaurant_name'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, status, totalCents, deliveryFeeCents, createdAt, restaurantName];
}

class CourierLocation extends Equatable {
  const CourierLocation({
    required this.orderId,
    required this.lat,
    required this.lng,
    required this.updatedAt,
  });

  final String orderId;
  final double lat;
  final double lng;
  final DateTime updatedAt;

  factory CourierLocation.fromJson(Map<String, dynamic> json) {
    return CourierLocation(
      orderId: json['order_id'].toString(),
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      updatedAt: DateTime.tryParse(json['updated_at'] as String? ?? '') ?? DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [orderId, lat, lng, updatedAt];
}
