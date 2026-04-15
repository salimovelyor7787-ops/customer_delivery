import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/auth/domain/entities/app_user.dart';
import 'package:customer_delivery/features/auth/presentation/providers/auth_providers.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/home/domain/utils/restaurant_schedule.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(cartNotifierProvider.notifier).refreshQuote();
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<AppUser?>>(authStateProvider, (prev, next) {
      final wasOut = prev?.valueOrNull == null;
      final nowIn = next.valueOrNull != null;
      if (wasOut && nowIn) {
        ref.read(cartNotifierProvider.notifier).refreshQuote();
      }
    });

    final cart = ref.watch(cartNotifierProvider);
    final guest = ref.watch(supabaseClientProvider).auth.currentSession == null;
    final money = NumberFormat.currency(locale: 'uz_UZ', symbol: "so'm ", decimalDigits: 0);
    final restaurantAsync = cart.restaurantId == null ? null : ref.watch(restaurantDetailProvider(cart.restaurantId!));
    final canCheckoutBySchedule = restaurantAsync?.maybeWhen(
          data: (r) => isRestaurantOpenNow(r),
          orElse: () => true,
        ) ??
        true;

    return Scaffold(
      appBar: AppBar(title: const Text('Savat')),
      body: cart.lines.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.shopping_bag_outlined,
                      size: 64,
                      color: Theme.of(context).colorScheme.outline,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      "Savat bo'sh",
                      style: Theme.of(context).textTheme.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Bosh sahifadan restoran tanlang va taomlarni savatga qo'shing.",
                      style: Theme.of(context).textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.go('/home'),
                      child: const Text('Bosh sahifaga'),
                    ),
                  ],
                ),
              ),
            )
          : Column(
              children: [
                if (cart.restaurantId != null)
                  restaurantAsync!.when(
                        data: (r) => Material(
                          color: Theme.of(context).colorScheme.surfaceVariant,
                          child: ListTile(
                            dense: true,
                            leading: const Icon(Icons.storefront_outlined),
                            title: Text(r.name),
                            subtitle: Text(canCheckoutBySchedule
                                ? 'Buyurtma shu muassasadan'
                                : "Restoran yopiq (${restaurantWorkingHoursLabel(r)})"),
                          ),
                        ),
                        loading: () => const SizedBox.shrink(),
                        error: (_, __) => const SizedBox.shrink(),
                      ),
                Expanded(
                  child: ListView.builder(
                    itemCount: cart.lines.length,
                    itemBuilder: (context, i) {
                      final l = cart.lines[i];
                      return ListTile(
                        title: Text(l.name),
                        subtitle: Text('${money.format(l.unitTotalCents / 100)} × ${l.quantity}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: "O'chirish",
                              icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                              onPressed: () =>
                                  ref.read(cartNotifierProvider.notifier).removeLine(l.lineId),
                            ),
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline),
                              onPressed: () => ref
                                  .read(cartNotifierProvider.notifier)
                                  .setQuantity(l.lineId, l.quantity - 1),
                            ),
                            Text('${l.quantity}'),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline),
                              onPressed: () => ref
                                  .read(cartNotifierProvider.notifier)
                                  .setQuantity(l.lineId, l.quantity + 1),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                if (cart.quoteLoading) const LinearProgressIndicator(),
                if (cart.quoteError != null)
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      "Narx hisoblash: ${cart.quoteError}",
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                if (!canCheckoutBySchedule)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Text(
                      "Ish vaqtidan tashqari buyurtma berib bo'lmaydi.",
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Mahsulotlar summasi'),
                          Text(money.format(cart.clientSubtotalCents / 100)),
                        ],
                      ),
                      if (guest) ...[
                        const SizedBox(height: 8),
                        Text(
                          "Hisobga kirgandan so'ng yetkazib berish, soliq va yakuniy summa ko'rinadi.",
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                      if (cart.quote != null) ...[
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Yetkazib berish'),
                            Text(money.format(cart.quote!.deliveryFeeCents / 100)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Soliq'),
                            Text(money.format(cart.quote!.taxCents / 100)),
                          ],
                        ),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Jami', style: Theme.of(context).textTheme.titleMedium),
                            Text(
                              money.format(cart.quote!.totalCents / 100),
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: cart.lines.isEmpty || !canCheckoutBySchedule ? null : () => context.push('/checkout'),
                        child: const Text("Buyurtmani rasmiylashtirish"),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
