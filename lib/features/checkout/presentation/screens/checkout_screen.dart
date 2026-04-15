import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/home/domain/utils/restaurant_schedule.dart';
import 'package:customer_delivery/features/home/presentation/providers/home_providers.dart';
import 'package:customer_delivery/features/auth/presentation/providers/auth_providers.dart';
import 'package:customer_delivery/features/orders/presentation/providers/order_providers.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  static const _deviceIdKey = 'guest_checkout_device_id';
  final _phoneController = TextEditingController();

  String? _deviceId;
  double? _lat;
  double? _lng;
  String? _locationHint;
  bool _locating = false;
  bool _submitting = false;
  String? _error;

  String get _fullPhone => '+998${_phoneController.text.trim()}';

  @override
  void initState() {
    super.initState();
    _prepareGuestDeviceId();
    _detectLocation();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _prepareGuestDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_deviceIdKey);
    if (id == null || id.isEmpty) {
      id = const Uuid().v4();
      await prefs.setString(_deviceIdKey, id);
    }
    if (!mounted) return;
    setState(() => _deviceId = id);
  }

  Future<void> _detectLocation() async {
    setState(() {
      _locating = true;
      _error = null;
    });
    try {
      var serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _locationHint = 'Geolokatsiya o‘chiq. Iltimos yoqing.';
          _locating = false;
        });
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        setState(() {
          _locationHint = 'Geolokatsiyaga ruxsat berilmadi.';
          _locating = false;
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      if (!mounted) return;
      setState(() {
        _lat = position.latitude;
        _lng = position.longitude;
        _locationHint = "Joylashuvingiz aniqlandi. Buyurtmani rasmiylashtiring, kuryer sizni topadi.";
        _locating = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locationHint = 'Joylashuv aniqlanmadi. Qayta urinib ko‘ring.';
        _locating = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartNotifierProvider);
    final currentUser = ref.watch(currentUserProvider);
    final isGuest = currentUser == null;
    final restaurantAsync = cart.restaurantId == null ? null : ref.watch(restaurantDetailProvider(cart.restaurantId!));
    final canPlaceOrderNow = restaurantAsync?.maybeWhen(
          data: (r) => isRestaurantOpenNow(r),
          orElse: () => true,
        ) ??
        true;

    if (cart.lines.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: const Center(child: Text('Cart is empty')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Telefon raqami', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(9),
            ],
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              prefixText: '+998 ',
              hintText: '90 123 45 67',
              hintStyle: TextStyle(color: Color(0xFFB6B6B6)),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  _locationHint ?? 'Geolokatsiya aniqlanmoqda...',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: _lat != null && _lng != null
                            ? const Color(0xFF2E7D32)
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: _locating ? null : _detectLocation,
                child: _locating
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Qayta aniqlash'),
              ),
            ],
          ),
          if (isGuest) ...[
            const SizedBox(height: 8),
            Text(
              'Ro‘yxatdan o‘tmasdan kuniga 2 martagacha buyurtma berish mumkin.',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          if (!canPlaceOrderNow) ...[
            const SizedBox(height: 12),
            Text(
              "Restoran hozir yopiq. Buyurtma faqat ish vaqtida qabul qilinadi.",
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _submitting ||
                    !canPlaceOrderNow ||
                    _lat == null ||
                    _lng == null ||
                    _phoneController.text.trim().length != 9 ||
                    (isGuest && (_deviceId == null || _deviceId!.isEmpty))
                ? null
                : () async {
                    final messenger = ScaffoldMessenger.of(context);
                    setState(() {
                      _submitting = true;
                      _error = null;
                    });
                    final repo = ref.read(orderRepositoryProvider);
                    final res = await repo.createOrder(
                      restaurantId: cart.restaurantId!,
                      paymentMethod: 'cash',
                      lines: cart.lines,
                      guestPhone: _fullPhone,
                      guestLat: _lat,
                      guestLng: _lng,
                      guestDeviceId: isGuest ? _deviceId : null,
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
                        if (isGuest) {
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Buyurtmangiz qabul qilindi. Operator tez orada bog‘lanadi.')),
                          );
                          context.go('/home');
                        } else {
                          context.go('/orders/$orderId');
                        }
                      },
                    );
                  },
            child: _submitting
                ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Buyurtma berish'),
          ),
        ],
      ),
    );
  }
}
