import 'dart:ui';
import 'package:flutter/material.dart';

class BillDetailPage extends StatelessWidget {
  const BillDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text(
          'Bill Details',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 10),
            const Text(
              'BILL',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -8),
              child: const Text(
                'C-99',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 70,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Text(
                'An Act to amend certain acts in relation to public infrastructure, resource management, and community funding allocations, and to provide for related administrative measures.',
                style: TextStyle(
                  fontSize: 15,
                  height: 1.4,
                  color: Colors.black87,
                ),
              ),
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
                    gradient: const LinearGradient(
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
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (BuildContext context) {
                            return Padding(
                              // Pushes the modal up when the keyboard opens for the Age field
                              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
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
                                      // Header Row-----------
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

                                      // Scrollable Form Area (prevents overflow issues)
                                      Expanded(
                                        child: SingleChildScrollView(
                                          child: Column(
                                            children: [
                                              // Stance Buttons --------------------------
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceEvenly, // Spreads the circles evenly
                                                children: [
                                                  SizedBox(
                                                    width: 90,
                                                    height: 90,
                                                    child: OutlinedButton(
                                                      onPressed: () {},
                                                      style: OutlinedButton.styleFrom(
                                                        foregroundColor: const Color(0xFF2E7D32),
                                                        side: const BorderSide(color: Color(0xFF2E7D32), width: 1.5),
                                                        shape: const CircleBorder(),
                                                      ),
                                                      child: const Text(
                                                        'For',
                                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                                      ),
                                                    ),
                                                  ),
                                                  SizedBox(
                                                    width: 90,
                                                    height: 90,
                                                    child: OutlinedButton(
                                                      onPressed: () {},
                                                      style: OutlinedButton.styleFrom(
                                                        foregroundColor: Colors.grey.shade700,
                                                        side: BorderSide(color: Colors.grey.shade400, width: 1.5),
                                                        shape: const CircleBorder(),
                                                      ),
                                                      child: const Text(
                                                        'Neutral',
                                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                                      ),
                                                    ),
                                                  ),
                                                  SizedBox(
                                                    width: 90,
                                                    height: 90,
                                                    child: OutlinedButton(
                                                      onPressed: () {},
                                                      style: OutlinedButton.styleFrom(
                                                        foregroundColor: const Color(0xFFC62828),
                                                        side: const BorderSide(color: Color(0xFFC62828), width: 1.5),
                                                        shape: const CircleBorder(),
                                                      ),
                                                      child: const Text(
                                                        'Against',
                                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 20),

                                              // Gender & Age Row
                                              Row(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Expanded(
                                                    flex: 2,
                                                    child: DropdownButtonFormField<String>(
                                                      decoration: InputDecoration(
                                                        labelText: 'Gender',
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
                                                      ),
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
                                                      decoration: InputDecoration(
                                                        labelText: 'Age',
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
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      
                                      // Bottom Action Buttons
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
                                                gradient: const LinearGradient(
                                                  colors: [Color(0xFFFF4D4D), Color(0xFFD32F2F)],
                                                ),
                                              ),
                                              child: ElevatedButton(
                                                onPressed: () {
                                                  Navigator.pop(context);
                                                },
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: Colors.transparent,
                                                  shadowColor: Colors.transparent,
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
                      child: const Center(
                        child: Text(
                          'Weigh in',
                          style: TextStyle(
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
}