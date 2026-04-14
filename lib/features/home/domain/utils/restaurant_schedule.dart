import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';

bool isRestaurantOpenNow(Restaurant restaurant, {DateTime? now}) {
  if (!restaurant.isOpen) return false;

  final from = _parseTimeToMinutes(restaurant.openTimeFrom);
  final to = _parseTimeToMinutes(restaurant.openTimeTo);
  if (from == null || to == null) return restaurant.isOpen;

  final currentTime = now ?? DateTime.now();
  final current = currentTime.hour * 60 + currentTime.minute;
  if (from == to) return true;
  if (from < to) return current >= from && current < to;
  return current >= from || current < to;
}

String restaurantWorkingHoursLabel(Restaurant restaurant) {
  final from = restaurant.openTimeFrom;
  final to = restaurant.openTimeTo;
  if (from == null || to == null || from.isEmpty || to.isEmpty) return "Ish vaqti belgilanmagan";
  return "$from - $to";
}

int? _parseTimeToMinutes(String? value) {
  if (value == null || value.isEmpty) return null;
  final clean = value.length >= 5 ? value.substring(0, 5) : value;
  final parts = clean.split(':');
  if (parts.length < 2) return null;
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
