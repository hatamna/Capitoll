import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:3000';

  static Future<List<dynamic>> getBills() async {
    final response = await http.get(Uri.parse('$baseUrl/api/bills'));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load bills');
    }
  }

  static Future<String> getMpPhotoForRiding(String ridingName) async {
    final encodedRidingName = Uri.encodeComponent(ridingName);
    final uri = Uri.parse(
      '$baseUrl/api/ridings/$encodedRidingName/mp-photo',
    );
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      return body['photo_url'] as String;
    }

    throw Exception('Failed to load MP photo for $ridingName');
  }
}
