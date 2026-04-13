import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/orders/data/datasources/order_realtime_datasource.dart';
import 'package:customer_delivery/features/orders/presentation/providers/order_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  OrderRealtimeDataSource? _realtime;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) return;
      final ds = OrderRealtimeDataSource(ref.read(supabaseClientProvider));
      ds.subscribeMyOrders(
        userId: uid,
        onOrderChange: (_) {
          ref.invalidate(activeOrdersProvider);
          ref.invalidate(orderHistoryProvider);
        },
      );
      setState(() => _realtime = ds);
    });
  }

  @override
  void dispose() {
    _realtime?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(supabaseClientProvider).auth.currentSession;
    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Orders')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Sign in to see your active orders and history.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => context.push(withNextQuery('/login', '/orders')),
                  child: const Text('Sign in'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final activeAsync = ref.watch(activeOrdersProvider);
    final historyAsync = ref.watch(orderHistoryProvider);
    final dateFmt = DateFormat.yMMMd().add_jm();

    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(activeOrdersProvider);
          ref.invalidate(orderHistoryProvider);
          await ref.read(activeOrdersProvider.future);
          await ref.read(orderHistoryProvider.future);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Active', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            ...activeAsync.when<List<Widget>>(
              loading: () => [
                const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
              ],
              error: (e, _) => [Text('Active: $e')],
              data: (list) {
                if (list.isEmpty) return [const Text('No active orders')];
                return list
                    .map(
                      (o) => Card(
                        child: ListTile(
                          title: Text(o.restaurantName ?? 'Order ${o.id.substring(0, 8)}'),
                          subtitle: Text('${o.status} · ${dateFmt.format(o.createdAt)}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push('/orders/${o.id}'),
                        ),
                      ),
                    )
                    .toList();
              },
            ),
            const SizedBox(height: 24),
            Text('History', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            ...historyAsync.when<List<Widget>>(
              loading: () => [
                const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
              ],
              error: (e, _) => [Text('History: $e')],
              data: (list) {
                if (list.isEmpty) return [const Text('No past orders')];
                return list
                    .map(
                      (o) => Card(
                        child: ListTile(
                          title: Text(o.restaurantName ?? 'Order'),
                          subtitle: Text('${o.status} · ${dateFmt.format(o.createdAt)}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push('/orders/${o.id}'),
                        ),
                      ),
                    )
                    .toList();
              },
            ),
          ],
        ),
      ),
    );
  }
}
