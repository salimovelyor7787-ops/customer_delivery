import 'package:customer_delivery/core/widgets/app_network_image.dart';
import 'package:customer_delivery/features/home/domain/entities/category.dart';
import 'package:customer_delivery/features/home/domain/entities/restaurant.dart';
import 'package:flutter/material.dart';
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
  const HomeServiceTypeRow({super.key, required this.selectedIndex, required this.onSelect});

  final int selectedIndex;
  final ValueChanged<int> onSelect;

  static const _items = [
    _ServiceItem('Продукты', '15 мин', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80'),
    _ServiceItem('Рестораны', '25 мин', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&q=80'),
    _ServiceItem('Курьер', '10 мин', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 112,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final item = _items[i];
          final selected = i == selectedIndex;
          return GestureDetector(
            onTap: () => onSelect(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 160,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: selected ? Theme.of(context).colorScheme.primaryContainer : Colors.white,
                borderRadius: BorderRadius.circular(16),
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
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 52,
                      height: 52,
                      child: AppNetworkImage(imageUrl: item.imageUrl, fit: BoxFit.cover, placeholderIcon: Icons.store),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(item.eta, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ServiceItem {
  const _ServiceItem(this.title, this.eta, this.imageUrl);
  final String title;
  final String eta;
  final String imageUrl;
}

class HomePromoBannerCarousel extends StatelessWidget {
  const HomePromoBannerCarousel({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 132,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _PromoCard(
            title: 'Скидка 300 ₽',
            subtitle: 'По промокоду LOVE от ресторана',
            buttonLabel: 'Перейти к предложению',
            imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Промо скоро подключим к бэкенду')),
              );
            },
          ),
          const SizedBox(width: 12),
          _PromoCard(
            title: 'Бесплатная доставка',
            subtitle: 'От 1500 ₽ в выбранных заведениях',
            buttonLabel: 'Смотреть',
            imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
            onPressed: () {},
          ),
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
      color: const Color(0xFF2563EB),
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onPressed,
        child: SizedBox(
          width: MediaQuery.sizeOf(context).width * 0.86,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13)),
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
                const SizedBox(width: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 100,
                    height: 100,
                    child: AppNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover, placeholderIcon: Icons.restaurant),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Квадратные карточки «рядом» (цвета как на макете).
class HomeNearbyStoresRow extends StatelessWidget {
  const HomeNearbyStoresRow({super.key, required this.restaurants});

  final List<Restaurant> restaurants;

  static const _fallback = [
    _FallbackStore('FoodMaster', '20 – 30 минут', Color(0xFFE53935)),
    _FallbackStore('Гурман', '25 – 40 минут', Color(0xFF43A047)),
    _FallbackStore('Остров Вкуса', '40 – 45 минут', Color(0xFF1E88E5)),
  ];

  static const _accentColors = [Color(0xFFE53935), Color(0xFF43A047), Color(0xFF1E88E5)];

  @override
  Widget build(BuildContext context) {
    final tiles = <Widget>[];
    if (restaurants.length >= 3) {
      for (var i = 0; i < 3; i++) {
        final r = restaurants[i];
        tiles.add(_StoreSquare(name: r.name, eta: _etaForIndex(i), color: _accentColors[i % 3], restaurantId: r.id));
      }
    } else {
      for (var i = 0; i < _fallback.length; i++) {
        final f = _fallback[i];
        tiles.add(
          _StoreSquare(name: f.name, eta: f.eta, color: f.color, restaurantId: restaurants.isNotEmpty ? restaurants[i % restaurants.length].id : null),
        );
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (var i = 0; i < tiles.length; i++) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(child: tiles[i]),
          ],
        ],
      ),
    );
  }

  static String _etaForIndex(int i) {
    const etas = ['20 – 30 минут', '25 – 40 минут', '40 – 45 минут'];
    return etas[i % etas.length];
  }
}

class _FallbackStore {
  const _FallbackStore(this.name, this.eta, this.color);
  final String name;
  final String eta;
  final Color color;
}

class _StoreSquare extends StatelessWidget {
  const _StoreSquare({required this.name, required this.eta, required this.color, this.restaurantId});

  final String name;
  final String eta;
  final Color color;
  final String? restaurantId;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: Material(
        color: color,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: restaurantId == null
              ? null
              : () => context.push('/home/restaurant/$restaurantId'),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
                ),
                const Spacer(),
                Text(eta, style: TextStyle(color: Colors.white.withOpacity(0.92), fontSize: 12)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DealData {
  const _DealData({
    required this.name,
    required this.weight,
    required this.imageUrl,
    required this.priceCents,
    required this.oldPriceCents,
    required this.discountPercent,
  });
  final String name;
  final String weight;
  final String imageUrl;
  final int priceCents;
  final int oldPriceCents;
  final int discountPercent;
}

/// Горизонтальные карточки акций (демо-данные под макет).
class HomeDealsRow extends StatelessWidget {
  const HomeDealsRow({super.key});

  static const _deals = [
    _DealData(
      name: 'Чипсы Chips с крабом',
      weight: '150 г',
      imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80',
      priceCents: 10700,
      oldPriceCents: 13000,
      discountPercent: 30,
    ),
    _DealData(
      name: 'Чай Greens с цветочными нотами',
      weight: '150 г',
      imageUrl: 'https://images.unsplash.com/photo-1597318181409-cf1d2d4ab4a8?w=400&q=80',
      priceCents: 9800,
      oldPriceCents: 11200,
      discountPercent: 13,
    ),
    _DealData(
      name: 'Сыр GraBlu с плесенью',
      weight: '150 г',
      imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80',
      priceCents: 32100,
      oldPriceCents: 54300,
      discountPercent: 15,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(locale: 'ru_RU', symbol: '₽', decimalDigits: 0);
    return SizedBox(
      height: 228,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _deals.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final d = _deals[i];
          return _DealCard(deal: d, money: money);
        },
      ),
    );
  }
}

class _DealCard extends StatelessWidget {
  const _DealCard({required this.deal, required this.money});

  final _DealData deal;
  final NumberFormat money;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Stack(
            children: [
              SizedBox(
                height: 100,
                child: AppNetworkImage(imageUrl: deal.imageUrl, fit: BoxFit.cover, placeholderIcon: Icons.shopping_bag),
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
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
            child: Text(deal.weight, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.outline)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(deal.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        money.format(deal.priceCents / 100),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                      Text(
                        money.format(deal.oldPriceCents / 100),
                        style: TextStyle(
                          fontSize: 11,
                          decoration: TextDecoration.lineThrough,
                          color: Theme.of(context).colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
                Material(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Корзина для продуктов — в разработке')),
                      );
                    },
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(Icons.add, size: 20),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
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
                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline),
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
              title: const Text('Все рестораны'),
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
