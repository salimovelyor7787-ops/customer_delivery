import 'package:equatable/equatable.dart';

class CartLine extends Equatable {
  const CartLine({
    required this.lineId,
    required this.menuItemId,
    required this.name,
    required this.basePriceCents,
    required this.optionsExtraCents,
    required this.quantity,
    this.imageUrl,
    this.selectedOptionIds = const {},
  });

  final String lineId;
  final String menuItemId;
  final String name;
  final int basePriceCents;
  final int optionsExtraCents;
  final int quantity;
  final String? imageUrl;
  final Set<String> selectedOptionIds;

  int get unitTotalCents => basePriceCents + optionsExtraCents;

  int get lineTotalCents => unitTotalCents * quantity;

  CartLine copyWith({
    int? quantity,
    Set<String>? selectedOptionIds,
    int? optionsExtraCents,
  }) {
    return CartLine(
      lineId: lineId,
      menuItemId: menuItemId,
      name: name,
      basePriceCents: basePriceCents,
      optionsExtraCents: optionsExtraCents ?? this.optionsExtraCents,
      quantity: quantity ?? this.quantity,
      imageUrl: imageUrl,
      selectedOptionIds: selectedOptionIds ?? this.selectedOptionIds,
    );
  }

  @override
  List<Object?> get props => [
        lineId,
        menuItemId,
        name,
        basePriceCents,
        optionsExtraCents,
        quantity,
        imageUrl,
        selectedOptionIds.toList()..sort(),
      ];
}
