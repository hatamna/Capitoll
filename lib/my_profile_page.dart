import 'dart:ui';

import 'package:flutter/material.dart';

import 'services/api_service.dart';
import 'services/riding_preference_service.dart';

class MyProfilePage extends StatefulWidget {
  const MyProfilePage({super.key});

  @override
  State<MyProfilePage> createState() => _MyProfilePageState();
}

class _MyProfilePageState extends State<MyProfilePage> {
  late final Future<List<String>> _ridingNamesFuture = _loadRidingNames();

  Future<List<String>> _loadRidingNames() async {
    final ridings = await ApiService.getRidings();
    final names = ridings
        .map((riding) => riding['name'] as String?)
        .whereType<String>()
        .toList();

    if (names.isNotEmpty &&
        !names.contains(RidingPreferenceService.currentRiding.value)) {
      final defaultName = names.contains('Ottawa Centre')
          ? 'Ottawa Centre'
          : names.first;
      await RidingPreferenceService.setCurrentRiding(defaultName);
    }

    return names;
  }

  Future<void> _editRiding() async {
    try {
      final names = await _ridingNamesFuture;
      if (!mounted) return;
      if (names.isEmpty) throw Exception('No ridings are available.');

      var selectedRiding =
          names.contains(RidingPreferenceService.currentRiding.value)
          ? RidingPreferenceService.currentRiding.value!
          : names.first;

      final newRiding = await showDialog<String>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('Choose your riding'),
            content: DropdownButtonFormField<String>(
              key: ValueKey(selectedRiding),
              initialValue: selectedRiding,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Current riding',
                border: OutlineInputBorder(),
              ),
              items: names
                  .map(
                    (name) => DropdownMenuItem(value: name, child: Text(name)),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  setDialogState(() => selectedRiding = value);
                }
              },
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () =>
                    Navigator.of(dialogContext).pop(selectedRiding),
                child: const Text('Save'),
              ),
            ],
          ),
        ),
      );

      if (newRiding == null) return;
      await RidingPreferenceService.setCurrentRiding(newRiding);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Current riding updated.')));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Could not load ridings: $error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Profile Details',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Choose a riding to personalize bills and your MP view.',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 20),
            _profileCard(
              child: Row(
                children: [
                  Image.asset(
                    'assets/icons/face.png',
                    width: 64,
                    height: 64,
                    fit: BoxFit.contain,
                    filterQuality: FilterQuality.high,
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Text(
                      'Your Capitoll profile',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _profileCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'CURRENT RIDING',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Change current riding',
                        constraints: const BoxConstraints(
                          minWidth: 44,
                          minHeight: 44,
                        ),
                        padding: EdgeInsets.zero,
                        icon: const Icon(
                          Icons.edit_outlined,
                          size: 20,
                          color: Color.fromARGB(255, 243, 33, 33),
                        ),
                        onPressed: _editRiding,
                      ),
                    ],
                  ),
                  ValueListenableBuilder<String?>(
                    valueListenable: RidingPreferenceService.currentRiding,
                    builder: (context, ridingName, _) => Text(
                      ridingName ?? 'Choose a riding to get started',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your riding name is all we need. No address or postal code required.',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                  ),
                  FutureBuilder<List<String>>(
                    future: _ridingNamesFuture,
                    builder: (context, snapshot) {
                      if (snapshot.hasError) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Could not load ridings. Tap edit to retry.',
                            style: TextStyle(color: Colors.red.shade700),
                          ),
                        );
                      }
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Padding(
                          padding: EdgeInsets.only(top: 12),
                          child: LinearProgressIndicator(),
                        );
                      }
                      return const SizedBox(height: 4);
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _profileCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'PREFERENCES',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Language',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          const Text('EN'),
                          Switch(
                            value: false,
                            onChanged: (value) {},
                            activeThumbColor: const Color.fromARGB(
                              255,
                              243,
                              33,
                              33,
                            ),
                          ),
                          Text(
                            'FR',
                            style: TextStyle(color: Colors.grey.shade400),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Dark Mode',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Switch(
                        value: false,
                        onChanged: (value) {},
                        activeThumbColor: const Color.fromARGB(
                          255,
                          243,
                          33,
                          33,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _profileCard({required Widget child}) {
    return Stack(
      children: [
        Positioned.fill(
          child: Transform.translate(
            offset: const Offset(0, 4),
            child: ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.red.withValues(alpha: 0.15),
                      Colors.orange.withValues(alpha: 0.15),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: child,
        ),
      ],
    );
  }
}
