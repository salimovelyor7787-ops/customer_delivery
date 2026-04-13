import 'package:equatable/equatable.dart';

class Address extends Equatable {
  const Address({
    required this.id,
    required this.label,
    required this.line1,
    required this.city,
    this.line2,
    this.lat,
    this.lng,
    this.isDefault = false,
  });

  final String id;
  final String label;
  final String line1;
  final String? line2;
  final String city;
  final double? lat;
  final double? lng;
  final bool isDefault;

  String get singleLine => [
        line1,
        if (line2 != null && line2!.isNotEmpty) line2!,
        city,
      ].join(', ');

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      id: json['id'].toString(),
      label: json['label'] as String? ?? 'Address',
      line1: json['line1'] as String? ?? '',
      line2: json['line2'] as String?,
      city: json['city'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      isDefault: json['is_default'] as bool? ?? false,
    );
  }

  @override
  List<Object?> get props => [id, label, line1, line2, city, lat, lng, isDefault];
}
