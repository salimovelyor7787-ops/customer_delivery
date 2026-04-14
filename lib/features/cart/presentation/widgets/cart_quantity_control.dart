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
            constraints: compact ? const BoxConstraints.tightFor(width: 28, height: 28) : null,
            padding: compact ? EdgeInsets.zero : null,
            icon: Icon(Icons.remove, size: compact ? 16 : 18),
            onPressed: onDecrement,
          ),
          Text(
            '$quantity',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: compact ? 12 : 14),
          ),
          IconButton(
            visualDensity: compact ? VisualDensity.compact : null,
            constraints: compact ? const BoxConstraints.tightFor(width: 28, height: 28) : null,
            padding: compact ? EdgeInsets.zero : null,
            icon: Icon(Icons.add, size: compact ? 16 : 18),
            onPressed: onIncrement,
          ),
        ],
      ),
    );
  }
}
