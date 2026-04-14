import 'package:flutter/material.dart';

class CartQuantityControl extends StatelessWidget {
  const CartQuantityControl({
    super.key,
    required this.quantity,
    required this.onDecrement,
    required this.onIncrement,
    this.compact = false,
  });

  final int quantity;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(compact ? 20 : 24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            visualDensity: compact ? VisualDensity.compact : null,
            icon: const Icon(Icons.remove, size: 18),
            onPressed: onDecrement,
          ),
          Text(
            '$quantity',
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          IconButton(
            visualDensity: compact ? VisualDensity.compact : null,
            icon: const Icon(Icons.add, size: 18),
            onPressed: onIncrement,
          ),
        ],
      ),
    );
  }
}
