import 'package:customer_delivery/core/utils/result.dart';
import 'package:customer_delivery/features/profile/domain/entities/address.dart';

abstract class AddressRepository {
  Future<Result<List<Address>>> fetchMyAddresses();
}
