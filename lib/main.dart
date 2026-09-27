import 'package:flutter/material.dart';
import 'my_mp_page.dart';
import 'services/riding_preference_service.dart';
import 'my_profile_page.dart';
import 'bills_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await RidingPreferenceService.load();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.red,
          surface: Colors.white,
        ),
      ),
      home: const MyHomePage(title: 'Capitoll'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const BillsPage(),
    const MyMpPage(),
    const MyProfilePage(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        centerTitle: true,
        title: SizedBox(
          height: 25,
          child: Image.asset(
            'assets/icons/capitollLogo.png',
            fit: BoxFit.contain,
          ),
        ),
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              spreadRadius: 2,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              MediaQuery.removePadding(
                context: context,
                removeBottom: true,
                child: BottomNavigationBar(
                  elevation: 0,
                  backgroundColor: Colors.white,
                  currentIndex: _selectedIndex,
                  onTap: _onItemTapped,
                  selectedItemColor: const Color.fromARGB(255, 243, 33, 33),
                  items: const <BottomNavigationBarItem>[
                    BottomNavigationBarItem(
                      icon: ImageIcon(AssetImage('assets/icons/ballot.png')),
                      label: 'Bills',
                    ),
                    BottomNavigationBarItem(
                      icon: ImageIcon(AssetImage('assets/icons/manCircle.png')),
                      label: 'My MP',
                    ),
                    BottomNavigationBarItem(
                      icon: ImageIcon(
                        AssetImage('assets/icons/personEdit.png'),
                      ),
                      label: 'Profile',
                    ),
                  ],
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 0.5, top: 0.5),
                  child: Text(
                    'Work in progress. Data may not be fully accurate.',
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
