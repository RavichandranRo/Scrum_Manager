#!/usr/bin/env python3
"""
StreetMan Scrum Automation - Outlook Email Sender

This script sends HTML emails via Microsoft Outlook Desktop application.
It includes comprehensive prerequisite checks to ensure the system is properly configured.
"""

import sys
import platform
import subprocess
import os


def check_python_version():
    """Check if Python version is 3.6 or higher."""
    if sys.version_info < (3, 6):
        print(f"❌ ERROR: Python {sys.version_info.major}.{sys.version_info.minor} is not supported.")
        print("   Required: Python 3.6 or higher")
        print(f"   Current: Python {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True


def check_operating_system():
    """Check if running on Windows (required for Outlook integration)."""
    if platform.system() != 'Windows':
        print(f"❌ ERROR: This script requires Windows OS for Outlook integration.")
        print(f"   Current OS: {platform.system()}")
        return False
    print(f"✅ Operating System: {platform.system()} {platform.release()}")
    return True


def check_outlook_installation():
    """Check if Microsoft Outlook is installed."""
    try:
        # Try to find Outlook executable
        outlook_paths = [
            r"C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE",
            r"C:\Program Files (x86)\Microsoft Office\root\Office16\OUTLOOK.EXE",
            r"C:\Program Files\Microsoft Office\Office16\OUTLOOK.EXE",
            r"C:\Program Files (x86)\Microsoft Office\Office16\OUTLOOK.EXE",
            r"C:\Program Files\Microsoft Office\Office15\OUTLOOK.EXE",
            r"C:\Program Files (x86)\Microsoft Office\Office15\OUTLOOK.EXE",
        ]

        outlook_found = False
        for path in outlook_paths:
            if os.path.exists(path):
                print(f"✅ Microsoft Outlook found at: {path}")
                outlook_found = True
                break

        if not outlook_found:
            # Try to check via registry or other methods
            try:
                result = subprocess.run(['reg', 'query', r'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\OUTLOOK.EXE'],
                                      capture_output=True, text=True, check=False)
                if result.returncode == 0:
                    print("✅ Microsoft Outlook found in registry")
                    outlook_found = True
            except:
                pass

        if not outlook_found:
            print("❌ ERROR: Microsoft Outlook is not installed or not found in standard locations.")
            print("   Please install Microsoft Office with Outlook.")
            return False

        return True

    except Exception as e:
        print(f"❌ ERROR: Failed to check Outlook installation: {e}")
        return False


def check_pywin32():
    """Check if pywin32 is installed."""
    try:
        import win32com.client
        print("✅ pywin32 module found")
        return True
    except ImportError:
        print("❌ ERROR: pywin32 module is not installed.")
        print("   Install it with: pip install pywin32")
        print("   Or: python -m pip install pywin32")
        return False


def check_outlook_running():
    """Check if Outlook is running (optional but recommended)."""
    try:
        import win32com.client
        outlook = win32com.client.Dispatch('Outlook.Application')
        # Try to access a property to see if Outlook responds
        version = outlook.Version
        print(f"✅ Outlook is running (Version: {version})")
        return True
    except Exception as e:
        print("⚠️  WARNING: Outlook may not be running or accessible.")
        print("   It's recommended to have Outlook open for better reliability.")
        print("   Error details:", str(e))
        return True  # Don't fail the check, just warn


def run_prerequisite_checks():
    """Run all prerequisite checks."""
    print("🔍 Checking prerequisites for StreetMan Scrum Outlook Email Sender...")
    print("=" * 70)

    checks = [
        check_python_version,
        check_operating_system,
        check_pywin32,
        check_outlook_installation,
        check_outlook_running,
    ]

    all_passed = True
    for check in checks:
        if not check():
            all_passed = False
        print()

    if not all_passed:
        print("❌ Some prerequisites are not met. Please fix the issues above and try again.")
        sys.exit(1)

    print("✅ All prerequisites passed! Ready to send emails via Outlook.")
    print("=" * 70)
    return True


# Import required modules after checks
import argparse


def send_outlook(to, subject, html_body):
    """Send email via Outlook."""
    try:
        import win32com.client

        outlook = win32com.client.Dispatch('Outlook.Application')
        mail = outlook.CreateItem(0)
        mail.To = to
        mail.Subject = subject
        mail.HTMLBody = html_body
        mail.Send()

        print("✅ Email sent successfully via Outlook!")
        return True

    except Exception as e:
        print(f"❌ ERROR: Failed to send email: {e}")
        return False


def main():
    """Main function."""
    # Run prerequisite checks first
    run_prerequisite_checks()

    parser = argparse.ArgumentParser(
        description='Send HTML email via Outlook Desktop',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python send_outlook.py --to "team@company.com" --subject "Daily Scrum Update" --body-file "email.html"
  python send_outlook.py --to "user1@company.com,user2@company.com" --subject "Test" --body-file "test.html"
        """
    )
    parser.add_argument('--to', required=True, help='Recipient email address(es), comma-separated')
    parser.add_argument('--subject', required=True, help='Email subject')
    parser.add_argument('--body-file', required=True, help='Path to HTML file for the email body')

    args = parser.parse_args()

    # Validate input file exists
    if not os.path.exists(args.body_file):
        print(f"❌ ERROR: Body file not found: {args.body_file}")
        sys.exit(1)

    # Read HTML body
    try:
        with open(args.body_file, 'r', encoding='utf-8') as fh:
            html_body = fh.read()
    except Exception as e:
        print(f"❌ ERROR: Failed to read body file: {e}")
        sys.exit(1)

    # Send email
    if send_outlook(args.to, args.subject, html_body):
        print("OK")
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
