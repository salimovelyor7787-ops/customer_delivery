import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/cart/domain/entities/cart_line.dart';
import 'package:customer_delivery/features/cart/domain/entities/price_quote.dart';

abstract class PricingRepository {
  Future<Result<PriceQuote>> calculatePrice({
    required String restaurantId,
    required List<CartLine> lines,
    String? promoCode,
  });
}
