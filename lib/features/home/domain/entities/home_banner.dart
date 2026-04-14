import 'package:equatable/equatable.dart';

class HomeBanner extends Equatable {
  const HomeBanner({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.active,
    required this.sortOrder,
    this.subtitle,
    this.buttonText,
    this.actionPath,
  });

  final String id;
  final String title;
  final String imageUrl;
  final String? subtitle;
  final String? buttonText;
  final String? actionPath;
  final bool active;
  final int sortOrder;

  factory HomeBanner.fromJson(Map<String, dynamic> json) {
    return HomeBanner(
      id: json['id'].toString(),
      title: json['title'] as String? ?? '',
      imageUrl: json['image_url'] as String? ?? '',
      subtitle: json['subtitle'] as String?,
      buttonText: json['button_text'] as String?,
      actionPath: json['action_path'] as String?,
      active: json['active'] as bool? ?? true,
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [id, title, imageUrl, subtitle, buttonText, actionPath, active, sortOrder];
}
