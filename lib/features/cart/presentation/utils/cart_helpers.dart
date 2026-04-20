import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Если в корзине другой ресторан — спрашиваем и только потом добавляем позицию.
Future<bool> ensureCartRestaurantOrConfirmSwitch(
  BuildContext context,
  WidgetRef ref,
  String targetRestaurantId,
) async {
  final cart = ref.read(cartNotifierProvider);
  if (cart.lines.isEmpty ||
      cart.restaurantId == null ||
      cart.restaurantId == targetRestaurantId) {
    return true;
  }

  final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Boshqa restoran'),
          content: const Text(
            "Savatda boshqa restorandan taomlar bor. Savatni tozalab, bu taomni qo'shasizmi?",
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("Tozalash va qo'shish")),
          ],
        ),
      ) ??
      false;
  return ok;
}
