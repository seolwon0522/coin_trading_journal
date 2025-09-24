"""
Nautilus Trader Setup Script
"""
import os
import sys
import subprocess
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    print(f"Current Python version: {version.major}.{version.minor}.{version.micro}")

    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print("[ERROR] Python 3.11 or higher is required for Nautilus Trader")
        print("Please install Python 3.11, 3.12, or 3.13")
        return False

    if version.major == 3 and version.minor > 13:
        print("[WARNING] Python version might be too new for Nautilus Trader")
        print("Recommended versions: 3.11, 3.12, or 3.13")

    print("[OK] Python version is compatible")
    return True


def install_dependencies():
    """Install required dependencies"""
    print("\n[INFO] Installing dependencies...")

    # Upgrade pip
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])

    # Install requirements
    requirements_file = Path(__file__).parent / "requirements.txt"
    if requirements_file.exists():
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        print("[OK] Dependencies installed successfully")
    else:
        print("[ERROR] requirements.txt not found")
        return False

    return True


def create_directories():
    """Create necessary directories"""
    print("\n[INFO] Creating directories...")

    dirs = ["logs", "data", "tests/data", "api/routes", "strategies/indicators"]
    base_path = Path(__file__).parent

    for dir_path in dirs:
        full_path = base_path / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"  Created: {dir_path}")

    print("[OK] Directories created successfully")
    return True


def test_import():
    """Test Nautilus Trader import"""
    print("\n[TEST] Testing Nautilus Trader import...")

    try:
        import nautilus_trader
        print(f"[OK] Nautilus Trader version: {nautilus_trader.__version__}")
        return True
    except ImportError as e:
        print(f"[ERROR] Failed to import Nautilus Trader: {e}")
        print("\nTrying to install Nautilus Trader directly...")
        subprocess.run([sys.executable, "-m", "pip", "install", "nautilus_trader"])

        # Try again
        try:
            import nautilus_trader
            print(f"[OK] Nautilus Trader installed successfully: {nautilus_trader.__version__}")
            return True
        except ImportError as e:
            print(f"[ERROR] Still failed to import: {e}")
            return False


def test_config():
    """Test configuration loading"""
    print("\n[TEST] Testing configuration...")

    try:
        from config.config import config

        # Check if API keys are loaded
        creds = config.get_api_credentials()
        if creds["api_key"]:
            print("[OK] API credentials loaded successfully")
            print(f"  Using {'Testnet' if creds['testnet'] else 'Production'} mode")
        else:
            print("[WARNING] No API credentials found in .env file")

        return True
    except Exception as e:
        print(f"[ERROR] Failed to load configuration: {e}")
        return False


def main():
    """Main setup function"""
    print("=" * 50)
    print("Nautilus Trader Setup")
    print("=" * 50)

    # Check Python version
    if not check_python_version():
        return False

    # Create directories
    if not create_directories():
        return False

    # Install dependencies
    if not install_dependencies():
        return False

    # Test imports
    if not test_import():
        return False

    # Test configuration
    if not test_config():
        return False

    print("\n" + "=" * 50)
    print("[SUCCESS] Setup completed successfully!")
    print("=" * 50)
    print("\nNext steps:")
    print("1. Run: python test_connection.py (to test Binance connection)")
    print("2. Run: python main.py (to start the trading system)")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)