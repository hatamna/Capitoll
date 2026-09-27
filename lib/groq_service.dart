import 'dart:convert';
import 'package:http/http.dart' as http;

class GroqService {
  // Replace with your actual key from console.groq.com
  static const String _apiKey = String.fromEnvironment(
    'GROQ_API_KEY',
    defaultValue: '',
  );
  static const String _url = 'https://api.groq.com/openai/v1/chat/completions';

  static Future<String> fetchBillSummary(String billNum, String billTitle) async {
    try {
      final response = await http.post(
        Uri.parse(_url),
        headers: {
          'Authorization': 'Bearer $_apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': 'openai/gpt-oss-20b',
          'messages': [
            {
              'role': 'system',
              'content': 'You are an assistant providing concise, neutral 2-sentence summaries of Canadian parliamentary bills.'
            },
            {
              'role': 'user',
              'content': 'Summarize Canadian Bill $billNum: $billTitle'
            }
          ],
          'max_tokens': 1024, 
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['choices'][0]['message']['content'].toString().trim();
      } else {
        return 'Could not generate summary at this time.';
      }
    } catch (e) {
      return 'Error loading summary: $e';
    }
  }
}