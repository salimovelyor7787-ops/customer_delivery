import 'package:customer_delivery/core/di/providers.dart';
import 'package:customer_delivery/features/home/domain/entities/home_banner.dart';
import 'package:customer_delivery/features/home/presentation/notifiers/restaurant_list_notifier.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:customer_delivery/features/home/presentation/widgets/home_feed_sections.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchController = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 400) {
      ref.read(restaurantListNotifierProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    _searchController.dispose();
    super.dispose();
  }

  static const _etaPopular = ['20 – 30 daqiqa', '15 – 45 daqiqa', '25 – 30 daqiqa', '40 – 45 daqiqa'];

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final listState = ref.watch(restaurantListNotifierProvider);
    final bannersAsync = ref.watch(homeBannersProvider);
    final banners = bannersAsync.maybeWhen(
      data: (items) => items,
      orElse: () => const <HomeBanner>[],
    );
    final session = ref.watch(supabaseClientProvider).auth.currentSession;
    const bg = Color(0xFFF3F4F6);

    return Scaffold(
      backgroundColor: bg,
      body: RefreshIndicator(
        onRefresh: () => ref.read(restaurantListNotifierProvider.notifier).refresh(),
        child: CustomScrollView(
          controller: _scroll,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _TopAddressBar(session: session)),
            SliverToBoxAdapter(child: _SearchRow(
              controller: _searchController,
              onChanged: (v) => ref.read(restaurantListNotifierProvider.notifier).setSearchQuery(v),
              onFilterTap: () {
                categoriesAsync.maybeWhen(
                  data: (cats) {
                    showHomeCategoryFilterSheet(
                      context,
                      categories: cats,
                      selectedCategoryId: listState.categoryId,
                      onSelect: (id) => ref.read(restaurantListNotifierProvider.notifier).setCategory(id),
                    );
                  },
                  orElse: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Kategoriyalar yuklanmoqda...')),
                    );
                  },
                );
              },
            )),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            SliverToBoxAdapter(child: HomePromoBannerCarousel(banners: banners)),
            const SliverToBoxAdapter(child: HomeSectionHeader(title: 'Chegirmalar va aksiyalar')),
            const SliverToBoxAdapter(child: HomeDealsRow()),
            if (listState.items.isNotEmpty) ...[
              const SliverToBoxAdapter(child: HomeSectionHeader(title: 'Все рестораны')),
              SliverToBoxAdapter(
                child: HomeRestaurantVerticalList(
                  restaurants: listState.items.take(8).toList(),
                  etaLabels: _etaPopular,
                ),
              ),
            ],
            if (listState.loading && listState.items.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: Padding(padding: EdgeInsets.all(48), child: CircularProgressIndicator())),
              )
            else if (listState.error != null && listState.items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(listState.error!))),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }
}

class _TopAddressBar extends ConsumerWidget {
  const _TopAddressBar({required this.session});

  final Session? session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const deliveryLine = "Chust shahri bo'ylab";
    final hasPushDot = ref.watch(hasActivePushNotificationsProvider).maybeWhen(
          data: (v) => v,
          orElse: () => false,
        );

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 4),
        child: Row(
          children: [
            Icon(Icons.location_on_rounded, color: Theme.of(context).colorScheme.primary, size: 22),
            const SizedBox(width: 6),
            Expanded(
              child: InkWell(
                onTap: () => context.go('/profile'),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Yetkazib berish',
                        style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                      DefaultTextStyle.merge(
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        child: const Text(
                          deliveryLine,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            IconButton(
              onPressed: () => context.push('/home/notifications'),
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.black.withOpacity(0.06)),
                    ),
                    child: Icon(
                      Icons.notifications_none_rounded,
                      size: 22,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  if (hasPushDot)
                    Positioned(
                      right: -1,
                      top: -1,
                      child: Container(
                        width: 9,
                        height: 9,
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.2),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchRow extends StatelessWidget {
  const _SearchRow({
    required this.controller,
    required this.onChanged,
    required this.onFilterTap,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onFilterTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              decoration: InputDecoration(
                hintText: "Taomlar va restoranlarni qidiring...",
                prefixIcon: const Icon(Icons.search_rounded),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.black.withOpacity(0.06)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.black.withOpacity(0.06)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 1.5),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: onFilterTap,
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                width: 52,
                height: 52,
                child: Icon(Icons.tune_rounded, color: Theme.of(context).colorScheme.onSurface),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
