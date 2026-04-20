import 'package:equatable/equatable.dart';

class MenuOptionChoice extends Equatable {
  const MenuOptionChoice({
    required this.id,
    required this.name,
    this.priceDeltaCents = 0,
  });

  final String id;
  final String name;
  final int priceDeltaCents;

  factory MenuOptionChoice.fromJson(Map<String, dynamic> json) {
    return MenuOptionChoice(
      id: json['id'].toString(),
      name: json['name'] as String? ?? json['label'] as String? ?? '',
      priceDeltaCents: (json['price_delta_cents'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [id, name, priceDeltaCents];
}

class MenuItem extends Equatable {
  const MenuItem({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.priceCents,
    this.category,
    this.description,
    this.imageUrl,
    this.isDeal = false,
    this.dealPriceCents,
    this.isAvailable = true,
    this.options = const [],
  });

  final String id;
  final String restaurantId;
  final String name;
  final String? category;
  final String? description;
  final String? imageUrl;
  final int priceCents;
  final bool isDeal;
  final int? dealPriceCents;
  final bool isAvailable;
  final List<MenuOptionChoice> options;
  int get effectivePriceCents => isDeal && dealPriceCents != null ? dealPriceCents! : priceCents;

  factory MenuItem.fromJson(Map<String, dynamic> json, {required String restaurantId}) {
    final optRaw = json['menu_item_options'];
    List<MenuOptionChoice> opts = [];
    if (optRaw is List) {
      opts = optRaw
          .map((e) => MenuOptionChoice.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    }
    return MenuItem(
      id: json['id'].toString(),
      restaurantId: restaurantId,
      name: json['name'] as String? ?? '',
      category: json['category'] as String?,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      priceCents: (json['price_cents'] as num?)?.toInt() ?? 0,
      isDeal: json['is_deal'] as bool? ?? false,
      dealPriceCents: (json['deal_price_cents'] as num?)?.toInt(),
      isAvailable: json['is_available'] as bool? ?? true,
      options: opts,
    );
  }

  @override
  List<Object?> get props => [id, restaurantId, name, category, description, imageUrl, priceCents, isDeal, dealPriceCents, isAvailable, options];
}
