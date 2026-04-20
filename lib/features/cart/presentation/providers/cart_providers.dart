import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/cart/data/repositories/pricing_repository_impl.dart';
import 'package:customer_delivery/features/cart/domain/repositories/pricing_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final pricingRepositoryProvider = Provider<PricingRepository>((ref) {
  return PricingRepositoryImpl(ref.watch(supabaseClientProvider));
});
