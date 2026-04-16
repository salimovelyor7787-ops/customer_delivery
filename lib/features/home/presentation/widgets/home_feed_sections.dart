import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/home/domain/entities/category.dart';
import 'package:customer_delivery/features/home/domain/entities/home_banner.dart';
import 'package:customer_delivery/features/home/domain/entities/home_deal_item.dart';
import 'package:customer_delivery/features/home/domain/entities/home_nearby_card.dart';
import 'package:customer_delivery/features/home/domain/entities/home_service_card.dart';
import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

/// Заголовок секции с опциональной стрелкой «ещё».
class HomeSectionHeader extends StatelessWidget {
  const HomeSectionHeader({super.key, required this.title, this.onSeeAll});

  final String title;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 8, 12),
      child: Row(
        children: [
          Expanded(child: Text(title, style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700))),
          if (onSeeAll != null)
            IconButton(
              onPressed: onSeeAll,
              icon: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}

/// Горизонталь: Продукты / Рестораны / Курьер (как на макете).
class HomeServiceTypeRow extends StatelessWidget {
  const HomeServiceTypeRow({
    super.key,
    required this.selectedIndex,
    required this.onSelect,
    required this.items,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final List<HomeServiceCard> items;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) const SizedBox(width: 12),
            Expanded(
              child: _ServiceTypeCard(
                item: items[i],
                selected: i == selectedIndex,
                onTap: () => onSelect(i),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ServiceTypeCard extends StatelessWidget {
  const _ServiceTypeCard({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final HomeServiceCard item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      // Smaller card under search row: keep width, reduce height.
      aspectRatio: 1.22,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          decoration: BoxDecoration(
            color: selected ? Theme.of(context).colorScheme.primaryContainer : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? Theme.of(context).colorScheme.primary : Colors.black12,
              width: selected ? 1.5 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: AppNetworkImage(
            imageUrl: item.imageUrl,
            fit: BoxFit.cover,
            placeholderIcon: Icons.store,
          ),
        ),
      ),
    );
  }
}

class HomePromoBannerCarousel extends StatelessWidget {
  const HomePromoBannerCarousel({
    super.key,
    required this.banners,
  });

  final List<HomeBanner> banners;

  @override
  Widget build(BuildContext context) {
    if (banners.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 132,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          for (var i = 0; i < banners.length; i++) ...[
            if (i > 0) const SizedBox(width: 12),
            _PromoCard(
              title: banners[i].title,
              subtitle: banners[i].subtitle ?? '',
              buttonLabel: banners[i].buttonText?.isNotEmpty == true ? banners[i].buttonText! : "Ko'rish",
              imageUrl: banners[i].imageUrl,
              onPressed: () {
                final path = banners[i].actionPath?.trim();
                if (path == null || path.isEmpty) return;
                if (path.startsWith('/')) {
                  context.push(path);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Faqat ichki yo‘nalishlar qo‘llab-quvvatlanadi')),
                  );
                }
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _PromoCard extends StatelessWidget {
  const _PromoCard({
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    required this.imageUrl,
    required this.onPressed,
  });

  final String title;
  final String subtitle;
  final String buttonLabel;
  final String imageUrl;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onPressed,
        child: SizedBox(
          width: MediaQuery.sizeOf(context).width * 0.86,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.cover,
                placeholderIcon: Icons.restaurant,
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.18),
                      Colors.black.withOpacity(0.30),
                      Colors.black.withOpacity(0.45),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.92), fontSize: 13)),
                    const Spacer(),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF2563EB),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: onPressed,
                      child: Text(buttonLabel, style: const TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Квадратные карточки «рядом» (цвета как на макете).
class HomeNearbyStoresRow extends StatelessWidget {
  const HomeNearbyStoresRow({super.key, required this.cards});

  final List<HomeNearbyCard> cards;

  @override
  Widget build(BuildContext context) {
    if (cards.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 74,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: cards.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          return SizedBox(
            width: 108,
            child: _StoreSquare(card: cards[i]),
          );
        },
      ),
    );
  }
}

class _StoreSquare extends StatelessWidget {
  const _StoreSquare({required this.card});
  final HomeNearbyCard card;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: card.restaurantId == null ? null : () => context.push('/home/restaurant/${card.restaurantId}'),
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.black.withOpacity(0.08)),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: AppNetworkImage(
            imageUrl: card.imageUrl,
            fit: BoxFit.cover,
            placeholderIcon: Icons.store,
          ),
        ),
      ),
    );
  }
}

class _DealData {
  const _DealData({
    required this.menuItemId,
    required this.restaurantId,
    required this.name,
    required this.imageUrl,
    required this.priceCents,
    required this.oldPriceCents,
    required this.discountPercent,
  });
  final String menuItemId;
  final String restaurantId;
  final String name;
  final String imageUrl;
  final int priceCents;
  final int oldPriceCents;
  final int discountPercent;
}

/// Горизонтальные карточки акций (демо-данные под макет).
class HomeDealsRow extends ConsumerWidget {
  const HomeDealsRow({super.key});

  List<_DealData> _buildDeals(List<HomeDealItem> items) {
    return items.take(8).map((m) {
      return _DealData(
        menuItemId: m.menuItemId,
        restaurantId: m.restaurantId,
        name: m.name,
        imageUrl: m.imageUrl,
        priceCents: m.dealPriceCents,
        oldPriceCents: m.basePriceCents,
        discountPercent: m.discountPercent,
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final money = NumberFormat.currency(locale: 'uz_UZ', symbol: "so'm ", decimalDigits: 0);
    final dealsAsync = ref.watch(homeDealsProvider);

    return dealsAsync.when(
      loading: () => const SizedBox(
        height: 188,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => const SizedBox.shrink(),
      data: (items) {
        final deals = _buildDeals(items);
        if (deals.isEmpty) return const SizedBox.shrink();

        return SizedBox(
          height: 188,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: deals.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final d = deals[i];
              return _DealCard(
                deal: d,
                money: money,
              );
            },
          ),
        );
      },
    );
  }
}

class _DealCard extends StatelessWidget {
  const _DealCard({
    required this.deal,
    required this.money,
  });

  final _DealData deal;
  final NumberFormat money;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/home/restaurant/${deal.restaurantId}'),
        child: Container(
          width: 132,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.black.withOpacity(0.06)),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Positioned.fill(
                      child: AppNetworkImage(
                        imageUrl: deal.imageUrl,
                        fit: BoxFit.cover,
                        placeholderIcon: Icons.shopping_bag,
                      ),
                    ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF6B35),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '-${deal.discountPercent}%',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 0),
                child: Text(deal.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 8),
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.end,
                  spacing: 6,
                  runSpacing: 2,
                  children: [
                    Text(
                      money.format(deal.priceCents / 100),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                    if (deal.oldPriceCents > deal.priceCents)
                      Text(
                        money.format(deal.oldPriceCents / 100),
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.1,
                          decoration: TextDecoration.lineThrough,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Карточка ресторана в горизонтальном списке (рейтинг и время — визуально как на макете).
class HomeRestaurantCarouselCard extends StatelessWidget {
  const HomeRestaurantCarouselCard({super.key, required this.restaurant, required this.etaLabel});

  final Restaurant restaurant;
  final String etaLabel;

  double get _rating => 4.5 + (restaurant.id.hashCode % 6) * 0.1;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/home/restaurant/${restaurant.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: AppNetworkImage(imageUrl: restaurant.imageUrl, fit: BoxFit.cover, placeholderIcon: Icons.restaurant),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 6),
                child: Text(restaurant.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                child: Row(
                  children: [
                    const Icon(Icons.star_rounded, size: 18, color: Color(0xFFFFB800)),
                    Text(_rating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        etaLabel,
                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HomeRestaurantCarousel extends StatelessWidget {
  const HomeRestaurantCarousel({super.key, required this.restaurants, required this.etaLabels});

  final List<Restaurant> restaurants;
  final List<String> etaLabels;

  @override
  Widget build(BuildContext context) {
    if (restaurants.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 220,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: restaurants.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final eta = etaLabels[i % etaLabels.length];
          return HomeRestaurantCarouselCard(restaurant: restaurants[i], etaLabel: eta);
        },
      ),
    );
  }
}

class HomeRestaurantVerticalList extends StatelessWidget {
  const HomeRestaurantVerticalList({super.key, required this.restaurants, required this.etaLabels});

  final List<Restaurant> restaurants;
  final List<String> etaLabels;

  @override
  Widget build(BuildContext context) {
    if (restaurants.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          for (var i = 0; i < restaurants.length; i++) ...[
            _RestaurantBannerCard(
              restaurant: restaurants[i],
              etaLabel: etaLabels[i % etaLabels.length],
            ),
            if (i != restaurants.length - 1) const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _RestaurantBannerCard extends StatelessWidget {
  const _RestaurantBannerCard({
    required this.restaurant,
    required this.etaLabel,
  });

  final Restaurant restaurant;
  final String etaLabel;

  double get _rating => 4.5 + (restaurant.id.hashCode % 6) * 0.1;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/home/restaurant/${restaurant.id}'),
        child: SizedBox(
          height: 152,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppNetworkImage(imageUrl: restaurant.imageUrl, fit: BoxFit.cover, placeholderIcon: Icons.restaurant),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.14),
                      Colors.black.withOpacity(0.20),
                      Colors.black.withOpacity(0.52),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Spacer(),
                    Text(
                      restaurant.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      restaurant.categoryName ?? 'Restoran',
                      style: TextStyle(color: Colors.white.withOpacity(0.92)),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, size: 18, color: Color(0xFFFFB800)),
                        Text(
                          _rating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            etaLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Colors.white.withOpacity(0.92)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

void showHomeCategoryFilterSheet(
  BuildContext context, {
  required List<Category> categories,
  required String? selectedCategoryId,
  required void Function(String?) onSelect,
}) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      return SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            ListTile(
              title: const Text('Barcha restoranlar'),
              trailing: selectedCategoryId == null ? const Icon(Icons.check) : null,
              onTap: () {
                onSelect(null);
                Navigator.pop(ctx);
              },
            ),
            ...categories.map(
              (c) => ListTile(
                title: Text(c.name),
                trailing: selectedCategoryId == c.id ? const Icon(Icons.check) : null,
                onTap: () {
                  onSelect(c.id);
                  Navigator.pop(ctx);
                },
              ),
            ),
          ],
        ),
      );
    },
  );
}
