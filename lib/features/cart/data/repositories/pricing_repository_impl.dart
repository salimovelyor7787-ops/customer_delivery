import 'package:customer_delivery/core/errors/failures.dart';
import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/cart/domain/entities/cart_line.dart';
import 'package:customer_delivery/features/cart/domain/entities/price_quote.dart';
import 'package:customer_delivery/features/cart/domain/repositories/pricing_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide Provider;

class PricingRepositoryImpl implements PricingRepository {
  PricingRepositoryImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<Result<PriceQuote>> calculatePrice({
    required String restaurantId,
    required List<CartLine> lines,
    String? promoCode,
  }) async {
    if (lines.isEmpty) {
      return const Success(PriceQuote(
        subtotalCents: 0,
        deliveryFeeCents: 0,
        taxCents: 0,
        totalCents: 0,
        promoDiscountCents: 0,
      ));
    }
    try {
      final body = <String, dynamic>{
        'restaurant_id': restaurantId,
        'items': lines
            .map(
              (l) => {
                'menu_item_id': l.menuItemId,
                'quantity': l.quantity,
                'selected_option_ids': l.selectedOptionIds.toList(),
              },
            )
            .toList(),
      };
      final p = promoCode?.trim();
      if (p != null && p.isNotEmpty) {
        body['promo_code'] = p;
      }
      final res = await _client.functions.invoke(
        'calculate_price',
        body: body,
        method: HttpMethod.post,
      );
      if (res.status != null && res.status! >= 400) {
        return FailureResult(ServerFailure(res.data?.toString() ?? 'Price error'));
      }
      final data = res.data;
      if (data is! Map<String, dynamic>) {
        return const FailureResult(ServerFailure('Invalid price response'));
      }
      return Success(PriceQuote.fromJson(data));
    } catch (e) {
      return FailureResult(NetworkFailure(e.toString()));
    }
  }
}
