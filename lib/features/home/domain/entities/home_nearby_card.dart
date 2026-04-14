import 'package:equatable/equatable.dart';

class HomeNearbyCard extends Equatable {
  const HomeNearbyCard({
    required this.id,
    required this.imageUrl,
    required this.sortOrder,
    required this.isActive,
    this.title,
    this.restaurantId,
  });

  final String id;
  final String? title;
  final String imageUrl;
  final String? restaurantId;
  final int sortOrder;
  final bool isActive;

  factory HomeNearbyCard.fromJson(Map<String, dynamic> json) {
    return HomeNearbyCard(
      id: json['id'].toString(),
      title: json['title'] as String?,
      imageUrl: json['image_url'] as String? ?? '',
      restaurantId: json['restaurant_id']?.toString(),
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  @override
  List<Object?> get props => [id, title, imageUrl, restaurantId, sortOrder, isActive];
}
