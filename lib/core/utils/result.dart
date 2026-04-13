import 'package:customer_delivery/core/errors/failures.dart';

/// Lightweight Result type for repository returns.
sealed class Result<T> {
  const Result();

  R fold<R>(R Function(Failure f) onFailure, R Function(T data) onSuccess);

  bool get isSuccess => this is Success<T>;
  T? get dataOrNull => fold((_) => null, (d) => d);
  Failure? get failureOrNull => fold((f) => f, (_) => null);
}

class Success<T> extends Result<T> {
  const Success(this.data);
  final T data;

  @override
  R fold<R>(R Function(Failure f) onFailure, R Function(T data) onSuccess) =>
      onSuccess(data);
}

class FailureResult<T> extends Result<T> {
  const FailureResult(this.failure);
  final Failure failure;

  @override
  R fold<R>(R Function(Failure f) onFailure, R Function(T data) onSuccess) =>
      onFailure(failure);
}

extension ResultObjectX<T> on Object? {
  /// Maps PostgREST / function errors to [Failure].
  Failure toFailure([String fallback = 'Request failed']) {
    final o = this;
    if (o is Failure) return o;
    return ServerFailure(o?.toString() ?? fallback);
  }
}
