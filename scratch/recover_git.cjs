const { execSync } = require('child_process');
try {
    const stdout = execSync('git checkout src/components/TimeAttendance.jsx');
    console.log('STDOUT:', stdout.toString());
} catch (error) {
    console.error('ERROR:', error.message);
    console.error('STDERR:', error.stderr?.toString());
}
