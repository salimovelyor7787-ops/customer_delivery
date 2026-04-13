import 'package:equatable/equatable.dart';

/// Server-authoritative totals from `calculate_price` Edge Function.
class PriceQuote extends Equatable {
  const PriceQuote({
    required this.subtotalCents,
    required this.deliveryFeeCents,
    required this.taxCents,
    required this.totalCents,
    this.currency = 'USD',
  });

  final int subtotalCents;
  final int deliveryFeeCents;
  final int taxCents;
  final int totalCents;
  final String currency;

  factory PriceQuote.fromJson(Map<String, dynamic> json) {
    return PriceQuote(
      subtotalCents: (json['subtotal_cents'] as num?)?.toInt() ?? 0,
      deliveryFeeCents: (json['delivery_fee_cents'] as num?)?.toInt() ?? 0,
      taxCents: (json['tax_cents'] as num?)?.toInt() ?? 0,
      totalCents: (json['total_cents'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
    );
  }

  @override
  List<Object?> get props => [subtotalCents, deliveryFeeCents, taxCents, totalCents, currency];
}
