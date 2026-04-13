import 'package:collection/collection.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/orders/presentation/providers/order_providers.dart';
import 'package:customer_delivery/features/profile/presentation/providers/profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _payment = 'cash';
  String? _addressId;
  bool _submitting = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartNotifierProvider);
    final addressesAsync = ref.watch(addressesProvider);

    if (cart.lines.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: const Center(child: Text('Cart is empty')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: addressesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (addresses) {
          final effectiveAddressId = addresses.isEmpty
              ? null
              : (_addressId != null && addresses.any((a) => a.id == _addressId))
                  ? _addressId!
                  : (addresses.firstWhereOrNull((a) => a.isDefault)?.id ?? addresses.first.id);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Address', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (addresses.isEmpty)
                const Text('Add an address for your user in the database to continue.')
              else
                ...addresses.map(
                  (a) => RadioListTile<String>(
                    value: a.id,
                    groupValue: effectiveAddressId,
                    onChanged: (v) => setState(() => _addressId = v),
                    title: Text(a.label),
                    subtitle: Text(a.singleLine),
                  ),
                ),
              const Divider(height: 32),
              Text('Payment', style: Theme.of(context).textTheme.titleMedium),
              RadioListTile<String>(
                value: 'cash',
                groupValue: _payment,
                onChanged: (v) => setState(() => _payment = v!),
                title: const Text('Cash on delivery'),
              ),
              RadioListTile<String>(
                value: 'card_placeholder',
                groupValue: _payment,
                onChanged: (v) => setState(() => _payment = v!),
                title: const Text('Card (placeholder — integrate PSP in Edge Function)'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting || effectiveAddressId == null || addresses.isEmpty
                    ? null
                    : () async {
                        setState(() {
                          _submitting = true;
                          _error = null;
                        });
                        final repo = ref.read(orderRepositoryProvider);
                        final res = await repo.createOrder(
                          restaurantId: cart.restaurantId!,
                          addressId: effectiveAddressId,
                          paymentMethod: _payment,
                          lines: cart.lines,
                        );
                        if (!mounted) return;
                        res.fold(
                          (f) => setState(() {
                            _submitting = false;
                            _error = f.message;
                          }),
                          (orderId) {
                            ref.read(cartNotifierProvider.notifier).clear();
                            ref.invalidate(activeOrdersProvider);
                            ref.invalidate(orderHistoryProvider);
                            context.go('/orders/$orderId');
                          },
                        );
                      },
                child: _submitting
                    ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Place order'),
              ),
            ],
          );
        },
      ),
    );
  }
}
