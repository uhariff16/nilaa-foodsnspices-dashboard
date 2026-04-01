
const defaultPermissions = {
    attendance: {
        tracking: { read: false, write: false, delete: false, bulk: false },
        payouts: { read: false, write: false, delete: false },
        salaries: { read: false, write: false, delete: false }
    }
};

const expandSection = (val, defaultObj) => {
    if (val === true) {
        const fullAccess = {};
        Object.keys(defaultObj).forEach(k => fullAccess[k] = true);
        return fullAccess;
    }
    return val || {};
};

const mergePermissions = (fetched) => {
    return {
        ...defaultPermissions,
        ...fetched,
        attendance: {
            tracking: { ...defaultPermissions.attendance.tracking, ...expandSection(fetched.attendance?.tracking, defaultPermissions.attendance.tracking) },
            payouts: { ...defaultPermissions.attendance.payouts, ...expandSection(fetched.attendance?.payouts, defaultPermissions.attendance.payouts) },
            salaries: { ...defaultPermissions.attendance.salaries, ...expandSection(fetched.attendance?.salaries, defaultPermissions.attendance.salaries) }
        }
    };
};

const hasPermissionMock = (permissions, path) => {
    const parts = path.split('.');
    let current = permissions;
    for (const part of parts) {
        if (current === true) return true;
        if (!current || typeof current !== 'object') return false;
        current = current[part];
    }
    if (typeof current === 'object' && current !== null) {
        return Object.values(current).some(v => v === true);
    }
    return !!current;
};

// Mock the user from the DB
const fetchedFromDB = {
    attendance: {
        payouts: true,
        salaries: true,
        tracking: true
    }
};

const merged = mergePermissions(fetchedFromDB);
console.log("Merged Permissions:", JSON.stringify(merged, null, 2));

console.log("hasPermission('attendance.tracking'):", hasPermissionMock(merged, 'attendance.tracking'));
console.log("hasPermission('attendance.tracking.write'):", hasPermissionMock(merged, 'attendance.tracking.write'));
console.log("hasPermission('attendance.payouts'):", hasPermissionMock(merged, 'attendance.payouts'));
