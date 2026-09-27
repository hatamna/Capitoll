import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
  );

  static String get baseUrl {
    if (_configuredBaseUrl.isNotEmpty) {
      return _configuredBaseUrl;
    }

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }

    return 'http://localhost:3000';
  }

  static dynamic _decodeResponse(http.Response response) {
    final dynamic body = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = body is Map<String, dynamic>
          ? body['error']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw Exception(message);
    }

    return body;
  }

  static Future<List<Map<String, dynamic>>> getBills() async {
    final response = await http.get(Uri.parse('$baseUrl/api/v2/bills'));
    final body = _decodeResponse(response) as List<dynamic>;
    return body.cast<Map<String, dynamic>>();
  }

  static Future<Map<String, dynamic>> getBill(String billCode) async {
    final uri = Uri.parse(
      '$baseUrl/api/v2/bills/${Uri.encodeComponent(billCode)}',
    );
    return _decodeResponse(await http.get(uri)) as Map<String, dynamic>;
  }

  static Future<List<Map<String, dynamic>>> getRidings() async {
    final response = await http.get(Uri.parse('$baseUrl/api/v2/ridings'));
    final body = _decodeResponse(response) as List<dynamic>;
    return body.cast<Map<String, dynamic>>();
  }

  static Future<Map<String, dynamic>> getBillDescription(
    String billCode,
  ) async {
    final response = await http.get(
      Uri.parse(
        '$baseUrl/api/v2/bills/${Uri.encodeComponent(billCode)}/description',
      ),
    );
    return _decodeResponse(response) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getCurrentMps() async {
    final response = await http.get(Uri.parse('$baseUrl/api/v2/mps'));
    return _decodeResponse(response) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getBillRidingResult(
    String billCode,
    String ridingName,
  ) async {
    final uri = Uri.parse(
      '$baseUrl/api/v2/bills/${Uri.encodeComponent(billCode)}/results',
    ).replace(queryParameters: {'riding_name': ridingName});
    return _decodeResponse(await http.get(uri)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> submitRidingVote({
    required String billCode,
    required String ridingName,
    required String choice,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v2/votes'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'bill_code': billCode,
        'riding_name': ridingName,
        'choice': choice,
      }),
    );
    return _decodeResponse(response) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getRidingComplianceScore(
    String ridingName,
  ) async {
    final uri = Uri.parse(
      '$baseUrl/api/v2/ridings/${Uri.encodeComponent(ridingName)}/compliance-score',
    );
    return _decodeResponse(await http.get(uri)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMpBillActivity(String personId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v2/mps/$personId/bills'),
    );
    return _decodeResponse(response) as Map<String, dynamic>;
  }

  static Future<String> getMpPhotoForRiding(String ridingName) async {
    final uri = Uri.parse(
      '$baseUrl/api/v2/mp-photo',
    ).replace(queryParameters: {'riding_name': ridingName});
    final body = _decodeResponse(await http.get(uri)) as Map<String, dynamic>;
    return body['photo_url'] as String;
  }
}
