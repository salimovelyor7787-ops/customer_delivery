import 'package:equatable/equatable.dart';

class HomeServiceCard extends Equatable {
  const HomeServiceCard({
    required this.id,
    required this.serviceKey,
    required this.title,
    required this.imageUrl,
    required this.sortOrder,
    required this.isActive,
  });

  final String id;
  final String serviceKey;
  final String title;
  final String imageUrl;
  final int sortOrder;
  final bool isActive;

  factory HomeServiceCard.fromJson(Map<String, dynamic> json) {
    return HomeServiceCard(
      id: json['id'].toString(),
      serviceKey: (json['service_key'] as String? ?? '').trim(),
      title: (json['title'] as String? ?? '').trim(),
      imageUrl: (json['image_url'] as String? ?? '').trim(),
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  @override
  List<Object?> get props => [id, serviceKey, title, imageUrl, sortOrder, isActive];
}
