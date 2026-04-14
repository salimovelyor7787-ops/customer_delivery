import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/home/presentation/notifiers/restaurant_list_notifier.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Вкладка «Поиск»: поле ввода и вертикальный список ресторанов.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final listState = ref.watch(restaurantListNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Qidiruv')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: "Taomlar va restoranlarni qidiring...",
                prefixIcon: const Icon(Icons.search_rounded),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              ),
              onChanged: (v) => ref.read(restaurantListNotifierProvider.notifier).setSearchQuery(v),
            ),
          ),
          Expanded(child: _Results(listState: listState)),
        ],
      ),
    );
  }
}

class _Results extends ConsumerWidget {
  const _Results({required this.listState});

  final RestaurantListState listState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (listState.loading && listState.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (listState.error != null && listState.items.isEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(listState.error!)));
    }
    if (listState.items.isEmpty) {
      return const Center(child: Text("Hech narsa topilmadi"));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: listState.items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
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
            trailing: Icon(Icons.chevron_right_rounded, color: Theme.of(context).colorScheme.outline),
            onTap: () => context.push('/home/restaurant/${r.id}'),
          ),
        );
      },
    );
  }
}
