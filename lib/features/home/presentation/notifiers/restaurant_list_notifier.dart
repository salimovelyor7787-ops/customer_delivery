import 'dart:async';

import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class RestaurantListState {
  const RestaurantListState({
    this.items = const [],
    this.loading = false,
    this.loadingMore = false,
    this.hasMore = true,
    this.error,
    this.categoryId,
    this.searchQuery = '',
  });

  final List<Restaurant> items;
  final bool loading;
  final bool loadingMore;
  final bool hasMore;
  final String? error;
  final String? categoryId;
  final String searchQuery;

  RestaurantListState copyWith({
    List<Restaurant>? items,
    bool? loading,
    bool? loadingMore,
    bool? hasMore,
    String? error,
    String? categoryId,
    String? searchQuery,
  }) {
    return RestaurantListState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      hasMore: hasMore ?? this.hasMore,
      error: error,
      categoryId: categoryId ?? this.categoryId,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

final restaurantListNotifierProvider =
    NotifierProvider<RestaurantListNotifier, RestaurantListState>(RestaurantListNotifier.new);

class RestaurantListNotifier extends Notifier<RestaurantListState> {
  static const _pageSize = 20;
  Timer? _debounce;

  @override
  RestaurantListState build() {
    ref.onDispose(() => _debounce?.cancel());
    Future.microtask(() => refresh());
    return const RestaurantListState(loading: true);
  }

  void setCategory(String? categoryId) {
    state = state.copyWith(categoryId: categoryId);
    refresh();
  }

  void setSearchQuery(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      state = state.copyWith(searchQuery: q);
      refresh();
    });
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, error: null, items: [], hasMore: true);
    final repo = ref.read(restaurantRepositoryProvider);
    final res = await repo.fetchRestaurants(
      categoryId: state.categoryId,
      searchQuery: state.searchQuery.isEmpty ? null : state.searchQuery,
      offset: 0,
      limit: _pageSize,
    );
    res.fold(
      (f) => state = state.copyWith(loading: false, error: f.message, hasMore: false),
      (page) => state = state.copyWith(
        loading: false,
        items: page.items,
        hasMore: page.hasMore,
        error: null,
      ),
    );
  }

  Future<void> loadMore() async {
    if (!state.hasMore || state.loadingMore || state.loading) return;
    state = state.copyWith(loadingMore: true);
    final repo = ref.read(restaurantRepositoryProvider);
    final res = await repo.fetchRestaurants(
      categoryId: state.categoryId,
      searchQuery: state.searchQuery.isEmpty ? null : state.searchQuery,
      offset: state.items.length,
      limit: _pageSize,
    );
    res.fold(
      (f) => state = state.copyWith(loadingMore: false, error: f.message),
      (page) {
        state = state.copyWith(
          loadingMore: false,
          items: [...state.items, ...page.items],
          hasMore: page.hasMore,
        );
      },
    );
  }
}
