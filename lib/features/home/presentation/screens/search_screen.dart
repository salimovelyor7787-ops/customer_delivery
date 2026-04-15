import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/home/domain/entities/category.dart';
import 'package:customer_delivery/features/home/presentation/notifiers/restaurant_list_notifier.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final List<String> _recent = ['Lavash', 'Osh', 'Pizza', 'Coffee Lab'];
  static const _popular = ['Burger', 'Pizza', 'Sushi', 'Coffee', 'Salatlar'];

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 320) {
      ref.read(restaurantListNotifierProvider.notifier).loadMore();
    }
  }

  void _applyQuery(String value) {
    _controller.text = value;
    ref.read(restaurantListNotifierProvider.notifier).setSearchQuery(value);
  }

  @override
  void dispose() {
    _scroll.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final listState = ref.watch(restaurantListNotifierProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Qidiruv')),
      body: ListView(
        controller: _scroll,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        children: [
          TextField(
            controller: _controller,
            decoration: InputDecoration(
              hintText: "Taomlar va restoranlarni qidiring...",
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: const Icon(Icons.mic_none_rounded),
              filled: true,
              fillColor: const Color(0xFFFFF2EC),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
            ),
            onChanged: (v) => ref.read(restaurantListNotifierProvider.notifier).setSearchQuery(v),
          ),
          const SizedBox(height: 18),
          _SectionHeader(
            title: 'Mashhur qidiruvlar',
            action: "Barchasini ko'rish",
            onTap: () {},
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _popular
                .map(
                  (q) => _SearchChip(
                    label: q,
                    onTap: () => _applyQuery(q),
                    icon: Icons.local_fire_department_outlined,
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 18),
          _SectionHeader(
            title: 'Oxirgi qidiruvlar',
            action: 'Tozalash',
            onTap: () => setState(() => _recent.clear()),
          ),
          const SizedBox(height: 10),
          if (_recent.isEmpty)
            Text("Oxirgi qidiruvlar yo'q", style: t.bodyMedium)
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _recent
                  .map(
                    (q) => _SearchChip(
                      label: q,
                      onTap: () => _applyQuery(q),
                      icon: Icons.history_rounded,
                    ),
                  )
                  .toList(),
            ),
          const SizedBox(height: 18),
          _SectionHeader(
            title: 'Kategoriyalar',
            action: 'Barchasi',
            onTap: () {},
          ),
          const SizedBox(height: 10),
          categoriesAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 14),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (e, _) => Text('$e'),
            data: (cats) => _CategoryRow(categories: cats),
          ),
          const SizedBox(height: 18),
          Text('Restoranlar', style: t.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          _Results(
            listState: listState,
            onOpen: () {
              final q = _controller.text.trim();
              if (q.isEmpty) return;
              setState(() {
                _recent.remove(q);
                _recent.insert(0, q);
                if (_recent.length > 6) _recent.removeLast();
              });
            },
          ),
        ],
      ),
    );
  }
}

class _Results extends ConsumerWidget {
  const _Results({required this.listState, required this.onOpen});

  final RestaurantListState listState;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (listState.loading && listState.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (listState.error != null && listState.items.isEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(listState.error!)));
    }
    if (listState.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: Text("Hech narsa topilmadi")),
      );
    }
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: listState.items.length + (listState.loadingMore ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        if (i >= listState.items.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }
        final r = listState.items[i];
        final eta = 15 + (r.id.hashCode % 18);
        final km = ((r.id.hashCode % 30) + 10) / 10;
        final rating = 4.2 + ((r.id.hashCode % 8) * 0.1);

        return Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () {
              onOpen();
              context.push('/home/restaurant/${r.id}');
            },
            child: SizedBox(
              height: 102,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: 114,
                    child: AppNetworkImage(imageUrl: r.imageUrl, fit: BoxFit.cover),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  r.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 20),
                                ),
                              ),
                              if (r.deliveryFeeCents == 0)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE9FFF5),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Text(
                                    'Yetkazish bepul',
                                    style: TextStyle(fontSize: 12, color: Color(0xFF00A165), fontWeight: FontWeight.w600),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            r.categoryName ?? 'Restoran',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                          const Spacer(),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, size: 18, color: Color(0xFFFFC107)),
                              Text('${rating.toStringAsFixed(1)} ', style: const TextStyle(fontWeight: FontWeight.w600)),
                              Expanded(
                                child: Text(
                                  '•  $eta-${eta + 10} daqiqa  •  ${km.toStringAsFixed(1)} km',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.action,
    required this.onTap,
  });

  final String title;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            child: Text(
              action,
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SearchChip extends StatelessWidget {
  const _SearchChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF7F1ED),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryRow extends StatelessWidget {
  const _CategoryRow({required this.categories});

  final List<Category> categories;

  static const _icons = [
    Icons.fastfood_rounded,
    Icons.local_pizza_rounded,
    Icons.set_meal_rounded,
    Icons.ramen_dining_rounded,
    Icons.local_cafe_rounded,
    Icons.eco_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) {
      return const Text("Kategoriyalar mavjud emas");
    }
    final display = categories.take(6).toList();
    return SizedBox(
      height: 114,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: display.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, i) {
          final c = display[i];
          return Container(
            width: 102,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF7F1ED),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(_icons[i % _icons.length], size: 28),
                const SizedBox(height: 8),
                Text(
                  c.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
