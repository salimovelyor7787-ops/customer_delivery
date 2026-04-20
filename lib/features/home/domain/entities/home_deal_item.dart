import 'package:equatable/equatable.dart';

class HomeDealItem extends Equatable {
  const HomeDealItem({
    required this.menuItemId,
    required this.restaurantId,
    required this.name,
    required this.imageUrl,
    required this.basePriceCents,
    required this.dealPriceCents,
  });

  final String menuItemId;
  final String restaurantId;
  final String name;
  final String imageUrl;
  final int basePriceCents;
  final int dealPriceCents;

  int get discountPercent {
    if (basePriceCents <= 0 || dealPriceCents >= basePriceCents) return 0;
    return ((1 - (dealPriceCents / basePriceCents)) * 100).round();
  }

  factory HomeDealItem.fromJson(Map<String, dynamic> json) {
    return HomeDealItem(
      menuItemId: json['id'].toString(),
      restaurantId: json['restaurant_id'].toString(),
      name: json['name'] as String? ?? '',
      imageUrl: json['image_url'] as String? ?? '',
      basePriceCents: (json['price_cents'] as num?)?.toInt() ?? 0,
      dealPriceCents: (json['deal_price_cents'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [
    menuItemId,
    restaurantId,
    name,
    imageUrl,
    basePriceCents,
    dealPriceCents,
  ];
}
