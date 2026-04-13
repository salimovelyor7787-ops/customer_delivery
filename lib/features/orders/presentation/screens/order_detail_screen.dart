import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/orders/data/datasources/order_realtime_datasource.dart';
import 'package:customer_delivery/features/orders/domain/entities/order_summary.dart';
import 'package:customer_delivery/features/orders/presentation/providers/order_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  OrderRealtimeDataSource? _rt;
  CourierLocation? _courier;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) return;
      final ds = OrderRealtimeDataSource(ref.read(supabaseClientProvider));
      ds.subscribeSingleOrder(
        orderId: widget.orderId,
        onOrderChange: (_) => ref.invalidate(orderDetailProvider(widget.orderId)),
      );
      ds.subscribeCourierForOrder(
        orderId: widget.orderId,
        onLocation: (loc) => setState(() => _courier = loc),
      );
      setState(() => _rt = ds);
    });
  }

  @override
  void dispose() {
    _rt?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(supabaseClientProvider).auth.currentSession;
    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Sign in to view this order.', textAlign: TextAlign.center),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => context.push(
                    withNextQuery('/login', '/orders/${widget.orderId}'),
                  ),
                  child: const Text('Sign in'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final asyncOrder = ref.watch(orderDetailProvider(widget.orderId));
    final money = NumberFormat.simpleCurrency();
    final dateFmt = DateFormat.yMMMd().add_jm();

    return Scaffold(
      appBar: AppBar(title: const Text('Order')),
      body: asyncOrder.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (o) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(o.restaurantName ?? 'Restaurant', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text('Status: ${o.status}', style: Theme.of(context).textTheme.titleMedium),
              Text('Placed: ${dateFmt.format(o.createdAt)}'),
              const SizedBox(height: 8),
              Text('Total: ${money.format(o.totalCents / 100)}'),
              Text('Delivery fee: ${money.format(o.deliveryFeeCents / 100)}'),
              const Divider(height: 32),
              Text('Courier', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (_courier == null)
                const Text('Waiting for courier location updates…')
              else
                Text(
                  'Last position: ${_courier!.lat.toStringAsFixed(5)}, ${_courier!.lng.toStringAsFixed(5)}\n'
                  'Updated: ${dateFmt.format(_courier!.updatedAt)}',
                ),
              const SizedBox(height: 8),
              Text(
                'Map widget omitted to keep dependencies minimal — plug in `google_maps_flutter` or Mapbox here.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          );
        },
      ),
    );
  }
}
