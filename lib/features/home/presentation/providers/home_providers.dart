import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/home/data/repositories/restaurant_repository_impl.dart';
import 'package:customer_delivery/features/home/domain/entities/category.dart';
import 'package:customer_delivery/features/home/domain/entities/home_banner.dart';
import 'package:customer_delivery/features/home/domain/entities/home_deal_item.dart';
import 'package:customer_delivery/features/home/domain/entities/home_nearby_card.dart';
import 'package:customer_delivery/features/home/domain/entities/home_service_card.dart';
import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';
import 'package:customer_delivery/features/home/domain/repositories/restaurant_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final restaurantRepositoryProvider = Provider<RestaurantRepository>((ref) {
  return RestaurantRepositoryImpl(ref.watch(supabaseClientProvider));
});

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final repo = ref.watch(restaurantRepositoryProvider);
  final res = await repo.fetchCategories();
  return res.fold((f) => throw f, (d) => d);
});

final restaurantDetailProvider = FutureProvider.family<Restaurant, String>((ref, id) async {
  final repo = ref.watch(restaurantRepositoryProvider);
  final res = await repo.fetchRestaurantById(id);
  return res.fold((f) => throw f, (d) => d);
});

final homeServiceCardsProvider = FutureProvider<List<HomeServiceCard>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final rows = await client
      .from('home_service_cards')
      .select()
      .eq('is_active', true)
      .order('sort_order', ascending: true);
  return (rows as List)
      .map((e) => HomeServiceCard.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
});

final homeBannersProvider = FutureProvider<List<HomeBanner>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final rows = await client
      .from('banners')
      .select()
      .eq('active', true)
      .order('sort_order', ascending: true);
  return (rows as List)
      .map((e) => HomeBanner.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
});

final homeNearbyCardsProvider = FutureProvider<List<HomeNearbyCard>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final rows = await client
      .from('home_nearby_cards')
      .select()
      .eq('is_active', true)
      .order('sort_order', ascending: true);
  return (rows as List)
      .map((e) => HomeNearbyCard.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
});

final homeDealsProvider = FutureProvider<List<HomeDealItem>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final rows = await client
      .from('menu_items')
      .select('id, restaurant_id, name, image_url, price_cents, deal_price_cents')
      .eq('is_available', true)
      .eq('is_deal', true)
      .not('deal_price_cents', 'is', null)
      .order('sort_order', ascending: true)
      .limit(20);
  return (rows as List)
      .map((e) => HomeDealItem.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
});
