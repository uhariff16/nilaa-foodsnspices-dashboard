import subprocess
try:
    result = subprocess.run(["git", "checkout", "src/components/TimeAttendance.jsx"], capture_output=True, text=True, check=True)
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
except Exception as e:
    print("ERROR:", e)
