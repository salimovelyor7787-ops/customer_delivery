import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/home/presentation/notifiers/restaurant_list_notifier.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Отдельный экран всех магазинов рядом.
class StoresScreen extends ConsumerStatefulWidget {
  const StoresScreen({super.key});

  @override
  ConsumerState<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends ConsumerState<StoresScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >
        _scrollController.position.maxScrollExtent - 300) {
      ref.read(restaurantListNotifierProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final listState = ref.watch(restaurantListNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text("Yaqin do'konlar")),
      body: RefreshIndicator(
        onRefresh: () => ref.read(restaurantListNotifierProvider.notifier).refresh(),
        child: Builder(
          builder: (_) {
            if (listState.loading && listState.items.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            }
            if (listState.error != null && listState.items.isEmpty) {
              return ListView(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(listState.error!),
                  ),
                ],
              );
            }
            if (listState.items.isEmpty) {
              return ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text("Do'konlar topilmadi")),
                  ),
                ],
              );
            }

            return ListView.separated(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: listState.items.length + (listState.loadingMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                if (i >= listState.items.length) {
                  return const Padding(
                    padding: EdgeInsets.all(12),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final r = listState.items[i];
                return Material(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  clipBehavior: Clip.antiAlias,
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(8),
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 64,
                        height: 64,
                        child: AppNetworkImage(imageUrl: r.imageUrl, fit: BoxFit.cover),
                      ),
                    ),
                    title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: r.categoryName != null ? Text(r.categoryName!) : null,
                    trailing: Icon(
                      Icons.chevron_right_rounded,
                      color: Theme.of(context).colorScheme.outline,
                    ),
                    onTap: () => context.push('/home/restaurant/${r.id}'),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
