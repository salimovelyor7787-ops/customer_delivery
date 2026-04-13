import 'package:collection/collection.dart';
import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/core/utils/debouncer.dart';
import 'package:customer_delivery/features/cart/domain/entities/cart_line.dart';
import 'package:customer_delivery/features/cart/domain/entities/price_quote.dart';
import 'package:customer_delivery/features/cart/presentation/providers/cart_providers.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

class CartState {
  const CartState({
    this.restaurantId,
    this.lines = const [],
    this.quote,
    this.quoteLoading = false,
    this.quoteError,
  });

  final String? restaurantId;
  final List<CartLine> lines;
  final PriceQuote? quote;
  final bool quoteLoading;
  final String? quoteError;

  int get clientSubtotalCents => lines.fold(0, (a, l) => a + l.lineTotalCents);

  CartState copyWith({
    String? restaurantId,
    List<CartLine>? lines,
    PriceQuote? quote,
    bool? quoteLoading,
    String? quoteError,
    bool clearRestaurant = false,
    bool clearQuote = false,
    bool clearQuoteError = false,
  }) {
    return CartState(
      restaurantId: clearRestaurant ? null : (restaurantId ?? this.restaurantId),
      lines: lines ?? this.lines,
      quote: clearQuote ? null : (quote ?? this.quote),
      quoteLoading: quoteLoading ?? this.quoteLoading,
      quoteError: clearQuoteError ? null : (quoteError ?? this.quoteError),
    );
  }
}

final cartNotifierProvider = NotifierProvider<CartNotifier, CartState>(CartNotifier.new);

class CartNotifier extends Notifier<CartState> {
  final _debounce = Debouncer(duration: const Duration(milliseconds: 400));
  static const _uuid = Uuid();

  @override
  CartState build() {
    ref.onDispose(_debounce.dispose);
    return const CartState();
  }

  int _optionsExtra(MenuItem item, Set<String> selected) {
    return item.options.where((o) => selected.contains(o.id)).fold(0, (a, b) => a + b.priceDeltaCents);
  }

  /// Replaces cart if switching restaurant.
  void addItem(MenuItem item, {Set<String> selectedOptionIds = const {}}) {
    final rid = item.restaurantId;
    if (state.restaurantId != null && state.restaurantId != rid) {
      state = CartState(
        restaurantId: rid,
        lines: [],
      );
    }
    final extra = _optionsExtra(item, selectedOptionIds);
    final existing = state.lines.indexWhere(
      (l) =>
          l.menuItemId == item.id &&
          const SetEquality<String>().equals(l.selectedOptionIds, selectedOptionIds),
    );
    if (existing >= 0) {
      final l = state.lines[existing];
      final next = [...state.lines];
      next[existing] = l.copyWith(quantity: l.quantity + 1);
      state = state.copyWith(restaurantId: rid, lines: next, clearQuote: true);
    } else {
      final line = CartLine(
        lineId: _uuid.v4(),
        menuItemId: item.id,
        name: item.name,
        basePriceCents: item.priceCents,
        optionsExtraCents: extra,
        quantity: 1,
        imageUrl: item.imageUrl,
        selectedOptionIds: selectedOptionIds,
      );
      state = state.copyWith(
        restaurantId: rid,
        lines: [...state.lines, line],
        clearQuote: true,
      );
    }
    _scheduleQuote();
  }

  void removeLine(String lineId) {
    final next = state.lines.where((l) => l.lineId != lineId).toList();
    state = state.copyWith(
      lines: next,
      clearRestaurant: next.isEmpty,
      clearQuote: true,
    );
    _scheduleQuote();
  }

  void setQuantity(String lineId, int quantity) {
    if (quantity < 1) {
      removeLine(lineId);
      return;
    }
    final next = state.lines
        .map((l) => l.lineId == lineId ? l.copyWith(quantity: quantity) : l)
        .toList();
    state = state.copyWith(lines: next, clearQuote: true);
    _scheduleQuote();
  }

  void clear() {
    state = const CartState();
  }

  void _scheduleQuote() {
    _debounce.run(refreshQuote);
  }

  Future<void> refreshQuote() async {
    if (state.lines.isEmpty || state.restaurantId == null) {
      state = state.copyWith(
        quoteLoading: false,
        clearQuote: true,
        clearQuoteError: true,
      );
      return;
    }
    // Edge calculate_price требует JWT — без входа только локальная сумма корзины
    if (ref.read(supabaseClientProvider).auth.currentSession == null) {
      state = state.copyWith(
        quoteLoading: false,
        clearQuote: true,
        clearQuoteError: true,
      );
      return;
    }
    state = state.copyWith(quoteLoading: true, clearQuoteError: true);
    final repo = ref.read(pricingRepositoryProvider);
    final res = await repo.calculatePrice(restaurantId: state.restaurantId!, lines: state.lines);
    res.fold(
      (f) => state = state.copyWith(quoteLoading: false, quoteError: f.message, clearQuote: true),
      (q) => state = state.copyWith(quoteLoading: false, quote: q, clearQuoteError: true),
    );
  }
}
