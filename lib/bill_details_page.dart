import 'dart:ui';
import 'package:flutter/material.dart';
import 'groq_service.dart';

class BillDetailPage extends StatefulWidget {
  final String billNum; // Keep this here

  const BillDetailPage({
    super.key,
    required this.billNum,
  });

  @override
  State<BillDetailPage> createState() => _BillDetailPageState();
}

class _BillDetailPageState extends State<BillDetailPage> {
  late Future<String> _summaryFuture;
  bool _hasWeighedIn = false;

  @override
  void initState() {
    super.initState();
    _summaryFuture = GroqService.fetchBillSummary(widget.billNum, 'Bill Details');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Colors.black87),
        title: Text(
          'Bill Details',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 10),
            Text(
              'BILL',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
            Transform.translate(
              offset: Offset(0, -8),
              child: Text(
                widget.billNum,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 70,
                ),
              ),
            ),
            SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: FutureBuilder<String>(
                future: _summaryFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 32.0),
                        child: Column(
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 12),
                            Text('Generating detailed summary...', style: TextStyle(color: Colors.black, fontSize: 16.0, height: 1.5)),
                          ],
                        ),
                      ),
                    );
                  } else if (snapshot.hasError) {
                    return Container(
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Failed to load summary: ${snapshot.error}',
                        style: TextStyle(color: Colors.black, fontSize: 16.0, height: 1.5)
                      ),
                    );
                  } else if (snapshot.hasData) {
                    return Text(
                      snapshot.data!,
                      style: TextStyle(
                        fontSize: 16.0,
                        height: 1.5,
                      ),
                    );
                  }
                  return Text('No summary available.', style: TextStyle(color: Colors.black, fontSize: 16.0, height: 1.5));
                },
              )
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: SizedBox(
            height: 54.0,
            width: double.infinity,
            child: Stack(
              children: [
                if (!_hasWeighedIn)
                  Positioned.fill(
                    child: Transform.translate(
                      offset: const Offset(0, 6),
                      child: ImageFiltered(
                        imageFilter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(27.0),
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                const Color(0xFFFF4D4D).withValues(alpha: 0.6),
                                const Color(0xFFD32F2F).withValues(alpha: 0.6),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(27.0),
                    color: _hasWeighedIn ? Colors.grey.shade400 : null,
                    gradient: _hasWeighedIn
                        ? null
                        : const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Color(0xFFFF4D4D),
                              Color(0xFFD32F2F),
                            ],
                          ),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(27.0),
                      onTap: _hasWeighedIn
                          ? null
                          : () {
                              // Local state for the modal's current selection
                              String? selectedStance;

                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (BuildContext context) {
                                  // Wrap the bottom sheet content in a StatefulBuilder
                                  return StatefulBuilder(
                                    builder: (BuildContext context, StateSetter setModalState) {
                                      return Padding(
                                        padding: EdgeInsets.only(
                                            bottom: MediaQuery.of(context).viewInsets.bottom),
                                        child: Container(
                                          height: MediaQuery.of(context).size.height * 0.55,
                                          decoration: const BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.only(
                                              topLeft: Radius.circular(24),
                                              topRight: Radius.circular(24),
                                            ),
                                          ),
                                          child: Padding(
                                            padding: const EdgeInsets.all(24.0),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    const Text(
                                                      'Weigh In on C-99',
                                                      style: TextStyle(
                                                        fontSize: 22,
                                                        fontWeight: FontWeight.bold,
                                                        color: Colors.black87,
                                                      ),
                                                    ),
                                                    IconButton(
                                                      icon: const Icon(Icons.close, color: Colors.grey),
                                                      onPressed: () => Navigator.pop(context),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 8),
                                                const Text(
                                                  'Indicate your stance on this bill to signal to your MP how they should represent your riding.',
                                                  style: TextStyle(
                                                    fontSize: 14,
                                                    color: Colors.black54,
                                                    height: 1.4,
                                                  ),
                                                ),
                                                const SizedBox(height: 24),
                                                Expanded(
                                                  child: SingleChildScrollView(
                                                    child: Column(
                                                      children: [
                                                        Row(
                                                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                                          children: [
                                                            _buildStanceButton(
                                                              'For',
                                                              const Color(0xFF2E7D32),
                                                              selectedStance,
                                                              (val) => setModalState(() => selectedStance = val),
                                                            ),
                                                            _buildStanceButton(
                                                              'Neutral',
                                                              Colors.grey.shade700,
                                                              selectedStance,
                                                              (val) => setModalState(() => selectedStance = val),
                                                              borderColor: Colors.grey.shade400,
                                                            ),
                                                            _buildStanceButton(
                                                              'Against',
                                                              const Color(0xFFC62828),
                                                              selectedStance,
                                                              (val) => setModalState(() => selectedStance = val),
                                                            ),
                                                          ],
                                                        ),
                                                        const SizedBox(height: 20),
                                                        Row(
                                                          crossAxisAlignment: CrossAxisAlignment.start,
                                                          children: [
                                                            Expanded(
                                                              flex: 2,
                                                              child: DropdownButtonFormField<String>(
                                                                decoration: _inputDecoration('Gender'),
                                                                items: ['Male', 'Female', 'Other', 'Prefer not to say']
                                                                    .map((String value) {
                                                                  return DropdownMenuItem<String>(
                                                                    value: value,
                                                                    child: Text(value, style: const TextStyle(fontSize: 14)),
                                                                  );
                                                                }).toList(),
                                                                onChanged: (_) {},
                                                              ),
                                                            ),
                                                            const SizedBox(width: 16),
                                                            Expanded(
                                                              flex: 1,
                                                              child: TextFormField(
                                                                keyboardType: TextInputType.number,
                                                                decoration: _inputDecoration('Age'),
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: OutlinedButton(
                                                        onPressed: () => Navigator.pop(context),
                                                        style: OutlinedButton.styleFrom(
                                                          padding: const EdgeInsets.symmetric(vertical: 16),
                                                          side: BorderSide(color: Colors.grey.shade300),
                                                          shape: RoundedRectangleBorder(
                                                            borderRadius: BorderRadius.circular(12),
                                                          ),
                                                        ),
                                                        child: const Text(
                                                          'Cancel',
                                                          style: TextStyle(
                                                            color: Colors.black87,
                                                            fontWeight: FontWeight.bold,
                                                          ),
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 16),
                                                    Expanded(
                                                      child: Container(
                                                        decoration: BoxDecoration(
                                                          borderRadius: BorderRadius.circular(12),
                                                          gradient: LinearGradient(
                                                            // Dim the submit button if no stance is selected
                                                            colors: selectedStance == null 
                                                                ? [Colors.grey.shade400, Colors.grey.shade500]
                                                                : [const Color(0xFFFF4D4D), const Color(0xFFD32F2F)],
                                                          ),
                                                        ),
                                                        child: ElevatedButton(
                                                          onPressed: selectedStance == null 
                                                            ? null // Disable tap if nothing is selected
                                                            : () {
                                                              Navigator.pop(context);
                                                              setState(() {
                                                                _hasWeighedIn = true;
                                                              });
                                                              ScaffoldMessenger.of(context).showSnackBar(
                                                                const SnackBar(
                                                                  content: Text('Your stance has been successfully recorded!'),
                                                                  behavior: SnackBarBehavior.floating,
                                                                  backgroundColor: Color(0xFF2E7D32),
                                                                ),
                                                              );
                                                            },
                                                          style: ElevatedButton.styleFrom(
                                                            backgroundColor: Colors.transparent,
                                                            shadowColor: Colors.transparent,
                                                            disabledBackgroundColor: Colors.transparent, // Keeps the gradient visible when disabled
                                                            padding: const EdgeInsets.symmetric(vertical: 16),
                                                            shape: RoundedRectangleBorder(
                                                              borderRadius: BorderRadius.circular(12),
                                                            ),
                                                          ),
                                                          child: const Text(
                                                            'Submit',
                                                            style: TextStyle(
                                                              color: Colors.white,
                                                              fontWeight: FontWeight.bold,
                                                            ),
                                                          ),
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 10),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  );
                                },
                              );
                            },
                      child: Center(
                        child: Text(
                          _hasWeighedIn ? 'Already done' : 'Weigh in',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Updated helper method to handle the visual selection logic
  Widget _buildStanceButton(
    String text, 
    Color color, 
    String? currentSelection, 
    ValueChanged<String> onSelect, {
    Color? borderColor,
  }) {
    bool isSelected = currentSelection == text;

    return SizedBox(
      width: 90,
      height: 90,
      child: OutlinedButton(
        onPressed: () => onSelect(text),
        style: OutlinedButton.styleFrom(
          // Fills with the color if selected, otherwise transparent
          backgroundColor: isSelected ? color : Colors.transparent,
          // Text turns white if selected, otherwise matches the color
          foregroundColor: isSelected ? Colors.white : color,
          side: BorderSide(
            color: isSelected ? color : (borderColor ?? color), 
            width: 1.5,
          ),
          shape: const CircleBorder(),
        ),
        child: Text(
          text,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: Colors.grey.shade600, fontSize: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFFF4D4D)),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    );
  }
}