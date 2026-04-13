import 'package:equatable/equatable.dart';

class Restaurant extends Equatable {
  const Restaurant({
    required this.id,
    required this.name,
    required this.isOpen,
    this.slug,
    this.imageUrl,
    this.categoryId,
    this.categoryName,
    this.deliveryFeeCents = 0,
    this.minOrderCents = 0,
  });

  final String id;
  final String name;
  final bool isOpen;
  final String? slug;
  final String? imageUrl;
  final String? categoryId;
  final String? categoryName;
  final int deliveryFeeCents;
  final int minOrderCents;

  factory Restaurant.fromJson(Map<String, dynamic> json) {
    final cat = json['categories'];
    String? catName;
    if (cat is Map<String, dynamic>) {
      catName = cat['name'] as String?;
    }
    return Restaurant(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String?,
      imageUrl: json['image_url'] as String?,
      categoryId: json['category_id']?.toString(),
      categoryName: catName,
      isOpen: json['is_open'] as bool? ?? false,
      deliveryFeeCents: (json['delivery_fee_cents'] as num?)?.toInt() ?? 0,
      minOrderCents: (json['min_order_cents'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props =>
      [id, name, isOpen, slug, imageUrl, categoryId, categoryName, deliveryFeeCents, minOrderCents];
}
