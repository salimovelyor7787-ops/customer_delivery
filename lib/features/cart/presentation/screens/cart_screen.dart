import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/auth/domain/entities/app_user.dart';
import 'package:customer_delivery/features/auth/presentation/providers/auth_providers.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
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
    final money = NumberFormat.simpleCurrency();

    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: cart.lines.isEmpty
          ? const Center(child: Text('Your cart is empty'))
          : Column(
              children: [
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
                              icon: const Icon(Icons.remove_circle_outline),
                              onPressed: () => ref.read(cartNotifierProvider.notifier).setQuantity(l.lineId, l.quantity - 1),
                            ),
                            Text('${l.quantity}'),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline),
                              onPressed: () => ref.read(cartNotifierProvider.notifier).setQuantity(l.lineId, l.quantity + 1),
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
                      'Pricing: ${cart.quoteError}',
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
                          const Text('Cart subtotal (client)'),
                          Text(money.format(cart.clientSubtotalCents / 100)),
                        ],
                      ),
                      if (guest) ...[
                        const SizedBox(height: 8),
                        Text(
                          'After sign in you will see delivery fee and total from the server.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                      if (cart.quote != null) ...[
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Delivery'),
                            Text(money.format(cart.quote!.deliveryFeeCents / 100)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Tax'),
                            Text(money.format(cart.quote!.taxCents / 100)),
                          ],
                        ),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Total (server)', style: Theme.of(context).textTheme.titleMedium),
                            Text(
                              money.format(cart.quote!.totalCents / 100),
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: cart.lines.isEmpty
                            ? null
                            : () => context.push('/checkout'),
                        child: const Text('Checkout'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
